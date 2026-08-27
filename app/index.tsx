import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StorageService } from '../services/storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    async function checkState() {
      const isCompleted = await StorageService.isOnboardingCompleted();
      if (isCompleted) {
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/onboarding' as any);
      }
    }
    checkState();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
