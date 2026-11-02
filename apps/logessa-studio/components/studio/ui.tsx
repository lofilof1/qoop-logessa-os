"use client";
import { stageLabels } from "@/lib/domain";
import { Layers, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
export function Button({ children, onClick, secondary = false, disabled = false, className = "", type = "button" }: {
    children: ReactNode;
    onClick?: () => void;
    secondary?: boolean;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
}) { return <button type={type} className={`button ${secondary ? "secondary" : "primary"} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>; }
export function Badge({ stage }: {
    stage: string;
}) { return <span className={`badge ${stage}`}><i />{stageLabels[stage] || stage}</span>; }
export function Empty({ icon: Icon = Layers, title, children, action }: {
    icon?: typeof Layers;
    title: string;
    children: ReactNode;
    action?: ReactNode;
}) { return <div className="empty"><span className="empty-icon"><Icon size={24}/></span><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function Pattern({ variant = 0 }: {
    variant?: number;
}) { return <div className={`pattern pattern-${variant % 4}`}><svg width="100%" height="100%" aria-hidden="true"><defs><pattern id={`botanical-${variant}`} width="110" height="130" patternUnits="userSpaceOnUse" patternTransform={`rotate(${variant % 2 ? 20 : -15})`}><path d="M55 130Q10 65 60 0M40 95Q12 97 14 74Q39 74 40 95M39 64Q65 69 73 45Q47 41 39 64M47 28Q23 36 17 14Q39 8 47 28" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M50 107Q79 113 84 88Q60 83 50 107" fill="currentColor" opacity=".35"/><circle cx="67" cy="17" r="5" fill="currentColor" opacity=".45"/></pattern></defs><rect width="100%" height="100%" fill={`url(#botanical-${variant})`}/></svg></div>; }
export function Field({ label, children, hint }: {
    label: string;
    children: ReactNode;
    hint?: string;
}) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Modal({ title, subtitle, children, onClose, wide = false }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null), closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => { const prev = document.activeElement as HTMLElement; const old = document.body.style.overflow; document.body.style.overflow = "hidden"; const handler = (e: KeyboardEvent) => { if (e.key === "Escape")
        closeRef.current(); if (e.key === "Tab") {
        const list = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select,a[href]');
        if (!list?.length)
            return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    } }; document.addEventListener("keydown", handler); ref.current?.focus(); return () => { document.body.style.overflow = old; document.removeEventListener("keydown", handler); prev?.focus(); }; }, []);
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref} tabIndex={-1}><div className="modal-heading"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Pencereyi kapat"><X size={21}/></button></div>{children}</div></div>;
}
