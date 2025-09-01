import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, Text, Modal, Portal, TextInput } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';
import { Part, Component3D, PurchasedComponent } from '../../types/inventory';

export default function PartsScreen() {
  const [parts, setParts] = useState<Part[]>([]);
  const [components3D, setComponents3D] = useState<Component3D[]>([]);
  const [purchasedComponents, setPurchasedComponents] = useState<PurchasedComponent[]>([]);
  const [assemblyModalVisible, setAssemblyModalVisible] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [assemblyQuantity, setAssemblyQuantity] = useState('1');

  const loadData = async () => {
    try {
      const [partsData, comp3D, purchased] = await Promise.all([
        DatabaseService.getParts(),
        DatabaseService.getComponents3D(),
        DatabaseService.getPurchasedComponents()
      ]);
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

  const getComponentAvailabilityForPart = (partName: string) => {
    if (partName === 'Bowler') {
      const bowlerFloor = components3D.find(c => c.name === 'Bowler Floor')?.postProcessingCompleted || 0;
      const bowlerArm = components3D.find(c => c.name === 'Bowler Arm')?.postProcessingCompleted || 0;
      const bowlerChute = components3D.find(c => c.name === 'Bowler Chute')?.postProcessingCompleted || 0;
      const dowelPin = purchasedComponents.find(c => c.name === '1x10mm dowel pins')?.quantity || 0;
      const chicagoScrew8mm = purchasedComponents.find(c => c.name === '8mm M3 Chicago Screws')?.quantity || 0;
      const chicagoScrewCap = purchasedComponents.find(c => c.name === 'M3 Chicago Screw Cap')?.quantity || 0;

      return {
        bowlerFloor: { have: bowlerFloor, need: 1 },
        bowlerArm: { have: bowlerArm, need: 1 },
        bowlerChute: { have: bowlerChute, need: 1 },
        dowelPin: { have: dowelPin, need: 1 },
        chicagoScrew8mm: { have: chicagoScrew8mm, need: 1 },
        chicagoScrewCap: { have: chicagoScrewCap, need: 1 },
        canMake: Math.min(bowlerFloor, bowlerArm, bowlerChute, dowelPin, chicagoScrew8mm, chicagoScrewCap)
      };
    } else if (partName === 'Batter') {
      const batterHandle = components3D.find(c => c.name === 'Batter Handle')?.postProcessingCompleted || 0;
      const batterLid = components3D.find(c => c.name === 'Batter Lid')?.postProcessingCompleted || 0;
      const batterCap = components3D.find(c => c.name === 'Batter Cap')?.postProcessingCompleted || 0;
      const batterBody = components3D.find(c => c.name === 'Batter Body')?.postProcessingCompleted || 0;
      const batterSlider = components3D.find(c => c.name === 'Batter Slider')?.postProcessingCompleted || 0;
      const batterButtonLeft = components3D.find(c => c.name === 'Batter Button Left')?.postProcessingCompleted || 0;
      const batterButtonRight = components3D.find(c => c.name === 'Batter Button Right')?.postProcessingCompleted || 0;
      const batterFloor = components3D.find(c => c.name === 'Batter Floor')?.postProcessingCompleted || 0;
      const batterHook = components3D.find(c => c.name === 'Batter Hook')?.postProcessingCompleted || 0;
      const batterBat = components3D.find(c => c.name === 'Batter Bat')?.postProcessingCompleted || 0;
      
      const chicagoScrew18mm = purchasedComponents.find(c => c.name === '18mm M3 Chicago Screws')?.quantity || 0;
      const chicagoScrewCap = purchasedComponents.find(c => c.name === 'M3 Chicago Screw Cap')?.quantity || 0;
      const screw6mm = purchasedComponents.find(c => c.name === '6mm M2 Screws')?.quantity || 0;
      const screw8mm = purchasedComponents.find(c => c.name === '8mm M2 Screws')?.quantity || 0;
      const screw12mm = purchasedComponents.find(c => c.name === '12mm M2 Screws')?.quantity || 0;
      const m2nuts = purchasedComponents.find(c => c.name === 'M2 nuts')?.quantity || 0;
      const splitShot = purchasedComponents.find(c => c.name === '0.4g Split Shot')?.quantity || 0;
      const string = purchasedComponents.find(c => c.name === 'String')?.quantity || 0;
      const stringBall = purchasedComponents.find(c => c.name === 'String Ball')?.quantity || 0;

      return {
        batterHandle: { have: batterHandle, need: 1 },
        batterLid: { have: batterLid, need: 1 },
        batterCap: { have: batterCap, need: 1 },
        batterBody: { have: batterBody, need: 1 },
        batterSlider: { have: batterSlider, need: 1 },
        batterButtonLeft: { have: batterButtonLeft, need: 1 },
        batterButtonRight: { have: batterButtonRight, need: 1 },
        batterFloor: { have: batterFloor, need: 1 },
        batterHook: { have: batterHook, need: 1 },
        batterBat: { have: batterBat, need: 1 },
        chicagoScrew18mm: { have: chicagoScrew18mm, need: 1 },
        chicagoScrewCap: { have: chicagoScrewCap, need: 1 },
        screw6mm: { have: screw6mm, need: 2 },
        screw8mm: { have: screw8mm, need: 1 },
        screw12mm: { have: screw12mm, need: 1 },
        m2nuts: { have: m2nuts, need: 4 },
        splitShot: { have: splitShot, need: 3 },
        string: { have: string, need: 1 },
        stringBall: { have: stringBall, need: 1 },
        canMake: Math.min(
          batterHandle, batterLid, batterCap, batterBody, batterSlider,
          batterButtonLeft, batterButtonRight, batterFloor, batterHook, batterBat,
          chicagoScrew18mm, chicagoScrewCap, Math.floor(screw6mm / 2), screw8mm, screw12mm,
          Math.floor(m2nuts / 4), Math.floor(splitShot / 3), string, stringBall
        )
      };
    }
    return { canMake: 0 };
  };

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

  const renderPart = (part: Part) => {
    const availability = getComponentAvailabilityForPart(part.name);
    
    return (
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
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Can Make</Text>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>
                {availability.canMake}
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => handleAssembly(part)}
              style={styles.assembleButton}
              disabled={availability.canMake === 0}
            >
              Assemble Part
            </Button>
          </View>

          {/* Show what components are needed for this part */}
          <View style={styles.recipeContainer}>
            <Text style={styles.recipeTitle}>Required Components:</Text>
            {part.name === 'Bowler' && availability.bowlerFloor && (
              <View>
                <Text style={styles.recipeItem}>• 1x Bowler Floor (3D) - Have: {availability.bowlerFloor.have}</Text>
                <Text style={styles.recipeItem}>• 1x Bowler Arm (3D) - Have: {availability.bowlerArm.have}</Text>
                <Text style={styles.recipeItem}>• 1x Bowler Chute (3D) - Have: {availability.bowlerChute.have}</Text>
                <Text style={styles.recipeItem}>• 1x 1x10mm dowel pins - Have: {availability.dowelPin.have}</Text>
                <Text style={styles.recipeItem}>• 1x 8mm M3 Chicago Screws - Have: {availability.chicagoScrew8mm.have}</Text>
                <Text style={styles.recipeItem}>• 1x M3 Chicago Screw Cap - Have: {availability.chicagoScrewCap.have}</Text>
                <Text style={styles.noteText}>Note: Bowler Gantry is tracked separately</Text>
              </View>
            )}
            {part.name === 'Batter' && availability.batterHandle && (
              <View>
                <Text style={styles.recipeItem}>• 1x Batter Handle (3D) - Have: {availability.batterHandle.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Lid (3D) - Have: {availability.batterLid.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Cap (3D) - Have: {availability.batterCap.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Body (3D) - Have: {availability.batterBody.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Slider (3D) - Have: {availability.batterSlider.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Button Left (3D) - Have: {availability.batterButtonLeft.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Button Right (3D) - Have: {availability.batterButtonRight.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Floor (3D) - Have: {availability.batterFloor.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Hook (3D) - Have: {availability.batterHook.have}</Text>
                <Text style={styles.recipeItem}>• 1x Batter Bat (3D) - Have: {availability.batterBat.have}</Text>
                <Text style={styles.recipeItem}>• 1x 18mm M3 Chicago Screws - Have: {availability.chicagoScrew18mm.have}</Text>
                <Text style={styles.recipeItem}>• 1x M3 Chicago Screw Cap - Have: {availability.chicagoScrewCap.have}</Text>
                <Text style={styles.noteText}>Note: Batter Gantry is tracked separately</Text>
                <Text style={styles.recipeItem}>• 2x 6mm M2 Screws - Have: {availability.screw6mm.have}</Text>
                <Text style={styles.recipeItem}>• 1x 8mm M2 Screws - Have: {availability.screw8mm.have}</Text>
                <Text style={styles.recipeItem}>• 1x 12mm M2 Screws - Have: {availability.screw12mm.have}</Text>
                <Text style={styles.recipeItem}>• 4x M2 nuts - Have: {availability.m2nuts.have}</Text>
                <Text style={styles.recipeItem}>• 3x 0.4g Split Shot - Have: {availability.splitShot.have}</Text>
                <Text style={styles.recipeItem}>• 1x String - Have: {availability.string.have}</Text>
                <Text style={styles.recipeItem}>• 1x String Ball - Have: {availability.stringBall.have}</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

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
  noteText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
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
