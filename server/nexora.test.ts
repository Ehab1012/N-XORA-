import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import {
  PRODUCT_NAME,
  PRODUCT_STYLIZED_NAME,
  ROLES,
  MS_PER_DAY,
  calculateDaysLate,
  calculateTaskPoints,
} from '../shared/const.js';
import { db } from './db.js';
import { createSession, getSession, destroySession, authMiddleware } from './auth.js';
import { apiRouter } from './api.js';
import {
  calculateProjectAnalytics,
  generateProjectMarkdownReport,
  calculateUserOverallScore,
} from './analytics.js';
import { buildAttachmentParts, resolveModelName } from './gemini.js';
import {
  AiActorContext,
  buildRoleAwareSystemContext,
  executeAiToolCall,
  getAiFunctionDeclarationsForRole,
} from './aiTools.js';

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

    // Check transparent score formula integrity across every member on the leaderboard
    for (const scorer of analytics.leaderboard) {
      const expected =
        scorer.breakdown.tasksScore +
        scorer.breakdown.milestonesScore +
        scorer.breakdown.proofsScore +
        scorer.breakdown.onTimeScore +
        (scorer.breakdown.groupTasksScore || 0) +
        (scorer.breakdown.groupBonusScore || 0) +
        (scorer.breakdown.directBonusScore || 0) -
        (scorer.breakdown.memberPenaltyDeduction || 0);
      expect(scorer.totalScore).toBe(expected);
    }
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

  it('allows leader to award bonus points to co-leader and members', () => {
    const leaderToken = createSession('usr_owner', 'ws_default');
    const leaderSession = getSession(leaderToken);
    expect(leaderSession?.role).toBe(ROLES.LEADER);

    const coLeaderUser = db.getRawData().users.find((u) => u.role === ROLES.CO_LEADER);
    const memberUser = db.getRawData().users.find((u) => u.role === ROLES.MEMBER);
    expect(coLeaderUser).toBeDefined();
    expect(memberUser).toBeDefined();

    // Leader awards bonus to Co-leader
    db.mutate((d) => {
      if (!Array.isArray(d.bonusAwards)) d.bonusAwards = [];
      d.bonusAwards.push({
        id: 'ba_test_coleader',
        workspaceId: 'ws_default',
        recipientId: coLeaderUser!.id,
        recipientName: coLeaderUser!.name,
        awardedById: leaderSession!.user.id,
        awardedByName: leaderSession!.user.name,
        points: 75,
        reason: 'Exemplary Co-Leadership & Coordination',
        createdAt: new Date().toISOString(),
      });

      // Leader awards bonus to Member
      d.bonusAwards.push({
        id: 'ba_test_member',
        workspaceId: 'ws_default',
        recipientId: memberUser!.id,
        recipientName: memberUser!.name,
        awardedById: leaderSession!.user.id,
        awardedByName: leaderSession!.user.name,
        points: 50,
        reason: 'High-Velocity Zero-Defect Delivery',
        createdAt: new Date().toISOString(),
      });

      // Leader awards bonus to himself
      d.bonusAwards.push({
        id: 'ba_test_leader_self',
        workspaceId: 'ws_default',
        recipientId: leaderSession!.user.id,
        recipientName: leaderSession!.user.name,
        awardedById: leaderSession!.user.id,
        awardedByName: leaderSession!.user.name,
        points: 100,
        reason: 'Principal Architecture & Milestone Direction',
        createdAt: new Date().toISOString(),
      });
    });

    const data = db.getRawData();
    const coleaderBonus = data.bonusAwards.find((b) => b.recipientId === coLeaderUser!.id);
    const memberBonus = data.bonusAwards.find((b) => b.recipientId === memberUser!.id);
    const leaderSelfBonus = data.bonusAwards.find((b) => b.recipientId === leaderSession!.user.id);

    expect(coleaderBonus?.points).toBe(75);
    expect(memberBonus?.points).toBe(50);
    expect(leaderSelfBonus?.points).toBe(100);
  });

  it('allows co-leader to award bonus points to team members', () => {
    const coleaderUser = db.getRawData().users.find((u) => u.role === ROLES.CO_LEADER);
    expect(coleaderUser).toBeDefined();

    const coleaderToken = createSession(coleaderUser!.id, 'ws_default');
    const coleaderSession = getSession(coleaderToken);
    expect(coleaderSession?.role).toBe(ROLES.CO_LEADER);

    const memberUser = db.getRawData().users.find((u) => u.role === ROLES.MEMBER);
    expect(memberUser).toBeDefined();

    db.mutate((d) => {
      if (!Array.isArray(d.bonusAwards)) d.bonusAwards = [];
      d.bonusAwards.push({
        id: 'ba_test_coleader_to_member',
        workspaceId: 'ws_default',
        recipientId: memberUser!.id,
        recipientName: memberUser!.name,
        awardedById: coleaderSession!.user.id,
        awardedByName: coleaderSession!.user.name,
        points: 60,
        reason: 'Co-Leader Discretionary Merit Bonus',
        createdAt: new Date().toISOString(),
      });
    });

    const data = db.getRawData();
    const award = data.bonusAwards.find((b) => b.id === 'ba_test_coleader_to_member');
    expect(award).toBeDefined();
    expect(award?.points).toBe(60);
    expect(award?.awardedById).toBe(coleaderSession!.user.id);
  });

  it('eats task points each late day until 0, then deducts overflow from assigned member(s) total points', () => {
    // 1. On-time delivery awards full priority points + 15 on-time bonus
    expect(calculateTaskPoints('urgent', 0).pointsAwarded).toBe(60);
    expect(calculateTaskPoints('high', 0).pointsAwarded).toBe(40);
    expect(calculateTaskPoints('medium', 0).pointsAwarded).toBe(25);
    expect(calculateTaskPoints('low', 0).pointsAwarded).toBe(15);

    const urgentOnTime = calculateTaskPoints('urgent', false);
    expect(urgentOnTime.pointsAwarded).toBe(60);
    expect(urgentOnTime.isOnTime).toBe(true);
    expect(urgentOnTime.onTimeBonus).toBe(15);
    expect(urgentOnTime.penaltyPoints).toBe(0);
    expect(urgentOnTime.memberPointsDeducted).toBe(0);

    // 2. Progressive daily decay eats 20% of task base points per day until reaching 0 on Day 5
    const urgentDay1 = calculateTaskPoints('urgent', 1); // -12/day
    expect(urgentDay1.dailyPenaltyRate).toBe(12);
    expect(urgentDay1.pointsAwarded).toBe(48);
    expect(urgentDay1.taskPointsDeducted).toBe(12);
    expect(urgentDay1.memberPointsDeducted).toBe(0);
    expect(urgentDay1.onTimeBonus).toBe(0);

    const urgentDay3 = calculateTaskPoints('urgent', 3);
    expect(urgentDay3.pointsAwarded).toBe(24);
    expect(urgentDay3.taskPointsDeducted).toBe(36);
    expect(urgentDay3.memberPointsDeducted).toBe(0);

    const urgentDay5 = calculateTaskPoints('urgent', 5);
    expect(urgentDay5.pointsAwarded).toBe(0);
    expect(urgentDay5.taskPointsDeducted).toBe(60);
    expect(urgentDay5.memberPointsDeducted).toBe(0);

    // 3. Past Day 5, task stays at 0 and excess penalty eats out of member total points
    const urgentDay7 = calculateTaskPoints('urgent', 7);
    expect(urgentDay7.pointsAwarded).toBe(0);
    expect(urgentDay7.taskPointsDeducted).toBe(60);
    expect(urgentDay7.memberPointsDeducted).toBe(24); // 2 extra days * 12/day
    expect(urgentDay7.penaltyPoints).toBe(84);

    // Verify all other priorities follow the exact same 2-stage progression
    expect(calculateTaskPoints('high', 2)).toMatchObject({
      pointsAwarded: 24,
      taskPointsDeducted: 16,
      memberPointsDeducted: 0,
    });
    expect(calculateTaskPoints('high', 6)).toMatchObject({
      pointsAwarded: 0,
      taskPointsDeducted: 40,
      memberPointsDeducted: 8,
    });
    expect(calculateTaskPoints('medium', 6)).toMatchObject({
      pointsAwarded: 0,
      taskPointsDeducted: 25,
      memberPointsDeducted: 5,
    });
    expect(calculateTaskPoints('low', 7)).toMatchObject({
      pointsAwarded: 0,
      taskPointsDeducted: 15,
      memberPointsDeducted: 6,
    });

    // Verify calculateDaysLate ceiling behavior
    const due = '2026-06-01T12:00:00.000Z';
    expect(calculateDaysLate(due, '2026-06-01T12:00:00.000Z')).toBe(0);
    expect(calculateDaysLate(due, new Date(new Date(due).getTime() + 2 * 3600_000).toISOString())).toBe(1);
    expect(calculateDaysLate(due, new Date(new Date(due).getTime() + 5 * MS_PER_DAY).toISOString())).toBe(5);
  });

  it('deducts overflow late penalties from single assignee and multi-member group assignees total scores', () => {
    const baselineMemberScore = calculateUserOverallScore('usr_member', 'ws_default').totalScore;
    const baselineCoLeaderScore = calculateUserOverallScore('usr_coleader', 'ws_default').totalScore;
    const baselineLeaderScore = calculateUserOverallScore('usr_leader', 'ws_default').totalScore;

    // 1. Add an Urgent task (60 pts, -12/day) for usr_member that is 3 days overdue:
    //    Eats 36 task points (24 task pts left), 0 overflow -> usr_member totalScore must NOT drop yet
    const threeDaysAgoIso = new Date(Date.now() - 2.5 * MS_PER_DAY).toISOString(); // ceil(2.5) = 3 days late
    db.mutate((d) => {
      d.tasks.push({
        id: 'task_penalty_stage1',
        projectId: 'proj_aurora',
        title: 'Stage 1 Task Point Decay Check',
        description: '3 days late urgent task',
        assigneeId: 'usr_member',
        creatorId: 'usr_leader',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: threeDaysAgoIso,
        tags: [],
        checklist: [],
        createdAt: threeDaysAgoIso,
        updatedAt: threeDaysAgoIso,
      });
    });

    const afterStage1 = calculateUserOverallScore('usr_member', 'ws_default');
    expect(afterStage1.totalScore).toBe(baselineMemberScore);

    // 2. Shift that task to 8 days overdue (ceil(7.5) = 8 days late -> 96 penalty = 60 task pts + 36 member overflow):
    //    usr_member's totalScore must drop by 36 while overdue, and freeze at -36 when completed!
    const eightDaysAgoIso = new Date(Date.now() - 7.5 * MS_PER_DAY).toISOString();
    db.mutate((d) => {
      const t = d.tasks.find((item) => item.id === 'task_penalty_stage1')!;
      t.dueDate = eightDaysAgoIso;
    });

    const afterStage2Active = calculateUserOverallScore('usr_member', 'ws_default');
    expect(afterStage2Active.totalScore).toBe(baselineMemberScore - 36);

    // Mark complete at current timestamp -> locks 0 task points and -36 member overflow
    db.mutate((d) => {
      const t = d.tasks.find((item) => item.id === 'task_penalty_stage1')!;
      t.status = 'complete';
      t.completedAt = new Date().toISOString();
      t.isLate = true;
      t.daysLate = 8;
      t.pointsAwarded = 0;
      t.latePenaltyApplied = 60;
      t.memberPenaltyApplied = 36;
    });

    const afterStage2Completed = calculateUserOverallScore('usr_member', 'ws_default');
    expect(afterStage2Completed.totalScore).toBe(baselineMemberScore - 36);

    // 3. Add an overdue multi-member group task (individualPoints: 35, -7/day) that is 7 days late (ceil(6.5) = 7 days):
    //    Total penalty = 49 -> 35 task pts eaten + 14 overflow per overdue member.
    //    - usr_leader submitted on time -> earns +35 pts, 0 penalty!
    //    - usr_member & usr_coleader have NOT submitted -> BOTH lose 14 pts from their totalScore!
    const sevenDaysAgoIso = new Date(Date.now() - 6.5 * MS_PER_DAY).toISOString();
    const onTimeSubIso = new Date(Date.now() - 7 * MS_PER_DAY).toISOString();
    db.mutate((d) => {
      d.tasks.push({
        id: 'task_group_penalty_overflow',
        projectId: 'proj_aurora',
        title: 'Multi-Member Group Overflow Check',
        description: 'Collaborative task with 1 on-time member and 2 overdue members',
        creatorId: 'usr_leader',
        status: 'in_progress',
        priority: 'high',
        dueDate: sevenDaysAgoIso,
        tags: [],
        checklist: [],
        createdAt: onTimeSubIso,
        updatedAt: onTimeSubIso,
        isGroupTask: true,
        participantIds: ['usr_leader', 'usr_member', 'usr_coleader'],
        individualPoints: 35,
        groupBonusPoints: 60,
        submissions: [
          {
            id: 'gsub_leader_ontime',
            taskId: 'task_group_penalty_overflow',
            userId: 'usr_leader',
            status: 'submitted',
            submittedAt: onTimeSubIso,
            pointsAwarded: 35,
            isLate: false,
            daysLate: 0,
            latePenaltyApplied: 0,
            memberPenaltyApplied: 0,
          },
        ],
      });
    });

    const finalLeader = calculateUserOverallScore('usr_leader', 'ws_default');
    const finalMember = calculateUserOverallScore('usr_member', 'ws_default');
    const finalCoLeader = calculateUserOverallScore('usr_coleader', 'ws_default');

    expect(finalLeader.totalScore).toBe(baselineLeaderScore + 35);
    expect(finalMember.totalScore).toBe(baselineMemberScore - 36 - 14);
    expect(finalCoLeader.totalScore).toBe(baselineCoLeaderScore - 14);
  });

  it('allows only leader and co-leader to delete tasks and blocks regular members with 403', async () => {
    const app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use('/api', apiRouter);

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${port}`;

      const leaderToken = createSession('usr_leader', 'ws_default');
      const coLeaderToken = createSession('usr_coleader', 'ws_default');
      const memberToken = createSession('usr_member', 'ws_default');

      const tasksBefore = db.getRawData().tasks;
      expect(tasksBefore.length).toBeGreaterThanOrEqual(2);
      const firstTaskId = tasksBefore[0].id;
      const secondTaskId = tasksBefore[1].id;

      // 1. Unauthenticated user -> 401
      const unauthRes = await fetch(`${baseUrl}/api/tasks/${firstTaskId}`, {
        method: 'DELETE',
      });
      expect(unauthRes.status).toBe(401);

      // 2. Regular member -> 403 Forbidden (task must NOT be deleted)
      const memberRes = await fetch(`${baseUrl}/api/tasks/${firstTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      expect(memberRes.status).toBe(403);
      expect(db.getRawData().tasks.some((t) => t.id === firstTaskId)).toBe(true);

      // 3. Leader -> 200 OK (task deleted + associated proofs cleaned up)
      const leaderRes = await fetch(`${baseUrl}/api/tasks/${firstTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      expect(leaderRes.status).toBe(200);
      const leaderBody = await leaderRes.json();
      expect(leaderBody).toEqual({ success: true, deletedId: firstTaskId });
      expect(db.getRawData().tasks.some((t) => t.id === firstTaskId)).toBe(false);
      expect(db.getRawData().proofSubmissions.some((p) => p.taskId === firstTaskId)).toBe(false);

      // 4. Co-Leader -> 200 OK (task deleted)
      const coLeaderRes = await fetch(`${baseUrl}/api/tasks/${secondTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${coLeaderToken}` },
      });
      expect(coLeaderRes.status).toBe(200);
      const coLeaderBody = await coLeaderRes.json();
      expect(coLeaderBody).toEqual({ success: true, deletedId: secondTaskId });
      expect(db.getRawData().tasks.some((t) => t.id === secondTaskId)).toBe(false);

      // 5. Deleting already deleted / non-existent task -> 404
      const missingRes = await fetch(`${baseUrl}/api/tasks/${secondTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      expect(missingRes.status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('builds multimodal Gemini parts for pictures, PDFs, SVG diagrams, spreadsheets, and source code files', () => {
    expect(resolveModelName('flash')).toBe('gemini-3.8-flash');
    expect(resolveModelName('pro')).toBe('gemini-3.1-pro-preview');
    expect(resolveModelName('fast')).toBe('gemini-3.1-flash-lite');

    const pngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
    const pdfBase64 = Buffer.from('%PDF-1.7 sample Sprint Roadmap').toString('base64');
    const tsSourceBase64 = Buffer.from('export const sprintVelocity = 42;\n').toString('base64');
    const csvBase64 = Buffer.from('task,owner,points\nAuth Audit,Alex,60\n').toString('base64');
    const svgBase64 = Buffer.from('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>').toString('base64');

    const parts = buildAttachmentParts([
      {
        id: 'att_img_1',
        name: 'architecture-screenshot.jpg',
        mimeType: 'image/jpg',
        sizeBytes: 1024,
        kind: 'image',
        dataUrl: `data:image/jpg;base64,${pngBase64}`,
      },
      {
        id: 'att_pdf_1',
        name: 'sprint-spec.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        kind: 'file',
        dataUrl: `data:application/pdf;base64,${pdfBase64}`,
      },
      {
        id: 'att_ts_1',
        name: 'scoring.ts',
        // Simulate browser misclassifying .ts as MPEG transport stream
        mimeType: 'video/mp2t',
        sizeBytes: 128,
        kind: 'file',
        dataUrl: `data:video/mp2t;base64,${tsSourceBase64}`,
      },
      {
        id: 'att_csv_1',
        name: 'velocity.csv',
        mimeType: 'text/csv',
        sizeBytes: 256,
        kind: 'file',
        dataUrl: `data:text/csv;base64,${csvBase64}`,
      },
      {
        id: 'att_svg_1',
        name: 'system-flow.svg',
        mimeType: 'image/svg+xml',
        sizeBytes: 256,
        kind: 'image',
        dataUrl: `data:image/svg+xml;base64,${svgBase64}`,
      },
    ]);

    // Normalized JPEG inlineData part exists
    const imageInline = parts.find((p) => p.inlineData?.mimeType === 'image/jpeg');
    expect(imageInline).toBeDefined();
    expect(imageInline?.inlineData?.data).toBe(pngBase64);

    // PDF inlineData part exists
    const pdfInline = parts.find((p) => p.inlineData?.mimeType === 'application/pdf');
    expect(pdfInline).toBeDefined();
    expect(pdfInline?.inlineData?.data).toBe(pdfBase64);

    // .ts file was decoded as text rather than sent as broken video/mp2t inlineData
    expect(parts.some((p) => p.inlineData?.mimeType === 'video/mp2t')).toBe(false);
    expect(parts.some((p) => p.text?.includes('export const sprintVelocity = 42;'))).toBe(true);

    // CSV and SVG decoded cleanly into structured text parts
    expect(parts.some((p) => p.text?.includes('Auth Audit,Alex,60'))).toBe(true);
    expect(parts.some((p) => p.text?.includes('<circle cx="50" cy="50" r="40" />'))).toBe(true);
  });

  it('uploads AI chat attachments and validates /api/ai/chat multimodal payloads', async () => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(authMiddleware);
    app.use('/api', apiRouter);

    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${port}`;
      const memberToken = createSession('usr_member', 'ws_default');

      // 1. Empty prompt with no attachments -> 400 Bad Request
      const emptyChatRes = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '   ', attachments: [] }],
        }),
      });
      expect(emptyChatRes.status).toBe(400);

      // 2. Upload an image attachment via /api/files/upload and retrieve via /api/files/:id/content
      const sampleText = 'Milestone,Status\nAlpha,Completed\n';
      const dataUrl = `data:text/csv;base64,${Buffer.from(sampleText, 'utf-8').toString('base64')}`;

      const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'milestones.csv',
          mimeType: 'text/csv',
          dataUrl,
        }),
      });
      expect(uploadRes.status).toBe(201);
      const uploaded = await uploadRes.json();
      expect(uploaded.id).toMatch(/^file_/);

      const contentRes = await fetch(`${baseUrl}/api/files/${uploaded.id}/content`);
      expect(contentRes.status).toBe(200);
      expect(contentRes.headers.get('content-type')).toContain('text/csv');
      const downloadedText = await contentRes.text();
      expect(downloadedText).toBe(sampleText);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('exposes only role-appropriate AI function tools for leader, co-leader, and member accounts', () => {
    const data = db.getRawData();
    const workspace = data.workspaces[0];
    const leaderUser = data.users.find((u) => u.id === 'usr_leader')!;
    const coLeaderUser = data.users.find((u) => u.id === 'usr_coleader')!;
    const memberUser = data.users.find((u) => u.id === 'usr_member')!;

    const leaderTools = getAiFunctionDeclarationsForRole({
      user: leaderUser,
      role: 'leader',
      workspace,
      activeProjectId: 'proj_aurora',
    }).map((t) => t.name);

    const coLeaderTools = getAiFunctionDeclarationsForRole({
      user: coLeaderUser,
      role: 'co-leader',
      workspace,
      activeProjectId: 'proj_aurora',
    }).map((t) => t.name);

    const memberTools = getAiFunctionDeclarationsForRole({
      user: memberUser,
      role: 'member',
      workspace,
      activeProjectId: 'proj_aurora',
    }).map((t) => t.name);

    // Leader gets full operational + squad administration tools
    expect(leaderTools).toContain('create_task');
    expect(leaderTools).toContain('assign_task_to_members');
    expect(leaderTools).toContain('delete_task');
    expect(leaderTools).toContain('manage_milestone');
    expect(leaderTools).toContain('review_proof_submission');
    expect(leaderTools).toContain('award_merit_bonus');
    expect(leaderTools).toContain('manage_project_member');
    expect(leaderTools).toContain('update_member_rank');
    expect(leaderTools).toContain('manage_squad_team');

    // Co-Leader gets operational leadership tools, but NOT leader-only squad deletion/administration
    expect(coLeaderTools).toContain('create_task');
    expect(coLeaderTools).toContain('assign_task_to_members');
    expect(coLeaderTools).toContain('delete_task');
    expect(coLeaderTools).toContain('award_merit_bonus');
    expect(coLeaderTools).not.toContain('manage_squad_team');

    // Member gets ONLY individual contributor tools — zero delegation, deletion, milestone, bonus, or rank tools
    expect(memberTools).toEqual([
      'get_workspace_snapshot',
      'create_task',
      'update_task',
      'submit_task_proof',
      'send_workspace_message',
      'update_my_profile',
    ]);
  });

  it('allows leader and co-leader AI to assign tasks to members while strictly blocking member AI from assigning tasks or executing leader actions', async () => {
    const data = db.getRawData();
    const workspace = data.workspaces[0];
    const leaderActor: AiActorContext = {
      user: data.users.find((u) => u.id === 'usr_leader')!,
      role: 'leader',
      workspace,
      activeProjectId: 'proj_aurora',
    };
    const coLeaderActor: AiActorContext = {
      user: data.users.find((u) => u.id === 'usr_coleader')!,
      role: 'co-leader',
      workspace,
      activeProjectId: 'proj_aurora',
    };
    const memberActor: AiActorContext = {
      user: data.users.find((u) => u.id === 'usr_member')!,
      role: 'member',
      workspace,
      activeProjectId: 'proj_aurora',
    };

    // 1. Leader AI assigns a high-priority task to Alex Rivera (Member) by natural name
    const leaderAssignOut = await executeAiToolCall(
      'create_task',
      {
        project: 'Aurora Protocol',
        title: 'Harden Enclave Key Rotation',
        description: 'Implement automated 24h key rotation schedule',
        assignee: 'Alex Rivera',
        priority: 'high',
        dueDate: '+5d',
      },
      leaderActor
    );
    expect(leaderAssignOut.actionRecord.success).toBe(true);
    expect(leaderAssignOut.toolResponse.success).toBe(true);

    const createdLeaderTaskId = (leaderAssignOut.toolResponse.task as any).id;
    const storedTask = db.getRawData().tasks.find((t) => t.id === createdLeaderTaskId);
    expect(storedTask).toBeDefined();
    expect(storedTask?.assigneeId).toBe('usr_member');
    expect(storedTask?.priority).toBe('high');

    // Verify notification was generated for Alex Rivera
    const memberNotif = db
      .getRawData()
      .notifications.find((n) => n.userId === 'usr_member' && n.link?.includes(createdLeaderTaskId));
    expect(memberNotif).toBeDefined();

    // 2. Co-Leader AI creates a collaborative group task for Alex Rivera and Marcus Chen
    const coLeaderGroupOut = await executeAiToolCall(
      'create_task',
      {
        project: 'proj_aurora',
        title: 'Joint Failover Chaos Drill',
        isGroupTask: true,
        participants: ['Alex Rivera', 'Marcus Chen'],
        individualPoints: 40,
        groupBonusPoints: 70,
      },
      coLeaderActor
    );
    expect(coLeaderGroupOut.actionRecord.success).toBe(true);
    const groupTaskId = (coLeaderGroupOut.toolResponse.task as any).id;
    const storedGroupTask = db.getRawData().tasks.find((t) => t.id === groupTaskId);
    expect(storedGroupTask?.isGroupTask).toBe(true);
    expect(storedGroupTask?.participantIds).toEqual(['usr_member', 'usr_leader']);

    // 3. Member AI attempts to assign a task to Sarah Jenkins -> STRICTLY BLOCKED (zero tasks created)
    const tasksCountBeforeMemberAttempt = db.getRawData().tasks.length;
    const memberAssignOtherOut = await executeAiToolCall(
      'create_task',
      {
        project: 'proj_aurora',
        title: 'Unauthorized Delegated Task',
        assignee: 'Sarah Jenkins',
        priority: 'urgent',
      },
      memberActor
    );
    expect(memberAssignOtherOut.actionRecord.success).toBe(false);
    expect(memberAssignOtherOut.actionRecord.permissionDenied).toBe(true);
    expect(memberAssignOtherOut.toolResponse.permissionDenied).toBe(true);
    expect(db.getRawData().tasks.length).toBe(tasksCountBeforeMemberAttempt);

    // 4. Member AI attempts to create a collaborative group task -> STRICTLY BLOCKED
    const memberGroupAttempt = await executeAiToolCall(
      'create_task',
      {
        project: 'proj_aurora',
        title: 'Unauthorized Group Mission',
        isGroupTask: true,
        participants: ['Alex Rivera', 'Sarah Jenkins'],
      },
      memberActor
    );
    expect(memberGroupAttempt.actionRecord.permissionDenied).toBe(true);
    expect(db.getRawData().tasks.length).toBe(tasksCountBeforeMemberAttempt);

    // 5. Member AI attempts privileged tools directly (defense-in-depth Layer 2) -> ALL BLOCKED
    const blockedAssignExisting = await executeAiToolCall(
      'assign_task_to_members',
      { task: createdLeaderTaskId, assignee: 'Sarah Jenkins' },
      memberActor
    );
    expect(blockedAssignExisting.actionRecord.permissionDenied).toBe(true);

    const blockedReassignViaUpdate = await executeAiToolCall(
      'update_task',
      { task: createdLeaderTaskId, assignee: 'Sarah Jenkins' },
      memberActor
    );
    expect(blockedReassignViaUpdate.actionRecord.permissionDenied).toBe(true);
    expect(db.getRawData().tasks.find((t) => t.id === createdLeaderTaskId)?.assigneeId).toBe('usr_member');

    const blockedDelete = await executeAiToolCall(
      'delete_task',
      { task: createdLeaderTaskId },
      memberActor
    );
    expect(blockedDelete.actionRecord.permissionDenied).toBe(true);
    expect(db.getRawData().tasks.some((t) => t.id === createdLeaderTaskId)).toBe(true);

    const blockedBonus = await executeAiToolCall(
      'award_merit_bonus',
      { recipient: 'Alex Rivera', points: 100, reason: 'Self bonus attempt' },
      memberActor
    );
    expect(blockedBonus.actionRecord.permissionDenied).toBe(true);

    const blockedMilestone = await executeAiToolCall(
      'manage_milestone',
      { action: 'create', project: 'proj_aurora', title: 'Unauthorized Milestone' },
      memberActor
    );
    expect(blockedMilestone.actionRecord.permissionDenied).toBe(true);

    const blockedRank = await executeAiToolCall(
      'update_member_rank',
      { member: 'Sarah Jenkins', newRole: 'leader' },
      memberActor
    );
    expect(blockedRank.actionRecord.permissionDenied).toBe(true);

    // Co-Leader cannot modify a Leader's rank or delete squads
    const coLeaderDemoteLeader = await executeAiToolCall(
      'update_member_rank',
      { member: 'Marcus Chen', newRole: 'member' },
      coLeaderActor
    );
    expect(coLeaderDemoteLeader.actionRecord.permissionDenied).toBe(true);

    const coLeaderSquadAdmin = await executeAiToolCall(
      'manage_squad_team',
      { action: 'delete', team: 'team_platform' },
      coLeaderActor
    );
    expect(coLeaderSquadAdmin.actionRecord.permissionDenied).toBe(true);

    // 6. Member AI CAN perform legitimate Member-permitted actions on their own account!
    // 6a. Create a personal task for themselves
    const memberSelfTaskOut = await executeAiToolCall(
      'create_task',
      {
        project: 'proj_aurora',
        title: 'Write IPC Benchmark Suite',
        priority: 'medium',
      },
      memberActor
    );
    expect(memberSelfTaskOut.actionRecord.success).toBe(true);
    const selfTaskId = (memberSelfTaskOut.toolResponse.task as any).id;
    expect(db.getRawData().tasks.find((t) => t.id === selfTaskId)?.assigneeId).toBe('usr_member');

    // 6b. Update status on their own assigned task, while being blocked from editing another member's task
    const ownStatusUpdate = await executeAiToolCall(
      'update_task',
      { task: createdLeaderTaskId, status: 'in_progress' },
      memberActor
    );
    expect(ownStatusUpdate.actionRecord.success).toBe(true);
    expect(db.getRawData().tasks.find((t) => t.id === createdLeaderTaskId)?.status).toBe('in_progress');

    // Create a task assigned exclusively to Sarah Jenkins, verify Member cannot see or modify it
    const sarahOnlyOut = await executeAiToolCall(
      'create_task',
      {
        project: 'proj_aurora',
        title: 'Confidential Compliance Matrix',
        assignee: 'Sarah Jenkins',
      },
      leaderActor
    );
    const sarahTaskId = (sarahOnlyOut.toolResponse.task as any).id;

    const memberSnapshot = await executeAiToolCall('get_workspace_snapshot', {}, memberActor);
    const memberVisibleTaskIds = ((memberSnapshot.toolResponse.tasks as any[]) || []).map((t) => t.id);
    expect(memberVisibleTaskIds).toContain(createdLeaderTaskId);
    expect(memberVisibleTaskIds).toContain(selfTaskId);
    expect(memberVisibleTaskIds).not.toContain(sarahTaskId);

    const memberSystemPrompt = buildRoleAwareSystemContext(memberActor);
    expect(memberSystemPrompt).toContain('Harden Enclave Key Rotation');
    expect(memberSystemPrompt).not.toContain('Confidential Compliance Matrix');

    const memberTouchSarahTask = await executeAiToolCall(
      'update_task',
      { task: sarahTaskId, status: 'complete' },
      memberActor
    );
    expect(memberTouchSarahTask.actionRecord.permissionDenied).toBe(true);

    // 6c. Member AI submits proof of work for their task, then Leader AI approves it!
    const submitProofOut = await executeAiToolCall(
      'submit_task_proof',
      {
        task: createdLeaderTaskId,
        explanation: 'Implemented 24h enclave key rotation with zero downtime.',
        links: ['https://nexora.internal/pr/412'],
      },
      memberActor
    );
    expect(submitProofOut.actionRecord.success).toBe(true);
    expect(db.getRawData().tasks.find((t) => t.id === createdLeaderTaskId)?.status).toBe('in_review');

    const leaderReviewOut = await executeAiToolCall(
      'review_proof_submission',
      {
        proofOrTask: createdLeaderTaskId,
        decision: 'approved',
        reason: 'Verified rotation telemetry and unit tests.',
      },
      leaderActor
    );
    expect(leaderReviewOut.actionRecord.success).toBe(true);
    expect(db.getRawData().tasks.find((t) => t.id === createdLeaderTaskId)?.status).toBe('complete');

    // 7. Leader AI deletes a task cleanly
    const leaderDeleteOut = await executeAiToolCall(
      'delete_task',
      { task: sarahTaskId },
      leaderActor
    );
    expect(leaderDeleteOut.actionRecord.success).toBe(true);
    expect(db.getRawData().tasks.some((t) => t.id === sarahTaskId)).toBe(false);
  });
});
