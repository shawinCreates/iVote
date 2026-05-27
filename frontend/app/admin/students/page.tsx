"use client";
import { useState, useEffect } from "react";
import { getAllStudents, getPendingStudents, verifyStudent, rejectStudent, openProtectedFile, getStudentIdCardUrl, getStudentPhotoUrl, extractError } from "@/lib/api";
import { fmtDateTime } from "@/lib/formatters";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormControls";
import Modal from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ProtectedImage from "@/components/shared/ProtectedImage";
import { usePagination } from "@/hooks/useCountUp";
import { FiSearch, FiEye, FiCheck, FiX, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";

export default function AdminStudentsPage() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailStudent, setDetailStudent] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmVerify, setConfirmVerify] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === "pending" ? await getPendingStudents() : await getAllStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch { setStudents([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || [s.full_name, s.email, s.tu_registration_number, s.faculty].some((f) => f?.toLowerCase().includes(q));
  });

  const { page, totalPages, paged, total, setPage } = usePagination(filtered, 10);

  const isPending = (s: any) => !s.is_verified && s.registration_stage === "complete";

  const handleVerify = async (id: number) => {
    setActionLoading(true);
    try {
      await verifyStudent(id);
      toast.success("Student verified");
      setConfirmVerify(null);
      setDetailStudent(null);
      load();
    } catch (err) { toast.error(extractError(err)); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(true);
    try {
      await rejectStudent(rejectDialog.id, rejectReason || null);
      toast.success("Student rejected");
      setRejectDialog(null);
      setRejectReason("");
      setDetailStudent(null);
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
              {t === "pending" ? "Pending" : "All Students"}
            </button>
          ))}
        </div>
        <Input name="search" placeholder="Search students..." value={search}
          onChange={(e) => setSearch(e.target.value)} leftIcon={<FiSearch size={14} />} className="w-full sm:w-64" />
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : paged.length === 0 ? (
            <EmptyState
              title="No students found"
              message={search ? "Try a different search." : tab === "pending" ? "No pending verifications." : "No students registered yet."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Student</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Reg. No.</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Faculty</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Status</th>
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((s: any) => (
                    <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProtectedImage
                            url={getStudentPhotoUrl(s.id)}
                            alt={s.full_name ?? ""}
                            initials={s.full_name ?? s.email}
                            className="w-9 h-9 rounded-full shrink-0"
                          />
                          <div>
                            <div className="font-medium text-text-1">{s.full_name ?? "—"}</div>
                            <div className="text-xs text-text-3">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-[var(--font-mono)] text-xs text-text-2">{s.tu_registration_number ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-text-2">{s.faculty ?? "—"}</div>
                        <div className="text-xs text-text-3">
                          {[s.program, s.year != null ? `Year ${s.year}` : null, s.semester != null ? `Sem ${s.semester}` : null].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge status={s.is_verified ? "verified" : s.registration_stage === "complete" ? "pending" : "unverified"} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setDetailStudent(s)} leftIcon={<FiEye size={12} />}>View</Button>
                          {isPending(s) && (
                            <>
                              <Button size="sm" variant="success" onClick={() => setConfirmVerify(s)} leftIcon={<FiCheck size={12} />}>Accept</Button>
                              <Button size="sm" variant="danger" onClick={() => setRejectDialog(s)} leftIcon={<FiX size={12} />}>Reject</Button>
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
        isOpen={!!detailStudent}
        onClose={() => setDetailStudent(null)}
        title="Student Details"
        size="lg"
        footer={
          detailStudent && isPending(detailStudent) ? (
            <>
              <Button variant="ghost" onClick={() => setDetailStudent(null)}>Close</Button>
              <Button variant="danger" onClick={() => setRejectDialog(detailStudent)} leftIcon={<FiX size={12} />}>Reject</Button>
              <Button variant="success" onClick={() => setConfirmVerify(detailStudent)} leftIcon={<FiCheck size={12} />}>Accept</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setDetailStudent(null)}>Close</Button>
          )
        }
      >
        {detailStudent && (
          <div className="space-y-6">
            {/* Profile photo */}
            <div className="flex justify-center">
              <ProtectedImage
                url={getStudentPhotoUrl(detailStudent.id)}
                alt={detailStudent.full_name ?? ""}
                initials={detailStudent.full_name ?? detailStudent.email}
                className="w-32 h-32 rounded-full"
              />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Name", detailStudent.full_name],
                ["Email", detailStudent.email],
                ["Reg. Number", detailStudent.tu_registration_number],
                ["Faculty", detailStudent.faculty],
                ["Program", detailStudent.program ?? "—"],
                ["Year", detailStudent.year != null ? `Year ${detailStudent.year}` : "—"],
                ["Semester", detailStudent.semester != null ? `Semester ${detailStudent.semester}` : "—"],
                ["Registered", fmtDateTime(detailStudent.created_at)],
                ["Status", null],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-1">{label}</div>
                  {label === "Status" ? (
                    <Badge status={detailStudent.is_verified ? "verified" : detailStudent.registration_stage === "complete" ? "pending" : "unverified"} />
                  ) : (
                    <div className={`text-text-1 ${label === "Reg. Number" ? "font-[var(--font-mono)] text-xs" : ""}`}>{val as string}</div>
                  )}
                </div>
              ))}
            </div>

            {/* ID Card preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">ID Card</div>
                <Button size="sm" variant="ghost" leftIcon={<FiFileText size={12} />}
                  onClick={() => openProtectedFile(getStudentIdCardUrl(detailStudent.id))}>Open Full Size</Button>
              </div>
              <div className="rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-2">
                <ProtectedImage
                  url={getStudentIdCardUrl(detailStudent.id)}
                  alt="ID Card"
                  initials="ID"
                  contain
                  className="w-full h-52"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Verify */}
      <ConfirmDialog
        isOpen={!!confirmVerify}
        onClose={() => setConfirmVerify(null)}
        onConfirm={() => confirmVerify && handleVerify(confirmVerify.id)}
        title="Verify Student"
        message={`Verify ${confirmVerify?.full_name ?? confirmVerify?.email}? This will grant them voting access.`}
        confirmLabel="Verify"
        variant="warning"
        isLoading={actionLoading}
      />

      {/* Reject Dialog */}
      <Modal
        isOpen={!!rejectDialog}
        onClose={() => { setRejectDialog(null); setRejectReason(""); }}
        title="Reject Student"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} isLoading={actionLoading} leftIcon={<FiX size={12} />}>Reject</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-text-2">
            Reject <strong className="text-white">{rejectDialog?.full_name ?? rejectDialog?.email}</strong>?
          </div>
          <Textarea label="Reason (optional)" name="reason" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}
