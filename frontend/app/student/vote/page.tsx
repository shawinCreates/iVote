"use client";
import { useState, useEffect } from "react";
import { getActiveElections, getCandidatesForPosition, getHEPublicKey, hasVoted, verifyFace, castVote, getCandidatePhotoUrl, extractError } from "@/lib/api";
import { encryptBallot, parsePublicKey } from "@/lib/paillier";
import { useCamera } from "@/hooks/useCamera";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import HEBadge from "@/components/shared/HEBadge";
import ProtectedImage from "@/components/shared/ProtectedImage";
import { FiCamera, FiCheck, FiLock, FiShield } from "react-icons/fi";
import toast from "react-hot-toast";

type VoteStep = "loading" | "no-election" | "already-voted" | "face-verify" | "ballot" | "confirm" | "encrypting" | "success";

export default function StudentVotePage() {
  const [step, setStep] = useState<VoteStep>("loading");
  const [election, setElection] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Record<number, any[]>>({});
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [publicKey, setPublicKey] = useState<any>(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [facePrompt, setFacePrompt] = useState("");
  const [voteReceipt, setVoteReceipt] = useState<{ confirmation_code: string; voted_at: string } | null>(null);

  const camera = useCamera();

  useEffect(() => {
    (async () => {
      try {
        const elections = await getActiveElections();
        const votingElection = (Array.isArray(elections) ? elections : []).find((e: any) => e.status === "voting_open");
        if (!votingElection) { setStep("no-election"); return; }
        setElection(votingElection);

        const voted = await hasVoted(votingElection.id).catch(() => ({ has_voted: false }));
        if (voted?.has_voted) {
          if (voted.confirmation_code) setVoteReceipt({ confirmation_code: voted.confirmation_code, voted_at: voted.voted_at });
          setStep("already-voted"); return;
        }

        const pk = await getHEPublicKey(votingElection.id);
        setPublicKey(parsePublicKey(pk));

        const posArr = votingElection.positions ?? [];
        setPositions(posArr);
        const allCandidates: Record<number, any[]> = {};
        for (const p of posArr) {
          const c = await getCandidatesForPosition(p.id).catch(() => []);
          allCandidates[p.id] = Array.isArray(c) ? c : [];
        }
        setCandidates(allCandidates);
        setStep("face-verify");
      } catch (err) { setError(extractError(err)); setStep("no-election"); }
    })();
  }, []);

  const handleFaceVerify = async () => {
    setError(""); setVerifying(true);
    try {
      await camera.startCamera();
      const frames = await camera.captureFrames((idx) => {
        if (idx === camera.BLINK_FRAME) setFacePrompt("Please blink now");
        else setFacePrompt(`Capturing frame ${idx + 1}/8...`);
      });
      camera.stopCamera();
      setFacePrompt("Verifying identity...");
      const mainImage = frames[0].replace(/^data:image\/[^;]+;base64,/, "");
      const livenessFrames = frames.map((f) => f.replace(/^data:image\/[^;]+;base64,/, ""));
      await verifyFace(mainImage, livenessFrames);
      setFacePrompt("");
      toast.success("Face verified successfully");
      setStep("ballot");
    } catch (err) {
      camera.stopCamera();
      setError(extractError(err));
      setFacePrompt("");
    }
    setVerifying(false);
  };

  const toggleCandidate = (positionId: number, candidateId: number, maxVotes: number) => {
    setSelections((prev) => {
      const current = prev[positionId] ?? [];
      if (current.includes(candidateId)) return { ...prev, [positionId]: current.filter((id) => id !== candidateId) };
      if (current.length >= maxVotes) return { ...prev, [positionId]: [...current.slice(1), candidateId] };
      return { ...prev, [positionId]: [...current, candidateId] };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStep("encrypting");
    try {
      await new Promise((r) => setTimeout(r, 500));
      const positionsBallot = positions.map((pos: any) => {
        // Sort by candidate ID to match the tally service's ORDER BY candidate.id
        const sorted = [...(candidates[pos.id] ?? [])].sort((a: any, b: any) => a.id - b.id);
        const selectedIds = selections[pos.id] ?? [];
        const selectedIndices = sorted
          .map((c: any, i: number) => (selectedIds.includes(c.id) ? i : -1))
          .filter((i: number) => i >= 0);
        return {
          position_id: pos.id,
          candidate_ids: selectedIds,
          encrypted_ballot_json: encryptBallot(selectedIndices, sorted.length, publicKey.n),
        };
      });
      await castVote({ election_id: election.id, positions: positionsBallot });
      setStep("success");
      toast.success("Vote cast successfully!");
    } catch (err) {
      setError(extractError(err));
      setStep("ballot");
    }
    setSubmitting(false);
  };

  if (step === "loading") return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (step === "no-election") return (
    <Card><CardBody><EmptyState title="No active voting" message={error || "There are no elections currently open for voting."} /></CardBody></Card>
  );

  if (step === "already-voted") return (
    <Card glow="cyan"><CardBody className="text-center py-10">
      <FiCheck size={40} className="mx-auto text-success mb-3" />
      <div className="font-[var(--font-display)] text-lg font-bold text-white mb-1">Vote Already Cast</div>
      <div className="text-sm text-text-3 mb-4">You have already voted in this election. Thank you for participating!</div>
      {voteReceipt && (
        <div className="inline-flex flex-col items-center gap-1 px-5 py-3 rounded-[var(--radius-lg)] bg-surface-2 border border-border">
          <span className="text-[10px] uppercase tracking-widest text-text-3 font-[var(--font-display)]">Confirmation Code</span>
          <span className="font-[var(--font-mono)] text-base font-bold text-cyan tracking-widest">{voteReceipt.confirmation_code}</span>
          {voteReceipt.voted_at && (
            <span className="text-[11px] text-text-3 mt-0.5">{new Date(voteReceipt.voted_at).toLocaleString()}</span>
          )}
        </div>
      )}
    </CardBody></Card>
  );

  if (step === "success") return (
    <Card glow="gold"><CardBody className="text-center py-10">
      <FiShield size={40} className="mx-auto text-gold mb-3" />
      <div className="font-[var(--font-display)] text-lg font-bold text-white mb-1">Vote Recorded</div>
      <div className="text-sm text-text-3 max-w-[380px] mx-auto">Your encrypted ballot has been securely submitted. The server never sees your actual choices.</div>
      <HEBadge fingerprint={publicKey?.n?.slice(0, 16)} />
    </CardBody></Card>
  );

  if (step === "encrypting") return (
    <Card><CardBody className="text-center py-16">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <FiLock size={24} className="absolute inset-0 m-auto text-gold animate-pulse" />
        <div className="w-full h-full rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
      <div className="font-[var(--font-display)] text-sm font-bold text-white mb-1">Encrypting Ballot</div>
      <div className="text-xs text-text-3">Applying Paillier homomorphic encryption...</div>
    </CardBody></Card>
  );

  return (
    <div className="space-y-4 animate-fade-up">
      {error && <Alert type="danger" onDismiss={() => setError("")}>{error}</Alert>}

      {/* Face Verification */}
      {step === "face-verify" && (
        <Card glow="cyan">
          <CardHeader title="Identity Verification" subtitle="Face verification is required before voting" />
          <CardBody className="space-y-4">
            <div className="relative bg-void rounded-[var(--radius-lg)] overflow-hidden aspect-[4/3] max-w-[480px] mx-auto">
              <video ref={camera.videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              {facePrompt && (
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-void/80 px-4 py-2 rounded-full text-sm text-cyan font-[var(--font-display)] font-bold">{facePrompt}</span>
                </div>
              )}
            </div>
            {camera.error && <Alert type="danger">{camera.error}</Alert>}
            <div className="text-center">
              <Button onClick={handleFaceVerify} isLoading={verifying} leftIcon={<FiCamera size={14} />} className="min-w-[200px]">
                {camera.isActive ? "Verify Face" : "Start Verification"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ballot */}
      {step === "ballot" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-white">{election?.name}</h2>
              <div className="text-xs text-text-3">Select your candidates for each position</div>
            </div>
            <HEBadge fingerprint={publicKey?.n?.slice(0, 16)} />
          </div>

          {positions.map((pos: any) => {
            const posCandidates = candidates[pos.id] ?? [];
            const selected = selections[pos.id] ?? [];
            const maxVotes = pos.max_votes ?? 1;
            return (
              <Card key={pos.id}>
                <CardHeader title={pos.name} subtitle={`Select up to ${maxVotes} candidate${maxVotes > 1 ? "s" : ""}`} />
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {posCandidates.map((c: any) => {
                      const isSelected = selected.includes(c.id);
                      const name = c.user?.full_name ?? "Candidate";
                      return (
                        <div key={c.id} onClick={() => toggleCandidate(pos.id, c.id, maxVotes)}
                          className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border-2 cursor-pointer transition-all
                            ${isSelected ? "border-gold bg-gold-dim shadow-[0_0_12px_var(--color-gold-glow)]" : "border-border bg-surface-2 hover:border-border-bright"}`}>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
                            <ProtectedImage
                              url={getCandidatePhotoUrl(c.id)}
                              alt={name}
                              initials={name}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">{name}</div>
                            <div className="text-xs text-text-3">{c.user?.program ?? ""}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                            ${isSelected ? "border-gold bg-gold" : "border-border"}`}>
                            {isSelected && <FiCheck size={12} className="text-void" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}

          <div className="flex justify-end">
            <Button variant="primary-gold" onClick={() => setStep("confirm")}
              disabled={Object.values(selections).every((s) => s.length === 0)}
              leftIcon={<FiLock size={14} />}>
              Review & Submit
            </Button>
          </div>
        </>
      )}

      {/* Confirm */}
      {step === "confirm" && (
        <Card glow="gold">
          <CardHeader title="Review Your Ballot" subtitle="Please confirm your selections before submitting" />
          <CardBody className="space-y-4">
            {positions.map((pos: any) => {
              const selected = selections[pos.id] ?? [];
              const posCandidates = candidates[pos.id] ?? [];
              return (
                <div key={pos.id}>
                  <div className="text-[11px] uppercase tracking-wider text-text-3 font-[var(--font-display)] font-bold mb-1">{pos.name}</div>
                  {selected.length === 0 ? (
                    <div className="text-sm text-text-3 italic">No selection (abstain)</div>
                  ) : (
                    selected.map((id) => {
                      const c = posCandidates.find((x: any) => x.id === id);
                      return (
                        <div key={id} className="text-sm text-white flex items-center gap-2">
                          <FiCheck size={14} className="text-gold" />
                          {c?.user?.full_name ?? "-"}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}

            <Alert type="info">Your ballot will be encrypted using Paillier homomorphic encryption before transmission. The server will never see your individual choices.</Alert>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep("ballot")}>Back to Ballot</Button>
              <Button onClick={handleSubmit} isLoading={submitting} leftIcon={<FiLock size={14} />}>Submit</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
