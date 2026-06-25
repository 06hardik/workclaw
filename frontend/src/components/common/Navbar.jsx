import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { shortAddress } from "../../utils/wallet";
import { Avatar } from "./UI";

export default function Navbar() {
  const { user, wallet, login, logout, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await login();
      toast("Signed in successfully", "success");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      toast(err.message || (typeof err === "object" ? JSON.stringify(err) : String(err)), "error");
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast("Signed out", "info");
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="glass-nav" style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", height: 64, gap: 32 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: "1.65rem", filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))" }}>🦀</span>
          <span className="text-gradient" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.5px" }}>WorkClaw</span>
        </Link>

        <div className="flex gap-2 hide-mobile" style={{ flex: 1 }}>
          <NavLink to="/jobs" active={location.pathname.startsWith("/jobs")}>Find Work</NavLink>
          {(!user || user.role !== "FREELANCER") && <NavLink to="/post-job" active={location.pathname === "/post-job"}>Post a Job</NavLink>}
          {user && <NavLink to="/dashboard" active={location.pathname === "/dashboard"}>Dashboard</NavLink>}
          {user && <NavLink to="/contracts" active={location.pathname === "/contracts"}>Contracts</NavLink>}
          <NavLink to="/agent" active={location.pathname === "/agent"}>Agent Activity</NavLink>
        </div>

        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, rgba(13, 27, 42, 0.6) 0%, rgba(26, 58, 92, 0.6) 100%)", border: "1px solid rgba(0, 212, 255, 0.2)", padding: "5px 12px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, color: "#00d4ff", boxShadow: "0 0 10px rgba(0, 212, 255, 0.15)" }}>
          <span style={{ fontSize: "0.65rem", animation: "pulse 1.5s infinite" }}>⚡</span>
          Byreal Yield Active
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {loading ? <div className="spinner" /> : !user ? (
            <button className="btn btn-primary btn-sm" onClick={handleLogin} disabled={signingIn}>
              {signingIn ? <><div className="spinner spinner-sm" /> Signing...</> : "🦊 Connect Wallet"}
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-full)", background: "var(--gray-100)", cursor: "pointer", transition: "all .15s", color: "var(--gray-800)" }}
              >
                <Avatar name={user.name} address={wallet} size="sm" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-800)" }}>
                  {user.name || shortAddress(wallet)}
                </span>
                <span style={{ fontSize: "0.6rem", color: "var(--gray-400)" }}>▼</span>
              </button>

              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--gray-100)", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", minWidth: 200, overflow: "hidden", zIndex: 200 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-200)" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gray-800)" }}>{user.name || "Anonymous"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 2 }}>{shortAddress(wallet)}</div>
                      <div className="badge badge-green mt-2">{user.role}</div>
                    </div>
                    {[
                      { to: "/dashboard", label: "📊 Dashboard" },
                      { to: "/profile", label: "👤 My Profile" },
                      { to: "/contracts", label: "📄 My Contracts" },
                      { to: "/proposals", label: "📝 My Proposals" },
                    ].map(({ to, label }) => (
                      <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 16px", fontSize: "0.875rem", color: "var(--gray-700)" }}>
                        {label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid var(--gray-200)", padding: "4px 0" }}>
                      <button onClick={handleLogout} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--red)", fontWeight: 600 }}>
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link to={to} style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontWeight: 600, color: active ? "var(--green)" : "var(--gray-600)", background: active ? "var(--green-light)" : "transparent", transition: "all .15s" }}>
      {children}
    </Link>
  );
}
