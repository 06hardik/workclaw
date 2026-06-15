import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformStats, getCategories, getJobs } from "../utils/api";
import JobCard from "../components/common/JobCard";
import { CardSkeleton } from "../components/common/UI";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPlatformStats(), getCategories(), getJobs({ limit: 6 })])
      .then(([s, c, j]) => {
        setStats(s);
        setCategories(c.categories || []);
        setJobs(j.jobs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #16283d 60%, #0d1b2a 100%)", color: "white", padding: "72px 0 100px", position: "relative", overflow: "hidden" }}>
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 680 }}>
            <div className="badge" style={{ background: "rgba(0,212,255,.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,.3)", marginBottom: 20 }}>
              ⚡ Powered by Byreal Agent Skills · Mantle Sepolia
            </div>
            <h1 style={{ color: "white", fontSize: "3rem", marginBottom: 18, lineHeight: 1.15 }}>
              Get paid the second your work is done.
            </h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.75)", marginBottom: 32, lineHeight: 1.7 }}>
              WorkClaw is the autonomous escrow engine for freelancers. Post a job, hire talent,
              and let our AI agent verify deliverables and release <strong>USDC</strong> instantly —
              while your escrowed funds earn <strong style={{ color: "#1dbf73" }}>~18.3% APY</strong> via Byreal CLMM pools.
            </p>
            <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
              <Link to="/jobs" className="btn btn-primary btn-lg">Find Work</Link>
              <Link to="/post-job" className="btn btn-lg" style={{ background: "rgba(255,255,255,.1)", color: "white", border: "2px solid rgba(255,255,255,.2)" }}>
                Post a Job
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative glow */}
        <div style={{ position: "absolute", right: "-10%", top: "-20%", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,212,255,.15), transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", right: "15%", bottom: "-30%", width: 400, height: 400, background: "radial-gradient(circle, rgba(29,191,115,.12), transparent 70%)", borderRadius: "50%" }} />
      </section>

      {/* Stats bar */}
      <section style={{ background: "white", borderBottom: "1px solid var(--gray-200)" }}>
        <div className="container" style={{ padding: "24px 24px" }}>
          <div className="grid-4">
            <StatBox label="Open Jobs" value={stats?.openJobs ?? "—"} icon="💼" />
            <StatBox label="Active Contracts" value={stats?.activeContracts ?? "—"} icon="⚙️" />
            <StatBox label="Total Escrow Value" value={stats ? `${stats.totalEscrow.toFixed(2)} USDC` : "—"} icon="🔒" />
            <StatBox label="Total Yield Generated" value={stats ? `${stats.totalYield.toFixed(4)} USDC` : "—"} icon="⚡" highlight />
          </div>
        </div>
      </section>

      <div className="container page">
        {/* Categories */}
        <section className="mb-6">
          <h2 className="mb-4">Browse by Category</h2>
          <div className="grid-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {categories.slice(0, 10).map((cat) => (
              <Link key={cat.id} to={`/jobs?category=${cat.id}`} className="card card-compact"
                style={{ textAlign: "center", textDecoration: "none", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--green)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
              >
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{cat.icon}</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--gray-700)" }}>{cat.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--gray-400)", marginTop: 2 }}>{cat.job_count} jobs</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent jobs */}
        <section>
          <div className="flex" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <h2>Latest Opportunities</h2>
            <Link to="/jobs" className="btn btn-outline btn-sm">View all →</Link>
          </div>
          <div className="grid-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
          {!loading && jobs.length === 0 && (
            <div className="card text-center" style={{ padding: 40 }}>
              <p className="text-muted">No jobs posted yet. Be the first!</p>
              <Link to="/post-job" className="btn btn-primary mt-4">Post a Job</Link>
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="mt-6">
          <h2 className="mb-4 text-center">How WorkClaw Works</h2>
          <div className="grid-3">
            <HowCard icon="📝" step="1" title="Post & Fund Escrow" desc="Clients post jobs and deposit USDC into the WorkEscrow smart contract on Mantle Sepolia." />
            <HowCard icon="⚡" step="2" title="Yield While You Work" desc="The agent deploys idle escrow to a Byreal USDC-USDT CLMM pool, earning ~18.3% APY during the project." />
            <HowCard icon="🤖" step="3" title="AI Verifies & Pays Instantly" desc="On delivery, Gemini scores the work. If it passes, funds + yield split are released on-chain — automatically." />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, highlight }) {
  return (
    <div className="flex gap-3">
      <div style={{ fontSize: "1.6rem" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: highlight ? "var(--green-dark)" : "var(--gray-900)" }}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function HowCard({ icon, step, title, desc }) {
  return (
    <div className="card">
      <div className="flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: "2rem" }}>{icon}</div>
        <div className="badge badge-green">Step {step}</div>
      </div>
      <h4 className="mb-2">{title}</h4>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}
