import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { analysisStore } from '../store/analysisStore';
import { AnalysisService } from '../services/analysisService';

/**
 * Mounts at the root layout level (AppShell).
 * Watches callState from the store and automatically:
 *  - Calls AnalysisService.start() + navigates to /live when ACTIVE
 *  - Calls AnalysisService.stop() + navigates to result when call ends
 */
export function useAutoCallDetection() {
  const router = useRouter();

  const { callState, isAnalyzing } = useSyncExternalStore(
    (cb) => analysisStore.subscribe(cb),
    () => analysisStore.getState()
  );

  const autoStartedRef = useRef(false);
  const autoStoppingRef = useRef(false);

  useEffect(() => {
    // ── Auto-start when call becomes active ──────────────────────────────
    if (callState === 'ACTIVE' && !isAnalyzing && !autoStartedRef.current) {
      console.log('[AutoCallDetection] call ACTIVE — starting analysis');
      autoStartedRef.current = true;
      autoStoppingRef.current = false;

      AnalysisService.start().then(() => {
        router.push('/live' as any);
      });
    }

    // ── Auto-stop when call ends ─────────────────────────────────────────
    if (
      (callState === 'IDLE' || callState === 'ENDED') &&
      isAnalyzing &&
      autoStartedRef.current &&
      !autoStoppingRef.current
    ) {
      console.log('[AutoCallDetection] call ended — stopping analysis');
      autoStoppingRef.current = true;

      AnalysisService.stop().then((summary) => {
        autoStartedRef.current = false;
        if (summary) {
          router.replace({
            pathname: '/live/result',
            params: { summaryId: summary.id },
          } as any);
        } else {
          try { router.back(); } catch (_) {}
        }
      });
    }
  }, [callState, isAnalyzing, router]);
}
