/**
 * Input Intake — Parses multi-format input into structured context
 * 
 * Supported: plain text, URLs, file paths (images, PDFs, markdown)
 * This is the first stage of every convoy: raw input → structured context
 */

// ── Types ────────────────────────────────────────────────────────────

export type InputType = 'text' | 'url' | 'image' | 'pdf' | 'markdown' | 'figma-url' | 'linear-url' | 'unknown';

export interface ParsedInput {
  type: InputType;
  raw: string;
  extracted: {
    text?: string;
    urls?: string[];
    figmaFileIds?: string[];
    linearIssueIds?: string[];
    filePaths?: string[];
  };
  metadata: {
    wordCount: number;
    hasActionItems: boolean;
    detectedDomain?: string;
    timestamp: string;
  };
}

// ── URL Pattern Detection ────────────────────────────────────────────

const FIGMA_URL = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/g;
const LINEAR_URL = /https?:\/\/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/g;
const GENERIC_URL = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

// ── Main Parser ──────────────────────────────────────────────────────

export function parseInput(raw: string): ParsedInput {
  const extracted: ParsedInput['extracted'] = {};

  // Extract Figma file IDs
  const figmaMatches = [...raw.matchAll(FIGMA_URL)];
  if (figmaMatches.length > 0) {
    extracted.figmaFileIds = figmaMatches.map(m => m[1]);
  }

  // Extract Linear issue IDs
  const linearMatches = [...raw.matchAll(LINEAR_URL)];
  if (linearMatches.length > 0) {
    extracted.linearIssueIds = linearMatches.map(m => m[1]);
  }

  // Extract all URLs
  const urlMatches = [...raw.matchAll(GENERIC_URL)];
  if (urlMatches.length > 0) {
    extracted.urls = urlMatches.map(m => m[0]);
  }

  // Plain text (strip URLs for clean text)
  extracted.text = raw.replace(GENERIC_URL, '').trim();

  // Detect input type
  const type = detectType(raw, extracted);

  // Check for action items
  const hasActionItems = /(?:todo|action|task|- \[ \]|next step)/i.test(raw);

  return {
    type,
    raw,
    extracted,
    metadata: {
      wordCount: raw.split(/\s+/).length,
      hasActionItems,
      detectedDomain: detectDomain(raw),
      timestamp: new Date().toISOString(),
    },
  };
}

// ── Type Detection ───────────────────────────────────────────────────

function detectType(raw: string, extracted: ParsedInput['extracted']): InputType {
  if (extracted.figmaFileIds?.length) return 'figma-url';
  if (extracted.linearIssueIds?.length) return 'linear-url';
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(raw.trim())) return 'image';
  if (/\.pdf$/i.test(raw.trim())) return 'pdf';
  if (/\.md$/i.test(raw.trim())) return 'markdown';
  if (extracted.urls?.length) return 'url';
  if (raw.trim().length > 0) return 'text';
  return 'unknown';
}

// ── Domain Detection ─────────────────────────────────────────────────

function detectDomain(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  if (lower.includes('rainmaker') || lower.includes('blue tees') || lower.includes('golf')) return 'blue-tees';
  if (lower.includes('portfolio') || lower.includes('case study') || lower.includes('framer')) return 'portfolio';
  if (lower.includes('design system') || lower.includes('token') || lower.includes('component library')) return 'design-system';
  if (lower.includes('ble') || lower.includes('bluetooth') || lower.includes('npd')) return 'npd-ble';
  return undefined;
}
