import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWs } from "../context/WsContext";
import { useToast } from "../context/ToastContext";
import {
  getContract, submitDeliverable, forceApprove, raiseDispute, resolveDispute, cancelContract,
  getContractMessages, sendContractMessage, uploadFile
} from "../utils/api";
import { StatusBadge, ScoreRing, EmptyState } from "../components/common/UI";
import YieldTicker from "../components/common/YieldTicker";
import AgentActivityFeed from "../components/agent/AgentActivityFeed";
import { shortAddress, submitDeliverableOnChain, ON_CHAIN_ENABLED } from "../utils/wallet";

export default function ContractDetail() {
  const { id } = useParams();
  const { wallet } = useAuth();
  const { subscribe } = useWs();
  const { toast } = useToast();

  const [contract, setContract] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Live yield simulation
  const [totalYield, setTotalYield] = useState(0);
  const [apy, setApy] = useState(18.3);

  // scanning steps
  const [scanningStep, setScanningStep] = useState(0);

  const fetchData = useCallback(() => {
    getContract(id)
      .then((r) => { 
        setContract(r.contract); 
        setLogs(r.logs || []); 
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live updates via WebSocket
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.contractId !== id) return;
      if (msg.type === "VERIFICATION_STARTED") {
        setVerifying(true);
        setScanningStep(1);
      }
      if (["VERIFICATION_COMPLETE", "PAYMENT_RELEASED", "DISPUTE_RAISED", "DISPUTE_RESOLVED", "YIELD_DEPLOYED", "AGENT_LOG"].includes(msg.type)) {
        // Trigger scanning transitions if in verification
        if (msg.type === "VERIFICATION_COMPLETE") {
          setScanningStep(3);
          setTimeout(() => {
            setVerifying(false);
            setScanningStep(0);
            fetchData();
            toast(`AI scored this deliverable ${msg.score}/100 — ${msg.approved ? "Approved ✅" : "Disputed ⚠️"}`, msg.approved ? "success" : "info");
          }, 1500);
        } else {
          setVerifying(false);
          fetchData();
          if (msg.type === "PAYMENT_RELEASED") toast("Payment released! Funds + yield sent on-chain.", "success");
          if (msg.type === "DISPUTE_RESOLVED") toast("Dispute resolved by AI agent.", "info");
          if (msg.type === "YIELD_DEPLOYED") toast(`Escrow deployed to Byreal: ${msg.amountUsdc} USDC @ ${msg.apy}% APY`, "info");
        }
      }
    });
  }, [id, subscribe, fetchData, toast]);

  // Simulated yield counter
  useEffect(() => {
    if (!contract || !["ACTIVE", "SUBMITTED", "DISPUTED"].includes(contract.status)) return;
    const escrowAmount = contract.escrow_amount || 0;
    const perSecond = (escrowAmount * (apy / 100)) / (365 * 24 * 3600);
    const interval = setInterval(() => {
      setTotalYield((prev) => prev + perSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [contract, apy]);

  // Scanning animation timer fallback (if WebSocket verification_started occurs without WS verification_complete instantly)
  useEffect(() => {
    if (!verifying) return;
    const timers = [
      setTimeout(() => setScanningStep(1), 500),
      setTimeout(() => setScanningStep(2), 1500),
      setTimeout(() => setScanningStep(3), 2500)
    ];
    return () => timers.forEach(clearTimeout);
  }, [verifying]);

  if (loading) return <div className="container page text-center"><div className="skeleton" style={{ height: "400px", width: "100%" }} /></div>;
  if (!contract) return <div className="container page"><EmptyState icon="❓" title="Contract not found" /></div>;

  const isClient = contract.client_address.toLowerCase() === wallet.toLowerCase();
  const isFreelancer = contract.freelancer_address.toLowerCase() === wallet.toLowerCase();

  return (
    <div className="container page">
      <div className="sidebar-layout" style={{ gridTemplateColumns: "3.5fr 5fr 3.5fr", gap: "24px" }}>
        
        {/* Left Panel (30%) — Contract Metadata + Yield Engine */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
              CONTRACT
            </div>
            <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              ID: {contract.id} {contract.on_chain_job_id != null && `· onchain: #${contract.on_chain_job_id}`}
            </div>
          </div>

          <div style={{ display: "flex", width: "100%" }}>
            <StatusBadge status={contract.status} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

          {/* Money section */}
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Principal locked</div>
            <div className="font-mono" style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)" }}>
              {contract.escrow_amount} {contract.escrow_token}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Current APY</div>
            <div className="font-mono" style={{ fontSize: "16px", fontWeight: "600", color: "var(--accent-lime)" }}>
              {apy.toFixed(2)}%
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Powered by Byreal CLMM</div>
          </div>

          {/* Signature Yield Ticker centerpiece */}
          {["ACTIVE", "SUBMITTED", "DISPUTED"].includes(contract.status) && (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              padding: "20px 0",
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)"
            }}>
              <span style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "1.5px", marginBottom: "16px", textTransform: "uppercase" }}>
                Yield accrued
              </span>

              {/* Large yield pulse ring — 120px */}
              <div className="yield-pulse-lg">
                <svg viewBox="0 0 120 120" width="120" height="120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(163,255,87,0.08)" strokeWidth="2"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent-lime)" strokeWidth="2"
                    strokeDasharray="80 246" strokeLinecap="round" style={{ opacity: 0.65 }}>
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 60 60" to="360 60 60" dur="4s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"
                    strokeDasharray="40 246" strokeLinecap="round" style={{ opacity: 0.35 }}>
                    <animateTransform attributeName="transform" type="rotate"
                      from="180 60 60" to="-180 60 60" dur="6s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                <div className="yield-center-text">
                  <span className="yield-amount">+{totalYield.toFixed(6)}</span>
                </div>
              </div>

              <span style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "16px" }}>earning live</span>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600", textTransform: "uppercase", marginBottom: "16px" }}>Contract timeline</h4>
            <Timeline status={contract.status} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

          {/* Wallets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Client</div>
              <div className="font-mono" style={{ color: "var(--text-primary)" }}>{contract.client_address}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Freelancer</div>
              <div className="font-mono" style={{ color: "var(--text-primary)" }}>{contract.freelancer_address}</div>
            </div>
          </div>
        </div>

        {/* Center Panel (40%) — Deliverable & AI Verdict */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Main Contract details */}
          <div className="card">
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>{contract.job_title}</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{contract.job_description}</p>
          </div>

          {/* State: Awaiting submission (For Freelancer) */}
          {isFreelancer && ["ACTIVE", "DISPUTED"].includes(contract.status) && !verifying && (
            <SubmitDeliverableForm contract={contract} onSubmitted={fetchData} />
          )}

          {/* State: AI scoring in progress */}
          {verifying && (
            <div className="card text-center" style={{ padding: "40px 32px", border: "1px solid rgba(0, 229, 255, 0.25)", background: "rgba(0, 229, 255, 0.02)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid rgba(0,229,255,0.1)", borderTopColor: "var(--accent-cyan)", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: "15px", color: "var(--text-primary)", marginBottom: "16px" }}>AI verification in progress</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                <div style={{ fontSize: "13px", color: scanningStep >= 1 ? "var(--text-primary)" : "var(--text-muted)", transition: "color 0.3s" }}>
                  {scanningStep >= 1 ? "✓ " : "· "}Reading deliverable...
                </div>
                <div style={{ fontSize: "13px", color: scanningStep >= 2 ? "var(--text-primary)" : "var(--text-muted)", transition: "color 0.3s" }}>
                  {scanningStep >= 2 ? "✓ " : "· "}Comparing against job scope...
                </div>
                <div style={{ fontSize: "13px", color: scanningStep >= 3 ? "var(--text-primary)" : "var(--text-muted)", transition: "color 0.3s" }}>
                  {scanningStep >= 3 ? "✓ " : "· "}Calculating score...
                </div>
              </div>
            </div>
          )}

          {/* State: Score Revealed (PASS / FAIL) */}
          {contract.ai_score !== null && contract.ai_reasoning_parsed && !verifying && (
            <div 
              className="card" 
              style={{ 
                padding: "32px", 
                textAlign: "center",
                background: contract.ai_reasoning_parsed.approved ? "rgba(163, 255, 87, 0.03)" : "rgba(255, 71, 87, 0.03)",
                border: `1px solid ${contract.ai_reasoning_parsed.approved ? "rgba(163, 255, 87, 0.25)" : "rgba(255, 71, 87, 0.25)"}`
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                Gemini 2.0 Flash score
              </div>
              
              {/* THE NUMBER (Hero moment) */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", margin: "16px 0" }}>
                <span className="font-mono" style={{ fontSize: "96px", fontWeight: "900", color: contract.ai_reasoning_parsed.approved ? "var(--accent-lime)" : "var(--accent-red)", lineHeight: 1 }}>
                  {contract.ai_score}
                </span>
                <span className="font-mono" style={{ fontSize: "32px", color: "var(--text-muted)" }}>/100</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "18px", color: contract.ai_reasoning_parsed.approved ? "var(--accent-lime)" : "var(--accent-red)" }}>
                  {contract.ai_reasoning_parsed.approved ? "✓" : "⚠️"}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: contract.ai_reasoning_parsed.approved ? "var(--accent-lime)" : "var(--accent-red)" }}>
                  {contract.ai_reasoning_parsed.approved ? "Threshold met — releasing automatically" : "Score below threshold — entering dispute"}
                </span>
              </div>

              {/* Progress bar animation for release */}
              {contract.ai_reasoning_parsed.approved && (
                <div style={{ width: "100%", height: "4px", background: "rgba(163, 255, 87, 0.1)", borderRadius: "2px", overflow: "hidden", marginBottom: "20px" }}>
                  <div style={{ 
                    height: "100%", 
                    width: "100%", 
                    background: "var(--accent-lime)", 
                    animation: "shimmer 1.5s ease-out" 
                  }} />
                </div>
              )}

              <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "left", lineHeight: "1.6" }}>
                {contract.ai_reasoning_parsed.reasoning}
              </p>
            </div>
          )}

          {/* Submitted deliverable preview */}
          {contract.deliverable_content && (
            <div className="card">
              <h4 style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "600", textTransform: "uppercase", marginBottom: "12px" }}>Submitted deliverable</h4>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", whiteSpace: "pre-wrap", fontSize: "13px", color: "var(--text-secondary)" }}>
                {contract.deliverable_content}
              </div>
            </div>
          )}

          {/* Dispute Resolving Proposal split */}
          {contract.status === "DISPUTED" && contract.ai_reasoning_parsed && (
            <div className="card" style={{ background: "rgba(255, 184, 48, 0.03)", border: "1px solid rgba(255, 184, 48, 0.2)" }}>
              <div style={{ fontSize: "11px", color: "var(--accent-amber)", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
                AI mediation proposed split
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Proposed split: <strong style={{ color: "var(--accent-amber)" }} className="font-mono">70%</strong> to client / <strong style={{ color: "var(--text-primary)" }} className="font-mono">30%</strong> to freelancer.
              </p>
            </div>
          )}

          {/* Client Dispute Actions panel */}
          {isClient && contract.status === "DISPUTED" && (
            <DisputeActions contract={contract} onUpdate={fetchData} />
          )}

          {/* Client Raise Dispute manually if needed */}
          {isClient && ["ACTIVE", "SUBMITTED"].includes(contract.status) && (
            <RaiseDisputeButton contract={contract} onUpdate={fetchData} />
          )}

          {/* Contract chat */}
          <ContractChat contract={contract} wallet={wallet} />
        </div>

        {/* Right Panel (30%) — Agent Activity Feed */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px",
          maxHeight: "680px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Agent activity</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulsing-dot" />
              <span className="font-mono text-xs" style={{ color: "var(--accent-lime)" }}>LIVE</span>
            </div>
          </div>

          <AgentActivityFeed logs={logs} title="" />
        </div>
      </div>
    </div>
  );
}

function Timeline({ status }) {
  const steps = [
    { key: "CREATED", label: "Job created" },
    { key: "ACTIVE", label: "Escrow funded" },
    { key: "YIELD", label: "Yield started" },
    { key: "SUBMITTED", label: "Deliverable submitted" },
    { key: "COMPLETED", label: "Released" },
  ];

  const order = ["CREATED", "ACTIVE", "YIELD", "SUBMITTED", "COMPLETED"];
  let currentIdx = order.indexOf(status);
  if (status === "IN_PROGRESS" || status === "ACTIVE") currentIdx = 2; // yield step
  if (status === "SUBMITTED") currentIdx = 3;
  if (status === "COMPLETED" || status === "RESOLVED") currentIdx = 4;
  if (status === "DISPUTED") currentIdx = 3; // disputes sit on verification stage

  return (
    <div className="timeline">
      {steps.map((step, i) => {
        const done = i <= currentIdx || (status === "COMPLETED" || status === "RESOLVED");
        const active = i === currentIdx && !["COMPLETED", "RESOLVED"].includes(status);
        
        return (
          <div key={step.key} className="timeline-item">
            <div className={`timeline-dot ${done ? "completed" : ""} ${active ? "active" : ""}`} />
            <div className="timeline-content">
              <span style={{ 
                fontSize: "13px", 
                color: active ? "var(--text-primary)" : done ? "var(--text-secondary)" : "var(--text-muted)", 
                fontWeight: active ? "600" : "400" 
              }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubmitDeliverableForm({ contract, onSubmitted }) {
  const { toast } = useToast();
  const [content, setContent] = useState(contract.deliverable_content || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast("Please describe your deliverable", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (ON_CHAIN_ENABLED && contract.on_chain_job_id != null) {
        await submitDeliverableOnChain(contract.on_chain_job_id, content);
      }
      await submitDeliverable(contract.id, { deliverable_content: content });
      toast("Deliverable submitted! AI agent is now verifying...", "success");
      onSubmitted();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const data = await uploadFile(file);
      setContent((prev) => prev + (prev ? "\n\n" : "") + `[Attached File: ${data.originalName}](${data.url})`);
      toast("File uploaded and linked!", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="card">
      <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
        {contract.status === "DISPUTED" ? "Resubmit deliverable" : "Submit your deliverable"}
      </h4>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
        Paste a link or describe what you built. Gemini 2.0 Flash will score it 0–100 against the job scope.
      </p>
      
      <textarea 
        className="textarea" 
        style={{ minHeight: "120px", marginBottom: "16px" }}
        placeholder="e.g. Deployed the landing page at https://... Includes hero and responsive nav..." 
        value={content} 
        onChange={(e) => setContent(e.target.value)} 
      />
      
      <div style={{ display: "flex", gap: "10px" }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit for AI review"}
        </button>
        <label className="btn btn-outline" style={{ cursor: "pointer" }}>
          <input type="file" style={{ display: "none" }} onChange={handleFileUpload} disabled={submitting} />
          📎 Attach File
        </label>
      </div>
    </div>
  );
}

function DisputeActions({ contract, onUpdate }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [clientClaim, setClientClaim] = useState("");

  const handleForceApprove = async () => {
    if (!confirm("Override the AI's decision and release full payment + yield to the freelancer?")) return;
    setLoading(true);
    try {
      await forceApprove(contract.id);
      toast("Force-approved. Releasing payment...", "success");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      const { resolution } = await resolveDispute(contract.id, { client_claim: clientClaim });
      toast(`AI proposed: ${resolution.clientShareBps / 100}% to client, ${resolution.freelancerShareBps / 100}% to freelancer. Executing...`, "info");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this contract? This refunds the client's principal.")) return;
    setLoading(true);
    try {
      await cancelContract(contract.id);
      toast("Contract cancelled", "info");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ border: "1px solid var(--accent-amber)", background: "rgba(255, 184, 48, 0.02)" }}>
      <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-amber)", marginBottom: "8px" }}>
        ⚖️ Dispute resolution options
      </h4>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
        Choose how to proceed:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        <button className="btn btn-dark btn-block btn-sm" onClick={handleForceApprove} disabled={loading}>
          Force-approve & release
        </button>
        <button className="btn btn-outline btn-block btn-sm" onClick={() => setShowResolve(!showResolve)} disabled={loading}>
          Request AI dispute resolution
        </button>
        <button className="btn btn-danger btn-block btn-sm" onClick={handleCancel} disabled={loading}>
          Cancel contract & refund
        </button>
      </div>

      {showResolve && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <textarea 
            className="textarea" 
            rows={3} 
            placeholder="Briefly explain why the deliverable doesn't meet requirements..." 
            value={clientClaim} 
            onChange={(e) => setClientClaim(e.target.value)} 
          />
          <button className="btn btn-primary btn-block btn-sm" onClick={handleResolve} disabled={loading}>
            {loading ? "Resolving..." : "Get AI resolution & execute"}
          </button>
        </div>
      )}
    </div>
  );
}

function RaiseDisputeButton({ contract, onUpdate }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRaise = async () => {
    setLoading(true);
    try {
      await raiseDispute(contract.id, reason);
      toast("Dispute raised", "info");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <button className="btn btn-ghost btn-sm btn-block" onClick={() => setShow(true)}>
        🚩 Raise a dispute
      </button>
    );
  }

  return (
    <div className="card">
      <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-red)", marginBottom: "8px" }}>Raise a dispute</h4>
      <textarea className="textarea" style={{ minHeight: "80px", marginBottom: "12px" }} placeholder="Describe the issue..." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div style={{ display: "flex", gap: "10px" }}>
        <button className="btn btn-danger btn-sm" onClick={handleRaise} disabled={loading}>
          {loading ? "Submitting..." : "Submit dispute"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShow(false)}>Cancel</button>
      </div>
    </div>
  );
}

function ContractChat({ contract, wallet }) {
  const { toast } = useToast();
  const { subscribe } = useWs();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    getContractMessages(contract.id)
      .then(r => setMessages(r.messages || []))
      .catch(() => {});
  }, [contract.id]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "CHAT_MESSAGE" && msg.contractId === contract.id) {
        setMessages(prev => [...prev, msg.message]);
      }
    });
  }, [contract.id, subscribe]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      await sendContractMessage(contract.id, input);
      setInput("");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await uploadFile(file);
      const isImage = file.type.startsWith("image/");
      const msgContent = isImage ? `![${data.originalName}](${data.url})` : `[Attached File: ${data.originalName}](${data.url})`;
      await sendContractMessage(contract.id, msgContent);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const renderMessageContent = (content) => {
    const imgMatch = content.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return <img src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block" }} />;
    }
    const fileMatch = content.trim().match(/^\[Attached File: (.*?)\]\((.*?)\)$/);
    if (fileMatch) {
      return <a href={fileMatch[2]} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)", textDecoration: "underline", display: "flex", alignItems: "center", gap: 6 }}>📎 {fileMatch[1]}</a>;
    }
    return content;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-surface)" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
        💬 Contract chat
      </div>
      
      <div ref={chatRef} style={{ height: 260, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "var(--bg-elevated)" }}>
        {messages.length === 0 ? (
          <div className="text-center" style={{ margin: "auto", fontSize: "12px", color: "var(--text-muted)" }}>No messages yet. Say hello!</div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_address.toLowerCase() === wallet.toLowerCase();
            return (
              <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: 2, textAlign: isMe ? "right" : "left" }}>
                  {isMe ? "You" : shortAddress(m.sender_address)}
                </div>
                <div style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  borderBottomRightRadius: isMe ? 2 : 10,
                  borderBottomLeftRadius: !isMe ? 2 : 10,
                  background: isMe ? "rgba(0, 229, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${isMe ? "rgba(0, 229, 255, 0.25)" : "var(--border-subtle)"}`,
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}>
                  {renderMessageContent(m.content)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="btn btn-ghost btn-sm" style={{ padding: "0 10px", cursor: "pointer", fontSize: "15px", margin: 0, minHeight: "36px" }}>
            <input type="file" style={{ display: "none" }} onChange={handleFileUpload} disabled={loading} />
            📎
          </label>
          <input 
            type="text" 
            className="input" 
            placeholder="Type a message..." 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading}
            style={{ flex: 1, margin: 0, height: "36px" }}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ minHeight: "36px" }} disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
