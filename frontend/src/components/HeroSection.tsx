"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Building2, Landmark, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

/* ─── Default slides (overridden by API fetch) ─── */
const DEFAULT_SLIDES = [
  {
    id: "1",
    image: "/hero_slide_1.png",
    title: "One Platform. Many Partners.",
    highlight: "Greater Impact.",
    subtitle:
      "MahaCSR Setu is the official convergence platform connecting Government, Corporates and Implementing Agencies to drive sustainable development across Maharashtra.",
  },
  {
    id: "2",
    image: "/hero_slide_2.png",
    title: "Transforming Rural Maharashtra",
    highlight: "Through Convergence.",
    subtitle:
      "CSR investments aligned with district development priorities, driving sustainable infrastructure, education and healthcare across every taluka.",
  },
  {
    id: "3",
    image: "/hero_slide_3.png",
    title: "State-Led. District-Executed.",
    highlight: "Corporate Powered.",
    subtitle:
      "A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer for transparent, time-bound project delivery.",
  },
];

/* ─── Mouse Trail Canvas ─── */
function MouseTrailCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number }[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Spawn particles
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          size: Math.random() * 3 + 1,
          hue: 200 + Math.random() * 40,
        });
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0.01);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life *= 0.96;
        p.size *= 0.98;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life * 0.6})`;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life * 0.15})`;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 pointer-events-auto"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

/* ─── 3D Slide Transitions ─── */
const slideVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 25 : -25,
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.85,
    z: -200,
  }),
  center: {
    rotateY: 0,
    x: 0,
    opacity: 1,
    scale: 1,
    z: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? -25 : 25,
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.85,
    z: -200,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

const textReveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] },
  }),
};

const statsContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.6, staggerChildren: 0.1 },
  },
};

const statItem = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 12 },
  },
};

/* ─── Main Hero Section ─── */
export default function HeroSection() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch slides from API
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/platform/hero-slides`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setSlides(data);
      })
      .catch(() => {
        /* Use defaults */
      });
  }, []);

  // Auto-rotate carousel
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
  }, [slides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTimer]);

  const goTo = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
    startTimer();
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
    startTimer();
  };

  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
    startTimer();
  };

  // Mouse parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const slide = slides[current];

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden bg-slate-950"
      style={{ minHeight: "600px", perspective: "1200px" }}
    >
      {/* Mouse trail canvas */}
      <MouseTrailCanvas />

      {/* Animated background image with 3D parallax */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{
              backgroundImage: `url('${slide.image}')`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-950/75" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />

      {/* Floating orbs */}
      <div
        className="absolute z-10 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"
        style={{
          top: "10%",
          left: "5%",
          transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 15}px)`,
          transition: "transform 0.4s ease-out",
        }}
      />
      <div
        className="absolute z-10 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl"
        style={{
          bottom: "15%",
          right: "10%",
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -12}px)`,
          transition: "transform 0.4s ease-out",
        }}
      />

      {/* Content */}
      <div className="relative z-30 mx-auto max-w-[1380px] w-full px-4 py-12 sm:px-6 md:px-8 flex flex-col justify-center min-h-[680px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Carousel Title & Subtitle */}
          <div className="lg:col-span-7 flex flex-col items-start text-left pointer-events-none">
            {/* Accent bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-20 h-1 bg-gradient-to-r from-amber-400 to-blue-500 mb-6 origin-left rounded-full"
            />

            {/* Title with 3D text reveal */}
            <AnimatePresence mode="wait">
              <motion.div key={slide.id} className="flex flex-col items-start">
                <motion.h1
                  custom={0}
                  variants={textReveal}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
                  style={{
                    transform: `perspective(600px) rotateX(${mousePos.y * -2}deg) rotateY(${mousePos.x * 2}deg)`,
                    transition: "transform 0.3s ease-out",
                    textShadow: "0 4px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  {slide.title}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-blue-400">
                    {slide.highlight}
                  </span>
                </motion.h1>

                <motion.p
                  custom={1}
                  variants={textReveal}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  className="mt-6 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl"
                >
                  {slide.subtitle}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            {/* Carousel navigation dots */}
            <div className="mt-8 flex items-center gap-3 pointer-events-auto">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`relative h-2 rounded-full transition-all duration-500 ${
                    i === current ? "w-10 bg-gradient-to-r from-amber-400 to-blue-500" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                >
                  {i === current && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-blue-500 shadow-lg shadow-amber-500/20"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Unified Glassmorphic Action Panel */}
          <div className="lg:col-span-5 pointer-events-auto w-full">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl shadow-slate-950/20 text-left flex flex-col gap-6">
              
              {/* Action 1: Partner with Maharashtra */}
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Building2 size={20} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">For Corporate Partners</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">Partner with Maharashtra</h4>
                  <p className="text-[11px] leading-relaxed text-white/80 mt-1.5">
                    Submit a CSR partnership enquiry, browse live government development needs, and track coordination.
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/partner-with-maharashtra"
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02] hover:no-underline"
                    >
                      Submit Partnership Enquiry <ArrowRight size={13} className="ml-1.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="h-[1px] bg-white/10 w-full" />

              {/* Action 2: Pitch a Development Need */}
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Landmark size={20} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">For Government Departments</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">Pitch a Development Need</h4>
                  <p className="text-[11px] leading-relaxed text-white/80 mt-1.5">
                    Pitch specific development needs with district, budget, and location evidence to seek CSR support.
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/pitch-development-need"
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 px-4 text-xs font-bold text-white transition-all shadow-md shadow-amber-500/10 hover:scale-[1.02] hover:no-underline"
                    >
                      Pitch Development Need <ArrowRight size={13} className="ml-1.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="h-[1px] bg-white/10 w-full" />

              {/* Action 3: Mini Track Status Bar */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">Track Enquiry or Pitch</span>
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Tracking ID to view status..."
                    className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        window.location.href = `/track?id=${(e.target as HTMLInputElement).value}`;
                      }
                    }}
                  />
                  <Link
                    href="/track"
                    className="inline-flex min-h-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 px-4 text-xs font-bold text-white transition-all border border-white/15 hover:no-underline"
                  >
                    Track <ArrowRight size={12} className="ml-1" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={statsContainer}
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full pointer-events-auto"
        >
          <motion.div
            variants={statItem}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left transition-all hover:bg-white/10 hover:border-white/20 cursor-default"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white leading-none">2,145+</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registered Corporates</div>
            </div>
          </motion.div>

          <motion.div
            variants={statItem}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left transition-all hover:bg-white/10 hover:border-white/20 cursor-default"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
              <Landmark size={18} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white leading-none">1,734+</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Implementing Agencies</div>
            </div>
          </motion.div>

          <motion.div
            variants={statItem}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-left transition-all hover:bg-white/10 hover:border-white/20 cursor-default"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/20 text-white shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white leading-none">4,812+</div>
              <div className="text-[9px] font-bold text-slate-200 uppercase tracking-widest mt-1">Projects Onboarded</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Left/Right arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight size={18} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-white/5">
        <motion.div
          key={current}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 6, ease: "linear" }}
          className="h-full bg-gradient-to-r from-amber-400 to-blue-500"
        />
      </div>
    </section>
  );
}
