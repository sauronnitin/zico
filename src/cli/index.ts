/**
 * Zico CLI — Entry point
 * 
 * Commands:
 *   zico start       — Boot sequence (prime hooks, scan skills, show status)
 *   zico plan <input> — Generate convoy plan from input
 *   zico skills      — List all auto-discovered skills
 *   zico hooks       — Show hook status
 *   zico cost        — Show cost tracking summary
 */

import { scanSkills, formatSkillTable } from '../skills/loader.js';
import { generatePlan, formatPlan } from '../planning/engine.js';
import { readHook, HOOK_NAMES } from '../hooks/index.js';
import { parseInput } from '../intake/parser.js';
import { runFigmaScout, ScoutError } from '../polecats/figma-scout.js';

// ── Command Router ───────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'start':
    case 'prime':
      await cmdStart();
      break;
    case 'plan':
      await cmdPlan(args.join(' '));
      break;
    case 'skills':
      await cmdSkills();
      break;
    case 'hooks':
      await cmdHooks();
      break;
    case 'cost':
      await cmdCost();
      break;
    case 'scout':
      await cmdScout(args);
      break;
    default:
      console.log(`
Zico Jr — AI Orchestrator for UX Design Workflows

Commands:
  zico start          Boot sequence (hooks + skills + status)
  zico plan <input>   Generate convoy plan
  zico skills         List auto-discovered skills
  zico hooks          Show hook status
  zico cost           Cost tracking summary

Tip: Skills auto-register from skills/*/SKILL.md — just drop the folder in.
      `);
  }
}

// ── Commands ─────────────────────────────────────────────────────────

async function cmdStart() {
  console.log('🚀 Zico Jr booting...\n');

  // 1. Scan skills
  const registry = await scanSkills();
  console.log(`📚 Skills: ${registry.skills.size} loaded from skills/`);

  // 2. Read hooks
  const designLog = await readHook(HOOK_NAMES.DESIGN_LOG);
  const ticketState = await readHook(HOOK_NAMES.TICKET_STATE);
  const convoyLog = await readHook(HOOK_NAMES.CONVOY_LOG);

  console.log(`🪝 Hooks: design-log (${designLog.entries.length}), ticket-state (${ticketState.entries.length}), convoy-log (${convoyLog.entries.length})`);

  // 3. Status
  console.log(`\n✅ Ready. Run 'zico plan <your task>' to start a convoy.\n`);
}

async function cmdPlan(input: string) {
  if (!input.trim()) {
    console.log('Usage: zico plan <describe your task>');
    return;
  }

  // Parse input
  const parsed = parseInput(input);
  console.log(`📥 Input type: ${parsed.type} | Words: ${parsed.metadata.wordCount}`);
  if (parsed.metadata.detectedDomain) {
    console.log(`🏷️  Domain: ${parsed.metadata.detectedDomain}`);
  }

  // Generate plan
  const plan = await generatePlan(input);
  console.log('\n' + formatPlan(plan));
}

async function cmdSkills() {
  const registry = await scanSkills();
  console.log(formatSkillTable(registry));
}

async function cmdHooks() {
  console.log('🪝 Hook Status:\n');
  for (const [label, name] of Object.entries(HOOK_NAMES)) {
    const hook = await readHook(name);
    const last = hook.entries.at(-1);
    const lastTime = last ? new Date(last.timestamp).toLocaleString() : 'never';
    console.log(`  ${label.padEnd(20)} ${hook.entries.length} entries, last: ${lastTime}`);
  }
}

async function cmdCost() {
  const costLog = await readHook(HOOK_NAMES.COST_LOG);
  if (costLog.entries.length === 0) {
    console.log('No cost data yet. Costs are tracked per convoy.');
    return;
  }
  console.log(`💰 Cost entries: ${costLog.entries.length}`);
  // TODO: aggregate by day/week/convoy
}

async function cmdScout(args: string[]) {
  // Parse: zico scout <url-or-file-id> --page "Page Name"
  // Also support: zico scout --btg --page "Page Name"  (Blue Tees Golf shortcut)
  const BTG_FILE_ID = 'lp9w6ZIK7ghUopHyaaGHFr';

  let fileId: string | undefined;
  let page: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page' && args[i + 1]) {
      page = args[++i];
    } else if (args[i] === '--btg') {
      fileId = BTG_FILE_ID;
    } else if (!args[i].startsWith('--')) {
      // Treat as URL or file ID
      const parsed = parseInput(args[i]);
      fileId = parsed.extracted.figmaFileIds?.[0] ?? args[i];
    }
  }

  if (!fileId) {
    console.log('Usage: zico scout <figma-url-or-file-id> --page "Page Name"');
    console.log('       zico scout --btg --page "Page Name"  (Blue Tees Golf shortcut)');
    return;
  }

  if (!page) {
    console.log('Error: --page is required. Example: --page "Home"');
    console.log('Usage: zico scout <figma-url-or-file-id> --page "Page Name"');
    return;
  }

  console.log(`🔭 Scouting Figma file ${fileId}, page "${page}"...\n`);

  try {
    const result = await runFigmaScout({ fileId, page });

    console.log(`✅ Scout complete: ${result.fileName}`);
    console.log(`   Page:       ${result.page}`);
    console.log(`   Colors:     ${result.tokens.colors.length} tokens`);
    console.log(`   Typography: ${result.tokens.typography.length} tokens`);
    console.log(`   Spacing:    ${result.tokens.spacing.length} tokens`);
    console.log(`   Components: ${result.components.length}`);
    console.log(`   Frames:     ${result.layout.frameCount}`);
    if (result.screenshotPath) {
      console.log(`   Screenshot: ${result.screenshotPath}`);
    }
    console.log(`   Spec:       ${result.markdownPath}`);
    console.log(`   Hook:       hooks/design-log.json`);
  } catch (err) {
    if (err instanceof ScoutError) {
      console.error(`❌ Scout failed: ${err.message}`);
    } else {
      console.error(`❌ Unexpected error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

// ── Run ──────────────────────────────────────────────────────────────

main().catch(console.error);
