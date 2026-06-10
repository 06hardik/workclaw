import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SocketContext } from '../App';
import { FileText, CheckCircle, Clock, ShieldAlert, AlertTriangle, Send, User as UserIcon } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { BACKEND_URL } = useContext(SocketContext);
  const { addToast } = useToast();

  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Proposal Form State (Freelancer)
  const [bidAmount, setBidAmount] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Hire Flow State (Client)
  const [hireModal, setHireModal] = useState(null);
  const [clientYieldPercent, setClientYieldPercent] = useState('50');
  const [hiring, setHiring] = useState(false);

  useEffect(() => {
    fetchJob();
    fetchProposals();
  }, [id, user]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/${id}`);
      const data = await res.json();
      if (data.success) {
        setJob(data.job);
        if (data.job.status !== 'OPEN') {
          // If the job is already IN_PROGRESS, the user should be looking at their Dashboard
          // but we can still show the details.
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/job/${id}`);
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitProposal = async (e) => {
    e.preventDefault();
    if (!bidAmount || !coverLetter) return addToast('Please fill out all fields', 'error');
    setSubmittingProposal(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/job/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancerAddress: user?.walletAddress,
          bidAmount,
          coverLetter
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast('Proposal submitted successfully!', 'success');
        fetchProposals();
        setBidAmount('');
        setCoverLetter('');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const hireFreelancer = async (e) => {
    e.preventDefault();
    setHiring(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/${hireModal.id}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientYieldPercent })
      });
      const data = await res.json();
      if (data.success) {
        addToast(`🎉 Freelancer hired! $${hireModal.bidAmount} USDC escrowed and generating yield.`, 'success');
        navigate('/dashboard');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setHiring(false);
    }
  };

  if (loading || !job) return <div style={{ textAlign: 'center', padding: 100 }}><div className="spinner" /></div>;

  const isClient = user?.walletAddress?.toLowerCase() === job.clientAddress?.toLowerCase();
  const myProposal = proposals.find(p => p.freelancerAddress?.toLowerCase() === user?.walletAddress?.toLowerCase());

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24, alignItems: 'start', animation: 'fadeIn 0.5s ease-out', padding: '24px 0' }}>
      
      {/* LEFT COLUMN: Job Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Job Header */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{job.title}</h1>
            <div className={`badge ${job.status === 'OPEN' ? 'badge-open' : 'badge-active'}`}>
              {job.status}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 24, color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={16} /> Expires: {job.expiresInDays} days</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={16} /> Escrow Yield Managed via Byreal</div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} /> Scope of Work
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>
        </div>

        {/* Proposals List (Visible to Client) */}
        {isClient && job.status === 'OPEN' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Proposals ({proposals.length})</h2>
            {proposals.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Waiting for freelancers to submit proposals...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {proposals.map(p => (
                  <div key={p.id} className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.User?.avatarUrl ? <img src={p.User.avatarUrl} style={{ width: 40, height: 40, borderRadius: '50%' }} /> : <UserIcon size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.User?.name || p.freelancerAddress}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bid: <strong style={{ color: 'var(--accent-teal)' }}>${p.bidAmount} USDC</strong></div>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => setHireModal(p)}>
                        Hire & Escrow
                      </button>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                      {p.coverLetter}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Budget & Submit Proposal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ padding: 24, position: 'sticky', top: 90 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Estimated Budget</h3>
          
          <div style={{ textAlign: 'center', padding: '30px 0', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-teal)', lineHeight: 1 }}>
              ${job.budget}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>
              USDC
            </div>
          </div>

          {!isClient && job.status === 'OPEN' && (
            <div>
              {myProposal ? (
                <div style={{ background: 'rgba(29, 191, 115, 0.1)', color: 'var(--accent-teal)', padding: 16, borderRadius: 12, textAlign: 'center', fontWeight: 600 }}>
                  <CheckCircle size={20} style={{ display: 'block', margin: '0 auto 8px' }} />
                  You have submitted a proposal for ${myProposal.bidAmount} USDC.
                </div>
              ) : (
                <form onSubmit={submitProposal}>
                  <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Submit a Proposal</h4>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="label">Your Bid (USDC)</label>
                    <input className="input" type="number" required value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="label">Cover Letter</label>
                    <textarea className="input" style={{ minHeight: 120 }} required value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Why should the client hire you?" />
                  </div>
                  <button className="btn btn-primary w-full" type="submit" disabled={submittingProposal}>
                    {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HIRE MODAL */}
      {hireModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card animate-slide-in" style={{ width: 480, padding: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Configure Contract</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              You are hiring <strong>{hireModal.User?.name || hireModal.freelancerAddress.slice(0,6)}</strong> for <strong>${hireModal.bidAmount} USDC</strong>.
              When you click Hire, the funds will be escrowed via the WorkEscrow smart contract and deployed to Byreal CLMM to earn yield.
            </p>

            <form onSubmit={hireFreelancer}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="label" style={{ marginBottom: 8, display: 'block' }}>
                  Yield Split Configuration: {clientYieldPercent}% to Client
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(Freelancer gets {100 - parseInt(clientYieldPercent)}%)</span>
                </label>
                <input
                  type="range" min="0" max="100" step="10"
                  value={clientYieldPercent}
                  onChange={e => setClientYieldPercent(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent-teal)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  <ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  Both parties earn DeFi yield while the work is being done. The AI automatically distributes the yield to both wallets upon completion.
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={hiring}>
                  {hiring ? 'Funding Escrow...' : `Fund Escrow & Hire ($${hireModal.bidAmount})`}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setHireModal(null)} disabled={hiring}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
