'use client';

import { useEffect, useState } from 'react';

export default function FacultyPage() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', loginId: '', password: '', role: 'FACULTY', phone: '' });

  useEffect(() => {
    fetch('/api/users?role=FACULTY')
      .then(res => res.json())
      .then(data => { setFaculties(data); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...formData, role: 'FACULTY'})
    });
    if (res.ok) {
      alert('Faculty profile created successfully!');
      window.location.reload();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Failed to create faculty.');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove faculty member ${name}?`)) return;

    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
       alert('Faculty member removed successfully.');
       setFaculties(faculties.filter(f => f.id !== id));
    } else {
       alert('Failed to remove faculty member.');
    }
  };

  const filteredFaculties = faculties.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.loginId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Faculty Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Faculty Roster</h3>
                <input 
                    type="text" 
                    placeholder="Search Faculty..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', width: '200px' }}
                />
            </div>

            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Synchronizing Roster...</div> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem' }}>Faculty Name</th>
                    <th>Login ID</th>
                    <th>Contact</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculties.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ fontWeight: '600' }}>{f.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Certified Faculty Member</div>
                      </td>
                      <td>
                          <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{f.loginId}</code>
                      </td>
                      <td>{f.phone || 'N/A'}</td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                          <button 
                             onClick={() => handleRemove(f.id, f.name)}
                             style={{ background: 'var(--error)', padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer' }}
                          >
                             Remove
                          </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFaculties.length === 0 && <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No faculty members found.</td></tr>}
                </tbody>
              </table>
            )}
        </div>

        <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Add Faculty</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Full Name</label>
                    <input type="text" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Login ID</label>
                    <input type="text" required onChange={e => setFormData({...formData, loginId: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Password</label>
                    <input type="password" required onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Phone Number</label>
                    <input type="text" onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                </div>
                
                <button type="submit" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem' }}>
                    Create Faculty Profile
                </button>
            </form>
        </div>

      </div>
    </div>
  );
}
