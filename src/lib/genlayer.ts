/**
 * ContentScout — GenLayer Studio Integration (CONTRACT-AUTHORITATIVE)
 *
 * Every score, verdict, and reasoning displayed comes EXCLUSIVELY from
 * the on-chain AI consensus judgment read via get_submission().
 * No local heuristic is ever substituted.
 *
 * Contract: 0x3E5a8398d07915871080A072241a4D71F652D97a
 * Network: GenLayer Studio (studionet, chain ID: 61999)
 */

import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import type { Submission, ContractStats, AnalysisResult } from '../types';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

export const CONTRACT_ADDRESS = '0x3E5a8398d07915871080A072241a4D71F652D97a' as `0x${string}`;
export const CHAIN = studionet;
export const CHAIN_ID = 61999;
export const CHAIN_NAME = 'Genlayer Studio Network';
export const PLAGIARISM_THRESHOLD = 40;
export const EXPLORER_URL = 'https://explorer-studio.genlayer.com';

const CONSENSUS_RETRIES = 200;
const CONSENSUS_INTERVAL_MS = 3000;
const READ_RETRIES = 10;
const READ_DELAY_MS = 2000;

// ═══════════════════════════════════════════════════════════
// CLIENT STATE
// ═══════════════════════════════════════════════════════════

let client: ReturnType<typeof createClient> | null = null;
let connectedAddress: string | null = null;
const submissionKeys: string[] = [];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Convert ANY result from readContract into a plain JS object.
 *
 * genlayer-js readContract with jsonSafeReturn=true (default) returns:
 *   - string → string
 *   - number → number
 *   - boolean → boolean
 *   - bigint → Number (if safe) or string
 *   - Uint8Array → hex string ("0x...")
 *   - CalldataAddress → hex string
 *   - Map → plain object (recursively converted)
 *   - Array → array (recursively converted)
 *   - null → null
 *
 * The contract's get_submission() returns a JSON string, which genlayer-js
 * decodes from calldata. So the result is ALREADY a plain object or string.
 */
function toPlainObject(result: unknown): any {
  if (result === null || result === undefined) return null;

  // Already a plain object from jsonSafeReturn
  if (typeof result === 'object' && !Array.isArray(result) && !(result instanceof Map) && !(result instanceof Uint8Array)) {
    return result;
  }

  // String — might be JSON that needs parsing
  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch { return result; }
    }
    return result;
  }

  // Map → convert to object
  if (result instanceof Map) {
    const obj: Record<string, unknown> = {};
    result.forEach((v, k) => { obj[String(k)] = toPlainObject(v); });
    return obj;
  }

  // Array → convert each element
  if (Array.isArray(result)) {
    return result.map(v => toPlainObject(v));
  }

  return result;
}

/**
 * Parse submission data from contract result.
 * The result from genlayer-js readContract is already JSON-safe
 * (jsonSafeReturn=true by default), so it's a plain object, NOT a JSON string.
 */
