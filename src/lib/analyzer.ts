/**
 * ContentScout — Originality Analyzer
 * 
 * Simulates the AI consensus judgment that runs in the GenLayer contract.
 * Real contract uses gl.nondet.exec_prompt with response_format="json"
 * 
 * PLAGIARISM_THRESHOLD = 40 — scores >= 40 are considered original.
 */

import { AnalysisResult } from '../types';

// Plagiarism threshold (same as contract)
export const PLAGIARISM_THRESHOLD = 40;

// Common phrases that might indicate AI-generated content
const COMMON_AI_PHRASES = [
  'it is important to note',
  'in conclusion',
  'furthermore',
  'moreover',
  'in today\'s world',
  'it goes without saying',
  'as we all know',
  'at the end of the day',
  'needless to say',
  'in this day and age',
  'delve into',
  'dive into',
  'explore the',
  'landscape of',
  'in the realm of',
  'leverage',
  'utilize',
  'facilitate',
  'paradigm',
  'synergy',
  'cutting-edge',
  'game-changer',
  'take it to the next level',
  'think outside the box',
  'at the forefront',
  'harness the power',
  'unlock the potential',
];

const PLACEHOLDER_SOURCES = [
  'wikipedia.org/wiki/similar-topic',
  'medium.com/@author/related-article',
  'dev.to/user/similar-post',
  'arxiv.org/abs/2024.xxxxx',
  'stackoverflow.com/questions/xxxxxxx',
  'github.com/user/similar-project',
];

function calculateVocabularyRichness(text: string): number {
  const words = text.toLowerCase().match(/\b[a-zA-Z]{3,}\b/g) || [];
  if (words.length === 0) return 0;
  
  const uniqueWords = new Set(words).size;
  const ratio = uniqueWords / words.length;
  
  // Longer texts naturally have lower ratios, so adjust
  const lengthFactor = Math.min(1, words.length / 100);
  const adjustedRatio = ratio + (1 - ratio) * (1 - lengthFactor) * 0.3;
  
  return Math.min(100, Math.round(adjustedRatio * 120));
}

function detectAIPhrases(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  for (const phrase of COMMON_AI_PHRASES) {
    if (lowerText.includes(phrase)) {
      count++;
    }
  }
  
  // More AI phrases = lower score
  return Math.max(0, 100 - (count * 12));
}

function analyzeStructure(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 50;
  
  const lengths = sentences.map(s => s.trim().length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  
  // Calculate variance - natural writing has varied sentence lengths
  const variance = lengths.reduce((acc, len) => 
    acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  
  // Higher standard deviation = more natural
  const variationScore = Math.min(100, 30 + stdDev * 1.5);
  
  // Also check for paragraph breaks
  const paragraphs = text.split(/\n\n+/).length;
  const paragraphBonus = Math.min(20, paragraphs * 5);
  
  return Math.min(100, Math.round(variationScore + paragraphBonus));
}

function calculateCreativity(text: string): number {
  let score = 40;
  
  // Questions show engagement
  const questions = (text.match(/\?/g) || []).length;
  score += Math.min(15, questions * 5);
  
  // Exclamations show enthusiasm
  const exclamations = (text.match(/!/g) || []).length;
  score += Math.min(10, exclamations * 3);
  
  // Personal pronouns suggest original voice
  const personalPronouns = (text.match(/\b(I|my|me|we|our|us)\b/gi) || []).length;
  score += Math.min(15, personalPronouns * 2);
  
  // Specific numbers suggest research/originality
  const numbers = (text.match(/\d+/g) || []).length;
  score += Math.min(10, numbers * 2);
  
  // Quotes suggest attribution
  const quotes = (text.match(/["']/g) || []).length;
  score += Math.min(10, Math.floor(quotes / 2) * 3);
  
  // Unique words (not common)
  const uncommonPatterns = (text.match(/\b\w{10,}\b/g) || []).length;
  score += Math.min(10, uncommonPatterns * 2);
  
  return Math.min(100, score);
}

function generateReasoning(
  score: number, 
  metrics: AnalysisResult['metrics'], 
  contentType: string
): string {
  const reasons: string[] = [];
  
  // Overall assessment
  if (score >= 70) {
    reasons.push(`This ${contentType} demonstrates strong originality with a distinctive voice.`);
  } else if (score >= PLAGIARISM_THRESHOLD) {
    reasons.push(`This ${contentType} appears to be original content with some common patterns.`);
  } else {
    reasons.push(`This ${contentType} shows significant signs of being unoriginal or AI-generated without sufficient attribution.`);
  }
  
  // Specific metric feedback
  if (metrics.uniqueness >= 70) {
    reasons.push('Low similarity to common AI-generated patterns detected.');
  } else if (metrics.uniqueness < 40) {
    reasons.push('Contains multiple phrases commonly found in AI-generated content.');
  }
  
  if (metrics.vocabulary >= 70) {
    reasons.push('Demonstrates rich and varied vocabulary usage.');
  } else if (metrics.vocabulary < 40) {
    reasons.push('Limited vocabulary diversity may indicate templated content.');
  }
  
  if (metrics.structure >= 70) {
    reasons.push('Natural sentence structure variation indicates human authorship.');
  } else if (metrics.structure < 40) {
    reasons.push('Repetitive or formulaic sentence patterns detected.');
  }
  
  if (metrics.creativity >= 70) {
    reasons.push('Shows personal voice with creative elements and engagement.');
  } else if (metrics.creativity < 40) {
    reasons.push('Lacks distinctive personal voice or creative expression.');
  }
  
  return reasons.join(' ');
}

function generateSimilarSources(score: number): string[] {
  if (score >= 70) return [];
  
  const count = score < 30 ? 3 : score < PLAGIARISM_THRESHOLD ? 2 : 1;
  const shuffled = [...PLACEHOLDER_SOURCES].sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, count);
}

/**
 * Main analysis function
 * Simulates gl.nondet.exec_prompt with response_format="json"
 */
export function analyzeOriginality(
  content: string,
  contentType: string,
  sourceUrl: string
): AnalysisResult {
  // Calculate individual metrics
  const uniqueness = detectAIPhrases(content);
  const vocabulary = calculateVocabularyRichness(content);
  const structure = analyzeStructure(content);
  const creativity = calculateCreativity(content);
  
  // Weighted score calculation
  const weights = {
    uniqueness: 0.35,
    vocabulary: 0.25,
    structure: 0.20,
    creativity: 0.20,
  };
  
  let originality_score = Math.round(
    uniqueness * weights.uniqueness +
    vocabulary * weights.vocabulary +
    structure * weights.structure +
    creativity * weights.creativity
  );
  
  // Bonus for providing source URL (shows attribution intent)
  if (sourceUrl && sourceUrl.trim().length > 0) {
    originality_score = Math.min(100, originality_score + 5);
  }
  
  // Content length affects reliability
  if (content.length < 100) {
    originality_score = Math.max(0, originality_score - 10);
  }
  
  // Add small variance to simulate validator consensus variation
  const variance = Math.floor(Math.random() * 6) - 3;
  originality_score = Math.max(0, Math.min(100, originality_score + variance));
  
  const metrics = { uniqueness, vocabulary, structure, creativity };
  const is_original = originality_score >= PLAGIARISM_THRESHOLD;
  const reasoning = generateReasoning(originality_score, metrics, contentType);
  const similar_sources = generateSimilarSources(originality_score);
  
  return {
    originality_score,
    is_original,
    reasoning,
    similar_sources,
    metrics,
  };
}
