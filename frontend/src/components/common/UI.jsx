import { shortAddress } from "../../utils/wallet";

export function Stars({ score = 0 }) {
  const rounded = Math.round(score || 0);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star ${i <= rounded ? "" : "star-empty"}`}>★</span>
      ))}
    </span>
  );
}

export function ScoreRing({ score }) {
  if (score === null || score === undefined) return null;
  const cls = score >= 70 ? "score-high" : score >= 50 ? "score-mid" : "score-low";
  // All numbers must be mono
  return <div className={`score-ring ${cls} font-mono`}>{score}</div>;
}

export function StatusBadge({ status }) {
  const formatted = (status || "").replace(/_/g, " ");
  return <span className={`badge status-${status}`}>{formatted}</span>;
}

export function Avatar({ name, address, size = "md" }) {
  const initials = (name || address || "??").slice(0, 2);
  return (
    <div className={`avatar avatar-${size} font-mono`} style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)", fontSize: "11px", fontWeight: "500", textTransform: "uppercase" }}>
      {initials}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, subtitle, action }) {
  return (
    <div className="card text-center" style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: 16, color: "var(--text-muted)" }}>{icon}</div>
      <h3 style={{ marginBottom: 8, fontSize: "16px", color: "var(--text-primary)" }}>{title}</h3>
      {subtitle && <p style={{ maxWidth: 400, margin: "0 auto 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{subtitle}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="skeleton" style={{ height: "18px", width: "40%" }} />
      <div className="skeleton" style={{ height: "24px", width: "70%" }} />
      <div className="skeleton" style={{ height: "14px", width: "100%" }} />
      <div className="skeleton" style={{ height: "14px", width: "90%" }} />
      <div className="skeleton" style={{ height: "36px", width: "30%", marginTop: "8px" }} />
    </div>
  );
}
