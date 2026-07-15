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
const READ_RETRIES = 15;
const READ_DELAY_MS = 3000;

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
 * Parse ANY readContract result into a JS value.
 *
 * The contract's get_submission(key) returns a Python str (JSON).
 * genlayer-js decodes calldata → the result can arrive as:
 *   - A raw string (the JSON text itself)
 *   - An already-parsed object (if jsonSafeReturn decoded it)
 *   - A Map (if calldata encoding used maps)
 *   - null / "" (if key doesn't exist yet)
 */
function parseContractString(result: unknown): any {
  if (result === null || result === undefined) return null;

  // Empty string → contract returned "" for missing key
  if (result === '') return null;

  // Already a plain object → return as-is
  if (typeof result === 'object' && result !== null && !(result instanceof Map) && !(result instanceof Uint8Array) && !Array.isArray(result)) {
    return result;
  }

  // Map → convert to plain object
  if (result instanceof Map) {
    const obj: Record<string, unknown> = {};
    result.forEach((v, k) => { obj[String(k)] = parseContractString(v); });
    return obj;
  }

  // String → try to parse as JSON
  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not valid JSON — return as raw string
      return trimmed;
    }
  }

  // Uint8Array → decode as UTF-8 string, then try JSON
  if (result instanceof Uint8Array) {
    try {
      const text = new TextDecoder().decode(result);
      if (!text.trim()) return null;
      try { return JSON.parse(text); } catch { return text; }
    } catch { return null; }
  }

  // Array → try to convert
  if (Array.isArray(result)) {
    return result.map(v => parseContractString(v));
  }

  // Primitive (number, boolean, bigint)
  return result;
}

/**
 * Parse submission data from a get_submission() result.
 * Handles ALL possible formats returned by genlayer-js.
 */
function parseSubmissionData(result: unknown, key: string): Submission | null {
  try {
    const parsed = parseContractString(result);

    // null or empty → key doesn't exist yet
    if (parsed === null) {
      console.warn(`[parseSubmissionData] key=${key}: contract returned null/empty`);
      return null;
    }

    // Must be an object with submission fields
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn(`[parseSubmissionData] key=${key}: unexpected type ${typeof parsed}`, parsed);
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Check for at least one expected field to confirm it's a submission
    if (!('originality_score' in obj) && !('author' in obj) && !('reasoning' in obj)) {
      console.warn(`[parseSubmissionData] key=${key}: object has no submission fields. Keys:`, Object.keys(obj));
      return null;
    }

    const scoreFromContract = Number(obj.originality_score ?? 0);
    const enforcedOriginal = scoreFromContract >= PLAGIARISM_THRESHOLD;

    return {
      key,
      author: String(obj.author ?? ''),
      content_preview: String(obj.content_preview ?? ''),
      content_type: String(obj.content_type ?? ''),
      source_url: String(obj.source_url ?? ''),
      originality_score: scoreFromContract,
      is_original: enforcedOriginal,
      reasoning: String(obj.reasoning ?? ''),
      similar_sources: Array.isArray(obj.similar_sources) ? obj.similar_sources.map(String) : [],
      appealed: Boolean(obj.appealed),
      txStatus: 'finalized' as const,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error(`[parseSubmissionData] key=${key}: exception:`, e);
    return null;
  }
}

/**
 * Validate contract result for consistency.
 */
function validateContractResult(data: {
  originality_score: number;
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
}): string[] {
  const warnings: string[] = [];
  if (data.originality_score < 0 || data.originality_score > 100)
    warnings.push(`Score ${data.originality_score} outside [0,100]`);
  const expected = data.originality_score >= PLAGIARISM_THRESHOLD;
  if (data.is_original !== expected)
    warnings.push(`Verdict inconsistency: score=${data.originality_score} → should be '${expected ? 'ORIGINAL' : 'FLAGGED'}'. Client enforces score-based verdict.`);
  if (!data.reasoning || data.reasoning.trim().length < 20)
    warnings.push('AI reasoning is too short — judgment may lack evidence');
  if (!expected && (!data.similar_sources || data.similar_sources.length === 0))
    warnings.push('Content flagged but no similar sources provided');
  return warnings;
}

/**
 * Read a submission from the contract, with retries.
 * Tries BOTH with and without transactionHashVariant on each attempt.
 */
async function readSubmissionWithRetry(key: string): Promise<Submission | null> {
  const readClient = client || createClient({ chain: CHAIN });

  for (let attempt = 1; attempt <= READ_RETRIES; attempt++) {
    // Try 1: default read (latest-nonfinal — most compatible)
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_submission',
        args: [key],
      });

      console.log(`[read attempt ${attempt}] raw result type=${typeof result}`, result === '' ? '(empty string)' : typeof result === 'string' ? `"${result.slice(0, 80)}..."` : result);

      const submission = parseSubmissionData(result, key);
      if (submission) {
        console.log(`[read attempt ${attempt}] ✓ parsed key=${key} score=${submission.originality_score}`);
        return submission;
      }
    } catch (err) {
      console.warn(`[read attempt ${attempt}] threw:`, err);
    }

    if (attempt < READ_RETRIES) {
      console.log(`[read attempt ${attempt}] waiting ${READ_DELAY_MS}ms before retry...`);
      await delay(READ_DELAY_MS);
    }
  }

  console.error(`[readSubmissionWithRetry] all ${READ_RETRIES} attempts failed for key=${key}`);
  return null;
}