function parseSubmissionData(result: unknown, key: string): Submission | null {
  try {
    // genlayer-js with jsonSafeReturn already converts to plain object
    const data = toPlainObject(result);
    if (!data || typeof data !== 'object') {
      console.error('[parseSubmissionData] Result is not an object:', typeof data, data);
      return null;
    }

    // The contract stores the submission as a JSON string in TreeMap.
    // When readContract returns it, it might be:
    //   Case A: Already parsed object { author: "...", ... }
    //   Case B: Still a JSON string that needs parsing
    let submissionObj = data;

    // Check if it's still a JSON string (Case B)
    if (typeof data === 'string') {
      try {
        submissionObj = JSON.parse(data);
      } catch {
        console.error('[parseSubmissionData] Cannot parse string data:', data);
        return null;
      }
    }

    // Check for the actual submission fields
    // The contract stores: { author, content_preview, content_type, source_url, originality_score, is_original, reasoning, similar_sources, appealed }
    if (submissionObj.originality_score === undefined && submissionObj.originality_score !== 0) {
      console.error('[parseSubmissionData] Missing originality_score. Got keys:', Object.keys(submissionObj));
      return null;
    }

    const scoreFromContract = Number(submissionObj.originality_score) || 0;
    const enforcedOriginal = scoreFromContract >= PLAGIARISM_THRESHOLD;

    return {
      key,
      author: String(submissionObj.author || ''),
      content_preview: String(submissionObj.content_preview || ''),
      content_type: String(submissionObj.content_type || ''),
      source_url: String(submissionObj.source_url || ''),
      originality_score: scoreFromContract,
      is_original: enforcedOriginal,
      reasoning: String(submissionObj.reasoning || ''),
      similar_sources: Array.isArray(submissionObj.similar_sources) ? submissionObj.similar_sources : [],
      appealed: Boolean(submissionObj.appealed),
      txStatus: 'finalized' as const,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error('[parseSubmissionData] Exception:', e);
    return null;
  }
}

/**
 * Validate contract result for consistency and substance.
 */
function validateContractResult(data: {
  originality_score: number;
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
}): string[] {
  const warnings: string[] = [];

  if (data.originality_score < 0 || data.originality_score > 100) {
    warnings.push(`INVALID: Score ${data.originality_score} outside valid range [0, 100]`);
  }

  const expectedOriginal = data.originality_score >= PLAGIARISM_THRESHOLD;
  if (data.is_original !== expectedOriginal) {
    warnings.push(
      `VERDICT INCONSISTENCY: Contract says is_original=${data.is_original} but score=${data.originality_score} implies '${expectedOriginal ? 'ORIGINAL' : 'FLAGGED'}'. Client enforces score-based verdict (fail-closed).`
    );
  }

  if (!data.reasoning || data.reasoning.trim().length < 20) {
    warnings.push('WEAK EVIDENCE: AI reasoning is empty or too short — judgment lacks substantive evidence');
  }

  if (!expectedOriginal && (!data.similar_sources || data.similar_sources.length === 0)) {
    warnings.push('INSUFFICIENT EVIDENCE: Content flagged but no similar sources provided');
  }

  if (expectedOriginal && (!data.reasoning || data.reasoning.trim().length < 50)) {
    warnings.push('WEAK PASS: Content passed but reasoning is brief — originality evidence may be insufficient');
  }

  return warnings;
}

/**
 * Read submission from contract WITH RETRY.
 * Uses transactionHashVariant="latest-final" to read finalized state.
 */
async function readSubmissionWithRetry(key: string): Promise<Submission | null> {
  const readClient = client || createClient({ chain: CHAIN });

  for (let attempt = 1; attempt <= READ_RETRIES; attempt++) {
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_submission',
        args: [key],
        // Read from FINALIZED state — this is critical after consensus
        transactionHashVariant: 'latest-final' as any,
      } as any);

      const submission = parseSubmissionData(result, key);
      if (submission) {
        console.log(`[readSubmissionWithRetry] Success on attempt ${attempt}: key=${key}, score=${submission.originality_score}`);
        return submission;
      }

      // parseSubmissionData returned null — data might not be ready yet
      console.warn(`[readSubmissionWithRetry] Attempt ${attempt}/${READ_RETRIES}: parsed null for key=${key}, result type=${typeof result}`);
    } catch (err) {
      console.warn(`[readSubmissionWithRetry] Attempt ${attempt}/${READ_RETRIES} threw:`, err);
    }

    if (attempt < READ_RETRIES) {
      await delay(READ_DELAY_MS);
    }
  }

  // Fallback: try WITHOUT transactionHashVariant (latest-nonfinal)
  console.warn('[readSubmissionWithRetry] All latest-final attempts failed, trying latest-nonfinal...');
  try {
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_submission',
      args: [key],
    });
    const submission = parseSubmissionData(result, key);
    if (submission) return submission;
  } catch (err) {
    console.error('[readSubmissionWithRetry] Fallback read also failed:', err);
  }

  return null;
}

/**
 * Read stats from contract.
 */
