import { Link } from "react-router-dom";
import { Stars, StatusBadge } from "./UI";

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function JobCard({ job, showProposalCount = true }) {
  const skills = job.skills_required || [];

  return (
    <Link to={`/jobs/${job.id}`} style={{ display: "block", textDecoration: "none" }}>
      <div className="card" style={{ transition: "all .2s", cursor: "pointer" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              {job.category_icon && <span style={{ fontSize: "0.9rem" }}>{job.category_icon}</span>}
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {job.category_name || "General"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--gray-400)" }}>·</span>
              <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{timeAgo(job.created_at)}</span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--gray-900)", lineHeight: 1.3, marginBottom: 8 }}>
              {job.title}
            </h3>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--gray-900)" }}>
              {job.budget} {job.budget_token || "USDC"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--gray-500)", marginTop: 2 }}>Fixed price</div>
          </div>
        </div>

        <p style={{ fontSize: "0.87rem", color: "var(--gray-600)", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {job.description}
        </p>

        {skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {skills.slice(0, 5).map((skill) => <span key={skill} className="badge badge-gray">{skill}</span>)}
            {skills.length > 5 && <span className="badge badge-gray">+{skills.length - 5}</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar avatar-sm" style={{
              background: `hsl(${(job.client_address || "").charCodeAt(2) * 7 % 360}, 60%, 55%)`,
              color: "white", fontSize: "0.7rem"
            }}>
              {(job.client_name || "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--gray-700)" }}>
                {job.client_name || "Anonymous"}
              </div>
              {job.client_reputation > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Stars score={job.client_reputation} />
                  <span style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>({job.client_jobs || 0})</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {showProposalCount && (
              <span style={{ fontSize: "0.78rem", color: "var(--gray-500)" }}>
                {job.proposal_count || 0} proposal{job.proposal_count !== 1 ? "s" : ""}
              </span>
            )}
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>
    </Link>
  );
}
