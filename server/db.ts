import fs from 'fs';
import path from 'path';
import {
  User,
  Workspace,
  WorkspaceMembership,
  Team,
  Project,
  Task,
  Milestone,
  ProofSubmission,
  ResourceItem,
  ProjectMessage,
  DirectMessage,
  NotificationItem,
  NotificationPreferences,
  ActivityEvent,
  StoredFile,
  OnboardingState,
  ProjectInvitation,
} from '../shared/types.js';
import { SEED_PROJECT_FILES } from './seedFiles.js';

export interface DatabaseSchema {
  users: User[];
  workspaces: Workspace[];
  workspaceMemberships: WorkspaceMembership[];
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  proofSubmissions: ProofSubmission[];
  resources: ResourceItem[];
  projectMessages: ProjectMessage[];
  directMessages: DirectMessage[];
  notifications: NotificationItem[];
  notificationPreferences: Record<string, NotificationPreferences>;
  activityEvents: ActivityEvent[];
  files: StoredFile[];
  onboarding: Record<string, OnboardingState>;
  sessions: Record<string, { userId: string; workspaceId: string; expiresAt: number }>;
  projectInvitations: ProjectInvitation[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nexora-db.json');

const INITIAL_DATA: DatabaseSchema = {
  users: [
    {
      id: 'usr_owner',
      email: 'elena@nexora.internal',
      name: 'Elena Vance',
      role: 'owner',
      title: 'Workspace Owner & Lead Architect',
      department: 'Architecture & Zero-Trust Systems',
      location: 'San Francisco, CA (PST / UTC-8)',
      bio: 'Principal systems architect directing zero-trust operational protocols, cryptographic enclave verification, and distributed execution pipelines across engineering squads.',
      phone: '+1 (415) 890-2144',
      skills: ['Zero-Trust Architecture', 'Distributed Systems', 'Rust', 'Cryptographic Enclaves', 'Go', 'Threat Modeling', 'High-Throughput Streaming'],
      githubHandle: 'elenavance-arch',
      linkedinUrl: 'https://linkedin.com/in/elena-vance-nexora',
      timezone: 'America/Los_Angeles',
      statusMessage: '🟢 Directing Sprint 4 architecture and budget governance',
      createdAt: '2026-01-10T09:00:00.000Z',
      lastActiveAt: '2026-09-12T08:15:00.000Z',
    },
    {
      id: 'usr_leader',
      email: 'marcus@nexora.internal',
      name: 'Marcus Chen',
      role: 'leader',
      title: 'Staff Engineering Leader',
      department: 'Platform Engineering & Node Runtimes',
      location: 'Seattle, WA (PST / UTC-8)',
      bio: 'Platform squad leader managing edge proxies, high-concurrency node runtimes, and continuous integration pipelines for cryptographic deliverables.',
      phone: '+1 (206) 555-0192',
      skills: ['Edge Networking', 'Kubernetes', 'gRPC', 'Cryptographic Proofs', 'C++', 'Go', 'CI/CD Pipelines'],
      githubHandle: 'marcus-chen-ops',
      linkedinUrl: 'https://linkedin.com/in/marcus-chen-platform',
      timezone: 'America/Los_Angeles',
      statusMessage: '🟡 Reviewing cryptographic proof submissions',
      createdAt: '2026-01-15T10:30:00.000Z',
      lastActiveAt: '2026-09-12T08:20:00.000Z',
    },
    {
      id: 'usr_coleader',
      email: 'sarah@nexora.internal',
      name: 'Sarah Jenkins',
      role: 'co-leader',
      title: 'Systems & Product Co-Leader',
      department: 'Product Reliability & Compliance',
      location: 'New York, NY (EST / UTC-5)',
      bio: 'Orchestrating multi-team milestone velocity, regulatory compliance, client deliverable verification, and zero-downtime release cadences.',
      phone: '+1 (212) 555-0811',
      skills: ['SRE & Reliability', 'Milestone Orchestration', 'Risk Assessment', 'TypeScript', 'Node.js', 'PostgreSQL', 'SOC2 Compliance'],
      githubHandle: 'sjenkins-sec',
      linkedinUrl: 'https://linkedin.com/in/sarah-jenkins-gov',
      timezone: 'America/New_York',
      statusMessage: '🟢 Milestone 3 verification active',
      createdAt: '2026-02-01T11:00:00.000Z',
      lastActiveAt: '2026-09-12T07:55:00.000Z',
    },
  ],
  workspaces: [
    {
      id: 'ws_default',
      name: 'Nexora Core Operations',
      slug: 'nexora-core',
      ownerId: 'usr_owner',
      createdAt: '2026-01-10T09:00:00.000Z',
      settings: {
        allowMemberInvites: true,
        requireProofApproval: true,
        emergencyRecoveryEmail: 'security@nexora.internal',
        strictIdorChecks: true,
      },
    },
  ],
  workspaceMemberships: [
    { id: 'wm_1', workspaceId: 'ws_default', userId: 'usr_owner', role: 'owner', joinedAt: '2026-01-10T09:00:00.000Z' },
    { id: 'wm_2', workspaceId: 'ws_default', userId: 'usr_leader', role: 'leader', joinedAt: '2026-01-15T10:30:00.000Z' },
    { id: 'wm_3', workspaceId: 'ws_default', userId: 'usr_coleader', role: 'co-leader', joinedAt: '2026-02-01T11:00:00.000Z' },
  ],
  teams: [
    {
      id: 'team_platform',
      workspaceId: 'ws_default',
      name: 'Core Platform Engineering',
      description: 'Zero-trust infrastructure, distributed consensus, and edge proxy gateways.',
      leaderId: 'usr_leader',
      coLeaderId: 'usr_coleader',
      memberIds: ['usr_owner', 'usr_leader', 'usr_coleader', 'usr_member'],
      isArchived: false,
      createdAt: '2026-01-16T10:00:00.000Z',
    },
    {
      id: 'team_product',
      workspaceId: 'ws_default',
      name: 'Product Architecture & UX',
      description: 'Interface ergonomics, interaction workflows, and real-time collaboration engines.',
      leaderId: 'usr_coleader',
      memberIds: ['usr_owner', 'usr_coleader', 'usr_member'],
      isArchived: false,
      createdAt: '2026-02-05T14:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 'proj_aurora',
      workspaceId: 'ws_default',
      teamId: 'team_platform',
      title: 'Aurora Protocol v3 Deployment',
      description: 'End-to-end cryptographic verification, peer discovery, and latency optimization.',
      objectives: [
        'Cut cross-region handshakes below 12ms',
        'Verify zero-knowledge proof validity in under 35ms',
        'Complete end-to-end telemetry auditing',
      ],
      status: 'active',
      deadline: '2026-10-15T18:00:00.000Z',
      accentColor: '#8b5cf6',
      leaderId: 'usr_leader',
      coLeaderId: 'usr_coleader',
      visibility: 'workspace',
      memberIds: ['usr_owner', 'usr_leader', 'usr_coleader', 'usr_member'],
      budget: 85000,
      expenses: 32450,
      expenseItems: [
        {
          id: 'exp_1',
          projectId: 'proj_aurora',
          title: 'AWS High-Memory GPU Node Cluster',
          category: 'component',
          cost: 14500,
          date: '2026-08-15',
          status: 'bought',
          vendor: 'Amazon Web Services',
          notes: '3x g5.2xlarge instances for distributed cryptographic verification benchmarks',
          createdAt: '2026-08-15T10:00:00.000Z',
        },
        {
          id: 'exp_2',
          projectId: 'proj_aurora',
          title: 'Zero-Knowledge Cryptographic Audit',
          category: 'service',
          cost: 12500,
          date: '2026-08-28',
          status: 'completed',
          vendor: 'Trail of Bits Security',
          notes: 'Full penetration testing and formal circuit audit',
          createdAt: '2026-08-28T14:30:00.000Z',
        },
        {
          id: 'exp_3',
          projectId: 'proj_aurora',
          title: 'Hardware Cryptographic Dongles (HSM YubiKeys)',
          category: 'hardware',
          cost: 1850,
          date: '2026-09-02',
          status: 'bought',
          vendor: 'Yubico Enterprise',
          notes: '25 FIPS-compliant hardware security keys for engineering team',
          createdAt: '2026-09-02T09:15:00.000Z',
        },
        {
          id: 'exp_4',
          projectId: 'proj_aurora',
          title: 'Cloudflare Zero Trust Edge Gateway Licenses',
          category: 'software',
          cost: 3600,
          date: '2026-09-05',
          status: 'bought',
          vendor: 'Cloudflare',
          notes: 'Annual edge routing and DNS packet filter subscription',
          createdAt: '2026-09-05T11:20:00.000Z',
        },
      ],
      createdAt: '2026-02-10T11:00:00.000Z',
      updatedAt: '2026-09-11T16:00:00.000Z',
    },
    {
      id: 'proj_zerotrust',
      workspaceId: 'ws_default',
      teamId: 'team_platform',
      title: 'Zero-Trust Mesh Gateway',
      description: 'Identity-aware egress filtering, dynamic TLS certificate issuance, and session revocation.',
      objectives: [
        'Enforce mutual TLS across all microservice ingress paths',
        'Automate instant session kill switch across edge nodes',
      ],
      status: 'at_risk',
      deadline: '2026-09-20T23:59:59.000Z',
      accentColor: '#ec4899',
      leaderId: 'usr_leader',
      visibility: 'team_only',
      memberIds: ['usr_leader', 'usr_member'],
      budget: 40000,
      expenses: 28200,
      expenseItems: [
        {
          id: 'exp_zt_1',
          projectId: 'proj_zerotrust',
          title: 'TLS Certificate Authority Appliance',
          category: 'component',
          cost: 8200,
          date: '2026-08-10',
          status: 'bought',
          vendor: 'DigiCert Enterprise',
          notes: 'Automated mTLS certificate issuing appliance',
          createdAt: '2026-08-10T12:00:00.000Z',
        },
        {
          id: 'exp_zt_2',
          projectId: 'proj_zerotrust',
          title: 'External Network Penetration Assessment',
          category: 'service',
          cost: 20000,
          date: '2026-08-22',
          status: 'completed',
          vendor: 'Mandiant Threat Labs',
          notes: 'Red team egress evasion testing',
          createdAt: '2026-08-22T16:00:00.000Z',
        },
      ],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    },
    {
      id: 'proj_sync',
      workspaceId: 'ws_default',
      teamId: 'team_product',
      title: 'CRDT Sync Engine & Offline State',
      description: 'Conflict-free replicated data types for peer-to-peer workspace document collaboration.',
      objectives: [
        'Support local indexedDB state with automatic background delta sync',
        'Provide deterministic state convergence on network reconnect',
      ],
      status: 'planned',
      deadline: '2026-11-30T18:00:00.000Z',
      accentColor: '#14b8a6',
      leaderId: 'usr_coleader',
      visibility: 'workspace',
      memberIds: ['usr_owner', 'usr_coleader', 'usr_member'],
      createdAt: '2026-04-12T14:30:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
    },
  ],
  milestones: [
    {
      id: 'ms_aurora_1',
      projectId: 'proj_aurora',
      title: 'M1: Cryptographic Handshake Specification',
      description: 'Finalize RFC and establish formal verification lemmas with peer review.',
      dueDate: '2026-08-15T18:00:00.000Z',
      status: 'completed',
      ownerId: 'usr_leader',
      createdAt: '2026-02-12T10:00:00.000Z',
    },
    {
      id: 'ms_aurora_2',
      projectId: 'proj_aurora',
      title: 'M2: Edge Node Benchmarking & Proof Verifier',
      description: 'Deploy 50 simulated edge clusters and measure verified throughput under load.',
      dueDate: '2026-09-25T18:00:00.000Z',
      status: 'in_progress',
      ownerId: 'usr_member',
      createdAt: '2026-02-12T10:00:00.000Z',
    },
    {
      id: 'ms_zt_1',
      projectId: 'proj_zerotrust',
      title: 'M1: Egress Policy Enforcement Engine',
      description: 'Implement eBPF packet inspection rules for egress traffic filtering.',
      dueDate: '2026-09-18T18:00:00.000Z',
      status: 'in_progress',
      ownerId: 'usr_member',
      createdAt: '2026-03-05T10:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 'task_aurora_101',
      projectId: 'proj_aurora',
      title: 'Implement Ed25519 signature batch verification in Rust core',
      description: 'Optimize signature validation loop using SIMD vector instructions for 4x throughput boost.',
      assigneeId: 'usr_member',
      creatorId: 'usr_leader',
      status: 'complete',
      priority: 'high',
      dueDate: '2026-08-10T18:00:00.000Z',
      milestoneId: 'ms_aurora_1',
      tags: ['rust', 'crypto', 'performance'],
      checklist: [
        { id: 'cl_1', taskId: 'task_aurora_101', title: 'Write AVX2 assembly kernels', isCompleted: true, sortOrder: 0 },
        { id: 'cl_2', taskId: 'task_aurora_101', title: 'Validate differential test cases against reference vectors', isCompleted: true, sortOrder: 1 },
        { id: 'cl_3', taskId: 'task_aurora_101', title: 'Benchmark regression tests', isCompleted: true, sortOrder: 2 },
      ],
      createdAt: '2026-02-15T11:00:00.000Z',
      updatedAt: '2026-08-09T17:30:00.000Z',
      completedAt: '2026-08-09T17:30:00.000Z',
      proofSubmittedId: 'proof_101',
    },
    {
      id: 'task_aurora_102',
      projectId: 'proj_aurora',
      title: 'Construct synthetic network partition test harness',
      description: 'Chaos engineering suite simulating 30% packet loss and 200ms asymmetric jitter across nodes.',
      assigneeId: 'usr_member',
      creatorId: 'usr_leader',
      status: 'in_review',
      priority: 'high',
      dueDate: '2026-09-14T18:00:00.000Z',
      milestoneId: 'ms_aurora_2',
      tags: ['testing', 'chaos', 'edge'],
      checklist: [
        { id: 'cl_4', taskId: 'task_aurora_102', title: 'Write Toxiproxy toxic injections', isCompleted: true, sortOrder: 0 },
        { id: 'cl_5', taskId: 'task_aurora_102', title: 'Record deterministic split-brain recovery logs', isCompleted: true, sortOrder: 1 },
        { id: 'cl_6', taskId: 'task_aurora_102', title: 'Submit proof of verification run', isCompleted: true, sortOrder: 2 },
      ],
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-09-11T15:20:00.000Z',
      proofSubmittedId: 'proof_102',
    },
    {
      id: 'task_aurora_103',
      projectId: 'proj_aurora',
      title: 'Formal security audit preparation and dependency SBOM',
      description: 'Generate SPDX SBOM and run automated taint analysis across all third-party crates.',
      assigneeId: 'usr_coleader',
      creatorId: 'usr_owner',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2026-09-28T18:00:00.000Z',
      milestoneId: 'ms_aurora_2',
      tags: ['security', 'compliance', 'audit'],
      checklist: [
        { id: 'cl_7', taskId: 'task_aurora_103', title: 'Audit cargo-crev web of trust reviews', isCompleted: true, sortOrder: 0 },
        { id: 'cl_8', taskId: 'task_aurora_103', title: 'Package cryptographic proofs and threat models', isCompleted: false, sortOrder: 1 },
      ],
      createdAt: '2026-08-25T14:00:00.000Z',
      updatedAt: '2026-09-10T16:00:00.000Z',
    },
    {
      id: 'task_aurora_group_1',
      projectId: 'proj_aurora',
      title: 'Multi-Region Distributed Load & Chaos Simulation',
      description: 'Cross-functional collaborative exercise: simultaneously spin up edge clusters in US-East, EU-Central, and AP-East to test 100k msg/s load under simulated cross-ocean link cut.',
      creatorId: 'usr_leader',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: '2026-09-20T18:00:00.000Z',
      milestoneId: 'ms_aurora_2',
      tags: ['group-mission', 'chaos', 'multi-region', 'collaboration'],
      checklist: [
        { id: 'cl_g1', taskId: 'task_aurora_group_1', title: 'Spin up 3 geographically diverse edge clusters', isCompleted: true, sortOrder: 0 },
        { id: 'cl_g2', taskId: 'task_aurora_group_1', title: 'Inject synthetic 500ms jitter and packet drops', isCompleted: true, sortOrder: 1 },
        { id: 'cl_g3', taskId: 'task_aurora_group_1', title: 'All participants submit localized telemetry logs', isCompleted: false, sortOrder: 2 },
      ],
      isGroupTask: true,
      participantIds: ['usr_leader', 'usr_coleader', 'usr_member'],
      individualPoints: 40,
      groupBonusPoints: 75,
      submissions: [
        {
          id: 'gsub_aurora_leader',
          taskId: 'task_aurora_group_1',
          userId: 'usr_leader',
          userName: 'Elena Rostova',
          userAvatar: undefined,
          userRole: 'leader',
          status: 'submitted',
          submittedAt: '2026-09-11T12:00:00.000Z',
          note: 'Completed US-East edge cluster orchestration and provisioned Prometheus telemetry probes.',
          proofLinks: ['https://telemetry.nexora.internal/dashboards/us-east-cluster'],
          pointsAwarded: 40,
        },
        {
          id: 'gsub_aurora_coleader',
          taskId: 'task_aurora_group_1',
          userId: 'usr_coleader',
          userName: 'Marcus Chen',
          userAvatar: undefined,
          userRole: 'co-leader',
          status: 'submitted',
          submittedAt: '2026-09-11T15:30:00.000Z',
          note: 'Executed EU-Central link degradation script. Verified zero packet drops on failover gateway.',
          proofLinks: ['https://telemetry.nexora.internal/reports/eu-failover.pdf'],
          pointsAwarded: 40,
        },
        {
          id: 'gsub_aurora_member',
          taskId: 'task_aurora_group_1',
          userId: 'usr_member',
          userName: 'Alex Rivera',
          userAvatar: undefined,
          userRole: 'member',
          status: 'pending',
        },
      ],
      bonusAwarded: false,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-11T15:30:00.000Z',
    },
    {
      id: 'task_zt_201',
      projectId: 'proj_zerotrust',
      title: 'Debug eBPF socket filter tail call recursion limit',
      description: 'Kernel 6.8 is rejecting the combined security filter program during high-volume ingress spikes.',
      assigneeId: 'usr_member',
      creatorId: 'usr_leader',
      status: 'blocked',
      priority: 'urgent',
      dueDate: '2026-09-12T18:00:00.000Z',
      milestoneId: 'ms_zt_1',
      tags: ['ebpf', 'kernel', 'urgent'],
      checklist: [
        { id: 'cl_9', taskId: 'task_zt_201', title: 'Inspect verifier log byte offsets', isCompleted: true, sortOrder: 0 },
        { id: 'cl_10', taskId: 'task_zt_201', title: 'Refactor BPF maps to eliminate recursive tail call', isCompleted: false, sortOrder: 1 },
      ],
      createdAt: '2026-09-02T09:00:00.000Z',
      updatedAt: '2026-09-11T14:00:00.000Z',
    },
    {
      id: 'task_zt_202',
      projectId: 'proj_zerotrust',
      title: 'Automated certificate renewal ACME challenge listener',
      description: 'Implement ephemeral TLS-ALPN-01 listener responding directly from memory buffers.',
      assigneeId: 'usr_leader',
      creatorId: 'usr_leader',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-09-22T18:00:00.000Z',
      tags: ['tls', 'acme', 'certs'],
      checklist: [],
      createdAt: '2026-09-05T11:00:00.000Z',
      updatedAt: '2026-09-05T11:00:00.000Z',
    },
  ],
  proofSubmissions: [
    {
      id: 'proof_101',
      taskId: 'task_aurora_101',
      projectId: 'proj_aurora',
      submittedById: 'usr_member',
      explanation:
        'Completed SIMD optimization. Benchmark shows 4.2x throughput speedup (from 14,200 to 59,800 verifies/sec per thread). All 10,000 differential test vectors passed with 0 bit errors.',
      links: [
        'https://github.com/nexora-internal/aurora-crypto/pull/88',
        'https://bench.internal.nexora/aurora-simd-run-9882.html',
      ],
      attachmentIds: [],
      status: 'approved',
      reviewNote:
        'Verified test vectors and SIMD safety bounds. AVX2 fallback for non-AVX targets confirmed intact. Outstanding work.',
      reviewedById: 'usr_leader',
      reviewedAt: '2026-08-09T18:00:00.000Z',
      createdAt: '2026-08-09T17:15:00.000Z',
      reviewHistory: [
        {
          id: 'prh_1',
          proofId: 'proof_101',
          reviewerId: 'usr_leader',
          action: 'approved',
          reason: 'Verified test vectors and SIMD safety bounds. Production ready.',
          createdAt: '2026-08-09T18:00:00.000Z',
        },
      ],
    },
    {
      id: 'proof_102',
      taskId: 'task_aurora_102',
      projectId: 'proj_aurora',
      submittedById: 'usr_member',
      explanation:
        'Chaos test harness completed. Executed 48-hour continuous cycle with simulated network partitions across 3 geographically split nodes. Cluster re-converged within 280ms of network healing without any split-brain state or corrupted journals.',
      links: [
        'https://logs.internal.nexora/chaos-cluster-run-2918.json',
      ],
      attachmentIds: [],
      status: 'pending',
      createdAt: '2026-09-11T15:20:00.000Z',
      reviewHistory: [],
    },
  ],
  resources: [
    {
      id: 'res_1',
      projectId: 'proj_aurora',
      title: 'Aurora Protocol Cryptographic RFC v3.4',
      description: 'Formal mathematical specifications of state verification and consensus handshakes.',
      url: 'https://docs.internal.nexora/rfc-aurora-3.4.pdf',
      category: 'specification',
      createdById: 'usr_leader',
      permissionScope: 'workspace',
      createdAt: '2026-02-11T10:00:00.000Z',
      updatedAt: '2026-08-12T14:00:00.000Z',
    },
    {
      id: 'res_2',
      projectId: 'proj_aurora',
      title: 'Edge Cluster Deployment Architecture Diagram',
      description: 'Figma interactive component map for edge nodes, reverse proxies, and telemetry collectors.',
      url: 'https://figma.com/file/aurora-architecture-v3',
      category: 'design',
      createdById: 'usr_coleader',
      permissionScope: 'project_members',
      createdAt: '2026-03-01T15:00:00.000Z',
      updatedAt: '2026-03-01T15:00:00.000Z',
    },
    {
      id: 'res_3',
      projectId: 'proj_zerotrust',
      title: 'Zero-Trust Gateway eBPF Memory Allocation Spec',
      description: 'Strict kernel map size boundaries and ring buffer capacity guides.',
      url: 'https://docs.internal.nexora/zt-ebpf-spec.md',
      category: 'documentation',
      createdById: 'usr_leader',
      permissionScope: 'team',
      createdAt: '2026-03-10T12:00:00.000Z',
      updatedAt: '2026-03-10T12:00:00.000Z',
    },
  ],
  projectMessages: [
    {
      id: 'msg_1',
      projectId: 'proj_aurora',
      senderId: 'usr_leader',
      content: 'Team, the SIMD verification benchmarks exceeded our targets. Great job Alex! Next focus is chaos resilience.',
      createdAt: '2026-08-10T09:15:00.000Z',
    },
    {
      id: 'msg_2',
      projectId: 'proj_aurora',
      senderId: 'usr_member',
      content: 'Thanks Marcus! I just submitted proof for the network partition test harness. Cluster converged reliably under 300ms.',
      replyToId: 'msg_1',
      createdAt: '2026-09-11T15:25:00.000Z',
    },
    {
      id: 'msg_3',
      projectId: 'proj_aurora',
      senderId: 'usr_coleader',
      content: 'Reviewing the threat model and SBOM outputs this afternoon. Ready to sign off for the audit milestone.',
      createdAt: '2026-09-11T16:10:00.000Z',
    },
    {
      id: 'msg_4',
      projectId: 'proj_zerotrust',
      senderId: 'usr_leader',
      content: 'The eBPF kernel 6.8 recursion limit needs attention before tomorrow morning. Alex, please check the BPF map structure.',
      createdAt: '2026-09-11T14:15:00.000Z',
    },
  ],
  directMessages: [
    {
      id: 'dm_1',
      senderId: 'usr_leader',
      receiverId: 'usr_member',
      content: 'Alex, when you review the eBPF socket filter, let us split the tail calls into a pinned hashmap instead of recursion.',
      isRead: true,
      createdAt: '2026-09-11T14:30:00.000Z',
    },
    {
      id: 'dm_2',
      senderId: 'usr_member',
      receiverId: 'usr_leader',
      content: 'Good plan Marcus, starting on that refactor now. Will push test branch in 30 minutes.',
      isRead: false,
      createdAt: '2026-09-11T14:35:00.000Z',
    },
  ],
  notifications: [
    {
      id: 'notif_1',
      userId: 'usr_leader',
      title: 'Proof submitted for review',
      message: 'Alex Rivera submitted completion proof for: Construct synthetic network partition test harness.',
      type: 'proof_review',
      isRead: false,
      link: '/projects/proj_aurora?tab=proofs',
      createdAt: '2026-09-11T15:20:00.000Z',
    },
    {
      id: 'notif_2',
      userId: 'usr_member',
      title: 'Urgent task assigned',
      message: 'Marcus Chen flagged: Debug eBPF socket filter tail call recursion limit as urgent.',
      type: 'overdue',
      isRead: true,
      link: '/projects/proj_zerotrust?tab=tasks',
      createdAt: '2026-09-11T14:05:00.000Z',
    },
    {
      id: 'notif_3',
      userId: 'usr_member',
      title: 'Proof Approved',
      message: 'Your proof for Ed25519 signature batch verification was approved (+40 pts).',
      type: 'score',
      isRead: true,
      link: '/projects/proj_aurora?tab=proofs',
      createdAt: '2026-08-09T18:00:00.000Z',
    },
  ],
  notificationPreferences: {
    usr_owner: {
      userId: 'usr_owner',
      deadlineReminders: true,
      overdueAlerts: true,
      proofReviewUpdates: true,
      directMessages: true,
      projectAnnouncements: true,
      weeklySummaries: true,
    },
    usr_leader: {
      userId: 'usr_leader',
      deadlineReminders: true,
      overdueAlerts: true,
      proofReviewUpdates: true,
      directMessages: true,
      projectAnnouncements: true,
      weeklySummaries: true,
    },
    usr_coleader: {
      userId: 'usr_coleader',
      deadlineReminders: true,
      overdueAlerts: true,
      proofReviewUpdates: true,
      directMessages: true,
      projectAnnouncements: true,
      weeklySummaries: false,
    },
    usr_member: {
      userId: 'usr_member',
      deadlineReminders: true,
      overdueAlerts: true,
      proofReviewUpdates: true,
      directMessages: true,
      projectAnnouncements: true,
      weeklySummaries: true,
    },
  },
  activityEvents: [
    {
      id: 'act_1',
      workspaceId: 'ws_default',
      projectId: 'proj_aurora',
      userId: 'usr_member',
      action: 'Submitted proof of work',
      entityType: 'proof',
      entityId: 'proof_102',
      details: 'Proof submitted for "Construct synthetic network partition test harness"',
      createdAt: '2026-09-11T15:20:00.000Z',
    },
    {
      id: 'act_2',
      workspaceId: 'ws_default',
      projectId: 'proj_zerotrust',
      userId: 'usr_leader',
      action: 'Updated task priority to urgent',
      entityType: 'task',
      entityId: 'task_zt_201',
      details: 'Task flagged as urgent due to kernel 6.8 verifier failure',
      createdAt: '2026-09-11T14:05:00.000Z',
    },
    {
      id: 'act_3',
      workspaceId: 'ws_default',
      projectId: 'proj_aurora',
      userId: 'usr_leader',
      action: 'Approved proof of work',
      entityType: 'proof',
      entityId: 'proof_101',
      details: 'Proof verified and approved for Ed25519 SIMD batch validation',
      createdAt: '2026-08-09T18:00:00.000Z',
    },
  ],
  files: [
    ...SEED_PROJECT_FILES,
  ],
  onboarding: {
    usr_owner: {
      userId: 'usr_owner',
      hasCompleted: true,
      dismissed: false,
      step: 'completed',
      invitedTeammates: ['marcus@nexora.internal', 'sarah@nexora.internal', 'alex@nexora.internal'],
    },
    usr_leader: {
      userId: 'usr_leader',
      hasCompleted: true,
      dismissed: false,
      step: 'completed',
      invitedTeammates: [],
    },
    usr_member: {
      userId: 'usr_member',
      hasCompleted: true,
      dismissed: false,
      step: 'completed',
      invitedTeammates: [],
    },
  },
  sessions: {
    // Seed default session for instant preview/testing
    sess_owner: { userId: 'usr_owner', workspaceId: 'ws_default', expiresAt: Date.now() + 86400000 * 30 },
  },
  projectInvitations: [],
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        
        const loadedProjects = (parsed.projects || []).map((p: Project) => ({
          ...p,
          expenseItems: p.expenseItems || [],
        }));

        const loadedUsers = (parsed.users || []).map((u: User) => ({
          ...u,
          skills: u.skills || ['General Engineering'],
          department: u.department || 'Core Engineering',
          location: u.location || 'Remote',
          bio: u.bio || '',
          githubHandle: u.githubHandle || '',
          timezone: u.timezone || 'UTC',
          statusMessage: u.statusMessage || '🟢 Active in Workspace',
        }));

        const loadedWorkspaces = parsed.workspaces && parsed.workspaces.length > 0
          ? parsed.workspaces
          : [
              {
                id: 'ws_default',
                name: 'Nexora Workspace',
                slug: 'nexora-workspace',
                ownerId: '',
                createdAt: new Date().toISOString(),
                settings: {
                  allowMemberInvites: true,
                  requireProofApproval: true,
                  emergencyRecoveryEmail: '',
                  strictIdorChecks: true,
                },
              },
            ];

        return {
          users: loadedUsers,
          workspaces: loadedWorkspaces,
          workspaceMemberships: parsed.workspaceMemberships || [],
          teams: parsed.teams || [],
          projects: loadedProjects,
          tasks: parsed.tasks || [],
          milestones: parsed.milestones || [],
          proofSubmissions: parsed.proofSubmissions || [],
          resources: parsed.resources || [],
          projectMessages: parsed.projectMessages || [],
          directMessages: parsed.directMessages || [],
          notifications: parsed.notifications || [],
          notificationPreferences: parsed.notificationPreferences || {},
          activityEvents: parsed.activityEvents || [],
          files: parsed.files || [],
          onboarding: parsed.onboarding || {},
          sessions: parsed.sessions || {},
          projectInvitations: parsed.projectInvitations || [],
        };
      }
    } catch (err) {
      console.warn('Failed to load database from file, initializing fresh empty data:', err);
    }
    const emptyState: DatabaseSchema = {
      users: [],
      workspaces: [
        {
          id: 'ws_default',
          name: 'Nexora Workspace',
          slug: 'nexora-workspace',
          ownerId: '',
          createdAt: new Date().toISOString(),
          settings: {
            allowMemberInvites: true,
            requireProofApproval: true,
            emergencyRecoveryEmail: '',
            strictIdorChecks: true,
          },
        },
      ],
      workspaceMemberships: [],
      teams: [],
      projects: [],
      tasks: [],
      milestones: [],
      proofSubmissions: [],
      resources: [],
      projectMessages: [],
      directMessages: [],
      notifications: [],
      notificationPreferences: {},
      activityEvents: [],
      files: [],
      onboarding: {},
      sessions: {},
      projectInvitations: [],
    };
    this.saveData(emptyState);
    return emptyState;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public mutate<T>(fn: (db: DatabaseSchema) => T): T {
    const result = fn(this.data);
    this.saveData(this.data);
    return result;
  }

  public resetToDefaults() {
    this.data = this.clearAllData();
    return this.data;
  }

  public clearAllData(): DatabaseSchema {
    const emptyState: DatabaseSchema = {
      users: [],
      workspaces: [
        {
          id: 'ws_default',
          name: 'Nexora Workspace',
          slug: 'nexora-workspace',
          ownerId: '',
          createdAt: new Date().toISOString(),
          settings: {
            allowMemberInvites: true,
            requireProofApproval: true,
            emergencyRecoveryEmail: '',
            strictIdorChecks: true,
          },
        },
      ],
      workspaceMemberships: [],
      teams: [],
      projects: [],
      tasks: [],
      milestones: [],
      proofSubmissions: [],
      resources: [],
      projectMessages: [],
      directMessages: [],
      notifications: [],
      notificationPreferences: {},
      activityEvents: [],
      files: [],
      onboarding: {},
      sessions: {},
      projectInvitations: [],
    };
    this.data = emptyState;
    this.saveData(emptyState);
    return emptyState;
  }
}

export const db = new DatabaseManager();
