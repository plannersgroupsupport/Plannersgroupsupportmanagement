'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSession = async () => {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
      
      if (!authCookie) {
        router.push('/');
        return;
      }

      try {
        const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        setRole(decoded.role);
        setName(decoded.name);
        
        // Fetch full profile to get the photo
        const profileRes = await fetch(`/api/profile?userId=${decoded.id}`);
        const pData = await profileRes.json();
        setProfileData(pData);
      } catch (e) {
        console.error('Session error', e);
        router.push('/');
      }
      setLoading(false);
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(data);
      } catch (e) {
        console.error('Settings fetch error', e);
      }
    };

    fetchSession();
    fetchSettings();
  }, [router]);

  // Close sidebar when route changes (mobile nav link tap)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary-light)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#64748b' }}>Synchronizing Session...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const links = [{ href: '/dashboard', label: '🏠 Overview' }];
  if (role === 'SUPERADMIN') {
    links.push({ href: '/dashboard/students', label: '🎓 Students' });
    links.push({ href: '/dashboard/faculty', label: '👨‍🏫 Faculty' });
    links.push({ href: '/dashboard/staff', label: '👥 Other Staff' });
    links.push({ href: '/dashboard/fees-admin', label: '💰 Collect Fees' });
    links.push({ href: '/dashboard/expenses', label: '📊 Expenses' });
    links.push({ href: '/dashboard/certificates', label: '📜 Certificates' });
    links.push({ href: '/dashboard/profile', label: '👤 My Profile' });
  }
  else if (role === 'STUDENT') {
    links.push({ href: '/dashboard/progress', label: '📈 My Progress' });
    links.push({ href: '/dashboard/notes', label: '📚 Study Materials' });
    links.push({ href: '/dashboard/profile', label: '👤 My Profile' });
  }
  else if (role === 'FACULTY') {
    links.push({ href: '/dashboard/students', label: '🎓 Students' });
    links.push({ href: '/dashboard/attendance', label: '✅ Mark Attendance' });
    links.push({ href: '/dashboard/notes', label: '📤 Upload Notes' });
    links.push({ href: '/dashboard/profile', label: '👤 My Profile' });
  }
  else if (role === 'ACCOUNTANT') {
    links.push({ href: '/dashboard/fees-admin', label: '💰 Collect Fees' });
    links.push({ href: '/dashboard/expenses', label: '📊 Expenses' });
    links.push({ href: '/dashboard/profile', label: '👤 My Profile' });
  }
  else if (role === 'CERT_STAFF') {
    links.push({ href: '/dashboard/certificates', label: '📜 Certificates' });
    links.push({ href: '/dashboard/profile', label: '👤 My Profile' });
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '55px', marginBottom: '0.75rem', objectFit: 'contain' }} />
        ) : (
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>PLANNERS</div>
        )}
        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>{settings?.companyName || 'Group Management'}</div>
      </div>
      
      <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {links.map(link => (
            <li key={link.href} style={{ marginBottom: '0.35rem' }}>
              <a 
                href={link.href} 
                style={{ 
                  display: 'block', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  textDecoration: 'none',
                  color: pathname === link.href ? 'white' : 'var(--foreground)',
                  background: pathname === link.href ? 'linear-gradient(135deg, var(--primary), #4c6ef5)' : 'transparent',
                  fontWeight: pathname === link.href ? '600' : '400',
                  transition: 'all 0.2s',
                  fontSize: '0.95rem'
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
          {role === 'SUPERADMIN' && (
            <li style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => {
                  const url = window.location.origin + '/register';
                  navigator.clipboard.writeText(url);
                  alert('Registration link copied to clipboard!\n' + url);
                }}
                style={{ 
                  width: '100%',
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  background: 'rgba(76,175,80,0.08)',
                  border: '1px dashed var(--primary)',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  fontSize: '0.9rem'
                }}
              >
                📤 Copy Reg. Link
              </button>
            </li>
          )}
        </ul>
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
           <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary)', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 }}>
              <img 
                  src={profileData?.fileUploads?.[0]?.url || (role === 'SUPERADMIN' ? settings?.logoUrl : '/placeholder-profile.png') || '/placeholder-profile.png'} 
                  alt="User" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
           </div>
           <div style={{ fontSize: '0.85rem', overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{role}</div>
           </div>
        </div>
        <button onClick={handleLogout} style={{ width: '100%', padding: '0.65rem', background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem' }}>
          🚪 Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', position: 'relative' }}>
      
      {/* Responsive styles */}
      <style>{`
        .dashboard-sidebar {
          width: 260px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          flex-shrink: 0;
          height: 100vh;
          position: sticky;
          top: 0;
        }
        .dashboard-main {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          z-index: 5;
          min-width: 0;
        }
        .mobile-topbar {
          display: none;
        }
        .mobile-overlay {
          display: none;
        }
        .mobile-drawer {
          display: none;
        }
        @media (max-width: 768px) {
          .dashboard-sidebar {
            display: none !important;
          }
          .dashboard-main {
            padding: 1rem;
            padding-top: 4.5rem;
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 0 1rem;
            z-index: 200;
            gap: 0.75rem;
          }
          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 300;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          .mobile-overlay.open {
            opacity: 1;
            pointer-events: all;
          }
          .mobile-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 82vw;
            max-width: 300px;
            background: var(--surface);
            z-index: 400;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          }
          .mobile-drawer.open {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Background Watermark Logo */}
      {settings?.logoUrl && (
          <img 
            src={settings.logoUrl} 
            alt="Watermark" 
            style={{ 
                position: 'fixed', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                width: 'min(70vw, 700px)', 
                height: 'auto', 
                opacity: 0.08, 
                zIndex: 0, 
                pointerEvents: 'none',
                filter: 'grayscale(1)'
            }} 
          />
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="dashboard-sidebar">
        {sidebarContent}
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            color: 'var(--foreground)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            boxShadow: 'none',
            borderRadius: '6px'
          }}
        >
          <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', background: 'currentColor', borderRadius: '2px' }} />
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>PLANNERS</span>
          )}
        </div>

        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary)', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}>
          <img 
            src={profileData?.fileUploads?.[0]?.url || (role === 'SUPERADMIN' ? settings?.logoUrl : '/placeholder-profile.png') || '/placeholder-profile.png'} 
            alt="User" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </div>

      {/* ── MOBILE OVERLAY ── */}
      <div className={`mobile-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── MOBILE DRAWER ── */}
      <div className={`mobile-drawer${sidebarOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1rem 0' }}>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--foreground)', boxShadow: 'none', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
