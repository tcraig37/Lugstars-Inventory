import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, TextInput, Text, FAB, Modal, Portal, Checkbox } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Component3D, PurchasedComponent } from '../../types/inventory';

export default function ComponentsScreen() {
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'3d' | 'purchased'>('3d');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [completingComponent, setCompletingComponent] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [completeQuantity, setCompleteQuantity] = useState('');

  const loadData = async () => {
    try {
      const [comp3D, purchased] = await Promise.all([
        DatabaseService.getComponents3D(),
        DatabaseService.getPurchasedComponents()
      ]);
      
      setComponents3D(comp3D);
      setPurchasedComponents(purchased);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (component: any) => {
    setEditingComponent(component);
    if (component.type === '3d_component') {
      const totalPrinted = (component.postProcessingCompleted || 0) + (component.postProcessingPending || 0);
      setEditValues({
        newPrintQuantity: '',  // For adding newly printed items
        // Direct quantity corrections
        totalPrinted: totalPrinted.toString(),
        postProcessingCompleted: component.postProcessingCompleted?.toString() || '0',
        postProcessingPending: component.postProcessingPending?.toString() || '0',
        // Settings
        batchSize: component.batchSize?.toString() || '10',
        printTimeMinutes: component.printTimeMinutes?.toString() || '60',
        requiresPostProcessing: component.requiresPostProcessing !== false,
        editMode: 'add_print', // 'add_print' or 'correct_quantities'
      });
    } else {
      setEditValues({
        quantity: component.quantity.toString(),
        lowStockThreshold: component.lowStockThreshold?.toString() || '',
      });
    }
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (!editingComponent) return;

      console.log('Saving component:', editingComponent.name, editValues);

      if (editingComponent.type === '3d_component') {
        if (editValues.editMode === 'correct_quantities') {
          // Direct quantity correction mode
          const totalPrinted = parseInt(editValues.totalPrinted) || 0;
          const postProcessingCompleted = parseInt(editValues.postProcessingCompleted) || 0;
          const postProcessingPending = parseInt(editValues.postProcessingPending) || 0;
          
          // Validate that the numbers make sense
          if (postProcessingCompleted + postProcessingPending !== totalPrinted) {
            Alert.alert('Error', 'Post-processing completed + pending must equal total printed');
            return;
          }
          
          await DatabaseService.updateComponent3D(editingComponent.id, {
            quantity: totalPrinted, // Total quantity is total printed
            postProcessingCompleted: postProcessingCompleted,
            postProcessingPending: postProcessingPending,
            batchSize: parseInt(editValues.batchSize) || 10,
            printTimeMinutes: parseInt(editValues.printTimeMinutes) || 60,
            requiresPostProcessing: editValues.requiresPostProcessing,
          });
          
          Alert.alert('Success', 'Quantities corrected successfully');
        } else {
          // Add new print mode (existing functionality)
          const newPrintQuantity = parseInt(editValues.newPrintQuantity) || 0;
          
          if (newPrintQuantity > 0) {
            // Add newly printed items
            if (editValues.requiresPostProcessing) {
              // Items go to pending post-processing
              await DatabaseService.updateComponent3D(editingComponent.id, {
                quantity: editingComponent.quantity + newPrintQuantity,
                postProcessingPending: editingComponent.postProcessingPending + newPrintQuantity,
                batchSize: parseInt(editValues.batchSize) || 10,
                printTimeMinutes: parseInt(editValues.printTimeMinutes) || 60,
                requiresPostProcessing: editValues.requiresPostProcessing,
              });
            } else {
              // Items are ready immediately (no post-processing needed)
              await DatabaseService.updateComponent3D(editingComponent.id, {
                quantity: editingComponent.quantity + newPrintQuantity,
                postProcessingCompleted: editingComponent.postProcessingCompleted + newPrintQuantity,
                batchSize: parseInt(editValues.batchSize) || 10,
                printTimeMinutes: parseInt(editValues.printTimeMinutes) || 60,
                requiresPostProcessing: editValues.requiresPostProcessing,
              });
            }
            
            const addedQuantity = parseInt(editValues.newPrintQuantity);
            if (editValues.requiresPostProcessing) {
              Alert.alert('Success', `Added ${addedQuantity} pieces to pending post-processing`);
            } else {
              Alert.alert('Success', `Added ${addedQuantity} pieces (ready for assembly)`);
            }
          } else {
            // Just updating settings without adding new prints
            await DatabaseService.updateComponent3D(editingComponent.id, {
              batchSize: parseInt(editValues.batchSize) || 10,
              printTimeMinutes: parseInt(editValues.printTimeMinutes) || 60,
              requiresPostProcessing: editValues.requiresPostProcessing,
            });
            Alert.alert('Success', 'Settings updated successfully');
          }
        }
      } else {
        await DatabaseService.updatePurchasedComponent(editingComponent.id, {
          quantity: parseInt(editValues.quantity) || 0,
          lowStockThreshold: editValues.lowStockThreshold ? parseFloat(editValues.lowStockThreshold) : null,
        });
        Alert.alert('Success', 'Component updated successfully');
      }

      await loadData();
      setEditModalVisible(false);
      setEditingComponent(null);
      
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', `Failed to update component: ${error.message || error}`);
    }
  };

  const handlePostProcessing = async (componentId: number, moveToCompleted: number) => {
    try {
      const component = components3D.find(c => c.id === componentId);
      if (!component) return;

      if (component.postProcessingPending < moveToCompleted) {
        Alert.alert('Error', 'Not enough pending items to complete');
        return;
      }

      await DatabaseService.updateComponent3D(componentId, {
        postProcessingCompleted: component.postProcessingCompleted + moveToCompleted,
        postProcessingPending: component.postProcessingPending - moveToCompleted,
      });

      await loadData();
      Alert.alert('Success', `Moved ${moveToCompleted} items to ready for assembly`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update post-processing status');
    }
  };

  const handleCompleteClick = (component: Component3D) => {
    setCompletingComponent(component);
    setCompleteQuantity('');
    setCompleteModalVisible(true);
  };

  const handleCompleteConfirm = async () => {
    if (!completingComponent) return;
    
    const num = parseInt(completeQuantity);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }
    
    if (num > completingComponent.postProcessingPending) {
      Alert.alert('Error', `You can only complete up to ${completingComponent.postProcessingPending} items`);
      return;
    }

    await handlePostProcessing(completingComponent.id, num);
    setCompleteModalVisible(false);
    setCompletingComponent(null);
    setCompleteQuantity('');
  };

  const render3DComponent = (component: Component3D) => (
    <Card key={component.id} style={styles.componentCard}>
      <Card.Content>
        <Title style={styles.componentName}>{component.name}</Title>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Ready for Assembly</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {component.postProcessingCompleted}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending Post-Processing</Text>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {component.postProcessingPending}
            </Text>
          </View>
        </View>
        <View style={styles.batchInfo}>
          <Text style={styles.batchText}>
            🖨️ Batch: {component.batchSize || 10} pieces | ⏱️ Time: {component.printTimeMinutes || 60} min
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => handleEdit(component)}
            style={styles.button}
            icon="printer-3d"
          >
            Add Print
          </Button>
          {component.postProcessingPending > 0 && (
            <Button
              mode="contained"
              onPress={() => handleCompleteClick(component)}
              style={[styles.button, { backgroundColor: '#4CAF50' }]}
              icon="check"
            >
              Complete
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderPurchasedComponent = (component: PurchasedComponent) => (
    <Card key={component.id} style={styles.componentCard}>
      <Card.Content>
        <Title style={styles.componentName}>{component.name}</Title>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Quantity</Text>
            <Text style={styles.statValue}>
              {component.quantity} {component.unit}
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => handleEdit(component)}
            style={styles.button}
          >
            Edit
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <Button
          mode={selectedTab === '3d' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('3d')}
          style={styles.tabButton}
        >
          3D Components
        </Button>
        <Button
          mode={selectedTab === 'purchased' ? 'contained' : 'outlined'}
          onPress={() => setSelectedTab('purchased')}
          style={styles.tabButton}
        >
          Purchased
        </Button>
      </View>

      <ScrollView style={styles.scrollView}>
        {selectedTab === '3d' 
          ? components3D.map(render3DComponent)
          : purchasedComponents.map(renderPurchasedComponent)
        }
      </ScrollView>

      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <Title>
              {editingComponent?.type === '3d_component' ? '🖨️ Print & Configure' : 'Edit'} {editingComponent?.name}
            </Title>
          
          {editingComponent?.type === '3d_component' ? (
            <>
              <Text style={styles.modalSectionTitle}>📦 Current Stock</Text>
              <View style={styles.currentStockContainer}>
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Ready</Text>
                  <Text style={[styles.stockValue, { color: '#4CAF50' }]}>
                    {editingComponent.postProcessingCompleted}
                  </Text>
                </View>
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Pending</Text>
                  <Text style={[styles.stockValue, { color: '#FF9800' }]}>
                    {editingComponent.postProcessingPending}
                  </Text>
                </View>
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Total</Text>
                  <Text style={[styles.stockValue, { color: '#2196F3' }]}>
                    {(editingComponent.postProcessingCompleted || 0) + (editingComponent.postProcessingPending || 0)}
                  </Text>
                </View>
              </View>

              {/* Mode Selection */}
              <Text style={styles.modalSectionTitle}>📝 What do you want to do?</Text>
              <View style={styles.modeSelection}>
                <Button
                  mode={editValues.editMode === 'add_print' ? 'contained' : 'outlined'}
                  onPress={() => setEditValues({...editValues, editMode: 'add_print'})}
                  style={[styles.modeButton, editValues.editMode === 'add_print' && { backgroundColor: '#4CAF50' }]}
                >
                  🖨️ Add New Print
                </Button>
                <Button
                  mode={editValues.editMode === 'correct_quantities' ? 'contained' : 'outlined'}
                  onPress={() => setEditValues({...editValues, editMode: 'correct_quantities'})}
                  style={[styles.modeButton, editValues.editMode === 'correct_quantities' && { backgroundColor: '#FF9800' }]}
                >
                  ✏️ Correct Quantities
                </Button>
              </View>

              {editValues.editMode === 'add_print' ? (
                <>
                  <Text style={styles.modalSectionTitle}>🖨️ Add New Print</Text>
                  <TextInput
                    label="How many did you just print?"
                    value={editValues.newPrintQuantity}
                    onChangeText={(text) => setEditValues({...editValues, newPrintQuantity: text})}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Enter quantity printed"
                  />

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      status={editValues.requiresPostProcessing ? 'checked' : 'unchecked'}
                      onPress={() => setEditValues({...editValues, requiresPostProcessing: !editValues.requiresPostProcessing})}
                    />
                    <Text style={styles.checkboxLabel}>
                      Requires post-processing (if unchecked, items go directly to "Ready")
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalSectionTitle}>✏️ Correct Quantities</Text>
                  <Text style={styles.correctionWarning}>
                    ⚠️ Use this to fix mistakes in your inventory counts
                  </Text>
                  
                  <TextInput
                    label="Total Printed (Ready + Pending)"
                    value={editValues.totalPrinted}
                    onChangeText={(text) => {
                      const total = parseInt(text) || 0;
                      const completed = parseInt(editValues.postProcessingCompleted) || 0;
                      const pending = total - completed;
                      setEditValues({
                        ...editValues, 
                        totalPrinted: text,
                        postProcessingPending: Math.max(0, pending).toString()
                      });
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  
                  <TextInput
                    label="Ready for Assembly (Post-processed)"
                    value={editValues.postProcessingCompleted}
                    onChangeText={(text) => {
                      const completed = parseInt(text) || 0;
                      const total = parseInt(editValues.totalPrinted) || 0;
                      const pending = total - completed;
                      setEditValues({
                        ...editValues, 
                        postProcessingCompleted: text,
                        postProcessingPending: Math.max(0, pending).toString()
                      });
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  
                  <TextInput
                    label="Pending Post-processing (Auto-calculated)"
                    value={editValues.postProcessingPending}
                    editable={false}
                    style={[styles.input, { backgroundColor: '#f5f5f5' }]}
                  />
                </>
              )}

              <Text style={styles.modalSectionTitle}>⚙️ Print Settings</Text>
              <TextInput
                label="Batch Size (pieces per print)"
                value={editValues.batchSize}
                onChangeText={(text) => setEditValues({...editValues, batchSize: text})}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Print Time (minutes per batch)"
                value={editValues.printTimeMinutes}
                onChangeText={(text) => setEditValues({...editValues, printTimeMinutes: text})}
                keyboardType="numeric"
                style={styles.input}
              />
            </>
          ) : (
            <>
              <TextInput
                label="Quantity"
                value={editValues.quantity}
                onChangeText={(text) => setEditValues({...editValues, quantity: text})}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Low Stock Threshold (optional)"
                value={editValues.lowStockThreshold}
                onChangeText={(text) => setEditValues({...editValues, lowStockThreshold: text})}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Leave empty for automatic threshold"
              />
            </>
          )}

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setEditModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
          </ScrollView>
        </Modal>

        {/* Complete Post-Processing Modal */}
        <Modal
          visible={completeModalVisible}
          onDismiss={() => setCompleteModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>✅ Complete Post-Processing</Title>
          <Text style={styles.completeModalText}>
            {completingComponent?.name}
          </Text>
          <Text style={styles.completeModalSubtext}>
            Available to complete: {completingComponent?.postProcessingPending || 0} items
          </Text>
          
          <TextInput
            label="How many did you complete?"
            value={completeQuantity}
            onChangeText={setCompleteQuantity}
            keyboardType="numeric"
            style={styles.input}
            placeholder="Enter quantity completed"
            autoFocus
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
              disabled={!completeQuantity || parseInt(completeQuantity) <= 0}
            >
              Complete
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  componentCard: {
    marginBottom: 16,
    elevation: 4,
  },
  componentName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%', // Limit height to 80% of screen
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  input: {
    marginBottom: 16,
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
  batchInfo: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  batchText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  currentStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  completeModalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  completeModalSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  modeSelection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  correctionWarning: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#FF9800',
    fontStyle: 'italic',
  },
});