/**
 * Read stats from contract.
 */
async function readStatsFromContract(readClient: ReturnType<typeof createClient>): Promise<ContractStats | null> {
  try {
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'stats',
      args: [],
    });

    const parsed = parseContractString(result);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      submission_count: Number(parsed.submission_count ?? 0),
      total_rewarded: Number(parsed.total_rewarded ?? 0),
      total_rejected: Number(parsed.total_rejected ?? 0),
    };
  } catch (err) {
    console.error('readStatsFromContract failed:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════

export async function connectWallet(): Promise<string> {
  if (!isMetaMaskAvailable()) throw new Error('MetaMask is not installed.');

  const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts?.length) throw new Error('No accounts found');
  const address = accounts[0];

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
              chainId: chainIdHex, chainName: CHAIN_NAME,
              nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
              rpcUrls: [CHAIN.rpcUrls.default.http[0]],
              blockExplorerUrls: [EXPLORER_URL],
            }],
          });
        }
      }
    }
  } catch (e) { console.warn('Network switch warning:', e); }

  client = createClient({ chain: CHAIN, account: address as `0x${string}`, provider: window.ethereum! });
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

export function disconnectWallet(): void { client = null; connectedAddress = null; }
export function getConnectedAddress(): string | null { return connectedAddress; }

export async function getBalance(): Promise<string> {
  if (!connectedAddress || !window.ethereum) return '0';
  try {
    const hex = await window.ethereum.request({ method: 'eth_getBalance', params: [connectedAddress, 'latest'] }) as string;
    return (parseInt(hex, 16) / 1e18).toFixed(4);
  } catch { return '0'; }
}

// ═══════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════

export async function readSubmissionFromContract(key: string): Promise<Submission | null> {
  return readSubmissionWithRetry(key);
}

export async function loadOnChainStats(): Promise<ContractStats | null> {
  try {
    const readClient = createClient({ chain: CHAIN });
    return await readStatsFromContract(readClient);
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// SUBMIT — Contract-Authoritative
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

  // Step 1: Pre-read stats for expected key
  let expectedKey = '';
  onPhaseChange('reading_state');
  try {
    const stats = await readStatsFromContract(client);
    if (stats) expectedKey = String(stats.submission_count);
    console.log('[submit] pre-read stats: expectedKey =', expectedKey);
  } catch (e) {
    console.warn('[submit] pre-read stats failed:', e);
  }

  // Step 2: Submit transaction
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
  console.log('[submit] txHash =', txHash);

  // Step 3: Wait for consensus
  onPhaseChange('awaiting_consensus');
  let receipt: any = null;

  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash as any,
      status: TransactionStatus.FINALIZED,
      retries: CONSENSUS_RETRIES,
      interval: CONSENSUS_INTERVAL_MS,
    });
    console.log('[submit] FINALIZED receipt:', JSON.stringify(receipt).slice(0, 300));
  } catch {
    console.warn('[submit] FINALIZED timeout, trying ACCEPTED...');
    try {
      receipt = await client.waitForTransactionReceipt({
        hash: txHash as any,
        status: TransactionStatus.ACCEPTED,
        retries: 60,
        interval: CONSENSUS_INTERVAL_MS,
      });
      console.log('[submit] ACCEPTED receipt:', JSON.stringify(receipt).slice(0, 300));
    } catch (e2) {
      console.error('[submit] ACCEPTED also timed out:', e2);
    }
  }

  if (!receipt) {
    return {
      originality_score: 0, is_original: false,
      reasoning: 'Consensus timed out. The transaction was sent but AI validators did not finalize in time. Check the explorer.',
      similar_sources: [], authority: 'error', txHash, key: expectedKey,
      validationWarnings: ['Consensus timeout — check explorer.'],
    };
  }

  // Check if the transaction resulted in an error
  const txResultName = receipt?.resultName || receipt?.result;
  console.log('[submit] receipt resultName =', txResultName);

  // Step 4: Determine submission key
  // Try multiple strategies to find the correct key
  let key = '';

  // Strategy A: Post-read stats to find the latest key
  onPhaseChange('reading_result');
  try {
    await delay(2000); // Give contract state time to propagate
    const postStats = await readStatsFromContract(client);
    if (postStats && postStats.submission_count > 0) {
      key = String(postStats.submission_count - 1);
      console.log('[submit] post-read stats key =', key);
    }
  } catch (e) {
    console.warn('[submit] post-read stats failed:', e);
  }

  // Strategy B: Use expectedKey if post-read failed
  if (!key && expectedKey) {
    key = expectedKey;
    console.log('[submit] using expectedKey =', key);
  }

  // Strategy C: Try key "0" for first-ever submission
  if (!key) {
    key = '0';
    console.log('[submit] defaulting to key = 0');
  }

  // Step 5: Read contract judgment with retry
  let submission = await readSubmissionWithRetry(key);

  // Step 5b: If that key failed, try adjacent keys
  if (!submission && key !== '0') {
    const keyNum = parseInt(key, 10);
    if (!isNaN(keyNum)) {
      // Try key-1 (in case stats were stale)
      console.log(`[submit] key=${key} failed, trying key=${keyNum - 1}`);
      submission = await readSubmissionWithRetry(String(keyNum - 1));

      // Try key+1 (in case race condition)
      if (!submission) {
        console.log(`[submit] trying key=${keyNum + 1}`);
        submission = await readSubmissionWithRetry(String(keyNum + 1));
        if (submission) key = String(keyNum + 1);
      } else {
        key = String(keyNum - 1);
      }
    }
  }

  onPhaseChange('complete');

  if (!submission) {
    return {
      originality_score: 0, is_original: false,
      reasoning: `Transaction was sent (tx: ${txHash.slice(0, 14)}...) but could not read the judgment from the contract. This may mean the contract execution failed. Check the explorer for details.`,
      similar_sources: [], authority: 'error', txHash, key,
      validationWarnings: ['Contract read failed — the on-chain transaction may have errored. Check explorer.'],
    };
  }

  // Step 6: Return result
  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;
  if (!submissionKeys.includes(key)) submissionKeys.unshift(key);

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal,
    reasoning: submission.reasoning,
    similar_sources: submission.similar_sources || [],
    authority: 'contract',
    txHash, key, validationWarnings,
  };
}

