import { useState } from 'react'
import JobCard from './JobCard'
import { Search, Filter } from 'lucide-react'

const STATUS_FILTERS = ['ALL', 'OPEN', 'ACTIVE', 'SUBMITTED', 'COMPLETED', 'DISPUTED', 'RESOLVED']

export default function JobBoard({ jobs, loading, onAcceptJob, onSubmitDeliverable, addToast }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = jobs.filter(j => {
    const matchesFilter = filter === 'ALL' || j.status === filter
    const matchesSearch = !search || j.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Job Board
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          All jobs on-chain · Accept a job to start the yield-earning escrow
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap" style={{ marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: 300 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="btn btn-ghost btn-sm"
              style={{
                color:      filter === s ? 'var(--accent-teal)' : 'var(--text-muted)',
                background: filter === s ? 'rgba(0,229,204,0.08)' : 'transparent',
                border:     filter === s ? '1px solid var(--border-teal)' : '1px solid var(--border)',
              }}
            >
              {s} {s !== 'ALL' && jobs.filter(j => j.status === s).length > 0 && (
                <span style={{
                  marginLeft: 4,
                  background: 'rgba(0,229,204,0.2)',
                  color: 'var(--accent-teal)',
                  borderRadius: 4,
                  padding: '0 4px',
                  fontSize: 10,
                }}>
                  {jobs.filter(j => j.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3" style={{ padding: 40, color: 'var(--text-muted)' }}>
          <div className="spinner" /> Loading jobs from Mantle Sepolia...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🦀</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No jobs found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {search ? `No results for "${search}"` : 'No jobs match this filter'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onAccept={onAcceptJob}
              onSubmit={onSubmitDeliverable}
              addToast={addToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}
