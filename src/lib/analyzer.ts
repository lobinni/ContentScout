/**
 * ContentScout — Content Originality Analyzer
 * 
 * Scoring Criteria (0-100):
 * ─────────────────────────────────────────────
 * PASS (≥40): Content shows sufficient originality
 * REJECT (<40): Content appears unoriginal / AI-generated / plagiarized
 * 
 * 4 Metrics, each 0-100:
 * 
 * 1. UNIQUENESS (35%) — AI-Generated Content Detection
 *    - Detects known AI output patterns (ChatGPT, Claude, Gemini, etc.)
 *    - Checks for overused filler phrases and hedging language
 *    - Measures pattern density relative to content length
 * 
 * 2. VOCABULARY (25%) — Lexical Richness Analysis
 *    - Type-Token Ratio (TTR): unique words / total words
 *    - Hapax Legomena Ratio: words appearing exactly once
 *    - Vocabulary Sophistication: average word length + rare words
 * 
 * 3. STRUCTURE (20%) — Writing Pattern Analysis
 *    - Sentence length variance (natural writing is uneven)
 *    - Paragraph organization
 *    - Transition diversity (not repeating same connectors)
 *    - Punctuation variety
 * 
 * 4. CREATIVITY (20%) — Original Voice Detection
 *    - Personal voice markers (I/my/we + opinions)
 *    - Specific evidence (numbers, names, dates, citations)
 *    - Rhetorical devices (questions, exclamations, metaphors)
 *    - Unique phrasing (uncommon word combinations)
 * 
 * Threshold: score ≥ 40 = PASS, score < 40 = REJECT
 */

import { AnalysisResult } from '../types';

export const PLAGIARISM_THRESHOLD = 40;

// ═══════════════════════════════════════════════════════════
// 1. UNIQUENESS — AI Pattern Detection
// ═══════════════════════════════════════════════════════════

// Categorized AI-generated content indicators
const AI_PATTERNS = {
  // ChatGPT / generic LLM filler phrases (high confidence)
  high_confidence: [
    'it is important to note that',
    'it is worth noting that',
    'it\'s important to understand',
    'in today\'s rapidly evolving',
    'in today\'s fast-paced world',
    'in today\'s digital age',
    'in this day and age',
    'it goes without saying',
    'as we all know',
    'needless to say',
    'at the end of the day',
    'when it comes to',
    'in the realm of',
    'in the world of',
    'plays a crucial role',
    'is a testament to',
    'serves as a reminder',
    'it cannot be overstated',
    'it should be noted',
    'one cannot simply',
  ],
  // Overused transitional/academic filler (medium confidence)
  medium_confidence: [
    'furthermore',
    'moreover',
    'additionally',
    'consequently',
    'nevertheless',
    'notwithstanding',
    'in conclusion',
    'to summarize',
    'in summary',
    'overall',
    'ultimately',
    'essentially',
    'fundamentally',
    'significantly',
    'substantially',
    'comprehensive',
    'multifaceted',
  ],
  // Buzzword / marketing AI language
  buzzwords: [
    'leverage',
    'utilize',
    'facilitate',
    'optimize',
    'streamline',
    'paradigm',
    'synergy',
    'holistic',
    'robust',
    'scalable',
    'cutting-edge',
    'game-changer',
    'game changer',
    'groundbreaking',
    'revolutionary',
    'unprecedented',
    'transformative',
    'innovative',
    'state-of-the-art',
    'next-generation',
    'best-in-class',
    'world-class',
    'take it to the next level',
    'think outside the box',
    'at the forefront',
    'harness the power',
    'unlock the potential',
    'deep dive',
    'deep-dive',
    'delve into',
    'delve deeper',
    'dive into',
    'explore the',
    'landscape of',
    'ecosystem',
    'empower',
    'elevate',
    'reimagine',
    'spearhead',
  ],
  // Structural patterns typical of AI
  structural: [
    'let\'s explore',
    'let\'s dive',
    'let\'s take a look',
    'let\'s break it down',
    'let\'s examine',
    'here are some',
    'here are the',
    'there are several',
    'there are many',
    'there are numerous',
    'first and foremost',
    'last but not least',
    'without further ado',
    'having said that',
    'that being said',
    'with that in mind',
    'on the other hand',
    'by the same token',
  ],
};

