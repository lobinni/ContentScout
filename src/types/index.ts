// ═══════════════════════════════════════════════════════════
// ContentScout — Type Definitions (Contract-Authoritative)
// ═══════════════════════════════════════════════════════════
// NO local heuristic types. NO metrics from browser analysis.
// Every result type originates from the on-chain contract.
// ═══════════════════════════════════════════════════════════

/** Submission data — always read from contract, never locally generated */
export interface Submission {
  key: string;
  author: string;
  content_preview: string;
  content_type: string;
  source_url: string;
  originality_score: number;
  /** ALWAYS enforced: is_original = originality_score >= 40 */
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
  appealed: boolean;
  txHash?: string;
  txStatus: 'pending' | 'finalized' | 'failed';
  timestamp?: number;
}

/** Contract statistics — always read from contract */
export interface ContractStats {
  submission_count: number;
  total_rewarded: number;
  total_rejected: number;
}

/** Analysis result — ONLY populated from contract judgment */
export interface AnalysisResult {
  originality_score: number;
  /** ALWAYS enforced fail-closed: is_original = originality_score >= 40 */
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
  /**
   * Authority source — only two valid values:
   * - 'contract': Result was successfully read from the on-chain contract
   * - 'error': Contract read failed — NO local substitute is provided
   */
  authority: 'contract' | 'error';
  /** Transaction hash */
  txHash?: string;
  /** Submission key */
  key?: string;
  /** Validation warnings if contract result is inconsistent or lacks evidence */
  validationWarnings?: string[];
}

/** Wallet state */
export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string;
}

/** Submission phases for the UI */
export type SubmissionPhase =
  | 'idle'
  | 'reading_state'
  | 'submitting'
  | 'awaiting_consensus'
  | 'reading_result'
  | 'complete'
  | 'failed';

/** Appeal phases */
export type AppealPhase =
  | 'idle'
  | 'submitting'
  | 'awaiting_consensus'
  | 'reading_result'
  | 'complete'
  | 'failed';