async function readStatsFromContract(readClient: any): Promise<ContractStats | null> {
  try {
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'stats',
      args: [],
      transactionHashVariant: 'latest-final' as any,
    } as any);

    const data = toPlainObject(result);
    if (!data) return null;

    return {
      submission_count: Number(data.submission_count ?? 0),
      total_rewarded: Number(data.total_rewarded ?? 0),
      total_rejected: Number(data.total_rejected ?? 0),
    };
  } catch {
    // Fallback without transactionHashVariant
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'stats',
        args: [],
      });
      const data = toPlainObject(result);
      if (!data) return null;
      return {
        submission_count: Number(data.submission_count ?? 0),
        total_rewarded: Number(data.total_rewarded ?? 0),
        total_rejected: Number(data.total_rejected ?? 0),
      };
    } catch {
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// WALLET CONNECTION
// ═══════════════════════════════════════════════════════════

export async function connectWallet(): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed.');
  }

  const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts?.length) throw new Error('No accounts found');
  const address = accounts[0];

  // Switch to GenLayer Studio
  const chainIdHex = `0x${CHAIN_ID.toString(16)}`;
  try {
    const currentChainId = await window.ethereum!.request({ method: 'eth_chainId' });
    if (currentChainId !== chainIdHex) {
      try {
        await window.ethereum!.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: CHAIN_NAME,
              nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
              rpcUrls: [CHAIN.rpcUrls.default.http[0]],
              blockExplorerUrls: [EXPLORER_URL],
            }],
          });
        }
      }
    }
  } catch (e) {
    console.warn('Network switch warning:', e);
  }

  client = createClient({
    chain: CHAIN,
    account: address as `0x${string}`,
    provider: window.ethereum!,
  });
  connectedAddress = address;

  window.ethereum!.on('accountsChanged', (accs: string[]) => {
    if (!accs.length) { disconnectWallet(); }
    else {
      connectedAddress = accs[0];
      client = createClient({ chain: CHAIN, account: accs[0] as `0x${string}`, provider: window.ethereum! });
    }
  });

  return address;
}

export function disconnectWallet(): void {
  client = null;
  connectedAddress = null;
}

export function getConnectedAddress(): string | null { return connectedAddress; }

export async function getBalance(): Promise<string> {
  if (!connectedAddress || !window.ethereum) return '0';
  try {
    const hex = await window.ethereum.request({ method: 'eth_getBalance', params: [connectedAddress, 'latest'] }) as string;
    return (parseInt(hex, 16) / 1e18).toFixed(4);
  } catch { return '0'; }
}

// ═══════════════════════════════════════════════════════════
// READ METHODS
// ═══════════════════════════════════════════════════════════

export async function readSubmissionFromContract(key: string): Promise<Submission | null> {
  return readSubmissionWithRetry(key);
}

export async function loadOnChainStats(): Promise<ContractStats | null> {
  try {
    const readClient = createClient({ chain: CHAIN });
    return await readStatsFromContract(readClient);
  } catch (err) {
    console.error('Failed to load on-chain stats:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// SUBMIT — Contract-Authoritative Flow
// ═══════════════════════════════════════════════════════════

export async function submitContent(
  content: string,
  contentType: string,
  sourceUrl: string,
  onPhaseChange: (phase: string) => void,
): Promise<AnalysisResult> {
  if (!client) throw new Error('Wallet not connected');
  if (!content || content.trim().length < 50) throw new Error('Content must be at least 50 characters');

  const truncated = content.slice(0, 4000);

  // ── Step 1: Pre-read stats to determine expected key ──
  let expectedKey = '';
  onPhaseChange('reading_state');
  try {
    const stats = await readStatsFromContract(client);
    if (stats) expectedKey = String(stats.submission_count);
  } catch (e) {
    console.warn('Pre-read stats failed:', e);
  }

  // ── Step 2: Submit transaction ──
  onPhaseChange('submitting');
  let txHashBigInt: bigint;
  try {
    txHashBigInt = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'submit',
      args: [truncated, contentType, sourceUrl || ''],
      value: 0n,
    });
  } catch (txErr: any) {
    const errMsg = txErr?.message || txErr?.shortMessage || 'Transaction failed';
    if (/user rejected|denied/i.test(errMsg)) throw new Error('Transaction rejected by user');
    throw new Error(`Transaction failed: ${errMsg}`);
  }

  const txHash = `0x${txHashBigInt.toString(16).padStart(64, '0')}`;

  // ── Step 3: Wait for AI consensus ──
  onPhaseChange('awaiting_consensus');
  let consensusReached = false;

  try {
    await client.waitForTransactionReceipt({
      hash: txHash as any,
      status: TransactionStatus.FINALIZED,
      retries: CONSENSUS_RETRIES,
      interval: CONSENSUS_INTERVAL_MS,
    });
    consensusReached = true;
  } catch {
    console.warn('FINALIZED timeout, trying ACCEPTED...');
    try {
      await client.waitForTransactionReceipt({
        hash: txHash as any,
        status: TransactionStatus.ACCEPTED,
        retries: 60,
        interval: CONSENSUS_INTERVAL_MS,
      });
      consensusReached = true;
    } catch (e2) {
      console.error('Consensus timeout:', e2);
    }
  }

  if (!consensusReached) {
    return {
      originality_score: 0,
      is_original: false,
      reasoning: 'Consensus timed out. Check the explorer for the eventual result.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key: expectedKey,
      validationWarnings: ['Consensus timeout — check explorer for result.'],
    };
  }

  // ── Step 4: Determine submission key ──
  let key = expectedKey;
  if (!key) {
    try {
      const postStats = await readStatsFromContract(client);
      if (postStats) key = String(postStats.submission_count - 1);
    } catch (e) {
      console.warn('Post-read stats failed:', e);
    }
  }
  if (!key) key = `unknown-${Date.now()}`;

  // ── Step 5: Read the contract's AUTHORITATIVE judgment ──
  onPhaseChange('reading_result');
  const submission = await readSubmissionWithRetry(key);
  onPhaseChange('complete');

  if (!submission) {
    return {
      originality_score: 0,
      is_original: false,
      reasoning: 'Failed to read contract judgment. The submission was recorded on-chain. Check the explorer.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key,
      validationWarnings: ['Contract read failed — check explorer.'],
    };
  }

  // ── Step 6: Validate and return ──
  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;

  if (!submissionKeys.includes(key)) submissionKeys.unshift(key);

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal,
    reasoning: submission.reasoning,
    similar_sources: submission.similar_sources || [],
    authority: 'contract',
    txHash,
    key,
    validationWarnings,
  };
}

