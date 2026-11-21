"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, Sparkles, Zap, Star } from "lucide-react";

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

    const particleCount = Math.min(75, Math.max(35, Math.floor((width * height) / 18000)));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const radius = Math.random() * 2.5 + 1.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.25, // Gentle upward flow
        radius,
        baseAlpha: Math.random() * 0.4 + 0.45,
        alpha: Math.random() * 0.4 + 0.45,
        alphaSpeed: Math.random() * 0.03 + 0.01,
        color,
        glowSize: Math.random() * 14 + 8,
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

    const bokehCount = 10;
    const bokehColors = [
      "245, 158, 11",  // Amber
      "20, 184, 166",  // Teal
      "139, 92, 246",  // Purple
      "59, 130, 246",  // Blue
    ];

    const bokehs: BokehOrb[] = [];
    for (let i = 0; i < bokehCount; i++) {
      bokehs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 35 + 25,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.35 - 0.15,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        alpha: Math.random() * 0.16 + 0.08,
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
        grad.addColorStop(0.7, `rgba(${b.color}, ${b.alpha * 0.4})`);
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

          if (dist < 120) {
            const lineAlpha = (1 - dist / 120) * 0.22;
            const grad = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );
            grad.addColorStop(0, `${particles[i].color}${lineAlpha})`);
            grad.addColorStop(1, `${particles[j].color}${lineAlpha})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 3. Draw luminous sparkling floating particles
      for (const p of particles) {
        p.floatPhase += dt * 1.5;
        p.x += p.vx + Math.sin(p.floatPhase) * 0.3;
        p.y += p.vy;

        p.alpha += Math.sin(time * 0.003 + p.x) * p.alphaSpeed;
        const currentAlpha = Math.max(0.2, Math.min(0.95, p.alpha));

        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;
        if (p.y < -15) p.y = height + 15;
        if (p.y > height + 15) p.y = -15;

        // Glowing outer halo
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowSize);
        halo.addColorStop(0, `${p.color}${currentAlpha * 0.85})`);
        halo.addColorStop(0.5, `${p.color}${currentAlpha * 0.25})`);
        halo.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright sparkling core
        ctx.fillStyle = `${p.color}${Math.min(1, currentAlpha + 0.3)})`;
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1d] text-slate-100 flex flex-col items-center justify-center p-4 select-none">
      {/* ── 1. Vibrant Multi-Color Cosmic Aurora Gradients (NO SOLID BLACK!) ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Top-Left Radiant Golden Amber Sunburst */}
        <div
          className="absolute -top-24 -left-24 size-[480px] sm:size-[620px] rounded-full blur-[100px] opacity-60 animate-float-slow-1"
          style={{
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.25) 45%, transparent 75%)",
          }}
        />

        {/* Bottom-Right Radiant Electric Cyan / Teal Aurora */}
        <div
          className="absolute -bottom-28 -right-28 size-[520px] sm:size-[680px] rounded-full blur-[110px] opacity-65 animate-float-slow-2"
          style={{
            background: "radial-gradient(circle, rgba(20, 184, 166, 0.45) 0%, rgba(6, 182, 212, 0.25) 45%, transparent 75%)",
          }}
        />

        {/* Top-Right Royal Indigo / Purple Nebula */}
        <div
          className="absolute top-1/4 -right-20 size-[420px] sm:size-[560px] rounded-full blur-[105px] opacity-55 animate-float-slow-3"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 75%)",
          }}
        />

        {/* Center-Bottom Warm Emerald / Gold Glow */}
        <div
          className="absolute -bottom-20 left-1/4 size-[400px] sm:size-[500px] rounded-full blur-[100px] opacity-45 animate-float-slow-1"
          style={{
            background: "radial-gradient(circle, rgba(234, 179, 8, 0.35) 0%, rgba(16, 185, 129, 0.18) 50%, transparent 75%)",
          }}
        />
      </div>

      {/* ── 2. Dynamic High-Performance Particle & Bokeh Canvas ── */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 size-full"
      />

      {/* ── 3. High-End 3D Luminous Floating Glass Spheres with Specular Shine ── */}
      {/* Top-Left Floating Amber 3D Orb */}
      <div
        className="pointer-events-none absolute top-12 left-6 sm:left-20 size-24 sm:size-32 rounded-full border border-amber-300/40 shadow-2xl shadow-amber-500/30 backdrop-blur-md animate-float-slow-1 flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(254, 240, 138, 0.75) 0%, rgba(245, 158, 11, 0.5) 40%, rgba(180, 83, 9, 0.2) 80%, transparent 100%)",
        }}
      >
        <div className="size-full rounded-full ring-2 ring-amber-400/20" />
      </div>

      {/* Bottom-Right Floating Cyan 3D Orb */}
      <div
        className="pointer-events-none absolute bottom-14 right-6 sm:right-24 size-28 sm:size-36 rounded-full border border-teal-300/40 shadow-2xl shadow-teal-500/30 backdrop-blur-md animate-float-slow-2 flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(204, 251, 241, 0.7) 0%, rgba(20, 184, 166, 0.5) 40%, rgba(15, 118, 110, 0.25) 80%, transparent 100%)",
        }}
      >
        <div className="size-full rounded-full ring-2 ring-teal-400/20" />
      </div>

      {/* Top-Right Floating Purple Crystal Orb */}
      <div
        className="pointer-events-none absolute top-20 right-8 sm:right-32 size-20 sm:size-24 rounded-full border border-purple-300/40 shadow-xl shadow-purple-500/30 backdrop-blur-md animate-float-slow-3 flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(243, 232, 255, 0.7) 0%, rgba(168, 85, 247, 0.45) 45%, rgba(107, 33, 168, 0.2) 85%, transparent 100%)",
        }}
      />

      {/* Bottom-Left Floating Emerald Glass Orb */}
      <div
        className="pointer-events-none absolute bottom-24 left-10 sm:left-32 size-16 sm:size-20 rounded-full border border-emerald-300/40 shadow-xl shadow-emerald-500/30 backdrop-blur-md animate-float-slow-1 flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(209, 250, 229, 0.7) 0%, rgba(16, 185, 129, 0.45) 45%, rgba(6, 95, 70, 0.2) 85%, transparent 100%)",
        }}
      />

      {/* ── 4. Floating Marketplace Floating Badges (Lively & Attractive) ── */}
      {/* Top Right: Fast ETB Escrow Badge */}
      <div className="pointer-events-none hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#141d33]/85 border border-amber-400/40 shadow-xl shadow-amber-500/20 backdrop-blur-xl absolute top-16 right-12 animate-float-badge-1 z-0">
        <div className="size-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30">
          <Zap size={15} className="fill-slate-950" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-amber-300 tracking-wide">Instant ETB Escrow</p>
          <p className="text-[10px] text-slate-300">Fast & 100% Safe Payments</p>
        </div>
      </div>

      {/* Mid Left: Secure Platform Badge */}
      <div className="pointer-events-none hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#141d33]/85 border border-teal-400/40 shadow-xl shadow-teal-500/20 backdrop-blur-xl absolute top-1/2 -translate-y-12 left-10 animate-float-badge-2 z-0">
        <div className="size-7 rounded-xl bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/30">
          <ShieldCheck size={16} className="text-slate-950" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-teal-300 tracking-wide">Verified Channels</p>
          <p className="text-[10px] text-slate-300">Guaranteed Account Handover</p>
        </div>
      </div>

      {/* Bottom Right: Top Rated Deals Badge */}
      <div className="pointer-events-none hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#141d33]/85 border border-purple-400/40 shadow-xl shadow-purple-500/20 backdrop-blur-xl absolute bottom-20 right-14 animate-float-badge-3 z-0">
        <div className="size-7 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
          <Star size={15} className="fill-white" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-purple-200 tracking-wide">#1 Ethiopian Market</p>
          <p className="text-[10px] text-slate-300">Telegram, YouTube, TikTok</p>
        </div>
      </div>

      {/* ── 5. Sparkling Twinkling Floating Stars ── */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 size-4 text-amber-300 animate-pulse opacity-80">
        ✦
      </div>
      <div className="pointer-events-none absolute top-3/4 right-1/3 size-4 text-teal-300 animate-pulse opacity-75" style={{ animationDelay: "1.2s" }}>
        ✦
      </div>
      <div className="pointer-events-none absolute top-1/3 right-1/4 size-3 text-purple-300 animate-pulse opacity-70" style={{ animationDelay: "2.5s" }}>
        ★
      </div>

      {/* ── 6. Futuristic Radial Matrix Dot Grid Overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(rgba(245, 158, 11, 0.45) 1.2px, transparent 1.2px), radial-gradient(rgba(45, 212, 191, 0.35) 1px, transparent 1px)",
          backgroundSize: "32px 32px, 16px 16px",
          backgroundPosition: "0 0, 16px 16px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 100%)",
        }}
      />

      {/* ── 7. Luminous Top & Bottom Edge Horizon Lasers ── */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 shadow-[0_0_20px_rgba(245,158,11,1)]" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-80 shadow-[0_0_20px_rgba(20,184,166,1)]" />

      {/* ── 8. Foreground Form Card ── */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
