import { StoredFile } from '../shared/types.js';

const topoDiagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
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
  <rect x="2" y="2" width="796" height="476" rx="15" fill="none" stroke="#252a54" stroke-width="1.5"/>
  <rect x="25" y="25" width="750" height="50" rx="10" fill="#13162d" stroke="#282d5a" stroke-width="1"/>
  <circle cx="50" cy="50" r="10" fill="#7c3aed"/>
  <text x="75" y="55" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="700">Aurora Distributed Core Protocol — Multi-Region Mesh Topology</text>
  <rect x="670" y="38" width="85" height="24" rx="6" fill="#064e3b" stroke="#059669" stroke-width="1"/>
  <text x="712" y="54" fill="#6ee7b7" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle">ACTIVE v3.4</text>
  <g transform="translate(60, 130)">
    <rect width="180" height="130" rx="12" fill="#151936" stroke="#6366f1" stroke-width="2"/>
    <rect x="15" y="15" width="36" height="36" rx="8" fill="#312e81"/>
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
    <rect x="15" y="15" width="36" height="36" rx="8" fill="#134e4a"/>
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
    <rect x="15" y="15" width="36" height="36" rx="8" fill="#4c1d95"/>
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
</svg>`;

const simdChartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
  <defs>
    <linearGradient id="chartBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0d1e"/>
      <stop offset="100%" stop-color="#141838"/>
    </linearGradient>
    <linearGradient id="barBefore" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="barAfter" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="16" fill="url(#chartBg)" stroke="#232850" stroke-width="2"/>
  <text x="40" y="55" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="17" font-weight="700">Ed25519 SIMD Optimization Benchmark Results</text>
  <text x="40" y="80" fill="#94a3b8" font-family="monospace" font-size="11">Throughput comparison: Scalar Implementation vs. AVX-512 SIMD Batching</text>
  <line x1="80" y1="120" x2="80" y2="380" stroke="#334155" stroke-width="1.5"/>
  <line x1="80" y1="380" x2="740" y2="380" stroke="#334155" stroke-width="1.5"/>
  <line x1="80" y1="315" x2="740" y2="315" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="65" y="320" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">15k</text>
  <line x1="80" y1="250" x2="740" y2="250" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="65" y="255" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">30k</text>
  <line x1="80" y1="185" x2="740" y2="185" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="65" y="190" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">45k</text>
  <line x1="80" y1="120" x2="740" y2="120" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="65" y="125" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">60k</text>
  <rect x="180" y="318" width="130" height="62" rx="6" fill="url(#barBefore)"/>
  <text x="245" y="305" fill="#cbd5e1" font-family="monospace" font-size="14" font-weight="700" text-anchor="middle">14,200</text>
  <text x="245" y="410" fill="#94a3b8" font-family="system-ui" font-size="13" font-weight="600" text-anchor="middle">Scalar Baseline</text>
  <rect x="440" y="121" width="130" height="259" rx="6" fill="url(#barAfter)"/>
  <text x="505" y="105" fill="#22d3ee" font-family="monospace" font-size="18" font-weight="800" text-anchor="middle">59,800 op/s</text>
  <text x="505" y="410" fill="#f1f5f9" font-family="system-ui" font-size="13" font-weight="700" text-anchor="middle">AVX-512 SIMD Batch</text>
  <rect x="610" y="160" width="130" height="70" rx="10" fill="#132e29" stroke="#10b981" stroke-width="1.5"/>
  <text x="675" y="190" fill="#34d399" font-family="system-ui" font-size="20" font-weight="800" text-anchor="middle">+421%</text>
  <text x="675" y="212" fill="#a7f3d0" font-family="monospace" font-size="11" text-anchor="middle">Throughput Gain</text>
</svg>`;

const auditSealSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="sealBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="270" fill="url(#sealBg)" stroke="url(#gold)" stroke-width="8"/>
  <circle cx="300" cy="300" r="240" fill="none" stroke="#3730a3" stroke-width="2" stroke-dasharray="8 4"/>
  <path d="M 300 130 L 390 170 L 390 280 C 390 360 300 420 300 420 C 300 420 210 360 210 280 L 210 170 Z" fill="#1e1b4b" stroke="url(#gold)" stroke-width="5"/>
  <path d="M 260 270 L 290 300 L 345 240" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="300" y="470" fill="#f8fafc" font-family="system-ui" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="2">CRYPTOGRAPHIC AUDIT PASSED</text>
  <text x="300" y="500" fill="#94a3b8" font-family="monospace" font-size="13" text-anchor="middle">Nexora Security Group • Certified Zero-Defect Batch</text>
</svg>`;

const zeroTrustFlowSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
  <defs>
    <linearGradient id="ztBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="16" fill="url(#ztBg)" stroke="#1e293b" stroke-width="2"/>
  <text x="35" y="50" fill="#f8fafc" font-family="system-ui" font-size="17" font-weight="700">Zero-Trust Gateway eBPF Packet Filtering Flow</text>
  <text x="35" y="72" fill="#94a3b8" font-family="monospace" font-size="11">Kernel Socket Filter Hooks &amp; BPF Map Memory Allocation</text>
  
  <rect x="40" y="110" width="160" height="120" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
  <text x="120" y="145" fill="#60a5fa" font-family="system-ui" font-size="13" font-weight="700" text-anchor="middle">Network Ingress</text>
  <text x="120" y="168" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">XDP Hook / Raw NIC</text>
  <text x="120" y="195" fill="#38bdf8" font-family="monospace" font-size="10" text-anchor="middle">10GbE SFP+</text>
  
  <path d="M 200 170 L 280 170" stroke="#3b82f6" stroke-width="3" stroke-dasharray="6 3"/>
  
  <rect x="280" y="95" width="230" height="150" rx="12" fill="#142738" stroke="#06b6d4" stroke-width="2"/>
  <text x="395" y="130" fill="#22d3ee" font-family="system-ui" font-size="14" font-weight="700" text-anchor="middle">eBPF Policy Verifier</text>
  <text x="395" y="152" fill="#67e8f9" font-family="monospace" font-size="10" text-anchor="middle">Tail Call Depth &lt; 32</text>
  <line x1="300" y1="168" x2="490" y2="168" stroke="#164e63" stroke-width="1"/>
  <text x="300" y="190" fill="#a5f3fc" font-family="monospace" font-size="10">• Hashmap: 1,000,000 rules</text>
  <text x="300" y="210" fill="#a5f3fc" font-family="monospace" font-size="10">• Ring buffer: 64MB zero-copy</text>
  <text x="300" y="230" fill="#34d399" font-family="monospace" font-size="10">✓ Kernel verified: 0 panics</text>
  
  <path d="M 510 170 L 590 170" stroke="#06b6d4" stroke-width="3"/>
  
  <rect x="590" y="110" width="170" height="120" rx="10" fill="#1c1917" stroke="#f59e0b" stroke-width="2"/>
  <text x="675" y="145" fill="#fcd34d" font-family="system-ui" font-size="13" font-weight="700" text-anchor="middle">Secure Service Mesh</text>
  <text x="675" y="168" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="middle">Authorized Pod Envoy</text>
  <text x="675" y="195" fill="#10b981" font-family="monospace" font-size="10" text-anchor="middle">Zero Latency Bypass</text>
  
  <g transform="translate(40, 280)">
    <rect width="720" height="160" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
    <text x="25" y="32" fill="#e2e8f0" font-family="system-ui" font-size="13" font-weight="700">Memory Allocation &amp; Performance Safety Bounds</text>
    <text x="25" y="60" fill="#94a3b8" font-family="monospace" font-size="11">Total Resident Set Size: 84.2 MB (Bound: 128 MB max quota)</text>
    <text x="25" y="85" fill="#94a3b8" font-family="monospace" font-size="11">Per-packet Inspection Overhead: 142 nanoseconds (p99)</text>
    <text x="25" y="110" fill="#34d399" font-family="monospace" font-size="11">Active Firewall Rules: 148,920 tenant-scoped cryptographic ACLs</text>
    <text x="25" y="135" fill="#38bdf8" font-family="monospace" font-size="11">Real-time Telemetry: Exported via eBPF perf event buffer to Prometheus</text>
  </g>
</svg>`;

const toDataUrl = (svgString: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svgString.trim()).toString('base64')}`;

export const SEED_PROJECT_FILES: StoredFile[] = [
  {
    id: 'file_aurora_topo',
    name: 'aurora-cluster-mesh-topology.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 18450,
    uploadedById: 'usr_leader',
    uploadedByName: 'Marcus Chen',
    projectId: 'proj_aurora',
    category: 'diagram',
    description: 'Interactive architecture diagram illustrating multi-region edge gateways, consensus engine, and Raft storage ring.',
    tags: ['architecture', 'topology', 'mesh', 'consensus'],
    dataUrl: toDataUrl(topoDiagramSvg),
    thumbnailUrl: toDataUrl(topoDiagramSvg),
    createdAt: '2026-08-15T11:00:00.000Z',
  },
  {
    id: 'file_aurora_simd',
    name: 'simd-benchmark-vector-results.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 14200,
    uploadedById: 'usr_member',
    uploadedByName: 'Alex Rivera',
    projectId: 'proj_aurora',
    category: 'image',
    description: 'Differential throughput graph: 4.2x speedup (14.2k to 59.8k op/s) on AVX-512 SIMD batch verification.',
    tags: ['benchmark', 'simd', 'performance', 'ed25519'],
    dataUrl: toDataUrl(simdChartSvg),
    thumbnailUrl: toDataUrl(simdChartSvg),
    createdAt: '2026-08-09T17:30:00.000Z',
  },
  {
    id: 'file_aurora_rfc',
    name: 'Aurora-Protocol-RFC-v3.4-Draft.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2458000,
    uploadedById: 'usr_leader',
    uploadedByName: 'Marcus Chen',
    projectId: 'proj_aurora',
    category: 'document',
    description: 'Technical whitepaper and formal mathematical specification of Aurora state verification and consensus handshakes.',
    tags: ['spec', 'rfc', 'whitepaper', 'crypto'],
    dataUrl: 'https://docs.internal.nexora/rfc-aurora-3.4.pdf',
    createdAt: '2026-08-12T14:00:00.000Z',
  },
  {
    id: 'file_aurora_telemetry',
    name: 'chaos-cluster-telemetry-run2918.json',
    mimeType: 'application/json',
    sizeBytes: 45200,
    uploadedById: 'usr_member',
    uploadedByName: 'Alex Rivera',
    projectId: 'proj_aurora',
    category: 'code',
    description: 'Full 48-hour continuous cycle telemetry output during simulated split-brain network partitions.',
    tags: ['chaos', 'telemetry', 'logs', 'partition-test'],
    dataUrl: 'data:application/json;base64,eyJyZXN1bHQiOiAiY2x1c3Rlcl9jb252ZXJnZWRfb2siLCAibGF0ZW5jeSI6IDI4MCwgInBhcnRpdGlvbnNfcmVzb2x2ZWQiOiAxMiwgImRyb3BwZWRfcGFja2V0cyI6IDAsICJqZXR0eSI6ICJvazIifQ==',
    createdAt: '2026-09-11T15:18:00.000Z',
  },
  {
    id: 'file_aurora_video',
    name: 'chaos-partition-healing-demo.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 12400000,
    uploadedById: 'usr_member',
    uploadedByName: 'Alex Rivera',
    projectId: 'proj_aurora',
    category: 'video',
    description: '2-minute screen recording demonstrating split-brain network recovery and Raft journal resynchronization.',
    tags: ['demo', 'chaos', 'screencast', 'healing'],
    dataUrl: 'https://storage.internal.nexora/media/aurora-chaos-demo.mp4',
    createdAt: '2026-09-11T15:30:00.000Z',
  },
  {
    id: 'file_aurora_audit',
    name: 'cryptographic-audit-verification-seal.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 12900,
    uploadedById: 'usr_owner',
    uploadedByName: 'Elena Vance',
    projectId: 'proj_aurora',
    category: 'image',
    description: 'Official verified Nexora Cryptographic Security Seal for zero-defect SIMD implementation batch.',
    tags: ['audit', 'security', 'certificate', 'seal'],
    dataUrl: toDataUrl(auditSealSvg),
    thumbnailUrl: toDataUrl(auditSealSvg),
    createdAt: '2026-08-10T12:00:00.000Z',
  },
  {
    id: 'file_zt_ebpf_spec',
    name: 'Zero-Trust-Gateway-eBPF-Memory-Spec.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1850000,
    uploadedById: 'usr_leader',
    uploadedByName: 'Marcus Chen',
    projectId: 'proj_zerotrust',
    category: 'document',
    description: 'Strict kernel map size boundaries, ring buffer quotas, and verifier tail-call recursion limits.',
    tags: ['spec', 'ebpf', 'kernel', 'memory'],
    dataUrl: 'https://docs.internal.nexora/zt-ebpf-spec.md',
    createdAt: '2026-09-10T12:00:00.000Z',
  },
  {
    id: 'file_zt_flow',
    name: 'ebpf-packet-filter-architecture.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: 16800,
    uploadedById: 'usr_leader',
    uploadedByName: 'Marcus Chen',
    projectId: 'proj_zerotrust',
    category: 'diagram',
    description: 'eBPF kernel socket filter hook flow and memory allocation diagram for zero-trust traffic interception.',
    tags: ['architecture', 'ebpf', 'networking', 'diagram'],
    dataUrl: toDataUrl(zeroTrustFlowSvg),
    thumbnailUrl: toDataUrl(zeroTrustFlowSvg),
    createdAt: '2026-09-10T14:30:00.000Z',
  },
];
