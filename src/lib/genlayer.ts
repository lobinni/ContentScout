/**
 * ContentScout — GenLayer Studio Integration (CONTRACT-AUTHORITATIVE)
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL DESIGN PRINCIPLE:                                    ║
 * ║  The contract's AI consensus judgment is the ONLY source of    ║
 * ║  truth. No local heuristic, no browser-based analysis, no      ║
 * ║  fallback score is EVER displayed to the user. Every score,    ║
 * ║  verdict, and reasoning shown in the UI comes exclusively      ║
 * ║  from reading the finalized on-chain contract state.           ║
 * ║                                                                ║
 * ║  FAIL-CLOSED: is_original is ALWAYS derived from               ║
 * ║  originality_score >= PLAGIARISM_THRESHOLD. If the contract    ║
 * ║  returns an inconsistent result, we enforce the score-based    ║
 * ║  verdict and display a validation warning.                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Contract: 0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22
 * Network: GenLayer Studio (studionet, chain ID 61999)
 * RPC: https://studio.genlayer.com/api
 */

import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import type { Submission, ContractStats, AnalysisResult } from '../types';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

export const CONTRACT_ADDRESS = '0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22' as `0x${string}`;
export const CHAIN = studionet;
export const CHAIN_ID = 61999;
export const CHAIN_NAME = 'Genlayer Studio Network';
export const PLAGIARISM_THRESHOLD = 40;
export const EXPLORER_URL = 'https://explorer-studio.genlayer.com';

const CONSENSUS_RETRIES = 200;
const CONSENSUS_INTERVAL_MS = 3000;
const CONTRACT_READ_RETRIES = 5;
const CONTRACT_READ_DELAY_MS = 2000;

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

/** Delay helper */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust conversion of CalldataEncodable to string.
 * Handles ALL possible return types from genlayer-js readContract:
 * - string, number, boolean, bigint
 * - Uint8Array (bytes)
 * - CalldataAddress (has .bytes property)
 * - Map<string, CalldataEncodable>
 * - Array<CalldataEncodable>
 * - { [key: string]: CalldataEncodable }
 * - null
 */
function extractString(result: unknown): string {
  if (result === null || result === undefined) return '';

  // Primitive types
  if (typeof result === 'string') return result;
  if (typeof result === 'number' || typeof result === 'boolean') return String(result);
  if (typeof result === 'bigint') return result.toString();

  // Uint8Array — decode as UTF-8 string
  if (result instanceof Uint8Array) {
    try {
      return new TextDecoder().decode(result);
    } catch {
      return Array.from(result).map(b => String.fromCharCode(b)).join('');
    }
  }

  // CalldataAddress — has .bytes property (Uint8Array)
  if (typeof result === 'object' && result !== null && 'bytes' in result && result.bytes instanceof Uint8Array) {
    try {
      return '0x' + Array.from(result.bytes as Uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '[address]';
    }
  }

  // Map — convert to object then stringify
  if (result instanceof Map) {
    const obj: Record<string, unknown> = {};
    result.forEach((v, k) => { obj[String(k)] = v; });
    return JSON.stringify(obj);
  }

  // Array — stringify
  if (Array.isArray(result)) {
    return JSON.stringify(result);
  }

  // Plain object — stringify
  if (typeof result === 'object') {
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }

  return String(result);
}

/**
 * Parse submission data from contract result.
 * ALWAYS enforces fail-closed: is_original = score >= THRESHOLD.
 * This function is the GATEKEEPER — every displayed result passes through here.
 */
function parseSubmissionData(result: unknown, key: string): Submission | null {
  const raw = extractString(result);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);

    // Validate required fields exist
    if (data.originality_score === undefined || data.originality_score === null) {
      console.error('Contract result missing originality_score:', data);
      return null;
    }

    const scoreFromContract = Number(data.originality_score);

    // FAIL-CLOSED ENFORCEMENT:
    // is_original is ALWAYS derived from score, never trusted from contract
    // This removes any possible fail-open passing verdict
    const enforcedOriginal = scoreFromContract >= PLAGIARISM_THRESHOLD;

    return {
      key,
      author: data.author || '',
      content_preview: data.content_preview || '',
      content_type: data.content_type || '',
      source_url: data.source_url || '',
      originality_score: scoreFromContract,
      is_original: enforcedOriginal,
      reasoning: data.reasoning || '',
      similar_sources: Array.isArray(data.similar_sources) ? data.similar_sources : [],
      appealed: Boolean(data.appealed),
      txStatus: 'finalized' as const,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error('Failed to parse submission data:', e, 'Raw:', raw);
    return null;
  }
}

