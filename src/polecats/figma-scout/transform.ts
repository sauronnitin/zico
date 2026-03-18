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

// ── parseComponents ──────────────────────────────────────────────────

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

// ── parseLayout ──────────────────────────────────────────────────────

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
