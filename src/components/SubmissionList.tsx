import { motion, AnimatePresence } from 'framer-motion';
import { Submission } from '../types';
import { formatAddress, PLAGIARISM_THRESHOLD, getExplorerTxUrl } from '../lib/genlayer';
import { toast } from 'sonner';

interface SubmissionListProps {
  submissions: Submission[];
  currentAddress: string | null;
  onAppeal: (key: string) => void;
  onSelect: (submission: Submission | null) => void;
  selectedKey?: string;
}

export default function SubmissionList({
  submissions,
  currentAddress,
  onAppeal,
  onSelect,
  selectedKey,
}: SubmissionListProps) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-cyan-400';
    if (s >= PLAGIARISM_THRESHOLD) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBarColor = (s: number) => {
    if (s >= 70) return 'bg-cyan-400';
    if (s >= PLAGIARISM_THRESHOLD) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });

  const handleAppeal = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.promise(Promise.resolve(onAppeal(key)), {
      loading: '↻ Re-judging...',
      success: '✓ Appeal verdict updated',
      error: '✗ Appeal failed',
    });
  };

  const getTxBadge = (sub: Submission) => {
    switch (sub.txStatus) {
      case 'pending':
        return <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-yellow-400/20 text-yellow-400/60 bg-yellow-400/5 animate-pulse">PENDING</span>;
      case 'finalized':
        return <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-cyan-400/20 text-cyan-400/60 bg-cyan-400/5">ON-CHAIN</span>;
      case 'failed':
        return <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-red-400/20 text-red-400/60 bg-red-400/5">TX FAIL</span>;
      default:
        return <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/20 bg-white/[0.02]">LOCAL</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">SUBMISSIONS_LOG</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/15">{submissions.length} records</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 pulse-dot"></div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
              <svg className="w-7 h-7 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/[0.06]"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-white/[0.06]"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-white/[0.06]"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/[0.06]"></div>
          </div>
          <p className="text-sm font-mono text-white/15 mb-1 tracking-wider">NO DATA</p>
          <p className="text-xs font-mono text-white/10 text-center max-w-[240px]">
            Submit content to begin originality analysis
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {submissions.map((sub, idx) => {
              const isOwner = currentAddress && sub.author.toLowerCase() === currentAddress.toLowerCase();
              const canAppeal = isOwner && !sub.appealed && !sub.is_original;
              const isSelected = selectedKey === sub.key;

              return (
                <motion.div
                  key={sub.key}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  onClick={() => onSelect(isSelected ? null : sub)}
                  className={`group relative px-5 py-4 border-b border-white/[0.03] cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-cyan-400/[0.04] border-l-2 border-l-cyan-400/40'
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Row 1: Meta */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-white/20 flex-wrap">
                      <span className="text-white/10">#{sub.key}</span>
                      <span className="text-white/8">|</span>
                      <span className="uppercase text-white/25">{sub.content_type}</span>
                      <span className="text-white/8">|</span>
                      <span>{formatTime(sub.timestamp)}</span>
                      {isOwner && (
                        <span className="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400/60 rounded text-[9px]">YOU</span>
                      )}
                      {getTxBadge(sub)}
                    </div>
                    <div className={`text-lg font-mono font-bold ${getScoreColor(sub.originality_score)}`}>
                      {sub.originality_score}
                    </div>
                  </div>

                  {/* Row 2: Author */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-mono text-white/15">from</span>
                    <code className="text-[10px] font-mono text-fuchsia-400/50">
                      {formatAddress(sub.author)}
                    </code>
                  </div>

                  {/* Row 3: Content */}
                  <p className="text-xs font-mono text-white/30 line-clamp-2 leading-relaxed mb-3">
                    {sub.content_preview}
                  </p>

                  {/* Row 4: Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(sub.originality_score)}`}
                          style={{ width: `${sub.originality_score}%`, opacity: 0.5 }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border ${
                        sub.is_original
                          ? 'text-cyan-400/70 border-cyan-400/20 bg-cyan-400/5'
                          : 'text-red-400/70 border-red-400/20 bg-red-400/5'
                      }`}>
                        {sub.is_original ? 'ORIGINAL' : 'FLAGGED'}
                      </span>
                      {sub.appealed && (
                        <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border text-fuchsia-400/70 border-fuchsia-400/20 bg-fuchsia-400/5">APPEALED</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {sub.txHash && (
                        <a
                          href={getExplorerTxUrl(sub.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono text-cyan-400/40 hover:text-cyan-400/70 transition-colors"
                        >
                          TX↗
                        </a>
                      )}
                      {sub.source_url && (
                        <a
                          href={sub.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono text-cyan-400/40 hover:text-cyan-400/70 transition-colors"
                        >
                          SOURCE↗
                        </a>
                      )}
                      {canAppeal && (
                        <button
                          onClick={(e) => handleAppeal(sub.key, e)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded border border-yellow-400/20 text-yellow-400/60 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
                        >
                          ↻ APPEAL
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