/**
 * Validate contract result for consistency and substance.
 * Returns warnings if the contract's judgment is inconsistent or lacks evidence.
 */
function validateContractResult(data: {
  originality_score: number;
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
}): string[] {
  const warnings: string[] = [];

  // 1. Score range check
  if (data.originality_score < 0 || data.originality_score > 100) {
    warnings.push(`INVALID: Score ${data.originality_score} outside valid range [0, 100]`);
  }

  // 2. Consistency check: is_original vs score
  const expectedOriginal = data.originality_score >= PLAGIARISM_THRESHOLD;
  if (data.is_original !== expectedOriginal) {
    warnings.push(
      `VERDICT INCONSISTENCY: Contract returned is_original=${data.is_original} but score=${data.originality_score} implies '${expectedOriginal ? 'ORIGINAL' : 'FLAGGED'}'. Client enforces score-based verdict (fail-closed).`
    );
  }

  // 3. Reasoning substance check
  if (!data.reasoning || data.reasoning.trim().length < 20) {
    warnings.push('WEAK EVIDENCE: AI reasoning is empty or too short — judgment lacks substantive evidence');
  }

  // 4. Flagged content without similar sources
  if (!expectedOriginal && (!data.similar_sources || data.similar_sources.length === 0)) {
    warnings.push('INSUFFICIENT EVIDENCE: Content flagged but no similar sources provided — rejection evidence is insufficient');
  }

  // 5. High score with no reasoning
  if (expectedOriginal && (!data.reasoning || data.reasoning.trim().length < 50)) {
    warnings.push('WEAK PASS: Content passed but reasoning is brief — originality evidence may be insufficient');
  }

  return warnings;
}

/**
 * Read submission from contract WITH RETRY.
 * After consensus, the contract state may not be immediately readable.
 * Retry up to CONTRACT_READ_RETRIES times with a delay.
 */
async function readSubmissionWithRetry(key: string): Promise<Submission | null> {
  const readClient = client || createClient({ chain: CHAIN });

  for (let attempt = 1; attempt <= CONTRACT_READ_RETRIES; attempt++) {
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_submission',
        args: [key],
      });

      const submission = parseSubmissionData(result, key);
      if (submission && submission.originality_score > 0) {
        return submission;
      }

      // Result was empty or score was 0 — might be too early, retry
      console.warn(`Contract read attempt ${attempt}/${CONTRACT_READ_RETRIES}: got empty/zero result, retrying...`);
    } catch (err) {
      console.warn(`Contract read attempt ${attempt}/${CONTRACT_READ_RETRIES} failed:`, err);
    }

    if (attempt < CONTRACT_READ_RETRIES) {
      await delay(CONTRACT_READ_DELAY_MS);
    }
  }

  console.error(`Failed to read submission ${key} after ${CONTRACT_READ_RETRIES} retries`);
  return null;
}

// ═══════════════════════════════════════════════════════════
// WALLET CONNECTION
// ═══════════════════════════════════════════════════════════

export async function connectWallet(): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use ContentScout.');
  }

  const accounts = await window.ethereum!.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (!accounts?.length) throw new Error('No accounts found');
  const address = accounts[0];

  // Switch to GenLayer Studio
  const chainIdHex = `0x${CHAIN_ID.toString(16)}`;
  try {
    const currentChainId = await window.ethereum!.request({ method: 'eth_chainId' });
    if (currentChainId !== chainIdHex) {
      try {
        await window.ethereum!.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
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
        } else {
          console.warn('Failed to switch network:', switchError);
        }
      }
    }
  } catch (e) {
    console.warn('Network check failed:', e);
  }

  client = createClient({
    chain: CHAIN,
    account: address as `0x${string}`,
    provider: window.ethereum!,
  });

  connectedAddress = address;

  window.ethereum!.on('accountsChanged', (accs: string[]) => {
    if (!accs.length) {
      disconnectWallet();
    } else {
      connectedAddress = accs[0];
      client = createClient({
        chain: CHAIN,
        account: accs[0] as `0x${string}`,
        provider: window.ethereum!,
      });
    }
  });

  return address;
}

