"use client";
import { useState, useEffect } from "react";
import { adminGetAuditLogs, adminExportAuditCSV, extractError } from "@/lib/api";
import { fmtDateTime } from "@/lib/formatters";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormControls";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import { usePagination } from "@/hooks/useCountUp";
import { FiSearch, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminGetAuditLogs(0, 500).then((data) => { setLogs(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return !q || [l.action, l.user_email, l.details, l.ip_address].some((f) => (typeof f === "string" ? f : JSON.stringify(f))?.toLowerCase().includes(q));
  });

  const { page, totalPages, paged, total, setPage } = usePagination(filtered, 20);

  const handleExport = async () => {
    try { await adminExportAuditCSV(); toast.success("CSV exported"); }
    catch (err) { toast.error(extractError(err)); }
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input name="search" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<FiSearch size={14} />} className="w-full sm:w-72" />
        <Button variant="ghost" onClick={handleExport} leftIcon={<FiDownload size={14} />}>Export CSV</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : paged.length === 0 ? (
            <EmptyState title="No logs" message="No audit entries found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Timestamp</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Event</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Actor</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Details</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {paged.map((l: any, i: number) => (
                    <tr key={l.id ?? i} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-2.5 font-[var(--font-mono)] text-xs text-text-3 whitespace-nowrap">{fmtDateTime(l.timestamp)}</td>
                      <td className="px-5 py-2.5 text-text-1">{l.action}</td>
                      <td className="px-5 py-2.5 text-text-2">{l.actor_role ?? "—"}</td>
                      <td className="px-5 py-2.5 text-text-3 max-w-[300px] truncate">{typeof l.details === "string" ? l.details : l.details ? JSON.stringify(l.details).slice(0, 80) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
    </div>
  );
}
