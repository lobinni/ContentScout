/**
 * ContentScout — GenLayer Integration
 * 
 * Connects to the ContentScout Intelligent Contract on GenLayer.
 * Supports both on-chain transactions and local fallback mode.
 * 
 * IMPORTANT: Update CONTRACT_ADDRESS after deploying your contract!
 */

import { createClient } from 'genlayer-js';
import { testnetAsimov } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { Submission, ContractStats, RewardEligibility } from '../types';
import { analyzeOriginality } from './analyzer';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — Update these after deploying your contract!
// ═══════════════════════════════════════════════════════════

// Contract address - update after deployment or set via VITE_CONTRACT_ADDRESS env var
export const CONTRACT_ADDRESS = 
  import.meta.env.VITE_CONTRACT_ADDRESS || 
  '0x0000000000000000000000000000000000000000';

// Network configuration
export const CHAIN_ID = 4220; // testnet-asimov (use 4221 for bradbury)
export const CHAIN = testnetAsimov;
export const RPC_ENDPOINT = 'https://rpc.genlayer.com';
export const EXPLORER_URL = 'https://explorer.genlayer.com';

// Scoring threshold
export const PLAGIARISM_THRESHOLD = 40;

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

let client: ReturnType<typeof createClient> | null = null;
let connectedAddress: string | null = null;

// Local submissions store (fallback when contract unavailable)
const localSubmissions: Submission[] = [];
let localSubmissionCount = 0;
let localTotalRewarded = 0;
let localTotalRejected = 0;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export function isContractConfigured(): boolean {
  return CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
}

async function switchNetwork(): Promise<void> {
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
          chainName: 'GenLayer Testnet',
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
          rpcUrls: [RPC_ENDPOINT],
          blockExplorerUrls: [EXPLORER_URL],
        }],
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// WALLET CONNECTION
// ═══════════════════════════════════════════════════════════

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
    await switchNetwork();
  } catch (e) {
    console.warn('Network switch failed:', e);
  }

  // Create GenLayer client
  client = createClient({
    chain: CHAIN,
    account: address as `0x${string}`,
  });

  connectedAddress = address;

  // Listen for account changes
  window.ethereum!.on('accountsChanged', (accs: string[]) => {
    if (!accs.length) {
      disconnectWallet();
    } else {
      connectedAddress = accs[0];
      client = createClient({
        chain: CHAIN,
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

// ═══════════════════════════════════════════════════════════
// SUBMIT CONTENT
// ═══════════════════════════════════════════════════════════

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

  // 1) Run local analysis immediately
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

  localSubmissions.unshift(submission);

  // 3) If contract is configured and wallet connected, submit on-chain
  let onChainPromise: Promise<{ txHash: string; key: string } | null> | undefined;

  if (client && connectedAddress && isContractConfigured()) {
    submission.txStatus = 'pending';

    onChainPromise = submitOnChain(truncated, contentType, sourceUrl)
      .then((result) => {
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

// ═══════════════════════════════════════════════════════════
// APPEAL
// ═══════════════════════════════════════════════════════════

export async function appeal(key: string): Promise<Submission | null> {
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

    // Try on-chain appeal
    if (client && isContractConfigured() && !key.startsWith('local-')) {
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

// ═══════════════════════════════════════════════════════════
// READ METHODS
// ═══════════════════════════════════════════════════════════

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

export async function loadOnChainStats(): Promise<ContractStats | null> {
  if (!isContractConfigured()) return null;
  
  try {
    const readClient = createClient({ chain: CHAIN });
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

export async function getSubmission(key: string): Promise<Submission | null> {
  // Check local first
  const local = localSubmissions.find(s => s.key === key);
  if (local) return local;

  // Try on-chain
  if (!isContractConfigured()) return null;
  
  const readClient = client || createClient({ chain: CHAIN });
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

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

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

// Window type extension
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
