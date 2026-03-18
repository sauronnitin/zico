/**
 * Hook System — JSON-based persistent memory with git tracking
 * 
 * Hooks are Zico's memory between sessions. Every state change is:
 * 1. Written to a JSON file in hooks/
 * 2. Git committed with a descriptive message
 * 
 * This means you can `git log hooks/` to see full history.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// ── Types ────────────────────────────────────────────────────────────

export interface HookEntry<T = unknown> {
  timestamp: string;
  source: string;      // which polecat or system wrote this
  action: string;      // what happened
  data: T;
}

export interface HookFile<T = unknown> {
  hookName: string;
  entries: HookEntry<T>[];
  lastUpdated: string;
}

// ── Core Operations ──────────────────────────────────────────────────

const HOOKS_DIR = resolve(process.cwd(), 'hooks');

async function ensureDir(): Promise<void> {
  await mkdir(HOOKS_DIR, { recursive: true });
}

export async function readHook<T>(name: string): Promise<HookFile<T>> {
  const path = join(HOOKS_DIR, `${name}.json`);
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { hookName: name, entries: [], lastUpdated: new Date().toISOString() };
  }
}

export async function writeHook<T>(
  name: string,
  entry: Omit<HookEntry<T>, 'timestamp'>,
  commitMessage?: string
): Promise<void> {
  await ensureDir();

  const hook = await readHook<T>(name);
  const fullEntry: HookEntry<T> = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  hook.entries.push(fullEntry);
  hook.lastUpdated = fullEntry.timestamp;

  // Keep last 100 entries per hook to avoid bloat
  if (hook.entries.length > 100) {
    hook.entries = hook.entries.slice(-100);
  }

  const path = join(HOOKS_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(hook, null, 2));

  // Git commit if in a repo
  try {
    const msg = commitMessage ?? `hook: ${name} — ${entry.action}`;
    execSync(`git add "${path}" && git commit -m "${msg}" --no-verify`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  } catch {
    // Not in a git repo or nothing to commit — silent
  }
}

// ── Convenience Readers ──────────────────────────────────────────────

export async function getLatestEntry<T>(name: string): Promise<HookEntry<T> | null> {
  const hook = await readHook<T>(name);
  return hook.entries.at(-1) ?? null;
}

export async function getEntriesSince<T>(name: string, since: Date): Promise<HookEntry<T>[]> {
  const hook = await readHook<T>(name);
  return hook.entries.filter(e => new Date(e.timestamp) > since);
}

// ── Standard Hook Names ──────────────────────────────────────────────

export const HOOK_NAMES = {
  DESIGN_LOG: 'design-log',
  TICKET_STATE: 'ticket-state',
  RATIONALE: 'rationale',
  FEEDBACK_LOG: 'feedback-log',
  CONVOY_LOG: 'convoy-log',
  COST_LOG: 'cost-log',
  VERSION_HISTORY: 'version-history',
} as const;
