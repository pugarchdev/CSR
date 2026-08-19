"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Building2, Landmark, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

/* ─── Default slides (overridden by API fetch) ─── */
const slideContent = [
  {
    title: "One Platform. Many Partners.",
    highlight: "Greater Impact.",
    subtitle:
      "MahaCSR Setu is the official convergence platform connecting Government, Corporates and Implementing Agencies to drive sustainable development across Maharashtra.",
    image: "/carousel/Gemini_Generated_Image_5g4qcn5g4qcn5g4q.jpg",
  },
  {
    title: "Transforming Maharashtra",
    highlight: "Through Convergence.",
    subtitle:
      "CSR investments aligned with district development priorities, driving sustainable infrastructure, education and healthcare across every taluka.",
    image: "/carousel/Gemini_Generated_Image_8tv4ar8tv4ar8tv4.jpg",
  },
  {
    title: "State-Led. District-Executed.",
    highlight: "Corporate Powered.",
    subtitle:
      "A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer for transparent, time-bound project delivery.",
    image: "/carousel/Gemini_Generated_Image_9qvw8v9qvw8v9qvw.jpg",
  },
];

const DEFAULT_SLIDES = slideContent.map((s, idx) => ({
  id: String(idx + 1),
  image: s.image,
  title: s.title,
  highlight: s.highlight,
  subtitle: s.subtitle,
}));

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

    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(canvas);

    const animate = () => {
      if (isVisible && particlesRef.current.length > 0) {
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
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      observer.disconnect();
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
    rotateY: direction > 0 ? 45 : -45,
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.75,
    z: -400,
  }),
  center: {
    rotateY: 0,
    x: 0,
    opacity: 1,
    scale: 1,
    z: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? -45 : 45,
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.75,
    z: -400,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLoggedIn(Boolean(localStorage.getItem("accessToken")));
    }
  }, []);

  // Preload and GPU decode all carousel images for instant zero-lag display
  useEffect(() => {
    if (typeof window === "undefined") return;
    slides.forEach((s) => {
      if (s.image) {
        const img = new window.Image();
        img.src = s.image;
        if ("decode" in img) {
          img.decode().catch(() => {});
        }
      }
    });
  }, [slides]);

  // Fetch slides from API
  useEffect(() => {
    fetch(`${API_BASE_URL}/platform/hero-slides`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const filtered = data.filter((s: any) => !s.image?.includes("hero_slide_"));
          if (filtered.length > 0) {
            setSlides(filtered);
            filtered.forEach((s: any) => {
              if (s.image && typeof window !== "undefined") {
                const img = new window.Image();
                img.src = s.image;
                if ("decode" in img) {
                  img.decode().catch(() => {});
                }
              }
            });
          }
        }
      })
      .catch(() => {
        /* Use defaults */
      });
  }, []);

  // Pre-decode next and previous slides when current changes
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;
    const nextIdx = (current + 1) % slides.length;
    const prevIdx = (current - 1 + slides.length) % slides.length;
    [slides[nextIdx], slides[prevIdx]].forEach((s) => {
      if (s?.image) {
        const img = new window.Image();
        img.src = s.image;
        if ("decode" in img) img.decode().catch(() => {});
      }
    });
  }, [current, slides]);

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

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;
    if (isLeftSwipe) {
      next();
    } else if (isRightSwipe) {
      prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden bg-slate-950 select-none"
      style={{ perspective: "1200px" }}
    >
      {/* Mouse trail canvas */}
      <MouseTrailCanvas />

      {/* Animated background image with 3D parallax & GPU acceleration */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            willChange: "transform, opacity",
          }}
        >
          <img
            src={slide.image}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 select-none"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-950/75" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />

      {/* Floating orbs */}
      <div
        className="absolute z-10 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl hidden sm:block"
        style={{
          top: "10%",
          left: "5%",
          transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 15}px)`,
          transition: "transform 0.4s ease-out",
        }}
      />
      <div
        className="absolute z-10 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl hidden sm:block"
        style={{
          bottom: "15%",
          right: "10%",
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -12}px)`,
          transition: "transform 0.4s ease-out",
        }}
      />

      {/* Content */}
      <div className="relative z-30 mx-auto max-w-[1370px] w-full px-3.5 pt-20 pb-6 sm:pt-28 sm:pb-14 md:pt-32 sm:px-6 md:px-8 flex flex-col justify-center items-center min-h-[460px] sm:min-h-[600px] md:min-h-[680px]">

        {/* Centered Title & Subtitle */}
        <div className="flex flex-col items-center text-center pointer-events-none max-w-4xl px-2 sm:px-0">
          {/* Accent bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-12 sm:w-20 h-1 bg-gradient-to-r from-amber-400 to-blue-500 mb-3.5 sm:mb-6 rounded-full"
          />

          {/* Title with 3D text reveal */}
          <AnimatePresence mode="wait">
            <motion.div key={slide.id} className="flex flex-col items-center">
              <motion.h1
                custom={0}
                variants={textReveal}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight px-1"
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
                className="mt-2.5 sm:mt-5 text-xs sm:text-sm md:text-base text-white/75 font-normal leading-relaxed max-w-2xl px-2 sm:px-0"
              >
                {slide.subtitle}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Carousel navigation dots */}
          <div className="mt-4 sm:mt-7 flex items-center justify-center gap-2 sm:gap-3 pointer-events-auto">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={`relative h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 sm:w-10 bg-gradient-to-r from-amber-400 to-blue-500" : "w-1.5 sm:w-2 bg-white/30 hover:bg-white/50"
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

        {/* Bottom Center: Two Action Cards (Visible on tablet/desktop, hidden on mobile so carousel image and title are not covered) */}
        <div className="hidden sm:flex mt-6 sm:mt-8 flex-col sm:flex-row items-stretch gap-3 sm:gap-4 pointer-events-auto w-full max-w-2xl px-0">
          {/* Card 1: Partner with Maharashtra */}
          <Link href={isLoggedIn ? "/partner-with-maharashtra" : "/login?next=/partner-with-maharashtra"} className="flex-1 hover:no-underline group">
            <div className="h-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all hover:bg-white/15 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-300 group-hover:bg-blue-500/35 transition-colors">
                <Building2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">Corporate Partners</span>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Partner with Maharashtra</h4>
              </div>
              <ArrowRight size={16} className="text-white/50 group-hover:text-blue-300 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </Link>

          {/* Card 2: Pitch a Development Need */}
          <Link href={isLoggedIn ? "/pitch-development-need" : "/login?next=/pitch-development-need"} className="flex-1 hover:no-underline group">
            <div className="h-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all hover:bg-white/15 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl bg-amber-500/25 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:bg-amber-500/35 transition-colors">
                <Landmark size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Government Depts</span>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Pitch a Development Need</h4>
              </div>
              <ArrowRight size={16} className="text-white/50 group-hover:text-amber-300 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </Link>
        </div>
      </div>

      {/* Liquid Glass Stats Strip — Below the Carousel (3 Compact Columns on Mobile) */}
      <div className="relative z-30 mx-auto max-w-[1380px] w-full px-3 sm:px-6 md:px-8 -mt-2 sm:-mt-6 mb-5 sm:mb-10">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <motion.div
            variants={statItem}
            className="liquid-glass-card flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1.5 sm:gap-4 py-2.5 sm:py-4 px-2 sm:px-6 text-center sm:text-left"
          >
            <div className="liquid-glass-icon h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl grid place-items-center text-blue-300 shrink-0">
              <Building2 size={16} className="sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center sm:justify-start gap-0.5">
                2,145<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-extrabold">+</span>
              </div>
              <div className="text-[8px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">
                Corporates
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={statItem}
            className="liquid-glass-card flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1.5 sm:gap-4 py-2.5 sm:py-4 px-2 sm:px-6 text-center sm:text-left"
          >
            <div className="liquid-glass-icon h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl grid place-items-center text-amber-300 shrink-0">
              <Landmark size={16} className="sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center sm:justify-start gap-0.5">
                1,734<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 font-extrabold">+</span>
              </div>
              <div className="text-[8px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">
                Agencies
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={statItem}
            className="liquid-glass-card flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-1.5 sm:gap-4 py-2.5 sm:py-4 px-2 sm:px-6 text-center sm:text-left"
          >
            <div className="liquid-glass-icon h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl grid place-items-center text-emerald-300 shrink-0">
              <CheckCircle2 size={16} className="sm:w-5 sm:h-5 drop-shadow-[0_2px_4px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center sm:justify-start gap-0.5">
                4,812<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-extrabold">+</span>
              </div>
              <div className="text-[8px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">
                Projects
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Left/Right arrows - hidden on mobile to avoid overlapping action cards */}
      <button
        onClick={prev}
        className="hidden sm:grid absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all hover:scale-110 shadow-lg"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </button>
      <button
        onClick={next}
        className="hidden sm:grid absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all hover:scale-110 shadow-lg"
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
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
