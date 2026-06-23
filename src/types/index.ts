// Contract State Types (mirroring GenLayer contract structure)
export interface Submission {
  key: string;
  author: string;
  content_preview: string;
  content_type: string;
  source_url: string;
  originality_score: number;
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
  appealed: boolean;
  timestamp: number;
  // On-chain status
  txHash?: string;
  txStatus?: 'local' | 'pending' | 'finalized' | 'failed';
}

export interface ContractStats {
  submission_count: number;
  total_rewarded: number;
  total_rejected: number;
}

export interface RewardEligibility {
  eligible: boolean;
  author: string;
  score: number;
  key: string;
  claimed: boolean;
}

// Analysis Types
export interface AnalysisResult {
  originality_score: number;
  is_original: boolean;
  reasoning: string;
  similar_sources: string[];
  metrics: {
    uniqueness: number;
    vocabulary: number;
    structure: number;
    creativity: number;
  };
  // On-chain info
  txHash?: string;
  txStatus?: 'local' | 'pending' | 'finalized' | 'failed';
  key?: string;
}

// Wallet Types
export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
}

// Transaction Types
export type TxStatusType = 'pending' | 'submitted' | 'finalized' | 'failed';

export interface Transaction {
  hash: string;
  status: TxStatusType;
  method: string;
  timestamp: number;
}
