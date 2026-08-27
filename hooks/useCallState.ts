import { useEffect, useState } from 'react';
import { CallAudioService, CallStatePayload } from '../modules/call-audio/src';
import { analysisStore } from '../store/analysisStore';
import { CallState } from '../types/call';

export function useCallState() {
  const [callState, setCallState] = useState<CallState>('IDLE');

  useEffect(() => {
    // Initial fetch
    CallAudioService.getCallState().then((state) => {
      setCallState(state);
      analysisStore.setCallState(state);
    });

    const subscription = CallAudioService.addCallStateListener((event: CallStatePayload) => {
      setCallState(event.state);
      analysisStore.setCallState(event.state);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { callState };
}
