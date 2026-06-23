/**
 * Custom hook for interacting with the ContentScout contract
 * 
 * In production with genlayer-js:
 * 
 * import { useContract } from 'genlayer-js/react';
 * 
 * const { read, write } = useContract({
 *   address: CONTRACT_ADDRESS,
 *   abi: contractAbi,
 * });
 */

import { useState, useCallback } from 'react';
import * as genlayer from '../lib/genlayer';
import { Submission, ContractStats } from '../types';

export function useContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (
    content: string,
    contentType: string,
    sourceUrl: string
  ): Promise<{ key: string; submission: Submission } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await genlayer.submit(content, contentType, sourceUrl);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const appeal = useCallback(async (key: string): Promise<Submission | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await genlayer.appeal(key);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSubmission = useCallback((key: string): Submission | null => {
    return genlayer.getSubmission(key);
  }, []);

  const getAllSubmissions = useCallback((): Submission[] => {
    return genlayer.getAllSubmissions();
  }, []);

  const getStats = useCallback((): ContractStats => {
    return genlayer.getStats();
  }, []);

  const getRewardEligibility = useCallback((key: string) => {
    return genlayer.readRewardEligibility(key);
  }, []);

  return {
    submit,
    appeal,
    getSubmission,
    getAllSubmissions,
    getStats,
    getRewardEligibility,
    isLoading,
    error,
  };
}

export default useContract;
