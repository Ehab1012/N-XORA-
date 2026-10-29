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
    let width = 900;
    let height = 450;

    const syncDimensions = () => {
      if (!canvas || !canvas.parentElement) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.clientWidth || 900;
      height = canvas.parentElement.clientHeight || 450;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncDimensions();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && canvas.parentElement
        ? new ResizeObserver(() => syncDimensions())
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', syncDimensions);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !canvas || prefersReducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const NUM_NODES = 68;
    interface Node3D {
      baseX: number;
      baseY: number;
      baseZ: number;
      radius: number;
      pulsePhase: number;
      pulseSpeed: number;
      isAnchor: boolean;
    }

    const nodes: Node3D[] = [];
    for (let i = 0; i < NUM_NODES; i++) {
      const u = (Math.random() - 0.5) * 2;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);

      const sphereR = Math.min(width * 0.46, 380);
      const bx = r * Math.cos(t) * sphereR;
      const by = (Math.abs(u) * 0.68 + 0.28) * (sphereR * 0.44);
      const bz = r * Math.sin(t) * (sphereR * 0.62);

      nodes.push({
        baseX: bx,
        baseY: by,
        baseZ: bz,
        radius: 1.3 + Math.random() * 1.9,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.022,
        isAnchor: i % 9 === 0,
      });
    }

    let time = 0;

    const renderFrame = () => {
      if (!prefersReducedMotion) {
        time += 0.012;
      }

      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const tiltX = ((mouse.x - width / 2) / Math.max(width, 1)) * 0.22;
      const tiltY = ((mouse.y - height / 2) / Math.max(height, 1)) * 0.12;

      ctx.clearRect(0, 0, width, height);

      const horizonY = height * 0.76;
      const glowGrad = ctx.createRadialGradient(
        width / 2,
        horizonY,
        16,
        width / 2,
        horizonY,
        width * 0.54
      );
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.20)');
      glowGrad.addColorStop(0.38, 'rgba(14, 116, 144, 0.10)');
      glowGrad.addColorStop(0.72, 'rgba(30, 58, 138, 0.04)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      const fov = 420;
      const centerX = width / 2;
      const centerY = horizonY;

      const projected: Array<{
        px: number;
        py: number;
        scale: number;
        node: Node3D;
        alpha: number;
      }> = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!prefersReducedMotion) {
          n.pulsePhase += n.pulseSpeed;
        }

        const wave = Math.sin(time + n.baseX * 0.01) * 7;
        const currentTiltX = tiltX + Math.sin(time * 0.35) * 0.045;

        const cosY = Math.cos(currentTiltX);
        const sinY = Math.sin(currentTiltX);

        const rx = n.baseX * cosY - n.baseZ * sinY;
        const rz = n.baseX * sinY + n.baseZ * cosY;
        const ry = n.baseY + wave + tiltY * 36;

        const depth = rz + 460;
        if (depth <= 10) continue;

        const scale = fov / depth;
        const px = centerX + rx * scale;
        const py = centerY - ry * scale;
        const alpha = Math.min(1, Math.max(0.14, (rz + 250) / 460));

        projected.push({ px, py, scale, node: n, alpha });
      }

      const maxDistance = Math.min(width * 0.14, 112);

      ctx.lineWidth = 0.9;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];

          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.42 * Math.min(p1.alpha, p2.alpha);
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const pulse = Math.sin(p.node.pulsePhase) * 0.5 + 0.5;
        const radius = p.node.radius * p.scale * (0.85 + pulse * 0.35);

        const haloRadius = p.node.isAnchor ? radius * 3.4 : radius * 2.5;
        const dotGrad = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, haloRadius);
        dotGrad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        dotGrad.addColorStop(0.38, `rgba(34, 211, 238, ${p.alpha * 0.85})`);
        dotGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(p.px, p.py, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(240, 253, 250, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.9, radius * 0.78), 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', syncDimensions);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-none ${className}`}
    />
  );
}
