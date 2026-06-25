import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getPlatformStats, getCategories, getJobs } from "../utils/api";
import JobCard from "../components/common/JobCard";
import { CardSkeleton } from "../components/common/UI";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Counter animation values
  const [animatedStats, setAnimatedStats] = useState({
    activeContracts: 0,
    totalEscrow: 0,
    totalYield: 0,
    aiVerifications: 0
  });

  const statsRef = useRef(null);

  // Live pulsing strip counters
  const [pulseStats, setPulseStats] = useState({
    jobsPosted: 124,
    usdcEscrowed: 48200,
    avgScore: 83,
    released: 89
  });

  useEffect(() => {
    Promise.all([getPlatformStats(), getCategories(), getJobs({ limit: 6 })])
      .then(([s, c, j]) => {
        setStats(s);
        setCategories(c.categories || []);
        setJobs(j.jobs || []);

        // Pulse stats starting seed
        setPulseStats({
          jobsPosted: s.openJobs + s.activeContracts + 42,
          usdcEscrowed: Math.round(s.totalEscrow + 15200),
          avgScore: 83,
          released: s.completedJobs + 68
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Pulse update mock counters every 5 seconds with crossfade effect
  const [pulseOpacity, setPulseOpacity] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseOpacity(0);
      setTimeout(() => {
        setPulseStats(prev => ({
          jobsPosted: prev.jobsPosted + (Math.random() > 0.6 ? 1 : 0),
          usdcEscrowed: prev.usdcEscrowed + (Math.random() > 0.5 ? Math.round(Math.random() * 200) : 0),
          avgScore: Math.round(82 + Math.random() * 3),
          released: prev.released + (Math.random() > 0.8 ? 1 : 0)
        }));
        setPulseOpacity(1);
      }, 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Stats Counter Animate on Viewport Entry
  useEffect(() => {
    if (!stats) return;

    let observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let start = null;
        const duration = 1200;
        const animate = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          setAnimatedStats({
            activeContracts: Math.floor(progress * (stats.activeContracts || 0)),
            totalEscrow: progress * (stats.totalEscrow || 0),
            totalYield: progress * (stats.totalYield || 0),
            aiVerifications: Math.floor(progress * (stats.completedJobs + stats.activeContracts + 12)) // Approx verifications
          });
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }
    return () => observer.disconnect();
  }, [stats]);

  // Card Hover Accent Border helpers
  const handleCardEnter = (e, color) => {
    e.currentTarget.style.borderLeft = `2px solid ${color}`;
    e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.2)";
  };
  const handleCardLeave = (e) => {
    e.currentTarget.style.borderLeft = "1px solid var(--border-subtle)";
    e.currentTarget.style.borderColor = "var(--border-subtle)";
  };

  return (
    <div>
      {/* Hero */}
      <section style={{ 
        minHeight: "calc(100vh - 56px)", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(0, 229, 255, 0.04) 0%, transparent 70%), #080B10",
        padding: "80px 0",
        position: "relative"
      }}>
        <div className="container text-center" style={{ maxWidth: 720, zIndex: 2 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: "500", fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: "24px" }}>
            ⚡ Powered by Mantle L2 × Byreal CLMM × Gemini AI
          </div>
          
          <h1 className="display-hero-title" style={{ fontSize: "clamp(48px, 8vw, 80px)", marginBottom: "24px" }}>
            The freelance marketplace that pays itself.
          </h1>
          
          <p style={{ fontFamily: "var(--font-ui)", fontWeight: "400", fontSize: "20px", color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 40px", lineHeight: "1.6" }}>
            AI-verified work. Yield-generating escrow. Instant on-chain payment the second your work passes review.
          </p>
          
          <div className="flex gap-3" style={{ justifyContent: "center", flexWrap: "wrap", marginBottom: "64px" }}>
            <Link to="/jobs" className="btn btn-primary btn-lg" style={{ height: 48 }}>Find work</Link>
            <Link to="/post-job" className="btn btn-outline btn-lg" style={{ height: 48 }}>Post a job</Link>
          </div>

          {/* Sub-CTA Pulse Stats */}
          <div style={{ 
            fontFamily: "var(--font-mono)", 
            fontSize: "13px", 
            color: "var(--text-muted)", 
            opacity: pulseOpacity, 
            transition: "opacity 0.2s ease",
            letterSpacing: "-0.2px"
          }}>
            <span>Jobs posted: </span>
            <span style={{ color: "var(--text-primary)" }}>{pulseStats.jobsPosted}</span>
            <span>  |  USDC escrowed: </span>
            <span style={{ color: "var(--accent-lime)" }}>${pulseStats.usdcEscrowed.toLocaleString()}</span>
            <span>  |  Avg AI score: </span>
            <span style={{ color: "var(--accent-cyan)" }}>{pulseStats.avgScore}/100</span>
            <span>  |  Released: </span>
            <span style={{ color: "var(--text-primary)" }}>{pulseStats.released}</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ padding: "80px 0", background: "var(--bg-void)" }}>
        <div className="container">
          <div className="grid-3">
            {/* Card 1 */}
            <div 
              className="card" 
              style={{ borderRadius: "16px", padding: "28px 24px", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => handleCardEnter(e, "var(--accent-lime)")}
              onMouseLeave={handleCardLeave}
            >
              <div style={{ marginBottom: "20px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-lime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px" }}>Escrow that earns</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-secondary)" }}>
                Your locked USDC earns ~18.3% APY in Byreal CLMM pools while the work is in progress. Not idle. Never.
              </p>
            </div>

            {/* Card 2 */}
            <div 
              className="card" 
              style={{ borderRadius: "16px", padding: "28px 24px", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => handleCardEnter(e, "var(--accent-cyan)")}
              onMouseLeave={handleCardLeave}
            >
              <div style={{ marginBottom: "20px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px" }}>AI that judges fairly</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-secondary)" }}>
                Gemini 2.0 Flash scores every deliverable 0–100 against the job scope. Score ≥70 triggers automatic payment. No arguments. No delays.
              </p>
            </div>

            {/* Card 3 */}
            <div 
              className="card" 
              style={{ borderRadius: "16px", padding: "28px 24px", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => handleCardEnter(e, "var(--text-secondary)")}
              onMouseLeave={handleCardLeave}
            >
              <div style={{ marginBottom: "20px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px" }}>On-chain everything</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-secondary)" }}>
                Every AI decision, every payment, every dispute — permanently hashed into AgentLedger.sol on Mantle L2. Zero black boxes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Strip */}
      <section ref={statsRef} style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "20px 0" }}>
        <div className="container">
          <div className="grid-4" style={{ textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase" }}>Contracts active</div>
              <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--text-primary)", marginTop: "4px" }}>
                {animatedStats.activeContracts}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase" }}>USDC escrowed</div>
              <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--text-primary)", marginTop: "4px" }}>
                ${animatedStats.totalEscrow.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase" }}>Yield generated</div>
              <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--accent-lime)", marginTop: "4px" }}>
                ${animatedStats.totalYield.toFixed(4)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-ui)", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase" }}>AI verifications</div>
              <div className="font-mono" style={{ fontSize: "28px", fontWeight: "500", color: "var(--text-primary)", marginTop: "4px" }}>
                {animatedStats.aiVerifications}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 0", background: "var(--bg-void)", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "48px" }}>How it works</h2>
          
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
            {/* Connection Line */}
            <div style={{ 
              position: "absolute", 
              left: "10%", 
              right: "10%", 
              top: "22px", 
              height: "1px", 
              background: "rgba(0, 229, 255, 0.15)", 
              zIndex: 1 
            }} className="hide-mobile" />

            <HowStep step="1" title="Post & fund" desc="Client creates job, deposits USDC to WorkEscrow.sol" />
            <HowStep step="2" title="Yield activates" desc="Agent deploys capital to Byreal CLMM (~18.3% APY)" />
            <HowStep step="3" title="AI verifies" desc="Gemini 2.0 Flash scores deliverable 0–100 instantly" />
            <HowStep step="4" title="Paid on-chain" desc="Score ≥70 = automatic release. No waiting. No disputes." />
          </div>
        </div>
      </section>

      {/* Latest Opportunities */}
      <section style={{ padding: "40px 0 80px", background: "var(--bg-void)" }}>
        <div className="container">
          <div className="flex" style={{ justifyContent: "space-between", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Latest opportunities</h2>
            <Link to="/jobs" className="btn btn-outline btn-sm">View all →</Link>
          </div>
          <div className="grid-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : jobs.slice(0, 4).map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function HowStep({ step, title, desc }) {
  return (
    <div style={{ flex: 1, minWidth: "200px", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="font-mono" style={{ 
        width: "44px", 
        height: "44px", 
        borderRadius: "50%", 
        border: "1px solid rgba(0, 229, 255, 0.3)", 
        background: "var(--bg-void)",
        color: "var(--accent-cyan)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "600",
        fontSize: "14px",
        marginBottom: "16px"
      }}>
        {step}
      </div>
      <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>{title}</h4>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--text-secondary)", maxWidth: "180px", margin: "0 auto" }}>{desc}</p>
    </div>
  );
}
