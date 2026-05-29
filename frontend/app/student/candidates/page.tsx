"use client";
import { useState, useEffect } from "react";
import { getElections, getCandidatesForPosition, getCandidatePhotoUrl, getMyCandidacy, applyForCandidacy, extractError } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Select, Textarea, FileUpload } from "@/components/ui/FormControls";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import Alert from "@/components/ui/Alert";
import ProtectedImage from "@/components/shared/ProtectedImage";
import Modal from "@/components/ui/Modal";
import { FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";

export default function StudentCandidatesPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<any>(null);
  const [positionTab, setPositionTab] = useState<number>(0);
  const [candidates, setCandidates] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  const [myCandidacies, setMyCandidacies] = useState<any[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");

  const loadMyCandidacies = async () => {
    const my = await getMyCandidacy().catch(() => []);
    setMyCandidacies(Array.isArray(my) ? my.filter((c: any) => c && c.id) : []);
  };

  useEffect(() => {
    Promise.all([
      getElections().catch(() => []),
      getMyCandidacy().catch(() => []),
    ]).then(([data, my]: any) => {
      const list = (Array.isArray(data) ? data : []).sort((a: any, b: any) => b.id - a.id);
      setElections(list);
      if (list.length > 0) setSelectedElection(list[0]);
      setMyCandidacies(Array.isArray(my) ? my.filter((c: any) => c && c.id) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedElection?.positions?.length) return;
    selectedElection.positions.forEach((p: any) => {
      getCandidatesForPosition(p.id).then((data) => {
        setCandidates((prev) => ({ ...prev, [p.id]: Array.isArray(data) ? data : [] }));
      }).catch(() => {});
    });
  }, [selectedElection]);

  // Check if student has already applied for the currently selected election
  const myApplicationForCurrentElection = selectedElection
    ? myCandidacies.find((c: any) => c.election_id === selectedElection.id)
    : null;
  const hasAppliedForCurrentElection = !!myApplicationForCurrentElection;
  const isNominationOpen = selectedElection?.status === "nomination_open";

  // Positions in current election not yet applied for
  const appliedPositionIds = new Set(
    myCandidacies
      .filter((c: any) => c.election_id === selectedElection?.id)
      .map((c: any) => c.position?.id)
      .filter(Boolean)
  );
  const availablePositions = (selectedElection?.positions ?? [])
    .filter((p: any) => !appliedPositionIds.has(p.id))
    .map((p: any) => ({ value: String(p.id), label: p.name }));

  const openApply = (preselect?: string) => {
    setSelectedPosition(preselect ?? availablePositions[0]?.value ?? "");
    setManifesto(""); setPhotoFile(null); setApplyError("");
    setApplyOpen(true);
  };

  const handleApply = async () => {
    if (!selectedPosition) { setApplyError("Please select a position."); return; }
    setApplyError(""); setSubmitting(true);
    try {
      await applyForCandidacy(Number(selectedPosition), manifesto, photoFile);
      toast.success("Application submitted!");
      setApplyOpen(false);
      await loadMyCandidacies();
    } catch (err) { setApplyError(extractError(err)); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const positions = selectedElection?.positions ?? [];
  const currentPosition = positions[positionTab];
  const currentCandidates = currentPosition ? (candidates[currentPosition.id] ?? []) : [];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Election selector */}
      {elections.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {elections.map((e: any) => (
            <button key={e.id} onClick={() => { setSelectedElection(e); setPositionTab(0); }}
              className={`px-4 py-2 text-[11px] uppercase tracking-wider font-[var(--font-display)] font-bold rounded-[var(--radius-md)] border cursor-pointer whitespace-nowrap transition-all
                ${selectedElection?.id === e.id ? "bg-gold-dim border-gold text-gold" : "bg-surface-2 border-border text-text-3 hover:text-white"}`}>
              {e.name}
            </button>
          ))}
        </div>
      )}

      {/* Candidacy status bar for this election */}
      {isNominationOpen && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-lg)] border ${hasAppliedForCurrentElection ? "bg-surface-2 border-border" : "bg-cyan/8 border-cyan/20"}`}>
          {hasAppliedForCurrentElection ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Badge status={myApplicationForCurrentElection.approval_status ?? "pending"} />
                <span className="text-sm text-text-2 truncate">
                  {myApplicationForCurrentElection.approval_status === "approved"
                    ? `Your candidacy for ${myApplicationForCurrentElection.position?.name ?? "this election"} is approved.`
                    : myApplicationForCurrentElection.approval_status === "rejected"
                    ? `Your application for ${myApplicationForCurrentElection.position?.name ?? "this election"} was not approved.`
                    : `Your application for ${myApplicationForCurrentElection.position?.name ?? "this election"} is under review.`}
                </span>
              </div>
              {availablePositions.length > 0 && myApplicationForCurrentElection.approval_status === "rejected" && (
                <Button size="sm" leftIcon={<FiPlus size={13} />} onClick={() => openApply()}>
                  Apply for Another
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-text-2">Nominations are open - you can apply for candidacy.</span>
              <Button size="sm" leftIcon={<FiPlus size={13} />} onClick={() => openApply()}>Apply Now</Button>
            </>
          )}
        </div>
      )}

      {/* Position tabs */}
      {positions.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {positions.map((p: any, i: number) => (
            <button key={p.id} onClick={() => setPositionTab(i)}
              className={`px-4 py-2 text-[11px] uppercase tracking-wider font-[var(--font-display)] font-bold rounded-[var(--radius-md)] border cursor-pointer whitespace-nowrap transition-all
                ${positionTab === i ? "bg-cyan-dim border-cyan text-cyan" : "bg-surface-2 border-border text-text-3 hover:text-white"}`}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Candidate grid */}
      {currentCandidates.length === 0 ? (
        <Card><CardBody><EmptyState title="No candidates" message="No approved candidates for this position yet." /></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentCandidates.map((c: any) => {
            const name = c.user?.full_name ?? "Candidate";
            return (
              <Card key={c.id} hover onClick={() => setDetail(c)}>
                <CardBody className="text-center py-6">
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-border">
                    <ProtectedImage
                      url={getCandidatePhotoUrl(c.id)}
                      alt={name}
                      initials={name}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="font-[var(--font-display)] text-sm font-bold text-white">{name}</div>
                  <div className="text-xs text-text-3 mt-0.5">{c.user?.faculty ?? ""}</div>
                  {c.user?.program && <div className="text-xs text-text-3">{c.user.program}</div>}
                  {c.manifesto && <div className="text-xs text-text-2 mt-2 line-clamp-2">{c.manifesto}</div>}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.user?.full_name ?? "Candidate"} size="md">
        {detail && (
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                <ProtectedImage
                  url={getCandidatePhotoUrl(detail.id)}
                  alt={detail.user?.full_name ?? ""}
                  initials={detail.user?.full_name ?? "?"}
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Faculty",  detail.user?.faculty  ?? "-"],
                ["Program",  detail.user?.program  ?? "-"],
                ["Year",     detail.user?.year != null ? `Year ${detail.user.year}` : "-"],
                ["Semester", detail.user?.semester != null ? `Semester ${detail.user.semester}` : "-"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-0.5">{label}</div>
                  <div className="text-text-1">{val}</div>
                </div>
              ))}
            </div>

            {detail.manifesto && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] font-bold mb-2">Manifesto</div>
                <div className="text-sm text-text-1 bg-surface-1 border border-border rounded-[var(--radius-md)] p-4 leading-relaxed whitespace-pre-wrap">
                  {detail.manifesto}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Apply for candidacy modal */}
      <Modal isOpen={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Candidacy" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} isLoading={submitting}>Submit Application</Button>
          </>
        }>
        <div className="space-y-4">
          {applyError && <Alert type="danger">{applyError}</Alert>}
          <Select label="Position" name="position" value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            options={availablePositions} placeholder="Select a position" required />
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
    </div>
  );
}
