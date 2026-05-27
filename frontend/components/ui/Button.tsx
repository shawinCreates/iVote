"use client";

const VARIANT_CLASSES: Record<string, string> = {
  "primary-gold": "bg-gold text-void border-transparent hover:bg-gold-bright hover:shadow-[0_0_20px_var(--color-gold-glow)]",
  "primary-cyan": "bg-transparent text-cyan border-cyan hover:bg-cyan-dim hover:shadow-[0_0_20px_var(--color-cyan-glow)]",
  ghost: "bg-transparent text-text-1 border-border hover:border-border-bright hover:bg-surface-2 hover:text-white",
  danger: "bg-transparent text-danger border-danger hover:bg-danger-dim",
  success: "bg-transparent text-success border-success hover:bg-success-dim",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-3.5 py-1.5 text-[10px] rounded-[var(--radius-sm)]",
  md: "px-5 py-2.5 text-[11px] rounded-[var(--radius-md)]",
  lg: "px-7 py-3 text-xs rounded-[var(--radius-lg)]",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  variant = "primary-gold",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.ghost;
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 border font-[var(--font-display)] font-bold tracking-wider uppercase cursor-pointer
        transition-all duration-200 whitespace-nowrap relative overflow-hidden
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        active:not-disabled:scale-[0.98] hover:not-disabled:-translate-y-px
        ${variantClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="flex items-center shrink-0">{leftIcon}</span>
      )}
      <span className="leading-none">{children}</span>
      {!isLoading && rightIcon && <span className="flex items-center shrink-0">{rightIcon}</span>}
    </button>
  );
}
