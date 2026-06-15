import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getJob, submitProposal, getJobProposals, acceptProposal, rejectProposal, deleteJob, linkJobOnChain } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Stars, StatusBadge, Avatar, EmptyState } from "../components/common/UI";
import { shortAddress, createOnChainEscrow, assignFreelancerOnChain, ON_CHAIN_ENABLED } from "../utils/wallet";

export default function JobDetail() {
  const { id } = useParams();
  const { user, wallet } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [userProposal, setUserProposal] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);

  const isOwner = job && wallet && job.client_address.toLowerCase() === wallet.toLowerCase();

  const fetchJob = () => {
    setLoading(true);
    getJob(id)
      .then((r) => { setJob(r.job); setUserProposal(r.userProposal); })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJob(); }, [id]);

  useEffect(() => {
    if (isOwner) {
      getJobProposals(id).then((r) => setProposals(r.proposals || [])).catch(console.error);
    }
  }, [isOwner, id]);

  const handleDelete = async () => {
    if (!confirm("Cancel this job posting?")) return;
    try {
      await deleteJob(id);
      toast("Job cancelled", "success");
      navigate("/dashboard");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  if (loading) return <div className="container page text-center"><div className="spinner" style={{ margin: "60px auto" }} /></div>;
  if (!job) return <div className="container page"><EmptyState icon="❓" title="Job not found" /></div>;

  return (
    <div className="container page">
      <div className="sidebar-layout" style={{ gridTemplateColumns: "1fr 340px" }}>
        {/* Main */}
        <div>
          <div className="card mb-4">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div className="flex gap-2">
                {job.category_icon && <span style={{ fontSize: "1.2rem" }}>{job.category_icon}</span>}
                <span className="badge badge-gray">{job.category_name || "General"}</span>
                <StatusBadge status={job.status} />
              </div>
              {isOwner && job.status === "OPEN" && (
                <button onClick={handleDelete} className="btn btn-outline btn-sm" style={{ color: "var(--red)", borderColor: "var(--red-light)" }}>
                  Cancel Job
                </button>
              )}
            </div>

            <h1 className="mb-3">{job.title}</h1>

            <div className="flex gap-4 mb-4" style={{ flexWrap: "wrap" }}>
              <Detail label="Budget" value={`${job.budget} ${job.budget_token}`} />
              <Detail label="Proposals" value={job.proposal_count || 0} />
              <Detail label="Posted" value={new Date(job.created_at * 1000).toLocaleDateString()} />
              {job.expires_at && <Detail label="Deadline" value={new Date(job.expires_at * 1000).toLocaleDateString()} />}
            </div>

            <div className="separator" />

            <h4 className="mb-2">Description</h4>
            <p style={{ color: "var(--gray-700)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{job.description}</p>

            {job.scope && job.scope !== job.description && (
              <>
                <h4 className="mb-2 mt-4">Scope & Requirements</h4>
                <p style={{ color: "var(--gray-700)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{job.scope}</p>
              </>
            )}

            {job.skills_required?.length > 0 && (
              <>
                <h4 className="mb-2 mt-4">Skills Required</h4>
                <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                  {job.skills_required.map((s) => <span key={s} className="badge badge-blue">{s}</span>)}
                </div>
              </>
            )}
          </div>

          {/* Yield info box */}
          <div className="card mb-4" style={{ background: "linear-gradient(135deg, #0d1b2a, #16283d)", color: "white", border: "none" }}>
            <div className="flex gap-3">
              <div style={{ fontSize: "1.8rem" }}>⚡</div>
              <div>
                <div style={{ fontWeight: 700, color: "#00d4ff", marginBottom: 4 }}>Yield-Generating Escrow</div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>
                  Once hired, the {job.budget} {job.budget_token} budget is locked in WorkEscrow.sol and
                  deployed to a Byreal USDC-USDT CLMM pool (~18.3% APY). Yield is split 50/50 between
                  client and freelancer when the AI agent approves the deliverable.
                </p>
              </div>
            </div>
          </div>

          {/* Proposals (client view) */}
          {isOwner && (
            <div className="card">
              <h3 className="mb-4">Proposals ({proposals.length})</h3>
              {proposals.length === 0 ? (
                <EmptyState icon="📭" title="No proposals yet" subtitle="Freelancers will appear here once they submit proposals." />
              ) : (
                <div className="flex-col gap-3">
                  {proposals.map((p) => (
                    <ProposalCard key={p.id} proposal={p} jobStatus={job.status} onUpdate={() => { fetchJob(); getJobProposals(id).then((r) => setProposals(r.proposals || [])); }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex-col gap-4">
          <div className="card">
            <h4 className="mb-3">About the Client</h4>
            <div className="flex gap-3 mb-3">
              <Avatar name={job.client_name} address={job.client_address} size="md" />
              <div>
                <div className="font-semibold">{job.client_name || "Anonymous"}</div>
                <div className="text-xs text-muted">{shortAddress(job.client_address)}</div>
              </div>
            </div>
            {job.client_jobs > 0 && (
              <div className="flex gap-2 mb-2">
                <Stars score={job.client_reputation} />
                <span className="text-sm text-muted">{job.client_jobs} jobs completed</span>
              </div>
            )}
            {job.client_headline && <p className="text-sm text-muted">{job.client_headline}</p>}
          </div>

          {!isOwner && user && job.status === "OPEN" && (
            <div className="card">
              {userProposal ? (
                <div className="text-center">
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
                  <h4 className="mb-2">Proposal Submitted</h4>
                  <p className="text-sm text-muted mb-3">
                    You bid {userProposal.bid_amount} {userProposal.bid_token}
                  </p>
                  <StatusBadge status={userProposal.status} />
                </div>
              ) : showProposalForm ? (
                <ProposalForm jobId={job.id} onSubmitted={() => { setShowProposalForm(false); fetchJob(); }} />
              ) : (
                <>
                  <h4 className="mb-2">Interested in this job?</h4>
                  <p className="text-sm text-muted mb-4">Submit a proposal with your cover letter and bid.</p>
                  <button className="btn btn-primary btn-block" onClick={() => setShowProposalForm(true)}>
                    Submit a Proposal
                  </button>
                </>
              )}
            </div>
          )}

          {!user && job.status === "OPEN" && (
            <div className="card text-center">
              <p className="text-sm text-muted mb-3">Sign in with your wallet to submit a proposal.</p>
            </div>
          )}
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

function ProposalForm({ jobId, onSubmitted }) {
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coverLetter.trim() || !bidAmount) {
      toast("Please fill in cover letter and bid amount", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitProposal({
        job_id: jobId,
        cover_letter: coverLetter,
        bid_amount: parseFloat(bidAmount),
        bid_token: "USDC",
        estimated_days: estimatedDays ? parseInt(estimatedDays) : null,
      });
      toast("Proposal submitted!", "success");
      onSubmitted();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-3">
      <h4>Submit Your Proposal</h4>
      <div className="form-group">
        <label className="form-label">Cover Letter</label>
        <textarea className="textarea" placeholder="Explain why you're the right fit and how you'll approach this..." value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={5} />
      </div>
      <div className="form-group">
        <label className="form-label">Your Bid (USDC)</label>
        <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 250" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Estimated Days (optional)</label>
        <input className="input" type="number" min="1" placeholder="e.g. 7" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? <><div className="spinner spinner-sm" /> Submitting...</> : "Submit Proposal"}
      </button>
    </form>
  );
}

function ProposalCard({ proposal, jobStatus, onUpdate }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [hiring, setHiring] = useState(false);

  const handleAccept = async () => {
    if (!confirm(`Hire ${proposal.freelancer_name || "this freelancer"} for ${proposal.bid_amount} ${proposal.bid_token}? This will fund the on-chain escrow.`)) return;
    setHiring(true);
    try {
      let on_chain_job_id = null;

      if (ON_CHAIN_ENABLED) {
        toast("Approving USDC and creating on-chain escrow...", "info");
        const { onChainJobId } = await createOnChainEscrow({
          amount: proposal.bid_amount,
          title: proposal.job_title || "WorkClaw Job",
          scope: proposal.cover_letter,
          deadlineDays: 30,
          clientYieldBps: 5000,
        });
        on_chain_job_id = onChainJobId;

        if (on_chain_job_id !== null) {
          toast("Assigning freelancer on-chain...", "info");
          await assignFreelancerOnChain(on_chain_job_id, proposal.freelancer_address);
        }
      }

      await acceptProposal(proposal.id, { on_chain_job_id, yield_split_bps: 5000 });
      toast("Freelancer hired! Escrow deployed to Byreal for yield generation.", "success");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setHiring(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectProposal(proposal.id);
      toast("Proposal rejected", "info");
      onUpdate();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div className="card card-compact" style={{ border: proposal.status === "ACCEPTED" ? "1.5px solid var(--green)" : undefined }}>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="flex gap-3" style={{ flex: 1 }}>
          <Avatar name={proposal.freelancer_name} address={proposal.freelancer_address} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <span className="font-semibold">{proposal.freelancer_name || "Anonymous"}</span>
              <span className="text-xs text-muted" style={{ fontFamily: "monospace" }}>{shortAddress(proposal.freelancer_address)}</span>
              <StatusBadge status={proposal.status} />
            </div>
            {proposal.freelancer_headline && <div className="text-sm text-muted">{proposal.freelancer_headline}</div>}
            {proposal.freelancer_bio && <div className="text-xs mt-1" style={{ color: "var(--gray-500)", fontStyle: "italic" }}>{proposal.freelancer_bio}</div>}
            <div className="flex gap-2 mt-2">
              <Stars score={proposal.reputation_score} />
              <span className="text-xs text-muted">{proposal.total_jobs_completed || 0} jobs · {proposal.hourly_rate || 0} USDC/hr</span>
            </div>
          </div>
        </div>
        <div className="text-right" style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{proposal.bid_amount} {proposal.bid_token}</div>
          {proposal.estimated_days && <div className="text-xs text-muted">{proposal.estimated_days} days</div>}
        </div>
      </div>

      <p className="text-sm mt-3" style={{
        color: "var(--gray-600)", display: expanded ? "block" : "-webkit-box",
        WebkitLineClamp: expanded ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden", cursor: "pointer"
      }} onClick={() => setExpanded(!expanded)}>
        {proposal.cover_letter}
      </p>
      {!expanded && <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)} style={{ padding: "2px 6px" }}>Read more</button>}

      {proposal.status === "PENDING" && jobStatus === "OPEN" && (
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary btn-sm" onClick={handleAccept} disabled={hiring}>
            {hiring ? <><div className="spinner spinner-sm" /> Hiring...</> : "Hire Freelancer"}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleReject} disabled={hiring}>Decline</button>
        </div>
      )}
    </div>
  );
}
