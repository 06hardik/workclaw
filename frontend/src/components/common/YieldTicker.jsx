import { useState, useEffect } from "react";
import { getContractYield } from "../../utils/api";

export default function YieldTicker({ contractId, escrowAmount = 0, compact = false }) {
  const [totalYield, setTotalYield] = useState(0);
  const [apy, setApy] = useState(18.3);
  const [ageDays, setAgeDays] = useState(0);
  const [pool, setPool] = useState("Byreal USDC-USDT Pool");
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

  // Animate yield live
  useEffect(() => {
    if (!escrowAmount) return;
    const perSecond = (escrowAmount * (apy / 100)) / (365 * 24 * 3600);
    const id = setInterval(() => {
      setTotalYield((prev) => prev + perSecond);
    }, 1000);
    return () => clearInterval(id);
  }, [escrowAmount, apy]);

  const fmt = (n) => n.toFixed(6);

  if (compact) {
    return (
      <div className="yield-pulse-wrapper" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        <div className="yield-pulse-sm">
          <svg viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(163,255,87,0.08)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(163,255,87,0.4)" strokeWidth="1.5" strokeDasharray="20 62" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <span className="font-mono text-xs" style={{ color: "var(--accent-lime)", fontWeight: "500" }}>
          +{fmt(totalYield)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-cyan)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            ⚡ Byreal Yield active
          </div>
          <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
            {pool}
          </div>
        </div>
        <span className="badge" style={{ background: "rgba(163,255,87,0.1)", color: "var(--accent-lime)", fontSize: "10px" }}>
          LIVE
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px", margin: "16px 0" }}>
        {/* Revolving SVGs */}
        <div className="yield-pulse-lg" style={{ width: "64px", height: "64px" }}>
          <svg viewBox="0 0 60 60" width="60" height="60" style={{ position: "absolute" }}>
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(163,255,87,0.08)" strokeWidth="2" />
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(163,255,87,0.45)" strokeWidth="2" strokeDasharray="40 124" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(163,255,87,0.15)" strokeWidth="2" strokeDasharray="20 124" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="180 30 30" to="-180 30 30" dur="6s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        <div>
          <div className="font-mono" style={{ fontSize: "20px", fontWeight: "500", color: "var(--accent-lime)" }}>
            +{fmt(totalYield)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>USDC accrued</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", marginTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>APY</div>
          <div className="font-mono" style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>{apy.toFixed(2)}%</div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Days active</div>
          <div className="font-mono" style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>{ageDays.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