export function disconnectWallet(): void {
  client = null;
  connectedAddress = null;
}

export function getConnectedAddress(): string | null {
  return connectedAddress;
}

export async function getBalance(): Promise<string> {
  if (!connectedAddress || !window.ethereum) return '0';
  try {
    const hex = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [connectedAddress, 'latest'],
    }) as string;
    return (parseInt(hex, 16) / 1e18).toFixed(4);
  } catch {
    return '0';
  }
}

// ═══════════════════════════════════════════════════════════
// READ METHODS — Contract-Authoritative
// ═══════════════════════════════════════════════════════════

/** Read a submission directly from the contract (single attempt) */
export async function readSubmissionFromContract(key: string): Promise<Submission | null> {
  return readSubmissionWithRetry(key);
}

/** Read contract statistics directly from the contract */
export async function loadOnChainStats(): Promise<ContractStats | null> {
  try {
    const readClient = createClient({ chain: CHAIN });
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'stats',
      args: [],
    });

    const raw = extractString(result);
    if (!raw) return null;

    const data = JSON.parse(raw);
    return {
      submission_count: Number(data.submission_count || 0),
      total_rewarded: Number(data.total_rewarded || 0),
      total_rejected: Number(data.total_rejected || 0),
    };
  } catch (err) {
    console.error('Failed to load on-chain stats:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// SUBMIT — Contract-Authoritative Flow
// ═══════════════════════════════════════════════════════════

/**
 * Submit content for originality analysis.
 *
 * FLOW:
 * 1. Pre-read stats to determine expected key
 * 2. Send transaction to contract (MetaMask prompts for gas)
 * 3. Wait for FINALIZED consensus (AI validators analyze content)
 * 4. Read the contract's judgment via get_submission()
 * 5. Validate and enforce fail-closed consistency
 * 6. Return the AUTHORITATIVE contract result
 *
 * NO LOCAL HEURISTIC IS USED AT ANY POINT.
 * The user sees ONLY the contract's on-chain judgment.
 */
export async function submitContent(
  content: string,
  contentType: string,
  sourceUrl: string,
  onPhaseChange: (phase: string) => void,
): Promise<AnalysisResult> {
  if (!client) throw new Error('Wallet not connected — please connect first');
  if (!content || content.trim().length < 50) {
    throw new Error('Content must be at least 50 characters');
  }

  const truncated = content.slice(0, 4000);

  // ── Step 1: Pre-read stats ──
  let expectedKey = '';
  onPhaseChange('reading_state');
  try {
    const statsResult = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'stats',
      args: [],
    });
    const statsRaw = extractString(statsResult);
    const statsData = JSON.parse(statsRaw);
    expectedKey = String(statsData.submission_count);
  } catch (e) {
    console.warn('Could not pre-read stats:', e);
  }

  // ── Step 2: Submit transaction (MetaMask shows gas fee) ──
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
    console.error('Transaction submission failed:', txErr);
    const errMsg = txErr?.message || txErr?.shortMessage || 'Transaction failed';
    if (errMsg.includes('User rejected') || errMsg.includes('user rejected') || errMsg.includes('denied')) {
      throw new Error('Transaction rejected by user');
    }
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
      reasoning: 'Consensus timed out. The transaction was sent but AI validators did not finalize in time. Check the explorer for the eventual result.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key: expectedKey,
      validationWarnings: ['Consensus timeout — the contract result is not yet available. No local substitute is provided.'],
    };
  }

  // ── Step 4: Determine submission key ──
  let key = expectedKey;
  if (!key) {
    try {
      const postStatsResult = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'stats',
        args: [],
      });
      const postStatsRaw = extractString(postStatsResult);
      const postStats = JSON.parse(postStatsRaw);
      key = String(postStats.submission_count - 1);
    } catch (e) {
      console.warn('Could not read stats after submission:', e);
      key = `unknown-${Date.now()}`;
    }
  }

  // ── Step 5: Read the contract's AUTHORITATIVE judgment ──
  onPhaseChange('reading_result');
  const submission = await readSubmissionWithRetry(key);

  onPhaseChange('complete');

  if (!submission) {
    return {
      originality_score: 0,
      is_original: false,
      reasoning: 'Failed to read the contract judgment after consensus. The submission was recorded on-chain but the result could not be retrieved. No local substitute is provided — please check the explorer.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key,
      validationWarnings: ['Contract read failed — no local heuristic is substituted. Check explorer for actual result.'],
    };
  }

  // ── Step 6: Validate and return ──
  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;

  if (!submissionKeys.includes(key)) {
    submissionKeys.unshift(key);
  }

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal, // ALWAYS fail-closed
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

