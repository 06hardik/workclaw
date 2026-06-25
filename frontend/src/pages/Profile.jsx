import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateProfile, getUserStats } from "../utils/api";
import { Avatar, Stars, EmptyState } from "../components/common/UI";
import { shortAddress } from "../utils/wallet";

export default function Profile() {
  const { user, wallet, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [role, setRole] = useState("FREELANCER");
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setHeadline(user.headline || "");
      setBio(user.bio || "");
      setSkills((user.skills || []).join(", "));
      setHourlyRate(user.hourly_rate || "");
      setRole(user.role || "FREELANCER");
    }
  }, [user]);

  useEffect(() => {
    if (wallet) getUserStats(wallet).then(setStats).catch(console.error);
  }, [wallet]);

  if (!wallet) {
    return <div className="container page"><EmptyState icon="🔐" title="Connect your wallet" subtitle="Sign in to view and edit your profile." /></div>;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name, headline, bio,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        hourly_rate: parseFloat(hourlyRate) || 0,
        role,
      });
      await refreshUser();
      toast("Profile updated", "success");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-sm page">
      <h1 className="mb-6" style={{ fontSize: "28px", color: "var(--text-primary)" }}>My profile</h1>

      <div className="card mb-4">
        <div className="flex gap-4">
          <Avatar name={name} address={wallet} size="xl" />
          <div>
            <h3 style={{ color: "var(--text-primary)" }}>{name || "Anonymous"}</h3>
            <p className="text-muted text-sm font-mono">{shortAddress(wallet)}</p>
            <div className="flex gap-2 mt-2">
              <Stars score={user?.reputation_score || 0} />
              <span className="text-sm text-muted font-mono">({user?.total_jobs_completed || 0} jobs completed)</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid-4 mt-4">
            <MiniStat label="Earned" value={`${stats.totalEarned.toFixed(2)} USDC`} isMoney />
            <MiniStat label="Completed" value={stats.completedJobs} />
            <MiniStat label="Active" value={stats.activeContracts} />
            <MiniStat label="Posted" value={stats.postedJobs} />
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="card flex-col gap-4">
        <h4 style={{ color: "var(--text-primary)" }}>Edit profile</h4>

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={50} />
        </div>

        <div className="form-group">
          <label className="form-label">I primarily want to...</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="FREELANCER">Find work (Freelancer)</option>
            <option value="CLIENT">Hire talent (Client)</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Headline</label>
          <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Full-stack Web3 Developer | Solidity & React" maxLength={100} />
        </div>

        <div className="form-group">
          <label className="form-label">Bio</label>
          <textarea className="textarea" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell clients about your experience..." />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Skills</label>
            <input className="input" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Solidity, Figma" />
          </div>
          <div className="form-group">
            <label className="form-label">Hourly Rate (USDC)</label>
            <input className="input input-mono" type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="50" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}

function MiniStat({ label, value, isMoney }) {
  return (
    <div className="text-center">
      <div className="font-bold font-mono" style={{ fontSize: "1.05rem", color: isMoney ? "var(--accent-lime)" : "var(--text-primary)" }}>{value}</div>
      <div className="text-xs text-muted" style={{ textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
    </div>
  );
}
