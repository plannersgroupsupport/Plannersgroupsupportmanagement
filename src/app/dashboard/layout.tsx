'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
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
      } catch {
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

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/');
  };

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Synchronizing Session...</div>;

  const links = [{ href: '/dashboard', label: 'Overview' }];
  if (role === 'SUPERADMIN') {
    links.push({ href: '/dashboard/students', label: 'Students' });
    links.push({ href: '/dashboard/faculty', label: 'Faculty' });
    links.push({ href: '/dashboard/staff', label: 'Other Staff' });
    links.push({ href: '/dashboard/fees-admin', label: 'Collect Fees' });
    links.push({ href: '/dashboard/expenses', label: 'Expenses' });
    links.push({ href: '/dashboard/certificates', label: 'Certificates' });
    links.push({ href: '/dashboard/profile', label: 'My Profile' });
  }
  else if (role === 'STUDENT') {
    links.push({ href: '/dashboard/progress', label: 'My Progress' });
    links.push({ href: '/dashboard/notes', label: 'Study Materials' });
    links.push({ href: '/dashboard/profile', label: 'My Profile' });
  }
  else if (role === 'FACULTY') {
    links.push({ href: '/dashboard/students', label: 'Students' });
    links.push({ href: '/dashboard/attendance', label: 'Mark Attendance' });
    links.push({ href: '/dashboard/notes', label: 'Upload Notes' });
    links.push({ href: '/dashboard/profile', label: 'My Profile' });
  }
  else if (role === 'ACCOUNTANT') {
    links.push({ href: '/dashboard/fees-admin', label: 'Collect Fees' });
    links.push({ href: '/dashboard/expenses', label: 'Expenses' });
    links.push({ href: '/dashboard/profile', label: 'My Profile' });
  }
  else if (role === 'CERT_STAFF') {
    links.push({ href: '/dashboard/certificates', label: 'Certificates' });
    links.push({ href: '/dashboard/profile', label: 'My Profile' });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', position: 'relative', overflow: 'hidden' }}>
      
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
                width: '600px', 
                height: 'auto', 
                opacity: 0.07, 
                zIndex: 0, 
                pointerEvents: 'none'
            }} 
          />
      )}

      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" style={{ height: '60px', marginBottom: '1rem', objectFit: 'contain' }} />
          ) : (
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>PLANNERS</div>
          )}
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>{settings?.companyName || 'Group Management'}</div>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {links.map(link => (
              <li key={link.href} style={{ marginBottom: '0.5rem' }}>
                <a 
                  href={link.href} 
                  style={{ 
                    display: 'block', 
                    padding: '0.8rem 1.2rem', 
                    borderRadius: '8px', 
                    textDecoration: 'none',
                    color: pathname === link.href ? 'white' : 'inherit',
                    background: pathname === link.href ? 'linear-gradient(135deg, var(--primary), #4c6ef5)' : 'transparent',
                    fontWeight: pathname === link.href ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
            {role === 'SUPERADMIN' && (
              <li style={{ marginTop: '1.5rem' }}>
                <button 
                  onClick={() => {
                    const url = window.location.origin + '/register';
                    navigator.clipboard.writeText(url);
                    alert('Registration link copied to clipboard!\n' + url);
                  }}
                  style={{ 
                    width: '100%',
                    padding: '0.8rem 1.2rem', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed var(--primary)',
                    color: 'var(--primary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                >
                  📤 Copy Reg. Link
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
             <div style={{ fontWeight: 'bold' }}>{name}</div>
             <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{role}</div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--error)', color: 'var(--error)' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', zIndex: 5 }}>
        {children}
      </main>
    </div>
  );
}
