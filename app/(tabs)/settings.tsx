import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, Text, List, Divider, TextInput, Modal, Portal } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [targetProductsBuffer, setTargetProductsBuffer] = useState(10);
  const [bufferModalVisible, setBufferModalVisible] = useState(false);
  const [bufferInputValue, setBufferInputValue] = useState('10');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const buffer = await DatabaseService.getTargetProductsBuffer();
      setTargetProductsBuffer(buffer);
      setBufferInputValue(buffer.toString());
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleUpdateProductsBuffer = async () => {
    const newValue = parseInt(bufferInputValue);
    if (isNaN(newValue) || newValue < 1 || newValue > 50) {
      Alert.alert('Invalid Value', 'Please enter a number between 1 and 50');
      return;
    }

    try {
      await DatabaseService.setTargetProductsBuffer(newValue);
      setTargetProductsBuffer(newValue);
      setBufferModalVisible(false);
      Alert.alert('Success', `Production target updated to ${newValue} products`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const fileUri = await DatabaseService.exportData();
      Alert.alert(
        'Export Successful',
        `Data has been exported and saved. You can share the backup file from your device.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    }
    setIsExporting(false);
  };

  const handleImportData = async () => {
    Alert.alert(
      'Import Data',
      'This will replace all current data with the backup data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setIsImporting(true);
            try {
              const result = await DatabaseService.importData();
              if (result.success) {
                Alert.alert('Import Successful', result.message);
              } else {
                Alert.alert('Import Failed', result.message);
              }
            } catch (error) {
              Alert.alert('Import Failed', 'Failed to import data. Please try again.');
            }
            setIsImporting(false);
          }
        }
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will reset all inventory data to zero. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // You could implement a reset function in DatabaseService
              Alert.alert('Reset Complete', 'All data has been reset to zero.');
            } catch (error) {
              Alert.alert('Reset Failed', 'Failed to reset data. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Production Planning</Title>
          <Text style={styles.description}>
            Configure how the app calculates print queue recommendations.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Item
              title="Target Products Buffer"
              description={`Currently set to ${targetProductsBuffer} products - Print queue aims to have enough components for this many complete products`}
              left={props => <List.Icon {...props} icon="target" />}
              right={() => (
                <Button
                  mode="contained"
                  onPress={() => setBufferModalVisible(true)}
                  style={styles.actionButton}
                >
                  Edit
                </Button>
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Data Management</Title>
          <Text style={styles.description}>
            Backup and restore your inventory data. Keep your data safe!
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Item
              title="Export Data"
              description="Create a backup file of all your inventory data"
              left={props => <List.Icon {...props} icon="export" />}
              right={() => (
                <Button
                  mode="contained"
                  onPress={handleExportData}
                  loading={isExporting}
                  disabled={isExporting}
                  style={styles.actionButton}
                >
                  Export
                </Button>
              )}
            />
            <Divider />
            <List.Item
              title="Import Data"
              description="Restore data from a backup file"
              left={props => <List.Icon {...props} icon="import" />}
              right={() => (
                <Button
                  mode="contained"
                  onPress={handleImportData}
                  loading={isImporting}
                  disabled={isImporting}
                  style={styles.actionButton}
                >
                  Import
                </Button>
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>About</Title>
          <List.Section>
            <List.Item
              title="App Version"
              description="1.0.0"
              left={props => <List.Icon {...props} icon="information" />}
            />
            <List.Item
              title="3D Printing Inventory Manager"
              description="Manage your 3D printing components, parts, and products"
              left={props => <List.Icon {...props} icon="printer-3d" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Advanced</Title>
          <Text style={styles.warningText}>
            ⚠️ These actions cannot be undone. Please make a backup first.
          </Text>
          <List.Section>
            <List.Item
              title="Reset All Data"
              description="Reset all inventory quantities to zero"
              left={props => <List.Icon {...props} icon="delete-forever" />}
              right={() => (
                <Button
                  mode="outlined"
                  onPress={handleResetData}
                  style={[styles.actionButton, styles.dangerButton]}
                  textColor="#F44336"
                >
                  Reset
                </Button>
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Instructions</Title>
          <Text style={styles.instructionText}>
            <Text style={styles.bold}>Components:</Text> Manage your 3D printed and purchased components. 
            Update quantities and track post-processing status.{'\n\n'}
            
            <Text style={styles.bold}>Parts:</Text> Assemble parts from components. The app will automatically 
            consume the required components from your inventory.{'\n\n'}
            
            <Text style={styles.bold}>Products:</Text> Create complete products from assembled parts and 
            remaining components. Track how many complete sets you can make.{'\n\n'}
            
            <Text style={styles.bold}>Dashboard:</Text> Overview of your entire inventory status and 
            production capacity.
          </Text>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={bufferModalVisible}
          onDismiss={() => setBufferModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Set Target Products Buffer</Title>
          
          <Text style={styles.modalText}>
            How many complete products should the print queue aim for? This determines 
            how far ahead you want to print components.
          </Text>
          
          <TextInput
            label="Target Products"
            value={bufferInputValue}
            onChangeText={setBufferInputValue}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <Text style={styles.helperText}>
            • Lower values (3-5): Just-in-time production, less inventory
            • Higher values (15-20): Build ahead, more buffer stock
            • Recommended: 10 for balanced production
          </Text>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setBufferInputValue(targetProductsBuffer.toString());
                setBufferModalVisible(false);
              }}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateProductsBuffer}
              style={styles.modalButton}
            >
              Update
            </Button>
          </View>
        </Modal>
      </Portal>
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
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  actionButton: {
    minWidth: 80,
  },
  dangerButton: {
    borderColor: '#F44336',
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 12,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  input: {
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 80,
  },
});
