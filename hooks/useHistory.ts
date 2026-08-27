import { useEffect, useState, useCallback } from 'react';
import { AnalysisSummary } from '../types/analysis';
import { HistoryFilterOptions } from '../types/history';
import { StorageService } from '../services/storage';

export function useHistory() {
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilterOptions>({
    riskLevel: 'ALL',
    sortBy: 'NEWEST',
  });

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const records = await StorageService.getHistory();
    setHistory(records);
    setIsLoading(false);
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    await StorageService.deleteHistoryRecord(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await StorageService.clearAllHistory();
    setHistory([]);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter((item) => {
    if (!filter.riskLevel || filter.riskLevel === 'ALL') return true;
    return item.resultLabel === filter.riskLevel;
  }).sort((a, b) => {
    if (filter.sortBy === 'OLDEST') return a.timestamp - b.timestamp;
    if (filter.sortBy === 'RISK_HIGH') return b.smoothedAiRisk - a.smoothedAiRisk;
    if (filter.sortBy === 'RISK_LOW') return a.smoothedAiRisk - b.smoothedAiRisk;
    return b.timestamp - a.timestamp;
  });

  return {
    history: filteredHistory,
    rawHistory: history,
    isLoading,
    filter,
    setFilter,
    loadHistory,
    deleteRecord,
    clearAll,
  };
}
