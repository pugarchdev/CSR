import { ReactNode, CSSProperties } from "react";
import "../../styles/gov-theme.css";

export interface GovCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GovCard({ children, className = "", style }: GovCardProps) {
  return <div className={`gov-card ${className}`} style={style}>{children}</div>;
}

export interface GovCardHeaderProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GovCardHeader({ children, className = "", style }: GovCardHeaderProps) {
  return <div className={`gov-card-header ${className}`} style={style}>{children}</div>;
}

export interface GovCardTitleProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GovCardTitle({ children, className = "", style }: GovCardTitleProps) {
  return <h3 className={`gov-card-title ${className}`} style={style}>{children}</h3>;
}

export interface GovCardBodyProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GovCardBody({ children, className = "", style }: GovCardBodyProps) {
  return <div className={`gov-card-body ${className}`} style={style}>{children}</div>;
}

// Made with Bob
