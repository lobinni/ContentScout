import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface SubmitFormProps {
  onSubmit: (content: string, contentType: string, sourceUrl: string) => Promise<void>;
  isSubmitting: boolean;
  walletConnected: boolean;
}

const contentTypes = [
  { value: 'article', label: 'ARTICLE' },
  { value: 'essay', label: 'ESSAY' },
  { value: 'code', label: 'CODE' },
  { value: 'creative', label: 'CREATIVE' },
  { value: 'research', label: 'RESEARCH' },
];

export default function SubmitForm({ onSubmit, isSubmitting, walletConnected }: SubmitFormProps) {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('article');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return toast.error('Content cannot be empty');
    if (content.length < 50) return toast.error('Minimum 50 characters required');
    if (!walletConnected) return toast.error('Connect wallet first');

    toast.promise(onSubmit(content, contentType, sourceUrl), {
      loading: '⏳ Running validator consensus...',
      success: '✓ Analysis finalized',
      error: '✗ Transaction failed',
    });
  };

  const charCount = content.length;
  const maxChars = 4000;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charPct = (charCount / maxChars) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
        </div>
        <span className="text-[10px] font-mono text-white/25 tracking-wider">
          CONTENT_SCOUT.tsx
        </span>
        <div className="text-[10px] font-mono text-white/20">
          {walletConnected ? (
            <span className="text-cyan-400/60">● WALLET LINKED</span>
          ) : (
            <span className="text-red-400/60">○ NO WALLET</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Content type selector */}
        <div>
          <label className="block text-[10px] font-mono tracking-[0.2em] text-white/30 mb-2">
            CONTENT_TYPE
          </label>
          <div className="flex flex-wrap gap-1.5">
            {contentTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setContentType(type.value)}
                className={`px-3 py-1 rounded text-[11px] font-mono tracking-wider transition-all duration-200 ${
                  contentType === type.value
                    ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30'
                    : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50 hover:border-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono tracking-[0.2em] text-white/30">
              CONTENT_BODY
            </label>
            {isFocused && (
              <span className="text-[10px] font-mono text-cyan-400/50 animate-pulse">
                INPUT ACTIVE
              </span>
            )}
          </div>
          <div className={`relative rounded-lg border transition-all duration-300 ${
            isFocused ? 'border-cyan-400/30 shadow-[0_0_20px_rgba(0,255,200,0.05)]' : 'border-white/[0.06]'
          }`}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="// Paste content for ContentScout analysis..."
              rows={6}
              disabled={isSubmitting}
              className="w-full bg-transparent rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/15 font-mono focus:outline-none resize-none disabled:opacity-40"
            />
            {/* Character progress bar */}
            <div className="mx-4 mb-3 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  charPct > 90 ? 'bg-red-400' : charPct > 70 ? 'bg-yellow-400' : 'bg-cyan-400/50'
                }`}
                style={{ width: `${charPct}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-mono text-white/20">
            <span>{charCount.toLocaleString()} / {maxChars.toLocaleString()} chars</span>
            <span>{wordCount} words</span>
          </div>
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-[10px] font-mono tracking-[0.2em] text-white/30 mb-2">
            SOURCE_URL <span className="text-white/15">// optional</span>
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            disabled={isSubmitting}
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white/80 placeholder-white/15 font-mono focus:outline-none focus:border-cyan-400/30 transition-all disabled:opacity-40"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!content.trim() || content.length < 50 || isSubmitting}
          className="relative w-full group overflow-hidden rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {/* Animated gradient border */}
          <div className={`absolute inset-0 rounded-lg ${
            isSubmitting
              ? 'bg-white/10'
              : 'bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40 bg-[length:200%_100%] animate-[gradient-shift_3s_linear_infinite]'
          }`}></div>
          <div className="absolute inset-[1px] rounded-[7px] bg-[#0a0a0f]"></div>

          <div className="relative flex items-center justify-center gap-2 py-3 text-sm font-mono tracking-wider">
            {isSubmitting ? (
              <>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-white/40">CONSENSUS IN PROGRESS</span>
              </>
            ) : (
              <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors">
                ▶ EXECUTE ANALYSIS
              </span>
            )}
          </div>
        </button>

        {!walletConnected && (
          <div className="flex items-center gap-2 justify-center py-1">
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-[10px] font-mono text-yellow-400/60 tracking-wider">
              WALLET CONNECTION REQUIRED
            </span>
          </div>
        )}
      </form>
    </motion.div>
  );
}
