import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Save, Briefcase, Star } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Profile() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    role: user?.role || 'Freelancer',
    skills: user?.skills?.join(', ') || '',
    avatarUrl: user?.avatarUrl || '',
  });

  const update = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...profile,
        skills: profile.skills.split(',').map(s => s.trim()).filter(Boolean)
      };

      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        addToast('Profile updated successfully!', 'success');
        window.location.reload(); // Refresh to update AuthContext immediately
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Update your public marketplace profile and switch roles.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
        {/* Left Col: Avatar & Stats */}
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 20px' }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon size={48} color="var(--text-muted)" />
              </div>
            )}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{profile.name || 'Anonymous'}</h2>
          <div style={{ color: 'var(--accent-teal)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 20 }}>{profile.role}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}><Star size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} /> AI Rating</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>100%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}><Briefcase size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} /> Jobs Done</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>0</span>
            </div>
          </div>
        </div>

        {/* Right Col: Edit Form */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="label" style={{ color: 'var(--text-primary)' }}>Display Name</label>
              <input 
                type="text" 
                className="input" 
                value={profile.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>

            <div>
              <label className="label" style={{ color: 'var(--text-primary)' }}>Account Type</label>
              <select 
                className="input" 
                value={profile.role}
                onChange={e => update('role', e.target.value)}
              >
                <option value="Freelancer">Freelancer (Selling services)</option>
                <option value="Client">Client (Hiring talent)</option>
              </select>
            </div>

            <div>
              <label className="label" style={{ color: 'var(--text-primary)' }}>Bio</label>
              <textarea 
                className="input" 
                value={profile.bio}
                onChange={e => update('bio', e.target.value)}
                placeholder="Tell clients about yourself..."
              />
            </div>

            {profile.role === 'Freelancer' && (
              <div>
                <label className="label" style={{ color: 'var(--text-primary)' }}>Skills (comma separated)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={profile.skills}
                  onChange={e => update('skills', e.target.value)}
                  placeholder="e.g. React, Solidity, UI Design"
                />
              </div>
            )}

            <div>
              <label className="label" style={{ color: 'var(--text-primary)' }}>Avatar URL (Optional)</label>
              <input 
                type="text" 
                className="input" 
                value={profile.avatarUrl}
                onChange={e => update('avatarUrl', e.target.value)}
                placeholder="https://imgur.com/your-image.png"
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: 14, marginTop: 10 }} disabled={loading}>
              {loading ? 'Saving...' : <><Save size={16} /> Save Profile</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
