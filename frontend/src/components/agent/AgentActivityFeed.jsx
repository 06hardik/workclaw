const ACTION_META = {
  DEPLOY_YIELD:     { icon: "⚡", label: "Deployed to Byreal", color: "#00d4ff" },
  CLAIM_YIELD:      { icon: "💰", label: "Claimed Yield", color: "#1dbf73" },
  VERIFY_DELIVERABLE: { icon: "🤖", label: "AI Verification", color: "#7c3aed" },
  RELEASE_FUNDS:    { icon: "✅", label: "Funds Released", color: "#1dbf73" },
  REJECT_DELIVERABLE: { icon: "⚠️", label: "Deliverable Rejected", color: "#e53e3e" },
  RESOLVE_DISPUTE:  { icon: "⚖️", label: "Dispute Resolved", color: "#ff6b35" },
  WARN_USER:        { icon: "🚩", label: "Dispute Raised", color: "#e53e3e" },
};

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AgentActivityFeed({ logs = [], title = "🤖 Agent Reasoning & Activity Log" }) {
  if (!logs.length) {
    return (
      <div className="card text-center" style={{ padding: "32px 20px" }}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>🤖</div>
        <p className="text-muted text-sm">No agent activity yet. The WorkClaw agent logs every decision here in real time.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h4 className="mb-4">{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {logs.map((log, idx) => {
          const meta = ACTION_META[log.action_type] || { icon: "📝", label: log.action_type, color: "var(--gray-500)" };
          const ts = log.created_at ? log.created_at * 1000 : log.timestamp || Date.now();
          return (
            <div key={log.id || idx} style={{ display: "flex", gap: 12, paddingBottom: 14, borderBottom: idx < logs.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: `${meta.color}15`, border: `1.5px solid ${meta.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gray-800)" }}>{meta.label}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>{timeAgo(ts)}</span>
                  {(log.agent_nft_id || log.agentNFTId) && (
                    <span className="badge badge-purple">Agent NFT #{log.agent_nft_id || log.agentNFTId}</span>
                  )}
                </div>
                <p style={{ fontSize: "0.83rem", color: "var(--gray-600)", lineHeight: 1.5 }}>{log.reason}</p>
                {log.on_chain_tx_hash && (
                  <div style={{ fontSize: "0.72rem", color: "var(--teal-dark)", marginTop: 4, fontFamily: "monospace" }}>
                    tx: {log.on_chain_tx_hash.slice(0, 10)}...{log.on_chain_tx_hash.slice(-8)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
