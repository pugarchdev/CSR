"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return lenisRef.current;
}

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider(props: SmoothScrollProviderProps) {
  useSmoothScroll();
  return props.children;
}
