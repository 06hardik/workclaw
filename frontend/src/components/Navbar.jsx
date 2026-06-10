import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronDown, User as UserIcon, LogOut, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, loginWithMetaMask, isConnecting, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)

  const navItems = [
    { label: 'Find Work', to: '/jobs', hasDropdown: true },
    { label: 'Hire Talent', to: '/post-job', hasDropdown: true },
    { label: 'Why WorkClaw', to: '/', hasDropdown: true },
    { label: 'Pricing', to: '/' },
    { label: 'Enterprise', to: '/' },
    ...(user ? [{ label: 'Dashboard', to: '/dashboard' }] : [])
  ]

  const categories = [
    'AI & Automation', 'Development & IT', 'Marketing', 'Design & Creative', 
    'Video & Audio', 'Writing & Content', 'Admin & Support'
  ]

  const aiAutomationSkills = [
    { title: 'Artificial Intelligence', desc: 'Work on cutting-edge AI projects' },
    { title: 'AI Generated Video', desc: 'Create AI-powered video content' },
    { title: 'AI Model Training', desc: 'Label, train and fine-tune AI models' },
    { title: 'Prompt Engineering', desc: 'Craft prompts for better AI outputs' },
    { title: 'AI Content Creation', desc: 'Write with and about AI' },
    { title: 'Generative AI', desc: 'Build with generative AI tools' },
    { title: 'AI Writing', desc: 'Write with and about AI' },
    { title: 'Automation', desc: 'Workflows that cut manual work' },
  ]

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/jobs?category=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/jobs');
    }
  };

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4e5e7',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Left: Logo & Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {/* Logo */}
            <Link to="/" style={{ textDecoration: 'none', color: '#141414', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, var(--accent-teal), #006eff)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 4px 15px rgba(0,229,204,0.4)',
              }}>
                🦀
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-1.5px', fontFamily: 'Arial, sans-serif' }}>
                workclaw
              </div>
            </Link>

            {/* Navigation Links */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', position: 'relative' }}>
              {navItems.map((item, i) => (
                <div 
                  key={i} 
                  style={{ position: 'relative', height: '72px', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={() => setActiveDropdown(i)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={item.to}
                    style={{
                      color: activeDropdown === i ? 'var(--accent-teal)' : '#141414',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4,
                      fontSize: '0.95rem',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {item.label} 
                    {item.hasDropdown && (
                      <ChevronDown 
                        size={14} 
                        style={{ 
                          marginTop: 2, 
                          transform: activeDropdown === i ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease'
                        }} 
                      />
                    )}
                  </Link>

                  {/* Mega Dropdown Menu */}
                  {item.hasDropdown && activeDropdown === i && (
                    <div style={{
                      position: 'absolute',
                      top: '72px',
                      left: -20,
                      background: '#fff',
                      border: '1px solid #e4e5e7',
                      borderRadius: 12,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      padding: 24,
                      display: 'flex',
                      gap: 40,
                      width: 700,
                      zIndex: 1000,
                      cursor: 'default'
                    }}>
                      {/* Categories Sidebar */}
                      <div style={{ width: 200, borderRight: '1px solid #e4e5e7', paddingRight: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#62646a', marginBottom: 12, letterSpacing: '0.5px' }}>CATEGORIES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {categories.map((cat, idx) => (
                            <Link key={idx} to={`/jobs?category=${cat}`} style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              textDecoration: 'none',
                              color: idx === 0 ? '#141414' : '#62646a',
                              background: idx === 0 ? '#f0f0f0' : 'transparent',
                              fontWeight: idx === 0 ? 600 : 500,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.9rem'
                            }}
                            onMouseOver={(e) => { if(idx !== 0) e.currentTarget.style.background = '#fcfcfc' }}
                            onMouseOut={(e) => { if(idx !== 0) e.currentTarget.style.background = 'transparent' }}
                            >
                              {cat} <ChevronRight size={14} color="#62646a" />
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Right Detail View */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#62646a', marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          AI & Automation
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                          {aiAutomationSkills.map((skill, idx) => (
                            <Link key={idx} to={`/jobs?category=${skill.title}`} style={{ textDecoration: 'none' }}>
                              <div style={{ color: '#141414', fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                                {skill.title}
                              </div>
                              <div style={{ color: '#62646a', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                {skill.desc}
                              </div>
                            </Link>
                          ))}
                        </div>

                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e4e5e7', display: 'flex', gap: 24 }}>
                          <Link to="/jobs" style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>See all jobs &gt;</Link>
                          <Link to="/jobs" style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Win work with ads &gt;</Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Search, Auth & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            
            {/* Nav Search Bar */}
            <form onSubmit={handleSearch} style={{ 
              display: 'flex', 
              background: '#fcfcfc',
              border: '2px solid #e4e5e7',
              borderRadius: 30, 
              padding: '6px 12px',
              alignItems: 'center',
              width: 250,
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#141414'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e4e5e7'}
            >
              <Search size={16} color="#62646a" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#141414', 
                  fontSize: '0.95rem',
                  outline: 'none',
                  paddingLeft: 8
                }} 
              />
            </form>

            <div style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              🌉 Simulated Bridge
            </div>

            {/* Auth Block */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={16} color="var(--text-secondary)" />
                    </div>
                  )}
                </Link>
                <button 
                  onClick={logout}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 6, fontWeight: 600 }}
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  onClick={loginWithMetaMask}
                  disabled={isConnecting}
                  style={{
                    background: 'transparent',
                    color: '#141414',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    opacity: isConnecting ? 0.7 : 1
                  }}
                >
                  Log In
                </button>
                <button 
                  onClick={loginWithMetaMask}
                  disabled={isConnecting}
                  style={{
                    background: 'var(--accent-teal)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: 30,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    opacity: isConnecting ? 0.7 : 1,
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#19a463'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-teal)'}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}

function ChevronRight({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