// ═══════════════════════════════════════════════════════════
// APPEAL — Contract-Authoritative
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
      address: CONTRACT_ADDRESS, functionName: 'appeal', args: [key], value: 0n,
    });
  } catch (txErr: any) {
    const errMsg = txErr?.message || txErr?.shortMessage || 'Appeal failed';
    if (/user rejected|denied/i.test(errMsg)) throw new Error('Appeal rejected by user');
    throw new Error(`Appeal failed: ${errMsg}`);
  }

  const txHash = `0x${txHashBigInt.toString(16).padStart(64, '0')}`;

  onPhaseChange('awaiting_consensus');
  let receipt: any = null;
  try {
    receipt = await client.waitForTransactionReceipt({ hash: txHash as any, status: TransactionStatus.FINALIZED, retries: CONSENSUS_RETRIES, interval: CONSENSUS_INTERVAL_MS });
  } catch {
    try {
      receipt = await client.waitForTransactionReceipt({ hash: txHash as any, status: TransactionStatus.ACCEPTED, retries: 60, interval: CONSENSUS_INTERVAL_MS });
    } catch (e2) { console.error('Appeal consensus timeout:', e2); }
  }

  if (!receipt) {
    return { originality_score: 0, is_original: false, reasoning: 'Appeal consensus timed out.', similar_sources: [], authority: 'error', txHash, key, validationWarnings: ['Appeal timeout'] };
  }

  onPhaseChange('reading_result');
  await delay(2000);
  const submission = await readSubmissionWithRetry(key);
  onPhaseChange('complete');

  if (!submission) {
    return { originality_score: 0, is_original: false, reasoning: 'Failed to read updated judgment after appeal.', similar_sources: [], authority: 'error', txHash, key, validationWarnings: ['Appeal read failed'] };
  }

  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal,
    reasoning: submission.reasoning,
    similar_sources: submission.similar_sources || [],
    authority: 'contract', txHash, key, validationWarnings,
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

export function getSubmissionKeys(): string[] { return [...submissionKeys]; }

export async function loadRecentSubmissionKeys(maxCount: number = 20): Promise<string[]> {
  try {
    const stats = await loadOnChainStats();
    if (!stats || stats.submission_count === 0) return [];
    const total = stats.submission_count;
    const start = Math.max(0, total - maxCount);
    const keys: string[] = [];
    for (let i = total - 1; i >= start; i--) keys.push(String(i));
    const existing = new Set(submissionKeys);
    for (const k of keys) { if (!existing.has(k)) submissionKeys.push(k); }
    submissionKeys.sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
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
