import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, ProgressBar, Button } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Component3D, PurchasedComponent, Part, Product } from '../../types/inventory';

export default function DashboardScreen() {
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [comp3D, purchased, partsData, productsData] = await Promise.all([
        DatabaseService.getComponents3D(),
        DatabaseService.getPurchasedComponents(),
        DatabaseService.getParts(),
        DatabaseService.getProducts()
      ]);
      
      setComponents3D(comp3D);
      setPurchasedComponents(purchased);
      setParts(partsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const calculateProductionCapacity = () => {
    // Calculate how many complete products can be made with current inventory
    const bowlerParts = parts.find(p => p.name === 'Bowler')?.assembled || 0;
    const batterParts = parts.find(p => p.name === 'Batter')?.assembled || 0;
    
    // Get minimum count of required full parts (6 fence corners is the limiting factor)
    const fenceCorners = components3D.find(c => c.name === 'Fence Corner')?.postProcessingCompleted || 0;
    const minFullParts = Math.floor(fenceCorners / 6); // 6 fence corners per product
    
    // Check other critical components
    const balls = purchasedComponents.find(c => c.name === 'Balls (3 varieties)')?.quantity || 0;
    const pitch = purchasedComponents.find(c => c.name === 'Silk Printed Felt Sheets (pre-cut)')?.quantity || 0;
    
    return Math.min(bowlerParts, batterParts, minFullParts, balls, pitch);
  };

  const getTotalComponents3D = () => {
    return components3D.reduce((sum, comp) => sum + comp.quantity, 0);
  };

  const getCompletedComponents3D = () => {
    return components3D.reduce((sum, comp) => sum + comp.postProcessingCompleted, 0);
  };

  const getPendingComponents3D = () => {
    return components3D.reduce((sum, comp) => sum + comp.postProcessingPending, 0);
  };

  const productionCapacity = calculateProductionCapacity();
  const totalComponents = getTotalComponents3D();
  const completedComponents = getCompletedComponents3D();
  const pendingComponents = getPendingComponents3D();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title>Production Overview</Title>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Products Ready to Assemble:</Text>
            <Text style={[styles.statValue, { color: productionCapacity > 0 ? '#4CAF50' : '#FF9800' }]}>
              {productionCapacity}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>3D Components Status</Title>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Printed:</Text>
            <Text style={styles.statValue}>{totalComponents}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Post-Processing Complete:</Text>
            <Text style={styles.statValue}>{completedComponents}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Post-Processing Pending:</Text>
            <Text style={styles.statValue}>{pendingComponents}</Text>
          </View>
          {totalComponents > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Completion Progress</Text>
              <ProgressBar
                progress={completedComponents / totalComponents}
                color="#4CAF50"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round((completedComponents / totalComponents) * 100)}%
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Parts Status</Title>
          {parts.map((part) => (
            <View key={part.id} style={styles.partRow}>
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partCount}>Assembled: {part.assembled}</Text>
              <Text style={styles.partCount}>Pending: {part.pending}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Products</Title>
          {products.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCount}>Completed: {product.quantity}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Low Stock Alerts</Title>
          {purchasedComponents
            .filter(comp => comp.quantity < 10) // Threshold for low stock
            .map(comp => (
              <View key={comp.id} style={styles.alertRow}>
                <Text style={styles.alertText}>{comp.name}: {comp.quantity} {comp.unit}</Text>
              </View>
            ))}
          {purchasedComponents.filter(comp => comp.quantity < 10).length === 0 && (
            <Paragraph>All components are well stocked! ✅</Paragraph>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
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
    elevation: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  partName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  partCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  alertRow: {
    paddingVertical: 4,
  },
  alertText: {
    color: '#FF5722',
    fontSize: 14,
  },
});
