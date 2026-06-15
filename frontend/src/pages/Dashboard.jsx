import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getMyJobs, getMyProposals, getMyContracts, getUserStats } from "../utils/api";
import { StatusBadge, EmptyState, Avatar } from "../components/common/UI";
import YieldTicker from "../components/common/YieldTicker";
import { claimUsdcFaucet, getUsdcBalance, ON_CHAIN_ENABLED, shortAddress } from "../utils/wallet";

export default function Dashboard() {
  const { user, wallet } = useAuth();
  const { toast } = useToast();

  const [myJobs, setMyJobs] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;
    Promise.all([getMyJobs(), getMyProposals(), getMyContracts(), getUserStats(wallet)])
      .then(([jobs, proposals, contracts, statsRes]) => {
        setMyJobs(jobs.jobs || []);
        setMyProposals(proposals.proposals || []);
        setContracts(contracts.contracts || []);
        setStats(statsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    if (ON_CHAIN_ENABLED) {
      getUsdcBalance(wallet).then(setBalance).catch(() => setBalance(null));
    }
  }, [wallet]);

  const handleFaucet = async () => {
    setClaimingFaucet(true);
    try {
      await claimUsdcFaucet();
      toast("10,000 test USDC claimed!", "success");
      const bal = await getUsdcBalance(wallet);
      setBalance(bal);
    } catch (e) {
      toast(e.message.includes("cooldown") ? "Faucet cooldown active — try again in an hour" : e.message, "error");
    } finally {
      setClaimingFaucet(false);
    }
  };

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");

  if (!wallet) {
    return (
      <div className="container page">
        <EmptyState icon="🔐" title="Connect your wallet" subtitle="Sign in to view your dashboard, jobs, proposals, and contracts." />
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="flex" style={{ justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
          <p className="text-muted">{shortAddress(wallet)}</p>
        </div>
        {ON_CHAIN_ENABLED && (
          <div className="card card-compact flex gap-3" style={{ alignItems: "center" }}>
            <div>
              <div className="text-xs text-muted">USDC Balance</div>
              <div className="font-bold" style={{ fontSize: "1.1rem" }}>{balance !== null ? balance.toFixed(2) : "—"} USDC</div>
            </div>
            <button className="btn btn-outline-green btn-sm" onClick={handleFaucet} disabled={claimingFaucet}>
              {claimingFaucet ? <div className="spinner spinner-sm" /> : "🚰 Get Test USDC"}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4 mb-6">
        <StatCard icon="💰" label="Total Earned" value={stats ? `${stats.totalEarned.toFixed(2)} USDC` : "—"} />
        <StatCard icon="✅" label="Jobs Completed" value={stats?.completedJobs ?? "—"} />
        <StatCard icon="⚙️" label="Active Contracts" value={stats?.activeContracts ?? "—"} />
        <StatCard icon="📋" label="Jobs Posted" value={stats?.postedJobs ?? "—"} />
      </div>

      {/* Active contracts with live yield */}
      {activeContracts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-4">Active Contracts</h2>
          <div className="grid-2">
            {activeContracts.map((c) => (
              <div key={c.id} className="card">
                <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <Link to={`/contracts/${c.id}`} className="font-semibold" style={{ color: "var(--gray-900)" }}>
                    {c.job_title}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted mb-3">
                  {c.client_address.toLowerCase() === wallet.toLowerCase() ? `Freelancer: ${c.freelancer_name || shortAddress(c.freelancer_address)}` : `Client: ${c.client_name || shortAddress(c.client_address)}`}
                  {" · "}{c.escrow_amount} {c.escrow_token}
                </p>
                <YieldTicker contractId={c.id} escrowAmount={c.escrow_amount} />
                <Link to={`/contracts/${c.id}`} className="btn btn-outline btn-sm mt-3 btn-block">View Contract</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid-2">
        {/* Posted jobs */}
        <section>
          <div className="flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3>My Posted Jobs</h3>
            <Link to="/post-job" className="btn btn-outline btn-sm">+ New Job</Link>
          </div>
          {loading ? <div className="spinner" /> : myJobs.length === 0 ? (
            <EmptyState icon="📋" title="No jobs posted" subtitle="Post your first job to start hiring freelancers." />
          ) : (
            <div className="flex-col gap-3">
              {myJobs.slice(0, 5).map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="card card-compact" style={{ display: "block" }}>
                  <div className="flex" style={{ justifyContent: "space-between" }}>
                    <span className="font-semibold truncate" style={{ maxWidth: 200 }}>{job.title}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div className="text-sm text-muted">{job.budget} {job.budget_token} · {job.proposal_count} proposal{job.proposal_count !== 1 ? "s" : ""}</div>
                    <div className="text-xs" style={{ color: "var(--green)" }}>View Details →</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My proposals */}
        <section>
          <div className="flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3>Proposals I've Submitted</h3>
            <Link to="/jobs" className="btn btn-outline btn-sm">Find Work</Link>
          </div>
          {loading ? <div className="spinner" /> : myProposals.length === 0 ? (
            <EmptyState icon="📝" title="No proposals yet" subtitle="Browse open jobs and submit your first proposal." />
          ) : (
            <div className="flex-col gap-3">
              {myProposals.slice(0, 5).map((p) => (
                <Link key={p.id} to={`/jobs/${p.job_id}`} className="card card-compact" style={{ display: "block" }}>
                  <div className="flex" style={{ justifyContent: "space-between" }}>
                    <span className="font-semibold truncate" style={{ maxWidth: 200 }}>{p.job_title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-sm text-muted mt-2">Your bid: {p.bid_amount} {p.bid_token}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card card-compact flex gap-3">
      <div style={{ fontSize: "1.6rem" }}>{icon}</div>
      <div>
        <div className="font-bold" style={{ fontSize: "1.1rem" }}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
