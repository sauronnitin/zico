/**
 * Permission Gate — Enforces AUTO / GATED / BLOCKED action categories
 * 
 * Every action Zico takes passes through this gate before execution.
 */

export type PermissionLevel = 'AUTO' | 'GATED' | 'BLOCKED';

export interface ActionRequest {
  action: string;
  polecat: string;
  description: string;
  mcpTool?: string;
}

export interface GateResult {
  allowed: boolean;
  level: PermissionLevel;
  reason: string;
  requiresApproval?: boolean;
}

// ── Action Classification ────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /delete/i, /remove\s+(all|everything)/i, /drop\s+table/i,
  /credential/i, /password/i, /secret/i, /access.?control/i,
  /share\s+(credential|secret|key)/i,
];

const GATED_PATTERNS = [
  /send\s+(message|email|slack)/i, /post\s+comment/i,
  /update\s+(ticket|issue|status)/i, /push\s+to\s+github/i,
  /publish/i, /create\s+issue/i, /save_issue/i, /save_comment/i,
];

const GATED_MCP_TOOLS = [
  'Linear:save_issue', 'Linear:save_comment', 'Linear:save_project',
  'Gmail:send', 'Gmail:draft',
];

// ── Gate Logic ───────────────────────────────────────────────────────

export function checkPermission(request: ActionRequest): GateResult {
  // Check BLOCKED first — these never pass
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(request.action) || pattern.test(request.description)) {
      return {
        allowed: false,
        level: 'BLOCKED',
        reason: `Action blocked: matches restricted pattern. Zico never ${request.action}.`,
      };
    }
  }

  // Check GATED — requires explicit user approval
  if (request.mcpTool && GATED_MCP_TOOLS.includes(request.mcpTool)) {
    return {
      allowed: false,
      level: 'GATED',
      reason: `MCP tool "${request.mcpTool}" requires approval before execution.`,
      requiresApproval: true,
    };
  }

  for (const pattern of GATED_PATTERNS) {
    if (pattern.test(request.action) || pattern.test(request.description)) {
      return {
        allowed: false,
        level: 'GATED',
        reason: `Action "${request.action}" requires your approval before execution.`,
        requiresApproval: true,
      };
    }
  }

  // Everything else is AUTO
  return {
    allowed: true,
    level: 'AUTO',
    reason: 'Read-only or local operation — auto-approved.',
  };
}

// ── Approval Flow ────────────────────────────────────────────────────

export interface ApprovalRequest {
  action: ActionRequest;
  gateResult: GateResult;
  timestamp: Date;
}

const pendingApprovals: ApprovalRequest[] = [];

export function requestApproval(action: ActionRequest): ApprovalRequest {
  const gateResult = checkPermission(action);
  const request: ApprovalRequest = { action, gateResult, timestamp: new Date() };

  if (gateResult.requiresApproval) {
    pendingApprovals.push(request);
  }

  return request;
}

export function getPendingApprovals(): ApprovalRequest[] {
  return [...pendingApprovals];
}

export function approveAction(index: number): boolean {
  if (index >= 0 && index < pendingApprovals.length) {
    pendingApprovals.splice(index, 1);
    return true;
  }
  return false;
}
