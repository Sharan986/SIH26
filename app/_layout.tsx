import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCallState } from '../hooks/useCallState';
import { useAutoCallDetection } from '../hooks/useAutoCallDetection';
import { usePermissions } from '../hooks/usePermissions';

import { WebRTCProvider } from '../contexts/WebRTCContext';
import IncomingCallModal from '../components/IncomingCallModal';

/**
 * Inner shell — must be a separate component so hooks can access
 * the router context provided by expo-router's root Stack.
 */
function AppShell() {
  // Request READ_PHONE_STATE permission on startup — required for TelephonyManager events
  const { phoneState, requestPhoneState } = usePermissions();

  useEffect(() => {
    if (!phoneState) {
      requestPhoneState();
    }
  }, [phoneState, requestPhoneState]);

  // Bootstrap the TelephonyManager listener for the entire app lifetime
  useCallState();
  // Auto-start/stop analysis when a phone call is detected
  useAutoCallDetection();
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WebRTCProvider>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F8FAFC' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="onboarding/permissions" />
          <Stack.Screen name="onboarding/accessibility" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="live/index"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="live/result"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="history/[id]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings/permissions"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings/privacy"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings/model"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings/dev-test"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
        {/* Global call detector — must be inside Stack so router is available */}
        <AppShell />
        
        {/* Global WebRTC Incoming Call UI */}
        <IncomingCallModal />
      </WebRTCProvider>
    </SafeAreaProvider>
  );
}
