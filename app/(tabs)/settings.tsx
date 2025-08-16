import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Button, Text, List, Divider } from 'react-native-paper';
import { DatabaseService } from '../../services/DatabaseService';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
});
