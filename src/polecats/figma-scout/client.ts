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
