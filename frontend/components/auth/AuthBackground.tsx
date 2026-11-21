"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, Sparkles, Zap, Star, Coins, Lock } from "lucide-react";

export default function AuthBackground({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle palette with rich, vibrant colors
    const colors = [
      "rgba(251, 191, 36, ",  // Warm Gold / Amber
      "rgba(45, 212, 191, ",  // Electric Teal
      "rgba(168, 85, 247, ",  // Vivid Purple
      "rgba(96, 165, 250, ",  // Bright Sky Blue
      "rgba(244, 114, 182, ", // Rose Pink
      "rgba(255, 255, 255, ", // Bright Star White
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
      alpha: number;
      alphaSpeed: number;
      color: string;
      glowSize: number;
      floatPhase: number;
    }

    const particleCount = Math.min(85, Math.max(45, Math.floor((width * height) / 16000)));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const radius = Math.random() * 2.8 + 1.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7 - 0.35, // Smooth upward flow
        radius,
        baseAlpha: Math.random() * 0.4 + 0.5,
        alpha: Math.random() * 0.4 + 0.5,
        alphaSpeed: Math.random() * 0.03 + 0.015,
        color,
        glowSize: Math.random() * 16 + 10,
        floatPhase: Math.random() * Math.PI * 2,
      });
    }

    // Soft floating Bokeh light orbs in the canvas
    interface BokehOrb {
      x: number;
      y: number;
      radius: number;
      vy: number;
      vx: number;
      color: string;
      alpha: number;
    }

    const bokehCount = 14;
    const bokehColors = [
      "245, 158, 11",  // Warm Amber
      "20, 184, 166",  // Electric Teal
      "139, 92, 246",  // Royal Purple
      "59, 130, 246",  // Sky Blue
      "16, 185, 129",  // Emerald
    ];

    const bokehs: BokehOrb[] = [];
    for (let i = 0; i < bokehCount; i++) {
      bokehs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 60 + 35,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.4 - 0.15,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        alpha: Math.random() * 0.22 + 0.12,
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw floating soft Bokeh orbs
      for (const b of bokehs) {
        b.x += b.vx;
        b.y += b.vy;

        if (b.y < -b.radius * 2) {
          b.y = height + b.radius * 2;
          b.x = Math.random() * width;
        }
        if (b.x < -b.radius * 2) b.x = width + b.radius;
        if (b.x > width + b.radius * 2) b.x = -b.radius;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        grad.addColorStop(0, `rgba(${b.color}, ${b.alpha})`);
        grad.addColorStop(0.65, `rgba(${b.color}, ${b.alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${b.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw connecting energy web lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.28;
            const grad = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );
            grad.addColorStop(0, `${particles[i].color}${lineAlpha})`);
            grad.addColorStop(1, `${particles[j].color}${lineAlpha})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 3. Draw luminous sparkling floating particles
      for (const p of particles) {
        p.floatPhase += dt * 1.6;
        p.x += p.vx + Math.sin(p.floatPhase) * 0.35;
        p.y += p.vy;

        p.alpha += Math.sin(time * 0.0035 + p.x) * p.alphaSpeed;
        const currentAlpha = Math.max(0.25, Math.min(0.95, p.alpha));

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Glowing outer halo
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowSize);
        halo.addColorStop(0, `${p.color}${currentAlpha * 0.9})`);
        halo.addColorStop(0.5, `${p.color}${currentAlpha * 0.3})`);
        halo.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright sparkling core
        ctx.fillStyle = `${p.color}${Math.min(1, currentAlpha + 0.35)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#0b101d] via-[#10172a] to-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* ── 1. Vibrant Cosmic Aurora Glow Fields (Rich & Highly Visible) ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Central Radiant Golden Crown Halo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] sm:size-[850px] rounded-full blur-[120px] opacity-75 animate-aurora-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.42) 0%, rgba(217, 119, 6, 0.22) 35%, rgba(20, 184, 166, 0.18) 60%, transparent 80%)",
          }}
        />

        {/* Top-Left Radiant Golden Amber Sunburst */}
        <div
          className="absolute -top-20 -left-20 size-[500px] sm:size-[680px] rounded-full blur-[90px] opacity-80 animate-float-slow-1"
          style={{
            background:
              "radial-gradient(circle, rgba(251, 191, 36, 0.55) 0%, rgba(245, 158, 11, 0.32) 45%, transparent 75%)",
          }}
        />

        {/* Bottom-Right Radiant Electric Cyan / Teal Aurora */}
        <div
          className="absolute -bottom-24 -right-24 size-[520px] sm:size-[720px] rounded-full blur-[100px] opacity-85 animate-float-slow-2"
          style={{
            background:
              "radial-gradient(circle, rgba(45, 212, 191, 0.55) 0%, rgba(14, 165, 233, 0.35) 45%, transparent 75%)",
          }}
        />

        {/* Top-Right Royal Indigo / Purple Nebula */}
        <div
          className="absolute top-10 -right-20 size-[450px] sm:size-[620px] rounded-full blur-[95px] opacity-75 animate-float-slow-3"
          style={{
            background:
              "radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(99, 102, 241, 0.3) 50%, transparent 75%)",
          }}
        />

        {/* Bottom-Left Warm Emerald Glowing Well */}
        <div
          className="absolute -bottom-16 left-10 size-[420px] sm:size-[560px] rounded-full blur-[90px] opacity-65 animate-float-slow-1"
          style={{
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.2) 50%, transparent 75%)",
          }}
        />
      </div>

      {/* ── 2. Dynamic High-Performance Particle & Bokeh Canvas ── */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 size-full"
      />

      {/* ── 3. High-End 3D Luminous Floating Glass Spheres ── */}
      {/* 1. Large Top-Left Amber 3D Orb with Specular Highlight */}
      <div
        className="pointer-events-none absolute top-10 left-6 sm:left-16 size-24 sm:size-32 rounded-full border-2 border-amber-300/60 shadow-[0_0_40px_rgba(245,158,11,0.5)] backdrop-blur-md animate-float-slow-1 flex items-center justify-center z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.95) 0%, rgba(254, 240, 138, 0.8) 25%, rgba(245, 158, 11, 0.65) 55%, rgba(180, 83, 9, 0.4) 85%, transparent 100%)",
        }}
      >
        <div className="size-full rounded-full ring-2 ring-amber-300/40" />
      </div>

      {/* 2. Large Bottom-Right Cyan 3D Orb */}
      <div
        className="pointer-events-none absolute bottom-12 right-6 sm:right-20 size-28 sm:size-36 rounded-full border-2 border-teal-300/60 shadow-[0_0_45px_rgba(20,184,166,0.5)] backdrop-blur-md animate-float-slow-2 flex items-center justify-center z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.95) 0%, rgba(204, 251, 241, 0.8) 25%, rgba(20, 184, 166, 0.65) 55%, rgba(15, 118, 110, 0.4) 85%, transparent 100%)",
        }}
      >
        <div className="size-full rounded-full ring-2 ring-teal-300/40" />
      </div>

      {/* 3. Medium Top-Right Purple Crystal Orb */}
      <div
        className="pointer-events-none absolute top-16 right-8 sm:right-28 size-20 sm:size-24 rounded-full border-2 border-purple-300/60 shadow-[0_0_35px_rgba(168,85,247,0.45)] backdrop-blur-md animate-float-slow-3 flex items-center justify-center z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.9) 0%, rgba(243, 232, 255, 0.8) 25%, rgba(168, 85, 247, 0.6) 55%, rgba(107, 33, 168, 0.35) 85%, transparent 100%)",
        }}
      />

      {/* 4. Small Mid-Left Emerald Glass Orb */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-y-24 left-8 sm:left-24 size-16 sm:size-20 rounded-full border border-emerald-300/60 shadow-[0_0_30px_rgba(16,185,129,0.45)] backdrop-blur-md animate-float-orb-sm flex items-center justify-center z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.9) 0%, rgba(209, 250, 229, 0.75) 25%, rgba(16, 185, 129, 0.55) 55%, rgba(6, 95, 70, 0.3) 85%, transparent 100%)",
        }}
      />

      {/* 5. Small Bottom-Left Gold Sphere */}
      <div
        className="pointer-events-none absolute bottom-28 left-6 sm:left-36 size-14 sm:size-16 rounded-full border border-yellow-300/60 shadow-[0_0_30px_rgba(234,179,8,0.5)] backdrop-blur-md animate-float-orb-md flex items-center justify-center z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.95) 0%, rgba(254, 240, 138, 0.8) 25%, rgba(234, 179, 8, 0.6) 55%, rgba(161, 98, 7, 0.35) 85%, transparent 100%)",
        }}
      />

      {/* ── 4. 3D Floating Gold Coin & Shield Emblems ── */}
      {/* Floating 3D Gold Coin Emblem */}
      <div className="pointer-events-none hidden lg:flex items-center justify-center size-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-yellow-200 shadow-[0_0_30px_rgba(245,158,11,0.6)] absolute top-32 left-44 animate-float-coin z-0">
        <Coins size={24} className="text-slate-950 drop-shadow" />
      </div>

      {/* Floating Safe Lock Emblem */}
      <div className="pointer-events-none hidden lg:flex items-center justify-center size-12 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-400 to-teal-200 border-2 border-teal-200 shadow-[0_0_25px_rgba(20,184,166,0.6)] absolute bottom-40 right-48 animate-float-badge-2 z-0">
        <Lock size={20} className="text-slate-950 drop-shadow" />
      </div>

      {/* ── 5. Floating Trust & Feature Badges (Responsive & Dynamic) ── */}
      {/* Top Right: Fast ETB Escrow Badge */}
      <div className="pointer-events-none hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#131b2e]/90 border border-amber-400/50 shadow-[0_10px_25px_rgba(245,158,11,0.25)] backdrop-blur-xl absolute top-14 right-8 lg:right-16 animate-float-badge-1 z-0">
        <div className="size-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/40">
          <Zap size={16} className="fill-slate-950" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-amber-300 tracking-wide flex items-center gap-1">
            <span>Instant ETB Escrow</span>
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </p>
          <p className="text-[10px] text-slate-300 font-medium">Fast & 100% Safe Payments</p>
        </div>
      </div>

      {/* Mid Left: Verified Platform Badge */}
      <div className="pointer-events-none hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#131b2e]/90 border border-teal-400/50 shadow-[0_10px_25px_rgba(20,184,166,0.25)] backdrop-blur-xl absolute top-1/2 -translate-y-8 left-6 lg:left-14 animate-float-badge-2 z-0">
        <div className="size-8 rounded-xl bg-gradient-to-tr from-teal-400 via-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/40">
          <ShieldCheck size={18} className="text-slate-950" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-teal-300 tracking-wide flex items-center gap-1">
            <span>Verified Channels</span>
            <span className="text-[10px] text-teal-200">✓</span>
          </p>
          <p className="text-[10px] text-slate-300 font-medium">Guaranteed Account Handover</p>
        </div>
      </div>

      {/* Bottom Right: Top Rated Deals Badge */}
      <div className="pointer-events-none hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#131b2e]/90 border border-purple-400/50 shadow-[0_10px_25px_rgba(168,85,247,0.25)] backdrop-blur-xl absolute bottom-16 right-8 lg:right-20 animate-float-badge-3 z-0">
        <div className="size-8 rounded-xl bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/40">
          <Star size={16} className="fill-white" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-purple-200 tracking-wide">#1 Ethiopian Market</p>
          <p className="text-[10px] text-slate-300 font-medium">Telegram, YouTube, TikTok</p>
        </div>
      </div>

      {/* ── 6. Sparkling Twinkling Floating Starbursts ── */}
      <div className="pointer-events-none absolute top-1/4 left-1/5 text-amber-300 animate-pulse text-lg opacity-90 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
        ✦
      </div>
      <div className="pointer-events-none absolute top-2/3 right-1/4 text-teal-300 animate-pulse text-xl opacity-85 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" style={{ animationDelay: "1s" }}>
        ✦
      </div>
      <div className="pointer-events-none absolute top-1/3 right-1/6 text-purple-300 animate-pulse text-base opacity-80 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" style={{ animationDelay: "2s" }}>
        ★
      </div>
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 text-yellow-200 animate-pulse text-lg opacity-85 drop-shadow-[0_0_8px_rgba(254,240,138,0.8)]" style={{ animationDelay: "3s" }}>
        ✦
      </div>

      {/* ── 7. Cybernetic Matrix Dot Grid Overlay with 3D Depth ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(245, 158, 11, 0.5) 1.2px, transparent 1.2px), radial-gradient(rgba(45, 212, 191, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px, 14px 14px",
          backgroundPosition: "0 0, 14px 14px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, #000 45%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, #000 45%, transparent 100%)",
        }}
      />

      {/* ── 8. Luminous Top & Bottom Edge Horizon Laser Beams ── */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90 shadow-[0_0_25px_rgba(245,158,11,1)]" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-90 shadow-[0_0_25px_rgba(20,184,166,1)]" />

      {/* ── 9. Foreground Form Card ── */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center my-auto py-8">
        {children}
      </div>
    </div>
  );
}