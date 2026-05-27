"use client";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirm", variant = "danger", isLoading }: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant={variant === "danger" ? "danger" : "primary-gold"} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3.5 items-start">
        <FiAlertTriangle size={20} className={`shrink-0 mt-0.5 ${variant === "danger" ? "text-danger" : "text-warning"}`} />
        <div className="text-sm text-text-1 leading-relaxed">{message}</div>
      </div>
    </Modal>
  );
}
