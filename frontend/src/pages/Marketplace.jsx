import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import JobCard from '../components/JobCard';
import { SocketContext } from '../App';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

export default function Marketplace() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryFilter = searchParams.get('category');
  
  const { addToast } = useToast();
  const { BACKEND_URL } = useContext(SocketContext);
  const { user } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = categoryFilter 
    ? jobs.filter(j => j.title.toLowerCase().includes(categoryFilter.toLowerCase())) 
    : jobs;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Explore Jobs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Find work that pays in crypto, instantly.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ 
        display: 'flex', gap: 12, marginBottom: 24, padding: 16, 
      }}>
        <select className="input" style={{ width: 'auto', background: 'var(--bg-primary)' }}>
          <option>All Categories</option>
          <option>AI Services</option>
          <option>Development & IT</option>
          <option>Design & Creative</option>
          <option>Sales & Marketing</option>
          <option>Writing & Translation</option>
          <option>Admin & Support</option>
          <option>Finance & Accounting</option>
          <option>Legal</option>
          <option>HR & Training</option>
          <option>Engineering & Architecture</option>
        </select>
        <select className="input" style={{ width: 'auto', background: 'var(--bg-primary)' }}>
          <option>Any Budget</option>
          <option>$100 - $500</option>
          <option>$500+</option>
        </select>
        <select className="input" style={{ width: 'auto', background: 'var(--bg-primary)' }}>
          <option>Delivery Time</option>
          <option>Up to 24 hours</option>
          <option>Up to 3 days</option>
          <option>Up to 7 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: 'var(--accent-teal)' }} />
          Loading jobs from blockchain...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>No jobs found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
