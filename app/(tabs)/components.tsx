import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, TextInput, Text, FAB, Modal, Portal } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Component3D, PurchasedComponent } from '../../types/inventory';

export default function ComponentsScreen() {
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'3d' | 'purchased'>('3d');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});

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
      setEditValues({
        quantity: component.quantity.toString(),
        postProcessingCompleted: component.postProcessingCompleted.toString(),
        postProcessingPending: component.postProcessingPending.toString(),
      });
    } else {
      setEditValues({
        quantity: component.quantity.toString(),
      });
    }
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (!editingComponent) return;

      if (editingComponent.type === '3d_component') {
        await DatabaseService.updateComponent3D(editingComponent.id, {
          quantity: parseInt(editValues.quantity) || 0,
          postProcessingCompleted: parseInt(editValues.postProcessingCompleted) || 0,
          postProcessingPending: parseInt(editValues.postProcessingPending) || 0,
        });
      } else {
        await DatabaseService.updatePurchasedComponent(
          editingComponent.id,
          parseInt(editValues.quantity) || 0
        );
      }

      await loadData();
      setEditModalVisible(false);
      setEditingComponent(null);
      Alert.alert('Success', 'Component updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update component');
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
      Alert.alert('Success', `Moved ${moveToCompleted} items to completed`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update post-processing status');
    }
  };

  const render3DComponent = (component: Component3D) => (
    <Card key={component.id} style={styles.componentCard}>
      <Card.Content>
        <Title style={styles.componentName}>{component.name}</Title>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Printed</Text>
            <Text style={styles.statValue}>{component.quantity}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {component.postProcessingCompleted}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {component.postProcessingPending}
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
          {component.postProcessingPending > 0 && (
            <Button
              mode="contained"
              onPress={() => {
                Alert.prompt(
                  'Complete Post Processing',
                  `How many items to mark as completed? (Available: ${component.postProcessingPending})`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Complete',
                      onPress: (value) => {
                        const num = parseInt(value || '0');
                        if (num > 0 && num <= component.postProcessingPending) {
                          handlePostProcessing(component.id, num);
                        }
                      }
                    }
                  ],
                  'plain-text',
                  '1'
                );
              }}
              style={[styles.button, { backgroundColor: '#4CAF50' }]}
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
          <Title>Edit {editingComponent?.name}</Title>
          
          <TextInput
            label="Quantity"
            value={editValues.quantity}
            onChangeText={(text) => setEditValues({...editValues, quantity: text})}
            keyboardType="numeric"
            style={styles.input}
          />

          {editingComponent?.type === '3d_component' && (
            <>
              <TextInput
                label="Post Processing Completed"
                value={editValues.postProcessingCompleted}
                onChangeText={(text) => setEditValues({...editValues, postProcessingCompleted: text})}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Post Processing Pending"
                value={editValues.postProcessingPending}
                onChangeText={(text) => setEditValues({...editValues, postProcessingPending: text})}
                keyboardType="numeric"
                style={styles.input}
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
});
