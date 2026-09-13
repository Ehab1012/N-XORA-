export const PRODUCT_NAME = 'NΞXORA';
export const PRODUCT_STYLIZED_NAME = 'NΞXORA';
export const PRODUCT_TAGLINE = 'Secure Collaboration Workspace';
export const PRODUCT_DESCRIPTION =
  'A secure collaboration workspace for coordinated project work, role-aware access, proof of work, and accountability.';

export const ROLES = {
  LEADER: 'leader',
  CO_LEADER: 'co-leader',
  MEMBER: 'member',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'complete',
  'cancelled',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PROJECT_STATUSES = [
  'planned',
  'active',
  'at_risk',
  'paused',
  'complete',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROOF_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
] as const;

export type ProofStatus = (typeof PROOF_STATUSES)[number];

export const RESOURCE_CATEGORIES = [
  'documentation',
  'design',
  'specification',
  'credentials_vault',
  'deliverable',
  'link',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];
