# figma-scout Polecat — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Polecat:** figma-scout
**Autonomy:** AUTO

---

## Overview

figma-scout is the first polecat module in Zico. Its purpose is to read a Figma file page, extract design context (tokens, components, layout, screenshot), and produce two outputs:

1. **JSON hook entry** — appended to `hooks/design-log.json` for downstream orchestration (spec-writer polecat)
2. **Markdown spec doc** — written to `docs/scouts/` for human-readable developer handoff

It is invoked directly via `zico scout` (AUTO, no plan/approve gate) and also routed via the planning engine when a convoy step maps to the `figma-scout` polecat.

---

## Constraints (from CLAUDE.md)

- NEVER modify, overwrite, delete, or rename existing Figma frames or layers
- ALWAYS read existing design context before any operation
- figma-scout is read-only — it never calls any Figma write tool
- All outputs are local files or hook entries

---

## File Structure

```
src/
  polecats/
    figma-scout.ts              ← main module
  cli/
    index.ts                    ← add `zico scout` command (existing file)

docs/
  scouts/                       ← markdown spec outputs
    YYYY-MM-DD-<fileId>-<page>.md

hooks/
  design-log.json               ← existing hook, scout appends entries
  screenshots/                  ← PNG files from get_screenshot
    <fileId>-<page>.png
```

---

## Types

```ts
// Input
interface ScoutInput {
  fileId: string;
  page: string;
  figmaToken?: string;    // optional override; uses MCP default otherwise
}

// Output contract (also consumed by spec-writer polecat)
interface ScoutResult {
  fileId: string;
  page: string;
  fileName: string;
  scoutedAt: string;          // ISO timestamp
  tokens: {
    colors: Token[];
    typography: Token[];
    spacing: Token[];
  };
  components: ComponentEntry[];
  layout: LayoutSummary;
  screenshotPath: string;     // relative: hooks/screenshots/<fileId>-<page>.png
  markdownPath: string;       // relative: docs/scouts/YYYY-MM-DD-<fileId>-<page>.md
}

interface Token {
  name: string;
  value: string;
  type: 'color' | 'typography' | 'spacing';
}

interface ComponentEntry {
  name: string;
  type: string;           // e.g. "COMPONENT", "INSTANCE", "FRAME"
  variantCount: number;
  instanceCount: number;
}

interface LayoutSummary {
  frameCount: number;
  gridSystems: string[];
  autoLayoutFrames: string[];
}
```

---

## Data Flow

`runFigmaScout(input: ScoutInput): Promise<ScoutResult>`

Steps run in sequence; steps 1–4 fail-fast on error:

```
1. get_metadata(fileId)
   → validate page exists in file; throw ScoutError if not found
   → extract: fileName, lastModified, available pages

2. get_variable_defs(fileId)
   → extract color, typography, spacing tokens
   → store in ScoutResult.tokens

3. get_design_context(fileId, page)
   → extract component instances, frame names, variants, auto-layout props
   → store in ScoutResult.components + ScoutResult.layout

4. get_screenshot(fileId, page)
   → save PNG to hooks/screenshots/<fileId>-<page>.png
   → store relative path in ScoutResult.screenshotPath

5. writeHook('design-log', { source: 'figma-scout', action: 'scout', data: ScoutResult })
   → appends to hooks/design-log.json
   → failure: log warning, continue (data not lost)

6. writeMarkdownSpec(result: ScoutResult)
   → write docs/scouts/YYYY-MM-DD-<fileId>-<page>.md
   → sections: header, tokens table, component inventory, layout summary, screenshot embed
   → failure: log warning, continue
```

Steps 5–6 are best-effort: if they fail, `runFigmaScout()` still returns `ScoutResult` so callers always have the data.

---

## CLI Wiring

New case added to `src/cli/index.ts`:

```
zico scout <figma-url-or-file-id> --page "Page Name"
```

- Parses file ID from URL using existing `parseInput()` from `src/intake/parser.ts`
- Calls `runFigmaScout()` directly (no plan/approve flow — AUTO)
- Prints: file name, page scouted, token counts, component count, output paths

---

## Extensibility Notes

- **Scope by page** is the default. Future: `--all-pages` flag loops `runFigmaScout()` per page.
- `ScoutResult` is the downstream contract for spec-writer polecat — keep it stable.
- The Figma Launch App file ID (`lp9w6ZIK7ghUopHyaaGHFr`) is available as a default in the CLI for quick invocation without specifying a URL.

---

## Tests (`src/polecats/figma-scout.test.ts`)

| Test | Type | Notes |
|------|------|-------|
| Returns correct `ScoutResult` shape | Unit | Mock all MCP tools |
| Throws `ScoutError` when page not found | Unit | Mock `get_metadata` returning no matching page |
| Markdown output contains all required sections | Unit | Assert headings, token table, screenshot ref |
| Hook entry written with correct shape | Unit | Assert `writeHook` called with right args |
| Live scout against `lp9w6ZIK7ghUopHyaaGHFr` | Integration | Skipped by default; `ZICO_INTEGRATION=1` to enable |

---

## Out of Scope

- Writing or modifying Figma frames (BLOCKED per CLAUDE.md)
- Multi-file scouting
- Diff / change detection between scout runs (future: design-auditor polecat)
- Auth token management (delegated to Figma MCP server)
