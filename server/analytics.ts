import { db } from './db.js';
import { ProjectAnalytics, UserScoreDetail } from '../shared/types.js';
import {
  calculateDaysLate,
  calculateTaskPoints,
  TASK_PRIORITY_POINTS,
  LATE_DAILY_PENALTY_PERCENTAGE,
} from '../shared/const.js';

export function calculateProjectAnalytics(projectId: string): ProjectAnalytics {
  const data = db.getRawData();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const tasks = data.tasks.filter((t) => t.projectId === projectId);
  const milestones = data.milestones.filter((m) => m.projectId === projectId);
  const proofs = data.proofSubmissions.filter((p) => p.projectId === projectId);
  const activities = data.activityEvents
    .filter((a) => a.projectId === projectId)
    .slice(0, 20);

  // Track pending proof submission timestamps so in-review tasks turned in on time aren't penalized while awaiting review
  const pendingProofTimeByTaskId = new Map<string, string>();
  for (const pr of proofs) {
    if (pr.status === 'pending' && pr.taskId && pr.createdAt) {
      const existing = pendingProofTimeByTaskId.get(pr.taskId);
      if (!existing || pr.createdAt > existing) {
        pendingProofTimeByTaskId.set(pr.taskId, pr.createdAt);
      }
    }
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'complete').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;

  const nowIso = new Date().toISOString();
  const atRiskTasks = tasks.filter((t) => {
    if (t.status === 'complete' || t.status === 'cancelled') return false;
    const refTime =
      t.status === 'in_review' && pendingProofTimeByTaskId.has(t.id)
        ? pendingProofTimeByTaskId.get(t.id)!
        : nowIso;
    return calculateDaysLate(t.dueDate, refTime) > 0;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  const totalProofs = proofs.length;
  const approvedProofs = proofs.filter((p) => p.status === 'approved').length;
  const pendingProofs = proofs.filter((p) => p.status === 'pending').length;

  // Determine overall health status
  let healthStatus: 'healthy' | 'at_risk' | 'critical' | 'completed' = 'healthy';
  if (completedTasks === totalTasks && totalTasks > 0) {
    healthStatus = 'completed';
  } else if (blockedTasks > 0 || atRiskTasks >= 2) {
    healthStatus = 'critical';
  } else if (atRiskTasks > 0 || project.status === 'at_risk') {
    healthStatus = 'at_risk';
  }

  // Calculate transparent member score breakdown with progressive daily late penalty:
  // - Each late day deducts 20% of task base points until task points reach 0
  // - Once task points reach 0, each additional late day deducts directly from assigned member(s)' totalScore
  const memberScoresMap = new Map<string, UserScoreDetail>();
  const userMap = new Map(data.users.map((u) => [u.id, u]));

  for (const memberId of project.memberIds) {
    const user = userMap.get(memberId);
    if (!user) continue;

    memberScoresMap.set(memberId, {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl,
      role: user.role,
      totalScore: 0,
      breakdown: {
        tasksCompleted: 0,
        tasksScore: 0,
        milestonesCompleted: 0,
        milestonesScore: 0,
        proofsApproved: 0,
        proofsScore: 0,
        onTimeDeliveries: 0,
        onTimeScore: 0,
        lateDeliveries: 0,
        overdueTasksCount: 0,
        latePenaltyScore: 0,
        memberPenaltyDeduction: 0,
        groupTasksCompleted: 0,
        groupTasksScore: 0,
        groupBonusCount: 0,
        groupBonusScore: 0,
      },
    });
  }

  // 1. Tasks (Individual & Collaborative Group Tasks)
  for (const task of tasks) {
    if (task.isGroupTask) {
      const baseIndiv = task.individualPoints || TASK_PRIORITY_POINTS[task.priority] || 35;
      const assignedParticipants = new Set<string>(
        Array.isArray(task.participantIds) && task.participantIds.length > 0
          ? task.participantIds
          : task.assigneeId
          ? [task.assigneeId]
          : []
      );
      if (Array.isArray(task.submissions)) {
        for (const s of task.submissions) {
          if (s.userId) assignedParticipants.add(s.userId);
        }
      }

      for (const pId of assignedParticipants) {
        if (!memberScoresMap.has(pId)) continue;
        const score = memberScoresMap.get(pId)!;
        const sub = Array.isArray(task.submissions)
          ? task.submissions.find((s) => s.userId === pId)
          : undefined;
        const hasSubmitted = Boolean(sub && (sub.status === 'submitted' || sub.status === 'approved'));

        if (hasSubmitted && sub) {
          score.breakdown.groupTasksCompleted = (score.breakdown.groupTasksCompleted || 0) + 1;
          const daysLate =
            typeof sub.daysLate === 'number'
              ? sub.daysLate
              : sub.submittedAt && task.dueDate
              ? calculateDaysLate(task.dueDate, sub.submittedAt)
              : sub.isLate
              ? 1
              : 0;

          const calc = calculateTaskPoints(task.priority, daysLate, baseIndiv);
          score.breakdown.groupTasksScore = (score.breakdown.groupTasksScore || 0) + calc.pointsAwarded;

          if (daysLate > 0) {
            score.breakdown.lateDeliveries = (score.breakdown.lateDeliveries || 0) + 1;
            score.breakdown.latePenaltyScore = (score.breakdown.latePenaltyScore || 0) + calc.penaltyPoints;
            score.breakdown.memberPenaltyDeduction =
              (score.breakdown.memberPenaltyDeduction || 0) + calc.memberPointsDeducted;
          }
        } else if (task.status !== 'cancelled') {
          const refDate = task.status === 'complete' ? task.completedAt || nowIso : nowIso;
          const daysLate = calculateDaysLate(task.dueDate, refDate);
          if (daysLate > 0) {
            const calc = calculateTaskPoints(task.priority, daysLate, baseIndiv);
            if (task.status === 'complete') {
              score.breakdown.lateDeliveries = (score.breakdown.lateDeliveries || 0) + 1;
            } else {
              score.breakdown.overdueTasksCount = (score.breakdown.overdueTasksCount || 0) + 1;
            }
            score.breakdown.latePenaltyScore = (score.breakdown.latePenaltyScore || 0) + calc.penaltyPoints;
            score.breakdown.memberPenaltyDeduction =
              (score.breakdown.memberPenaltyDeduction || 0) + calc.memberPointsDeducted;
          }
        }
      }

      // Group collective completion bonus (awarded to all participants when group task is finalized)
      if (task.status === 'complete' || task.bonusAwarded) {
        const participants = Array.isArray(task.participantIds) ? task.participantIds : [];
        for (const pId of participants) {
          if (memberScoresMap.has(pId)) {
            const score = memberScoresMap.get(pId)!;
            score.breakdown.groupBonusCount = (score.breakdown.groupBonusCount || 0) + 1;
            const bonus = task.groupBonusPoints || 60;
            score.breakdown.groupBonusScore = (score.breakdown.groupBonusScore || 0) + bonus;
          }
        }
      }
    } else {
      // Standard task (supports single assignee or multiple assigned participantIds if provided)
      const targetAssignees = Array.from(
        new Set<string>(
          [
            ...(task.assigneeId ? [task.assigneeId] : []),
            ...(Array.isArray(task.participantIds) ? task.participantIds : []),
          ].filter(Boolean)
        )
      );

      if (task.status === 'complete') {
        const daysLate =
          typeof task.daysLate === 'number'
            ? task.daysLate
            : task.completedAt && task.dueDate
            ? calculateDaysLate(task.dueDate, task.completedAt)
            : task.isLate
            ? 1
            : 0;

        const pointCalc = calculateTaskPoints(task.priority, daysLate);

        for (const uid of targetAssignees) {
          if (!memberScoresMap.has(uid)) continue;
          const score = memberScoresMap.get(uid)!;
          score.breakdown.tasksCompleted += 1;
          score.breakdown.tasksScore += pointCalc.pointsAwarded;

          if (daysLate === 0 && task.completedAt && task.dueDate) {
            score.breakdown.onTimeDeliveries += 1;
            score.breakdown.onTimeScore += pointCalc.onTimeBonus;
          } else if (daysLate > 0) {
            score.breakdown.lateDeliveries = (score.breakdown.lateDeliveries || 0) + 1;
            score.breakdown.latePenaltyScore =
              (score.breakdown.latePenaltyScore || 0) + pointCalc.penaltyPoints;
            score.breakdown.memberPenaltyDeduction =
              (score.breakdown.memberPenaltyDeduction || 0) + pointCalc.memberPointsDeducted;
          }
        }
      } else if (task.status !== 'cancelled') {
        const refTime =
          task.status === 'in_review' && pendingProofTimeByTaskId.has(task.id)
            ? pendingProofTimeByTaskId.get(task.id)!
            : nowIso;
        const daysLate = calculateDaysLate(task.dueDate, refTime);

        if (daysLate > 0) {
          const pointCalc = calculateTaskPoints(task.priority, daysLate);
          for (const uid of targetAssignees) {
            if (!memberScoresMap.has(uid)) continue;
            const score = memberScoresMap.get(uid)!;
            score.breakdown.overdueTasksCount = (score.breakdown.overdueTasksCount || 0) + 1;
            score.breakdown.latePenaltyScore =
              (score.breakdown.latePenaltyScore || 0) + pointCalc.penaltyPoints;
            score.breakdown.memberPenaltyDeduction =
              (score.breakdown.memberPenaltyDeduction || 0) + pointCalc.memberPointsDeducted;
          }
        }
      }
    }
  }

  // 2. Milestones
  for (const ms of milestones) {
    if (ms.status === 'completed' && ms.ownerId && memberScoresMap.has(ms.ownerId)) {
      const score = memberScoresMap.get(ms.ownerId)!;
      score.breakdown.milestonesCompleted += 1;
      score.breakdown.milestonesScore += 50;
    }
  }

  // 3. Proofs
  for (const pr of proofs) {
    if (pr.status === 'approved' && memberScoresMap.has(pr.submittedById)) {
      const score = memberScoresMap.get(pr.submittedById)!;
      score.breakdown.proofsApproved += 1;
      score.breakdown.proofsScore += 40;
    }
  }

  // 4. Leader Discretionary Merit Bonuses
  const bonusAwards = Array.isArray(data.bonusAwards) ? data.bonusAwards : [];
  for (const ba of bonusAwards) {
    if (memberScoresMap.has(ba.recipientId)) {
      if (!ba.projectId || ba.projectId === projectId) {
        const score = memberScoresMap.get(ba.recipientId)!;
        score.breakdown.directBonusCount = (score.breakdown.directBonusCount || 0) + 1;
        score.breakdown.directBonusScore = (score.breakdown.directBonusScore || 0) + ba.points;
        if (!score.bonusAwards) score.bonusAwards = [];
        score.bonusAwards.push(ba);
      }
    }
  }

  // Tally total scores (subtracting overflow penalties once task points reached 0)
  const leaderboard: UserScoreDetail[] = [];
  for (const score of memberScoresMap.values()) {
    const groupPts = (score.breakdown.groupTasksScore || 0) + (score.breakdown.groupBonusScore || 0);
    const directBonusPts = score.breakdown.directBonusScore || 0;
    const memberPenaltyDeduction = score.breakdown.memberPenaltyDeduction || 0;

    score.totalScore =
      score.breakdown.tasksScore +
      score.breakdown.milestonesScore +
      score.breakdown.proofsScore +
      score.breakdown.onTimeScore +
      groupPts +
      directBonusPts -
      memberPenaltyDeduction;

    score.tasksCompleted = score.breakdown.tasksCompleted;
    score.milestonesCompleted = score.breakdown.milestonesCompleted;
    score.proofsApproved = score.breakdown.proofsApproved;
    score.onTimeDeliveries = score.breakdown.onTimeDeliveries;
    score.lateDeliveries = score.breakdown.lateDeliveries || 0;
    score.overdueTasksCount = score.breakdown.overdueTasksCount || 0;
    score.latePenaltyScore = score.breakdown.latePenaltyScore || 0;
    score.memberPenaltyDeduction = memberPenaltyDeduction;
    score.groupTasksCompleted = score.breakdown.groupTasksCompleted;
    score.groupBonusCount = score.breakdown.groupBonusCount;
    score.directBonusCount = score.breakdown.directBonusCount || 0;
    score.directBonusScore = directBonusPts;
    score.userRole = score.role;
    leaderboard.push(score);
  }

  // Sort descending by score
  leaderboard.sort((a, b) => b.totalScore - a.totalScore);

  return {
    projectId,
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    atRiskTasks,
    overdueTasks: atRiskTasks,
    completionRate,
    totalMilestones,
    completedMilestones,
    totalProofs,
    approvedProofs,
    pendingProofs,
    healthStatus,
    leaderboard,
    recentActivities: activities,
  };
}

export function generateProjectMarkdownReport(projectId: string): string {
  const data = db.getRawData();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found');

  const analytics = calculateProjectAnalytics(projectId);
  const tasks = data.tasks.filter((t) => t.projectId === projectId);
  const milestones = data.milestones.filter((m) => m.projectId === projectId);

  return `# Nexora Workspace - Verified Project Report
**Project:** ${project.title}
**Status:** ${project.status.toUpperCase()}
**Deadline:** ${new Date(project.deadline).toLocaleDateString()}
**Generated At:** ${new Date().toUTCString()}

---

## Executive Health Summary
- Overall Health: **${analytics.healthStatus.toUpperCase()}**
- Task Completion Rate: **${analytics.completionRate}%** (${analytics.completedTasks}/${analytics.totalTasks} completed)
- Active Blockers: **${analytics.blockedTasks}**
- Overdue / At-Risk Tasks: **${analytics.atRiskTasks}**
- Milestones Delivered: **${analytics.completedMilestones}/${analytics.totalMilestones}**
- Verified Proof of Work Approvals: **${analytics.approvedProofs}/${analytics.totalProofs}** (${analytics.pendingProofs} pending review)

---

## Key Milestones
${milestones.map((m) => `- [${m.status === 'completed' ? 'x' : ' '}] **${m.title}** (Due: ${new Date(m.dueDate).toLocaleDateString()}) - Status: ${m.status}`).join('\n')}

---

## Task Roster
${tasks.map((t) => `- [${t.status === 'complete' ? 'x' : ' '}] **${t.title}** (${t.priority.toUpperCase()}${t.isGroupTask ? ' | GROUP TASK' : ''}) - Assigned: ${t.isGroupTask ? `${(t.participantIds || []).length} participants` : (data.users.find((u) => u.id === t.assigneeId)?.name || 'Unassigned')} - Status: ${t.status}`).join('\n')}

---

## Transparent Member Accountability Leaderboard
Scoring formula: Priority-weighted Tasks (Urgent: +60 pts, High: +40 pts, Medium: +25 pts, Low: +15 pts), On-Time Delivery (+15 pts), Daily Late Penalty (-${LATE_DAILY_PENALTY_PERCENTAGE}%/day of task points until 0, then excess daily penalty deducts from assigned member(s) total score), Group Submissions (+pts), Team Completion Bonus (+pts), Milestone (+50 pts), Approved Proof (+40 pts), Discretionary Merit Bonus.

| Member | Role | Total Score | Tasks Done | Group Tasks | Proofs Approved | Milestones | On-Time | Late / Overdue (Score Drain) |
|---|---|---|---|---|---|---|---|---|
${analytics.leaderboard.map((l) => `| ${l.userName} | ${l.role} | **${l.totalScore}** | ${l.breakdown.tasksCompleted} | ${l.breakdown.groupTasksCompleted || 0} (${(l.breakdown.groupTasksScore || 0) + (l.breakdown.groupBonusScore || 0)} pts) | ${l.breakdown.proofsApproved} | ${l.breakdown.milestonesCompleted} | ${l.breakdown.onTimeDeliveries} | ${(l.breakdown.lateDeliveries || 0) + (l.breakdown.overdueTasksCount || 0)} (-${l.breakdown.latePenaltyScore || 0} total${(l.breakdown.memberPenaltyDeduction || 0) > 0 ? `, -${l.breakdown.memberPenaltyDeduction} from score` : ''}) |`).join('\n')}

---
*Report generated securely by Nexora Operational Platform.*
`;
}

/**
 * Calculate transparent overall merit score for all workspace members in a single indexed pass.
 * Applies daily late decay to task points until 0, then deducts overflow from assigned member(s)' totalScore.
 */
export function calculateAllWorkspaceScores(
  workspaceId: string
): Map<string, UserScoreDetail & { rank: number; totalMembers: number; tier: string }> {
  const data = db.getRawData();
  const workspaceProjects = data.projects.filter((p) => p.workspaceId === workspaceId);
  const projectIds = new Set(workspaceProjects.map((p) => p.id));
  const nowIso = new Date().toISOString();

  // Index pending proof turn-in times & approved proofs in single pass
  const pendingProofTimeByTaskId = new Map<string, string>();
  const proofsBySubmitter = new Map<string, typeof data.proofSubmissions>();

  for (const p of data.proofSubmissions) {
    if (!projectIds.has(p.projectId)) continue;
    if (p.status === 'pending' && p.taskId && p.createdAt) {
      const existing = pendingProofTimeByTaskId.get(p.taskId);
      if (!existing || p.createdAt > existing) {
        pendingProofTimeByTaskId.set(p.taskId, p.createdAt);
      }
    }
    if (p.status === 'approved') {
      let list = proofsBySubmitter.get(p.submittedById);
      if (!list) {
        list = [];
        proofsBySubmitter.set(p.submittedById, list);
      }
      list.push(p);
    }
  }

  // Index standard tasks by assigned member(s) and collect group tasks in single pass
  const tasksByAssignee = new Map<string, typeof data.tasks>();
  const workspaceGroupTasks: typeof data.tasks = [];

  for (const t of data.tasks) {
    if (!projectIds.has(t.projectId)) continue;
    if (t.isGroupTask) {
      workspaceGroupTasks.push(t);
    } else {
      const targetAssignees = Array.from(
        new Set<string>(
          [
            ...(t.assigneeId ? [t.assigneeId] : []),
            ...(Array.isArray(t.participantIds) ? t.participantIds : []),
          ].filter(Boolean)
        )
      );
      for (const uid of targetAssignees) {
        let list = tasksByAssignee.get(uid);
        if (!list) {
          list = [];
          tasksByAssignee.set(uid, list);
        }
        list.push(t);
      }
    }
  }

  // Index milestones by owner in single pass
  const milestonesByOwner = new Map<string, typeof data.milestones>();
  for (const m of data.milestones) {
    if (m.status === 'completed' && m.ownerId && projectIds.has(m.projectId)) {
      let list = milestonesByOwner.get(m.ownerId);
      if (!list) {
        list = [];
        milestonesByOwner.set(m.ownerId, list);
      }
      list.push(m);
    }
  }

  // Index bonus awards by recipient in single pass
  const bonusAwardsByRecipient = new Map<string, typeof data.bonusAwards>();
  const bonusAwards = Array.isArray(data.bonusAwards) ? data.bonusAwards : [];
  for (const ba of bonusAwards) {
    let list = bonusAwardsByRecipient.get(ba.recipientId);
    if (!list) {
      list = [];
      bonusAwardsByRecipient.set(ba.recipientId, list);
    }
    list.push(ba);
  }

  const scoresByUserId = new Map<string, UserScoreDetail>();

  // Process all users in O(U) time using indexed lookups
  for (const u of data.users) {
    const assignedTasks = tasksByAssignee.get(u.id) || [];

    let tasksCompleted = 0;
    let onTimeDeliveries = 0;
    let onTimeScore = 0;
    let lateDeliveries = 0;
    let overdueTasksCount = 0;
    let latePenaltyScore = 0;
    let memberPenaltyDeduction = 0;
    let tasksScore = 0;

    for (const t of assignedTasks) {
      if (t.status === 'complete') {
        tasksCompleted += 1;
        const daysLate =
          typeof t.daysLate === 'number'
            ? t.daysLate
            : t.completedAt && t.dueDate
            ? calculateDaysLate(t.dueDate, t.completedAt)
            : t.isLate
            ? 1
            : 0;

        const pointCalc = calculateTaskPoints(t.priority, daysLate);
        tasksScore += pointCalc.pointsAwarded;

        if (daysLate === 0 && t.completedAt && t.dueDate) {
          onTimeDeliveries += 1;
          onTimeScore += pointCalc.onTimeBonus;
        } else if (daysLate > 0) {
          lateDeliveries += 1;
          latePenaltyScore += pointCalc.penaltyPoints;
          memberPenaltyDeduction += pointCalc.memberPointsDeducted;
        }
      } else if (t.status !== 'cancelled') {
        const refTime =
          t.status === 'in_review' && pendingProofTimeByTaskId.has(t.id)
            ? pendingProofTimeByTaskId.get(t.id)!
            : nowIso;
        const daysLate = calculateDaysLate(t.dueDate, refTime);
        if (daysLate > 0) {
          const pointCalc = calculateTaskPoints(t.priority, daysLate);
          overdueTasksCount += 1;
          latePenaltyScore += pointCalc.penaltyPoints;
          memberPenaltyDeduction += pointCalc.memberPointsDeducted;
        }
      }
    }

    let groupTasksCompleted = 0;
    let groupTasksScore = 0;
    let groupBonusCount = 0;
    let groupBonusScore = 0;

    for (const gt of workspaceGroupTasks) {
      const baseIndiv = gt.individualPoints || TASK_PRIORITY_POINTS[gt.priority] || 35;
      const isAssignedParticipant =
        (Array.isArray(gt.participantIds) && gt.participantIds.includes(u.id)) ||
        gt.assigneeId === u.id ||
        (Array.isArray(gt.submissions) && gt.submissions.some((s) => s.userId === u.id));

      if (isAssignedParticipant) {
        const sub = Array.isArray(gt.submissions)
          ? gt.submissions.find((s) => s.userId === u.id)
          : undefined;
        const hasSubmitted = Boolean(sub && (sub.status === 'submitted' || sub.status === 'approved'));

        if (hasSubmitted && sub) {
          groupTasksCompleted += 1;
          const daysLate =
            typeof sub.daysLate === 'number'
              ? sub.daysLate
              : sub.submittedAt && gt.dueDate
              ? calculateDaysLate(gt.dueDate, sub.submittedAt)
              : sub.isLate
              ? 1
              : 0;

          const calc = calculateTaskPoints(gt.priority, daysLate, baseIndiv);
          groupTasksScore += calc.pointsAwarded;

          if (daysLate > 0) {
            lateDeliveries += 1;
            latePenaltyScore += calc.penaltyPoints;
            memberPenaltyDeduction += calc.memberPointsDeducted;
          }
        } else if (gt.status !== 'cancelled') {
          const refDate = gt.status === 'complete' ? gt.completedAt || nowIso : nowIso;
          const daysLate = calculateDaysLate(gt.dueDate, refDate);
          if (daysLate > 0) {
            const calc = calculateTaskPoints(gt.priority, daysLate, baseIndiv);
            if (gt.status === 'complete') {
              lateDeliveries += 1;
            } else {
              overdueTasksCount += 1;
            }
            latePenaltyScore += calc.penaltyPoints;
            memberPenaltyDeduction += calc.memberPointsDeducted;
          }
        }
      }

      if (
        (gt.status === 'complete' || gt.bonusAwarded) &&
        Array.isArray(gt.participantIds) &&
        gt.participantIds.includes(u.id)
      ) {
        groupBonusCount += 1;
        groupBonusScore += gt.groupBonusPoints || 60;
      }
    }

    const userMilestones = milestonesByOwner.get(u.id) || [];
    const userProofs = proofsBySubmitter.get(u.id) || [];
    const userBonusAwards = bonusAwardsByRecipient.get(u.id) || [];

    const directBonusCount = userBonusAwards.length;
    const directBonusScore = userBonusAwards.reduce((sum, ba) => sum + (ba.points || 0), 0);

    const milestonesCompleted = userMilestones.length;
    const milestonesScore = milestonesCompleted * 50;
    const proofsApproved = userProofs.length;
    const proofsScore = proofsApproved * 40;

    const totalScore =
      tasksScore +
      onTimeScore +
      milestonesScore +
      proofsScore +
      groupTasksScore +
      groupBonusScore +
      directBonusScore -
      memberPenaltyDeduction;

    scoresByUserId.set(u.id, {
      userId: u.id,
      userName: u.name,
      userAvatar: u.avatarUrl,
      role: u.role,
      userRole: u.role,
      totalScore,
      tasksCompleted,
      milestonesCompleted,
      proofsApproved,
      onTimeDeliveries,
      lateDeliveries,
      overdueTasksCount,
      latePenaltyScore,
      memberPenaltyDeduction,
      groupTasksCompleted,
      groupBonusCount,
      directBonusCount,
      directBonusScore,
      bonusAwards: userBonusAwards,
      breakdown: {
        tasksCompleted,
        tasksScore,
        milestonesCompleted,
        milestonesScore,
        proofsApproved,
        proofsScore,
        onTimeDeliveries,
        onTimeScore,
        lateDeliveries,
        overdueTasksCount,
        latePenaltyScore,
        memberPenaltyDeduction,
        groupTasksCompleted,
        groupTasksScore,
        groupBonusCount,
        groupBonusScore,
        directBonusCount,
        directBonusScore,
      },
    });
  }

  // Sort scores descending to determine rank
  const sorted = Array.from(scoresByUserId.values()).sort((a, b) => b.totalScore - a.totalScore);
  const resultMap = new Map<string, UserScoreDetail & { rank: number; totalMembers: number; tier: string }>();

  sorted.forEach((userScore, idx) => {
    let tier = 'Bronze Contributor';
    if (userScore.totalScore >= 500) {
      tier = 'Platinum Titan';
    } else if (userScore.totalScore >= 250) {
      tier = 'Gold Master';
    } else if (userScore.totalScore >= 100) {
      tier = 'Silver Specialist';
    }

    resultMap.set(userScore.userId, {
      ...userScore,
      rank: idx + 1,
      totalMembers: data.users.length,
      tier,
    });
  });

  return resultMap;
}

/**
 * Calculate transparent overall merit score for an individual workspace member
 */
export function calculateUserOverallScore(
  userId: string,
  workspaceId: string
): UserScoreDetail & { rank: number; totalMembers: number; tier: string } {
  const scoresMap = calculateAllWorkspaceScores(workspaceId);
  const userScore = scoresMap.get(userId);
  if (!userScore) {
    const data = db.getRawData();
    const targetUser = data.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('User not found');
    return {
      userId,
      userName: targetUser.name,
      userAvatar: targetUser.avatarUrl,
      role: targetUser.role,
      userRole: targetUser.role,
      totalScore: 0,
      tasksCompleted: 0,
      milestonesCompleted: 0,
      proofsApproved: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      overdueTasksCount: 0,
      latePenaltyScore: 0,
      memberPenaltyDeduction: 0,
      groupTasksCompleted: 0,
      groupBonusCount: 0,
      directBonusCount: 0,
      directBonusScore: 0,
      breakdown: {
        tasksCompleted: 0,
        tasksScore: 0,
        milestonesCompleted: 0,
        milestonesScore: 0,
        proofsApproved: 0,
        proofsScore: 0,
        onTimeDeliveries: 0,
        onTimeScore: 0,
        lateDeliveries: 0,
        overdueTasksCount: 0,
        latePenaltyScore: 0,
        memberPenaltyDeduction: 0,
        groupTasksCompleted: 0,
        groupTasksScore: 0,
        groupBonusCount: 0,
        groupBonusScore: 0,
        directBonusCount: 0,
        directBonusScore: 0,
      },
      rank: data.users.length,
      totalMembers: data.users.length,
      tier: 'Bronze Contributor',
    };
  }
  return userScore;
}

export function calculateWorkspaceLeaderboard(
  userId: string,
  workspaceId: string = 'ws_default'
): UserScoreDetail & { rank: number; totalMembers: number; tier: string } {
  return calculateUserOverallScore(userId, workspaceId);
}
