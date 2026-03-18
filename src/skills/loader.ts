/**
 * Skill Loader — Auto-discovers skills from skills/<name>/SKILL.md
 * 
 * WHY THIS EXISTS:
 * Instead of maintaining skill lists in 15 places (registry table, CLAUDE.md,
 * todo checklist, cross-skill docs, etc.), skills self-register.
 * Drop a folder with SKILL.md into skills/ → it's live.
 * 
 * TOKEN EFFICIENCY:
 * When Claude Code reads CLAUDE.md, it sees "scan skills/" not a 200-line table.
 * Adding 27 new skills = 27 folder drops, zero edits to any other file.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';

// ── Types ────────────────────────────────────────────────────────────

export interface SkillManifest {
  name: string;
  version?: string;
  description: string;
  triggers: string[];           // keywords that auto-activate this skill
  polecatAffinity: string[];    // which polecats this skill pairs with
  allowedTools?: string[];      // MCP tools this skill uses
  source?: string;              // origin: 'custom' | 'obra' | 'trailofbits' | 'thedotmack'
  path: string;                 // absolute path to SKILL.md
}

export interface SkillRegistry {
  skills: Map<string, SkillManifest>;
  lastScan: Date;
}

// ── YAML Frontmatter Parser (minimal, no dependency) ─────────────────

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, unknown> = {};

  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Strip quotes
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Handle multiline (>) — join with previous key
    if (value === '>' || value === '|') {
      // Multiline values are handled by collecting subsequent indented lines
      continue;
    }

    result[key] = value;
  }

  return result;
}

// ── Trigger Extraction ───────────────────────────────────────────────

function extractTriggers(description: string): string[] {
  // Pull trigger keywords from description text
  // Look for patterns like: "Triggers: x, y, z" or "Auto-activate for: x, y, z"
  const triggerMatch = description.match(/(?:triggers?|auto-activat\w+)[\s:]+(.+?)(?:\.|$)/i);
  if (triggerMatch) {
    return triggerMatch[1]
      .split(/[,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2);
  }

  // Fallback: extract quoted keywords
  const quoted = description.match(/"([^"]+)"/g);
  if (quoted) {
    return quoted.map(q => q.replace(/"/g, '').toLowerCase());
  }

  return [];
}

// ── Polecat Affinity Detection ───────────────────────────────────────

function detectPolecatAffinity(content: string, name: string): string[] {
  const affinities: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes('figma') || lower.includes('design system') || lower.includes('ui/ux'))
    affinities.push('figma-scout');
  if (lower.includes('spec') || lower.includes('handoff') || lower.includes('documentation'))
    affinities.push('spec-writer');
  if (lower.includes('email') || lower.includes('message') || lower.includes('comms') || lower.includes('humaniz'))
    affinities.push('comms-drafter');
  if (lower.includes('audit') || lower.includes('monitor') || lower.includes('sentinel') || lower.includes('security'))
    affinities.push('design-auditor');
  if (lower.includes('ticket') || lower.includes('linear') || lower.includes('issue'))
    affinities.push('linear-tracker');

  return affinities.length > 0 ? affinities : ['spec-writer']; // default fallback
}

// ── Main Scanner ─────────────────────────────────────────────────────

export async function scanSkills(skillsDir?: string): Promise<SkillRegistry> {
  const dir = skillsDir ?? resolve(process.cwd(), 'skills');
  const registry: SkillRegistry = {
    skills: new Map(),
    lastScan: new Date(),
  };

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    console.warn(`⚠️  Skills directory not found: ${dir}`);
    return registry;
  }

  for (const entry of entries) {
    const skillDir = join(dir, entry);
    const skillFile = join(skillDir, 'SKILL.md');

    try {
      const stats = await stat(skillDir);
      if (!stats.isDirectory()) continue;

      const content = await readFile(skillFile, 'utf-8');
      const frontmatter = parseFrontmatter(content);

      const name = (frontmatter.name as string) || entry;
      const description = (frontmatter.description as string) || '';
      const version = frontmatter.version as string | undefined;

      const manifest: SkillManifest = {
        name,
        version,
        description,
        triggers: extractTriggers(description),
        polecatAffinity: detectPolecatAffinity(content, name),
        allowedTools: (frontmatter['allowed-tools'] as string)?.split(',').map(t => t.trim()),
        source: detectSource(content),
        path: skillFile,
      };

      registry.skills.set(name, manifest);
    } catch {
      // No SKILL.md or unreadable — skip silently
      continue;
    }
  }

  return registry;
}

function detectSource(content: string): string {
  if (content.includes('obra') || content.includes('superpowers')) return 'obra';
  if (content.includes('trailofbits') || content.includes('Trail of Bits')) return 'trailofbits';
  if (content.includes('thedotmack')) return 'thedotmack';
  return 'custom';
}

// ── Skill Matching (used by planning engine) ─────────────────────────

export function matchSkillsToTask(
  registry: SkillRegistry,
  taskDescription: string,
  polecat: string
): SkillManifest[] {
  const lower = taskDescription.toLowerCase();
  const matches: Array<{ skill: SkillManifest; score: number }> = [];

  for (const [, skill] of registry.skills) {
    let score = 0;

    // Trigger keyword match
    for (const trigger of skill.triggers) {
      if (lower.includes(trigger)) score += 2;
    }

    // Polecat affinity match
    if (skill.polecatAffinity.includes(polecat)) score += 1;

    // Name match
    if (lower.includes(skill.name.toLowerCase())) score += 3;

    if (score > 0) matches.push({ skill, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.skill);
}

// ── CLI Helper ───────────────────────────────────────────────────────

export function formatSkillTable(registry: SkillRegistry): string {
  const lines: string[] = [
    `Skills loaded: ${registry.skills.size} (scanned ${registry.lastScan.toLocaleTimeString()})`,
    '',
    '| Skill | Version | Affinity | Triggers |',
    '|-------|---------|----------|----------|',
  ];

  for (const [, s] of registry.skills) {
    const ver = s.version ?? '—';
    const aff = s.polecatAffinity.join(', ');
    const trig = s.triggers.slice(0, 3).join(', ') + (s.triggers.length > 3 ? '…' : '');
    lines.push(`| \`${s.name}\` | ${ver} | ${aff} | ${trig} |`);
  }

  return lines.join('\n');
}
