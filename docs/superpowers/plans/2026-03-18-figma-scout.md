# figma-scout Polecat Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the figma-scout polecat — a TypeScript module that scouts a named Figma file page via the Figma REST API, extracts tokens/components/layout/screenshot, and writes a JSON hook entry + markdown spec doc.

**Architecture:** Four focused modules (`types.ts` for shared types, `client.ts` for Figma REST calls, `transform.ts` for pure data parsing, `markdown.ts` for output generation) composed by a thin `figma-scout.ts` orchestrator. The CLI adds a `zico scout` command that calls `runFigmaScout()` directly (AUTO — no plan/approve gate). Tests use vitest with an injected mock `FigmaClient`.

**Tech Stack:** TypeScript ESM, Node.js 18+ built-in `fetch`, Figma REST API v1, vitest, existing `writeHook` / `HOOK_NAMES` from `src/hooks/index.ts`, existing `parseInput` from `src/intake/parser.ts`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/polecats/figma-scout/types.ts` | Create | All shared types: `ScoutInput`, `ScoutResult`, `Token`, `ComponentEntry`, `LayoutSummary`, `ScoutError`, internal Figma API shapes |
| `src/polecats/figma-scout/client.ts` | Create | `FigmaClient` interface + `makeFigmaClient(token)` factory — all Figma REST calls |
| `src/polecats/figma-scout/transform.ts` | Create | Pure functions: `parseTokens`, `parseComponents`, `parseLayout` |
| `src/polecats/figma-scout/markdown.ts` | Create | Pure `buildMarkdown(result): string` + `saveMarkdown(result): Promise<void>` |
| `src/polecats/figma-scout.ts` | Create | Public API: re-exports types, `runFigmaScout(input, client?)` orchestrator |
| `src/polecats/figma-scout.test.ts` | Create | All vitest tests |
| `src/cli/index.ts` | Modify | Add `scout` command case |

---

## Chunk 1: Types, Transforms, Markdown

### Task 1: Create types

**Files:**
- Create: `src/polecats/figma-scout/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/polecats/figma-scout/types.ts

// ── Public API types ─────────────────────────────────────────────────

export interface ScoutInput {
  fileId: string;
  page: string;
  figmaToken?: string;  // overrides FIGMA_TOKEN env var
}

export interface Token {
  name: string;
  value: string;
  type: 'color' | 'typography' | 'spacing';
}

export interface ComponentEntry {
  name: string;
  type: string;           // COMPONENT | COMPONENT_SET | INSTANCE | FRAME
  variantCount: number;
  instanceCount: number;
}

export interface LayoutSummary {
  frameCount: number;
  gridSystems: string[];
  autoLayoutFrames: string[];
}

export interface ScoutResult {
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
  screenshotPath: string;     // "" if screenshot failed
  markdownPath: string;
}

export class ScoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoutError';
  }
}

// ── Internal Figma REST API shapes ───────────────────────────────────

export interface FigmaPageRef {
  id: string;
  name: string;
  type: 'CANVAS';
}

export interface FigmaFileMeta {
  name: string;
  lastModified: string;
  document: {
    id: string;
    name: string;
    type: 'DOCUMENT';
    children: FigmaPageRef[];
  };
}

export interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, unknown>;
}

export interface FigmaVariablesResponse {
  meta: {
    variables: Record<string, FigmaVariable>;
    variableCollections: Record<string, {
      name: string;
      modes: Array<{ modeId: string; name: string }>;
    }>;
  };
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutGrids?: Array<{ pattern: 'COLUMNS' | 'ROWS' | 'GRID' }>;
}

export interface FigmaNodesResponse {
  nodes: Record<string, { document: FigmaNode }>;
}

export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string>;  // nodeId → render URL
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/nitinsauran/zico && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/polecats/figma-scout/types.ts && git commit -m "feat(figma-scout): add shared types"
```

---

### Task 2: Token, component, and layout transforms

**Files:**
- Create: `src/polecats/figma-scout/transform.ts`
- Create: `src/polecats/figma-scout.test.ts` (transforms section only)

- [ ] **Step 1: Write failing tests for `parseTokens`**

```typescript
// src/polecats/figma-scout.test.ts
import { describe, it, expect } from 'vitest';
import { parseTokens, parseComponents, parseLayout } from './figma-scout/transform.js';
import type { FigmaVariablesResponse, FigmaNode } from './figma-scout/types.js';

