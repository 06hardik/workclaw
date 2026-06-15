import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, getCategories } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function PostJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budget, setBudget] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [expiresDays, setExpiresDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories || [])).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast("Please connect your wallet to post a job", "error");
      return;
    }
    if (!title.trim() || !description.trim() || !budget) {
      toast("Please fill in the required fields", "error");
      return;
    }
    if (parseFloat(budget) <= 0) {
      toast("Budget must be greater than 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      const skills_required = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
      const { job } = await createJob({
        title, description, scope: scope || description,
        category_id: categoryId || null,
        budget: parseFloat(budget),
        budget_token: "USDC",
        skills_required,
        expires_days: parseInt(expiresDays) || 30,
      });
      toast("Job posted successfully!", "success");
      navigate(`/jobs/${job.id}`);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-sm page">
      <h1 className="mb-2">Post a Job</h1>
      <p className="text-muted mb-6">
        Describe what you need done. Once you hire a freelancer, your budget will be locked in
        USDC escrow and start earning ~18.3% APY via Byreal until the work is verified.
      </p>

      {!user && (
        <div className="card mb-4" style={{ borderColor: "var(--yellow)", background: "#fff8e6" }}>
          <p className="text-sm">⚠️ You'll need to connect your wallet before publishing this job.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card flex-col gap-4">
        <div className="form-group">
          <label className="form-label">Job Title *</label>
          <input className="input" placeholder="e.g. Build a responsive landing page with React" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="textarea" placeholder="Describe the project, deliverables, and any context the freelancer needs..." value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
          <span className="form-hint">This is also what the AI agent will use to verify the final deliverable.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Scope & Acceptance Criteria</label>
          <textarea className="textarea" placeholder="Specific requirements that define 'done' (e.g. responsive on mobile, includes signup form, deployed to Vercel)..." value={scope} onChange={(e) => setScope(e.target.value)} rows={4} />
          <span className="form-hint">Optional — defaults to your description. Being specific here improves AI verification accuracy.</span>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Budget (USDC) *</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 500" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Proposal Deadline (days)</label>
            <input className="input" type="number" min="1" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Skills Required</label>
          <input className="input" placeholder="React, Solidity, Figma (comma-separated)" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
        </div>

        <div className="card card-compact" style={{ background: "var(--green-light)", border: "1px solid var(--green)" }}>
          <div className="flex gap-2">
            <span style={{ fontSize: "1.2rem" }}>⚡</span>
            <p className="text-sm" style={{ color: "var(--green-dark)" }}>
              When you hire a freelancer, you'll be prompted to approve and deposit {budget || "—"} USDC
              into the WorkEscrow smart contract. 50% of any yield earned goes back to you on completion.
            </p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <><div className="spinner spinner-sm" /> Posting...</> : "Post Job"}
        </button>
      </form>
    </div>
  );
}