/**
 * Appeal a submission for re-judgment.
 *
 * FLOW:
 * 1. Send appeal transaction (MetaMask prompts for gas)
 * 2. Wait for FINALIZED re-consensus
 * 3. Read the contract's UPDATED judgment via get_submission()
 * 4. Validate and enforce fail-closed consistency
 * 5. Return the AUTHORITATIVE contract result
 *
 * NO LOCAL HEURISTIC IS USED AT ANY POINT.
 */
export async function appealSubmission(
  key: string,
  onPhaseChange: (phase: string) => void,
): Promise<AnalysisResult> {
  if (!client) throw new Error('Wallet not connected — please connect first');

  // ── Step 1: Submit appeal transaction ──
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
    const errMsg = txErr?.message || txErr?.shortMessage || 'Appeal transaction failed';
    if (errMsg.includes('User rejected') || errMsg.includes('user rejected') || errMsg.includes('denied')) {
      throw new Error('Appeal transaction rejected by user');
    }
    throw new Error(`Appeal failed: ${errMsg}`);
  }

  const txHash = `0x${txHashBigInt.toString(16).padStart(64, '0')}`;

  // ── Step 2: Wait for AI re-consensus ──
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
    try {
      await client.waitForTransactionReceipt({
        hash: txHash as any,
        status: TransactionStatus.ACCEPTED,
        retries: 60,
        interval: CONSENSUS_INTERVAL_MS,
      });
      consensusReached = true;
    } catch (e2) {
      console.error('Appeal consensus timeout:', e2);
    }
  }

  if (!consensusReached) {
    return {
      originality_score: 0,
      is_original: false,
      reasoning: 'Appeal consensus timed out. Check the explorer for the eventual result.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key,
      validationWarnings: ['Appeal consensus timeout — no local substitute is provided.'],
    };
  }

  // ── Step 3: Read the contract's AUTHORITATIVE updated judgment ──
  onPhaseChange('reading_result');
  const submission = await readSubmissionWithRetry(key);
  onPhaseChange('complete');

  if (!submission) {
    return {
      originality_score: 0,
      is_original: false,
      reasoning: 'Failed to read updated judgment from contract after appeal. No local substitute is provided.',
      similar_sources: [],
      authority: 'error',
      txHash,
      key,
      validationWarnings: ['Contract read failed after appeal — check explorer.'],
    };
  }

  const validationWarnings = validateContractResult(submission);
  const enforcedOriginal = submission.originality_score >= PLAGIARISM_THRESHOLD;

  return {
    originality_score: submission.originality_score,
    is_original: enforcedOriginal, // ALWAYS fail-closed
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

export function getSubmissionKeys(): string[] {
  return [...submissionKeys];
}

export async function loadRecentSubmissionKeys(maxCount: number = 20): Promise<string[]> {
  try {
    const onChainStats = await loadOnChainStats();
    if (!onChainStats || onChainStats.submission_count === 0) return [];

    const totalCount = onChainStats.submission_count;
    const startKey = Math.max(0, totalCount - maxCount);
    const keys: string[] = [];

    for (let i = totalCount - 1; i >= startKey; i--) {
      keys.push(String(i));
    }

    const localKeys = new Set(submissionKeys);
    for (const k of keys) {
      if (!localKeys.has(k) && !submissionKeys.includes(k)) {
        submissionKeys.push(k);
      }
    }

    submissionKeys.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return b.localeCompare(a);
    });

    return [...submissionKeys];
  } catch (e) {
    console.error('Failed to load recent submission keys:', e);
    return [...submissionKeys];
  }
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

/** Validate any submission data for consistency — used by UI components */
export function validateSubmission(sub: { originality_score: number; is_original: boolean; reasoning: string; similar_sources: string[] }): string[] {
  return validateContractResult(sub);
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
