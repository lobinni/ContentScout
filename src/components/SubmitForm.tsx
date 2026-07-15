import { useState } from 'react';
import { motion } from 'framer-motion';

const CONTENT_TYPES = [
  { value: 'article', label: 'Article', icon: '📰' },
  { value: 'essay', label: 'Essay', icon: '📝' },
  { value: 'code', label: 'Code', icon: '💻' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'research', label: 'Research', icon: '🔬' },
];

interface SubmitFormProps {
  onSubmit: (content: string, contentType: string, sourceUrl: string) => void;
  isSubmitting: boolean;
  disabled: boolean;
}

export default function SubmitForm({ onSubmit, isSubmitting, disabled }: SubmitFormProps) {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('article');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 4000) {
      setContent(val);
      setCharCount(val.length);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || content.trim().length < 50 || isSubmitting || disabled) return;
    onSubmit(content, contentType, sourceUrl);
  };

  const canSubmit = content.trim().length >= 50 && !isSubmitting && !disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">SUBMIT_CONTENT</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/15">MAX 4000 CHARS</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50 pulse-dot"></div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Content type selector */}
        <div>
          <label className="block text-[10px] font-mono tracking-[0.15em] text-white/30 mb-2 uppercase">
            Content Type
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setContentType(type.value)}
                disabled={isSubmitting}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200 ${
                  contentType === type.value
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400'
                    : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/10 hover:text-white/50'
                }`}
              >
                <span className="mr-1.5">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono tracking-[0.15em] text-white/30 uppercase">
              Content Body
            </label>
            {isFocused && (
              <span className="text-[9px] font-mono text-cyan-400/50 animate-pulse">INPUT ACTIVE</span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={content}
              onChange={handleContentChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isSubmitting}
              placeholder="Paste the content you want to analyze for originality... (minimum 50 characters)"
              className="w-full h-40 px-4 py-3 rounded-lg border border-white/[0.06] bg-black/40 text-sm text-white/80 placeholder-white/10 font-mono resize-none focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/10 transition-all duration-300 disabled:opacity-50 custom-scrollbar"
            />
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-white/15">
              {charCount}/4000
            </div>
          </div>
          {content.trim().length > 0 && content.trim().length < 50 && (
            <p className="text-[10px] font-mono text-yellow-400/50 mt-1">
              ⚠ {50 - content.trim().length} more characters needed
            </p>
          )}
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-[10px] font-mono tracking-[0.15em] text-white/30 mb-2 uppercase">
            Source URL (optional)
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            disabled={isSubmitting}
            placeholder="https://example.com/your-article"
            className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-black/40 text-sm text-white/80 placeholder-white/10 font-mono focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/10 transition-all duration-300 disabled:opacity-50"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-mono text-sm tracking-wider transition-all duration-300 ${
            canSubmit
              ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 hover:from-cyan-500/30 hover:to-fuchsia-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,255,200,0.1)]'
              : 'border border-white/[0.04] bg-white/[0.01] text-white/15 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              PROCESSING...
            </span>
          ) : (
            'SUBMIT FOR AI ANALYSIS'
          )}
        </button>

        <p className="text-[9px] font-mono text-white/10 text-center">
          Results are determined by on-chain AI consensus on GenLayer Studio. Contract judgment is authoritative (fail-closed).
        </p>
      </div>
    </motion.div>
  );
}
