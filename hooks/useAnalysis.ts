import { useCallback, useSyncExternalStore } from 'react';
import { analysisStore } from '../store/analysisStore';
import { AnalysisService } from '../services/analysisService';

/**
 * Thin hook — reads analysis state from the store and exposes
 * start/stop which delegate to the singleton AnalysisService.
 * Safe to mount from multiple components simultaneously.
 */
export function useAnalysis() {
  const state = useSyncExternalStore(
    (cb) => analysisStore.subscribe(cb),
    () => analysisStore.getState()
  );

  const startAnalysis = useCallback(async () => {
    await AnalysisService.start();
  }, []);

  const stopAnalysis = useCallback(async () => {
    return await AnalysisService.stop();
  }, []);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
  };
}
