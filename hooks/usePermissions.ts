import { useEffect, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import { CallAudioService } from '../modules/call-audio/src';
import { PermissionStatus } from '../types/device';

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

    // 2. Accessibility
    let accessibilityEnabled = false;
    try {
      accessibilityEnabled = await CallAudioService.isAccessibilityEnabled();
    } catch (_: any) {}

    setStatus({
      microphone: micGranted,
      phoneState: true, // Managed by system / manifest
      accessibility: accessibilityEnabled,
      isChecking: false,
    });
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
    openAccessibilitySettings,
  };
}
