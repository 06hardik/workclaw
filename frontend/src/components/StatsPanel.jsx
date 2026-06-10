import { useState, useEffect } from 'react'
import { ExternalLink, Copy, CheckCircle, Cpu, Database, Globe, Shield } from 'lucide-react'

export default function StatsPanel({ stats, backendUrl }) {
  const [decisions, setDecisions]   = useState([])
  const [loadingDec, setLoadingDec] = useState(false)
  const [copied, setCopied]         = useState(null)

  useEffect(() => {
    const fetchDecisions = async () => {
      setLoadingDec(true)
      try {
        const res  = await fetch(`${backendUrl}/api/agent/decisions`)
        const data = await res.json()
        if (data.success) setDecisions(data.decisions || [])
      } catch {}
      setLoadingDec(false)
    }
    fetchDecisions()
  }, [backendUrl])

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const contracts = [
    { label: 'WorkEscrow.sol',  address: import.meta.env.VITE_WORK_ESCROW_ADDRESS  || 'Not deployed' },
    { label: 'AgentLedger.sol', address: import.meta.env.VITE_AGENT_LEDGER_ADDRESS || 'Not deployed' },
    { label: 'MockUSDC (wcUSDC)', address: import.meta.env.VITE_MOCK_USDC_ADDRESS  || 'Not deployed' },
  ]

  const techStack = [
    { icon: '🔗', name: 'Blockchain',  value: 'Mantle Sepolia (Chain ID: 5003)' },
    { icon: '🤖', name: 'AI Model',    value: 'Google Gemini 1.5 Flash (Free Tier)' },
    { icon: '🌱', name: 'DeFi Yield',  value: 'Byreal CLMM on Solana (18.3% APY)' },
    { icon: '🎫', name: 'Identity',    value: 'ERC-8004 Agent NFT (ERC-721 based)' },
    { icon: '🦀', name: 'Agent',       value: 'OpenClaw + Byreal Agent Skills CLI' },
    { icon: '⚡',  name: 'Backend',    value: 'Node.js + ethers.js + Socket.IO' },
    { icon: '🎨', name: 'Frontend',   value: 'React + Vite' },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Platform Stats & Architecture
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Live metrics from Mantle Sepolia + ERC-8004 agent decision ledger
        </p>
      </div>

      {/* Overview stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Jobs',    value: stats.totalJobs,          color: 'var(--accent-teal)' },
            { label: 'Value Escrowed',value: `$${stats.totalValueEscrowed}`, color: 'var(--accent-blue)' },
            { label: 'Yield Earned',  value: `$${stats.totalYieldEarned}`,   color: 'var(--accent-green)' },
            { label: 'Completed',     value: stats.completedJobs,      color: 'var(--accent-green)' },
            { label: 'Agent Accuracy',value: `${stats.agentAccuracy}%`, color: 'var(--accent-purple)' },
            { label: 'AI Decisions',  value: stats.agentDecisions,     color: 'var(--accent-orange)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Deployed Contracts */}
        <div className="card">
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Database size={16} color="var(--accent-teal)" />
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Deployed Contracts</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Mantle Sepolia</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contracts.map((c, i) => (
              <div key={i} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                    {c.address !== 'Not deployed' ? `${c.address.slice(0, 16)}...` : 'Not deployed'}
                  </div>
                </div>
                {c.address !== 'Not deployed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(c.address, i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                    >
                      {copied === i ? <CheckCircle size={14} color="var(--accent-green)" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`https://explorer.sepolia.mantle.xyz/address/${c.address}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent-teal)', display: 'flex', padding: 4 }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="card">
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Cpu size={16} color="var(--accent-teal)" />
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Tech Stack</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {techStack.map((t, i) => (
              <div key={i} className="flex items-center gap-3" style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{ fontSize: 16, width: 24 }}>{t.icon}</span>
                <span style={{ color: 'var(--text-muted)', minWidth: 90, fontSize: 12 }}>{t.name}</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, fontSize: 12 }}>{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ERC-8004 Decision Log */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Shield size={16} color="var(--accent-purple)" />
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>ERC-8004 On-Chain Decision Log</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
              {decisions.length} decisions recorded
            </span>
          </div>

          {loadingDec ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', padding: 20 }}>
              <div className="spinner" /> Loading decisions...
            </div>
          ) : decisions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              No AI decisions logged yet. Create and accept a job to see the agent in action.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Job ID', 'Action', 'Outcome', 'Amount (USD)', 'Timestamp', 'Reason Hash'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        color: 'var(--text-muted)', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 11,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decisions.slice(0, 20).map((d, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-teal)' }}>
                        #{d.jobId}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: 'rgba(139,92,246,0.1)',
                          color: 'var(--accent-purple)',
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        }}>
                          {d.actionType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: d.outcome ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                          {d.outcome ? '✓ Success' : '✗ Failed'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                        ${d.amountUsd}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {new Date(d.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', fontSize: 11 }}>
                        {d.reasonHash?.slice(0, 18)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
