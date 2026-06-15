import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
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

  const fetchData = useCallback(() => {
    getContract(id).then((r) => { setContract(r.contract); setLogs(r.logs || []); }).catch((e) => toast(e.message, "error")).finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live updates via WebSocket
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.contractId !== id) return;
      if (msg.type === "VERIFICATION_STARTED") setVerifying(true);
      if (["VERIFICATION_COMPLETE", "PAYMENT_RELEASED", "DISPUTE_RAISED", "DISPUTE_RESOLVED", "YIELD_DEPLOYED", "AGENT_LOG"].includes(msg.type)) {
        setVerifying(false);
        fetchData();
        if (msg.type === "VERIFICATION_COMPLETE") {
          toast(`AI scored this deliverable ${msg.score}/100 — ${msg.approved ? "Approved ✅" : "Disputed ⚠️"}`, msg.approved ? "success" : "info");
        }
        if (msg.type === "PAYMENT_RELEASED") toast("Payment released! Funds + yield sent on-chain.", "success");
        if (msg.type === "DISPUTE_RESOLVED") toast("Dispute resolved by AI agent.", "info");
        if (msg.type === "YIELD_DEPLOYED") toast(`Escrow deployed to Byreal: ${msg.amountUsdc} USDC @ ${msg.apy}% APY`, "info");
      }
    });
  }, [id, subscribe, fetchData, toast]);

  if (loading) return <div className="container page text-center"><div className="spinner" style={{ margin: "60px auto" }} /></div>;
  if (!contract) return <div className="container page"><EmptyState icon="❓" title="Contract not found" /></div>;

  const isClient = contract.client_address.toLowerCase() === wallet.toLowerCase();
  const isFreelancer = contract.freelancer_address.toLowerCase() === wallet.toLowerCase();

  return (
    <div className="container page">
      <div className="sidebar-layout" style={{ gridTemplateColumns: "1fr 360px" }}>
        <div>
          {/* Header */}
          <div className="card mb-4">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <StatusBadge status={contract.status} />
              {contract.on_chain_job_id != null && (
                <span className="badge badge-blue">On-chain Job #{contract.on_chain_job_id}</span>
              )}
            </div>
            <h1 className="mb-2">{contract.job_title}</h1>
            <p className="text-muted mb-3">{contract.job_description}</p>

            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              <Detail label="Escrow Amount" value={`${contract.escrow_amount} ${contract.escrow_token}`} />
              <Detail label="Client" value={isClient ? "You" : (contract.client_name || shortAddress(contract.client_address))} />
              <Detail label="Freelancer" value={isFreelancer ? "You" : (contract.freelancer_name || shortAddress(contract.freelancer_address))} />
              <Detail label="Yield Split" value={`${(contract.yield_split_bps || 5000) / 100}% / ${100 - (contract.yield_split_bps || 5000) / 100}%`} />
            </div>
          </div>

          {/* AI Verification result */}
          {contract.ai_score !== null && contract.ai_reasoning_parsed && (
            <div className="card mb-4">
              <h3 className="mb-3">🤖 AI Agent Verification</h3>
              <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
                <ScoreRing score={contract.ai_score} />
                <div style={{ flex: 1 }}>
                  <div className="badge mb-2" style={{
                    background: contract.ai_reasoning_parsed.approved ? "var(--green-light)" : "var(--red-light)",
                    color: contract.ai_reasoning_parsed.approved ? "var(--green-dark)" : "var(--red)"
                  }}>
                    {contract.ai_reasoning_parsed.verdict}
                  </div>
                  <p className="text-sm" style={{ color: "var(--gray-700)" }}>{contract.ai_reasoning_parsed.reasoning}</p>

                  {contract.ai_reasoning_parsed.strengths?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-green mb-1">STRENGTHS</div>
                      <ul style={{ paddingLeft: 18, fontSize: "0.85rem", color: "var(--gray-600)" }}>
                        {contract.ai_reasoning_parsed.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {contract.ai_reasoning_parsed.concerns?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-red mb-1">CONCERNS</div>
                      <ul style={{ paddingLeft: 18, fontSize: "0.85rem", color: "var(--gray-600)" }}>
                        {contract.ai_reasoning_parsed.concerns.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {verifying && (
            <div className="card mb-4 text-center" style={{ background: "var(--purple-light)" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />
              <p className="font-semibold" style={{ color: "var(--purple)" }}>🤖 AI agent is verifying the deliverable...</p>
              <p className="text-sm text-muted">Gemini is reading the job scope, proposal, and submission. This usually takes a few seconds.</p>
            </div>
          )}

          {/* Deliverable */}
          {contract.deliverable_content && (
            <div className="card mb-4">
              <h4 className="mb-2">Submitted Deliverable</h4>
              <div className="card-compact" style={{ background: "var(--gray-50)" }}>
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", color: "var(--gray-700)" }}>{contract.deliverable_content}</p>
              </div>
            </div>
          )}

          {/* Role-based action panels */}
          {isFreelancer && ["ACTIVE", "DISPUTED"].includes(contract.status) && (
            <SubmitDeliverableForm contract={contract} onSubmitted={fetchData} />
          )}

          {isClient && contract.status === "DISPUTED" && (
            <DisputeActions contract={contract} onUpdate={fetchData} />
          )}

          {contract.status === "DISPUTED" && isFreelancer && (
            <div className="card mb-4" style={{ background: "var(--red-light)" }}>
              <p className="text-sm" style={{ color: "var(--red)" }}>
                ⚠️ The AI agent scored this deliverable below the 70/100 approval threshold. The client
                can force-approve, request AI dispute resolution, or you can resubmit a revised deliverable above.
              </p>
            </div>
          )}

          {isClient && ["ACTIVE", "SUBMITTED"].includes(contract.status) && (
            <RaiseDisputeButton contract={contract} onUpdate={fetchData} />
          )}

          {(contract.status === "COMPLETED" || contract.status === "RESOLVED") && (
            <div className="card mb-4 text-center" style={{ background: "var(--green-light)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎉</div>
              <h3 className="mb-2">Contract {contract.status === "COMPLETED" ? "Completed" : "Resolved"}</h3>
              <p className="text-sm text-muted mb-3">
                Principal: {contract.escrow_amount} {contract.escrow_token} ·
                {" "}Yield to freelancer: {contract.yield_freelancer?.toFixed(6)} USDC ·
                {" "}Yield to client: {contract.yield_client?.toFixed(6)} USDC
              </p>
            </div>
          )}

          {/* Agent activity feed */}
          <ContractChat contract={contract} wallet={wallet} />
          <AgentActivityFeed logs={logs} />
        </div>

        {/* Sidebar */}
        <div className="flex-col gap-4">
          {["ACTIVE", "SUBMITTED", "DISPUTED"].includes(contract.status) && (
            <YieldTicker contractId={contract.id} escrowAmount={contract.escrow_amount} />
          )}

          <div className="card">
            <h4 className="mb-3">Contract Timeline</h4>
            <Timeline status={contract.status} />
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, #0d1b2a, #16283d)", color: "white", border: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00d4ff", marginBottom: 6 }}>ℹ️ HOW RELEASE WORKS</div>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
              When the freelancer submits work, Gemini scores it 0-100 against the job scope.
              Score ≥ 70 → instant on-chain release of principal + yield. Score &lt; 70 → the
              contract goes to <strong>DISPUTED</strong>, where the client can force-approve or
              request AI-mediated dispute resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Timeline({ status }) {
  const steps = [
    { key: "ACTIVE", label: "Escrow Funded & Yield Deployed" },
    { key: "SUBMITTED", label: "Deliverable Submitted" },
    { key: "VERIFIED", label: "AI Verification" },
    { key: "COMPLETED", label: "Funds Released" },
  ];

  const order = ["ACTIVE", "SUBMITTED", "VERIFIED", "COMPLETED", "RESOLVED"];
  let currentIdx = order.indexOf(status);
  if (status === "DISPUTED") currentIdx = 2; // sits at verification stage
  if (status === "RESOLVED") currentIdx = 3;
  if (status === "CANCELLED") currentIdx = -1;

  return (
    <div className="flex-col gap-3">
      {steps.map((step, i) => {
        const done = i < currentIdx || (status === "COMPLETED" || status === "RESOLVED");
        const active = i === currentIdx && !["COMPLETED", "RESOLVED"].includes(status);
        const isDisputeStep = i === 2 && status === "DISPUTED";
        return (
          <div key={step.key} className="flex gap-3">
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700,
              background: isDisputeStep ? "var(--red-light)" : done ? "var(--green)" : active ? "var(--green-light)" : "var(--gray-100)",
              color: isDisputeStep ? "var(--red)" : done ? "white" : active ? "var(--green-dark)" : "var(--gray-400)",
              border: active ? "2px solid var(--green)" : "none",
            }}>
              {isDisputeStep ? "!" : done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "0.85rem", color: done || active || isDisputeStep ? "var(--gray-800)" : "var(--gray-400)", fontWeight: active || isDisputeStep ? 700 : 500 }}>
              {isDisputeStep ? "Disputed — Awaiting Resolution" : step.label}
            </span>
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
    <div className="card mb-4">
      <h4 className="mb-2">{contract.status === "DISPUTED" ? "Resubmit Deliverable" : "Submit Your Deliverable"}</h4>
      <p className="text-sm text-muted mb-3">
        Describe the completed work, paste links to repos/deployments/files, or include a summary
        of what was delivered. The AI agent will compare this against the original job scope.
      </p>
      <textarea className="textarea mb-3" rows={6} placeholder="e.g. Deployed the landing page at https://... Includes hero, features section, responsive nav, and a working signup form connected to..." value={content} onChange={(e) => setContent(e.target.value)} />
      
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><div className="spinner spinner-sm" /> Submitting...</> : "Submit for AI Verification"}
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
    <div className="card mb-4" style={{ background: "#fff8e6", border: "1px solid var(--yellow)" }}>
      <h4 className="mb-2">⚖️ Dispute Resolution Options</h4>
      <p className="text-sm text-muted mb-3">
        The AI scored this deliverable below 70/100. As the client, choose how to proceed:
      </p>

      <div className="flex-col gap-2 mb-3">
        <button className="btn btn-primary btn-sm" onClick={handleForceApprove} disabled={loading}>
          ✅ Force-Approve & Release Full Payment
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => setShowResolve(!showResolve)} disabled={loading}>
          ⚖️ Request AI Dispute Resolution
        </button>
        <button className="btn btn-outline btn-sm" style={{ color: "var(--red)" }} onClick={handleCancel} disabled={loading}>
          ❌ Cancel Contract & Refund
        </button>
      </div>

      {showResolve && (
        <div className="flex-col gap-2">
          <textarea className="textarea" rows={3} placeholder="Briefly explain why the deliverable doesn't meet requirements (optional)..." value={clientClaim} onChange={(e) => setClientClaim(e.target.value)} />
          <button className="btn btn-dark btn-sm" onClick={handleResolve} disabled={loading}>
            {loading ? <><div className="spinner spinner-sm" /> Resolving...</> : "Get AI Resolution & Execute"}
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
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => setShow(true)} style={{ color: "var(--gray-500)" }}>
        🚩 Raise a dispute
      </button>
    );
  }

  return (
    <div className="card mb-4">
      <h4 className="mb-2">Raise a Dispute</h4>
      <textarea className="textarea mb-3" rows={3} placeholder="Describe the issue..." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn btn-danger btn-sm" onClick={handleRaise} disabled={loading}>
          {loading ? <div className="spinner spinner-sm" /> : "Submit Dispute"}
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
      return <img src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, display: "block" }} />;
    }
    const fileMatch = content.trim().match(/^\[Attached File: (.*?)\]\((.*?)\)$/);
    if (fileMatch) {
      return <a href={fileMatch[2]} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", display: "flex", alignItems: "center", gap: 6 }}>📎 {fileMatch[1]}</a>;
    }
    return content;
  };

  return (
    <div className="card mb-4" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--gray-50)", fontWeight: 600 }}>
        💬 Contract Chat
      </div>
      
      <div ref={chatRef} style={{ height: 350, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "#fff" }}>
        {messages.length === 0 ? (
          <div className="text-center text-muted" style={{ margin: "auto", fontSize: "0.9rem" }}>No messages yet. Say hello!</div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_address.toLowerCase() === wallet.toLowerCase();
            return (
              <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4, textAlign: isMe ? "right" : "left" }}>
                  {isMe ? "You" : m.sender_name || shortAddress(m.sender_address)}
                </div>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: !isMe ? 4 : 16,
                  background: isMe ? "var(--green)" : "var(--gray-100)",
                  color: isMe ? "white" : "inherit",
                  fontSize: "0.9rem",
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

      <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "var(--gray-50)" }}>
        <form onSubmit={handleSend} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="btn btn-ghost" style={{ padding: "0 12px", cursor: "pointer", fontSize: "1.2rem", margin: 0 }}>
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
            style={{ flex: 1, margin: 0 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
