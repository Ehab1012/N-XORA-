import React, { useRef, useEffect } from 'react';

interface Web3ConstellationCanvasProps {
  className?: string;
  interactive?: boolean;
}

export function Web3ConstellationCanvas({ className = '', interactive = true }: Web3ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates for subtle interactive tilt
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Create 3D Nodes on a sphere/dome horizon
    const NUM_NODES = 65;
    interface Node3D {
      x: number;
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
      radius: number;
      pulsePhase: number;
      pulseSpeed: number;
      label?: string;
    }

    const nodes: Node3D[] = [];
    const labels = ['110010', '011010', '111010', '0.042', '59.8k', '0x9F4', 'NODE 08', '110101'];

    for (let i = 0; i < NUM_NODES; i++) {
      // Distribute along an elliptical arc/dome in lower half
      const u = (Math.random() - 0.5) * 2;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);

      const sphereR = Math.min(width * 0.45, 360);
      const bx = r * Math.cos(t) * sphereR;
      const by = (Math.abs(u) * 0.7 + 0.3) * (sphereR * 0.45); // curved dome
      const bz = r * Math.sin(t) * (sphereR * 0.6);

      nodes.push({
        x: bx,
        y: by,
        z: bz,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        radius: 1.5 + Math.random() * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        label: i % 8 === 0 ? labels[Math.floor(Math.random() * labels.length)] : undefined,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const tiltX = ((mouse.x - width / 2) / width) * 0.25;
      const tiltY = ((mouse.y - height / 2) / height) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // Deep cyber radial glow underneath the horizon
      const horizonY = height * 0.72;
      const glowGrad = ctx.createRadialGradient(width / 2, horizonY, 20, width / 2, horizonY, width * 0.55);
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      glowGrad.addColorStop(0.35, 'rgba(14, 116, 144, 0.12)');
      glowGrad.addColorStop(0.7, 'rgba(6, 78, 99, 0.04)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective projection parameters
      const fov = 400;
      const centerY = horizonY;
      const centerX = width / 2;

      // Project each node to 2D
      const projected: Array<{
        px: number;
        py: number;
        scale: number;
        node: Node3D;
        alpha: number;
      }> = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.pulsePhase += n.pulseSpeed;

        // Slow rotation + wave
        const wave = Math.sin(time + n.baseX * 0.01) * 8;
        const currentTiltX = tiltX + Math.sin(time * 0.4) * 0.05;

        // Rotate around Y
        const cosY = Math.cos(currentTiltX);
        const sinY = Math.sin(currentTiltX);

        let rx = n.baseX * cosY - n.baseZ * sinY;
        let rz = n.baseX * sinY + n.baseZ * cosY;
        let ry = n.baseY + wave + tiltY * 40;

        // Perspective
        const depth = rz + 450;
        if (depth <= 10) continue;

        const scale = fov / depth;
        const px = centerX + rx * scale;
        const py = centerY - ry * scale;

        const alpha = Math.min(1, Math.max(0.15, (rz + 250) / 450));

        projected.push({ px, py, scale, node: n, alpha });
      }

      // Draw connecting lines between close projected points
      const maxDistance = Math.min(width * 0.14, 110);

      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];

          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.45 * Math.min(p1.alpha, p2.alpha);
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw nodes and data labels
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const pulse = Math.sin(p.node.pulsePhase) * 0.5 + 0.5;
        const radius = p.node.radius * p.scale * (0.8 + pulse * 0.4);

        // Core glowing dot
        const dotGrad = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, radius * 2.8);
        dotGrad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        dotGrad.addColorStop(0.4, `rgba(34, 211, 238, ${p.alpha * 0.9})`);
        dotGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Small solid center
        ctx.fillStyle = `rgba(240, 253, 250, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(1, radius * 0.8), 0, Math.PI * 2);
        ctx.fill();

        // Optional hovering telemetry label
        if (p.node.label && p.alpha > 0.4) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(45, 212, 191, ${p.alpha * 0.75})`;
          ctx.fillText(p.node.label, p.px + 6, p.py - 6);

          // Small crosshair tick
          ctx.strokeStyle = `rgba(34, 211, 238, ${p.alpha * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(p.px + 2, p.py - 4);
          ctx.lineTo(p.px + 4, p.py - 4);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-none ${className}`}
      style={{ display: 'block' }}
    />
  );
}
