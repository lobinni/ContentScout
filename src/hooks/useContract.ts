/**
 * Custom hook for interacting with the ContentScout contract
 * Hybrid: local-first with on-chain sync
 */

import { useState, useCallback } from 'react';
import * as genlayer from '../lib/genlayer';
import type { SubmitResult } from '../lib/genlayer';
import { Submission, ContractStats } from '../types';

export function useContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit content — returns local result immediately
   */
  const submit = useCallback((
    content: string,
    contentType: string,
    sourceUrl: string
  ): SubmitResult => {
    setError(null);
    return genlayer.submitContent(content, contentType, sourceUrl);
  }, []);

  /**
   * Appeal a submission
   */
  const appeal = useCallback(async (key: string): Promise<Submission | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await genlayer.appeal(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Appeal failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all submissions (local)
   */
  const getAllSubmissions = useCallback((): Submission[] => {
    return genlayer.getAllSubmissions();
  }, []);

  /**
   * Get contract stats (local)
   */
  const getStats = useCallback((): ContractStats => {
    return genlayer.getStats();
  }, []);

  /**
   * Load on-chain stats (async)
   */
  const loadOnChainStats = useCallback(async (): Promise<ContractStats | null> => {
    return await genlayer.loadOnChainStats();
  }, []);

  /**
   * Get reward eligibility
   */
  const getRewardEligibility = useCallback(async (key: string) => {
    return await genlayer.readRewardEligibility(key);
  }, []);

  return {
    submit,
    appeal,
    getAllSubmissions,
    getStats,
    loadOnChainStats,
    getRewardEligibility,
    isLoading,
    error,
  };
}

export default useContract;
