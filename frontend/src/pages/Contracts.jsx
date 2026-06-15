import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyContracts } from "../utils/api";
import { StatusBadge, EmptyState, CardSkeleton } from "../components/common/UI";
import { shortAddress } from "../utils/wallet";

export default function Contracts() {
  const { wallet } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!wallet) return;
    getMyContracts().then((r) => setContracts(r.contracts || [])).finally(() => setLoading(false));
  }, [wallet]);

  if (!wallet) {
    return <div className="container page"><EmptyState icon="🔐" title="Connect your wallet" subtitle="Sign in to view your contracts." /></div>;
  }

  const filtered = filter === "ALL" ? contracts : contracts.filter((c) => c.status === filter);
  const filters = ["ALL", "ACTIVE", "SUBMITTED", "DISPUTED", "COMPLETED", "RESOLVED", "CANCELLED"];

  return (
    <div className="container page">
      <h1 className="mb-2">My Contracts</h1>
      <p className="text-muted mb-6">All your active and past agreements as a client or freelancer.</p>

      <div className="tabs mb-4">
        {filters.map((f) => (
          <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f} {f !== "ALL" && `(${contracts.filter((c) => c.status === f).length})`}
            {f === "ALL" && `(${contracts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📄" title="No contracts here" subtitle="Contracts appear once a proposal is accepted and escrow is funded." />
      ) : (
        <div className="flex-col gap-3">
          {filtered.map((c) => {
            const isClient = c.client_address === wallet;
            return (
              <Link key={c.id} to={`/contracts/${c.id}`} className="card" style={{ display: "block" }}>
                <div className="flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div className="font-semibold mb-1">{c.job_title}</div>
                    <div className="text-sm text-muted">
                      {isClient ? "You are the Client" : "You are the Freelancer"} ·
                      {" "}{isClient ? `Freelancer: ${c.freelancer_name || shortAddress(c.freelancer_address)}` : `Client: ${c.client_name || shortAddress(c.client_address)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{c.escrow_amount} {c.escrow_token}</div>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                {(c.yield_client > 0 || c.yield_freelancer > 0) && (
                  <div className="text-sm mt-2" style={{ color: "var(--green-dark)" }}>
                    ⚡ Yield generated: {(c.yield_client + c.yield_freelancer).toFixed(6)} USDC
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
