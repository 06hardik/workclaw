import { useState, useEffect, useRef } from "react";
import { getContractYield } from "../../utils/api";

export default function YieldTicker({ contractId, escrowAmount = 0, compact = false }) {
  const [totalYield, setTotalYield] = useState(0);
  const [apy, setApy] = useState(18.3);
  const [ageDays, setAgeDays] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [pool, setPool] = useState("ByRealUSDC_USDT_Demo_Pool");
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    if (!contractId) return;
    let mounted = true;
    const fetchYield = async () => {
      try {
        const data = await getContractYield(contractId);
        if (!mounted) return;
        setTotalYield(data.totalYield || 0);
        setApy(data.apy || 18.3);
        setAgeDays(data.ageDays || 0);
        if (data.pool) setPool(data.pool);
        if (data.demoMode !== undefined) setDemoMode(data.demoMode);
      } catch {}
    };
    fetchYield();
    const id = setInterval(fetchYield, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, [contractId]);

  // Animate micro-increment every second for visual "live" effect
  useEffect(() => {
    if (!escrowAmount) return;
    const perSecond = (escrowAmount * (apy / 100)) / (365 * 24 * 3600);
    const id = setInterval(() => {
      setTotalYield((prev) => prev + perSecond);
      setTicking(true);
      setTimeout(() => setTicking(false), 300);
    }, 1000);
    return () => clearInterval(id);
  }, [escrowAmount, apy]);

  const fmt = (n) => n.toFixed(6);

  if (compact) {
    return (
      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem", color: "var(--green)", transition: "color .3s" }}>
        +{fmt(totalYield)} USDC
      </span>
    );
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #1a3a5c 100%)", borderRadius: "var(--radius-lg)", padding: "20px 24px", border: "1px solid rgba(0,212,255,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#00d4ff", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            ⚡ Byreal Yield Earning
          </div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.5)", marginTop: 2 }}>
            {pool} · {apy.toFixed(1)}% APY
          </div>
        </div>
        <div style={{ background: "rgba(29,191,115,.15)", border: "1px solid rgba(29,191,115,.3)", borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, color: "#1dbf73" }}>
          LIVE
        </div>
      </div>

      <div style={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: 800, color: ticking ? "#1dbf73" : "white", transition: "color .3s", letterSpacing: "-0.5px" }}>
        +{fmt(totalYield)} USDC
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
        <Stat label="APY" value={`${apy.toFixed(1)}%`} />
        <Stat label="Days active" value={ageDays.toFixed(2)} />
        <Stat label="Yield value" value={`$${totalYield.toFixed(4)}`} />
      </div>

      <div style={{ marginTop: 12, height: 3, background: "rgba(255,255,255,.1)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(100, (ageDays / 30) * 100)}%`, background: "linear-gradient(90deg, #1dbf73, #00d4ff)", borderRadius: 2, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: "0.7rem", color: demoMode ? "rgba(255,255,255,.4)" : "#1dbf73", marginTop: 6, textAlign: "right", fontWeight: demoMode ? 400 : 700 }}>
        {demoMode ? "Simulated Bridge · Demo Mode" : "Real Yield · Solana CLMM"}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.45)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{value}</div>
    </div>
  );
}
