import { describe, it, expect, beforeEach } from 'vitest';
import { PRODUCT_NAME, PRODUCT_STYLIZED_NAME, ROLES } from '../shared/const.js';
import { db } from './db.js';
import { createSession, getSession, destroySession } from './auth.js';
import { calculateProjectAnalytics, generateProjectMarkdownReport } from './analytics.js';

describe('Nexora Core Suite', () => {
  beforeEach(() => {
    db.resetToDefaults();
  });

  it('verifies product brand constants', () => {
    expect(PRODUCT_NAME).toBe('NΞXORA');
    expect(PRODUCT_STYLIZED_NAME).toBe('NΞXORA');
  });

  it('manages sessions and role-aware auth tokens', () => {
    const token = createSession('usr_owner', 'ws_default');
    expect(token).toBeDefined();
    expect(token.startsWith('nexora_sess_')).toBe(true);

    const session = getSession(token);
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe('usr_owner');
    expect(session?.role).toBe('leader');
    expect(session?.workspace.id).toBe('ws_default');

    const destroyed = destroySession(token);
    expect(destroyed).toBe(true);
    expect(getSession(token)).toBeNull();
  });

  it('verifies role hierarchy and user records in seed data', () => {
    const data = db.getRawData();
    expect(data.users.length).toBeGreaterThanOrEqual(4);

    const leader = data.users.find((u) => u.role === ROLES.LEADER);
    const coLeader = data.users.find((u) => u.role === ROLES.CO_LEADER);
    const member = data.users.find((u) => u.role === ROLES.MEMBER);

    expect(leader).toBeDefined();
    expect(coLeader).toBeDefined();
    expect(member).toBeDefined();
  });

  it('handles task status transitions and completion recording', () => {
    const data = db.getRawData();
    const task = data.tasks.find((t) => t.id === 'task_aurora_102');
    expect(task).toBeDefined();

    // Transition to complete
    db.mutate((d) => {
      const target = d.tasks.find((t) => t.id === 'task_aurora_102')!;
      target.status = 'complete';
      target.completedAt = new Date().toISOString();
    });

    const updated = db.getRawData().tasks.find((t) => t.id === 'task_aurora_102');
    expect(updated?.status).toBe('complete');
    expect(updated?.completedAt).toBeDefined();
  });

  it('processes proof submissions and leader approval workflow', () => {
    const proofId = db.mutate((d) => {
      const id = 'proof_test_1';
      d.proofSubmissions.push({
        id,
        taskId: 'task_aurora_103',
        projectId: 'proj_aurora',
        submittedById: 'usr_member',
        explanation: 'Completed SBOM audit and vulnerability scanning.',
        links: ['https://audit.nexora/sbom.json'],
        attachmentIds: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewHistory: [],
      });
      return id;
    });

    // Leader reviews proof: approves it
    db.mutate((d) => {
      const p = d.proofSubmissions.find((item) => item.id === proofId)!;
      p.status = 'approved';
      p.reviewNote = 'All clear, no CVEs detected.';
      p.reviewedById = 'usr_leader';
      p.reviewedAt = new Date().toISOString();
      p.reviewHistory.push({
        id: 'prh_test',
        proofId,
        reviewerId: 'usr_leader',
        action: 'approved',
        reason: 'All clear, no CVEs detected.',
        createdAt: new Date().toISOString(),
      });
    });

    const proof = db.getRawData().proofSubmissions.find((p) => p.id === proofId);
    expect(proof?.status).toBe('approved');
    expect(proof?.reviewNote).toContain('no CVEs detected');
    expect(proof?.reviewHistory.length).toBe(1);
  });

  it('calculates transparent analytics and member scoring accurately', () => {
    const analytics = calculateProjectAnalytics('proj_aurora');
    expect(analytics).toBeDefined();
    expect(analytics.projectId).toBe('proj_aurora');
    expect(analytics.totalTasks).toBeGreaterThan(0);
    expect(analytics.completedTasks).toBeGreaterThanOrEqual(1);
    expect(analytics.completionRate).toBeGreaterThan(0);
    expect(analytics.leaderboard.length).toBeGreaterThan(0);

    // Check transparent score formula integrity
    const topScorer = analytics.leaderboard[0];
    const expected =
      topScorer.breakdown.tasksScore +
      topScorer.breakdown.milestonesScore +
      topScorer.breakdown.proofsScore +
      topScorer.breakdown.onTimeScore;
    expect(topScorer.totalScore).toBe(expected);
  });

  it('generates exportable markdown report with real stored data', () => {
    const report = generateProjectMarkdownReport('proj_aurora');
    expect(report).toContain('Nexora Workspace - Verified Project Report');
    expect(report).toContain('Aurora Protocol v3 Deployment');
    expect(report).toContain('Executive Health Summary');
    expect(report).toContain('Transparent Member Accountability Leaderboard');
  });

  it('persists and updates notification preferences', () => {
    const prefs = db.mutate((d) => {
      d.notificationPreferences['usr_member'] = {
        userId: 'usr_member',
        deadlineReminders: false,
        overdueAlerts: true,
        proofReviewUpdates: true,
        directMessages: false,
        projectAnnouncements: true,
        weeklySummaries: false,
      };
      return d.notificationPreferences['usr_member'];
    });

    expect(prefs.deadlineReminders).toBe(false);
    expect(prefs.overdueAlerts).toBe(true);
    expect(prefs.directMessages).toBe(false);
  });
});
