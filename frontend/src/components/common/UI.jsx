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
  return <div className={`score-ring ${cls}`}>{score}</div>;
}

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{(status || "").replace(/_/g, " ")}</span>;
}

export function Avatar({ name, address, size = "md" }) {
  const initials = (name || address || "??").slice(0, 2).toUpperCase();
  const colors = ["#1dbf73", "#00b4d8", "#7c3aed", "#ff6b35", "#ffb700", "#e53e3e"];
  const seed = (address || name || "x").charCodeAt(Math.min(2, (address || name || "x").length - 1));
  const color = colors[seed % colors.length];
  return (
    <div className={`avatar avatar-${size}`} style={{ background: color, color: "white" }}>
      {initials}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, subtitle, action }) {
  return (
    <div className="card text-center" style={{ padding: "48px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>{icon}</div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {subtitle && <p className="text-muted text-sm" style={{ maxWidth: 400, margin: "0 auto" }}>{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton" style={{ height: 16, width: "30%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 22, width: "70%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: "90%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 32, width: "40%" }} />
    </div>
  );
}
