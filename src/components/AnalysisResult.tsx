import { motion } from 'framer-motion';
import { AnalysisResult as AnalysisResultType } from '../types';
import { PLAGIARISM_THRESHOLD, getExplorerTxUrl } from '../lib/genlayer';

interface AnalysisResultProps {
  result: AnalysisResultType;
  onAppeal?: (key: string) => void;
  isAppealing?: boolean;
}

export default function AnalysisResult({ result, onAppeal, isAppealing }: AnalysisResultProps) {
  const { originality_score, is_original, reasoning, similar_sources, authority, txHash, key, validationWarnings } = result;

  const scoreColor = originality_score >= 70
    ? 'text-cyan-400'
    : originality_score >= PLAGIARISM_THRESHOLD
      ? 'text-yellow-400'
      : 'text-red-400';

  const scoreGlow = originality_score >= 70
    ? 'neon-cyan'
    : originality_score >= PLAGIARISM_THRESHOLD
      ? ''
      : 'neon-red';

  const barColor = originality_score >= 70
    ? 'bg-cyan-400'
    : originality_score >= PLAGIARISM_THRESHOLD
      ? 'bg-yellow-400'
      : 'bg-red-400';

  const verdictLabel = is_original ? 'ORIGINAL' : 'FLAGGED';
  const verdictColor = is_original
    ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'
    : 'text-red-400 border-red-400/30 bg-red-400/10';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* ── HEADER: Authority badge ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">
          CONTRACT_JUDGMENT
        </span>
        <div className="flex items-center gap-2">
          {authority === 'contract' && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-green-400/30 text-green-400/80 bg-green-400/10 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              ON-CHAIN · FROM CONTRACT get_submission()
            </span>
          )}
          {authority === 'error' && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-red-400/30 text-red-400/80 bg-red-400/10 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              READ ERROR · NO LOCAL SUBSTITUTE
            </span>
          )}
        </div>
      </div>

      {/* ── WATERMARK: Contract authority ── */}
      <div className="px-5 py-2 bg-cyan-400/[0.02] border-b border-cyan-400/[0.06]">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-cyan-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-[10px] font-mono text-cyan-400/40 tracking-wider">
            SOURCE: on-chain AI consensus · FAIL-CLOSED: is_original = score ≥ {PLAGIARISM_THRESHOLD}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Score + Verdict ── */}
        <div className="flex items-center gap-6">
          <div className="text-center min-w-[80px]">
            <div className={`text-5xl font-mono font-bold ${scoreColor} ${scoreGlow}`}>
              {originality_score}
            </div>
            <div className="text-[10px] font-mono text-white/20 mt-1">/100</div>
          </div>
          <div className="flex-1 space-y-3">
            <span className={`inline-block px-3 py-1.5 rounded-md border text-sm font-mono tracking-wider font-bold ${verdictColor}`}>
              {verdictLabel}
            </span>
            {/* Score bar */}
            <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} bar-fill`}
                style={{ width: `${originality_score}%`, opacity: 0.6 }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-white/15">
              <span>0</span>
              <span className="text-yellow-400/40">◄ THRESHOLD: {PLAGIARISM_THRESHOLD}</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* ── Authority explanation ── */}
        <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-cyan-400/70 tracking-wider font-bold">📜 AUTHORITATIVE SOURCE</span>
          </div>
          <p className="text-[11px] font-mono text-white/35 leading-relaxed">
            {authority === 'contract'
              ? `This judgment was produced by on-chain AI validator consensus. The result was read from the contract's get_submission("${key}") method. The verdict is enforced fail-closed: is_original is ALWAYS derived from score ≥ ${PLAGIARISM_THRESHOLD}, removing any possible fail-open passing verdict.`
              : 'The contract result could not be read. NO local heuristic or browser-based analysis is substituted. Check the explorer for the actual on-chain result.'}
          </p>
        </div>

        {/* ── Validation warnings ── */}
        {validationWarnings && validationWarnings.length > 0 && (
          <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3">
            <div className="text-[10px] font-mono text-yellow-400/70 mb-2 tracking-wider font-bold">
              ⚠ VALIDATION WARNINGS — CONTRACT RESULT AUDIT
            </div>
            {validationWarnings.map((w, i) => (
              <p key={i} className="text-[11px] font-mono text-yellow-400/50 leading-relaxed mb-1">
                • {w}
              </p>
            ))}
            <p className="text-[10px] font-mono text-yellow-400/30 mt-2 pt-2 border-t border-yellow-400/10">
              Client-side enforcement: is_original = score ≥ {PLAGIARISM_THRESHOLD} (fail-closed). The displayed verdict overrides any contract inconsistency.
            </p>
          </div>
        )}

        {/* ── Reasoning (from contract) ── */}
        {reasoning && (
          <div>
            <div className="text-[10px] font-mono tracking-[0.15em] text-white/25 mb-2 uppercase flex items-center gap-2">
              AI Reasoning
              <span className="text-[8px] font-mono text-cyan-400/30 px-1.5 py-0.5 rounded border border-cyan-400/10 bg-cyan-400/5">FROM CONTRACT</span>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-black/30 p-4">
              <p className="text-xs font-mono text-white/40 leading-relaxed whitespace-pre-wrap">
                {reasoning}
              </p>
            </div>
          </div>
        )}

        {/* ── Similar sources (from contract) ── */}
        {similar_sources && similar_sources.length > 0 && (
          <div>
            <div className="text-[10px] font-mono tracking-[0.15em] text-white/25 mb-2 uppercase flex items-center gap-2">
              Similar Sources
              <span className="text-[8px] font-mono text-cyan-400/30 px-1.5 py-0.5 rounded border border-cyan-400/10 bg-cyan-400/5">FROM CONTRACT</span>
            </div>
            <div className="space-y-1.5">
              {similar_sources.map((src, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-black/20">
                  <span className="text-[10px] font-mono text-red-400/50 mt-0.5">●</span>
                  <span className="text-[11px] font-mono text-white/30">{src}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Appeal button ── */}
        {!is_original && onAppeal && key && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] font-mono text-white/15 mb-3">
              If you believe this judgment is incorrect, you can request a re-judgment by the AI validators.
              The appeal result will also be the contract's authoritative judgment.
            </p>
            <button
              onClick={() => onAppeal(key)}
              disabled={isAppealing}
              className="w-full py-2.5 rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/5 text-fuchsia-400/60 font-mono text-xs tracking-wider hover:bg-fuchsia-400/10 hover:text-fuchsia-400/80 transition-all disabled:opacity-30"
            >
              {isAppealing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AWAITING CONTRACT RE-JUDGMENT...
                </span>
              ) : (
                '↻ APPEAL FOR RE-JUDGMENT (ON-CHAIN)'
              )}
            </button>
          </div>
        )}

        {/* ── Transaction proof ── */}
        {txHash && (
          <div className="flex items-center justify-between text-[10px] font-mono text-white/15 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-3">
              {key && <span>KEY: #{key}</span>}
              <span>Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
            </div>
            <a
              href={getExplorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400/40 hover:text-cyan-400/70 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              VERIFY ON EXPLORER →
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
