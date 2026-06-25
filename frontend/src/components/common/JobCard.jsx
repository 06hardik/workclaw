import { Link } from "react-router-dom";
import { shortAddress } from "../../utils/wallet";
import { StatusBadge } from "./UI";

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function JobCard({ job, showProposalCount = true }) {
  const isEscrowLive = job.status === "ACTIVE" || job.status === "IN_PROGRESS" || job.status === "OPEN";

  return (
    <Link to={`/jobs/${job.id}`} style={{ display: "block", textDecoration: "none" }}>
      <div className={`card ${isEscrowLive ? "card-yield" : ""}`} style={{ cursor: "pointer" }}>
        {/* Row 1: Title & Budget */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "8px" }}>
          <h3 style={{ fontFamily: "var(--font-ui)", fontWeight: "600", fontSize: "16px", color: "var(--text-primary)", lineHeight: "1.4" }}>
            {job.title}
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexShrink: 0 }}>
            <span className="font-mono" style={{ fontSize: "18px", fontWeight: "600", color: "var(--accent-lime)" }}>
              {job.budget}
            </span>
            <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {job.budget_token || "USDC"}
            </span>
          </div>
        </div>

        {/* Row 2: Category & Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{
            background: "rgba(0, 229, 255, 0.06)",
            border: "1px solid rgba(0, 229, 255, 0.15)",
            color: "var(--accent-cyan)",
            borderRadius: "20px",
            padding: "2px 10px",
            fontSize: "12px"
          }}>
            {job.category_icon && <span style={{ marginRight: "4px" }}>{job.category_icon}</span>}
            {job.category_name || "General"}
          </span>

          {isEscrowLive && (
            <span style={{
              background: "rgba(163, 255, 87, 0.08)",
              border: "1px solid rgba(163, 255, 87, 0.2)",
              color: "var(--accent-lime)",
              padding: "2px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "500"
            }}>
              ⚡ Yield active
            </span>
          )}
        </div>

        {/* Row 3: Description */}
        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: "1.6",
          marginBottom: "16px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}>
          {job.description}
        </p>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "12px 0" }} />

        {/* Row 4: Meta & Wallet */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              {shortAddress(job.client_address)}
            </span>
            {showProposalCount && (
              <>
                <span>·</span>
                <span>{job.proposal_count || 0} proposal{job.proposal_count !== 1 ? "s" : ""}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(job.created_at)}</span>
          </div>

          <StatusBadge status={job.status} />
        </div>
      </div>
    </Link>
  );
}
