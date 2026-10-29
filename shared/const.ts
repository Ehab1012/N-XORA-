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

// ----------------------------------------------------
// Merit Points & Accountability Rules
// ----------------------------------------------------
export const TASK_PRIORITY_POINTS: Record<TaskPriority, number> = {
  low: 15,
  medium: 25,
  high: 40,
  urgent: 60,
};

export const ON_TIME_BONUS_POINTS = 15;
export const LATE_DAILY_PENALTY_PERCENTAGE = 20; // 20% of task base points deducted per day past due (reaches 0 in 5 days)
export const LATE_TASK_PENALTY_PERCENTAGE = LATE_DAILY_PENALTY_PERCENTAGE; // Alias kept for compatibility
export const MS_PER_DAY = 86_400_000;

export interface TaskPointCalculation {
  basePoints: number;
  dailyPenaltyRate: number;
  daysLate: number;
  pointsAwarded: number; // Remaining points of the task itself (floors at 0)
  taskPointsDeducted: number; // Points eaten out of the task itself (0 .. basePoints)
  memberPointsDeducted: number; // Excess penalty eaten out of assigned member(s) total points once task reaches 0
  penaltyPoints: number; // Total penalty = taskPointsDeducted + memberPointsDeducted
  isOnTime: boolean;
  onTimeBonus: number;
}

export function getTaskBasePoints(
  priority: TaskPriority = 'medium',
  customBasePoints?: number
): number {
  return typeof customBasePoints === 'number' && customBasePoints > 0
    ? customBasePoints
    : (TASK_PRIORITY_POINTS[priority] ?? 25);
}

export function getDailyLatePenalty(
  priority: TaskPriority = 'medium',
  customBasePoints?: number
): number {
  const basePoints = getTaskBasePoints(priority, customBasePoints);
  return Math.max(1, Math.round(basePoints * (LATE_DAILY_PENALTY_PERCENTAGE / 100)));
}

/**
 * Computes full integer days past dueDate (1 on the first 0..24h past due, 2 on 24..48h, etc.).
 * Returns 0 if on time or if dueDate is missing/invalid.
 */
export function calculateDaysLate(
  dueDate?: string | number | Date | null,
  referenceDate?: string | number | Date | null
): number {
  if (!dueDate) return 0;
  const dueMs = new Date(dueDate).getTime();
  const refMs =
    referenceDate !== undefined && referenceDate !== null
      ? new Date(referenceDate).getTime()
      : Date.now();
  if (!Number.isFinite(dueMs) || !Number.isFinite(refMs) || refMs <= dueMs) {
    return 0;
  }
  return Math.max(1, Math.ceil((refMs - dueMs) / MS_PER_DAY));
}

/**
 * Calculates merit points and daily late penalties for a task:
 * - Each late day eats `dailyPenaltyRate` (20% of basePoints) from the task's points until it reaches 0.
 * - Once the task's points reach 0, each additional late day accumulates in `memberPointsDeducted`,
 *   which eats directly out of the assigned member's (or assigned members') total points.
 */
export function calculateTaskPoints(
  priority: TaskPriority = 'medium',
  lateOrDaysLate: boolean | number = false,
  customBasePoints?: number
): TaskPointCalculation {
  const basePoints = getTaskBasePoints(priority, customBasePoints);
  const dailyPenaltyRate = getDailyLatePenalty(priority, basePoints);
  const daysLate =
    typeof lateOrDaysLate === 'number'
      ? Math.max(0, Math.floor(lateOrDaysLate))
      : lateOrDaysLate
      ? 1
      : 0;

  if (daysLate > 0) {
    const totalPenalty = daysLate * dailyPenaltyRate;
    const taskPointsDeducted = Math.min(basePoints, totalPenalty);
    const pointsAwarded = Math.max(0, basePoints - totalPenalty);
    const memberPointsDeducted = Math.max(0, totalPenalty - basePoints);

    return {
      basePoints,
      dailyPenaltyRate,
      daysLate,
      pointsAwarded,
      taskPointsDeducted,
      memberPointsDeducted,
      penaltyPoints: totalPenalty,
      isOnTime: false,
      onTimeBonus: 0,
    };
  }

  return {
    basePoints,
    dailyPenaltyRate,
    daysLate: 0,
    pointsAwarded: basePoints,
    taskPointsDeducted: 0,
    memberPointsDeducted: 0,
    penaltyPoints: 0,
    isOnTime: true,
    onTimeBonus: ON_TIME_BONUS_POINTS,
  };
}

/**
 * Evaluates task timeliness directly from dueDate and referenceDate (completedAt, submittedAt, or now).
 */
export function calculateTaskPointsByDates(params: {
  priority?: TaskPriority;
  dueDate?: string | null;
  referenceDate?: string | number | Date | null;
  customBasePoints?: number;
  fallbackDaysLate?: number;
}): TaskPointCalculation {
  const daysLate = params.dueDate
    ? calculateDaysLate(params.dueDate, params.referenceDate)
    : Math.max(0, Math.floor(params.fallbackDaysLate ?? 0));
  return calculateTaskPoints(params.priority ?? 'medium', daysLate, params.customBasePoints);
}
