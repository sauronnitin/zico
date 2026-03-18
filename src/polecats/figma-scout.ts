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
