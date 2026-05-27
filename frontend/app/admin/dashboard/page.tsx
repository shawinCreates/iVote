"use client";
import { useState, useEffect } from "react";
import { adminGetStats, adminGetElections, getPendingStudents, adminGetPendingCandidates, adminGetAuditLogs, getStudentPhotoUrl, getCandidatePhotoUrl } from "@/lib/api";
import { fmtDateTime, fmtRelative } from "@/lib/formatters";
import ProtectedImage from "@/components/shared/ProtectedImage";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useCountUp } from "@/hooks/useCountUp";
import { FiUsers, FiCalendar, FiCheckSquare, FiShield, FiUserCheck } from "react-icons/fi";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const displayed = useCountUp(value);
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="font-[var(--font-mono)] text-2xl font-bold text-white">{displayed}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-3 font-[var(--font-display)]">{label}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGetStats().catch(() => null),
      getPendingStudents().catch(() => []),
      adminGetElections().catch(() => []),
      adminGetPendingCandidates().catch(() => []),
      adminGetAuditLogs(0, 10).catch(() => []),
    ]).then(([s, p, e, pc, l]) => {
      setStats(s);
      setPending(Array.isArray(p) ? p : []);
      setElections(Array.isArray(e) ? e : []);
      setPendingCandidates(Array.isArray(pc) ? pc : []);
      setLogs(Array.isArray(l) ? l : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Total Students" value={stats?.total_students ?? 0} color="bg-cyan-dim text-cyan" />
        <StatCard icon={FiCalendar} label="Elections" value={stats?.total_elections ?? elections.length} color="bg-gold-dim text-gold" />
        <StatCard icon={FiCheckSquare} label="Verified Students" value={stats?.verified_students ?? 0} color="bg-success-dim text-success" />
        <StatCard icon={FiShield} label="Pending Verifications" value={pending.length} color="bg-warning-dim text-warning" />
        <StatCard icon={FiUserCheck} label="Pending Candidacies" value={pendingCandidates.length} color="bg-[#a78bfa]/20 text-[#a78bfa]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pending Verifications" subtitle={`${pending.length} students awaiting review`} />
          <CardBody className="p-0">
            {pending.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-3">No pending verifications</div>
            ) : (
              <div className="divide-y divide-border">
                {pending.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProtectedImage
                        url={getStudentPhotoUrl(s.id)}
                        alt={s.full_name ?? ""}
                        initials={s.full_name ?? s.email}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-text-1">{s.full_name ?? s.email}</div>
                        <div className="text-xs text-text-3">{s.faculty}{s.year ? ` · Year ${s.year}` : ""}</div>
                      </div>
                    </div>
                    <Badge status="pending" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Elections" subtitle={`${elections.length} total`} />
          <CardBody className="p-0">
            {elections.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-3">No elections yet</div>
            ) : (
              <div className="divide-y divide-border">
                {elections.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-text-1">{e.name}</div>
                      <div className="text-xs text-text-3">{fmtDateTime(e.nomination_start)}</div>
                    </div>
                    <Badge status={e.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pending Candidacies" subtitle={`${pendingCandidates.length} applications awaiting review`} />
          <CardBody className="p-0">
            {pendingCandidates.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-3">No pending candidacy applications</div>
            ) : (
              <div className="divide-y divide-border">
                {pendingCandidates.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProtectedImage
                        url={getCandidatePhotoUrl(c.id)}
                        alt={c.user?.full_name ?? ""}
                        initials={c.user?.full_name ?? c.user?.email ?? "?"}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-text-1">{c.user?.full_name ?? c.user?.email}</div>
                        <div className="text-xs text-text-3">{c.position?.name ?? "—"}</div>
                      </div>
                    </div>
                    <Badge status="pending" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Latest audit log entries" />
        <CardBody className="p-0">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-3">No activity recorded</div>
          ) : (
            <div className="divide-y divide-border">
              {logs.slice(0, 8).map((log: any, i: number) => (
                <div key={log.id ?? i} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-1">{log.action}</span>
                    {log.details && <span className="text-xs text-text-3 ml-2">{typeof log.details === "string" ? log.details : ""}</span>}
                  </div>
                  <span className="text-[11px] text-text-3 font-[var(--font-mono)] shrink-0">{fmtRelative(log.created_at ?? log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
