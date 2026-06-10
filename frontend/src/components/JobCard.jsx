import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, User as UserIcon, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react'

// Status badge
function StatusBadge({ job }) {
  const status = job.status;
  
  const map = {
    OPEN:      'badge-open',
    IN_PROGRESS: 'badge-active',
    SUBMITTED: 'badge-submitted',
    COMPLETED: 'badge-completed',
    DISPUTED:  'badge-disputed',
    RESOLVED:  'badge-resolved',
    CANCELLED: 'badge-cancelled',
  }
  const icons = {
    OPEN:      '○',
    IN_PROGRESS: '◉',
    SUBMITTED: '◎',
    COMPLETED: '✓',
    DISPUTED:  '!',
    RESOLVED:  '⚖',
    CANCELLED: '×',
  }
  return (
    <span className={`badge ${map[status] || 'badge-open'}`}>
      {icons[status] || '•'} {status}
    </span>
  )
}

export default function JobCard({ job }) {
  const isActive  = ['IN_PROGRESS', 'SUBMITTED'].includes(job.status)
  
  return (
    <div className="card animate-slide-in" style={{
      border: isActive ? '1px solid var(--border-teal)' : '1px solid var(--border)',
      boxShadow: isActive ? 'var(--shadow-teal)' : 'none',
    }}>
      <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              #{job.id}
            </span>
            <StatusBadge job={job} />
          </div>
          <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, cursor: 'pointer' }} className="truncate">
              {job.title}
            </h3>
          </Link>
          <div className="flex items-center gap-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserIcon size={11} /> {job.clientAddress?.slice(0, 8)}...
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {job.expiresInDays} days
            </span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent-teal)' }}>
              ${job.budget}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>USDC (Est.)</div>
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        {job.description?.length > 150 ? job.description.substring(0, 150) + '...' : job.description}
      </div>

      <div className="flex gap-2" style={{ marginTop: 12 }}>
        <Link to={`/jobs/${job.id}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
