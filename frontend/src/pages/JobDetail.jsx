import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getJob, getJobProposals, submitProposal, acceptProposal } from "../utils/api";
import { shortAddress, assignFreelancerOnChain, ON_CHAIN_ENABLED } from "../utils/wallet";
import { StatusBadge, EmptyState } from "../components/common/UI";

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function JobDetail() {
  const { id } = useParams();
  const { wallet, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Proposal Form State
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hiringId, setHiringId] = useState(null);

  useEffect(() => {
    Promise.all([getJob(id), getJobProposals(id)])
      .then(([jobRes, proposalsRes]) => {
        setJob(jobRes.job);
        setProposals(proposalsRes.proposals || []);
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!wallet) {
      toast("Connect your wallet first", "error");
      return;
    }
    if (!coverLetter || !bidAmount) {
      toast("Please complete all fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitProposal({
        job_id: Number(id),
        cover_letter: coverLetter,
        bid_amount: parseFloat(bidAmount)
      });
      toast("Proposal submitted successfully", "success");
      // Refresh proposals
      const res = await getJobProposals(id);
      setProposals(res.proposals || []);
      setCoverLetter("");
      setBidAmount("");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHire = async (proposal) => {
    setHiringId(proposal.id);
    try {
      let txHash = null;
      if (ON_CHAIN_ENABLED && job.on_chain_job_id != null) {
        toast("Assigning freelancer on-chain...", "info");
        txHash = await assignFreelancerOnChain(job.on_chain_job_id, proposal.freelancer_address);
      }
      
      const res = await acceptProposal(proposal.id, { txHash });
      toast("Freelancer hired successfully!", "success");
      navigate(`/contracts/${res.contract.id}`);
    } catch (err) {
      console.error(err);
      toast(err.message, "error");
    } finally {
      setHiringId(null);
    }
  };

  if (loading) return <div className="container page text-center"><div className="skeleton" style={{ height: "400px", width: "100%" }} /></div>;
  if (!job) return <div className="container page"><EmptyState icon="❓" title="Job not found" /></div>;

  const isClient = wallet && job.client_address.toLowerCase() === wallet.toLowerCase();
  const myProposal = wallet && proposals.find((p) => p.freelancer_address.toLowerCase() === wallet.toLowerCase());
  const hiredProposal = proposals.find((p) => p.status === "ACCEPTED");
  const isEscrowLive = job.status === "ACTIVE" || job.status === "IN_PROGRESS" || job.status === "OPEN";

  return (
    <div className="container page" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "32px" }}>
      {/* Left Column - Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: "700", fontSize: "32px", color: "var(--text-primary)", lineHeight: "1.2", marginBottom: "16px" }}>
            {job.title}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            <span className="font-mono" style={{ fontSize: "28px", fontWeight: "600", color: "var(--accent-lime)" }}>
              {job.budget}
            </span>
            <span className="font-mono" style={{ fontSize: "16px", color: "var(--text-muted)", marginRight: "16px" }}>
              {job.budget_token || "USDC"}
            </span>

            {isEscrowLive && (
              <span className="badge" style={{ background: "rgba(163,255,87,0.08)", border: "1px solid rgba(163,255,87,0.2)", color: "var(--accent-lime)" }}>
                ⚡ Yield active
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>Posted by</span>
            <span className="font-mono" style={{ color: "var(--text-muted)" }}>
              {shortAddress(job.client_address)}
            </span>
            <span>·</span>
            <span>{timeAgo(job.created_at)}</span>
            <span>·</span>
            <StatusBadge status={job.status} />
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

        <div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "15px", color: "var(--text-secondary)", lineHeight: "1.75", whiteSpace: "pre-wrap" }}>
            {job.description}
          </p>
        </div>

        {job.skills_required && job.skills_required.length > 0 && (
          <div>
            <h4 style={{ fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
              Required skills
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {job.skills_required.map((skill) => (
                <span key={skill} className="badge badge-gray">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Client's Proposals View (If Hired/Accepted etc) */}
        {isClient && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Submitted proposals</h3>
            {proposals.length === 0 ? (
              <div className="card text-center" style={{ padding: "32px 16px" }}>
                <p style={{ color: "var(--text-muted)" }}>No proposals received yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {proposals.map((p) => (
                  <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="font-mono" style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        {shortAddress(p.freelancer_address)}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="font-mono" style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-lime)" }}>
                          {p.bid_amount} USDC
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {p.cover_letter}
                    </p>
                    {job.status === "OPEN" && p.status === "PENDING" && (
                      <button 
                        onClick={() => handleHire(p)} 
                        disabled={hiringId !== null}
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: "flex-end" }}
                      >
                        {hiringId === p.id ? "Hiring..." : "Hire freelancer"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column - Proposal Panel (Sticky) */}
      <aside style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        padding: "24px",
        height: "fit-content",
        position: "sticky",
        top: "72px"
      }}>
        <div style={{ marginBottom: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
          <span className="font-mono" style={{ fontWeight: "600", color: "var(--text-primary)" }}>{proposals.length}</span> freelancers applied
        </div>

        {/* 1. If already hired */}
        {hiredProposal ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ background: "rgba(163,255,87,0.04)", border: "1px solid rgba(163,255,87,0.3)" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-lime)", marginBottom: "8px" }}>
                Freelancer hired
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Contract has been created. Funds are locked and earning yield.
              </p>
            </div>
            {/* If the current user is hired or client, show links */}
            {(isClient || (wallet && hiredProposal.freelancer_address.toLowerCase() === wallet.toLowerCase())) && (
              <Link to={`/dashboard`} className="btn btn-outline btn-block">
                Go to contract
              </Link>
            )}
          </div>
        ) : isClient ? (
          <div className="card text-center" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Review proposals in the left panel to assign a freelancer to this contract.
            </p>
          </div>
        ) : !wallet ? (
          <div className="card text-center" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Connect your wallet to submit a proposal for this job.
            </p>
          </div>
        ) : myProposal ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
              Proposal submitted
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-muted)" }}>Bid amount:</span>
              <span className="font-mono" style={{ color: "var(--accent-lime)" }}>{myProposal.bid_amount} USDC</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-muted)" }}>Status:</span>
              <StatusBadge status={myProposal.status} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitProposal} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Cover letter</label>
              <textarea
                className="textarea"
                style={{ 
                  background: "var(--bg-elevated)", 
                  fontFamily: coverLetter ? "var(--font-ui)" : "var(--font-mono)",
                  fontSize: "13px" 
                }}
                placeholder="describe your approach and relevant experience..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bid amount</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input input-mono"
                  style={{ width: "100%", paddingRight: "60px" }}
                  type="number"
                  placeholder="0.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <span className="font-mono" style={{ position: "absolute", right: "14px", top: "11px", color: "var(--text-muted)", fontSize: "13px" }}>
                  USDC
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ height: "48px" }} disabled={submitting}>
              {submitting ? "submitting..." : "submit proposal"}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
