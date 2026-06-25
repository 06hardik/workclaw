import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createJob, getCategories } from "../utils/api";
import { createOnChainEscrow, ON_CHAIN_ENABLED } from "../utils/wallet";

export default function PostJob() {
  const { wallet } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  
  // Tag input state
  const [tagInput, setTagInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories || [])).catch(console.error);
  }, []);

  const handleKeyDownTags = (e) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!skills.includes(tagInput.trim())) {
        setSkills([...skills, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setSkills(skills.filter((t) => t !== tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) {
      toast("Connect your wallet first", "error");
      return;
    }
    if (!title || !category || !budget || !description) {
      toast("Please fill in all fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      let onChainJobId = null;
      let txHash = null;

      if (ON_CHAIN_ENABLED) {
        toast("Initiating on-chain escrow deposit...", "info");
        const escrowRes = await createOnChainEscrow({
          amount: parseFloat(budget),
          title: title,
          scope: description
        });
        onChainJobId = escrowRes.onChainJobId;
        txHash = escrowRes.txHash;
        toast("On-chain escrow funded successfully!", "success");
      }

      await createJob({
        title,
        category_id: Number(category),
        budget: parseFloat(budget),
        description,
        skills_required: skills,
        on_chain_job_id: onChainJobId,
        on_chain_tx_hash: txHash
      });

      toast("Job posted successfully", "success");
      navigate("/jobs");
    } catch (err) {
      console.error(err);
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-sm page">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: "700", fontSize: "28px", color: "var(--text-primary)" }}>
          Post a job
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Set the scope. Fund the escrow. The AI does the rest.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="form-group">
          <label className="form-label">Job title</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Build Solidity staking contract"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Budget (USDC)</label>
          <div style={{ position: "relative" }}>
            <input
              className="input input-mono"
              style={{ width: "100%", paddingRight: "60px" }}
              type="number"
              placeholder="0.00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <span className="font-mono" style={{ position: "absolute", right: "14px", top: "11px", color: "var(--text-muted)", fontSize: "13px" }}>
              USDC
            </span>
          </div>
          {budget && (
            <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              ≈ {parseFloat(budget).toLocaleString()} USDC locked in escrow
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Job description</label>
          <textarea
            className="textarea"
            style={{ minHeight: "160px" }}
            placeholder="Describe the job deliverables, requirements, and scope in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Required skills</label>
          <input
            className="input"
            type="text"
            placeholder="Type skill and press enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDownTags}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {skills.map((skill) => (
              <span key={skill} className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                {skill}
                <button type="button" onClick={() => handleRemoveTag(skill)} style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: "11px", display: "inline-flex", padding: "0 2px" }}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Escrow Notice Box */}
        <div style={{
          background: "rgba(163, 255, 87, 0.04)",
          border: "1px solid rgba(163, 255, 87, 0.2)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginTop: "8px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start"
        }}>
          <span style={{ fontSize: "18px", color: "var(--accent-lime)", lineHeight: 1 }}>⚡</span>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Your budget locks into WorkEscrow.sol on Mantle and immediately earns ~18.3% APY via Byreal CLMM while the work is in progress. Every second it's in escrow, it's earning.
          </p>
        </div>

        <button type="submit" className="btn btn-primary btn-block" style={{ height: "48px", marginTop: "12px" }} disabled={submitting}>
          {submitting ? "Processing deposit..." : "Fund escrow & post job"}
        </button>
      </form>
    </div>
  );
}
