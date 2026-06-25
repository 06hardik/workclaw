import { useEffect, useState } from "react";
import { useWs } from "../context/WsContext";
import { getAgentLogs, getPlatformStats } from "../utils/api";
import { Link } from "react-router-dom";
import { shortAddress } from "../utils/wallet";

const ACTION_COLORS = {
  DEPLOY_YIELD: "#00E5FF",
  RELEASE_FUNDS: "#A3FF57",
  CLAIM_YIELD: "#A3FF57",
  VERIFY_DELIVERABLE: "#8B9BAD",
  SCORE_DELIVERABLE: "#8B9BAD",
  RESOLVE_DISPUTE: "#FFB830",
  REJECT_DELIVERABLE: "#FF4757",
  WARN_USER: "#FF4757"
};

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
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: "700", fontSize: "28px", color: "var(--text-primary)" }}>
            WorkClaw agent
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Live activity feed
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pulsing-dot" />
          <span className="font-mono text-xs" style={{ color: "var(--accent-lime)", fontWeight: "600" }}>
            AGENT ONLINE
          </span>
        </div>
      </div>

      {stats && (
        <div className="grid-3" style={{ marginBottom: "32px" }}>
          <div className="card card-compact" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Value Escrowed</div>
            <div className="font-mono" style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: "500", marginTop: "4px" }}>
              ${stats.totalEscrow.toFixed(2)} USDC
            </div>
          </div>
          <div className="card card-compact" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Yield Generated</div>
            <div className="font-mono" style={{ fontSize: "18px", color: "var(--accent-lime)", fontWeight: "500", marginTop: "4px" }}>
              ${stats.totalYield.toFixed(6)} USDC
            </div>
          </div>
          <div className="card card-compact" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Active Contracts</div>
            <div className="font-mono" style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: "500", marginTop: "4px" }}>
              {stats.activeContracts}
            </div>
          </div>
        </div>
      )}

      {/* Main Logs Feed */}
      {loading ? (
        <div className="skeleton" style={{ height: "400px" }} />
      ) : logs.length === 0 ? (
        <div className="card text-center" style={{ padding: "48px 24px" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>The agent is waiting for work to begin. Post a job to activate the agent.</p>
          <Link to="/post-job" className="btn btn-primary">Post a job →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {logs.map((log, idx) => {
            const accentColor = ACTION_COLORS[log.action_type] || "var(--text-secondary)";
            const ts = log.created_at ? log.created_at * 1000 : log.timestamp || Date.now();
            
            // Try parsing score if verifying deliverable
            let score = null;
            if (log.action_type === "VERIFY_DELIVERABLE" || log.action_type === "REJECT_DELIVERABLE") {
              const match = log.reason.match(/score:\s*(\d+)/i) || log.reason.match(/scored\s*(\d+)/i) || log.reason.match(/(\d+)\/100/);
              if (match) score = parseInt(match[1]);
            }

            return (
              <div
                key={log.id || idx}
                className="card"
                style={{
                  padding: "20px 24px",
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                {/* Row 1: Action badge & Timestamp */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: accentColor,
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                  }}>
                    {log.action_type}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(ts).toLocaleString()}
                  </span>
                </div>

                {/* Row 2: Description */}
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {log.reason}
                </p>

                {/* Row 3: Score (If present) */}
                {score !== null && (
                  <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "baseline", gap: "2px" }}>
                    <span className="font-mono" style={{ fontSize: "24px", fontWeight: "700", color: score >= 70 ? "var(--accent-lime)" : "var(--accent-red)" }}>
                      {score}
                    </span>
                    <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>/100</span>
                  </div>
                )}

                {/* Row 4: Tx Hash & Link */}
                {log.on_chain_tx_hash && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
                    <a
                      href={`https://explorer.sepolia.mantle.xyz/tx/${log.on_chain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: "11px", color: "var(--accent-cyan)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      tx: {shortAddress(log.on_chain_tx_hash)} ↗
                    </a>
                    {(log.agent_nft_id || log.agentNFTId) && (
                      <span className="badge" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#c084fc", fontSize: "10px" }}>
                        Agent NFT #{log.agent_nft_id || log.agentNFTId}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
