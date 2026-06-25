import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container page text-center" style={{ paddingTop: 80 }}>
      <div style={{ fontSize: "4rem", marginBottom: 16 }}>🦀</div>
      <h1 className="mb-2" style={{ color: "var(--text-primary)" }}>404 — lost at sea</h1>
      <p className="text-muted mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
