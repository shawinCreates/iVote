"use client";
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiX } from "react-icons/fi";

const CONFIG: Record<string, { bg: string; text: string; border: string; Icon: any }> = {
  info: { bg: "bg-cyan-dim", text: "text-cyan", border: "border-cyan/20", Icon: FiInfo },
  success: { bg: "bg-success-dim", text: "text-success", border: "border-success/20", Icon: FiCheckCircle },
  warning: { bg: "bg-warning-dim", text: "text-warning", border: "border-warning/20", Icon: FiAlertTriangle },
  danger: { bg: "bg-danger-dim", text: "text-danger", border: "border-danger/20", Icon: FiAlertCircle },
};

interface AlertProps {
  type?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export default function Alert({ type = "info", children, onDismiss, className = "" }: AlertProps) {
  const cfg = CONFIG[type] ?? CONFIG.info;
  const { Icon } = cfg;
  return (
    <div role="alert" className={`flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] border text-[13px] leading-relaxed ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="bg-transparent border-none cursor-pointer text-current opacity-60 p-0">
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
