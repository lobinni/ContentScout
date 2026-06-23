/**
 * ContentScout — Hybrid GenLayer Integration
 * 
 * Works in two modes:
 * 1. ON-CHAIN: Real transactions on GenLayer Bradbury via MetaMask
 * 2. LOCAL FALLBACK: Instant results using local analyzer when on-chain unavailable
 * 
 * Results are always shown immediately via local analysis.
 * On-chain status updates asynchronously in the background.
 */

import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { Submission, ContractStats, RewardEligibility } from '../types';
import { analyzeOriginality } from './analyzer';

// ─── Constants ──────────────────────────────────────────────
export const CONTRACT_ADDRESS = '0xEDf0e9B44b609f63aE17d1345C1e5dDF81000BdE';
export const CHAIN_ID = 4221;
export const PLAGIARISM_THRESHOLD = 40;
export const RPC_ENDPOINT = 'https://rpc-bradbury.genlayer.com';
export const EXPLORER_URL = 'https://explorer-bradbury.genlayer.com';

// ─── State ──────────────────────────────────────────────────
let client: ReturnType<typeof createClient> | null = null;
let connectedAddress: string | null = null;

// Local submissions store (always works, even without blockchain)
let localSubmissions: Submission[] = [];
let localSubmissionCount = 0;
let localTotalRewarded = 0;
let localTotalRejected = 0;

// ─── MetaMask Helpers ───────────────────────────────────────

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

async function switchToGenLayerNetwork(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: 'GenLayer Bradbury',
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
          rpcUrls: [RPC_ENDPOINT],
          blockExplorerUrls: [EXPLORER_URL],
        }],
      });
    }
  }
}

// ─── Wallet ─────────────────────────────────────────────────

