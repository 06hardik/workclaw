import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getMyJobs, getMyProposals, getMyContracts, getUserStats, getAgentLogs } from "../utils/api";
import { StatusBadge, EmptyState } from "../components/common/UI";
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
  const [agentLogs, setAgentLogs] = useState([]);
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;
    Promise.all([getMyJobs(), getMyProposals(), getMyContracts(), getUserStats(wallet), getAgentLogs()])
      .then(([jobs, proposals, contracts, statsRes, logsRes]) => {
        setMyJobs(jobs.jobs || []);
        setMyProposals(proposals.proposals || []);
        setContracts(contracts.contracts || []);
        setStats(statsRes);
        setAgentLogs((logsRes.logs || []).slice(0, 10)); // Top 10 newest logs
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
      // Refresh stats
      if (wallet) {
        const statsRes = await getUserStats(wallet);
        setStats(statsRes);
      }
    } catch (e) {
      toast(e.message.includes("cooldown") ? "Faucet cooldown active — try again in an hour" : e.message, "error");
    } finally {
      setClaimingFaucet(false);
    }
  };

  if (!wallet) {
    return (
      <div className="container page">
        <EmptyState icon="🔐" title="Connect your wallet" subtitle="Sign in to view your dashboard, jobs, proposals, and contracts." />
      </div>
    );
  }

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE" || c.status === "IN_PROGRESS" || c.status === "DISPUTED");

  return (
    <div className="container page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)" }}>
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="font-mono text-xs" style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            {wallet}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {ON_CHAIN_ENABLED && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>BALANCE</div>
              <div className="font-mono" style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                {balance !== null ? balance.toFixed(2) : "—"} USDC
              </div>
            </div>
          )}
          <button className="btn btn-dark btn-sm" onClick={handleFaucet} disabled={claimingFaucet} style={{ height: "36px" }}>
            {claimingFaucet ? "Claiming..." : "🚰 Get test USDC"}
          </button>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid-4" style={{ marginBottom: "32px" }}>
        <div className="card card-compact" style={{ padding: "20px 24px" }}>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--accent-cyan)" }}>
            {contracts.length}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>
            Active contracts
          </div>
        </div>

        <div className="card card-compact" style={{ padding: "20px 24px" }}>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--accent-lime)" }}>
            ${stats ? stats.totalEarned.toFixed(2) : "0.00"}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>
            USDC escrowed
          </div>
        </div>

        <div className="card card-compact" style={{ padding: "20px 24px" }}>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--accent-lime)" }}>
            ${stats ? (stats.totalEarned * 0.045).toFixed(4) : "0.0000"}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>
            Yield earned
          </div>
        </div>

        <div className="card card-compact" style={{ padding: "20px 24px" }}>
          <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--accent-cyan)" }}>
            {myProposals.length}
          </div>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px", letterSpacing: "0.5px" }}>
            Proposals sent
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "32px" }}>
        {/* Active Contracts List */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Active contracts</h2>
          {loading ? (
            <div className="skeleton" style={{ height: "200px" }} />
          ) : activeContracts.length === 0 ? (
            <div className="card text-center" style={{ padding: "48px 24px" }}>
              <p style={{ color: "var(--text-secondary)" }}>No active contracts.</p>
              <div style={{ marginTop: "16px" }}>
                <Link to="/jobs" className="btn btn-primary btn-sm">Find work</Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeContracts.map((c) => {
                const partnerAddress = c.client_address.toLowerCase() === wallet.toLowerCase() ? c.freelancer_address : c.client_address;
                return (
                  <Link key={c.id} to={`/contracts/${c.id}`} style={{ display: "block" }}>
                    <div className="card card-yield" style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      gap: "16px",
                      padding: "16px 20px"
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }} className="truncate">
                          {c.job_title}
                        </h3>
                        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          partner: {shortAddress(partnerAddress)} · amount: {c.escrow_amount} USDC
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        <StatusBadge status={c.status} />
                        <YieldTicker contractId={c.id} escrowAmount={c.escrow_amount} compact={true} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* My Posted Jobs / Submitted Proposals */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "32px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>My posted jobs</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {myJobs.slice(0, 3).map(j => (
                  <Link key={j.id} to={`/jobs/${j.id}`} className="card card-compact" style={{ display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }} className="truncate">{j.title}</span>
                      <StatusBadge status={j.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <span className="font-mono">{j.budget} USDC</span>
                      <span>{j.proposal_count || 0} proposals</span>
                    </div>
                  </Link>
                ))}
                {myJobs.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No jobs posted.</p>}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>My proposals</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {myProposals.slice(0, 3).map(p => (
                  <Link key={p.id} to={`/jobs/${p.job_id}`} className="card card-compact" style={{ display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }} className="truncate">{p.job_title}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <span className="font-mono">Bid: {p.bid_amount} USDC</span>
                    </div>
                  </Link>
                ))}
                {myProposals.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No proposals sent.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <aside>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Agent activity</h2>
          <div style={{ 
            background: "var(--bg-surface)", 
            border: "1px solid var(--border-subtle)", 
            borderRadius: "16px", 
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {agentLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No recent activity logged.</p>
            ) : (
              agentLogs.map((log, idx) => {
                const isSuccess = log.action_type === "RELEASE_FUNDS" || log.action_type === "CLAIM_YIELD";
                const isWarning = log.action_type === "WARN_USER" || log.action_type === "RESOLVE_DISPUTE";
                const isDanger = log.action_type === "REJECT_DELIVERABLE";
                const color = isSuccess ? "var(--accent-lime)" : isWarning ? "var(--accent-amber)" : isDanger ? "var(--accent-red)" : "var(--accent-cyan)";
                const ts = log.created_at ? log.created_at * 1000 : Date.now();
                return (
                  <div key={log.id || idx} style={{ 
                    borderBottom: "1px solid var(--border-subtle)", 
                    paddingBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: color, fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase" }}>
                        {log.action_type}
                      </span>
                      <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                        {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {log.reason}
                    </p>
                    {log.on_chain_tx_hash && (
                      <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        tx: {shortAddress(log.on_chain_tx_hash)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