// ═══════════════════════════════════════════════════════════
// APPEAL — Contract-Authoritative Flow
// ═══════════════════════════════════════════════════════════

export async function appealSubmission(
  key: string,
  onPhaseChange: (phase: string) => void,
): Promise<AnalysisResult> {
  if (!client) throw new Error('Wallet not connected');

  onPhaseChange('submitting');
  let txHashBigInt: bigint;
  try {
    txHashBigInt = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'appeal',
      args: [key],
      value: 0n,
    });
  } catch (txErr: any) {
    const errMsg = txErr?.message || txErr?.shortMessage || 'Appeal failed';
    if (/user rejected|denied/i.test(errMsg)) throw new Error('Appeal rejected by user');
    throw new Error(`Appeal failed: ${errMsg}`);
  }

  const txHash = `0x${txHashBigInt.toString(16).padStart(64, '0')}`;

  onPhaseChange('awaiting_consensus');
  let consensusReached = false;
  try {
    await client.waitForTransactionReceipt({ hash: txHash as any, status: TransactionStatus.FINALIZED, retries: CONSENSUS_RETRIES, interval: CONSENSUS_INTERVAL_MS });
    consensusReached = true;
  } catch {
    try {
      await client.waitForTransactionReceipt({ hash: txHash as any, status: TransactionStatus.ACCEPTED, retries: 60, interval: CONSENSUS_INTERVAL_MS });
      consensusReached = true;
    } catch (e2) { console.error('Appeal consensus timeout:', e2); }
  }

  if (!consensusReached) {
    return { originality_score: 0, is_original: false, reasoning: 'Appeal consensus timed out.', similar_sources: [], authority: 'error', txHash, key, validationWarnings: ['Appeal consensus timeout'] };
  }

  onPhaseChange('reading_result');
  const submission = await readSubmissionWithRetry(key);
  onPhaseChange('complete');

  if (!submission) {
    return { originality_score: 0, is_original: false, reasoning: 'Failed to read updated judgment after appeal.', similar_sources: [], authority: 'error', txHash, key, validationWarnings: ['Contract read failed after appeal'] };
  }

  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal,
    reasoning: submission.reasoning,
    similar_sources: submission.similar_sources || [],
    authority: 'contract',
    txHash,
    key,
    validationWarnings,
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

export function getSubmissionKeys(): string[] { return [...submissionKeys]; }

export async function loadRecentSubmissionKeys(maxCount: number = 20): Promise<string[]> {
  try {
    const onChainStats = await loadOnChainStats();
    if (!onChainStats || onChainStats.submission_count === 0) return [];

    const totalCount = onChainStats.submission_count;
    const startKey = Math.max(0, totalCount - maxCount);
    const keys: string[] = [];
    for (let i = totalCount - 1; i >= startKey; i--) keys.push(String(i));

    const existing = new Set(submissionKeys);
    for (const k of keys) { if (!existing.has(k)) submissionKeys.push(k); }

    submissionKeys.sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      return b.localeCompare(a);
    });

    return [...submissionKeys];
  } catch { return [...submissionKeys]; }
}

export function validateSubmission(sub: { originality_score: number; is_original: boolean; reasoning: string; similar_sources: string[] }): string[] {
  return validateContractResult(sub);
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL}/tx/${txHash}`;
}

export function getExplorerContractUrl(): string {
  return `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
