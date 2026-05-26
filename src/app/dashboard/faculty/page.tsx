'use client';

import { useEffect, useState } from 'react';

const LAB_OPTIONS = ['LAB-1', 'LAB-2', 'LAB-3', 'LAB-4', 'NONE'];

export default function FacultyPage() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', loginId: '', password: '', role: 'FACULTY', phone: '', labNumber: 'NONE' });
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', loginId: '', phone: '', password: '', labNumber: 'NONE' });
  const [saving, setSaving] = useState(false);

  const fetchFaculties = () => {
    setLoading(true);
    fetch('/api/users?role=FACULTY')
      .then(res => res.json())
      .then(data => { setFaculties(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { fetchFaculties(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, role: 'FACULTY' })
    });
    if (res.ok) {
      alert('Faculty profile created successfully!');
      setFormData({ name: '', loginId: '', password: '', role: 'FACULTY', phone: '', labNumber: 'NONE' });
      fetchFaculties();
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

  const openEdit = (faculty: any) => {
    const labName = faculty.facultyProfile?.lab?.name || 'NONE';
    setEditForm({
      name: faculty.name,
      loginId: faculty.loginId,
      phone: faculty.phone || '',
      password: '',
      labNumber: labName
    });
    setEditingFaculty(faculty);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      id: editingFaculty.id,
      name: editForm.name,
      loginId: editForm.loginId,
      phone: editForm.phone,
      labNumber: editForm.labNumber
    };
    if (editForm.password.trim()) payload.password = editForm.password;

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (res.ok) {
      alert('Faculty details updated successfully!');
      setEditingFaculty(null);
      fetchFaculties();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to update faculty.');
    }
  };

  const filteredFaculties = faculties.filter(f =>
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.loginId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLabColor = (lab: string | null | undefined) => {
    if (!lab || lab === 'NONE') return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      'LAB-1': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
      'LAB-2': { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
      'LAB-3': { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' },
      'LAB-4': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    };
    return colors[lab] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  };

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .fac-grid { grid-template-columns: 1fr !important; }
          .fac-h1 { font-size: 1.6rem !important; }
          .fac-card-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .fac-card-header input { width: 100% !important; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <h1 className="fac-h1" style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Faculty Management
      </h1>

      <div className="fac-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '2rem', alignItems: 'start' }}>

        {/* Faculty Roster */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fac-card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Faculty Roster</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{filteredFaculties.length} member{filteredFaculties.length !== 1 ? 's' : ''}</div>
            </div>
            <input
              type="text"
              placeholder="Search Faculty..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', width: '200px' }}
            />
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Synchronizing Roster...</div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Faculty Name</th>
                  <th>Login ID</th>
                  <th>Contact</th>
                  <th>Assigned Lab</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculties.map(f => {
                  const labName = f.facultyProfile?.lab?.name || null;
                  const lc = getLabColor(labName);
                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ fontWeight: '600' }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Faculty Member</div>
                      </td>
                      <td>
                        <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{f.loginId}</code>
                      </td>
                      <td>{f.phone || 'N/A'}</td>
                      <td>
                        <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
                          {labName || 'Unassigned'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEdit(f)}
                            style={{ background: '#f59e0b', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleRemove(f.id, f.name)}
                            style={{ background: 'var(--error)', padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFaculties.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No faculty members found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Faculty Form */}
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Add Faculty Member</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Assign a lab to restrict the faculty's student view to that lab only.</p>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Full Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Login ID *</label>
              <input type="text" required value={formData.loginId} onChange={e => setFormData({ ...formData, loginId: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Password *</label>
              <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Phone Number</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Assign Lab</label>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.15rem 0 0.4rem' }}>Faculty will only see students in this lab</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                {LAB_OPTIONS.map(lab => {
                  const lc = getLabColor(lab);
                  const isSelected = formData.labNumber === lab;
                  return (
                    <label key={lab} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `2px solid ${isSelected ? lc.border : 'var(--border)'}`, background: isSelected ? lc.bg : 'transparent', cursor: 'pointer', transition: 'all 0.15s', fontWeight: isSelected ? '700' : '400', color: isSelected ? lc.color : 'var(--foreground)', fontSize: '0.85rem' }}>
                      <input type="radio" name="lab" value={lab} checked={isSelected} onChange={() => setFormData({ ...formData, labNumber: lab })} style={{ display: 'none' }} />
                      {lab === 'NONE' ? '🚫 No Lab' : `🖥️ ${lab}`}
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '0.5rem' }}>
              ➕ Create Faculty Profile
            </button>
          </form>
        </div>
      </div>

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setEditingFaculty(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: '#f1f5f9', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>×</button>

            <h3 style={{ marginBottom: '0.25rem' }}>✏️ Edit Faculty Details</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Editing: <strong>{editingFaculty.name}</strong></p>

            <form onSubmit={handleEditSave} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Full Name *</label>
                <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Login ID *</label>
                <input type="text" required value={editForm.loginId} onChange={e => setEditForm({ ...editForm, loginId: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Phone Number</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.25rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>New Password</label>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.1rem 0 0.3rem' }}>Leave blank to keep current password</p>
                <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Assigned Lab</label>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.15rem 0 0.4rem' }}>Faculty will only see students in this lab</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {LAB_OPTIONS.map(lab => {
                    const lc = getLabColor(lab);
                    const isSelected = editForm.labNumber === lab;
                    return (
                      <label key={lab} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `2px solid ${isSelected ? lc.border : 'var(--border)'}`, background: isSelected ? lc.bg : 'transparent', cursor: 'pointer', transition: 'all 0.15s', fontWeight: isSelected ? '700' : '400', color: isSelected ? lc.color : 'var(--foreground)', fontSize: '0.85rem' }}>
                        <input type="radio" name="editLab" value={lab} checked={isSelected} onChange={() => setEditForm({ ...editForm, labNumber: lab })} style={{ display: 'none' }} />
                        {lab === 'NONE' ? '🚫 No Lab' : `🖥️ ${lab}`}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingFaculty(null)} style={{ padding: '0.9rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#64748b' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ padding: '0.9rem', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
