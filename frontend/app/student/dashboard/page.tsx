"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getActiveElections, getMyCandidacy } from "@/lib/api";
import { fmtDateTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import ElectionCountdown from "@/components/shared/ElectionCountdown";
import EmptyState from "@/components/shared/EmptyState";
import { FiCheckSquare, FiUsers, FiBarChart2, FiUser, FiClock, FiShield, FiAward, FiPlus } from "react-icons/fi";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [elections, setElections] = useState<any[]>([]);
  const [candidacies, setCandidacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getActiveElections().catch(() => []),
      getMyCandidacy().catch(() => []),
    ]).then(([e, c]) => {
      setElections(Array.isArray(e) ? e : []);
      setCandidacies((Array.isArray(c) ? c : c ? [c] : []).filter((x: any) => x && x.id));
      setLoading(false);
    });
  }, []);

  const votingElection = elections.find((e) => e.status === "voting_open");
  const nominationElections = elections.filter((e) => e.status === "nomination_open");
  const upcomingElections = elections.filter((e) => e.status === "draft");
  const approvedCount = candidacies.filter((c) => c.approval_status === "approved").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero welcome */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-surface-2 via-surface-1 to-void border border-border p-6">
        <div className="relative z-10">
          <div className="text-[10px] font-[var(--font-display)] uppercase tracking-widest text-text-3 mb-1">{greeting}</div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-white">
            {user?.full_name?.split(" ")[0] ?? "Student"}
          </h1>
          {(user?.faculty || user?.program) && (
            <div className="text-sm text-text-3 mt-1">
              {[user.faculty, user.program].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-cyan/5 blur-2xl pointer-events-none" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Elections",    value: elections.length,   color: "text-cyan",    bg: "bg-cyan/10",    Icon: FiShield },
          { label: "Applications", value: candidacies.length, color: "text-gold",    bg: "bg-gold/10",    Icon: FiUser },
          { label: "Approved",     value: approvedCount,      color: "text-success", bg: "bg-success/10", Icon: FiAward },
        ].map(({ label, value, color, bg, Icon }) => (
          <Card key={label}>
            <CardBody className="py-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon size={15} className={color} />
              </div>
              <div className={`font-[var(--font-mono)] text-xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-3 font-[var(--font-display)] mt-0.5">{label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Active voting banner */}
      {votingElection && (
        <Card glow="gold">
          <CardBody>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Badge status="voting_open" className="mb-2" />
                <h2 className="font-[var(--font-display)] text-lg font-bold text-white">{votingElection.name}</h2>
                <div className="text-xs text-text-3 mt-1 flex items-center gap-1">
                  <FiClock size={10} />
                  {fmtDateTime(votingElection.voting_start)} — {fmtDateTime(votingElection.voting_end)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ElectionCountdown endTime={votingElection.voting_end} />
                <Link href="/student/vote">
                  <Button leftIcon={<FiCheckSquare size={14} />}>Cast Vote</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Per-election nomination banners */}
      {nominationElections.map((e: any) => {
        const myApp = candidacies.find((c: any) => c.election_id === e.id);
        const statusText = myApp
          ? myApp.approval_status === "approved"
            ? `Your candidacy for ${myApp.position?.name ?? "this position"} is approved — you're on the ballot.`
            : myApp.approval_status === "pending"
            ? `Your application for ${myApp.position?.name ?? "this position"} is under review.`
            : `Your application for ${myApp.position?.name ?? "this position"} was not approved.`
          : "Nominations are open — you can apply for candidacy.";

        return (
          <Card key={e.id} glow="cyan">
            <CardBody>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Badge status="nomination_open" className="mb-1.5" />
                  <div className="font-[var(--font-display)] text-sm font-bold text-white truncate">{e.name}</div>
                  <div className="text-xs text-text-3 mt-0.5">{statusText}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {myApp && <Badge status={myApp.approval_status} />}
                  <Link href="/student/candidacy">
                    <Button variant="ghost" size="sm" leftIcon={myApp ? undefined : <FiPlus size={13} />}>
                      {myApp ? "View Application" : "Apply Now"}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}

      {/* Upcoming elections */}
      {upcomingElections.map((e: any) => (
        <Card key={e.id}>
          <CardBody>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Badge status="upcoming" className="mb-1.5">Upcoming</Badge>
                <div className="font-[var(--font-display)] text-sm font-bold text-white truncate">{e.name}</div>
                {e.description && <div className="text-xs text-text-3 mt-0.5">{e.description}</div>}
                {e.nomination_start && (
                  <div className="text-xs text-text-3 mt-1 flex items-center gap-1">
                    <FiClock size={10} />
                    Nominations open {fmtDateTime(e.nomination_start)}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}

      {/* Quick actions */}
      <div>
        <h3 className="font-[var(--font-display)] text-[10px] font-bold text-text-3 uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/student/candidates", label: "Candidates",   Icon: FiUsers,       color: "text-cyan",    bg: "bg-cyan/10" },
            { href: "/student/vote",       label: "Cast Vote",    Icon: FiCheckSquare, color: "text-gold",    bg: "bg-gold/10" },
            { href: "/student/results",    label: "Results",      Icon: FiBarChart2,   color: "text-success", bg: "bg-success/10" },
            { href: "/student/candidacy",  label: "My Candidacy", Icon: FiUser,        color: "text-warning", bg: "bg-warning/10" },
          ].map(({ href, label, Icon, color, bg }) => (
            <Link key={href} href={href}>
              <Card hover>
                <CardBody className="text-center py-5">
                  <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="text-xs font-[var(--font-display)] font-bold text-text-2 uppercase tracking-wider">{label}</div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Elections list */}
      <div>
        <h3 className="font-[var(--font-display)] text-[10px] font-bold text-text-3 uppercase tracking-widest mb-3">All Elections</h3>
        {elections.length === 0 ? (
          <Card><CardBody><EmptyState title="No elections" message="No active elections at this time." /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {elections.map((e: any) => (
              <Card key={e.id} hover>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{e.name}</div>
                      <div className="text-xs text-text-3 flex items-center gap-1 mt-0.5">
                        <FiClock size={10} />
                        {fmtDateTime(e.voting_start)} — {fmtDateTime(e.voting_end)}
                      </div>
                    </div>
                    <Badge status={e.status} />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
