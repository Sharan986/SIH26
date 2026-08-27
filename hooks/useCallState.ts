import { useEffect, useState } from 'react';
import { CallAudioService, CallStatePayload } from '../modules/call-audio/src';
import { analysisStore } from '../store/analysisStore';
import { CallState } from '../types/call';

export function useCallState() {
  const [callState, setCallState] = useState<CallState>('IDLE');

  useEffect(() => {
    // Initial fetch
    CallAudioService.getCallState().then((state) => {
      console.log('[VoiceGuard] Initial call state:', state);
      setCallState(state);
      analysisStore.setCallState(state);
    });

    const subscription = CallAudioService.addCallStateListener((event: CallStatePayload) => {
      console.log('[VoiceGuard] Call state changed ->', event.state);
      setCallState(event.state);
      analysisStore.setCallState(event.state);
    });

    console.log('[VoiceGuard] TelephonyManager listener registered');

    return () => {
      subscription.remove();
    };
  }, []);

  return { callState };
}
