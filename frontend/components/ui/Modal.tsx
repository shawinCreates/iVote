"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

const WIDTHS: Record<string, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[520px]",
  lg: "max-w-[680px]",
  xl: "max-w-[860px]",
};

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  size?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, size = "md", children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      className="fixed inset-0 z-[1000] bg-void/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in"
    >
      <div ref={modalRef} className={`bg-surface-2 border border-border rounded-[var(--radius-xl)] shadow-lg w-full ${WIDTHS[size] ?? WIDTHS.md} max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="font-[var(--font-display)] text-sm font-bold text-white tracking-wider uppercase">{title}</div>
          {onClose && (
            <button onClick={onClose} className="bg-transparent border border-border rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer text-text-3 flex items-center hover:border-border-bright hover:text-white transition-all">
              <FiX size={14} />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex gap-2.5 justify-end shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
