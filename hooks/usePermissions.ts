import { useEffect, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Audio } from 'expo-av';
import { CallAudioService } from '../modules/call-audio/src';
import { PermissionStatus } from '../types/device';

/**
 * Requests READ_PHONE_STATE at runtime.
 * On Android 6+ this is a dangerous permission — it MUST be granted
 * explicitly by the user or TelephonyManager fires no events at all.
 */
async function requestPhoneStatePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: 'Phone State Permission',
        message:
          'VoiceGuard needs to detect active calls to automatically start voice analysis.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_: any) {
    return false;
  }
}

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>({
    microphone: false,
    phoneState: false,
    accessibility: false,
    isChecking: true,
  });

  const checkPermissions = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    // 1. Microphone
    let micGranted = false;
    try {
      const micStatus = await Audio.getPermissionsAsync();
      micGranted = micStatus.granted;
    } catch (_: any) {}

    // 2. Phone State — check if already granted, request if not
    let phoneGranted = false;
    try {
      if (Platform.OS === 'android') {
        const existing = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
        );
        phoneGranted = existing;
      }
    } catch (_: any) {}

    // 3. Accessibility
    let accessibilityEnabled = false;
    try {
      accessibilityEnabled = await CallAudioService.isAccessibilityEnabled();
    } catch (_: any) {}

    setStatus({
      microphone: micGranted,
      phoneState: phoneGranted,
      accessibility: accessibilityEnabled,
      isChecking: false,
    });
  }, []);

  const requestPhoneState = useCallback(async () => {
    const granted = await requestPhoneStatePermission();
    setStatus((prev) => ({ ...prev, phoneState: granted }));
    return granted;
  }, []);

  const requestMicrophone = useCallback(async () => {
    try {
      const res = await Audio.requestPermissionsAsync();
      setStatus((prev) => ({ ...prev, microphone: res.granted }));
      return res.granted;
    } catch (_: any) {
      return false;
    }
  }, []);

  const openAccessibilitySettings = useCallback(async () => {
    try {
      await CallAudioService.openAccessibilitySettings();
    } catch (_: any) {}
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...status,
    checkPermissions,
    requestMicrophone,
    requestPhoneState,
    openAccessibilitySettings,
  };
}
