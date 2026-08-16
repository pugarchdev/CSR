"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function PrefetchLink({ href, children, className, onClick }: PrefetchLinkProps) {

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      prefetch={true}
      scroll={false}
    >
      {children}
    </Link>
  );
}