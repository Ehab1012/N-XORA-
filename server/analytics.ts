import { db } from './db.js';
import { ProjectAnalytics, UserScoreDetail, ActivityEvent } from '../shared/types.js';

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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'complete').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;

  const now = new Date().toISOString();
  const atRiskTasks = tasks.filter(
    (t) => t.status !== 'complete' && t.status !== 'cancelled' && t.dueDate < now
  ).length;

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

  // Calculate transparent member score breakdown
  // Transparent Scoring Rules:
  // - Completed task: +25 pts
  // - Completed milestone owned: +50 pts
  // - Approved proof of work: +40 pts
  // - On-time task completion (completedAt <= dueDate): +15 pts bonus
  const memberScoresMap = new Map<string, UserScoreDetail>();

  // Initialize for all project members
  for (const memberId of project.memberIds) {
    const user = data.users.find((u) => u.id === memberId);
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
        groupTasksCompleted: 0,
        groupTasksScore: 0,
        groupBonusCount: 0,
        groupBonusScore: 0,
      },
    });
  }

  // 1. Tasks (Individual & Group Tasks)
  for (const task of tasks) {
    if (task.isGroupTask) {
      // Individual submissions within group task
      if (Array.isArray(task.submissions)) {
        for (const sub of task.submissions) {
          if ((sub.status === 'submitted' || sub.status === 'approved') && memberScoresMap.has(sub.userId)) {
            const score = memberScoresMap.get(sub.userId)!;
            score.breakdown.groupTasksCompleted = (score.breakdown.groupTasksCompleted || 0) + 1;
            const pts = sub.pointsAwarded || task.individualPoints || 35;
            score.breakdown.groupTasksScore = (score.breakdown.groupTasksScore || 0) + pts;
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
      // Standard individual task
      if (task.status === 'complete' && task.assigneeId && memberScoresMap.has(task.assigneeId)) {
        const score = memberScoresMap.get(task.assigneeId)!;
        score.breakdown.tasksCompleted += 1;
        score.breakdown.tasksScore += 25;

        if (task.completedAt && task.dueDate && task.completedAt <= task.dueDate) {
          score.breakdown.onTimeDeliveries += 1;
          score.breakdown.onTimeScore += 15;
        }
      }
    }
  }

  // 2. Milestones
  for (const ms of milestones) {
    if (ms.status === 'completed' && memberScoresMap.has(ms.ownerId)) {
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

  // Tally total scores
  const leaderboard: UserScoreDetail[] = [];
  for (const score of memberScoresMap.values()) {
    const groupPts = (score.breakdown.groupTasksScore || 0) + (score.breakdown.groupBonusScore || 0);
    score.totalScore =
      score.breakdown.tasksScore +
      score.breakdown.milestonesScore +
      score.breakdown.proofsScore +
      score.breakdown.onTimeScore +
      groupPts;
    score.tasksCompleted = score.breakdown.tasksCompleted;
    score.milestonesCompleted = score.breakdown.milestonesCompleted;
    score.proofsApproved = score.breakdown.proofsApproved;
    score.onTimeDeliveries = score.breakdown.onTimeDeliveries;
    score.groupTasksCompleted = score.breakdown.groupTasksCompleted;
    score.groupBonusCount = score.breakdown.groupBonusCount;
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
Scoring formula: Task (+25 pts), On-Time Bonus (+15 pts), Group Submissions (+pts), Team Completion Bonus (+pts), Milestone (+50 pts), Approved Proof (+40 pts).

| Member | Role | Total Score | Tasks Done | Group Tasks | Proofs Approved | Milestones | On-Time Deliveries |
|---|---|---|---|---|---|---|---|
${analytics.leaderboard.map((l) => `| ${l.userName} | ${l.role} | **${l.totalScore}** | ${l.breakdown.tasksCompleted} | ${l.breakdown.groupTasksCompleted || 0} (${(l.breakdown.groupTasksScore || 0) + (l.breakdown.groupBonusScore || 0)} pts) | ${l.breakdown.proofsApproved} | ${l.breakdown.milestonesCompleted} | ${l.breakdown.onTimeDeliveries} |`).join('\n')}

---
*Report generated securely by Nexora Operational Platform.*
`;
}

/**
 * Calculate transparent overall merit score for an individual workspace member
 */
export function calculateUserOverallScore(
  userId: string,
  workspaceId: string
): UserScoreDetail & { rank: number; totalMembers: number; tier: string } {
  const data = db.getRawData();
  const targetUser = data.users.find((u) => u.id === userId);
  if (!targetUser) {
    throw new Error('User not found');
  }

  // Get all projects in workspace
  const workspaceProjects = data.projects.filter((p) => p.workspaceId === workspaceId);
  const projectIds = new Set(workspaceProjects.map((p) => p.id));

  // Compute for all members in workspace to get relative rank
  const scoresByUserId = new Map<string, UserScoreDetail>();

  for (const u of data.users) {
    const userTasks = data.tasks.filter((t) => (t.assigneeId === u.id || (t.isGroupTask && t.participantIds?.includes(u.id))) && projectIds.has(t.projectId));
    const completedTasks = userTasks.filter((t) => !t.isGroupTask && t.status === 'complete');

    let onTimeDeliveries = 0;
    for (const t of completedTasks) {
      if (t.completedAt && t.dueDate && t.completedAt <= t.dueDate) {
        onTimeDeliveries += 1;
      }
    }

    let groupTasksCompleted = 0;
    let groupTasksScore = 0;
    let groupBonusCount = 0;
    let groupBonusScore = 0;

    // Evaluate group tasks
    const workspaceGroupTasks = data.tasks.filter((t) => t.isGroupTask && projectIds.has(t.projectId));
    for (const gt of workspaceGroupTasks) {
      if (Array.isArray(gt.submissions)) {
        for (const sub of gt.submissions) {
          if (sub.userId === u.id && (sub.status === 'submitted' || sub.status === 'approved')) {
            groupTasksCompleted += 1;
            groupTasksScore += sub.pointsAwarded || gt.individualPoints || 35;
          }
        }
      }
      if ((gt.status === 'complete' || gt.bonusAwarded) && Array.isArray(gt.participantIds) && gt.participantIds.includes(u.id)) {
        groupBonusCount += 1;
        groupBonusScore += gt.groupBonusPoints || 60;
      }
    }

    const userMilestones = data.milestones.filter(
      (m) => m.ownerId === u.id && m.status === 'completed' && projectIds.has(m.projectId)
    );

    const userProofs = data.proofSubmissions.filter(
      (p) => p.submittedById === u.id && p.status === 'approved' && projectIds.has(p.projectId)
    );

    const tasksCompleted = completedTasks.length;
    const tasksScore = tasksCompleted * 25;
    const onTimeScore = onTimeDeliveries * 15;
    const milestonesCompleted = userMilestones.length;
    const milestonesScore = milestonesCompleted * 50;
    const proofsApproved = userProofs.length;
    const proofsScore = proofsApproved * 40;

    const totalScore = tasksScore + onTimeScore + milestonesScore + proofsScore + groupTasksScore + groupBonusScore;

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
      groupTasksCompleted,
      groupBonusCount,
      breakdown: {
        tasksCompleted,
        tasksScore,
        milestonesCompleted,
        milestonesScore,
        proofsApproved,
        proofsScore,
        onTimeDeliveries,
        onTimeScore,
        groupTasksCompleted,
        groupTasksScore,
        groupBonusCount,
        groupBonusScore,
      },
    });
  }

  // Sort all scores descending to determine rank
  const sorted = Array.from(scoresByUserId.values()).sort((a, b) => b.totalScore - a.totalScore);
  const userRankIndex = sorted.findIndex((s) => s.userId === userId);
  const rank = userRankIndex >= 0 ? userRankIndex + 1 : sorted.length;
  const userScore = scoresByUserId.get(userId)!;

  let tier = 'Bronze Contributor';
  if (userScore.totalScore >= 500) {
    tier = 'Platinum Titan';
  } else if (userScore.totalScore >= 250) {
    tier = 'Gold Master';
  } else if (userScore.totalScore >= 100) {
    tier = 'Silver Specialist';
  }

  return {
    ...userScore,
    rank,
    totalMembers: data.users.length,
    tier,
  };
}
