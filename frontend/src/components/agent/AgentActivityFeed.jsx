import { shortAddress } from "../../utils/wallet";

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

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AgentActivityFeed({ logs = [], title = "Agent Reasoning & Activity Log" }) {
  if (!logs.length) {
    return (
      <div className="card text-center" style={{ padding: "32px 20px" }}>
        <div style={{ fontSize: "36px", marginBottom: 12 }}>🤖</div>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No agent activity logged yet.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {title && <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{title}</h4>}
      
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {logs.map((log, idx) => {
          const accentColor = ACTION_COLORS[log.action_type] || "var(--text-secondary)";
          const ts = log.created_at ? log.created_at * 1000 : log.timestamp || Date.now();
          
          return (
            <div key={log.id || idx} style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "4px",
              paddingBottom: "14px", 
              borderBottom: idx < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: accentColor, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {log.action_type}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {timeAgo(ts)}
                </span>
              </div>

              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {log.reason}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                {log.on_chain_tx_hash ? (
                  <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                    tx: {shortAddress(log.on_chain_tx_hash)}
                  </span>
                ) : <span />}
                
                {(log.agent_nft_id || log.agentNFTId) && (
                  <span className="badge" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#c084fc", fontSize: "10px" }}>
                    NFT #{log.agent_nft_id || log.agentNFTId}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
