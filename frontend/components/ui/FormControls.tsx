"use client";
import { useState, useRef, useEffect } from "react";
import { FiEye, FiEyeOff, FiUpload, FiX, FiChevronDown } from "react-icons/fi";
import { passwordStrength } from "@/lib/formatters";

const inputBase = "w-full px-3.5 py-2.5 bg-surface-2 border-[1.5px] border-border rounded-[var(--radius-md)] text-white font-[var(--font-body)] text-sm outline-none transition-all duration-200 focus:border-cyan focus:shadow-[0_0_0_3px_var(--color-cyan-glow)]";
const labelClass = "block text-[11px] font-[var(--font-display)] font-bold tracking-wider uppercase text-text-2 mb-1.5";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, name, hint, error, leftIcon, className = "", ...rest }: InputProps) {
  return (
    <div>
      {label && <label htmlFor={name} className={labelClass}>{label}{rest.required && <span className="text-danger ml-1">*</span>}</label>}
      <div className="relative">
        {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 flex pointer-events-none">{leftIcon}</span>}
        <input id={name} name={name} className={`${inputBase} ${leftIcon ? "pl-10" : ""} ${error ? "border-danger" : ""} ${className}`} {...rest} />
      </div>
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
      {hint && !error && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  );
}

interface SelectProps {
  label?: string;
  name?: string;
  options: Array<string | { value: string | number; label: string }>;
  hint?: string;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export function Select({ label, name, options = [], placeholder, hint, error, className = "", disabled, required, value, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const getVal = (o: string | { value: string | number; label: string }) =>
    typeof o === "string" ? o : String(o.value);
  const getLabel = (o: string | { value: string | number; label: string }) =>
    typeof o === "string" ? o : o.label;

  const selected = options.find((o) => getVal(o) === String(value ?? ""));
  const displayLabel = selected ? getLabel(selected) : null;

  const handlePick = (val: string) => {
    onChange?.({ target: { value: val, name } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  return (
    <div>
      {label && (
        <label className={labelClass}>
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((s) => !s)}
          className={`${inputBase} flex items-center justify-between pr-9 text-left
            ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            ${!displayLabel ? "text-text-3" : "text-white"}
            ${error ? "border-danger" : ""}
            ${open ? "border-cyan shadow-[0_0_0_3px_var(--color-cyan-glow)]" : ""}
            ${className}`}
        >
          <span className="truncate">{displayLabel ?? (placeholder ?? "Select…")}</span>
        </button>
        <FiChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />

        {open && (
          <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-[#0f1621] border border-border rounded-[var(--radius-md)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden max-h-56 overflow-y-auto">
            {placeholder && (
              <button
                type="button"
                onClick={() => handlePick("")}
                className={`w-full text-left px-3.5 py-2.5 text-sm bg-transparent border-none cursor-pointer transition-colors
                  ${!value ? "text-cyan bg-cyan-dim" : "text-text-3 hover:bg-white/[0.04]"}`}
              >
                {placeholder}
              </button>
            )}
            {options.map((o) => {
              const val = getVal(o);
              const lbl = getLabel(o);
              const isActive = val === String(value ?? "");
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePick(val)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm bg-transparent border-none cursor-pointer transition-colors
                    ${isActive ? "text-cyan bg-cyan-dim" : "text-text-1 hover:bg-white/[0.04]"}`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
      {hint && !error && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, name, hint, error, className = "", ...rest }: TextareaProps) {
  const [len, setLen] = useState((rest.value as string)?.length ?? 0);
  return (
    <div>
      {label && (
        <div className="flex justify-between mb-1.5">
          <label htmlFor={name} className={`${labelClass} mb-0`}>{label}{rest.required && <span className="text-danger ml-1">*</span>}</label>
          {rest.maxLength && <span className="text-[11px] text-text-3">{len}/{rest.maxLength}</span>}
        </div>
      )}
      <textarea
        id={name} name={name}
        className={`${inputBase} resize-y leading-relaxed ${error ? "border-danger" : ""} ${className}`}
        onChange={(e) => { setLen(e.target.value.length); rest.onChange?.(e); }}
        {...rest}
      />
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
      {hint && !error && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  );
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  showStrength?: boolean;
}

export function PasswordInput({ label, name, hint, error, showStrength, value, ...rest }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? passwordStrength(String(value ?? "")) : null;

  return (
    <div>
      {label && <label htmlFor={name} className={labelClass}>{label}{rest.required && <span className="text-danger ml-1">*</span>}</label>}
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} value={value} className={`${inputBase} pr-10 ${error ? "border-danger" : ""}`} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-3 flex p-1">
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
      {showStrength && value && strength && (
        <div className="mt-2">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex-1 h-0.5 rounded-sm transition-all ${i <= strength.score ? "bg-cyan" : "bg-border"}`} />
            ))}
          </div>
          <div className={`text-[11px] ${strength.color}`}>{strength.label}</div>
        </div>
      )}
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
      {hint && !error && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  );
}

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number;
  onFile?: (file: File | null) => void;
  preview?: boolean;
  hint?: string;
  error?: string;
}

export function FileUpload({ label, accept, maxSize, onFile, preview = false, hint, error }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (maxSize && file.size > maxSize) { alert(`File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB.`); return; }
    setSelected(file);
    onFile?.(file);
    if (preview && file.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div>
      {label && <div className={labelClass}>{label}</div>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-[var(--radius-lg)] p-7 text-center cursor-pointer transition-all
          ${dragging ? "border-cyan bg-cyan-dim shadow-[0_0_20px_var(--color-cyan-glow)]" : "border-border bg-surface-2"}
          ${error ? "border-danger" : ""}`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="max-h-36 mx-auto rounded-[var(--radius-md)] object-contain" />
        ) : (
          <>
            <FiUpload size={28} className={`mx-auto mb-2.5 ${dragging ? "text-cyan" : "text-text-3"}`} />
            <div className="text-sm text-text-2 mb-1">{selected ? selected.name : "Drag & drop or click to upload"}</div>
            <div className="text-[11px] text-text-3">{accept} {maxSize ? `· Max ${Math.round(maxSize / 1024 / 1024)}MB` : ""}</div>
          </>
        )}
      </div>
      {selected && !previewUrl && (
        <div className="flex items-center gap-2 mt-2 text-xs text-text-2">
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{selected.name}</span>
          <button type="button" onClick={() => { setSelected(null); onFile?.(null); }} className="text-danger bg-transparent border-none cursor-pointer"><FiX size={14} /></button>
        </div>
      )}
      {error && <div className="text-xs text-danger mt-1">{error}</div>}
      {hint && !error && <div className="text-xs text-text-3 mt-1">{hint}</div>}
    </div>
  );
}
