/**
 * Planning Engine — Generates convoy plans before execution
 * 
 * Every task goes through: Input → Plan → Approval → Execute
 * Plans include: steps, assigned polecats, auto-selected skills, time estimate, cost estimate
 */

import { scanSkills, matchSkillsToTask, type SkillManifest } from '../skills/loader.js';
import { checkPermission, type PermissionLevel } from './permission-gate.js';

// ── Types ────────────────────────────────────────────────────────────

export interface ConvoyStep {
  stepNumber: number;
  description: string;
  polecat: string;
  skills: string[];             // auto-selected, overridable
  permission: PermissionLevel;
  estimatedMinutes: number;
  estimatedTokens: number;
}

export interface ConvoyPlan {
  id: string;
  title: string;
  input: string;                // original user request
  steps: ConvoyStep[];
  totalMinutes: number;
  totalTokens: number;
  estimatedCost: string;        // e.g. "$0.12"
  status: 'draft' | 'approved' | 'rejected' | 'executing' | 'complete';
  createdAt: string;
  gatedSteps: number[];         // step numbers requiring approval
}

// ── Polecat Selection Heuristics ─────────────────────────────────────

interface PolecatRule {
  name: string;
  keywords: string[];
}

const POLECAT_RULES: PolecatRule[] = [
  { name: 'figma-scout', keywords: ['figma', 'design', 'ui', 'component', 'frame', 'layout', 'token', 'mockup', 'prototype'] },
  { name: 'linear-tracker', keywords: ['ticket', 'issue', 'linear', 'cycle', 'sprint', 'backlog', 'dependency', 'blocked'] },
  { name: 'spec-writer', keywords: ['spec', 'handoff', 'documentation', 'doc', 'readme', 'guide', 'case study', 'portfolio'] },
  { name: 'comms-drafter', keywords: ['email', 'slack', 'message', 'standup', 'update', 'presentation', 'draft', 'communicate'] },
  { name: 'design-auditor', keywords: ['audit', 'drift', 'stale', 'monitor', 'check', 'validate', 'accessibility', 'review'] },
];

function selectPolecat(description: string): string {
  const lower = description.toLowerCase();
  let best = { name: 'spec-writer', score: 0 };

  for (const rule of POLECAT_RULES) {
    const score = rule.keywords.filter(k => lower.includes(k)).length;
    if (score > best.score) best = { name: rule.name, score };
  }

  return best.name;
}

// ── Token & Cost Estimation ──────────────────────────────────────────

function estimateTokens(description: string): number {
  const lower = description.toLowerCase();
  // Rough heuristics based on task type
  if (lower.includes('generate') || lower.includes('create') || lower.includes('write')) return 8000;
  if (lower.includes('extract') || lower.includes('read') || lower.includes('pull')) return 3000;
  if (lower.includes('review') || lower.includes('audit')) return 5000;
  if (lower.includes('draft') || lower.includes('email')) return 4000;
  return 4000; // default
}

const COST_PER_1K_TOKENS = 0.003; // Sonnet pricing approximation

// ── Plan Generation ──────────────────────────────────────────────────

export async function generatePlan(input: string): Promise<ConvoyPlan> {
  const registry = await scanSkills();

  // Split input into logical steps (simple heuristic — Claude will improve this)
  const taskParts = splitIntoTasks(input);

  const steps: ConvoyStep[] = [];
  const gatedSteps: number[] = [];

  for (let i = 0; i < taskParts.length; i++) {
    const task = taskParts[i];
    const polecat = selectPolecat(task);
    const skills = matchSkillsToTask(registry, task, polecat);
    const tokens = estimateTokens(task);
    const permission = checkPermission({
      action: task,
      polecat,
      description: task,
    });

    const step: ConvoyStep = {
      stepNumber: i + 1,
      description: task,
      polecat,
      skills: skills.slice(0, 3).map(s => s.name), // max 3 skills per step
      permission: permission.level,
      estimatedMinutes: Math.ceil(tokens / 2000), // ~2K tokens/min
      estimatedTokens: tokens,
    };

    steps.push(step);
    if (permission.level === 'GATED') gatedSteps.push(i + 1);
  }

  const totalTokens = steps.reduce((sum, s) => sum + s.estimatedTokens, 0);
  const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const estimatedCost = `$${(totalTokens / 1000 * COST_PER_1K_TOKENS).toFixed(3)}`;

  return {
    id: `convoy-${Date.now()}`,
    title: input.slice(0, 60) + (input.length > 60 ? '…' : ''),
    input,
    steps,
    totalMinutes,
    totalTokens,
    estimatedCost,
    status: 'draft',
    createdAt: new Date().toISOString(),
    gatedSteps,
  };
}

// ── Task Splitting (simple) ──────────────────────────────────────────

function splitIntoTasks(input: string): string[] {
  // If input has explicit steps (numbered or bulleted), use those
  const numbered = input.match(/(?:^|\n)\s*\d+[.)]\s+(.+)/g);
  if (numbered && numbered.length > 1) {
    return numbered.map(s => s.replace(/^\s*\d+[.)]\s+/, '').trim());
  }

  const bulleted = input.match(/(?:^|\n)\s*[-•]\s+(.+)/g);
  if (bulleted && bulleted.length > 1) {
    return bulleted.map(s => s.replace(/^\s*[-•]\s+/, '').trim());
  }

  // Otherwise, treat as single task
  return [input.trim()];
}

// ── Plan Formatting ──────────────────────────────────────────────────

export function formatPlan(plan: ConvoyPlan): string {
  const lines: string[] = [
    `╔═══════════════════════════════════════════════════════╗`,
    `║  CONVOY PLAN: ${plan.title.padEnd(40)}║`,
    `╠═══════════════════════════════════════════════════════╣`,
  ];

  for (const step of plan.steps) {
    const gate = step.permission === 'GATED' ? ' ⚠️ GATED' : '';
    lines.push(`║  Step ${step.stepNumber}: ${step.description.slice(0, 44).padEnd(44)}║`);
    lines.push(`║    Polecat: ${step.polecat.padEnd(42)}║`);
    lines.push(`║    Skills: ${(step.skills.join(', ') || 'none').padEnd(43)}║`);
    lines.push(`║    Est: ~${step.estimatedMinutes}min, ~${step.estimatedTokens} tokens${gate.padEnd(25)}║`);
    lines.push(`╟───────────────────────────────────────────────────────╢`);
  }

  lines.push(`║  TOTAL: ~${plan.totalMinutes}min | ~${plan.totalTokens} tokens | ${plan.estimatedCost}`.padEnd(56) + `║`);
  if (plan.gatedSteps.length > 0) {
    lines.push(`║  ⚠️  Steps ${plan.gatedSteps.join(', ')} require approval`.padEnd(56) + `║`);
  }
  lines.push(`╚═══════════════════════════════════════════════════════╝`);
  lines.push('');
  lines.push('approve / modify / reject ?');

  return lines.join('\n');
}
