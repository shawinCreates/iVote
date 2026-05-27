"use client";
import { useState, useEffect } from "react";
import { getElections, getElectionResults } from "@/lib/api";
import { fmtPercent } from "@/lib/formatters";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/FormControls";
import { Spinner } from "@/components/ui/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import HEBadge from "@/components/shared/HEBadge";
import { ResponsiveContainer, PieChart, Pie } from "recharts";

const CHART_COLORS = ["#f59e0b", "#22d3ee", "#a78bfa", "#34d399", "#fb7185", "#60a5fa"];

export default function StudentResultsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    getElections().then((data: any) => {
      const list = (Array.isArray(data) ? data : [])
        .filter((e: any) => e.status === "results_published" || e.status === "closed")
        .sort((a: any, b: any) => b.id - a.id);
      setElections(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setResultsLoading(true);
    getElectionResults(selectedId).then(setResults).catch(() => setResults(null)).finally(() => setResultsLoading(false));
  }, [selectedId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {elections.length > 0 && (
          <Select name="election" value={selectedId ?? ""} onChange={(e) => setSelectedId(Number(e.target.value))}
            options={elections.map((e: any) => ({ value: e.id, label: e.name }))} className="w-full sm:w-72" />
        )}
        <HEBadge />
      </div>

      {!selectedId || elections.length === 0 ? (
        <Card><CardBody><EmptyState title="No published results" message="Results will appear here once an election is closed." /></CardBody></Card>
      ) : resultsLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !results ? (
        <Card><CardBody><EmptyState title="Results unavailable" message="Results for this election are not available yet." /></CardBody></Card>
      ) : (
        <>
          {/* Turnout */}
          {results.turnout_pct != null && (
            <Card>
              <CardBody>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Voted",     value: Math.max(results.total_cast ?? 0, 0),     fill: "#22d3ee" },
                            { name: "Abstained", value: Math.max((results.total_eligible ?? 0) - (results.total_cast ?? 0), 0), fill: "rgba(255,255,255,0.06)" },
                          ]}
                          cx="50%" cy="50%" innerRadius={44} outerRadius={60}
                          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-[var(--font-mono)] text-xl font-bold text-cyan">{fmtPercent(results.turnout_pct)}</span>
                      <span className="text-[9px] text-text-3 uppercase tracking-wider">Turnout</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Votes Cast</div>
                      <div className="font-[var(--font-mono)] text-lg font-bold text-white">{(results.total_cast ?? 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">Eligible Voters</div>
                      <div className="font-[var(--font-mono)] text-lg font-bold text-text-2">{(results.total_eligible ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Per-position results */}
          {(results.positions ?? []).map((pos: any) => {
            const sorted = [...(pos.candidates ?? [])].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
            const maxVotes = sorted[0]?.vote_count ?? 1;
            return (
              <Card key={pos.position_id}>
                <CardHeader title={pos.position_name} />
                <CardBody className="space-y-3">
                  {sorted.map((c: any, i: number) => {
                    const votes = c.vote_count ?? 0;
                    const pct = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                    const isWinner = i === 0 && votes > 0;
                    return (
                      <div key={c.candidate_id ?? i}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-[var(--font-mono)] text-text-3 w-4 shrink-0">{i + 1}.</span>
                          <span className="text-sm font-medium text-white flex-1">{c.candidate_name}</span>
                          {isWinner && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold uppercase">Winner</span>
                          )}
                          <span className="font-[var(--font-mono)] text-sm text-text-2 shrink-0">{votes}</span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
