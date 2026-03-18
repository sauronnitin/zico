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