describe('parseTokens', () => {
  it('extracts color tokens from COLOR variables', () => {
    const vars: FigmaVariablesResponse = {
      meta: {
        variables: {
          'id1': {
            id: 'id1',
            name: 'color/primary/500',
            resolvedType: 'COLOR',
            valuesByMode: { 'm1': { r: 0.2, g: 0.4, b: 0.8, a: 1 } },
          },
        },
        variableCollections: {},
      },
    };
    const result = parseTokens(vars);
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0]).toEqual({
      name: 'color/primary/500',
      value: '#3366cc',
      type: 'color',
    });
    expect(result.typography).toHaveLength(0);
    expect(result.spacing).toHaveLength(0);
  });

  it('extracts spacing tokens from FLOAT variables with "spacing" in name', () => {
    const vars: FigmaVariablesResponse = {
      meta: {
        variables: {
          'id2': {
            id: 'id2',
            name: 'spacing/sm',
            resolvedType: 'FLOAT',
            valuesByMode: { 'm1': 8 },
          },
        },
        variableCollections: {},
      },
    };
    const result = parseTokens(vars);
    expect(result.spacing[0]).toEqual({ name: 'spacing/sm', value: '8', type: 'spacing' });
  });

  it('extracts typography tokens from STRING variables with "font" in name', () => {
    const vars: FigmaVariablesResponse = {
      meta: {
        variables: {
          'id3': {
            id: 'id3',
            name: 'font/family/body',
            resolvedType: 'STRING',
            valuesByMode: { 'm1': 'Inter' },
          },
        },
        variableCollections: {},
      },
    };
    const result = parseTokens(vars);
    expect(result.typography[0]).toEqual({ name: 'font/family/body', value: 'Inter', type: 'typography' });
  });

  it('returns empty arrays when no variables', () => {
    const vars: FigmaVariablesResponse = { meta: { variables: {}, variableCollections: {} } };
    const result = parseTokens(vars);
    expect(result.colors).toHaveLength(0);
    expect(result.typography).toHaveLength(0);
    expect(result.spacing).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts 2>&1 | head -30
```
Expected: FAIL — `parseTokens` not found.

- [ ] **Step 3: Write `parseTokens` in transform.ts**

```typescript
// src/polecats/figma-scout/transform.ts
import type {
  FigmaVariablesResponse,
  FigmaNode,
  Token,
  ComponentEntry,
  LayoutSummary,
} from './types.js';

// ── parseTokens ──────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('');
}

export function parseTokens(vars: FigmaVariablesResponse): {
  colors: Token[];
  typography: Token[];
  spacing: Token[];
} {
  const colors: Token[] = [];
  const typography: Token[] = [];
  const spacing: Token[] = [];

  for (const variable of Object.values(vars.meta.variables)) {
    const firstMode = Object.values(variable.valuesByMode)[0];
    const lower = variable.name.toLowerCase();

    if (variable.resolvedType === 'COLOR' && firstMode && typeof firstMode === 'object') {
      const { r, g, b } = firstMode as { r: number; g: number; b: number };
      colors.push({ name: variable.name, value: rgbToHex(r, g, b), type: 'color' });
    } else if (variable.resolvedType === 'FLOAT' && (lower.includes('spacing') || lower.includes('space') || lower.includes('gap'))) {
      spacing.push({ name: variable.name, value: String(firstMode), type: 'spacing' });
    } else if (variable.resolvedType === 'STRING' && (lower.includes('font') || lower.includes('type') || lower.includes('text'))) {
      typography.push({ name: variable.name, value: String(firstMode), type: 'typography' });
    }
  }

  return { colors, typography, spacing };
}
```

- [ ] **Step 4: Run `parseTokens` tests — verify they pass**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗|parseTokens)"
```
Expected: all 4 `parseTokens` tests PASS.

---

- [ ] **Step 5: Write failing tests for `parseComponents`**

Append to `src/polecats/figma-scout.test.ts`:

```typescript
describe('parseComponents', () => {
  const pageNode: FigmaNode = {
    id: 'page:1',
    name: 'Home',
    type: 'CANVAS',
    children: [
      {
        id: 'frame:1',
        name: 'Button',
        type: 'COMPONENT_SET',
        children: [
          { id: 'c:1', name: 'Button/Primary', type: 'COMPONENT' },
          { id: 'c:2', name: 'Button/Secondary', type: 'COMPONENT' },
        ],
      },
      {
        id: 'frame:2',
        name: 'Card',
        type: 'FRAME',
        children: [
          { id: 'i:1', name: 'Button/Primary', type: 'INSTANCE' },
          { id: 'i:2', name: 'Button/Primary', type: 'INSTANCE' },
        ],
      },
    ],
  };

  it('counts variants in COMPONENT_SET', () => {
    const result = parseComponents(pageNode);
    const btn = result.find(c => c.name === 'Button');
    expect(btn).toBeDefined();
    expect(btn!.type).toBe('COMPONENT_SET');
    expect(btn!.variantCount).toBe(2);
  });

  it('counts instances across the page', () => {
    const result = parseComponents(pageNode);
    const btn = result.find(c => c.name === 'Button');
    expect(btn!.instanceCount).toBe(2);
  });

  it('returns empty array for page with no components', () => {
    const empty: FigmaNode = { id: 'p', name: 'Empty', type: 'CANVAS', children: [] };
    expect(parseComponents(empty)).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run tests — verify `parseComponents` tests fail**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts 2>&1 | grep -E "(PASS|FAIL|parseComponents)"
```
Expected: FAIL.

- [ ] **Step 7: Write `parseComponents` in transform.ts**

Append to `src/polecats/figma-scout/transform.ts`:

```typescript
export function parseComponents(pageNode: FigmaNode): ComponentEntry[] {
  const entries: ComponentEntry[] = [];

  // Count instances of each component name across the entire page tree
  const instanceCounts = new Map<string, number>();
  countInstances(pageNode, instanceCounts);

  // Walk top-level children for component definitions
  for (const child of pageNode.children ?? []) {
    if (['COMPONENT', 'COMPONENT_SET', 'FRAME'].includes(child.type)) {
      const variantCount = child.type === 'COMPONENT_SET'
        ? (child.children ?? []).filter(c => c.type === 'COMPONENT').length
        : 0;
      entries.push({
        name: child.name,
        type: child.type,
        variantCount,
        instanceCount: instanceCounts.get(child.name) ?? 0,
      });
    }
  }

  return entries;
}

function countInstances(node: FigmaNode, counts: Map<string, number>): void {
  if (node.type === 'INSTANCE') {
    // Normalize "Button/Primary" → "Button" so instances match their COMPONENT_SET parent
    const baseName = node.name.split('/')[0];
    counts.set(baseName, (counts.get(baseName) ?? 0) + 1);
  }
  for (const child of node.children ?? []) {
    countInstances(child, counts);
  }
}
```

- [ ] **Step 8: Run tests — verify `parseComponents` tests pass**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | grep -E "(✓|✗|parseComponents)"
```
Expected: all 3 PASS.

---

- [ ] **Step 9: Write failing tests for `parseLayout`**

Append to `src/polecats/figma-scout.test.ts`:

```typescript
describe('parseLayout', () => {
  it('counts top-level frames', () => {
    const page: FigmaNode = {
      id: 'p', name: 'Home', type: 'CANVAS',
      children: [
        { id: 'f1', name: 'Hero', type: 'FRAME' },
        { id: 'f2', name: 'Nav', type: 'FRAME' },
        { id: 'c1', name: 'Btn', type: 'COMPONENT' },
      ],
    };
    expect(parseLayout(page).frameCount).toBe(2);
  });

  it('detects auto-layout frames', () => {
    const page: FigmaNode = {
      id: 'p', name: 'Home', type: 'CANVAS',
      children: [
        { id: 'f1', name: 'Row', type: 'FRAME', layoutMode: 'HORIZONTAL' },
        { id: 'f2', name: 'Plain', type: 'FRAME' },
      ],
    };
    expect(parseLayout(page).autoLayoutFrames).toEqual(['Row']);
  });

  it('detects grid systems', () => {
    const page: FigmaNode = {
      id: 'p', name: 'Home', type: 'CANVAS',
      children: [
        {
          id: 'f1', name: 'Layout', type: 'FRAME',
          layoutGrids: [{ pattern: 'COLUMNS' }],
        },
      ],
    };
    expect(parseLayout(page).gridSystems).toContain('COLUMNS (Layout)');
  });
});
```

- [ ] **Step 10: Run tests — verify `parseLayout` tests fail**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts 2>&1 | grep -E "(PASS|FAIL|parseLayout)"
```
Expected: FAIL.

- [ ] **Step 11: Write `parseLayout` in transform.ts**

Append to `src/polecats/figma-scout/transform.ts`:

```typescript
export function parseLayout(pageNode: FigmaNode): LayoutSummary {
  const frames = (pageNode.children ?? []).filter(c => c.type === 'FRAME');
  const autoLayoutFrames = frames
    .filter(f => f.layoutMode === 'HORIZONTAL' || f.layoutMode === 'VERTICAL')
    .map(f => f.name);
  const gridSystems: string[] = [];

  for (const frame of frames) {
    for (const grid of frame.layoutGrids ?? []) {
      gridSystems.push(`${grid.pattern} (${frame.name})`);
    }
  }

  return { frameCount: frames.length, gridSystems, autoLayoutFrames };
}
```

- [ ] **Step 12: Run all transform tests — verify all pass**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | tail -15
```
Expected: all tests PASS, 0 failures.

- [ ] **Step 13: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/polecats/figma-scout/transform.ts src/polecats/figma-scout.test.ts && git commit -m "feat(figma-scout): add transform functions with tests"
```

---

### Task 3: Markdown builder

**Files:**
- Create: `src/polecats/figma-scout/markdown.ts`
- Modify: `src/polecats/figma-scout.test.ts` (add markdown tests)

- [ ] **Step 1: Write failing tests for `buildMarkdown`**

Append to `src/polecats/figma-scout.test.ts`:

```typescript
import { buildMarkdown } from './figma-scout/markdown.js';
import type { ScoutResult } from './figma-scout/types.js';

const mockResult: ScoutResult = {
  fileId: 'abc123',
  page: 'Home',
  fileName: 'Rainmaker',
  scoutedAt: '2026-03-18T10:00:00.000Z',
  tokens: {
    colors: [{ name: 'color/primary/500', value: '#3366cc', type: 'color' }],
    typography: [{ name: 'font/body', value: 'Inter', type: 'typography' }],
    spacing: [{ name: 'spacing/sm', value: '8', type: 'spacing' }],
  },
  components: [{ name: 'Button', type: 'COMPONENT_SET', variantCount: 3, instanceCount: 5 }],
  layout: { frameCount: 2, gridSystems: ['COLUMNS (Hero)'], autoLayoutFrames: ['Nav'] },
  screenshotPath: 'hooks/screenshots/abc123-home.png',
  markdownPath: 'docs/scouts/2026-03-18-abc123-home.md',
};

describe('buildMarkdown', () => {
  it('includes file name and page in header', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('# Figma Scout: Rainmaker');
    expect(md).toContain('**Page:** Home');
  });

  it('includes color token table', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Color Tokens');
    expect(md).toContain('color/primary/500');
    expect(md).toContain('#3366cc');
  });

  it('includes typography token table', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Typography Tokens');
    expect(md).toContain('font/body');
  });

  it('includes spacing token table', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Spacing Tokens');
    expect(md).toContain('spacing/sm');
  });

  it('includes component inventory', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Component Inventory');
    expect(md).toContain('Button');
    expect(md).toContain('3');  // variantCount
  });

  it('includes layout summary', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Layout');
    expect(md).toContain('2');  // frameCount
    expect(md).toContain('Nav');
  });

  it('includes screenshot embed when screenshotPath is set', () => {
    const md = buildMarkdown(mockResult);
    expect(md).toContain('## Screenshot');
    expect(md).toContain('hooks/screenshots/abc123-home.png');
  });

  it('omits screenshot section when screenshotPath is empty', () => {
    const noShot = { ...mockResult, screenshotPath: '' };
    const md = buildMarkdown(noShot);
    expect(md).not.toContain('## Screenshot');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts 2>&1 | grep -E "(PASS|FAIL|buildMarkdown)"
```
Expected: FAIL — `buildMarkdown` not found.

- [ ] **Step 3: Write `buildMarkdown` and `saveMarkdown` in markdown.ts**

```typescript
// src/polecats/figma-scout/markdown.ts
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { ScoutResult, Token, ComponentEntry } from './types.js';

export function buildMarkdown(result: ScoutResult): string {
  const lines: string[] = [
    `# Figma Scout: ${result.fileName}`,
    '',
    `**Page:** ${result.page}  `,
    `**File ID:** \`${result.fileId}\`  `,
    `**Scouted:** ${result.scoutedAt}`,
    '',
    '---',
    '',
  ];

  // Color tokens
  lines.push('## Color Tokens', '');
  if (result.tokens.colors.length === 0) {
    lines.push('_No color tokens found._', '');
  } else {
    lines.push('| Name | Value |', '|------|-------|');
    for (const t of result.tokens.colors) {
      lines.push(`| \`${t.name}\` | ${t.value} |`);
    }
    lines.push('');
  }

  // Typography tokens
  lines.push('## Typography Tokens', '');
  if (result.tokens.typography.length === 0) {
    lines.push('_No typography tokens found._', '');
  } else {
    lines.push('| Name | Value |', '|------|-------|');
    for (const t of result.tokens.typography) {
      lines.push(`| \`${t.name}\` | ${t.value} |`);
    }
    lines.push('');
  }

  // Spacing tokens
  lines.push('## Spacing Tokens', '');
  if (result.tokens.spacing.length === 0) {
    lines.push('_No spacing tokens found._', '');
  } else {
    lines.push('| Name | Value |', '|------|-------|');
    for (const t of result.tokens.spacing) {
      lines.push(`| \`${t.name}\` | ${t.value} |`);
    }
    lines.push('');
  }

  // Component inventory
  lines.push('## Component Inventory', '');
  if (result.components.length === 0) {
    lines.push('_No components found._', '');
  } else {
    lines.push('| Name | Type | Variants | Instances |', '|------|------|----------|-----------|');
    for (const c of result.components) {
      lines.push(`| ${c.name} | ${c.type} | ${c.variantCount} | ${c.instanceCount} |`);
    }
    lines.push('');
  }

  // Layout
  lines.push('## Layout', '');
  lines.push(`**Frames:** ${result.layout.frameCount}  `);
  if (result.layout.autoLayoutFrames.length > 0) {
    lines.push(`**Auto-layout:** ${result.layout.autoLayoutFrames.join(', ')}  `);
  }
  if (result.layout.gridSystems.length > 0) {
    lines.push(`**Grids:** ${result.layout.gridSystems.join(', ')}  `);
  }
  lines.push('');

  // Screenshot (only if present)
  if (result.screenshotPath) {
    lines.push('## Screenshot', '');
    lines.push(`![${result.page}](../../${result.screenshotPath})`, '');
  }

  return lines.join('\n');
}

