import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, Text, Modal, Portal, TextInput } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Product, Part, Component3D, PurchasedComponent } from '../../types/inventory';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [assemblyModalVisible, setAssemblyModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [assemblyQuantity, setAssemblyQuantity] = useState('1');

  const loadData = async () => {
    try {
      const [productsData, partsData, comp3D, purchased] = await Promise.all([
        DatabaseService.getProducts(),
        DatabaseService.getParts(),
        DatabaseService.getComponents3D(),
        DatabaseService.getPurchasedComponents()
      ]);
      
      setProducts(productsData);
      setParts(partsData);
      setComponents3D(comp3D);
      setPurchasedComponents(purchased);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateMaxProducts = () => {
    // For the Complete Cricket Set
    const bowlerParts = parts.find(p => p.name === 'Bowler')?.assembled || 0;
    const batterParts = parts.find(p => p.name === 'Batter')?.assembled || 0;
    
    // Check full parts (6 fence corners is limiting)
    const fenceCorners = components3D.find(c => c.name === 'Fence Corner')?.postProcessingCompleted || 0;
    const fenceMaxProducts = Math.floor(fenceCorners / 6);
    
    const fenceStraight = components3D.find(c => c.name === 'Fence Straight')?.postProcessingCompleted || 0;
    const fenceStraightMax = Math.floor(fenceStraight / 4);
    
    const fencePlayer = components3D.find(c => c.name === 'Fence Player')?.postProcessingCompleted || 0;
    const fencePlayerMax = Math.floor(fencePlayer / 2);
    
    const fielderHigh = components3D.find(c => c.name === 'Fielder High')?.postProcessingCompleted || 0;
    const fielderHighMax = Math.floor(fielderHigh / 3);
    
    const fielderMedium = components3D.find(c => c.name === 'Fielder Medium')?.postProcessingCompleted || 0;
    const fielderMediumMax = Math.floor(fielderMedium / 3);
    
    const fielderLow = components3D.find(c => c.name === 'Fielder Low')?.postProcessingCompleted || 0;
    const fielderLowMax = Math.floor(fielderLow / 3);
    
    const stumps = components3D.find(c => c.name === 'Stumps')?.postProcessingCompleted || 0;
    
    // Check direct components
    const balls = purchasedComponents.find(c => c.name === 'Balls (3 varieties)')?.quantity || 0;
    const pitch = purchasedComponents.find(c => c.name === 'Silk Printed Felt Sheets (pre-cut)')?.quantity || 0;
    const tube = purchasedComponents.find(c => c.name === '30cmx10cm Printed Cardboard Tube')?.quantity || 0;
    const mailers = purchasedComponents.find(c => c.name === 'Bubble Mailers')?.quantity || 0;
    const bags = purchasedComponents.find(c => c.name === '12cmx34cm self adhesive bags')?.quantity || 0;
    const velcro = purchasedComponents.find(c => c.name === 'Velcro strips')?.quantity || 0;
    const paper = purchasedComponents.find(c => c.name === 'A4 Paper')?.quantity || 0;
    
    const mailerProducts = Math.floor(mailers / 0.5); // 0.5 mailers per product
    
    return Math.min(
      bowlerParts,
      batterParts,
      fenceMaxProducts,
      fenceStraightMax,
      fencePlayerMax,
      fielderHighMax,
      fielderMediumMax,
      fielderLowMax,
      stumps,
      balls,
      pitch,
      tube,
      mailerProducts,
      bags,
      velcro,
      paper
    );
  };

  const handleProductAssembly = async (product: Product) => {
    setSelectedProduct(product);
    setAssemblyModalVisible(true);
  };

  const confirmProductAssembly = async () => {
    if (!selectedProduct) return;

    const quantity = parseInt(assemblyQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const maxPossible = calculateMaxProducts();
    if (quantity > maxPossible) {
      Alert.alert('Error', `You can only make ${maxPossible} products with current inventory`);
      return;
    }

    try {
      // Consume parts
      const bowler = parts.find(p => p.name === 'Bowler');
      const batter = parts.find(p => p.name === 'Batter');
      
      if (bowler) {
        await DatabaseService.updatePart(bowler.id, {
          assembled: bowler.assembled - quantity
        });
      }
      
      if (batter) {
        await DatabaseService.updatePart(batter.id, {
          assembled: batter.assembled - quantity
        });
      }

      // Consume 3D components
      const componentUpdates = [
        { name: 'Fence Corner', quantity: 6 * quantity },
        { name: 'Fence Straight', quantity: 4 * quantity },
        { name: 'Fence Player', quantity: 2 * quantity },
        { name: 'Fielder High', quantity: 3 * quantity },
        { name: 'Fielder Medium', quantity: 3 * quantity },
        { name: 'Fielder Low', quantity: 3 * quantity },
        { name: 'Stumps', quantity: 1 * quantity },
      ];

      for (const update of componentUpdates) {
        const component = components3D.find(c => c.name === update.name);
        if (component) {
          await DatabaseService.updateComponent3D(component.id, {
            postProcessingCompleted: component.postProcessingCompleted - update.quantity
          });
        }
      }

      // Consume purchased components
      const purchasedUpdates = [
        { name: 'Balls (3 varieties)', quantity: 1 * quantity },
        { name: 'Silk Printed Felt Sheets (pre-cut)', quantity: 1 * quantity },
        { name: '30cmx10cm Printed Cardboard Tube', quantity: 1 * quantity },
        { name: 'Bubble Mailers', quantity: 0.5 * quantity },
        { name: '12cmx34cm self adhesive bags', quantity: 1 * quantity },
        { name: 'Velcro strips', quantity: 1 * quantity },
        { name: 'A4 Paper', quantity: 1 * quantity },
      ];

      for (const update of purchasedUpdates) {
        const component = purchasedComponents.find(c => c.name === update.name);
        if (component) {
          await DatabaseService.updatePurchasedComponent(
            component.id,
            component.quantity - update.quantity
          );
        }
      }

      // Update product quantity
      await DatabaseService.updateProduct(
        selectedProduct.id,
        selectedProduct.quantity + quantity
      );

      await loadData();
      Alert.alert('Success', `Successfully created ${quantity} complete product(s)!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to assemble product');
    }

    setAssemblyModalVisible(false);
    setSelectedProduct(null);
    setAssemblyQuantity('1');
  };

  const maxProducts = calculateMaxProducts();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title>Product Assembly</Title>
            <Text style={styles.infoText}>
              Products are assembled from completed parts and components. 
              You can currently make <Text style={styles.highlightText}>{maxProducts}</Text> complete products.
            </Text>
          </Card.Content>
        </Card>

        {products.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <Card.Content>
              <Title style={styles.productName}>{product.name}</Title>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                    {product.quantity}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Can Make</Text>
                  <Text style={[styles.statValue, { color: '#2196F3' }]}>
                    {maxProducts}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={() => handleProductAssembly(product)}
                  disabled={maxProducts === 0}
                  style={styles.assembleButton}
                >
                  Assemble Product
                </Button>
              </View>

              {/* Show what's needed for the product */}
              <View style={styles.recipeContainer}>
                <Text style={styles.recipeTitle}>Required for 1 Complete Cricket Set:</Text>
                <Text style={styles.recipeSubtitle}>Parts:</Text>
                <Text style={styles.recipeItem}>• 1x Bowler (assembled)</Text>
                <Text style={styles.recipeItem}>• 1x Batter (assembled)</Text>
                
                <Text style={styles.recipeSubtitle}>3D Components:</Text>
                <Text style={styles.recipeItem}>• 6x Fence Corner</Text>
                <Text style={styles.recipeItem}>• 4x Fence Straight</Text>
                <Text style={styles.recipeItem}>• 2x Fence Player</Text>
                <Text style={styles.recipeItem}>• 3x Fielder High</Text>
                <Text style={styles.recipeItem}>• 3x Fielder Medium</Text>
                <Text style={styles.recipeItem}>• 3x Fielder Low</Text>
                <Text style={styles.recipeItem}>• 1x Stumps</Text>
                
                <Text style={styles.recipeSubtitle}>Components:</Text>
                <Text style={styles.recipeItem}>• 1x Balls (3 varieties)</Text>
                <Text style={styles.recipeItem}>• 1x Silk Printed Felt Sheet</Text>
                <Text style={styles.recipeItem}>• 1x Cardboard Tube</Text>
                <Text style={styles.recipeItem}>• 0.5x Bubble Mailer</Text>
                <Text style={styles.recipeItem}>• 1x Self Adhesive Bag</Text>
                <Text style={styles.recipeItem}>• 1x Velcro Strip</Text>
                <Text style={styles.recipeItem}>• 1x A4 Paper (manual)</Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={assemblyModalVisible}
          onDismiss={() => setAssemblyModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Assemble {selectedProduct?.name}</Title>
          
          <Text style={styles.modalText}>
            How many {selectedProduct?.name} would you like to assemble?
          </Text>
          <Text style={styles.modalSubtext}>
            Maximum possible: {maxProducts}
          </Text>
          
          <TextInput
            label="Quantity"
            value={assemblyQuantity}
            onChangeText={setAssemblyQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setAssemblyModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirmProductAssembly}
              style={styles.modalButton}
            >
              Assemble
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  productCard: {
    marginBottom: 16,
    elevation: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  assembleButton: {
    backgroundColor: '#4CAF50',
  },
  recipeContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  recipeSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#555',
  },
  recipeItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  modalSubtext: {
    fontSize: 14,
    marginBottom: 16,
    color: '#999',
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
