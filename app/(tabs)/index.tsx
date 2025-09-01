import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Modal, Portal, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { DatabaseService } from '../../services/DatabaseService';
import { Component3D, PurchasedComponent, Part, Product, PostProcessingTask, AssemblyTask } from '../../types/inventory';

export default function DashboardScreen() {
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [postProcessingTasks, setPostProcessingTasks] = useState<PostProcessingTask[]>([]);
  const [assemblyTasks, setAssemblyTasks] = useState<AssemblyTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [targetProductsBuffer, setTargetProductsBuffer] = useState(10);
  
  // Modal states
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component3D | null>(null);
  const [completeQuantity, setCompleteQuantity] = useState('');
  const [printQuantity, setPrintQuantity] = useState('');

  const loadData = async () => {
    try {
      const [comp3D, purchased, partsData, productsData, postProcessing, assembly, buffer] = await Promise.all([
        DatabaseService.getComponents3D(),
        DatabaseService.getPurchasedComponents(),
        DatabaseService.getParts(),
        DatabaseService.getProducts(),
        DatabaseService.getPostProcessingTasks(),
        DatabaseService.getAssemblyTasks(),
        DatabaseService.getTargetProductsBuffer()
      ]);
      
      setComponents3D(comp3D);
      setPurchasedComponents(purchased);
      setParts(partsData);
      setProducts(productsData);
      setPostProcessingTasks(postProcessing);
      setAssemblyTasks(assembly);
      setTargetProductsBuffer(buffer);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data whenever the tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // Modal handlers
  const handleCompleteClick = (component: Component3D) => {
    setSelectedComponent(component);
    setCompleteQuantity('');
    setCompleteModalVisible(true);
  };

  const handleCompleteConfirm = async () => {
    if (!selectedComponent) return;
    
    const num = parseInt(completeQuantity);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (num > selectedComponent.postProcessingPending) {
      Alert.alert('Error', `Cannot complete more than ${selectedComponent.postProcessingPending} pending items`);
      return;
    }

    try {
      await DatabaseService.updateComponent3D(selectedComponent.id, {
        postProcessingCompleted: selectedComponent.postProcessingCompleted + num,
        postProcessingPending: selectedComponent.postProcessingPending - num,
      });

      await loadData();
      setCompleteModalVisible(false);
      setSelectedComponent(null);
      Alert.alert('Success', `Completed post-processing for ${num} ${selectedComponent.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update component');
    }
  };

  const handlePrintClick = (component: Component3D) => {
    setSelectedComponent(component);
    setPrintQuantity('');
    setPrintModalVisible(true);
  };

  const handlePrintConfirm = async () => {
    if (!selectedComponent) return;
    
    const num = parseInt(printQuantity);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const requiresPostProcessing = selectedComponent.requiresPostProcessing !== false;
      
      if (requiresPostProcessing) {
        await DatabaseService.updateComponent3D(selectedComponent.id, {
          quantity: selectedComponent.quantity + num,
          postProcessingPending: selectedComponent.postProcessingPending + num,
        });
      } else {
        await DatabaseService.updateComponent3D(selectedComponent.id, {
          quantity: selectedComponent.quantity + num,
          postProcessingCompleted: selectedComponent.postProcessingCompleted + num,
        });
      }

      await loadData();
      setPrintModalVisible(false);
      setSelectedComponent(null);
      Alert.alert('Success', `Added ${num} ${selectedComponent.name} to ${requiresPostProcessing ? 'pending post-processing' : 'ready for assembly'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update component');
    }
  };

  const calculateProductionCapacity = () => {
    // Calculate how many complete products can be made with current inventory
    
    // Check assembled parts (Bowler & Batter)
    const bowlerParts = parts.find(p => p.name === 'Bowler')?.quantity || 0;
    const batterParts = parts.find(p => p.name === 'Batter')?.quantity || 0;
    
    // Check all required 3D components (fullParts)
    const fenceCorners = components3D.find(c => c.name === 'Fence Corner')?.postProcessingCompleted || 0;
    const fenceStraight = components3D.find(c => c.name === 'Fence Straight')?.postProcessingCompleted || 0;
    const fencePlayer = components3D.find(c => c.name === 'Fence Player')?.postProcessingCompleted || 0;
    const fielderHigh = components3D.find(c => c.name === 'Fielder High')?.postProcessingCompleted || 0;
    const fielderMedium = components3D.find(c => c.name === 'Fielder Medium')?.postProcessingCompleted || 0;
    const fielderLow = components3D.find(c => c.name === 'Fielder Low')?.postProcessingCompleted || 0;
    const stumps = components3D.find(c => c.name === 'Stumps')?.postProcessingCompleted || 0;
    const batterGantry = components3D.find(c => c.name === 'Batter Gantry')?.postProcessingCompleted || 0;
    const bowlerGantry = components3D.find(c => c.name === 'Bowler Gantry')?.postProcessingCompleted || 0;
    
    // Check purchased components
    const balls = purchasedComponents.find(c => c.name === 'Balls (3 varieties)')?.quantity || 0;
    const pitch = purchasedComponents.find(c => c.name === 'Silk Printed Felt Sheets (pre-cut)')?.quantity || 0;
    const tube = purchasedComponents.find(c => c.name === '30cmx10cm Printed Cardboard Tube')?.quantity || 0;
    const mailers = purchasedComponents.find(c => c.name === 'Bubble Mailers')?.quantity || 0;
    const bags = purchasedComponents.find(c => c.name === '12cmx34cm self adhesive bags')?.quantity || 0;
    const velcro = purchasedComponents.find(c => c.name === 'Velcro strips')?.quantity || 0;
    const paper = purchasedComponents.find(c => c.name === 'A4 Paper')?.quantity || 0;
    
    // Calculate how many sets can be made from each component type
    const fromAssembledParts = Math.min(bowlerParts, batterParts);
    const fromFullParts = Math.min(
      Math.floor(fenceCorners / 6),    // 6 fence corners per product
      Math.floor(fenceStraight / 4),   // 4 fence straight per product
      Math.floor(fencePlayer / 2),     // 2 fence player per product
      Math.floor(fielderHigh / 3),     // 3 fielder high per product
      Math.floor(fielderMedium / 3),   // 3 fielder medium per product
      Math.floor(fielderLow / 3),      // 3 fielder low per product
      stumps,                          // 1 stumps per product
      batterGantry,                    // 1 batter gantry per product
      bowlerGantry                     // 1 bowler gantry per product
    );
    const fromPurchasedComponents = Math.min(
      balls,
      pitch,
      tube,
      Math.floor(mailers / 0.5),       // 0.5 mailers per product
      bags,
      velcro,
      paper
    );
    
    const capacity = Math.min(fromAssembledParts, fromFullParts, fromPurchasedComponents);
    
    // Debug logging
    console.log('Production Capacity Debug:', {
      fromAssembledParts: { bowlerParts, batterParts, min: fromAssembledParts },
      fromFullParts: { 
        fenceCorners: Math.floor(fenceCorners / 6),
        fenceStraight: Math.floor(fenceStraight / 4),
        fencePlayer: Math.floor(fencePlayer / 2),
        fielderHigh: Math.floor(fielderHigh / 3),
        fielderMedium: Math.floor(fielderMedium / 3),
        fielderLow: Math.floor(fielderLow / 3),
        stumps,
        batterGantry,
        bowlerGantry,
        min: fromFullParts
      },
      fromPurchasedComponents: {
        balls, pitch, tube, 
        mailers: Math.floor(mailers / 0.5), 
        bags, velcro, paper,
        min: fromPurchasedComponents
      },
      finalCapacity: capacity
    });
    
    return capacity;
  };

  const getStockThreshold = (component: PurchasedComponent) => {
    // Use custom threshold if set, otherwise use smart defaults
    if (component.lowStockThreshold !== null && component.lowStockThreshold !== undefined) {
      return component.lowStockThreshold;
    }
    
    const name = component.name.toLowerCase();
    const unit = component.unit.toLowerCase();
    
    // Weight-based items (kg, grams)
    if (unit.includes('kg') || unit.includes('gram')) {
      if (name.includes('filament') || name.includes('plastic')) {
        return 0.5; // Less than 0.5kg of filament is low
      }
      return 0.1; // General weight threshold
    }
    
    // Volume-based items (ml, liters)
    if (unit.includes('ml') || unit.includes('liter') || unit.includes('litre')) {
      return 50; // Less than 50ml is low
    }
    
    // Roll/tape items
    if (unit.includes('roll') || name.includes('tape') || name.includes('wire')) {
      return 2; // Less than 2 rolls is low
    }
    
    // Sheet items
    if (unit.includes('sheet') || name.includes('felt') || name.includes('paper')) {
      return 5; // Less than 5 sheets is low
    }
    
    // Small precision items (screws, nuts, small parts)
    if (name.includes('screw') || name.includes('nut') || name.includes('washer') || 
        name.includes('bolt') || unit.includes('piece') && component.quantity > 50) {
      return 20; // Less than 20 small pieces is low
    }
    
    // Balls, larger discrete items
    if (name.includes('ball') || name.includes('bearing')) {
      return 10; // Less than 10 balls is low
    }
    
    // Default for other piece-based items
    if (unit.includes('piece') || unit === 'pcs') {
      return 3; // Less than 3 pieces is low
    }
    
    // Default fallback
    return 5;
  };

  const isLowStock = (component: PurchasedComponent) => {
    return component.quantity < getStockThreshold(component);
  };

  interface PrintRecommendation {
    componentId: number;
    componentName: string;
    currentStock: number;
    needed: number;
    shortage: number;
    batchSize: number;
    printTimeMinutes: number;
    batchesNeeded: number;
    totalPrintTime: number;
    additionalProducts: number;
    priority: 'critical' | 'urgent' | 'medium' | 'low';
    reason: string;
  }

  const getTopPrintPriorities = (): PrintRecommendation[] => {
    const allComponents: PrintRecommendation[] = [];
    
    // Get all 3D components and calculate their runway (how many products each can support)
    const allComponentRequirements = [
      // Direct product components
      { name: 'Fence Corner', requiredPerProduct: 6 },
      { name: 'Fence Straight', requiredPerProduct: 4 },
      { name: 'Fence Player', requiredPerProduct: 2 },
      { name: 'Fielder High', requiredPerProduct: 3 },
      { name: 'Fielder Medium', requiredPerProduct: 3 },
      { name: 'Fielder Low', requiredPerProduct: 3 },
      { name: 'Stumps', requiredPerProduct: 1 },
      { name: 'Batter Gantry', requiredPerProduct: 1 },
      { name: 'Bowler Gantry', requiredPerProduct: 1 },
      
      // Bowler part components (each needed for 1 Bowler part per product)
      { name: 'Bowler Floor', requiredPerProduct: 1 },
      { name: 'Bowler Arm', requiredPerProduct: 1 },
      { name: 'Bowler Chute', requiredPerProduct: 1 },
      
      // Batter part components (each needed for 1 Batter part per product)
      { name: 'Batter Handle', requiredPerProduct: 1 },
      { name: 'Batter Lid', requiredPerProduct: 1 },
      { name: 'Batter Cap', requiredPerProduct: 1 },
      { name: 'Batter Body', requiredPerProduct: 1 },
      { name: 'Batter Slider', requiredPerProduct: 1 },
      { name: 'Batter Button Left', requiredPerProduct: 1 },
      { name: 'Batter Button Right', requiredPerProduct: 1 },
      { name: 'Batter Floor', requiredPerProduct: 1 },
      { name: 'Batter Hook', requiredPerProduct: 1 },
      { name: 'Batter Bat', requiredPerProduct: 1 },
    ];
    
    // Calculate runway for each component (how many products it can support)
    allComponentRequirements.forEach(req => {
      const component = components3D.find(c => c.name === req.name);
      if (component) {
        const totalAvailable = component.postProcessingCompleted + component.postProcessingPending;
        const productsCanMake = Math.floor(totalAvailable / req.requiredPerProduct);
        
        // Calculate recommended print quantity (always aim for target products worth)
        const targetProducts = targetProductsBuffer;
        const neededForTarget = targetProducts * req.requiredPerProduct;
        const shouldPrint = Math.max(0, neededForTarget - totalAvailable);
        const printBatches = Math.ceil(shouldPrint / (component.batchSize || 10));
        const actualPrintQuantity = printBatches * (component.batchSize || 10);
        
        allComponents.push({
          componentId: component.id,
          componentName: component.name,
          currentStock: totalAvailable,
          needed: neededForTarget,
          shortage: shouldPrint,
          batchSize: component.batchSize || 10,
          printTimeMinutes: component.printTimeMinutes || 60,
          batchesNeeded: printBatches,
          totalPrintTime: printBatches * (component.printTimeMinutes || 60),
          additionalProducts: Math.max(0, targetProducts - productsCanMake),
          priority: productsCanMake === 0 ? 'critical' : productsCanMake < 3 ? 'urgent' : productsCanMake < 7 ? 'medium' : 'low',
          reason: `Can make ${productsCanMake} products with current stock (${component.postProcessingCompleted} ready + ${component.postProcessingPending} pending = ${totalAvailable} total)`
        });
      }
    });
    
    // Sort by products we can make (lowest first - most urgent), then by print time
    return allComponents
      .sort((a, b) => {
        const aProductsCanMake = Math.floor(a.currentStock / allComponentRequirements.find(r => r.name === a.componentName)!.requiredPerProduct);
        const bProductsCanMake = Math.floor(b.currentStock / allComponentRequirements.find(r => r.name === b.componentName)!.requiredPerProduct);
        
        if (aProductsCanMake !== bProductsCanMake) {
          return aProductsCanMake - bProductsCanMake; // Lowest first (most urgent)
        }
        return a.totalPrintTime - b.totalPrintTime; // Shorter print time first
      })
      .slice(0, 2); // Always return exactly 2 items
  };

  // Smart priority system - picks 1-2 focused actions based on workflow
  const getSmartPriorities = () => {
    const priorities: any[] = [];
    
    // 1. FIRST PRIORITY: Can we assemble a complete product RIGHT NOW?
    const productionCapacity = calculateProductionCapacity();
    if (productionCapacity > 0) {
      priorities.push({
        type: 'assemble_product',
        title: '🎯 ASSEMBLE COMPLETE PRODUCT',
        description: `You can make ${productionCapacity} complete product(s) right now!`,
        action: 'Go to Products tab',
        priority: 1,
        timeEstimate: '10-15 minutes'
      });
      return priorities; // If we can assemble products, that's the top priority
    }

    // If we can't make products, analyze what's blocking us
    const bowlerParts = parts.find(p => p.name === 'Bowler')?.quantity || 0;
    const batterParts = parts.find(p => p.name === 'Batter')?.quantity || 0;
    
    // Check all required 3D components
    const fenceCorners = components3D.find(c => c.name === 'Fence Corner')?.postProcessingCompleted || 0;
    const fenceStraight = components3D.find(c => c.name === 'Fence Straight')?.postProcessingCompleted || 0;
    const fencePlayer = components3D.find(c => c.name === 'Fence Player')?.postProcessingCompleted || 0;
    const fielderHigh = components3D.find(c => c.name === 'Fielder High')?.postProcessingCompleted || 0;
    const fielderMedium = components3D.find(c => c.name === 'Fielder Medium')?.postProcessingCompleted || 0;
    const fielderLow = components3D.find(c => c.name === 'Fielder Low')?.postProcessingCompleted || 0;
    const stumps = components3D.find(c => c.name === 'Stumps')?.postProcessingCompleted || 0;
    const batterGantry = components3D.find(c => c.name === 'Batter Gantry')?.postProcessingCompleted || 0;
    const bowlerGantry = components3D.find(c => c.name === 'Bowler Gantry')?.postProcessingCompleted || 0;
    
    // Check purchased components
    const balls = purchasedComponents.find(c => c.name === 'Balls (3 varieties)')?.quantity || 0;
    const pitch = purchasedComponents.find(c => c.name === 'Silk Printed Felt Sheets (pre-cut)')?.quantity || 0;
    const tube = purchasedComponents.find(c => c.name === '30cmx10cm Printed Cardboard Tube')?.quantity || 0;
    const mailers = purchasedComponents.find(c => c.name === 'Bubble Mailers')?.quantity || 0;
    const bags = purchasedComponents.find(c => c.name === '12cmx34cm self adhesive bags')?.quantity || 0;
    const velcro = purchasedComponents.find(c => c.name === 'Velcro strips')?.quantity || 0;
    const paper = purchasedComponents.find(c => c.name === 'A4 Paper')?.quantity || 0;
    
    // Calculate bottlenecks - what's limiting production
    const componentBottlenecks = [
      { name: 'Bowler Parts', current: bowlerParts, needed: 1, type: 'assembled' },
      { name: 'Batter Parts', current: batterParts, needed: 1, type: 'assembled' },
      { name: 'Fence Corners', current: fenceCorners, needed: 6, type: '3d' },
      { name: 'Fence Straight', current: fenceStraight, needed: 4, type: '3d' },
      { name: 'Fence Player', current: fencePlayer, needed: 2, type: '3d' },
      { name: 'Fielder High', current: fielderHigh, needed: 3, type: '3d' },
      { name: 'Fielder Medium', current: fielderMedium, needed: 3, type: '3d' },
      { name: 'Fielder Low', current: fielderLow, needed: 3, type: '3d' },
      { name: 'Stumps', current: stumps, needed: 1, type: '3d' },
      { name: 'Batter Gantry', current: batterGantry, needed: 1, type: '3d' },
      { name: 'Bowler Gantry', current: bowlerGantry, needed: 1, type: '3d' },
      { name: 'Balls', current: balls, needed: 1, type: 'purchased' },
      { name: 'Pitch', current: pitch, needed: 1, type: 'purchased' },
      { name: 'Tube', current: tube, needed: 1, type: 'purchased' },
      { name: 'Mailers', current: mailers, needed: 0.5, type: 'purchased' },
      { name: 'Bags', current: bags, needed: 1, type: 'purchased' },
      { name: 'Velcro', current: velcro, needed: 1, type: 'purchased' },
      { name: 'Paper', current: paper, needed: 1, type: 'purchased' }
    ];
    
    // Find what's missing or insufficient
    const missingComponents = componentBottlenecks.filter(c => c.current < c.needed);
    const zeroComponents = componentBottlenecks.filter(c => c.current === 0);
    
    // 2. CRITICAL: Show what's completely missing (quantity = 0)
    if (zeroComponents.length > 0) {
      const missing = zeroComponents[0];
      let actionText = '';
      if (missing.type === '3d') {
        // For 3D components, check if there are items pending post-processing
        let component3D = null;
        if (missing.name === 'Fence Corners') component3D = components3D.find(c => c.name === 'Fence Corner');
        else if (missing.name === 'Fence Straight') component3D = components3D.find(c => c.name === 'Fence Straight');
        else if (missing.name === 'Fence Player') component3D = components3D.find(c => c.name === 'Fence Player');
        else if (missing.name === 'Fielder High') component3D = components3D.find(c => c.name === 'Fielder High');
        else if (missing.name === 'Fielder Medium') component3D = components3D.find(c => c.name === 'Fielder Medium');
        else if (missing.name === 'Fielder Low') component3D = components3D.find(c => c.name === 'Fielder Low');
        else component3D = components3D.find(c => c.name === missing.name);
        
        const pendingItems = component3D?.postProcessingPending || 0;
        const neededItems = missing.needed;
        
        if (pendingItems >= neededItems) {
          // Sufficient items waiting for post-processing - prioritize completing them
          priorities.push({
            type: 'post_process_needed',
            title: '🛠️ POST-PROCESS WAITING ITEMS',
            description: `${pendingItems} ${missing.name} printed and waiting! Complete post-processing to get ${neededItems} ready.`,
            action: 'Go to Components tab → Complete',
            priority: 1,
            timeEstimate: '15-30 minutes',
            component: missing.name
          });
          return priorities.slice(0, 2); // Return early since we found the solution
        } else if (pendingItems > 0) {
          // Some items waiting, but not enough
          priorities.push({
            type: 'post_process_partial',
            title: '🛠️ POST-PROCESS + PRINT MORE',
            description: `${pendingItems} ${missing.name} waiting for post-processing, need ${neededItems - pendingItems} more printed.`,
            action: 'Go to Components tab → Complete first, then print more',
            priority: 1,
            timeEstimate: '2-4 hours',
            component: missing.name
          });
          return priorities.slice(0, 2);
        }
        
        actionText = 'Go to Components tab → Add Print';
      } else if (missing.type === 'assembled') {
        actionText = 'Go to Parts tab → Assemble';
      } else {
        actionText = 'Purchase required';
      }
      
      priorities.push({
        type: 'missing_component',
        title: '� MISSING COMPONENT',
        description: `Need ${missing.needed} ${missing.name} - you have 0!`,
        action: actionText,
        priority: 1,
        timeEstimate: missing.type === '3d' ? '2-4 hours' : '15-30 minutes',
        component: missing.name
      });
    }

    // 3. HIGH: Show what's insufficient
    else if (missingComponents.length > 0) {
      const insufficient = missingComponents[0];
      const shortage = insufficient.needed - insufficient.current;
      let actionText = '';
      if (insufficient.type === '3d') {
        actionText = 'Go to Components tab → Add Print';
      } else if (insufficient.type === 'assembled') {
        actionText = 'Go to Parts tab → Assemble';
      } else {
        actionText = 'Purchase more';
      }
      
      priorities.push({
        type: 'insufficient_component',
        title: '⚠️ INSUFFICIENT COMPONENT',
        description: `Need ${shortage} more ${insufficient.name} (have ${insufficient.current}, need ${insufficient.needed})`,
        action: actionText,
        priority: 1,
        timeEstimate: insufficient.type === '3d' ? '1-2 hours' : '10-20 minutes',
        component: insufficient.name
      });
    }

    // Get data for other priorities
    const printRecommendations = getTopPrintPriorities();

    // 4. SECOND PRIORITY: Is there a quick print job (5 minutes to start)?
    const quickestPrint = printRecommendations
      .filter(r => r.priority === 'critical')
      .sort((a, b) => a.printTimeMinutes - b.printTimeMinutes)[0];
    
    if (quickestPrint && priorities.length < 2) {
      priorities.push({
        type: 'start_print',
        title: '�️ START PRINT JOB',
        description: `Start printing ${quickestPrint.componentName} (${quickestPrint.batchesNeeded} batch${quickestPrint.batchesNeeded > 1 ? 'es' : ''})`,
        action: 'Go to Components tab → Add Print',
        priority: 2,
        timeEstimate: `${Math.floor(quickestPrint.printTimeMinutes / 60)}h ${quickestPrint.printTimeMinutes % 60}m`,
        component: quickestPrint.componentName
      });
    }

    // 5. THIRD PRIORITY: Critical post-processing that's blocking production?
    const blockingPostProcessing = postProcessingTasks.find(t => t.blocksProduction);
    if (blockingPostProcessing && priorities.length < 2) {
      priorities.push({
        type: 'post_process',
        title: '�️ COMPLETE POST-PROCESSING',
        description: `Finish ${blockingPostProcessing.componentName} - blocking all production`,
        action: 'Go to Components tab → Complete',
        priority: 2,
        timeEstimate: '15-30 minutes',
        component: blockingPostProcessing.componentName,
        quantity: blockingPostProcessing.pendingQuantity
      });
    }

    return priorities.slice(0, 2); // Maximum 2 priorities
  };

  const productionCapacity = calculateProductionCapacity();
  const printRecommendations = getTopPrintPriorities();
  const smartPriorities = getSmartPriorities();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#F44336';
      case 'urgent': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Production Status */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>🏭 Production Status</Title>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Products Ready to Assemble:</Text>
            <Text style={[styles.statValue, { color: productionCapacity > 0 ? '#4CAF50' : '#FF5722' }]}>
              {productionCapacity}
            </Text>
          </View>
          {productionCapacity === 0 && (
            <Text style={styles.warningText}>⚠️ Cannot assemble any products - missing components!</Text>
          )}
        </Card.Content>
      </Card>

      {/* Daily Task Priorities */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>📋 Today's Priority Tasks</Title>
          <Text style={styles.subtitle}>
            {smartPriorities.length === 0 ? 
              "All caught up! No urgent tasks today." : 
              "Focus on these key actions to keep production flowing"
            }
          </Text>
          
          {smartPriorities.map((task, index) => (
            <View key={`smart-${index}`} style={[styles.taskCard, { 
              borderLeftColor: task.priority === 1 ? '#F44336' : task.priority === 2 ? '#FF9800' : '#FFC107',
              backgroundColor: task.priority === 1 ? '#FFEBEE' : task.priority === 2 ? '#FFF8E1' : '#F9F9F9'
            }]}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Text style={[styles.priorityBadge, { 
                    backgroundColor: task.priority === 1 ? '#F44336' : task.priority === 2 ? '#FF9800' : '#FFC107' 
                  }]}>
                    {task.priority === 1 ? 'NOW' : task.priority === 2 ? 'NEXT' : 'LATER'}
                  </Text>
                  <Text style={styles.timeEstimate}>⏱️ {task.timeEstimate}</Text>
                </View>
              </View>
              <Text style={styles.taskReason}>{task.description}</Text>
              <View style={styles.taskActionRow}>
                <Text style={[styles.taskAction, { 
                  color: task.priority === 1 ? '#F44336' : task.priority === 2 ? '#FF9800' : '#FFC107',
                  fontWeight: 'bold',
                  flex: 1
                }]}>
                  👉 {task.action}
                </Text>
                {(task.type === 'post_process_needed' || task.type === 'post_process_partial') && (
                  <Button
                    mode="contained"
                    onPress={() => {
                      const componentName = task.component;
                      const component = components3D.find(c => 
                        c.name === componentName || 
                        (componentName === 'Fence Corners' && c.name === 'Fence Corner') ||
                        (componentName === 'Fence Straight' && c.name === 'Fence Straight') ||
                        (componentName === 'Fence Player' && c.name === 'Fence Player') ||
                        (componentName === 'Fielder High' && c.name === 'Fielder High') ||
                        (componentName === 'Fielder Medium' && c.name === 'Fielder Medium') ||
                        (componentName === 'Fielder Low' && c.name === 'Fielder Low') ||
                        c.name === componentName
                      );
                      if (component) handleCompleteClick(component);
                    }}
                    style={styles.actionButton}
                    buttonColor="#4CAF50"
                  >
                    Complete
                  </Button>
                )}
              </View>
            </View>
          ))}
          
        </Card.Content>
      </Card>

      {/* Print Queue Recommendations */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>🖨️ Print Queue Recommendations</Title>
          <Text style={styles.subtitle}>
            Next 2 components to print (targeting {targetProductsBuffer} products ahead)
          </Text>
          
          {printRecommendations.map((rec, index) => (
              <View key={rec.componentId} style={[styles.recommendationCard, 
                { borderLeftColor: getPriorityColor(rec.priority) }]}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.printerNumber}>
                    <Text style={styles.printerText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.recommendationTitle}>
                    <Text style={styles.componentName}>{rec.componentName}</Text>
                    <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                      {rec.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.reasonText}>📋 {rec.reason}</Text>
                
                <View style={styles.recommendationDetails}>
                  <Text style={styles.detailText}>
                    📦 Stock: {rec.currentStock} | Need: {rec.needed} | Print: {rec.shortage}
                  </Text>
                  <Text style={styles.detailText}>
                    🖨️ {rec.batchesNeeded} batches × {rec.batchSize} pieces = {formatTime(rec.totalPrintTime)}
                  </Text>
                  <Text style={styles.detailText}>
                    🎯 Will enable {rec.additionalProducts} additional products
                  </Text>
                  <View style={styles.taskActionRow}>
                    <Text style={[styles.detailText, { flex: 1, fontStyle: 'italic' }]}>
                      👉 Add {rec.shortage} pieces to print queue
                    </Text>
                    <Button
                      mode="contained"
                      onPress={() => {
                        const component = components3D.find(c => c.id === rec.componentId);
                        if (component) {
                          setPrintQuantity(rec.shortage.toString());
                          handlePrintClick(component);
                        }
                      }}
                      style={styles.actionButton}
                      buttonColor="#2196F3"
                    >
                      Add Print
                    </Button>
                  </View>
                </View>
              </View>
            ))
          }
          
          <View style={styles.queueSummary}>
            <Text style={styles.queueText}>
              Total print time: {formatTime(printRecommendations.reduce((sum, r) => sum + r.totalPrintTime, 0))}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Post-Processing Queue */}
      {postProcessingTasks.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>🛠️ Post-Processing Queue</Title>
            <Text style={styles.subtitle}>
              {postProcessingTasks.filter(t => t.blocksProduction).length > 0 ? 
                "Some items are blocking production!" :
                `${postProcessingTasks.length} items ready for post-processing`
              }
            </Text>
            
            {postProcessingTasks.map(task => (
              <View key={task.componentId} style={[styles.taskCard, 
                { borderLeftColor: getPriorityColor(task.priority) }]}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.componentName}</Text>
                  <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.taskReason}>{task.reason}</Text>
                <Text style={styles.taskDetail}>
                  📦 {task.pendingQuantity} items waiting for post-processing
                </Text>
                {task.blocksProduction && (
                  <Text style={styles.blockingText}>🚫 BLOCKING PRODUCTION</Text>
                )}
                <Button 
                  mode="contained" 
                  style={{ marginTop: 8 }}
                  buttonColor="#4CAF50"
                  onPress={() => {
                    const component = components3D.find(c => c.id === task.componentId);
                    if (component) handleCompleteClick(component);
                  }}
                >
                  Complete Items
                </Button>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Assembly Queue */}
      {assemblyTasks.filter(t => t.needed > 0).length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>🔧 Assembly Queue</Title>
            <Text style={styles.subtitle}>
              Parts that need assembly
            </Text>
            
            {assemblyTasks.filter(t => t.needed > 0).map(task => (
              <View key={task.partName} style={[styles.taskCard, 
                { borderLeftColor: getPriorityColor(task.urgency) }]}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.partName}</Text>
                  <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.urgency) }]}>
                    {task.urgency.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.taskReason}>{task.reason}</Text>
                <Text style={styles.taskDetail}>
                  {task.componentsReady ? 
                    `✅ Ready to assemble ${task.canAssemble} parts` :
                    `❌ Missing components: ${task.missingComponents.join(', ')}`
                  }
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Low Stock Alerts */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>⚠️ Low Stock Alerts</Title>
          {purchasedComponents
            .filter(comp => isLowStock(comp))
            .map(comp => (
              <View key={comp.id} style={styles.alertRow}>
                <Text style={styles.alertText}>
                  {comp.name}: {comp.quantity} {comp.unit} 
                  <Text style={{ fontSize: 12, color: '#999' }}>
                    {' '}(threshold: {getStockThreshold(comp)} {comp.unit})
                  </Text>
                </Text>
              </View>
            ))}
          {purchasedComponents.filter(comp => isLowStock(comp)).length === 0 && (
            <Paragraph>All components are well stocked! ✅</Paragraph>
          )}
        </Card.Content>
      </Card>
      </ScrollView>

      {/* Complete Post-Processing Modal */}
      <Portal>
        <Modal
          visible={completeModalVisible}
          onDismiss={() => setCompleteModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Complete Post-Processing</Title>
          <Text style={styles.modalText}>
            {selectedComponent?.name}
          </Text>
          <Text style={styles.modalSubtext}>
            {selectedComponent?.postProcessingPending} items waiting for post-processing
          </Text>
          <TextInput
            label="How many items did you complete?"
            value={completeQuantity}
            onChangeText={setCompleteQuantity}
            keyboardType="numeric"
            style={{ marginVertical: 16 }}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setCompleteModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleCompleteConfirm}
              style={styles.modalButton}
            >
              Complete
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Print Modal */}
      <Portal>
        <Modal
          visible={printModalVisible}
          onDismiss={() => setPrintModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Add Print Job</Title>
          <Text style={styles.modalText}>
            {selectedComponent?.name}
          </Text>
          <Text style={styles.modalSubtext}>
            Current stock: {selectedComponent?.postProcessingCompleted} ready, {selectedComponent?.postProcessingPending} pending
          </Text>
          <TextInput
            label="How many did you print?"
            value={printQuantity}
            onChangeText={setPrintQuantity}
            keyboardType="numeric"
            style={{ marginVertical: 16 }}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setPrintModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePrintConfirm}
              style={styles.modalButton}
            >
              Add Print
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#333',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  warningText: {
    color: '#FF5722',
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskReason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  taskDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  blockingText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: 'bold',
    marginTop: 4,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  printerNumber: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  printerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  recommendationTitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  recommendationDetails: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  queueSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  queueText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  alertRow: {
    paddingVertical: 4,
  },
  alertText: {
    color: '#FF9800',
    fontSize: 14,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeEstimate: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskAction: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
  taskActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButton: {
    marginLeft: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
});