function measureUniqueness(text: string): { score: number; details: string[] } {
  const lower = text.toLowerCase();
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const details: string[] = [];

  if (wordCount < 10) return { score: 50, details: ['Content too short for reliable analysis'] };

  let totalPenalty = 0;

  // High confidence AI phrases: -6 each
  let highCount = 0;
  for (const phrase of AI_PATTERNS.high_confidence) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (lower.match(regex) || []).length;
    if (matches > 0) {
      highCount += matches;
      totalPenalty += matches * 6;
    }
  }

  // Medium confidence: -3 each
  let medCount = 0;
  for (const phrase of AI_PATTERNS.medium_confidence) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    const matches = (lower.match(regex) || []).length;
    if (matches > 0) {
      medCount += matches;
      totalPenalty += matches * 3;
    }
  }

  // Buzzwords: -2 each
  let buzzCount = 0;
  for (const phrase of AI_PATTERNS.buzzwords) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = (lower.match(regex) || []).length;
    if (matches > 0) {
      buzzCount += matches;
      totalPenalty += matches * 2;
    }
  }

  // Structural patterns: -4 each
  let structCount = 0;
  for (const phrase of AI_PATTERNS.structural) {
    if (lower.includes(phrase)) {
      structCount++;
      totalPenalty += 4;
    }
  }

  // Normalize penalty by content length (longer content gets more leeway)
  const lengthFactor = Math.max(1, wordCount / 150);
  const adjustedPenalty = totalPenalty / lengthFactor;

  // Build detail messages
  if (highCount > 0) details.push(`${highCount} high-confidence AI phrase(s) detected`);
  if (medCount > 0) details.push(`${medCount} overused filler word(s) found`);
  if (buzzCount > 0) details.push(`${buzzCount} buzzword/marketing term(s) detected`);
  if (structCount > 0) details.push(`${structCount} typical AI structural pattern(s) found`);

  const totalFound = highCount + medCount + buzzCount + structCount;
  if (totalFound === 0) details.push('No common AI-generated patterns detected');

  const score = Math.max(0, Math.min(100, Math.round(100 - adjustedPenalty)));
  return { score, details };
}

// ═══════════════════════════════════════════════════════════
// 2. VOCABULARY — Lexical Richness
// ═══════════════════════════════════════════════════════════

function measureVocabulary(text: string): { score: number; details: string[] } {
  const words = text.toLowerCase().match(/\b[a-zA-ZÀ-ÿ]{2,}\b/g) || [];
  const details: string[] = [];

  if (words.length < 10) return { score: 50, details: ['Content too short for vocabulary analysis'] };

  // Type-Token Ratio (TTR): unique words / total words
  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  // Hapax legomena: words appearing exactly once
  const wordFreq = new Map<string, number>();
  for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  const hapax = [...wordFreq.values()].filter(v => v === 1).length;
  const hapaxRatio = hapax / words.length;

  // Average word length (sophistication indicator)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Long words ratio (words > 8 chars = more sophisticated)
  const longWords = words.filter(w => w.length > 8).length;
  const longWordRatio = longWords / words.length;

  // Scoring components
  // TTR: ideal range 0.4-0.8 for natural text
  // Short texts naturally have higher TTR, long texts lower
  const adjustedTTR = ttr * Math.min(1.3, 1 + (100 - words.length) / 500);
  const ttrScore = Math.min(40, Math.round(adjustedTTR * 55));

  // Hapax: higher = more diverse vocabulary
  const hapaxScore = Math.min(25, Math.round(hapaxRatio * 50));

  // Word sophistication
  const sophScore = Math.min(20, Math.round((avgWordLength - 3) * 5 + longWordRatio * 40));

  // Repetition penalty: most repeated non-common word
  const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you',
    'your', 'he', 'she', 'his', 'her', 'my', 'me', 'us', 'if', 'then', 'than', 'when', 'where',
    'which', 'who', 'what', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
    'any', 'no', 'about', 'up', 'out', 'just', 'also', 'very', 'often', 'however', 'too',
    'even', 'because', 'between', 'such', 'while', 'although', 'since']);
  const contentWords = [...wordFreq.entries()].filter(([w]) => !commonWords.has(w));
  const maxRepeat = contentWords.length > 0 ? Math.max(...contentWords.map(([, c]) => c)) : 1;
  const repeatPenalty = Math.max(0, (maxRepeat - 3) * 3);

  // Build detail messages
  details.push(`Type-Token Ratio: ${(ttr * 100).toFixed(1)}% (${uniqueWords.size} unique / ${words.length} total)`);
  details.push(`Hapax legomena: ${hapax} words appear only once (${(hapaxRatio * 100).toFixed(1)}%)`);
  details.push(`Avg word length: ${avgWordLength.toFixed(1)} chars, ${longWords} sophisticated words`);
  if (maxRepeat > 3) details.push(`Warning: a content word repeated ${maxRepeat} times`);

  const score = Math.max(0, Math.min(100, ttrScore + hapaxScore + sophScore + 15 - repeatPenalty));
  return { score, details };
}

