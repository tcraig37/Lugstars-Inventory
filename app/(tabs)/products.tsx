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

  const getComponentAvailability = () => {
    // For the Complete Cricket Set - use quantity (total available) not assembled
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

    return {
      parts: {
        bowler: { have: bowlerParts, need: 1, canMake: bowlerParts },
        batter: { have: batterParts, need: 1, canMake: batterParts }
      },
      components3D: {
        fenceCorners: { have: fenceCorners, need: 6, canMake: Math.floor(fenceCorners / 6) },
        fenceStraight: { have: fenceStraight, need: 4, canMake: Math.floor(fenceStraight / 4) },
        fencePlayer: { have: fencePlayer, need: 2, canMake: Math.floor(fencePlayer / 2) },
        fielderHigh: { have: fielderHigh, need: 3, canMake: Math.floor(fielderHigh / 3) },
        fielderMedium: { have: fielderMedium, need: 3, canMake: Math.floor(fielderMedium / 3) },
        fielderLow: { have: fielderLow, need: 3, canMake: Math.floor(fielderLow / 3) },
        stumps: { have: stumps, need: 1, canMake: stumps },
        batterGantry: { have: batterGantry, need: 1, canMake: batterGantry },
        bowlerGantry: { have: bowlerGantry, need: 1, canMake: bowlerGantry }
      },
      purchased: {
        balls: { have: balls, need: 1, canMake: balls },
        pitch: { have: pitch, need: 1, canMake: pitch },
        tube: { have: tube, need: 1, canMake: tube },
        mailers: { have: mailers, need: 0.5, canMake: Math.floor(mailers / 0.5) },
        bags: { have: bags, need: 1, canMake: bags },
        velcro: { have: velcro, need: 1, canMake: velcro },
        paper: { have: paper, need: 1, canMake: paper }
      }
    };
  };

  const calculateMaxProducts = () => {
    const availability = getComponentAvailability();
    
    // Calculate how many sets can be made from each component type
    const fromAssembledParts = Math.min(
      availability.parts.bowler.canMake,
      availability.parts.batter.canMake
    );
    
    const fromFullParts = Math.min(
      availability.components3D.fenceCorners.canMake,
      availability.components3D.fenceStraight.canMake,
      availability.components3D.fencePlayer.canMake,
      availability.components3D.fielderHigh.canMake,
      availability.components3D.fielderMedium.canMake,
      availability.components3D.fielderLow.canMake,
      availability.components3D.stumps.canMake,
      availability.components3D.batterGantry.canMake,
      availability.components3D.bowlerGantry.canMake
    );
    
    const fromPurchasedComponents = Math.min(
      availability.purchased.balls.canMake,
      availability.purchased.pitch.canMake,
      availability.purchased.tube.canMake,
      availability.purchased.mailers.canMake,
      availability.purchased.bags.canMake,
      availability.purchased.velcro.canMake,
      availability.purchased.paper.canMake
    );
    
    return Math.min(fromAssembledParts, fromFullParts, fromPurchasedComponents);
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
            { quantity: component.quantity - update.quantity }
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
                
                {(() => {
                  const availability = getComponentAvailability();
                  
                  return (
                    <>
                      <Text style={styles.recipeSubtitle}>Parts:</Text>
                      <Text style={styles.recipeItem}>
                        • 1x Bowler (assembled) - Have: {availability.parts.bowler.have} (can make {availability.parts.bowler.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Batter (assembled) - Have: {availability.parts.batter.have} (can make {availability.parts.batter.canMake} sets)
                      </Text>
                      
                      <Text style={styles.recipeSubtitle}>3D Components:</Text>
                      <Text style={styles.recipeItem}>
                        • 6x Fence Corner - Have: {availability.components3D.fenceCorners.have} (can make {availability.components3D.fenceCorners.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 4x Fence Straight - Have: {availability.components3D.fenceStraight.have} (can make {availability.components3D.fenceStraight.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 2x Fence Player - Have: {availability.components3D.fencePlayer.have} (can make {availability.components3D.fencePlayer.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 3x Fielder High - Have: {availability.components3D.fielderHigh.have} (can make {availability.components3D.fielderHigh.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 3x Fielder Medium - Have: {availability.components3D.fielderMedium.have} (can make {availability.components3D.fielderMedium.canMake} sets)
                      </Text>
                      <Text style={[styles.recipeItem, { color: availability.components3D.fielderLow.canMake === Math.min(
                        availability.parts.bowler.canMake,
                        availability.parts.batter.canMake,
                        availability.components3D.fenceCorners.canMake,
                        availability.components3D.fenceStraight.canMake,
                        availability.components3D.fencePlayer.canMake,
                        availability.components3D.fielderHigh.canMake,
                        availability.components3D.fielderMedium.canMake,
                        availability.components3D.fielderLow.canMake,
                        availability.components3D.stumps.canMake,
                        availability.components3D.batterGantry.canMake,
                        availability.components3D.bowlerGantry.canMake,
                        availability.purchased.balls.canMake,
                        availability.purchased.pitch.canMake,
                        availability.purchased.tube.canMake,
                        availability.purchased.mailers.canMake,
                        availability.purchased.bags.canMake,
                        availability.purchased.velcro.canMake,
                        availability.purchased.paper.canMake
                      ) ? '#ff4444' : undefined }]}>
                        • 3x Fielder Low - Have: {availability.components3D.fielderLow.have} (can make {availability.components3D.fielderLow.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Stumps - Have: {availability.components3D.stumps.have} (can make {availability.components3D.stumps.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Batter Gantry - Have: {availability.components3D.batterGantry.have} (can make {availability.components3D.batterGantry.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Bowler Gantry - Have: {availability.components3D.bowlerGantry.have} (can make {availability.components3D.bowlerGantry.canMake} sets)
                      </Text>
                      
                      <Text style={styles.recipeSubtitle}>Components:</Text>
                      <Text style={styles.recipeItem}>
                        • 1x Balls (3 varieties) - Have: {availability.purchased.balls.have} (can make {availability.purchased.balls.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Silk Printed Felt Sheet - Have: {availability.purchased.pitch.have} (can make {availability.purchased.pitch.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Cardboard Tube - Have: {availability.purchased.tube.have} (can make {availability.purchased.tube.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 0.5x Bubble Mailer - Have: {availability.purchased.mailers.have} (can make {availability.purchased.mailers.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Self Adhesive Bag - Have: {availability.purchased.bags.have} (can make {availability.purchased.bags.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x Velcro Strip - Have: {availability.purchased.velcro.have} (can make {availability.purchased.velcro.canMake} sets)
                      </Text>
                      <Text style={styles.recipeItem}>
                        • 1x A4 Paper - Have: {availability.purchased.paper.have} (can make {availability.purchased.paper.canMake} sets)
                      </Text>
                    </>
                  );
                })()}
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
