import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative">
      <div className="text-center relative z-10">
        <div className="font-[var(--font-display)] text-[120px] font-black text-white/5 leading-none">404</div>
        <div className="font-[var(--font-display)] text-lg font-bold text-white -mt-6 mb-2">Page Not Found</div>
        <div className="text-sm text-text-3 mb-6">This page doesn&apos;t exist or has been removed.</div>
        <Link href="/" className="inline-flex px-5 py-2.5 bg-gold text-void rounded-[var(--radius-md)] font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider hover:bg-gold-bright transition-all">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
