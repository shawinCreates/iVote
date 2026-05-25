"use client";
import { useState, useEffect } from "react";
import { adminGetElections, adminGetResults } from "@/lib/api";
import { fmtPercent } from "@/lib/formatters";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/FormControls";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import HEBadge from "@/components/shared/HEBadge";
import { ResponsiveContainer, PieChart, Pie } from "recharts";

const CHART_COLORS = ["#f59e0b", "#22d3ee", "#a78bfa", "#34d399", "#fb7185", "#60a5fa"];

function TurnoutDonut({ pct, cast, eligible }: { pct: number; cast: number; eligible: number }) {
  const voted = Math.max(cast, 0);
  const abstained = Math.max(eligible - cast, 0);
  const data = [
    { name: "Voted",     value: voted,     fill: "#22d3ee" },
    { name: "Abstained", value: abstained, fill: "rgba(255,255,255,0.06)" },
  ];
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={70}
              dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-[var(--font-mono)] text-2xl font-bold text-cyan">{fmtPercent(pct)}</span>
          <span className="text-[10px] text-text-3 uppercase tracking-wider">Turnout</span>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-0.5">Votes Cast</div>
          <div className="font-[var(--font-mono)] text-xl font-bold text-white">{voted.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-0.5">Eligible Voters</div>
          <div className="font-[var(--font-mono)] text-xl font-bold text-text-2">{eligible.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mb-0.5">Abstained</div>
          <div className="font-[var(--font-mono)] text-xl font-bold text-text-3">{abstained.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function PositionChart({ pos }: { pos: any }) {
  const sorted = [...(pos.candidates ?? [])].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const maxVotes = sorted[0]?.vote_count ?? 0;

  return (
    <Card>
      <CardHeader title={pos.position_name} />
      <CardBody className="space-y-4">
        {/* Winner highlight */}
        {sorted.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gold-dim border border-gold/30 rounded-[var(--radius-md)]">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">1</div>
            <div>
              <div className="font-medium text-white text-sm">{sorted[0].candidate_name}</div>
              <div className="text-xs text-text-3">{sorted[0].vote_count ?? 0} votes · winner</div>
            </div>
          </div>
        )}

        {/* Ranked list */}
        <div className="space-y-2">
          {sorted.map((c: any, i: number) => {
            const pct = maxVotes > 0 ? ((c.vote_count ?? 0) / maxVotes) * 100 : 0;
            return (
              <div key={c.candidate_id ?? i}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-[var(--font-mono)] text-text-3 w-4">{i + 1}.</span>
                    <span className="text-sm text-text-1">{c.candidate_name}</span>
                  </div>
                  <span className="text-sm font-[var(--font-mono)] text-text-2">{c.vote_count ?? 0} votes</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export default function AdminResultsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    adminGetElections().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setElections(list);
      const published = list.find((e: any) => e.status === "results_published" || e.status === "closed");
      if (published) setSelectedId(published.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setResultsLoading(true);
    adminGetResults(selectedId).then(setResults).catch(() => setResults(null)).finally(() => setResultsLoading(false));
  }, [selectedId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select name="election" value={selectedId ?? ""} onChange={(e) => setSelectedId(Number(e.target.value))}
          options={elections.map((e: any) => ({ value: e.id, label: e.name }))} placeholder="Select election" className="w-full sm:w-72" />
        <HEBadge />
      </div>

      {!selectedId ? (
        <Card><CardBody><EmptyState title="Select an election" message="Choose an election above to view results." /></CardBody></Card>
      ) : resultsLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !results ? (
        <Card><CardBody><EmptyState title="No results" message="Results not yet available for this election." /></CardBody></Card>
      ) : (
        <>
          {/* Turnout card */}
          {results.turnout_pct != null && (
            <Card>
              <CardHeader title="Voter Turnout" />
              <CardBody>
                <TurnoutDonut
                  pct={results.turnout_pct}
                  cast={results.total_cast ?? 0}
                  eligible={results.total_eligible ?? 0}
                />
              </CardBody>
            </Card>
          )}

          {/* Per-position charts */}
          {(results.positions ?? []).map((pos: any) => (
            <PositionChart key={pos.position_id} pos={pos} />
          ))}
        </>
      )}
    </div>
  );
}
