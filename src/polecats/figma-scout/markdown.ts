// src/polecats/figma-scout/markdown.ts
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { ScoutResult } from './types.js';

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