export async function connectWallet(): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed');
  }

  const accounts = await window.ethereum!.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (!accounts?.length) throw new Error('No accounts found');

  const address = accounts[0];

  try {
    const chainId = parseInt(
      await window.ethereum!.request({ method: 'eth_chainId' }) as string,
      16
    );
    if (chainId !== CHAIN_ID) await switchToGenLayerNetwork();
  } catch (e) {
    console.warn('Network switch failed:', e);
  }

  // Create GenLayer client
  client = createClient({
    chain: testnetBradbury,
    account: address as `0x${string}`,
  });

  connectedAddress = address;

  window.ethereum!.on('accountsChanged', (accs: string[]) => {
    if (!accs.length) {
      disconnectWallet();
    } else {
      connectedAddress = accs[0];
      client = createClient({
        chain: testnetBradbury,
        account: accs[0] as `0x${string}`,
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

// ─── Submit (Hybrid: local first, then on-chain) ────────────

export interface SubmitResult {
  submission: Submission;
  analysis: ReturnType<typeof analyzeOriginality>;
  txHash?: string;
  txStatus: 'local' | 'pending' | 'finalized' | 'failed';
  onChainPromise?: Promise<{ txHash: string; key: string } | null>;
}

export function submitContent(
  content: string,
  contentType: string,
  sourceUrl: string
): SubmitResult {
  const truncated = content.slice(0, 4000);

  // 1) Run local analysis IMMEDIATELY
  const analysis = analyzeOriginality(truncated, contentType, sourceUrl);

  // 2) Create local submission record
  const key = `local-${localSubmissionCount}`;
  localSubmissionCount++;

  const submission: Submission = {
    key,
    author: connectedAddress || '0x0000000000000000000000000000000000000000',
    content_preview: truncated.substring(0, 200) + (truncated.length > 200 ? '...' : ''),
    content_type: contentType,
    source_url: sourceUrl,
    originality_score: analysis.originality_score,
    is_original: analysis.is_original,
    reasoning: analysis.reasoning,
    similar_sources: analysis.similar_sources,
    appealed: false,
    timestamp: Date.now(),
    txStatus: 'local',
  };

  // Update local counters
  if (analysis.is_original) {
    localTotalRewarded++;
  } else {
    localTotalRejected++;
  }

  // Store locally
  localSubmissions.unshift(submission);

  // 3) If wallet connected, also submit on-chain in background
  let onChainPromise: Promise<{ txHash: string; key: string } | null> | undefined;

  if (client && connectedAddress) {
    submission.txStatus = 'pending';

    onChainPromise = submitOnChain(truncated, contentType, sourceUrl)
      .then((result) => {
        // Update local submission with on-chain data
        submission.txHash = result.txHash;
        submission.txStatus = 'finalized';
        submission.key = result.key;
        return result;
      })
      .catch((err) => {
        console.error('On-chain submit failed:', err);
        submission.txStatus = 'failed';
        return null;
      });
  }

  return {
    submission,
    analysis,
    txStatus: submission.txStatus || 'local',
    onChainPromise,
  };
}

async function submitOnChain(
  content: string,
  contentType: string,
  sourceUrl: string
): Promise<{ txHash: string; key: string }> {
  if (!client) throw new Error('Client not initialized');

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'submit',
    args: [content, contentType, sourceUrl || ''],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 60,
    interval: 3000,
  });

  const key = receipt.result?.toString() || '0';
  return { txHash, key };
}

// ─── Appeal ─────────────────────────────────────────────────

export async function appeal(key: string): Promise<Submission | null> {
  // Find the local submission
  const sub = localSubmissions.find(s => s.key === key);

  if (sub) {
    // Re-run local analysis
    const newAnalysis = analyzeOriginality(
      sub.content_preview,
      sub.content_type,
      sub.source_url
    );

    const previousOriginal = sub.is_original;
    sub.originality_score = newAnalysis.originality_score;
    sub.is_original = newAnalysis.is_original;
    sub.reasoning = newAnalysis.reasoning;
    sub.similar_sources = newAnalysis.similar_sources;
    sub.appealed = true;

    // Fix counters
    if (previousOriginal !== newAnalysis.is_original) {
      if (newAnalysis.is_original) { localTotalRewarded++; localTotalRejected--; }
      else { localTotalRewarded--; localTotalRejected++; }
    }

    // Try on-chain appeal in background
    if (client && !key.startsWith('local-')) {
      try {
        await client.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'appeal',
          args: [key],
          value: 0n,
        });
      } catch (err) {
        console.warn('On-chain appeal failed:', err);
      }
    }

    return sub;
  }

  return null;
}

// ─── Read Methods ───────────────────────────────────────────

export function getAllSubmissions(): Submission[] {
  return [...localSubmissions];
}

export function getStats(): ContractStats {
  return {
    submission_count: localSubmissionCount,
    total_rewarded: localTotalRewarded,
    total_rejected: localTotalRejected,
  };
}

export async function getSubmission(key: string): Promise<Submission | null> {
  // Check local first
  const local = localSubmissions.find(s => s.key === key);
  if (local) return local;

  // Try on-chain
  const readClient = client || createClient({ chain: testnetBradbury });
  try {
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_submission',
      args: [key],
    });
    if (!result) return null;
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      key,
      author: data.author || '',
      content_preview: data.content_preview || '',
      content_type: data.content_type || '',
      source_url: data.source_url || '',
      originality_score: data.originality_score || 0,
      is_original: data.is_original || false,
      reasoning: data.reasoning || '',
      similar_sources: data.similar_sources || [],
      appealed: data.appealed || false,
      timestamp: Date.now(),
      txStatus: 'finalized',
    };
  } catch {
    return null;
  }
}

export async function readRewardEligibility(key: string): Promise<RewardEligibility | null> {
  // Check local
  const sub = localSubmissions.find(s => s.key === key);
  if (sub) {
    return {
      eligible: sub.is_original,
      author: sub.author,
      score: sub.originality_score,
      key: sub.key,
      claimed: false,
    };
  }
  return null;
}

// Try loading on-chain stats at startup
export async function loadOnChainStats(): Promise<ContractStats | null> {
  try {
    const readClient = createClient({ chain: testnetBradbury });
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'stats',
      args: [],
    });
    if (!result) return null;
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    return {
      submission_count: Number(data.submission_count || 0),
      total_rewarded: Number(data.total_rewarded || 0),
      total_rejected: Number(data.total_rejected || 0),
    };
  } catch {
    return null;
  }
}

// ─── Utility ────────────────────────────────────────────────

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL}/tx/${txHash}`;
}

export function getExplorerContractUrl(): string {
  return `${EXPLORER_URL}/contract/${CONTRACT_ADDRESS}`;
}

export function getFaucetUrl(): string {
  return 'https://faucet.genlayer.com';
}

// ─── Window type extension ──────────────────────────────────
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
