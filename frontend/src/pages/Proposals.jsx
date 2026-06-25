import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyProposals } from "../utils/api";
import { StatusBadge, EmptyState, CardSkeleton } from "../components/common/UI";

export default function Proposals() {
  const { wallet } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;
    getMyProposals().then((r) => setProposals(r.proposals || [])).finally(() => setLoading(false));
  }, [wallet]);

  if (!wallet) {
    return <div className="container page"><EmptyState icon="🔐" title="Connect your wallet" subtitle="Sign in to view your submitted proposals." /></div>;
  }

  return (
    <div className="container-sm page">
      <h1 className="mb-2" style={{ fontSize: "28px", color: "var(--text-primary)" }}>My proposals</h1>
      <p className="text-muted mb-6">Track the status of every proposal you've submitted.</p>

      {loading ? (
        <div className="flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : proposals.length === 0 ? (
        <EmptyState icon="📝" title="No proposals yet" subtitle="Browse open jobs and submit your first proposal." action={<Link to="/jobs" className="btn btn-primary">Find work</Link>} />
      ) : (
        <div className="flex-col gap-3">
          {proposals.map((p) => (
            <Link key={p.id} to={`/jobs/${p.job_id}`} className="card" style={{ display: "block" }}>
              <div className="flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{p.job_title}</div>
                  <div className="text-sm text-muted">Client: {p.client_name || "Anonymous"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono" style={{ color: "var(--text-primary)" }}>{p.bid_amount} {p.bid_token}</div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <p className="text-sm text-muted mt-2" style={{
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                {p.cover_letter}
              </p>
              {p.status === "ACCEPTED" && (
                <div className="badge badge-green mt-2">🎉 You were hired! Job status: {p.job_status}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
