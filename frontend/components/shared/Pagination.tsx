"use client";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
}

export default function Pagination({ page, totalPages, onPageChange, total }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-xs text-text-3">
        {total != null && `${total} items · `}Page {page} of {totalPages}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-text-2 text-sm disabled:opacity-30 cursor-pointer hover:not-disabled:border-border-bright"
        >
          <FiChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
          if (p < 1 || p > totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border text-xs font-semibold cursor-pointer transition-all
                ${p === page ? "bg-cyan-dim border-cyan text-cyan" : "bg-surface-2 border-border text-text-2 hover:border-border-bright"}`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface-2 text-text-2 text-sm disabled:opacity-30 cursor-pointer hover:not-disabled:border-border-bright"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
