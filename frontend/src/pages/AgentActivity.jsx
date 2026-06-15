import { useEffect, useState } from "react";
import { useWs } from "../context/WsContext";
import { getAgentLogs, getPlatformStats } from "../utils/api";
import AgentActivityFeed from "../components/agent/AgentActivityFeed";

export default function AgentActivity() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { subscribe, connected } = useWs();

  const fetchLogs = () => {
    getAgentLogs().then((r) => setLogs(r.logs || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    getPlatformStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "AGENT_LOG") fetchLogs();
    });
  }, [subscribe]);

  return (
    <div className="container-sm page">
      <div className="flex" style={{ justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h1>🤖 Agent Activity</h1>
        <span className={`badge ${connected ? "badge-green" : "badge-gray"}`}>
          {connected ? "🟢 Live" : "⚪ Connecting..."}
        </span>
      </div>
      <p className="text-muted mb-6">
        A transparent, real-time log of every autonomous decision made by the WorkClaw agent —
        yield deployments, AI deliverable verifications, fund releases, and dispute resolutions.
        Every entry is permanently recorded on-chain via AgentLedger (ERC-8004), linked to the
        agent's identity NFT{stats?.contracts?.agentNFTId ? ` (#${stats.contracts.agentNFTId})` : ""}.
      </p>

      {stats && (
        <div className="grid-3 mb-6">
          <StatBox icon="🔒" label="Total Value Escrowed" value={`${stats.totalEscrow.toFixed(2)} USDC`} />
          <StatBox icon="⚡" label="Total Yield Generated" value={`${stats.totalYield.toFixed(6)} USDC`} />
          <StatBox icon="⚙️" label="Active Contracts" value={stats.activeContracts} />
        </div>
      )}

      {stats?.byreal && (
        <div className="card mb-6" style={{ background: "linear-gradient(135deg, #0d1b2a, #16283d)", color: "white", border: "none" }}>
          <div className="flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00d4ff", marginBottom: 4 }}>BYREAL POOL</div>
              <div className="font-bold">{stats.byreal.poolId}</div>
              <div className="text-sm" style={{ color: "rgba(255,255,255,.6)" }}>{stats.byreal.token} · {stats.byreal.chain}</div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00d4ff", marginBottom: 4 }}>APY</div>
              <div className="font-bold" style={{ fontSize: "1.4rem" }}>{stats.byreal.apy.toFixed(1)}%</div>
            </div>
          </div>
          {stats.byreal.demoMode && (
            <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,.5)" }}>{stats.byreal.bridgeNote}</div>
          )}
        </div>
      )}

      {loading ? <div className="spinner" style={{ margin: "40px auto" }} /> : <AgentActivityFeed logs={logs} />}
    </div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="card card-compact flex gap-3">
      <div style={{ fontSize: "1.6rem" }}>{icon}</div>
      <div>
        <div className="font-bold" style={{ fontSize: "1.05rem" }}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