// ═══════════════════════════════════════════════════════════
// 3. STRUCTURE — Writing Pattern Analysis
// ═══════════════════════════════════════════════════════════

function measureStructure(text: string): { score: number; details: string[] } {
  const details: string[] = [];

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3);
  if (sentences.length < 2) return { score: 40, details: ['Only 1 sentence — cannot measure structure'] };

  // Sentence length variance
  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avgLen, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgLen > 0 ? stdDev / avgLen : 0; // Coefficient of variation

  // Natural writing: CV typically 0.3-0.7
  // AI-generated: CV typically 0.1-0.3 (very uniform)
  const varianceScore = Math.min(30, Math.round(cv * 50));

  // Sentence length distribution — check for variety
  const shortSentences = lengths.filter(l => l <= 8).length;
  const mediumSentences = lengths.filter(l => l > 8 && l <= 20).length;
  const longSentences = lengths.filter(l => l > 20).length;
  const hasVariety = shortSentences > 0 && mediumSentences > 0;
  const varietyScore = hasVariety ? 15 : (longSentences === sentences.length ? 0 : 8);

  // Paragraph organization
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  const paraScore = Math.min(15, paragraphs.length >= 2 ? 10 + Math.min(5, paragraphs.length) : 5);

  // Transition word diversity
  const transitionWords = ['however', 'therefore', 'meanwhile', 'instead', 'although',
    'because', 'since', 'while', 'whereas', 'despite', 'yet', 'still', 'thus',
    'hence', 'likewise', 'similarly', 'conversely', 'nonetheless', 'regardless'];
  const lower = text.toLowerCase();
  const usedTransitions = transitionWords.filter(t => lower.includes(t));
  const transitionScore = Math.min(15, usedTransitions.length * 3);

  // Punctuation variety
  const hasCommas = text.includes(',');
  const hasSemicolons = text.includes(';');
  const hasColons = text.includes(':');
  const hasDashes = text.includes('—') || text.includes('–') || text.includes(' - ');
  const hasParens = text.includes('(');
  const punctVariety = [hasCommas, hasSemicolons, hasColons, hasDashes, hasParens].filter(Boolean).length;
  const punctScore = Math.min(15, punctVariety * 4);

  // Opening sentence check — does it start with a cliché?
  const opener = sentences[0]?.toLowerCase() || '';
  const clicheOpeners = ['in today', 'in the world', 'in this article', 'in this essay',
    'have you ever', 'did you know', 'when it comes'];
  const hasClicheOpener = clicheOpeners.some(c => opener.startsWith(c));
  const openerPenalty = hasClicheOpener ? 8 : 0;

  // Detail messages
  details.push(`${sentences.length} sentences, avg ${avgLen.toFixed(1)} words (CV: ${cv.toFixed(2)})`);
  details.push(`Length mix: ${shortSentences} short, ${mediumSentences} medium, ${longSentences} long`);
  details.push(`${paragraphs.length} paragraph(s), ${usedTransitions.length} transition types, ${punctVariety} punctuation types`);
  if (hasClicheOpener) details.push('Starts with a cliché opening pattern');
  if (cv < 0.2) details.push('Very uniform sentence lengths (typical of AI output)');

  const score = Math.max(0, Math.min(100,
    varianceScore + varietyScore + paraScore + transitionScore + punctScore + 10 - openerPenalty
  ));
  return { score, details };
}

// ═══════════════════════════════════════════════════════════
// 4. CREATIVITY — Original Voice Detection
// ═══════════════════════════════════════════════════════════

