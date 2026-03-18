import { describe, it, expect } from 'vitest';
import { parseTokens, parseComponents, parseLayout } from './figma-scout/transform.js';
import { buildMarkdown } from './figma-scout/markdown.js';
import type { FigmaVariablesResponse, FigmaNode, ScoutResult } from './figma-scout/types.js';

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
