import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { DatabaseService } from '../services/DatabaseService';

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await DatabaseService.initializeDatabase();
        setDatabaseReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    initDB();
  }, []);

  if (!databaseReady) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Initializing database...</Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
