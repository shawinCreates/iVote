"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminGetElections, adminCreateElection, adminUpdateStatus, extractError } from "@/lib/api";
import { fmtDateTime, fmtRelative } from "@/lib/formatters";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormControls";
import Modal from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ElectionCountdown from "@/components/shared/ElectionCountdown";
import { FiPlus, FiX as FiXIcon, FiCheck, FiBarChart2 } from "react-icons/fi";
import toast from "react-hot-toast";

const STAGES = [
  { key: "draft",               short: "Draft" },
  { key: "nomination_open",     short: "Nom. Open" },
  { key: "nomination_closed",   short: "Nom. Closed" },
  { key: "voting_open",         short: "Voting" },
  { key: "closed",              short: "Closed" },
  { key: "results_published",   short: "Published" },
] as const;

const STAGE_INDEX: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

function nextTransitionLabel(e: any): string | null {
  const now = Date.now();
  const parse = (v: string | null) => v ? new Date(v).getTime() : null;
  const nomStart  = parse(e.nomination_start);
  const nomEnd    = parse(e.nomination_end);
  const voteStart = parse(e.voting_start);
  const voteEnd   = parse(e.voting_end);

  switch (e.status) {
    case "draft":
      return nomStart && nomStart > now ? `Nominations open ${fmtRelative(e.nomination_start)}` : null;
    case "nomination_open":
      return nomEnd && nomEnd > now ? `Nominations close ${fmtRelative(e.nomination_end)}` : null;
    case "nomination_closed":
      return voteStart && voteStart > now ? `Voting opens ${fmtRelative(e.voting_start)}` : null;
    case "voting_open":
      return voteEnd && voteEnd > now ? `Voting closes ${fmtRelative(e.voting_end)}` : null;
    default:
      return null;
  }
}

