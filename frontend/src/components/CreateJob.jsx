import { useState } from 'react'
import { PlusCircle, Droplets, Info } from 'lucide-react'

export default function CreateJob({ onCreateJob, onFaucet, addToast, setActiveTab }) {
  const [loading, setLoading]  = useState(false)
  const [faucetLoading, setFL] = useState(false)
  const [form, setForm] = useState({
    title:              '',
    scope:              '',
    amount:             '100',
    deadlineDays:       '7',
    clientYieldPercent: '50',
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.scope) {
      addToast('Title and scope are required', 'error')
      return
    }
    setLoading(true)
    try {
      const result = await onCreateJob(form)
      addToast(`🎉 Job #${result.jobId} created! ${parseFloat(form.amount)} USDC escrowed.`, 'success')
      setForm({ title: '', scope: '', amount: '100', deadlineDays: '7', clientYieldPercent: '50' })
      setActiveTab('jobs')
    } catch (err) {
      addToast(`❌ ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFaucet = async () => {
    setFL(true)
    try {
      await onFaucet()
    } finally {
      setFL(false)
    }
  }

  const estimatedYield = ((parseFloat(form.amount || 0) * 0.183 * parseInt(form.deadlineDays || 0)) / 365).toFixed(4)
  const freelancerYield = (parseFloat(estimatedYield) * (1 - parseInt(form.clientYieldPercent || 50) / 100)).toFixed(4)

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Post a New Job
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Client funds are held in AI-managed escrow and earn DeFi yield via Byreal CLMM while the work is being done.
        </p>
      </div>

      {/* Faucet card */}
      <div className="card" style={{
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.2)',
        marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Droplets size={20} color="var(--accent-blue)" />
        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Need test USDC?</span>
          {' '}
          <span style={{ color: 'var(--text-muted)' }}>Claim 10,000 wcUSDC from the faucet to post jobs on testnet.</span>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleFaucet}
          disabled={faucetLoading}
        >
          {faucetLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Claiming...</> : '🚰 Get wcUSDC'}
        </button>
      </div>

      {/* Job form */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Job Title *</label>
            <input
              className="input"
              placeholder="e.g. Design a landing page for my SaaS product"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Scope / Description *</label>
            <textarea
              className="input"
              style={{ minHeight: 120 }}
              placeholder="Describe exactly what needs to be delivered. The AI agent will use this to verify the freelancer's work.&#10;&#10;Be specific: 'Deliver a Figma file with 3 screens, responsive mobile layout, and a component library.'"
              value={form.scope}
              onChange={e => update('scope', e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Payment Amount (USDC)</label>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Deadline (Days)</label>
              <input
                className="input"
                type="number"
                min="1"
                max="90"
                value={form.deadlineDays}
                onChange={e => update('deadlineDays', e.target.value)}
              />
            </div>
          </div>

          {/* Yield split slider */}
          <div className="form-group">
            <label className="label">
              Your Yield Share: {form.clientYieldPercent}%
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                (Freelancer gets {100 - parseInt(form.clientYieldPercent)}%)
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={form.clientYieldPercent}
              onChange={e => update('clientYieldPercent', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-teal)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>All to freelancer</span>
              <span>All to client</span>
            </div>
          </div>

          {/* Yield preview card */}
          {parseFloat(form.amount) > 0 && parseInt(form.deadlineDays) > 0 && (
            <div style={{
              background: 'rgba(0,229,204,0.05)',
              border: '1px solid var(--border-teal)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
            }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: 'var(--accent-teal)' }}>
                <Info size={14} />
                Yield Projection (@ 18.3% APY via Byreal CLMM)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>Total Yield (est.)</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>
                    +${estimatedYield} USDC
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>Freelancer Bonus</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>
                    +${freelancerYield} USDC
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>Freelancer Receives</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${(parseFloat(form.amount) + parseFloat(freelancerYield)).toFixed(4)} USDC
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                💡 Yield is earned automatically. Your money works while you wait.
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" /> Creating job...</>
            ) : (
              <><PlusCircle size={18} /> Post Job & Escrow ${form.amount || '0'} USDC</>
            )}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            Funds are held in <strong style={{ color: 'var(--text-secondary)' }}>WorkEscrow.sol</strong> on Mantle Sepolia ·
            Only released by AI verification
          </div>
        </form>
      </div>
    </div>
  )
}
