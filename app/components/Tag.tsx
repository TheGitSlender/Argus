"use client";

interface TagProps {
  children: React.ReactNode;
  variant?: "accent" | "accent-2" | "neutral" | "outline";
  className?: string;
}

export default function Tag({ children, variant = "neutral", className = "" }: TagProps) {
  return (
    <span className={`tag tag-${variant} ${className}`}>
      {children}
    </span>
  );
}
