// Motion Components - Fixed version
"use client";

import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion";
import { ReactNode, useEffect, useState, useRef } from "react";
import { pageTransition, fadeInUp, fadeIn, staggerContainer, staggerItem } from "./variants";
import { cn } from "@/lib/utils";

// ============================================
// Animated Page Wrapper
// ============================================

interface AnimatedPageProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "up" | "slide";
}

export function AnimatedPage({ 
  children, 
  className, 
  variant = "up",
  ...props 
}: AnimatedPageProps) {
  const variants = {
    fade: fadeIn,
    up: fadeInUp,
    slide: pageTransition,
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[variant]}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Animated Card
// ============================================

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  index?: number;
}

export function AnimatedCard({ 
  children, 
  className, 
  hover = true,
  index = 0,
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={hover ? { y: -2 } : undefined}
      className={cn(
        "bg-white border border-gray-200 rounded-lg",
        hover && "shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Animated Fade In
// ============================================

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.3,
  direction = "up",
  className 
}: FadeInProps) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay,
        duration,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Stagger Container
// ============================================

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
  className?: string;
}

export function StaggerContainer({ 
  children, 
  staggerDelay = 0.05,
  delayChildren = 0.1,
  className 
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Stagger Item
// ============================================

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Animated List
// ============================================

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ 
  children, 
  className,
  staggerDelay = 0.05 
}: AnimatedListProps) {
  return (
    <StaggerContainer staggerDelay={staggerDelay} className={className}>
      {children}
    </StaggerContainer>
  );
}

export function AnimatedListItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <StaggerItem className={className}>
      {children}
    </StaggerItem>
  );
}

// ============================================
// Animated Counter
// ============================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 0.5,
  className 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {count.toLocaleString()}
    </motion.span>
  );
}

// ============================================
// Animated Presence
// ============================================

interface AnimatedPresenceProps {
  children: ReactNode;
  mode?: "sync" | "wait" | "popLayout";
}

export function AnimatedPresenceWrapper({ 
  children, 
  mode = "wait" 
}: AnimatedPresenceProps) {
  return (
    <AnimatePresence mode={mode}>
      {children}
    </AnimatePresence>
  );
}

// ============================================
// Loading Spinner
// ============================================

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn(sizes[size], className)}
    >
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
}

// ============================================
// Skeleton Loading
// ============================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn("bg-gray-200 rounded", className)}
      style={{ width, height }}
    />
  );
}

// ============================================
// Shimmer Effect
// ============================================

interface ShimmerProps {
  className?: string;
  children?: ReactNode;
}

export function Shimmer({ className, children }: ShimmerProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
    </div>
  );
}

// ============================================
// Pulse Animation
// ============================================

interface PulseProps {
  children: ReactNode;
  className?: string;
}

export function Pulse({ children, className }: PulseProps) {
  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Shake Animation
// ============================================

interface ShakeProps {
  children: ReactNode;
  isShaking?: boolean;
  className?: string;
}

export function Shake({ children, isShaking, className }: ShakeProps) {
  return (
    <motion.div
      animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Re-exports from framer-motion
// ============================================

export { AnimatePresence, motion };
export type { HTMLMotionProps };
