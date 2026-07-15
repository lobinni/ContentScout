import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Submission } from '../types';
import { PLAGIARISM_THRESHOLD, readSubmissionFromContract } from '../lib/genlayer';

interface SubmissionListProps {
  submissionKeys: string[];
  currentAddress: string | null;
  onAppeal: (key: string) => void;
  onSelect: (submission: Submission | null) => void;
  isAppealing: boolean;
}

export default function SubmissionList({
  submissionKeys,
  currentAddress,
  onAppeal,
  onSelect,
  isAppealing,
}: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  // Fetch submissions from contract when keys change
  useEffect(() => {
    const fetchSubmissions = async () => {
      for (const key of submissionKeys) {
        if (!submissions.has(key) && !loadingKeys.has(key)) {
          setLoadingKeys(prev => new Set(prev).add(key));
          try {
            // ALWAYS read from contract — never use local data
            const sub = await readSubmissionFromContract(key);
            if (sub) {
              setSubmissions(prev => new Map(prev).set(key, sub));
            }
          } catch (e) {
            console.error(`Failed to fetch submission ${key} from contract:`, e);
          } finally {
            setLoadingKeys(prev => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
        }
      }
    };
    fetchSubmissions();
  }, [submissionKeys]);

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
          <span className="text-[10px] font-mono text-white/15">{submissionKeys.length} records</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 pulse-dot"></div>
        </div>
      </div>

      {/* Data source notice */}
      <div className="px-5 py-2 bg-cyan-400/[0.02] border-b border-cyan-400/[0.06]">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-cyan-400/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-[9px] font-mono text-cyan-400/30 tracking-wider">
            ALL DATA FROM CONTRACT · FAIL-CLOSED ENFORCED
          </span>
        </div>
      </div>

      {submissionKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
              <svg className="w-7 h-7 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-mono text-white/15 mb-1 tracking-wider">NO SUBMISSIONS YET</p>
          <p className="text-xs font-mono text-white/10 text-center max-w-[240px]">
            Submit content to receive AI consensus originality judgment from the contract
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {submissionKeys.map((key, idx) => {
              const sub = submissions.get(key);
              const isLoading = loadingKeys.has(key);
              const isOwner = currentAddress && sub?.author?.toLowerCase() === currentAddress.toLowerCase();
              const canAppeal = isOwner && sub && !sub.appealed && !sub.is_original;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  onClick={() => onSelect(sub || null)}
                  className="group relative px-5 py-4 border-b border-white/[0.03] cursor-pointer transition-all duration-200 hover:bg-white/[0.02] border-l-2 border-l-transparent hover:border-l-cyan-400/30"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 animate-spin text-cyan-400/40" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs font-mono text-white/20">Reading from contract...</span>
                    </div>
                  ) : sub ? (
                    <>
                      {/* Row 1: Meta + Score */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/20 flex-wrap">
                          <span className="text-white/10">#{key}</span>
                          <span className="text-white/8">|</span>
                          <span className="uppercase text-white/25">{sub.content_type}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-green-400/20 text-green-400/50 bg-green-400/5">
                            CONTRACT
                          </span>
                        </div>
                        <div className={`text-lg font-mono font-bold ${getScoreColor(sub.originality_score)}`}>
                          {sub.originality_score}
                        </div>
                      </div>

                      {/* Row 2: Content preview */}
                      <p className="text-xs font-mono text-white/30 line-clamp-2 leading-relaxed mb-3">
                        {sub.content_preview}
                      </p>

                      {/* Row 3: Verdict + Appeal */}
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
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-fuchsia-400/20 text-fuchsia-400/60 bg-fuchsia-400/5">
                              APPEALED
                            </span>
                          )}
                        </div>
                        {canAppeal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppeal(key);
                            }}
                            disabled={isAppealing}
                            className="text-[10px] font-mono px-2 py-1 rounded border border-fuchsia-400/20 text-fuchsia-400/50 bg-fuchsia-400/5 hover:bg-fuchsia-400/10 hover:text-fuchsia-400/80 transition-all disabled:opacity-30"
                          >
                            {isAppealing ? '↻ RE-JUDGING...' : '↻ APPEAL'}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs font-mono text-red-400/30">
                      Failed to read from contract
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
