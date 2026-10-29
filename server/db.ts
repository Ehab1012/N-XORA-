import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
export const firestore = getFirestore(firebaseConfig.firestoreDatabaseId);
const auth = getAuth();
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
  UserRole,
  BonusAward,
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
  bonusAwards: BonusAward[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nexora-db.json');

const INITIAL_DATA: DatabaseSchema = {
  users: [
    {
      id: 'usr_owner',
      email: 'elena@nexora.internal',
      name: 'Elena Vance',
      role: 'leader',
      title: 'Lead Architect & Workspace Leader',
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
    {
      id: 'usr_member',
      email: 'alex@nexora.internal',
      name: 'Alex Rivera',
      role: 'member',
      title: 'Senior Systems Engineer',
      department: 'Platform Engineering',
      location: 'Austin, TX (CST / UTC-6)',
      bio: 'Core infrastructure developer optimizing low-latency IPC channels and zero-trust authentication bridges.',
      phone: '+1 (512) 555-0143',
      skills: ['Rust', 'TypeScript', 'Docker', 'Linux Kernels', 'WebSockets'],
      githubHandle: 'alexrivera-dev',
      linkedinUrl: 'https://linkedin.com/in/alex-rivera-nexora',
      timezone: 'America/Chicago',
      statusMessage: '🟢 Shipping Sprint 4 modules',
      createdAt: '2026-02-15T12:00:00.000Z',
      lastActiveAt: '2026-09-12T08:00:00.000Z',
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
    { id: 'wm_1', workspaceId: 'ws_default', userId: 'usr_owner', role: 'leader', joinedAt: '2026-01-10T09:00:00.000Z' },
    { id: 'wm_2', workspaceId: 'ws_default', userId: 'usr_leader', role: 'leader', joinedAt: '2026-01-15T10:30:00.000Z' },
    { id: 'wm_3', workspaceId: 'ws_default', userId: 'usr_coleader', role: 'co-leader', joinedAt: '2026-02-01T11:00:00.000Z' },
    { id: 'wm_4', workspaceId: 'ws_default', userId: 'usr_member', role: 'member', joinedAt: '2026-02-15T12:00:00.000Z' },
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
      pointsAwarded: 40,
      isLate: false,
      latePenaltyApplied: 0,
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
      attachmentIds: ['file_aurora_simd'],
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
      attachmentIds: ['file_aurora_telemetry'],
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
      description: 'Formal mathematical specifications of state verification, Ed25519 SIMD batching, and Raft consensus handshakes.',
      fileName: 'aurora-crypto-rfc-v3.4.md',
      fileType: 'text/markdown',
      fileSize: 3840,
      url: '/api/resources/res_1/content',
      dataUrl: 'data:text/markdown;base64,' + Buffer.from(
`# Aurora Protocol Cryptographic RFC v3.4
**Status**: APPROVED & ACTIVE • **Security Level**: Critical • **Version**: 3.4.1

---

## 1. Abstract & Mathematical Model
The Aurora Core Protocol specifies a Byzantine fault-tolerant state-verification mesh capable of processing sub-millisecond cryptographic attestations across distributed edge gateways.

$$\\mathcal{S}_{t+1} = \\mathcal{H}(\\mathcal{S}_t \\parallel \\sum_{i=1}^{N} \\sigma_i(m))$$

Where:
- $\\mathcal{S}_t$ denotes the consensus state root at epoch $t$.
- $\\sigma_i(m)$ represents the Ed25519 signature batch over transaction vector $m$.
- $\\mathcal{H}$ is the Blake3 BLAKE3-256 state tree hasher.

---

## 2. SIMD Batch Verification Architecture
To achieve high-throughput telemetry handling without CPU saturation:
- Signatures are accumulated into 64-element vectors.
- AVX-512 vector extensions verify 16 Ed25519 point multiplications in parallel.
- Average throughput: **59,800 ops/sec** (4.2x speedup over scalar baseline).

\`\`\`rust
// Zero-allocation SIMD batch verification entrypoint
#[inline(always)]
pub fn verify_signature_batch(
    keys: &[PublicKey; 64],
    signatures: &[Signature; 64],
    messages: &[&[u8]; 64],
) -> Result<BitMask64, CryptoError> {
    let mut bitmask = BitMask64::all_valid();
    ed25519_dalek::verify_batch_avx512(keys, signatures, messages, &mut bitmask)?;
    Ok(bitmask)
}
\`\`\`

---

## 3. Network Failure Recovery Guarantees
| Scenario | Detection Time | Convergence Latency | Zero Data Loss |
|---|---|---|---|
| Edge Partition | < 80ms | 280ms | GUARANTEED |
| Gateway Crash | < 120ms | 340ms | GUARANTEED |
| Byzantine Actor | Immediate (0ms) | Instant Drop | GUARANTEED |
`
      ).toString('base64'),
      category: 'specification',
      createdById: 'usr_leader',
      permissionScope: 'workspace',
      tags: ['crypto', 'rfc', 'simd', 'consensus'],
      createdAt: '2026-02-11T10:00:00.000Z',
      updatedAt: '2026-08-12T14:00:00.000Z',
    },
    {
      id: 'res_2',
      projectId: 'proj_aurora',
      title: 'Edge Cluster Deployment Architecture Diagram',
      description: 'Interactive component topology map for edge nodes, TLS reverse proxies, and telemetry collectors.',
      fileName: 'edge-cluster-mesh-architecture.svg',
      fileType: 'image/svg+xml',
      fileSize: 12400,
      url: '/api/resources/res_2/content',
      thumbnailUrl: 'data:image/svg+xml;base64,' + Buffer.from(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
  <defs>
    <linearGradient id="auroraBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090b16"/>
      <stop offset="100%" stop-color="#12152d"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1c2144" stroke-width="0.75"/>
    </pattern>
  </defs>
  <rect width="800" height="480" rx="16" fill="url(#auroraBg)"/>
  <rect width="800" height="480" rx="16" fill="url(#grid)"/>
  <rect x="2" y="2" width="796" height="476" rx="15" fill="none" stroke="#7c3aed" stroke-opacity="0.5" stroke-width="2"/>
  <rect x="25" y="25" width="750" height="50" rx="10" fill="#13162d" stroke="#282d5a" stroke-width="1"/>
  <circle cx="50" cy="50" r="10" fill="#7c3aed"/>
  <text x="75" y="55" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Aurora Distributed Core — Edge Cluster Deployment Map</text>
  <rect x="670" y="38" width="85" height="24" rx="6" fill="#064e3b" stroke="#059669" stroke-width="1"/>
  <text x="712" y="54" fill="#6ee7b7" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle">ACTIVE v3.4</text>
  <g transform="translate(60, 130)">
    <rect width="180" height="130" rx="12" fill="#151936" stroke="#6366f1" stroke-width="2"/>
    <text x="33" y="38" fill="#a5b4fc" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">TLS</text>
    <text x="60" y="32" fill="#e2e8f0" font-family="system-ui" font-size="14" font-weight="700">Edge Gateway</text>
    <text x="60" y="48" fill="#94a3b8" font-family="monospace" font-size="10">Region: US-East-1</text>
    <line x1="15" y1="65" x2="165" y2="65" stroke="#262c5b" stroke-width="1"/>
    <text x="15" y="85" fill="#818cf8" font-family="monospace" font-size="10">• mTLS 1.3 Handshake</text>
    <text x="15" y="102" fill="#818cf8" font-family="monospace" font-size="10">• 120k req/s capacity</text>
    <text x="15" y="119" fill="#34d399" font-family="monospace" font-size="10">● Status: Healthy</text>
  </g>
  <g transform="translate(310, 120)">
    <rect width="200" height="150" rx="12" fill="#132338" stroke="#14b8a6" stroke-width="2.5"/>
    <text x="33" y="38" fill="#5eead4" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">CPU</text>
    <text x="60" y="32" fill="#f0fdfa" font-family="system-ui" font-size="14" font-weight="700">Consensus Engine</text>
    <text x="60" y="48" fill="#5eead4" font-family="monospace" font-size="10">Ed25519 SIMD Batch</text>
    <line x1="15" y1="65" x2="185" y2="65" stroke="#1d4850" stroke-width="1"/>
    <text x="15" y="85" fill="#2dd4bf" font-family="monospace" font-size="10">• 59.8k verifies/sec</text>
    <text x="15" y="102" fill="#2dd4bf" font-family="monospace" font-size="10">• 0 bit error differential</text>
    <text x="15" y="120" fill="#2dd4bf" font-family="monospace" font-size="10">• 280ms convergence</text>
    <text x="15" y="137" fill="#34d399" font-family="monospace" font-size="10">● Consensus: 100% OK</text>
  </g>
  <g transform="translate(580, 130)">
    <rect width="170" height="130" rx="12" fill="#241438" stroke="#c084fc" stroke-width="2"/>
    <text x="33" y="38" fill="#e9d5ff" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">LOG</text>
    <text x="60" y="32" fill="#faf5ff" font-family="system-ui" font-size="14" font-weight="700">Storage Ring</text>
    <text x="60" y="48" fill="#d8b4fe" font-family="monospace" font-size="10">Raft Shards 0-15</text>
    <line x1="15" y1="65" x2="155" y2="65" stroke="#3b1d63" stroke-width="1"/>
    <text x="15" y="85" fill="#c084fc" font-family="monospace" font-size="10">• Zero-Knowledge Proofs</text>
    <text x="15" y="102" fill="#c084fc" font-family="monospace" font-size="10">• Tamper-Proof Audit</text>
    <text x="15" y="119" fill="#34d399" font-family="monospace" font-size="10">● Replicated x3</text>
  </g>
  <path d="M 240 195 L 310 195" stroke="#6366f1" stroke-width="3" stroke-dasharray="6 3"/>
  <path d="M 510 195 L 580 195" stroke="#14b8a6" stroke-width="3"/>
  <g transform="translate(60, 310)">
    <rect width="690" height="130" rx="12" fill="#0f1124" stroke="#252a52" stroke-width="1"/>
    <text x="25" y="32" fill="#94a3b8" font-family="monospace" font-size="11" font-weight="600">LIVE TELEMETRY MESH STATUS</text>
    <text x="25" y="60" fill="#38bdf8" font-family="monospace" font-size="11">✓ US-East Edge: 4,120 active gRPC connections (p99 latency: 12ms)</text>
    <text x="25" y="84" fill="#34d399" font-family="monospace" font-size="11">✓ SIMD Verifier Thread Pool: 16 cores 100% healthy, 0 dropped packets</text>
    <text x="25" y="108" fill="#a78bfa" font-family="monospace" font-size="11">✓ Raft Journal: Committed at Block #4,819,204 • State Hash: 0x7f8a9e</text>
  </g>
</svg>`
      ).toString('base64'),
      dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
  <defs>
    <linearGradient id="auroraBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090b16"/>
      <stop offset="100%" stop-color="#12152d"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1c2144" stroke-width="0.75"/>
    </pattern>
  </defs>
  <rect width="800" height="480" rx="16" fill="url(#auroraBg)"/>
  <rect width="800" height="480" rx="16" fill="url(#grid)"/>
  <rect x="2" y="2" width="796" height="476" rx="15" fill="none" stroke="#7c3aed" stroke-opacity="0.5" stroke-width="2"/>
  <rect x="25" y="25" width="750" height="50" rx="10" fill="#13162d" stroke="#282d5a" stroke-width="1"/>
  <circle cx="50" cy="50" r="10" fill="#7c3aed"/>
  <text x="75" y="55" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Aurora Distributed Core — Edge Cluster Deployment Map</text>
  <rect x="670" y="38" width="85" height="24" rx="6" fill="#064e3b" stroke="#059669" stroke-width="1"/>
  <text x="712" y="54" fill="#6ee7b7" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle">ACTIVE v3.4</text>
  <g transform="translate(60, 130)">
    <rect width="180" height="130" rx="12" fill="#151936" stroke="#6366f1" stroke-width="2"/>
    <text x="33" y="38" fill="#a5b4fc" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">TLS</text>
    <text x="60" y="32" fill="#e2e8f0" font-family="system-ui" font-size="14" font-weight="700">Edge Gateway</text>
    <text x="60" y="48" fill="#94a3b8" font-family="monospace" font-size="10">Region: US-East-1</text>
    <line x1="15" y1="65" x2="165" y2="65" stroke="#262c5b" stroke-width="1"/>
    <text x="15" y="85" fill="#818cf8" font-family="monospace" font-size="10">• mTLS 1.3 Handshake</text>
    <text x="15" y="102" fill="#818cf8" font-family="monospace" font-size="10">• 120k req/s capacity</text>
    <text x="15" y="119" fill="#34d399" font-family="monospace" font-size="10">● Status: Healthy</text>
  </g>
  <g transform="translate(310, 120)">
    <rect width="200" height="150" rx="12" fill="#132338" stroke="#14b8a6" stroke-width="2.5"/>
    <text x="33" y="38" fill="#5eead4" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">CPU</text>
    <text x="60" y="32" fill="#f0fdfa" font-family="system-ui" font-size="14" font-weight="700">Consensus Engine</text>
    <text x="60" y="48" fill="#5eead4" font-family="monospace" font-size="10">Ed25519 SIMD Batch</text>
    <line x1="15" y1="65" x2="185" y2="65" stroke="#1d4850" stroke-width="1"/>
    <text x="15" y="85" fill="#2dd4bf" font-family="monospace" font-size="10">• 59.8k verifies/sec</text>
    <text x="15" y="102" fill="#2dd4bf" font-family="monospace" font-size="10">• 0 bit error differential</text>
    <text x="15" y="120" fill="#2dd4bf" font-family="monospace" font-size="10">• 280ms convergence</text>
    <text x="15" y="137" fill="#34d399" font-family="monospace" font-size="10">● Consensus: 100% OK</text>
  </g>
  <g transform="translate(580, 130)">
    <rect width="170" height="130" rx="12" fill="#241438" stroke="#c084fc" stroke-width="2"/>
    <text x="33" y="38" fill="#e9d5ff" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">LOG</text>
    <text x="60" y="32" fill="#faf5ff" font-family="system-ui" font-size="14" font-weight="700">Storage Ring</text>
    <text x="60" y="48" fill="#d8b4fe" font-family="monospace" font-size="10">Raft Shards 0-15</text>
    <line x1="15" y1="65" x2="155" y2="65" stroke="#3b1d63" stroke-width="1"/>
    <text x="15" y="85" fill="#c084fc" font-family="monospace" font-size="10">• Zero-Knowledge Proofs</text>
    <text x="15" y="102" fill="#c084fc" font-family="monospace" font-size="10">• Tamper-Proof Audit</text>
    <text x="15" y="119" fill="#34d399" font-family="monospace" font-size="10">● Replicated x3</text>
  </g>
  <path d="M 240 195 L 310 195" stroke="#6366f1" stroke-width="3" stroke-dasharray="6 3"/>
  <path d="M 510 195 L 580 195" stroke="#14b8a6" stroke-width="3"/>
  <g transform="translate(60, 310)">
    <rect width="690" height="130" rx="12" fill="#0f1124" stroke="#252a52" stroke-width="1"/>
    <text x="25" y="32" fill="#94a3b8" font-family="monospace" font-size="11" font-weight="600">LIVE TELEMETRY MESH STATUS</text>
    <text x="25" y="60" fill="#38bdf8" font-family="monospace" font-size="11">✓ US-East Edge: 4,120 active gRPC connections (p99 latency: 12ms)</text>
    <text x="25" y="84" fill="#34d399" font-family="monospace" font-size="11">✓ SIMD Verifier Thread Pool: 16 cores 100% healthy, 0 dropped packets</text>
    <text x="25" y="108" fill="#a78bfa" font-family="monospace" font-size="11">✓ Raft Journal: Committed at Block #4,819,204 • State Hash: 0x7f8a9e</text>
  </g>
</svg>`
      ).toString('base64'),
      category: 'design',
      createdById: 'usr_coleader',
      permissionScope: 'project_members',
      tags: ['architecture', 'topology', 'svg', 'diagram'],
      createdAt: '2026-03-01T15:00:00.000Z',
      updatedAt: '2026-03-01T15:00:00.000Z',
    },
    {
      id: 'res_3',
      projectId: 'proj_zerotrust',
      title: 'Zero-Trust Gateway eBPF Memory Allocation Spec',
      description: 'Strict kernel map size boundaries, ring buffer capacity guides, and eBPF hook configuration.',
      fileName: 'ebpf-memory-allocation-spec.json',
      fileType: 'application/json',
      fileSize: 2450,
      url: '/api/resources/res_3/content',
      dataUrl: 'data:application/json;base64,' + Buffer.from(
        JSON.stringify(
          {
            schemaVersion: '2.4.0',
            specName: 'eBPF-ZeroTrust-Kernel-Allocator',
            targetKernel: 'Linux 6.8+',
            ringBuffers: [
              { name: 'audit_events_rb', capacityBytes: 16777216, pageAlignment: 4096, consumer: 'nexora-telemetry-daemon' },
              { name: 'packet_verdict_rb', capacityBytes: 8388608, pageAlignment: 4096, consumer: 'nexora-enforcer' }
            ],
            maps: {
              session_table: { type: 'BPF_MAP_TYPE_HASH', maxEntries: 1048576, keySize: 32, valueSize: 64 },
              rate_limiter_tokens: { type: 'BPF_MAP_TYPE_PERCPU_ARRAY', maxEntries: 65536, keySize: 4, valueSize: 16 },
              tls_handshake_cache: { type: 'BPF_MAP_TYPE_LRU_HASH', maxEntries: 524288, keySize: 48, valueSize: 128 }
            },
            securityConstraints: {
              strictGPLVerification: true,
              jitHardeningLevel: 2,
              unprivilegedBpfDisabled: true
            }
          },
          null,
          2
        )
      ).toString('base64'),
      category: 'documentation',
      createdById: 'usr_leader',
      permissionScope: 'team',
      tags: ['ebpf', 'kernel', 'memory', 'json'],
      createdAt: '2026-03-10T12:00:00.000Z',
      updatedAt: '2026-03-10T12:00:00.000Z',
    },
    {
      id: 'res_4',
      projectId: 'proj_aurora',
      title: 'SIMD Consensus Batch Verification Suite',
      description: 'High-throughput test harness benchmarking Ed25519 SIMD batch signature verification against Byzantine network faults.',
      fileName: 'simd-consensus-harness.ts',
      fileType: 'application/typescript',
      fileSize: 3120,
      url: '/api/resources/res_4/content',
      dataUrl: 'data:application/typescript;base64,' + Buffer.from(
`/**
 * Aurora SIMD Batch Signature Verification Harness
 * Tests high-throughput parallel verification of Ed25519 transactions
 */
export interface VerificationBatch {
  batchId: string;
  signatures: Uint8Array[];
  publicKeys: Uint8Array[];
  messages: Uint8Array[];
}

export class SIMDVerifierEngine {
  private batchSize: number = 64;
  private verifiedCount: number = 0;

  constructor(batchSize = 64) {
    this.batchSize = batchSize;
  }

  public async verifyBatchParallel(batch: VerificationBatch): Promise<{ valid: boolean; durationMs: number }> {
    const start = performance.now();
    if (batch.signatures.length !== this.batchSize) {
      throw new Error(\`Batch size must equal \${this.batchSize}\`);
    }

    // SIMD vector pipeline verification simulation
    let allValid = true;
    for (let i = 0; i < batch.signatures.length; i++) {
      if (batch.signatures[i].length !== 64 || batch.publicKeys[i].length !== 32) {
        allValid = false;
        break;
      }
    }

    this.verifiedCount += batch.signatures.length;
    const durationMs = performance.now() - start;

    return {
      valid: allValid,
      durationMs,
    };
  }

  public getStats() {
    return {
      totalVerified: this.verifiedCount,
      opsPerSecond: Math.round(this.verifiedCount / 0.00107),
    };
  }
}
`
      ).toString('base64'),
      category: 'specification',
      createdById: 'usr_coleader',
      permissionScope: 'project_members',
      tags: ['typescript', 'simd', 'benchmarks', 'code'],
      createdAt: '2026-03-15T16:00:00.000Z',
      updatedAt: '2026-03-15T16:00:00.000Z',
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
  bonusAwards: [],
};

export function isDevEnvironment(): boolean {
  if (process.env.APP_URL && process.env.APP_URL.includes('ais-dev')) return true;
  if (process.env.K_SERVICE && process.env.K_SERVICE.includes('ais-dev')) return true;
  return process.env.NODE_ENV !== 'production';
}

export const PUBLISHED_COLLECTION_NAME = 'nexora_data';
export const PUBLISHED_CHUNKS_COLLECTION_NAME = 'nexora_file_chunks';

export const CURRENT_COLLECTION_NAME = isDevEnvironment() ? 'nexora_data_dev' : 'nexora_data';
export const CURRENT_CHUNKS_COLLECTION_NAME = isDevEnvironment() ? 'nexora_file_chunks_dev' : 'nexora_file_chunks';

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  public async init() {
    try {
      const isDev = isDevEnvironment();
      console.log(`Initializing DB state (Environment: ${isDev ? 'Development Sandbox' : 'Published Production'}, Collection: ${CURRENT_COLLECTION_NAME})...`);

      if (isDev) {
        // Check if development sandbox collection has existing state
        const devDocs = await getDocs(collection(firestore, CURRENT_COLLECTION_NAME));

        if (!devDocs.empty) {
          console.log(`Restoring development DB state from Firestore collection "${CURRENT_COLLECTION_NAME}"...`);
          const restoredData: any = { ...this.data };
          devDocs.forEach((docSnap) => {
            const docData = docSnap.data();
            if (docData && 'value' in docData && docData.value !== undefined) {
              restoredData[docSnap.id] = docData.value;
            }
          });
          this.data = restoredData;
          if (Array.isArray(this.data.projects)) {
            this.data.projects = this.data.projects.map((p: any) => ({
              ...p,
              expenseItems: Array.isArray(p.expenseItems) ? p.expenseItems : [],
            }));
          }
          if (!Array.isArray(this.data.resources)) this.data.resources = [];
          for (const initR of INITIAL_DATA.resources) {
            if (!this.data.resources.some((r: any) => r.id === initR.id)) {
              this.data.resources.push(initR);
            }
          }
          this.saveDataLocally(this.data);
          console.log('Successfully restored dev DB state.');
          return;
        }

        // If dev state is empty, pull baseline from the published production collection so dev starts with published data
        console.log(`Dev state is empty. Pulling baseline snapshot from published collection "${PUBLISHED_COLLECTION_NAME}"...`);
        const publishedDocs = await getDocs(collection(firestore, PUBLISHED_COLLECTION_NAME));
        if (!publishedDocs.empty) {
          const restoredData: any = { ...this.data };
          publishedDocs.forEach((docSnap) => {
            const docData = docSnap.data();
            if (docData && 'value' in docData && docData.value !== undefined) {
              restoredData[docSnap.id] = docData.value;
            }
          });
          this.data = restoredData;
          if (Array.isArray(this.data.projects)) {
            this.data.projects = this.data.projects.map((p: any) => ({
              ...p,
              expenseItems: Array.isArray(p.expenseItems) ? p.expenseItems : [],
            }));
          }
          if (!Array.isArray(this.data.resources)) this.data.resources = [];
          for (const initR of INITIAL_DATA.resources) {
            if (!this.data.resources.some((r: any) => r.id === initR.id)) {
              this.data.resources.push(initR);
            }
          }
          this.saveDataLocally(this.data);
          // Commit to dev collection only, never modifying the published collection
          await this.syncToFirestore(this.data);
          console.log('Successfully initialized dev environment from published snapshot (published app remains untouched).');
          return;
        }

        // Otherwise fallback to local data and sync to dev collection
        if (!Array.isArray(this.data.resources)) this.data.resources = [];
        for (const initR of INITIAL_DATA.resources) {
          if (!this.data.resources.some((r: any) => r.id === initR.id)) {
            this.data.resources.push(initR);
          }
        }
        await this.syncToFirestore(this.data);
      } else {
        // In Production (Published App):
        console.log(`Restoring production DB state from Firestore collection "${CURRENT_COLLECTION_NAME}"...`);
        const collections = await getDocs(collection(firestore, CURRENT_COLLECTION_NAME));

        if (!collections.empty) {
          const restoredData: any = { ...this.data };
          collections.forEach((docSnap) => {
            const docData = docSnap.data();
            if (docData && 'value' in docData && docData.value !== undefined) {
              restoredData[docSnap.id] = docData.value;
            }
          });
          this.data = restoredData;
          if (Array.isArray(this.data.projects)) {
            this.data.projects = this.data.projects.map((p: any) => ({
              ...p,
              expenseItems: Array.isArray(p.expenseItems) ? p.expenseItems : [],
            }));
          }
          if (!Array.isArray(this.data.resources)) this.data.resources = [];
          for (const initR of INITIAL_DATA.resources) {
            if (!this.data.resources.some((r: any) => r.id === initR.id)) {
              this.data.resources.push(initR);
            }
          }
          this.saveDataLocally(this.data);
          console.log('Successfully restored production DB state from Firestore.');
        } else {
          console.log('No production Firestore state found. Initializing with local seed data.');
          await this.syncToFirestore(this.data);
        }
      }
    } catch (err) {
      console.error('Failed to restore from Firestore:', err);
    }
  }

  public async revertToPublishedState(): Promise<{ success: boolean; message: string; projectCount: number }> {
    try {
      console.log(`Reverting development state to published snapshot from "${PUBLISHED_COLLECTION_NAME}"...`);
      const publishedDocs = await getDocs(collection(firestore, PUBLISHED_COLLECTION_NAME));

      let restoredData: any;
      if (!publishedDocs.empty) {
        restoredData = JSON.parse(JSON.stringify(INITIAL_DATA));
        publishedDocs.forEach((docSnap) => {
          const docData = docSnap.data();
          if (docData && 'value' in docData && docData.value !== undefined) {
            restoredData[docSnap.id] = docData.value;
          }
        });
      } else {
        restoredData = JSON.parse(JSON.stringify(INITIAL_DATA));
      }

      if (Array.isArray(restoredData.projects)) {
        restoredData.projects = restoredData.projects.map((p: any) => ({
          ...p,
          expenseItems: Array.isArray(p.expenseItems) ? p.expenseItems : [],
        }));
      }

      this.data = restoredData;
      this.saveDataLocally(this.data);
      // Write into dev collection only, leaving published collection untouched
      await this.syncToFirestore(this.data);

      const count = Array.isArray(this.data.projects) ? this.data.projects.length : 0;
      console.log(`Successfully reverted dev workspace to published version (${count} projects).`);
      return {
        success: true,
        message: 'Successfully reverted development environment to match the published version.',
        projectCount: count,
      };
    } catch (err: any) {
      console.error('Failed to revert to published state:', err);
      throw new Error(`Failed to restore published state: ${err.message || String(err)}`);
    }
  }

  public async promoteDevToPublished(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Promoting development state to published collection "${PUBLISHED_COLLECTION_NAME}"...`);
      const sanitized = this.sanitize(this.data);
      const batch = writeBatch(firestore);
      for (const [key, value] of Object.entries(sanitized)) {
        batch.set(doc(firestore, PUBLISHED_COLLECTION_NAME, key), { value });
      }
      await batch.commit();
      console.log('Successfully promoted development state to published version.');
      return {
        success: true,
        message: 'Successfully promoted development workspace data to the published version.',
      };
    } catch (err: any) {
      console.error('Failed to promote dev to published state:', err);
      throw new Error(`Failed to publish data: ${err.message || String(err)}`);
    }
  }

  private saveDataLocally(data: any) {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save local database file:', err);
    }
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

        const loadedUsers = (parsed.users || []).map((u: any) => ({
          ...u,
          role: (u.role === 'owner' ? 'leader' : u.role) as UserRole,
          title: u.title ? u.title.replace('Workspace Owner', 'Workspace Leader') : u.title,
          skills: u.skills || ['General Engineering'],
          department: u.department || 'Core Engineering',
          location: u.location || 'Remote',
          bio: u.bio || '',
          githubHandle: u.githubHandle || '',
          timezone: u.timezone || 'UTC',
          statusMessage: u.statusMessage || '🟢 Active in Workspace',
        }));

        const loadedMemberships = (parsed.workspaceMemberships || []).map((m: any) => ({
          ...m,
          role: (m.role === 'owner' ? 'leader' : m.role) as UserRole,
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

        const loadedProofs = (parsed.proofSubmissions && parsed.proofSubmissions.length > 0 ? parsed.proofSubmissions : [...INITIAL_DATA.proofSubmissions]).map((p: any) => {
          if (p.id === 'proof_101' && (!p.attachmentIds || p.attachmentIds.length === 0)) {
            return { ...p, attachmentIds: ['file_aurora_simd'] };
          }
          if (p.id === 'proof_102' && (!p.attachmentIds || p.attachmentIds.length === 0)) {
            return { ...p, attachmentIds: ['file_aurora_telemetry'] };
          }
          return p;
        });

        // Ensure proof_aria_1 exists for task_muwzun58
        if (!loadedProofs.some((p: any) => p.id === 'proof_aria_1' || p.taskId === 'task_muwzun58')) {
          loadedProofs.push({
            id: 'proof_aria_1',
            taskId: 'task_muwzun58',
            projectId: 'proj_muwrg07a',
            submittedById: 'usr_mtzqyn6z_3bmw',
            explanation: 'Completed automated ARIA 1 ultrasonic inspection and structural diagnostics run. Crawler traversed 148.5m of ductwork, surveyed metal seam wall thickness (nominal 1.24mm), and applied 12 hermetic micro-joint seals with zero detected CFM airflow leakage.',
            links: [
              'https://benchmarks.internal.nexora/aria1-telemetry-run-4402.html',
              'https://github.com/nexora-internal/aria-robotics/pull/19',
            ],
            attachmentIds: ['file_aria_telemetry', 'file_aria_report'],
            status: 'approved',
            reviewNote: 'Verified ultrasonic wall thickness readings, crawler telemetry, and hermetic micro-joint repairs. Production certification approved.',
            reviewedById: 'usr_mtzqyn6z_3bmw',
            reviewedAt: '2026-10-06T18:30:00.000Z',
            createdAt: '2026-10-06T18:15:00.000Z',
            reviewHistory: [
              {
                id: 'prh_aria_1',
                proofId: 'proof_aria_1',
                reviewerId: 'usr_mtzqyn6z_3bmw',
                action: 'approved',
                reason: 'Verified crawler telemetry and ultrasonic seal thickness. All tests passed.',
                createdAt: '2026-10-06T18:30:00.000Z',
              },
            ],
          });
        }

        // Ensure proof_101 and proof_102 are also always present
        for (const initP of INITIAL_DATA.proofSubmissions) {
          if (!loadedProofs.some((p: any) => p.id === initP.id)) {
            loadedProofs.push(initP);
          }
        }

        // Tasks: merge and ensure task_muwzun58 is linked to proof_aria_1
        let loadedTasks = (parsed.tasks && parsed.tasks.length > 0 ? parsed.tasks : [...INITIAL_DATA.tasks]).map((t: any) => {
          if (t.id === 'task_muwzun58') {
            return {
              ...t,
              proofSubmittedId: t.proofSubmittedId || 'proof_aria_1',
              status: t.status === 'todo' ? 'complete' : t.status,
            };
          }
          return t;
        });

        // Ensure seed tasks with proofs are also available
        for (const initT of INITIAL_DATA.tasks) {
          if (!loadedTasks.some((t: any) => t.id === initT.id)) {
            loadedTasks.push(initT);
          }
        }

        // Projects: ensure seed projects like proj_aurora are also available
        for (const initProj of INITIAL_DATA.projects) {
          if (!loadedProjects.some((p: any) => p.id === initProj.id)) {
            loadedProjects.push(initProj);
          }
        }

        let loadedFiles = parsed.files && parsed.files.length > 0 ? parsed.files : [...SEED_PROJECT_FILES];
        // Ensure seed files are merged if missing
        for (const sf of SEED_PROJECT_FILES) {
          if (!loadedFiles.some((f: any) => f.id === sf.id)) {
            loadedFiles.push(sf);
          }
        }

        const loadedResources = Array.isArray(parsed.resources) ? [...parsed.resources] : [];
        for (const initR of INITIAL_DATA.resources) {
          if (!loadedResources.some((r: any) => r.id === initR.id)) {
            loadedResources.push(initR);
          }
        }

        return {
          users: loadedUsers,
          workspaces: loadedWorkspaces,
          workspaceMemberships: loadedMemberships,
          teams: parsed.teams || [],
          projects: loadedProjects,
          tasks: loadedTasks,
          milestones: parsed.milestones && parsed.milestones.length > 0 ? parsed.milestones : INITIAL_DATA.milestones,
          proofSubmissions: loadedProofs,
          resources: loadedResources,
          projectMessages: parsed.projectMessages || [],
          directMessages: parsed.directMessages || [],
          notifications: parsed.notifications || [],
          notificationPreferences: parsed.notificationPreferences || {},
          activityEvents: parsed.activityEvents || [],
          files: loadedFiles,
          onboarding: parsed.onboarding || {},
          sessions: parsed.sessions || {},
          projectInvitations: parsed.projectInvitations || [],
          bonusAwards: Array.isArray(parsed.bonusAwards) ? parsed.bonusAwards : [],
        };
      }
    } catch (err) {
      console.warn('Failed to load database from file, initializing from default seed data:', err);
    }
    const defaultData = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveDataLocally(defaultData);
    return defaultData;
  }

  private sanitize<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  private saveData(data: DatabaseSchema) {
    this.data = this.sanitize(data);
    this.saveDataLocally(this.data);
    this.syncToFirestore(this.data).catch((err) => console.error("Firestore sync error:", err));
  }

  private quotaExhaustedUntil = 0;
  private isSyncing = false;
  private pendingSyncData: DatabaseSchema | null = null;

  public async syncToFirestore(data: DatabaseSchema): Promise<void> {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return;
    }
    if (Date.now() < this.quotaExhaustedUntil) {
      return;
    }

    if (this.isSyncing) {
      this.pendingSyncData = data;
      return;
    }

    this.isSyncing = true;
    try {
      const sanitized = this.sanitize(data);
      const batch = writeBatch(firestore);
      for (const [key, value] of Object.entries(sanitized)) {
        batch.set(doc(firestore, CURRENT_COLLECTION_NAME, key), { value });
      }

      // Fast timeout so background sync never hangs the Node.js event loop
      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore commit timeout')), 3500)),
      ]);
      console.log(`Successfully committed state to Firestore collection "${CURRENT_COLLECTION_NAME}"`);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota limit exceeded') ||
        errMsg.includes('resource-exhausted')
      ) {
        console.warn('Firestore daily write quota reached. Caching all updates locally and pausing remote writes for 60s.');
        this.quotaExhaustedUntil = Date.now() + 60000;
        return;
      }
      console.warn(`Firestore sync note for ${CURRENT_COLLECTION_NAME}:`, errMsg);
    } finally {
      this.isSyncing = false;
      if (this.pendingSyncData && Date.now() >= this.quotaExhaustedUntil) {
        const next = this.pendingSyncData;
        this.pendingSyncData = null;
        this.syncToFirestore(next).catch(() => {});
      }
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

  public async mutateAsync<T>(fn: (db: DatabaseSchema) => Promise<T> | T): Promise<T> {
    const result = await fn(this.data);
    this.data = this.sanitize(this.data);
    this.saveDataLocally(this.data);
    // Non-blocking sync to keep API responses instantaneous
    this.syncToFirestore(this.data).catch((err) => console.warn('Background sync error:', err?.message || err));
    return result;
  }

  public resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData(this.data);
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
      bonusAwards: [],
    };
    this.data = emptyState;
    this.saveData(emptyState);
    return emptyState;
  }
}

export const db = new DatabaseManager();
