/**
 * ContentScout — GenLayer Client Simulation
 * 
 * Simulates the genlayer-js SDK for demo purposes.
 * Production would use the real package:
 * 
 * import { createClient } from 'genlayer-js';
 * const client = createClient({ chain: 'bradbury', endpoint: 'https://rpc.genlayer.com' });
 */

import { Submission, ContractStats, RewardEligibility, AnalysisResult } from '../types';
import { analyzeOriginality } from './analyzer';

// Simulated contract address (like the real one on Bradbury)
export const CONTRACT_ADDRESS = '0xEDf0e9B44b609f63aE17d1345C1e5dDF81000BdE';
export const CHAIN_ID = 4221; // GenLayer Bradbury
export const PLAGIARISM_THRESHOLD = 40; // Score >= 40 is considered original

// In-memory storage (simulating TreeMap[str, str] from contract)
let submissions: Map<string, Submission> = new Map();
let submissionCount = 0;
let totalRewarded = 0;
let totalRejected = 0;

// Simulated wallet state
let connectedAddress: string | null = null;

/**
 * Connect wallet (simulates MetaMask connection)
 */
export async function connectWallet(): Promise<string> {
  // Simulate wallet connection delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Generate a random address for demo
  const address = '0x' + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  connectedAddress = address;
  return address;
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  connectedAddress = null;
}

/**
 * Get connected address
 */
export function getConnectedAddress(): string | null {
  return connectedAddress;
}

/**
 * Submit content for originality check
 * Simulates: contract.submit(content, content_type, source_url)
 */
export async function submit(
  content: string,
  contentType: string,
  sourceUrl: string
): Promise<{ key: string; submission: Submission }> {
  if (!connectedAddress) {
    throw new Error('Wallet not connected');
  }

  // Simulate transaction submission delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate AI consensus round (gl.vm.run_nondet_unsafe)
  // In real contract, this runs leader_fn and validator_fn
  const result: AnalysisResult = await runNondetUnsafe(content, contentType, sourceUrl);

  // Simulate finalization delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const key = submissionCount.toString();
  submissionCount++;

  const submission: Submission = {
    key,
    author: connectedAddress,
    content_preview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    content_type: contentType,
    source_url: sourceUrl,
    originality_score: result.originality_score,
    is_original: result.is_original,
    reasoning: result.reasoning,
    similar_sources: result.similar_sources,
    appealed: false,
    timestamp: Date.now(),
  };

  submissions.set(key, submission);

  // Update counters
  if (result.is_original) {
    totalRewarded++;
  } else {
    totalRejected++;
  }

  return { key, submission };
}

/**
 * Appeal a submission
 * Simulates: contract.appeal(key)
 */
export async function appeal(key: string): Promise<Submission> {
  if (!connectedAddress) {
    throw new Error('Wallet not connected');
  }

  const submission = submissions.get(key);
  if (!submission) {
    throw new Error('Submission not found');
  }

  if (submission.author !== connectedAddress) {
    throw new Error('Only the original author can appeal');
  }

  if (submission.appealed) {
    throw new Error('Already appealed');
  }

  // Simulate re-judgment with fresh web search
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Re-run analysis (simulating fresh web evidence)
  const result = await runNondetUnsafe(
    submission.content_preview,
    submission.content_type,
    submission.source_url
  );

  const previousIsOriginal = submission.is_original;

  // Update submission
  submission.originality_score = result.originality_score;
  submission.is_original = result.is_original;
  submission.reasoning = result.reasoning;
  submission.similar_sources = result.similar_sources;
  submission.appealed = true;

  // Reconcile counters if verdict flipped
  if (previousIsOriginal !== result.is_original) {
    if (result.is_original) {
      totalRewarded++;
      totalRejected--;
    } else {
      totalRewarded--;
      totalRejected++;
    }
  }

  submissions.set(key, submission);

  return submission;
}

/**
 * Read a submission
 * Simulates: contract.get_submission(key)
 */
export function getSubmission(key: string): Submission | null {
  return submissions.get(key) || null;
}

/**
 * Get all submissions
 */
export function getAllSubmissions(): Submission[] {
  return Array.from(submissions.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get contract stats
 * Simulates: contract.stats()
 */
export function getStats(): ContractStats {
  return {
    submission_count: submissionCount,
    total_rewarded: totalRewarded,
    total_rejected: totalRejected,
  };
}

/**
 * Read reward eligibility
 * Simulates: contract.read_reward_eligibility(key)
 */
export function readRewardEligibility(key: string): RewardEligibility | null {
  const submission = submissions.get(key);
  if (!submission) return null;

  return {
    eligible: submission.is_original,
    author: submission.author,
    score: submission.originality_score,
    key: submission.key,
    claimed: false, // In real system, this would check RewardVault
  };
}

/**
 * Simulate gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
 * This is where the AI consensus happens
 */
async function runNondetUnsafe(
  content: string,
  contentType: string,
  sourceUrl: string
): Promise<AnalysisResult> {
  // Simulate web crawling if source_url provided
  // In real contract: gl.nondet.web.get(source_url)
  if (sourceUrl) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Run analysis (simulates gl.nondet.exec_prompt)
  const result = analyzeOriginality(content, contentType, sourceUrl);

  // Validator function checks:
  // - originality_score is int in 0-100
  // - is_original is bool
  // - reasoning is string
  // This always passes in our simulation

  return result;
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get explorer URL for contract
 */
export function getExplorerUrl(): string {
  return `https://explorer-bradbury.genlayer.com/contract/${CONTRACT_ADDRESS}`;
}