function ElectionStepper({ status }: { status: string }) {
  const current = STAGE_INDEX[status] ?? 0;
  return (
    <div className="flex items-center w-full my-3">
      {STAGES.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 transition-all
                ${done   ? "bg-cyan border-cyan" :
                  active ? "bg-cyan border-cyan shadow-[0_0_8px_var(--color-cyan-glow)]" :
                           "bg-transparent border-border"}`} />
              <span className={`text-[9px] font-[var(--font-display)] uppercase tracking-wide whitespace-nowrap
                ${done || active ? "text-cyan" : "text-text-3"}`}>
                {s.short}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${done ? "bg-cyan" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminElectionsPage() {
  const router = useRouter();
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nominationStart, setNominationStart] = useState("");
  const [nominationEnd, setNominationEnd] = useState("");
  const [votingStart, setVotingStart] = useState("");
  const [votingEnd, setVotingEnd] = useState("");
  const [positions, setPositions] = useState([{ name: "", max_votes: 1 }]);

  const load = async () => {
    setLoading(true);
    try { const data = await adminGetElections(); setElections(Array.isArray(data) ? data : []); }
    catch { setElections([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(""); setDescription("");
    setNominationStart(""); setNominationEnd("");
    setVotingStart(""); setVotingEnd("");
    setPositions([{ name: "", max_votes: 1 }]);
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      await adminCreateElection({
        name, description,
        nomination_start: nominationStart, nomination_end: nominationEnd,
        voting_start: votingStart, voting_end: votingEnd,
        positions: positions.filter((p) => p.name.trim()),
      });
      toast.success("Election created");
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) { toast.error(extractError(err)); }
    setActionLoading(false);
  };

  const handleTransition = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await adminUpdateStatus(confirmAction.electionId, confirmAction.next);
      toast.success("Status updated");
      setConfirmAction(null);
      load();
    } catch (err) { toast.error(extractError(err)); }
    setActionLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} leftIcon={<FiPlus size={14} />}>Create Election</Button>
      </div>

      {elections.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title="No elections" message="Create your first election to get started."
              action={<Button onClick={() => setCreateOpen(true)} leftIcon={<FiPlus size={14} />}>Create Election</Button>} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {elections.map((e: any) => (
            <Card key={e.id}>
              <CardBody>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <h3 className="font-[var(--font-display)] text-sm font-bold text-white">{e.name}</h3>
                    {e.description && <div className="text-xs text-text-3 mt-0.5">{e.description}</div>}
                  </div>
                  <Badge status={e.status} />
                </div>

                {/* Stage stepper */}
                <ElectionStepper status={e.status} />

                {/* Dates */}
                <div className="text-xs text-text-3 space-y-0.5 mb-3">
                  <div>Nominations: {fmtDateTime(e.nomination_start)} — {fmtDateTime(e.nomination_end)}</div>
                  <div>Voting: {fmtDateTime(e.voting_start)} — {fmtDateTime(e.voting_end)}</div>
                </div>

                {/* Positions chips */}
                {e.positions?.length > 0 && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {e.positions.map((p: any) => (
                      <span key={p.id ?? p.name} className="px-2 py-0.5 bg-surface-2 border border-border rounded-full text-[10px] text-text-2">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {e.status === "voting_open" && <ElectionCountdown endTime={e.voting_end} />}

                  {(() => {
                    const hint = nextTransitionLabel(e);
                    return hint ? (
                      <span className="text-[11px] text-text-3 font-[var(--font-display)]">{hint}</span>
                    ) : null;
                  })()}

                  {e.status === "closed" && (
                    <Button size="sm" variant="success" leftIcon={<FiCheck size={12} />}
                      onClick={() => setConfirmAction({ electionId: e.id, next: "results_published", label: "Publish Results", variant: "success" })}>
                      Publish Results
                    </Button>
                  )}

                  {e.status === "results_published" && (
                    <Button size="sm" variant="primary-cyan" leftIcon={<FiBarChart2 size={12} />}
                      onClick={() => router.push("/admin/results")}>
                      View Results
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} title="Create Election" size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={actionLoading}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Election Name" name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="General Election 2025" />
          <Textarea label="Description" name="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional description..." />

          <div>
            <div className="text-[11px] font-[var(--font-display)] font-bold tracking-wider uppercase text-text-2 mb-2">Nomination Period</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" name="nom-start" type="datetime-local" value={nominationStart} onChange={(e) => setNominationStart(e.target.value)} required />
              <Input label="End"   name="nom-end"   type="datetime-local" value={nominationEnd}   onChange={(e) => setNominationEnd(e.target.value)}   required />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-[var(--font-display)] font-bold tracking-wider uppercase text-text-2 mb-2">Voting Period</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" name="vote-start" type="datetime-local" value={votingStart} onChange={(e) => setVotingStart(e.target.value)} required />
              <Input label="End"   name="vote-end"   type="datetime-local" value={votingEnd}   onChange={(e) => setVotingEnd(e.target.value)}   required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-[var(--font-display)] font-bold tracking-wider uppercase text-text-2">Positions</span>
              <Button size="sm" variant="ghost" onClick={() => setPositions([...positions, { name: "", max_votes: 1 }])}>+ Add</Button>
            </div>
            {positions.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <Input name={`pos-${i}`} placeholder="e.g. President" value={p.name}
                    onChange={(e) => { const next = [...positions]; next[i].name = e.target.value; setPositions(next); }} />
                </div>
                <div className="w-20">
                  <Input name={`max-${i}`} type="number" value={p.max_votes}
                    onChange={(e) => { const next = [...positions]; next[i].max_votes = Number(e.target.value); setPositions(next); }} />
                </div>
                {positions.length > 1 && (
                  <button onClick={() => setPositions(positions.filter((_, j) => j !== i))}
                    className="text-danger bg-transparent border-none cursor-pointer pb-2.5">
                    <FiXIcon size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="text-xs text-text-3 mt-1">Second column = max winners per position</div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleTransition}
        title="Confirm Status Change" message={`Change election status to "${confirmAction?.label}"?`}
        confirmLabel={confirmAction?.label ?? "Confirm"} variant="warning" isLoading={actionLoading} />
    </div>
  );
}
