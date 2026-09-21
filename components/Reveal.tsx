"use client";

import React, { useEffect, useRef, useState } from "react";

export type RevealElement = "div" | "section" | "article" | "header" | "footer" | "p" | "span";

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // milidetik
  delayMs?: number;
  threshold?: number;
  as?: RevealElement;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  delay = 0,
  delayMs,
  threshold = 0.15,
  as: Component = "div",
}) => {
  const actualDelay = delayMs ?? delay;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Jika pengguna memilih reduced motion, langsung tampilkan tanpa animasi
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <Component
      ref={ref}
      className={`reveal-init ${isVisible ? "reveal-visible" : ""} ${className}`.trim()}
      style={actualDelay > 0 ? { transitionDelay: `${actualDelay}ms` } : undefined}
    >
      {children}
    </Component>
  );
};
