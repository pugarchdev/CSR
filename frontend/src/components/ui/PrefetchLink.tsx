"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function PrefetchLink({ href, children, className, onClick }: PrefetchLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

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