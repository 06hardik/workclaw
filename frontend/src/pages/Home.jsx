import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Check, Bot, Code, Palette, TrendingUp, PenTool, Folder, PieChart, Scale, Users, Ruler } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('hire');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/jobs?category=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/jobs');
    }
  };

  const categories = [
    { name: 'AI Services', icon: Bot },
    { name: 'Development & IT', icon: Code },
    { name: 'Design & Creative', icon: Palette },
    { name: 'Sales & Marketing', icon: TrendingUp },
    { name: 'Writing & Translation', icon: PenTool },
    { name: 'Admin & Support', icon: Folder },
    { name: 'Finance & Accounting', icon: PieChart },
    { name: 'Legal', icon: Scale },
    { name: 'HR & Training', icon: Users },
    { name: 'Engineering & Architecture', icon: Ruler }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', paddingBottom: 80 }}>
      
      {/* Top Banner */}
      <div style={{
        background: '#e8f5e9',
        borderRadius: 40,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={(e) => e.currentTarget.style.background = '#c8e6c9'}
      onMouseOut={(e) => e.currentTarget.style.background = '#e8f5e9'}
      >
        <div style={{ fontSize: '1.1rem', color: '#141414', fontWeight: 500 }}>
          Stop doing everything. Hire the top 1% of talent on Business Plus.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#141414' }}>
          Get started <ChevronRight size={18} />
        </div>
      </div>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 80,
        minHeight: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        color: '#fff',
      }}>
        {/* Background Image */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url('/hero-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }} />
        
        {/* Gradient Overlay for text readability */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          zIndex: 1
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 600 }}>
          <h1 style={{ 
            fontSize: '4.5rem', 
            fontWeight: 800, 
            marginBottom: 24, 
            lineHeight: 1.05,
            letterSpacing: '-1.5px'
          }}>
            Work at the speed of your ambition
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            fontWeight: 500,
            marginBottom: 40, 
            lineHeight: 1.4,
            maxWidth: 500
          }}>
            Hire experts who use AI to amplify their talent, turning complex work into high impact business outcomes
          </p>

          {/* Toggle Buttons */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(10px)',
            borderRadius: 40, 
            padding: 6,
            width: 'fit-content',
            marginBottom: 24
          }}>
            <button onClick={() => setMode('hire')} style={{
              background: mode === 'hire' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: mode === 'hire' ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
              color: '#fff',
              padding: '10px 32px',
              borderRadius: 30,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s',
              opacity: mode === 'hire' ? 1 : 0.8
            }}
            onMouseOver={(e) => { if (mode !== 'hire') e.currentTarget.style.opacity = '1' }}
            onMouseOut={(e) => { if (mode !== 'hire') e.currentTarget.style.opacity = '0.8' }}
            >
              I want to hire
            </button>
            <button onClick={() => setMode('work')} style={{
              background: mode === 'work' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: mode === 'work' ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
              color: '#fff',
              padding: '10px 32px',
              borderRadius: 30,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s',
              opacity: mode === 'work' ? 1 : 0.8
            }}
            onMouseOver={(e) => { if (mode !== 'work') e.currentTarget.style.opacity = '1' }}
            onMouseOut={(e) => { if (mode !== 'work') e.currentTarget.style.opacity = '0.8' }}
            >
              I want to work
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ 
            display: 'flex', 
            background: '#fff', 
            borderRadius: 40, 
            padding: '6px 6px 6px 24px',
            alignItems: 'center'
          }}>
            <input 
              type="text" 
              placeholder={mode === 'hire' ? "Describe what you need to hire for..." : "Search for jobs..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ 
                flex: 1, 
                background: 'transparent', 
                border: 'none', 
                color: '#141414', 
                fontSize: '1.05rem',
                outline: 'none',
                fontWeight: 500
              }} 
            />
            <button type="submit" style={{
              background: 'var(--accent-teal)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 30,
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s ease'
            }}>
              <Search size={18} /> Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section style={{ marginBottom: 100 }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 40, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
          Find freelancers for every type of work
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
          {categories.map(cat => (
            <Link to={`/jobs?category=${cat.name}`} key={cat.name} style={{
              textDecoration: 'none',
              background: '#fff',
              border: '1px solid #e4e5e7',
              borderRadius: 16,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent-teal)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#e4e5e7';
            }}
            >
              <div style={{ color: 'var(--accent-teal)' }}><cat.icon size={36} strokeWidth={1.5} /></div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Hiring Options */}
      <section>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', letterSpacing: '-1px', textAlign: 'center' }}>
          Choose how you want to hire
        </h2>
        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 48 }}>
          Flexible options designed to fit your hiring needs
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Basic Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e4e5e7',
            borderRadius: 24,
            padding: 40,
          }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>Basic</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 24 }}>For occasional hiring and one-off projects</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 40 }}>
              Hire skilled freelancers fast — without long-term commitments or extra overhead.
            </p>
            
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Basic includes:</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Marketplace access - skilled freelancers across thousands of skills',
                'Talent profiles - portfolios, ratings, and work history',
                'Hiring tools - proposals and terms in one place',
                'Project workspace - messages, files, and status in one view',
                'Protected payments - escrow-backed pay tied to approved work'
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                  <Check size={20} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Business Plus Card */}
          <div style={{
            background: '#fcfcfc',
            border: '2px solid var(--accent-teal)',
            borderRadius: 24,
            padding: 40,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: -2, right: -2,
              background: '#b2f2bb',
              color: '#0a421e',
              padding: '6px 16px',
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 16,
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.5px'
            }}>
              POPULAR
            </div>

            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>Business Plus</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 24 }}>For ongoing work, repeat hiring, and teams</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 40 }}>
              Premium tools, vetted talent, and team controls for running freelance work at scale.
            </p>
            
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Everything in Basic, plus:</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Curated shortlists - we surface top matches so you can hire faster',
                'Expert-Vetted talent - access to the top 1% of WorkClaw freelancers',
                'Team workspace - shared hiring with roles and permissions',
                'Centralized billing - keep team spend in one place',
                'Priority support - faster help to keep projects moving'
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                  <Check size={20} color="var(--accent-teal)" style={{ flexShrink: 0, marginTop: 2 }} /> {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

    </div>
  );
}
