import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, Text, Modal, Portal, TextInput } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Part } from '../../types/inventory';

export default function PartsScreen() {
  const [parts, setParts] = useState<Part[]>([]);
  const [assemblyModalVisible, setAssemblyModalVisible] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [assemblyQuantity, setAssemblyQuantity] = useState('1');

  const loadData = async () => {
    try {
      const partsData = await DatabaseService.getParts();
      setParts(partsData);
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssembly = async (part: Part) => {
    setSelectedPart(part);
    setAssemblyModalVisible(true);
  };

  const confirmAssembly = async () => {
    if (!selectedPart) return;

    const quantity = parseInt(assemblyQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const result = await DatabaseService.assemblePart(selectedPart.id, quantity);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        await loadData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to assemble part');
    }

    setAssemblyModalVisible(false);
    setSelectedPart(null);
    setAssemblyQuantity('1');
  };

  const renderPart = (part: Part) => (
    <Card key={part.id} style={styles.partCard}>
      <Card.Content>
        <Title style={styles.partName}>{part.name}</Title>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{part.quantity}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Assembled</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {part.assembled}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {part.pending}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => handleAssembly(part)}
            style={styles.assembleButton}
          >
            Assemble Part
          </Button>
        </View>

        {/* Show what components are needed for this part */}
        <View style={styles.recipeContainer}>
          <Text style={styles.recipeTitle}>Required Components:</Text>
          {part.name === 'Bowler' && (
            <View>
              <Text style={styles.recipeItem}>• 1x Bowler Gantry (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Bowler Floor (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Bowler Arm (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Bowler Chute (3D)</Text>
              <Text style={styles.recipeItem}>• 1x 1x10mm dowel pin</Text>
              <Text style={styles.recipeItem}>• 1x 8mm M3 Chicago Screw</Text>
              <Text style={styles.recipeItem}>• 1x M3 Chicago Screw Cap</Text>
            </View>
          )}
          {part.name === 'Batter' && (
            <View>
              <Text style={styles.recipeItem}>• 1x Batter Gantry (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Handle (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Lid (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Cap (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Body (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Slider (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Button Left (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Button Right (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Floor (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Hook (3D)</Text>
              <Text style={styles.recipeItem}>• 1x Batter Bat (3D)</Text>
              <Text style={styles.recipeItem}>• 1x 18mm M3 Chicago Screw</Text>
              <Text style={styles.recipeItem}>• 1x M3 Chicago Screw Cap</Text>
              <Text style={styles.recipeItem}>• 2x 6mm M2 Screws</Text>
              <Text style={styles.recipeItem}>• 1x 8mm M2 Screw</Text>
              <Text style={styles.recipeItem}>• 1x 12mm M2 Screw</Text>
              <Text style={styles.recipeItem}>• 4x M2 nuts</Text>
              <Text style={styles.recipeItem}>• 3x 0.4g Split Shot</Text>
              <Text style={styles.recipeItem}>• 1x String</Text>
              <Text style={styles.recipeItem}>• 1x String Ball</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title>Parts Assembly</Title>
            <Text style={styles.infoText}>
              Parts are assembled from 3D printed components and purchased components. 
              When you assemble a part, the required components will be automatically 
              consumed from your inventory.
            </Text>
          </Card.Content>
        </Card>

        {parts.map(renderPart)}
      </ScrollView>

      <Portal>
        <Modal
          visible={assemblyModalVisible}
          onDismiss={() => setAssemblyModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Assemble {selectedPart?.name}</Title>
          
          <Text style={styles.modalText}>
            How many {selectedPart?.name} parts would you like to assemble?
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
              onPress={confirmAssembly}
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
  partCard: {
    marginBottom: 16,
    elevation: 4,
  },
  partName: {
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
    backgroundColor: '#2196F3',
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
    marginBottom: 16,
    color: '#666',
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
