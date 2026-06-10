import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Droplets, Info } from 'lucide-react';
import { SocketContext } from '../App';
import { useToast } from '../components/Toast';

export default function PostJob() {
  const navigate = useNavigate();
  const { BACKEND_URL, addToast } = useContext(SocketContext);
  
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFL] = useState(false);
  const [form, setForm] = useState({
    title: '',
    scope: '',
    budget: '100',
    expiresInDays: '30',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.scope) {
      addToast('Title and scope are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientAddress: user?.walletAddress,
          title: form.title,
          description: form.scope,
          budget: form.budget,
          expiresInDays: form.expiresInDays
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      addToast(`🎉 Job posted! Waiting for proposals.`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFaucet = async () => {
    setFL(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/faucet/claim`, { method: 'POST' });
      const data = await res.json();
      if (data.success) addToast('10,000 wcUSDC sent to your wallet!', 'success');
    } catch (err) {
      addToast('Faucet failed', 'error');
    } finally {
      setFL(false);
    }
  };

  const estimatedYield = ((parseFloat(form.amount || 0) * 0.183 * parseInt(form.deadlineDays || 0)) / 365).toFixed(4);
  const freelancerYield = (parseFloat(estimatedYield) * (1 - parseInt(form.clientYieldPercent || 50) / 100)).toFixed(4);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 24 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 8, color: 'var(--text-primary)' }}>
          Post a New Job
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Post your job requirements to receive proposals from freelancers. You will fund the AI Escrow later when you hire.
        </p>
      </div>

      <div className="card" style={{
        background: 'rgba(0, 115, 230, 0.05)', border: '1px solid rgba(0, 115, 230, 0.2)',
        marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12
      }}>
        <Droplets size={20} color="var(--accent-blue)" />
        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Need test USDC?</span>{' '}
          <span style={{ color: 'var(--text-muted)' }}>Claim 10,000 wcUSDC from the faucet to post jobs on testnet.</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleFaucet} disabled={faucetLoading}>
          {faucetLoading ? 'Claiming...' : '🚰 Get wcUSDC'}
        </button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 600 }}>Job Title *</label>
            <input
              className="input"
              placeholder="e.g. Design a landing page for my SaaS product"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="label" style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 600 }}>Scope / Description *</label>
            <textarea
              className="input"
              style={{ minHeight: 120 }}
              placeholder="Describe exactly what needs to be delivered..."
              value={form.scope}
              onChange={e => update('scope', e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="label" style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 600 }}>Estimated Budget (USDC)</label>
              <input
                className="input"
                type="number" min="1" step="1"
                value={form.budget}
                onChange={e => update('budget', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 600 }}>Listing Expires In (Days)</label>
              <input
                className="input"
                type="number" min="1" max="90"
                value={form.expiresInDays}
                onChange={e => update('expiresInDays', e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 14 }} disabled={loading}>
            {loading ? 'Posting job...' : `Post Job`}
          </button>
        </form>
      </div>
    </div>
  );
}