export async function saveMarkdown(result: ScoutResult): Promise<void> {
  const absPath = resolve(process.cwd(), result.markdownPath);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, buildMarkdown(result), 'utf-8');
}
```

- [ ] **Step 4: Run markdown tests — verify all pass**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | grep -E "(✓|✗|buildMarkdown)"
```
Expected: all 8 PASS.

- [ ] **Step 5: Run all tests so far**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | tail -10
```
Expected: all tests pass, 0 failures.

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/nitinsauran/zico && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/polecats/figma-scout/markdown.ts src/polecats/figma-scout.test.ts && git commit -m "feat(figma-scout): add markdown builder with tests"
```

---

## Chunk 2: Figma Client + runFigmaScout Orchestrator

### Task 4: Figma REST client

**Files:**
- Create: `src/polecats/figma-scout/client.ts`

- [ ] **Step 1: Write client.ts**

```typescript
// src/polecats/figma-scout/client.ts
import type {
  FigmaFileMeta,
  FigmaVariablesResponse,
  FigmaNode,
  FigmaNodesResponse,
  FigmaImagesResponse,
} from './types.js';

// ── FigmaClient interface (injectable for tests) ─────────────────────

export interface FigmaClient {
  getFileMeta(fileId: string): Promise<FigmaFileMeta>;
  getVariables(fileId: string): Promise<FigmaVariablesResponse>;
  getPageNode(fileId: string, pageId: string): Promise<FigmaNode>;
  getScreenshotUrl(fileId: string, nodeId: string): Promise<string>;
}

// ── Real implementation (Figma REST API v1) ──────────────────────────

const FIGMA_BASE = 'https://api.figma.com/v1';

export function makeFigmaClient(token: string): FigmaClient {
  async function figmaFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${FIGMA_BASE}${path}`, {
      headers: { 'X-Figma-Token': token },
    });
    if (!res.ok) {
      throw new Error(`Figma API error ${res.status} for ${path}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async getFileMeta(fileId) {
      return figmaFetch<FigmaFileMeta>(`/files/${fileId}?depth=1`);
    },

    async getVariables(fileId) {
      return figmaFetch<FigmaVariablesResponse>(`/files/${fileId}/variables/local`);
    },

    async getPageNode(fileId, pageId) {
      const res = await figmaFetch<FigmaNodesResponse>(
        `/files/${fileId}/nodes?ids=${encodeURIComponent(pageId)}&depth=3`
      );
      const nodeEntry = res.nodes[pageId];
      if (!nodeEntry) throw new Error(`Node ${pageId} not found in response`);
      return nodeEntry.document;
    },

    async getScreenshotUrl(fileId, nodeId) {
      const res = await figmaFetch<FigmaImagesResponse>(
        `/images/${fileId}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`
      );
      if (res.err) throw new Error(`Figma screenshot error: ${res.err}`);
      const url = res.images[nodeId];
      if (!url) throw new Error(`No image URL returned for node ${nodeId}`);
      return url;
    },
  };
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/nitinsauran/zico && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/polecats/figma-scout/client.ts && git commit -m "feat(figma-scout): add Figma REST client"
```

---

### Task 5: runFigmaScout orchestrator

**Files:**
- Create: `src/polecats/figma-scout.ts`
- Modify: `src/polecats/figma-scout.test.ts` (add orchestrator tests)

- [ ] **Step 1: Write failing tests for `runFigmaScout`**

Append to `src/polecats/figma-scout.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { runFigmaScout, ScoutError } from './figma-scout.js';
import type { FigmaClient } from './figma-scout/client.js';
import type { FigmaFileMeta, FigmaVariablesResponse, FigmaNode } from './figma-scout/types.js';

// Mock hooks module — path must match what figma-scout.ts imports
vi.mock('../hooks/index.js', () => ({
  writeHook: vi.fn().mockResolvedValue(undefined),
  HOOK_NAMES: { DESIGN_LOG: 'design-log' },
}));

// Mock fs/promises for file writes
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch for screenshot download
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
});
vi.stubGlobal('fetch', fetchMock);

const mockMeta: FigmaFileMeta = {
  name: 'Rainmaker',
  lastModified: '2026-03-01T00:00:00Z',
  document: {
    id: 'doc:1',
    name: 'Document',
    type: 'DOCUMENT',
    children: [{ id: 'page:1', name: 'Home', type: 'CANVAS' }],
  },
};

const mockVars: FigmaVariablesResponse = { meta: { variables: {}, variableCollections: {} } };

const mockPageNode: FigmaNode = {
  id: 'page:1', name: 'Home', type: 'CANVAS', children: [],
};

function makeMockClient(overrides: Partial<FigmaClient> = {}): FigmaClient {
  return {
    getFileMeta: vi.fn().mockResolvedValue(mockMeta),
    getVariables: vi.fn().mockResolvedValue(mockVars),
    getPageNode: vi.fn().mockResolvedValue(mockPageNode),
    getScreenshotUrl: vi.fn().mockResolvedValue('https://cdn.figma.com/img/fake.png'),
    ...overrides,
  };
}

describe('runFigmaScout', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a ScoutResult with correct shape', async () => {
    const result = await runFigmaScout({ fileId: 'abc123', page: 'Home' }, makeMockClient());
    expect(result.fileId).toBe('abc123');
    expect(result.page).toBe('Home');
    expect(result.fileName).toBe('Rainmaker');
    expect(result.tokens).toBeDefined();
    expect(result.components).toBeDefined();
    expect(result.layout).toBeDefined();
    expect(result.markdownPath).toContain('abc123');
    expect(result.scoutedAt).toBeTruthy();
  });

  it('throws ScoutError when page is not found', async () => {
    const client = makeMockClient();
    await expect(
      runFigmaScout({ fileId: 'abc123', page: 'NonExistent' }, client)
    ).rejects.toThrow(ScoutError);
  });

  it('returns result with screenshotPath="" when screenshot fails', async () => {
    const client = makeMockClient({
      getScreenshotUrl: vi.fn().mockRejectedValue(new Error('Figma screenshot error')),
    });
    const result = await runFigmaScout({ fileId: 'abc123', page: 'Home' }, client);
    expect(result.screenshotPath).toBe('');
  });

  it('calls writeHook with correct source, action, and data', async () => {
    const { writeHook } = await import('../hooks/index.js');
    const result = await runFigmaScout({ fileId: 'abc123', page: 'Home' }, makeMockClient());
    expect(vi.mocked(writeHook)).toHaveBeenCalledWith(
      'design-log',
      expect.objectContaining({
        source: 'figma-scout',
        action: 'scout',
        data: expect.objectContaining({ fileId: 'abc123', page: 'Home' }),
      })
    );
  });

  it('returns result even when writeHook fails', async () => {
    const { writeHook } = await import('../hooks/index.js');
    vi.mocked(writeHook).mockRejectedValueOnce(new Error('disk full'));
    const result = await runFigmaScout({ fileId: 'abc123', page: 'Home' }, makeMockClient());
    expect(result).toBeDefined();
    expect(result.fileName).toBe('Rainmaker');
  });

  it.skipIf(!process.env['ZICO_INTEGRATION'])('live scout against Blue Tees Golf file', async () => {
    // Enable with: ZICO_INTEGRATION=1 FIGMA_TOKEN=<token> npx vitest run
    const result = await runFigmaScout({
      fileId: 'lp9w6ZIK7ghUopHyaaGHFr',
      page: 'Cover',  // update to a real page name before running
    });
    expect(result.fileName).toBeTruthy();
    expect(result.tokens).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — verify `runFigmaScout` tests fail**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts 2>&1 | grep -E "(PASS|FAIL|runFigmaScout)"
```
Expected: FAIL — `runFigmaScout` not found.

- [ ] **Step 3: Write figma-scout.ts orchestrator**

```typescript
// src/polecats/figma-scout.ts
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { writeHook, HOOK_NAMES } from '../hooks/index.js';
import { makeFigmaClient, type FigmaClient } from './figma-scout/client.js';
import { parseTokens, parseComponents, parseLayout } from './figma-scout/transform.js';
import { saveMarkdown } from './figma-scout/markdown.js';
import { ScoutError, type ScoutInput, type ScoutResult } from './figma-scout/types.js';

export { ScoutError, type ScoutInput, type ScoutResult } from './figma-scout/types.js';

export async function runFigmaScout(
  input: ScoutInput,
  client: FigmaClient = makeFigmaClient(
    input.figmaToken ?? process.env['FIGMA_TOKEN'] ?? ''
  )
): Promise<ScoutResult> {
  // 1. Get file metadata — validate page exists (fail-fast)
  const meta = await client.getFileMeta(input.fileId);
  const pageRef = meta.document.children.find(p => p.name === input.page);
  if (!pageRef) {
    const available = meta.document.children.map(p => p.name).join(', ');
    throw new ScoutError(
      `Page "${input.page}" not found in file "${meta.name}". Available: ${available}`
    );
  }

  // 2. Get design tokens (fail-fast)
  const variables = await client.getVariables(input.fileId);
  const tokens = parseTokens(variables);

  // 3. Get design context (fail-fast)
  const pageNode = await client.getPageNode(input.fileId, pageRef.id);
  const components = parseComponents(pageNode);
  const layout = parseLayout(pageNode);

  // Compute output paths
  const scoutedAt = new Date().toISOString();
  const datePrefix = scoutedAt.slice(0, 10);
  const safePage = input.page.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const markdownPath = `docs/scouts/${datePrefix}-${input.fileId}-${safePage}.md`;
  const screenshotDir = `hooks/screenshots`;
  const screenshotFilePath = `${screenshotDir}/${input.fileId}-${safePage}.png`;

  // 4. Screenshot (best-effort)
  let screenshotPath = '';
  try {
    const screenshotUrl = await client.getScreenshotUrl(input.fileId, pageRef.id);
    const imgRes = await fetch(screenshotUrl);
    if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    await mkdir(resolve(process.cwd(), screenshotDir), { recursive: true });
    await writeFile(resolve(process.cwd(), screenshotFilePath), buffer);
    screenshotPath = screenshotFilePath;
  } catch (err) {
    console.warn(`⚠️  Screenshot failed: ${(err as Error).message}`);
  }

  const result: ScoutResult = {
    fileId: input.fileId,
    page: input.page,
    fileName: meta.name,
    scoutedAt,
    tokens,
    components,
    layout,
    screenshotPath,
    markdownPath,
  };

  // 5. Write hook (best-effort)
  try {
    await writeHook(HOOK_NAMES.DESIGN_LOG, {
      source: 'figma-scout',
      action: 'scout',
      data: result,
    });
  } catch (err) {
    console.warn(`⚠️  Hook write failed: ${(err as Error).message}`);
  }

  // 6. Write markdown spec (best-effort)
  try {
    await saveMarkdown(result);
  } catch (err) {
    console.warn(`⚠️  Markdown write failed: ${(err as Error).message}`);
  }

  return result;
}
```

- [ ] **Step 4: Run orchestrator tests — verify they pass**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | grep -E "(✓|✗|runFigmaScout)"
```
Expected: 5 PASS (integration test is skipped unless `ZICO_INTEGRATION=1`).

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/nitinsauran/zico && npx vitest run src/polecats/figma-scout.test.ts --reporter=verbose 2>&1 | tail -10
```
Expected: all tests pass, 0 failures.

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/nitinsauran/zico && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/polecats/figma-scout.ts src/polecats/figma-scout.test.ts && git commit -m "feat(figma-scout): add runFigmaScout orchestrator with tests"
```

---

## Chunk 3: CLI Wiring

### Task 6: Add `zico scout` command

**Files:**
- Modify: `src/cli/index.ts`

The existing `index.ts` switch statement needs a new `scout` case. `parseInput()` already extracts Figma file IDs from URLs.

- [ ] **Step 1: Add the scout command import**

In `src/cli/index.ts`, add the import at the top (after existing imports):

```typescript
import { runFigmaScout, ScoutError } from '../polecats/figma-scout.js';
```

- [ ] **Step 2: Add `scout` case to the switch**

In the `switch (command)` block, add before `default:`:

```typescript
    case 'scout':
      await cmdScout(args);
      break;
```

- [ ] **Step 3: Add `cmdScout` function**

Add after the `cmdCost` function and before the final `main().catch(console.error)` line:

```typescript
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
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/nitinsauran/zico && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Smoke test — missing args**

```bash
cd /Users/nitinsauran/zico && npx tsx src/cli/index.ts scout 2>&1
```
Expected output contains:
```
Usage: zico scout <figma-url-or-file-id> --page "Page Name"
```

- [ ] **Step 6: Smoke test — missing --page**

```bash
cd /Users/nitinsauran/zico && npx tsx src/cli/index.ts scout https://www.figma.com/design/lp9w6ZIK7ghUopHyaaGHFr/Rainmaker 2>&1
```
Expected output contains:
```
Error: --page is required.
```

- [ ] **Step 7: Smoke test — --btg shortcut (no token, expect API error)**

First ensure no token is set: `unset FIGMA_TOKEN`

```bash
cd /Users/nitinsauran/zico && npx tsx src/cli/index.ts scout --btg --page "Home" 2>&1
```
Expected: output contains `Figma API error` (HTTP 403 — confirms routing and client wiring are correct).

- [ ] **Step 8: Run full test suite one final time**

```bash
cd /Users/nitinsauran/zico && npx vitest run --reporter=verbose 2>&1 | tail -15
```
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/nitinsauran/zico && git add src/cli/index.ts && git commit -m "feat(figma-scout): wire zico scout CLI command"
```

---

## Done

figma-scout is complete when:
- `npx vitest run` passes all tests
- `npx tsc --noEmit` reports no errors
- `zico scout` (no args) prints usage
- `zico scout <url> --page "..."` (no `FIGMA_TOKEN`) reports an API error (not a crash)
- `hooks/design-log.json` gets a new entry after a live run
- `docs/scouts/` gets a markdown file after a live run
