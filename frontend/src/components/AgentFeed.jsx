import { ExternalLink, Bot, Zap, Shield, TrendingUp, RefreshCw } from 'lucide-react'

const ACTION_ICONS = {
  DEPLOY_YIELD:       { icon: '🌱', color: 'var(--accent-teal)',   label: 'Deployed Yield' },
  CLAIM_YIELD:        { icon: '📤', color: 'var(--accent-green)',  label: 'Claimed Yield' },
  VERIFY_DELIVERABLE: { icon: '🔍', color: 'var(--accent-blue)',   label: 'Verified Deliverable' },
  RELEASE_FUNDS:      { icon: '✅', color: 'var(--accent-green)',  label: 'Released Funds' },
  REJECT_DELIVERABLE: { icon: '❌', color: 'var(--accent-red)',    label: 'Rejected Deliverable' },
  RESOLVE_DISPUTE:    { icon: '⚖️', color: 'var(--accent-purple)', label: 'Resolved Dispute' },
  WARN_USER:          { icon: '⚠️', color: 'var(--accent-orange)', label: 'Warning Issued' },
}

const EVENT_META = {
  'agent:thinking':          { icon: '🤔', color: 'var(--accent-orange)', label: 'Agent Thinking' },
  'agent:action':            { icon: '⚡',  color: 'var(--accent-teal)',   label: 'Agent Action' },
  'agent:error':             { icon: '🚨', color: 'var(--accent-red)',    label: 'Agent Error' },
  'event:JobCreated':        { icon: '📋', color: 'var(--accent-blue)',   label: 'Job Created' },
  'event:JobAccepted':       { icon: '🤝', color: 'var(--accent-teal)',   label: 'Job Accepted' },
  'event:DeliverableSubmitted': { icon: '📤', color: 'var(--accent-orange)', label: 'Deliverable Submitted' },
  'event:FundsReleased':     { icon: '💰', color: 'var(--accent-green)',  label: 'Funds Released' },
  'event:DisputeRaised':     { icon: '🚨', color: 'var(--accent-red)',    label: 'Dispute Raised' },
  'event:YieldUpdated':      { icon: '📈', color: 'var(--accent-green)',  label: 'Yield Updated' },
  'yield:update':            { icon: '💹', color: 'var(--accent-green)',  label: 'Live Yield' },
}

function EventRow({ event }) {
  const { type, data, timestamp } = event
  const meta = EVENT_META[type] || { icon: '📡', color: 'var(--text-muted)', label: type }

  let actionMeta = null
  if (type === 'agent:action' && data.type) {
    actionMeta = ACTION_ICONS[data.type]
  }

  const displayIcon  = actionMeta?.icon  || meta.icon
  const displayColor = actionMeta?.color || meta.color
  const displayLabel = actionMeta?.label || meta.label

  const getMessage = () => {
    if (data.message) return data.message
    if (type === 'event:FundsReleased')
      return `$${data.principal} USDC + $${data.freelancerYield} yield released to freelancer`
    if (type === 'yield:update')
      return `Job #${data.jobId}: $${parseFloat(data.yieldEarned || 0).toFixed(6)} earned @ ${data.apr} APY`
    return JSON.stringify(data).slice(0, 100)
  }

  return (
    <div className="animate-slide-in" style={{
      display:    'flex',
      gap:        14,
      padding:    '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Icon */}
      <div style={{
        width:        36,
        height:       36,
        borderRadius: 8,
        background:   `${displayColor}15`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     18,
        flexShrink:   0,
        border:       `1px solid ${displayColor}30`,
      }}>
        {displayIcon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: displayColor }}>
            {displayLabel}
          </span>
          {data.jobId && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize:   11,
              color:      'var(--text-muted)',
              background: 'var(--bg-secondary)',
              padding:    '1px 6px',
              borderRadius: 4,
            }}>
              Job #{data.jobId}
            </span>
          )}
          {type === 'agent:thinking' && (
            <div className="spinner" style={{ width: 12, height: 12 }} />
          )}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {getMessage()}
        </div>

        {/* Verification details */}
        {data.verification && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: data.verification.approved ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${data.verification.approved ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 6,
            fontSize: 12,
          }}>
            <div style={{ fontWeight: 600, color: data.verification.approved ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: 4 }}>
              AI Confidence: {data.verification.confidence}% · {data.verification.summary}
            </div>
            {data.verification.reasoning && (
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {data.verification.reasoning}
              </div>
            )}
            {data.yieldEarned > 0 && (
              <div style={{ color: 'var(--accent-green)', marginTop: 4, fontWeight: 600 }}>
                💰 Yield earned: +${parseFloat(data.yieldEarned).toFixed(6)} USDC
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3" style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{new Date(timestamp).toLocaleTimeString()}</span>
          {data.txHash && (
            <a
              href={`https://explorer.sepolia.mantle.xyz/tx/${data.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: 3 }}
            >
              View TX <ExternalLink size={10} />
            </a>
          )}
          {data.reasonHash && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
              Hash: {data.reasonHash.slice(0, 12)}...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentFeed({ events }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 6 }}>
            Agent Activity Feed
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Real-time stream of WorkClaw AI decisions · All logged to ERC-8004 on Mantle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-pulse-dot" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{events.length} events</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: Bot,       label: 'Total Events',    value: events.length },
          { icon: Zap,       label: 'Agent Actions',   value: events.filter(e => e.type === 'agent:action').length },
          { icon: Shield,    label: 'On-chain Logs',   value: events.filter(e => e.type.startsWith('event:')).length },
          { icon: TrendingUp,label: 'Yield Updates',   value: events.filter(e => e.type === 'yield:update').length },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, minWidth: 140, padding: 16 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <s.icon size={14} color="var(--accent-teal)" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="card" style={{ padding: '4px 20px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Bot size={40} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Watching the blockchain...</div>
            <div style={{ fontSize: 13 }}>Agent events will appear here in real time as jobs are created and processed.</div>
          </div>
        ) : (
          events.map(event => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
