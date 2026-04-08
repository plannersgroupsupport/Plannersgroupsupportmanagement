/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', loginId: '', password: '', role: 'ACCOUNTANT', phone: '' });

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => { 
          setStaff(data.filter((u: any) => u.role === 'ACCOUNTANT' || u.role === 'CERT_STAFF')); 
          setLoading(false); 
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      alert('Staff member created successfully!');
      window.location.reload();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Failed to create staff member.');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove staff member ${name}?`)) return;

    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
       alert('Staff member removed successfully.');
       setStaff(staff.filter(s => s.id !== id));
    } else {
       alert('Failed to remove staff member.');
    }
  };

  const filteredStaff = staff.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.loginId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Staff Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Administrative Directory</h3>
                <input 
                    type="text" 
                    placeholder="Search Staff..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', width: '200px' }}
                />
            </div>

            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Synchronizing Directory...</div> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem' }}>Full Name</th>
                    <th>Role / ID</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ fontWeight: '600' }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Technical Support Team</div>
                      </td>
                      <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            <span style={{ padding: '0.2rem 0.6rem', background: '#e0e7ff', color: 'var(--primary)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>{s.role.replace('_', ' ')}</span>
                            <code style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.loginId}</code>
                          </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                          <button 
                             onClick={() => handleRemove(s.id, s.name)}
                             style={{ background: 'var(--error)', padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer' }}
                          >
                             Remove
                          </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStaff.length === 0 && <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No staff members found.</td></tr>}
                </tbody>
              </table>
            )}
        </div>

        <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Add Staff Member</h3>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Department / Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="CERT_STAFF">Certificate Staff</option>
                    </select>
                </div>
                
                <button type="submit" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem' }}>
                    Create Staff Profile
                </button>
            </form>
        </div>

      </div>
    </div>
  );
}