function measureCreativity(text: string): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  // A) Personal voice markers (max 20)
  const personalPronouns = (text.match(/\b(I|my|me|mine|myself)\b/g) || []).length;
  const collectivePronouns = (text.match(/\b(we|our|us|ourselves)\b/gi) || []).length;
  const opinionMarkers = (text.match(/\b(I think|I believe|in my opinion|I feel|I argue|my view|from my experience|personally)\b/gi) || []).length;
  const voiceScore = Math.min(20,
    Math.min(8, personalPronouns * 2) +
    Math.min(4, collectivePronouns) +
    Math.min(8, opinionMarkers * 4)
  );
  score += voiceScore;
  if (voiceScore >= 12) details.push('Strong personal voice detected');
  else if (voiceScore >= 6) details.push('Some personal voice markers present');
  else details.push('Lacks personal voice — reads as impersonal/generic');

  // B) Specific evidence: numbers, names, dates, citations (max 25)
  const specificNumbers = (text.match(/\b\d{2,}\b/g) || []).length; // Numbers with 2+ digits
  const percentages = (text.match(/\d+%/g) || []).length;
  const years = (text.match(/\b(19|20)\d{2}\b/g) || []).length;
  const properNouns = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(w =>
    !['The', 'This', 'That', 'These', 'Those', 'There', 'When', 'Where', 'What',
      'How', 'Why', 'Who', 'Which', 'Some', 'Many', 'Most', 'All', 'Each',
      'Every', 'Any', 'But', 'And', 'For', 'Not', 'Yet', 'Also', 'However',
      'Moreover', 'Furthermore', 'Additionally', 'Here', 'After', 'Before'].includes(w)
  ).length;
  const citations = (text.match(/\([^)]*\d{4}[^)]*\)/g) || []).length; // (Author, 2024)
  const urls = (text.match(/https?:\/\/\S+/g) || []).length;

  const evidenceScore = Math.min(25,
    Math.min(6, specificNumbers * 2) +
    Math.min(4, percentages * 2) +
    Math.min(4, years * 2) +
    Math.min(6, properNouns) +
    Math.min(5, (citations + urls) * 3)
  );
  score += evidenceScore;
  if (evidenceScore >= 15) details.push(`Rich specific evidence: ${specificNumbers} numbers, ${properNouns} proper nouns, ${years} dates`);
  else if (evidenceScore >= 5) details.push('Some specific evidence provided');
  else details.push('No specific data, names, or citations found — content is generic');

  // C) Rhetorical engagement (max 20)
  const questions = (text.match(/\?/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  const directAddress = (text.match(/\b(you|your|you're|yourself)\b/gi) || []).length;
  const contrastWords = (text.match(/\b(but|however|yet|instead|although|despite|contrary|unlike|whereas)\b/gi) || []).length;

  const rhetoricalScore = Math.min(20,
    Math.min(8, questions * 3) +
    Math.min(4, exclamations * 2) +
    Math.min(4, Math.min(directAddress, 3) * 2) +
    Math.min(4, contrastWords * 2)
  );
  score += rhetoricalScore;
  if (rhetoricalScore >= 12) details.push('Engaging rhetorical style with questions and contrast');
  else if (rhetoricalScore >= 6) details.push('Moderate rhetorical engagement');
  else details.push('Flat tone — no questions, contrast, or reader engagement');

  // D) Unique phrasing — uncommon word combinations (max 20)
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  // Check for unusual bigrams (two-word combinations)
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  const bigramRatio = words.length > 2 ? bigrams.size / (words.length - 1) : 0;

  // Check for words with 10+ characters (domain-specific vocabulary)
  const specializedWords = words.filter(w => w.length >= 10);
  const uniqueSpecialized = new Set(specializedWords).size;

  const phrasingScore = Math.min(20,
    Math.round(bigramRatio * 15) +
    Math.min(8, uniqueSpecialized * 2)
  );
  score += phrasingScore;
  if (uniqueSpecialized > 3) details.push(`${uniqueSpecialized} specialized/domain terms used`);

  // E) Bonus: explicit disclaimer/attribution (max 15)
  const hasDisclaimer = /\b(according to|source:|cited from|reference|credit|attribution)\b/i.test(text);
  const hasQuotes = (text.match(/[""][^""]+[""]/g) || []).length;
  const attributionBonus = Math.min(15,
    (hasDisclaimer ? 5 : 0) +
    Math.min(10, hasQuotes * 3)
  );
  score += attributionBonus;
  if (hasQuotes > 0) details.push(`${hasQuotes} direct quote(s) with attribution`);

  return { score: Math.min(100, score), details };
}

// ═══════════════════════════════════════════════════════════
// REASONING GENERATOR — Transparent explanation
// ═══════════════════════════════════════════════════════════

interface MetricResult {
  score: number;
  details: string[];
}

function generateReasoning(
  finalScore: number,
  contentType: string,
  uniqueness: MetricResult,
  vocabulary: MetricResult,
  structure: MetricResult,
  creativity: MetricResult,
): string {
  const lines: string[] = [];

  // Verdict
  if (finalScore >= 70) {
    lines.push(`[PASS] This ${contentType} demonstrates strong originality.`);
  } else if (finalScore >= PLAGIARISM_THRESHOLD) {
    lines.push(`[PASS] This ${contentType} appears original with some common patterns.`);
  } else {
    lines.push(`[REJECT] This ${contentType} shows significant signs of unoriginal or AI-generated content.`);
  }

  // Append key detail from each metric
  const addMetric = (name: string, r: MetricResult) => {
    const primary = r.details[0] || '';
    if (primary) lines.push(`${name}: ${primary}`);
  };

  addMetric('Uniqueness', uniqueness);
  addMetric('Vocabulary', vocabulary);
  addMetric('Structure', structure);
  addMetric('Voice', creativity);

  // Actionable advice for low scores
  if (finalScore < PLAGIARISM_THRESHOLD) {
    lines.push('Tip: Add personal experiences, specific data, and vary your sentence structure to improve originality.');
  }

  return lines.join(' ');
}

// ═══════════════════════════════════════════════════════════
// SIMILAR SOURCES — Content-based similarity hints
// ═══════════════════════════════════════════════════════════

function detectSimilarSources(text: string, score: number): string[] {
  if (score >= 70) return [];

  const lower = text.toLowerCase();
  const sources: string[] = [];

  // Match content to likely source domains based on topic detection
  const topicMap: [RegExp, string][] = [
    [/\b(machine learning|neural network|deep learning|AI|artificial intelligence|NLP)\b/i,
      'arxiv.org/cs.AI — Similar AI/ML papers exist on this topic'],
    [/\b(react|javascript|typescript|python|java|code|programming|developer|api|framework)\b/i,
      'stackoverflow.com — Common programming Q&A content detected'],
    [/\b(blockchain|crypto|web3|decentralized|smart contract|token)\b/i,
      'medium.com — Many similar blockchain articles published'],
    [/\b(startup|business|marketing|growth|revenue|customer|product)\b/i,
      'hbr.org — Overlaps with common business writing patterns'],
    [/\b(health|medical|disease|treatment|clinical|patient)\b/i,
      'pubmed.ncbi.nlm.nih.gov — Medical content requires proper citation'],
    [/\b(climate|environment|sustainability|carbon|renewable)\b/i,
      'nature.com — Environmental claims should reference studies'],
    [/\b(history|century|war|ancient|civilization|empire)\b/i,
      'wikipedia.org — Historical facts commonly sourced from encyclopedias'],
  ];

  for (const [pattern, source] of topicMap) {
    if (pattern.test(lower) && sources.length < 3) {
      sources.push(source);
    }
  }

  // Generic warning for very low scores
  if (score < 25 && sources.length === 0) {
    sources.push('Content closely matches common AI-generated text patterns');
  }

  return sources;
}

// ═══════════════════════════════════════════════════════════
// MAIN — Public Analysis Function
// ═══════════════════════════════════════════════════════════

export function analyzeOriginality(
  content: string,
  contentType: string,
  sourceUrl: string
): AnalysisResult {
  // Run each metric
  const uniqueness = measureUniqueness(content);
  const vocabulary = measureVocabulary(content);
  const structure = measureStructure(content);
  const creativity = measureCreativity(content);

  // Weighted final score
  const weights = { uniqueness: 0.35, vocabulary: 0.25, structure: 0.20, creativity: 0.20 };
  let originality_score = Math.round(
    uniqueness.score * weights.uniqueness +
    vocabulary.score * weights.vocabulary +
    structure.score * weights.structure +
    creativity.score * weights.creativity
  );

  // Bonus: providing source URL shows attribution intent (+3)
  if (sourceUrl && sourceUrl.trim().length > 0) {
    originality_score = Math.min(100, originality_score + 3);
  }

  // Penalty: very short content is unreliable (-8)
  const wordCount = (content.match(/\b\w+\b/g) || []).length;
  if (wordCount < 30) {
    originality_score = Math.max(0, originality_score - 8);
  }

  originality_score = Math.max(0, Math.min(100, originality_score));

  const is_original = originality_score >= PLAGIARISM_THRESHOLD;
  const reasoning = generateReasoning(originality_score, contentType, uniqueness, vocabulary, structure, creativity);
  const similar_sources = detectSimilarSources(content, originality_score);

  return {
    originality_score,
    is_original,
    reasoning,
    similar_sources,
    metrics: {
      uniqueness: uniqueness.score,
      vocabulary: vocabulary.score,
      structure: structure.score,
      creativity: creativity.score,
    },
  };
}
