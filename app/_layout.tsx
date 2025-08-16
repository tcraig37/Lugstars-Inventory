import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { DatabaseService } from '../services/DatabaseService';

export default function RootLayout() {
  useEffect(() => {
    DatabaseService.initializeDatabase();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
