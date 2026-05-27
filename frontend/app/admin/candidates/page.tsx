"use client";
import { useState, useEffect } from "react";
import { adminGetPendingCandidates, adminGetAllCandidates, adminGetElections, adminApproveCandidate, adminRejectCandidate, getCandidatePhotoUrl, getStudentIdCardUrl, openProtectedFile, extractError } from "@/lib/api";
import { fmtDateTime } from "@/lib/formatters";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import Modal from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ProtectedImage from "@/components/shared/ProtectedImage";
import { usePagination } from "@/hooks/useCountUp";
import { FiSearch, FiCheck, FiX, FiEye, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";

export default function AdminCandidatesPage() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [elections, setElections] = useState<any[]>([]);
  const [electionFilter, setElectionFilter] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    adminGetElections().then((data) => setElections(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === "pending"
        ? await adminGetPendingCandidates(electionFilter)
        : await adminGetAllCandidates(electionFilter);
      setCandidates(Array.isArray(data) ? data : []);
    } catch { setCandidates([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, electionFilter]);

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return !q || [c.user?.full_name, c.user?.email, c.position?.name].some((f) => f?.toLowerCase().includes(q));
  });

  const { page, totalPages, paged, total, setPage } = usePagination(filtered, 10);

  const isPending = (c: any) => c.approval_status === "pending";

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await adminApproveCandidate(id);
      toast.success("Candidate approved");
      setConfirmApprove(null);
      setDetail(null);
      load();
    } catch (err) { toast.error(extractError(err)); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await adminRejectCandidate(rejectTarget.id, rejectReason || null);
      toast.success("Candidate rejected");
      setRejectTarget(null);
      setRejectReason("");
      setDetail(null);
      load();
    } catch (err) { toast.error(extractError(err)); }
    setActionLoading(false);
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1">
          {(["pending", "all"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[11px] uppercase tracking-wider font-[var(--font-display)] font-bold rounded-[var(--radius-md)] border cursor-pointer transition-all
                ${tab === t ? "bg-cyan-dim border-cyan text-cyan" : "bg-surface-2 border-border text-text-3 hover:text-white"}`}>
              {t === "pending" ? "Pending" : "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            name="election-filter"
            value={electionFilter ?? ""}
            onChange={(e) => setElectionFilter(e.target.value ? Number(e.target.value) : null)}
            options={elections.map((e: any) => ({ value: e.id, label: e.name }))}
            placeholder="All elections"
            className="w-full sm:w-48"
          />
          <Input name="search" placeholder="Search..." value={search}
            onChange={(e) => setSearch(e.target.value)} leftIcon={<FiSearch size={14} />} className="w-full sm:w-52" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : paged.length === 0 ? (
            <EmptyState
              title="No candidates"
              message={tab === "pending" ? "No pending applications." : "No candidacy applications yet."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Candidate</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Position</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Applied</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Status</th>
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((c: any) => (
                    <tr key={c.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProtectedImage
                            url={getCandidatePhotoUrl(c.id)}
                            alt={c.user?.full_name ?? ""}
                            initials={c.user?.full_name ?? c.user?.email}
                            className="w-9 h-9 rounded-full shrink-0"
                          />
                          <div>
                            <div className="font-medium text-text-1">{c.user?.full_name ?? "—"}</div>
                            <div className="text-xs text-text-3">{c.user?.email}</div>
                            <div className="text-xs text-text-3">
                              {[c.user?.faculty, c.user?.program].filter(Boolean).join(" · ") || null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-text-2">{c.position?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-text-3">{fmtDateTime(c.applied_at)}</td>
                      <td className="px-5 py-3"><Badge status={c.approval_status ?? "pending"} /></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setDetail(c)} leftIcon={<FiEye size={12} />}>View</Button>
                          {isPending(c) && (
                            <>
                              <Button size="sm" variant="success" onClick={() => setConfirmApprove(c)} leftIcon={<FiCheck size={12} />}>Accept</Button>
                              <Button size="sm" variant="danger" onClick={() => setRejectTarget(c)} leftIcon={<FiX size={12} />}>Reject</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />

      {/* Detail Modal */}
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Candidate Details"
        size="lg"
        footer={
          detail && isPending(detail) ? (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              <Button variant="danger" onClick={() => setRejectTarget(detail)} leftIcon={<FiX size={12} />}>Reject</Button>
              <Button variant="success" onClick={() => setConfirmApprove(detail)} leftIcon={<FiCheck size={12} />}>Approve</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
          )
        }
      >
        {detail && (
          <div className="space-y-6">
            {/* Profile photo */}
            <div className="flex justify-center">
              <ProtectedImage
                url={getCandidatePhotoUrl(detail.id)}
                alt={detail.user?.full_name ?? ""}
                initials={detail.user?.full_name ?? detail.user?.email}
                className="w-32 h-32 rounded-full"
              />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Name", detail.user?.full_name],
                ["Email", detail.user?.email],
                ["Position", detail.position?.name],
                ["Faculty", detail.user?.faculty ?? "—"],
                ["Program", detail.user?.program ?? "—"],
                ["Year", detail.user?.year != null ? `Year ${detail.user.year}` : "—"],
                ["Semester", detail.user?.semester != null ? `Semester ${detail.user.semester}` : "—"],
                ["Applied", fmtDateTime(detail.applied_at)],
                ["Status", null],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-1">{label}</div>
                  {label === "Status" ? (
                    <Badge status={detail.approval_status ?? "pending"} />
                  ) : (
                    <div className="text-text-1">{val as string}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Manifesto */}
            {detail.manifesto && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-2">Manifesto</div>
                <div className="bg-surface-1 border border-border rounded-[var(--radius-md)] p-4 text-sm text-text-1 leading-relaxed whitespace-pre-wrap">
                  {detail.manifesto}
                </div>
              </div>
            )}

            {/* ID Card */}
            {detail.user?.id && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">ID Card</div>
                  <Button size="sm" variant="ghost" leftIcon={<FiFileText size={12} />}
                    onClick={() => openProtectedFile(getStudentIdCardUrl(detail.user.id))}>Open Full Size</Button>
                </div>
                <div className="rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-2">
                  <ProtectedImage
                    url={getStudentIdCardUrl(detail.user.id)}
                    alt="ID Card"
                    initials="ID"
                    contain
                    className="w-full h-52"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Approve */}
      <ConfirmDialog
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={() => confirmApprove && handleApprove(confirmApprove.id)}
        title="Approve Candidate"
        message={`Approve ${confirmApprove?.user?.full_name ?? confirmApprove?.user?.email} for ${confirmApprove?.position?.name}?`}
        confirmLabel="Approve"
        variant="warning"
        isLoading={actionLoading}
      />

      {/* Reject Dialog */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Candidate"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} isLoading={actionLoading} leftIcon={<FiX size={12} />}>Reject</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-text-2">
            Reject <strong className="text-white">{rejectTarget?.user?.full_name ?? rejectTarget?.user?.email}</strong>?
          </div>
          <Textarea label="Reason (optional)" name="reason" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}
