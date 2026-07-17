// Card Component — Premium SaaS with 3D Mouse Tilt & Glare Effects
"use client";

import { motion, useMotionValue, useTransform, HTMLMotionProps } from "framer-motion";
import { ReactNode, useRef, MouseEvent, useState } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "elevated" | "outlined";

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  index?: number;
  variant?: CardVariant;
  tilt?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white border border-slate-200/60 shadow-elevation-1",
  glass: "bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass",
  elevated: "bg-white border border-slate-100 shadow-elevation-2",
  outlined: "bg-white/50 border border-slate-200/80",
};

export function Card({ 
  children, 
  className, 
  hover = true,
  index = 0,
  variant = "glass",
  tilt = true,
  ...props 
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for normalized coordinates (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Rotate card on hover
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  
  // Translate reflection / glare highlight position
  const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalize coordinate value relative to card center
    const relativeX = (e.clientX - rect.left) / width - 0.5;
    const relativeY = (e.clientY - rect.top) / height - 0.5;
    
    mouseX.set(relativeX);
    mouseY.set(relativeY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={tilt ? {
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000,
      } : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "rounded-2xl relative overflow-hidden group transition-all duration-300",
        variantStyles[variant],
        hover && "cursor-pointer hover:shadow-glass-lg",
        className
      )}
      {...props}
    >
      {/* Dynamic Glare/Light Reflection Overlay */}
      {tilt && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 180px at ${glareX} ${glareY}, rgba(255, 255, 255, 0.12), transparent)`,
          }}
        />
      )}
      
      {/* 3D Depth Content Wrapper */}
      <div style={tilt ? { transform: "translateZ(20px)" } : undefined}>
        {children}
      </div>
    </motion.div>
  );
}

export function CardHeader({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 border-b border-slate-100/80", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900 tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-5", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 border-t border-slate-100/60 bg-slate-50/30 rounded-b-2xl", className)}>
      {children}
    </div>
  );
}
