"use client";
import { useState, useEffect } from "react";
import { getMyCandidacy, getElections, applyForCandidacy, getCandidatePhotoUrl, extractError } from "@/lib/api";
import { fmtDateTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Select, Textarea, FileUpload } from "@/components/ui/FormControls";
import Modal from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import Alert from "@/components/ui/Alert";
import ProtectedImage from "@/components/shared/ProtectedImage";
import { FiPlus, FiUser } from "react-icons/fi";
import toast from "react-hot-toast";

export default function StudentCandidacyPage() {
  const { user } = useAuth();
  const [candidacies, setCandidacies] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyPositions, setApplyPositions] = useState<{ value: string; label: string }[]>([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [profileCandidate, setProfileCandidate] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([getMyCandidacy().catch(() => []), getElections().catch(() => [])]);
      setCandidacies((Array.isArray(c) ? c : c ? [c] : []).filter((x: any) => x && x.id));
      setElections(Array.isArray(e) ? e : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nominationElections = elections.filter((el: any) => el.status === "nomination_open");

  const electionNameMap: Record<number, string> = Object.fromEntries(
    elections.map((e: any) => [e.id, e.name])
  );
  const electionStatusMap: Record<number, string> = Object.fromEntries(
    elections.map((e: any) => [e.id, e.status])
  );

  const openApply = (election: any) => {
    const appliedInThisElection = new Set(
      candidacies.filter((c: any) => c.election_id === election.id).map((c: any) => c.position?.id).filter(Boolean)
    );
    const positions = (election.positions ?? [])
      .filter((p: any) => !appliedInThisElection.has(p.id))
      .map((p: any) => ({ value: String(p.id), label: p.name }));

    setApplyPositions(positions);
    setSelectedPosition(positions[0]?.value ?? "");
    setManifesto(""); setPhotoFile(null); setError("");
    setApplyOpen(true);
  };

  const handleApply = async () => {
    if (!selectedPosition) { setError("Please select a position."); return; }
    setError(""); setSubmitting(true);
    try {
      await applyForCandidacy(Number(selectedPosition), manifesto, photoFile);
      toast.success("Application submitted!");
      setApplyOpen(false);
      load();
    } catch (err) { setError(extractError(err)); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 animate-fade-up">

      {/* Per-election nomination banners */}
      {nominationElections.map((e: any) => {
        const myApp = candidacies.find((c: any) => c.election_id === e.id);
        const appliedInThisElection = new Set(
          candidacies.filter((c: any) => c.election_id === e.id).map((c: any) => c.position?.id).filter(Boolean)
        );
        const hasRemainingPositions = (e.positions ?? []).some((p: any) => !appliedInThisElection.has(p.id));

        const statusText = myApp
          ? myApp.approval_status === "approved"
            ? `Your candidacy for ${myApp.position?.name ?? "this position"} is approved — you're on the ballot.`
            : myApp.approval_status === "pending"
            ? `Your application for ${myApp.position?.name ?? "this position"} is under review.`
            : `Your application for ${myApp.position?.name ?? "this position"} was not approved.`
          : "Nominations are open — you can apply for candidacy.";

        return (
          <div key={e.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-lg)] border ${myApp ? "bg-surface-2 border-border" : "bg-cyan/8 border-cyan/20"}`}>
            <div className="min-w-0">
              <div className="text-[10px] font-[var(--font-display)] font-bold uppercase tracking-wider text-text-3 mb-0.5 truncate">{e.name}</div>
              <div className="text-sm text-text-2">{statusText}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {myApp && <Badge status={myApp.approval_status} />}
              {!myApp && hasRemainingPositions && (
                <Button size="sm" leftIcon={<FiPlus size={13} />} onClick={() => openApply(e)}>Apply Now</Button>
              )}
              {myApp?.approval_status === "rejected" && hasRemainingPositions && (
                <Button size="sm" variant="ghost" leftIcon={<FiPlus size={13} />} onClick={() => openApply(e)}>Apply for Another</Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Candidacy cards */}
      {candidacies.length === 0 ? (
        <Card><CardBody>
          <EmptyState title="No applications" message="You haven't applied for any candidacy yet."
            action={nominationElections.length > 0
              ? <Button onClick={() => openApply(nominationElections[0])} leftIcon={<FiPlus size={14} />}>Apply Now</Button>
              : undefined} />
        </CardBody></Card>
      ) : (
        <div className="space-y-3">
          {candidacies.map((c: any) => {
            const electionName = c.election_id ? (electionNameMap[c.election_id] ?? `Election #${c.election_id}`) : "";
            const resultsPublished = c.election_id && electionStatusMap[c.election_id] === "results_published";
            return (
              <Card key={c.id}>
                <CardBody>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0">
                      <ProtectedImage
                        url={getCandidatePhotoUrl(c.id)}
                        alt={c.user?.full_name ?? user?.full_name ?? ""}
                        initials={c.user?.full_name ?? user?.full_name ?? "?"}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-[var(--font-display)] text-sm font-bold text-white">
                          {c.position?.name ?? "Position"}
                        </span>
                        <Badge status={c.approval_status ?? "pending"} />
                      </div>
                      <div className="text-xs text-text-3">
                        {electionName}
                        {c.applied_at ? ` · Applied ${fmtDateTime(c.applied_at)}` : ""}
                      </div>
                      {c.manifesto && (
                        <div className="text-sm text-text-2 mt-2 max-w-[520px] line-clamp-2">{c.manifesto}</div>
                      )}
                      {resultsPublished && c.votes_received != null && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-gold/10 border border-gold/20">
                          <span className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Votes Received</span>
                          <span className="font-[var(--font-mono)] text-sm font-bold text-gold">{c.votes_received}</span>
                        </div>
                      )}
                      {c.rejection_reason && (
                        <Alert type="danger" className="mt-2">Rejected: {c.rejection_reason}</Alert>
                      )}
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => setProfileCandidate(c)}
                      leftIcon={<FiUser size={12} />}>
                      View Profile
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply modal */}
      <Modal isOpen={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Candidacy" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} isLoading={submitting}>Submit Application</Button>
          </>
        }>
        <div className="space-y-4">
          {error && <Alert type="danger">{error}</Alert>}
          <Select label="Position" name="position" value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            options={applyPositions} placeholder="Select a position" required />
          <FileUpload
            label="Campaign Photo"
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            onFile={setPhotoFile}
            preview
            hint="Optional · Max 5 MB · Your photo will be shown to voters"
          />
          <Textarea label="Manifesto" name="manifesto" value={manifesto}
            onChange={(e) => setManifesto(e.target.value)}
            rows={6} maxLength={2000} placeholder="Describe your vision and plans..." required />
        </div>
      </Modal>

      {/* Full profile modal */}
      <Modal isOpen={!!profileCandidate} onClose={() => setProfileCandidate(null)}
        title="My Candidacy Profile" size="md">
        {profileCandidate && (() => {
          const c = profileCandidate;
          const u = c.user ?? user ?? {};
          const electionName = c.election_id ? (electionNameMap[c.election_id] ?? `Election #${c.election_id}`) : "—";
          const resultsPublished = c.election_id && electionStatusMap[c.election_id] === "results_published";
          return (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-border">
                  <ProtectedImage
                    url={getCandidatePhotoUrl(c.id)}
                    alt={u.full_name ?? ""}
                    initials={u.full_name ?? "?"}
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="font-[var(--font-display)] text-base font-bold text-white mb-1">{u.full_name ?? "—"}</div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge status={c.approval_status ?? "pending"} />
                  {resultsPublished && c.votes_received != null && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-gold/10 border border-gold/20">
                      <span className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Votes</span>
                      <span className="font-[var(--font-mono)] text-sm font-bold text-gold">{c.votes_received}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Position",  c.position?.name ?? "—"],
                  ["Election",  electionName],
                  ["Faculty",   u.faculty  ?? "—"],
                  ["Program",   u.program  ?? "—"],
                  ["Year",      u.year     != null ? `Year ${u.year}`         : "—"],
                  ["Semester",  u.semester != null ? `Semester ${u.semester}` : "—"],
                  ["Applied",   c.applied_at ? fmtDateTime(c.applied_at) : "—"],
                  ["Reg. No.",  u.tu_registration_number ?? "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-0.5">{label}</div>
                    <div className="text-text-1 truncate">{val}</div>
                  </div>
                ))}
              </div>

              {c.rejection_reason && <Alert type="danger">Rejected: {c.rejection_reason}</Alert>}

              {c.manifesto && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] font-bold mb-2">Manifesto</div>
                  <div className="text-sm text-text-1 bg-surface-1 border border-border rounded-[var(--radius-md)] p-4 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {c.manifesto}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
