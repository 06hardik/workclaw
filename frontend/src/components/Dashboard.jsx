import { useState, useEffect, useContext, useCallback } from 'react'
import { TrendingUp, DollarSign, CheckCircle, Clock, Shield, Bot, ExternalLink, Send } from 'lucide-react'
import { SocketContext } from '../App'
import { useAuth } from '../contexts/AuthContext'
import AgentFeed from './AgentFeed'

// ── Live yield counter ─────────────────────────────────────────────────────────
function YieldCounter({ baseAmount, apr = 18.3 }) {
  const [current, setCurrent] = useState(parseFloat(baseAmount || 0))
  
  useEffect(() => {
    let start = Date.now();
    let base = parseFloat(baseAmount || 0);
    setCurrent(base);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24 * 365) // years
      const yield_  = base * (apr / 100) * elapsed
      setCurrent(base + yield_)
    }, 100)
    return () => clearInterval(interval)
  }, [baseAmount, apr])

  return (
    <span className="yield-ticker" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-green)', fontWeight: 600 }}>
      +${current.toFixed(6)}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent-teal)' }) {
  return (
    <div style={{ 
      flex: 1, 
      minWidth: 180, 
      background: '#fff', 
      border: '1px solid #e4e5e7', 
      borderRadius: 16, 
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 13, color: '#62646a', fontWeight: 600, letterSpacing: '0.3px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', color: '#141414' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: '#62646a', marginTop: 6, fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  )
}

function ContractCard({ contract, user, onDeliver, loadingId }) {
  const isFreelancer = contract.freelancerAddress.toLowerCase() === user?.walletAddress?.toLowerCase();
  const job = contract.JobPosting || {};
  const [deliverable, setDeliverable] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e4e5e7', 
      borderRadius: 16, 
      padding: 24, 
      marginBottom: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    }}>
      <div className="flex justify-between items-start">
        <div>
          <div style={{ fontSize: 12, color: 'var(--accent-teal)', fontWeight: 700, marginBottom: 8, letterSpacing: '0.5px' }}>
            ACTIVE CONTRACT
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#141414', marginBottom: 8 }}>{job.title}</h3>
          <div style={{ fontSize: 14, color: '#62646a', fontWeight: 500 }}>
            Budget: ${job.budget} USDC &nbsp;•&nbsp; Yield Split: {contract.yieldSplitBps / 100}% Client
          </div>
        </div>
        <div style={{ textAlign: 'right', background: '#fcfcfc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e4e5e7' }}>
          <div style={{ fontSize: 12, color: '#62646a', fontWeight: 600, marginBottom: 4 }}>LIVE YIELD</div>
          <YieldCounter baseAmount={parseFloat(job.budget)} />
        </div>
      </div>

      {contract.status === 'ACTIVE' && isFreelancer && (
        <div style={{ marginTop: 16 }}>
          {!showSubmit ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowSubmit(true)}>
              <Send size={14} /> Submit Deliverable
            </button>
          ) : (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <textarea
                className="input"
                style={{ minHeight: 100 }}
                placeholder="Paste your work link or description here. WorkClaw Agent will verify it."
                value={deliverable}
                onChange={e => setDeliverable(e.target.value)}
              />
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => { onDeliver(contract.id, deliverable); setShowSubmit(false); }}
                  disabled={loadingId === contract.id}
                >
                  {loadingId === contract.id ? 'Submitting...' : 'Submit to AI Escrow'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSubmit(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {contract.status === 'SUBMITTED' && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-orange)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          Deliverable submitted. AI Agent is verifying and processing yield...
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ agentEvents, addToast }) {
  const { BACKEND_URL } = useContext(SocketContext)
  const { user } = useAuth()
  const [contracts, setContracts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [contractRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/contracts/user/${user.walletAddress}`),
        fetch(`${BACKEND_URL}/api/stats`)
      ]);
      const contractData = await contractRes.json();
      const statsData = await statsRes.json();
      
      if (contractData.success) setContracts(contractData.contracts);
      if (statsData.success) setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, user]);

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 15000);
    return () => clearInterval(int);
  }, [fetchData]);

  const handleDeliver = async (contractId, content) => {
    if (!content.trim()) return addToast('Content required', 'error');
    setSubmitLoading(contractId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/contracts/${contractId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableContent: content })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      addToast('Deliverable submitted to AI Agent', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitLoading(null);
    }
  };

  const activeContracts = contracts.filter(c => ['ACTIVE', 'SUBMITTED', 'DISPUTED'].includes(c.status));

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#141414', letterSpacing: '-1px', marginBottom: 8 }}>Dashboard</h1>
        <p style={{ color: '#62646a', fontSize: '1.1rem' }}>Manage your active contracts powered by AI Escrow.</p>
      </div>

      <div className="flex flex-wrap gap-4" style={{ marginBottom: 32 }}>
        <StatCard icon={TrendingUp} label="Total Yield Earned" value={`$${stats?.totalYieldEarned || '0.00'}`} color="var(--accent-green)" />
        <StatCard icon={DollarSign} label="Active Escrow" value={`$${stats?.totalValueEscrowed || '0.00'}`} />
        <StatCard icon={Shield} label="AI Decisions" value={stats?.agentDecisions || 0} color="var(--accent-purple)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Active Contracts</h2>
          {loading ? (
            <div>Loading...</div>
          ) : activeContracts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              No active contracts. Post a job or submit proposals!
            </div>
          ) : (
            activeContracts.map(c => (
              <ContractCard key={c.id} contract={c} user={user} onDeliver={handleDeliver} loadingId={submitLoading} />
            ))
          )}
        </div>
        
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Agent Live Feed</h2>
          <AgentFeed agentEvents={agentEvents} />
        </div>
      </div>
    </div>
  )
}
