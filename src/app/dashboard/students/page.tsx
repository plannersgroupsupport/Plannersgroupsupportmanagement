/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('none');
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('STUDENTS'); // STUDENTS or RESETS
  
  const [formData, setFormData] = useState({
    name: '',
    admissionNo: '',
    loginId: '',
    password: '',
    email: '',
    phone: '',
    role: 'STUDENT',
    packageType: 'BASIC',
    currentStatus: 'Autocad',
    admissionDate: new Date().toISOString().split('T')[0],
    dob: '',
    sex: 'MALE',
    batch: 'MORNING',
    labNumber: 'LAB-1',
    collegeName: '',
    courseStartDate: new Date().toISOString().split('T')[0],
    fatherName: '',
    fatherPhone: '',
    address: '',
    district: '',
    taluk: '',
    pincode: '',
    isPlaced: false,
    placedAt: '',
    courses: [] as string[]
  });

  useEffect(() => {
    fetch('/api/users?role=STUDENT')
      .then(res => res.json())
      .then(data => { setStudents(data); setLoading(false); });

    // Get role from session cookie
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    if (authCookie) {
        try {
            const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
            setRole(decoded.role);
            if (decoded.role === 'SUPERADMIN') {
                fetch('/api/password-reset')
                    .then(res => res.json())
                    .then(data => setResetRequests(data || []));
            }
        } catch {}
    }
  }, []);

  const handleResolveReset = async (id: string) => {
    const res = await fetch('/api/password-reset', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'RESOLVED' })
    });
    if (res.ok) {
        setResetRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r));
    }
  };
  
  const handleDeleteReset = async (id: string) => {
    if (!confirm('Are you sure you want to remove this reset request?')) return;
    const res = await fetch(`/api/password-reset?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
        setResetRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'DELETED' } : r));
        // Or filter it out immediately
        setResetRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    let val = e.target.value;
    if (val && !val.startsWith('+91')) {
        val = '+91 ' + val.replace(/^\+91\s*/, '');
    }
    setFormData({...formData, [field]: val});
  };

  const handleCourseChange = (course: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(course) 
        ? prev.courses.filter(c => c !== course) 
        : [...prev.courses, course]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch('/api/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        id: editingId,
        courseName: formData.courses.join(', ') || 'General'
      })
    });
    if (res.ok) {
      alert(editingId ? 'Student updated successfully!' : 'Student created successfully!');
      setEditingId(null);
      window.location.reload();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Failed to process request.');
    }
  };

  const handleEdit = (student: any) => {
    const profile = Array.isArray(student.studentProfile) ? student.studentProfile[0] : student.studentProfile;
    setEditingId(student.id);
    setFormData({
      name: student.name,
      admissionNo: profile?.admissionNo || '',
      loginId: student.loginId,
      password: '', // Keep blank unless resetting
      email: student.email || '',
      phone: student.phone || '',
      role: 'STUDENT',
      packageType: profile?.packageType || 'BASIC',
      currentStatus: profile?.currentStatus || 'Autocad',
      admissionDate: profile?.admissionDate?.split('T')[0] || '',
      dob: profile?.dob?.split('T')[0] || '',
      sex: profile?.sex || 'MALE',
      batch: profile?.batch || 'MORNING',
      labNumber: profile?.labNumber || 'LAB-1',
      collegeName: profile?.collegeName || '',
      courseStartDate: profile?.courseStartDate?.split('T')[0] || '',
      fatherName: profile?.fatherName || '',
      fatherPhone: profile?.fatherPhone || '',
      address: profile?.address || '',
      district: profile?.district || '',
      taluk: profile?.taluk || '',
      pincode: profile?.pincode || '',
      isPlaced: profile?.isPlaced || false,
      placedAt: profile?.placedAt || '',
      courses: profile?.courseName ? profile.courseName.split(', ') : []
    });
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove student ${name}? This will delete all their records, including fees and files.`)) return;

    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
       alert('Student removed successfully.');
       setStudents(students.filter(s => s.id !== id));
    } else {
       alert('Failed to remove student.');
    }
  };

  const handleDownloadPhoto = (student: any) => {
    const photos = (student.fileUploads || []).filter((f: any) => f.type === 'PHOTO');
    if (photos.length === 0) {
      alert("No profile photo found for this student.");
      return;
    }
    // Provide the latest photo
    const photo = photos.sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())[0];
    
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${student.name.replace(/\s+/g, '_')}_photo${photo.url.substring(photo.url.lastIndexOf('.'))}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlacementUpdate = async (studentId: string, company: string, isPlaced: boolean) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: studentId, isPlaced, placedAt: company })
    });
    if (res.ok) {
       setStudents(prev => prev.map(s => {
         if (s.id === studentId) {
            const up = Array.isArray(s.studentProfile) ? { ...s.studentProfile[0], isPlaced, placedAt: company } : { ...s.studentProfile, isPlaced, placedAt: company };
            return { ...s, studentProfile: Array.isArray(s.studentProfile) ? [up] : up };
         }
         return s;
       }));
    } else {
       alert("Failed to update placement");
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          studentProfile: Array.isArray(s.studentProfile) 
            ? [{ ...s.studentProfile[0], currentStatus: newStatus }]
            : { ...s.studentProfile, currentStatus: newStatus }
        }
      }
      return s;
    }));

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: studentId, currentStatus: newStatus })
    });
    if (!res.ok) {
       alert("Failed to update status");
       window.location.reload();
    }
  };

  const handleApprove = async (studentId: string, name: string) => {
    if (!confirm(`Confirm registration for ${name}? User will be able to login immediately.`)) return;

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: studentId, isApproved: true })
    });

    if (res.ok) {
       setStudents(prev => prev.map(s => s.id === studentId ? { ...s, isApproved: true } : s));
    } else {
       alert("Failed to approve student.");
    }
  };

  let filteredStudents = [...students].filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.loginId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(s.studentProfile) ? s.studentProfile[0] : s.studentProfile)?.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortBy === 'lab') {
      filteredStudents.sort((a, b) => {
          const labA = (Array.isArray(a.studentProfile) ? a.studentProfile[0] : a.studentProfile)?.labNumber || '';
          const labB = (Array.isArray(b.studentProfile) ? b.studentProfile[0] : b.studentProfile)?.labNumber || '';
          return labA.localeCompare(labB);
      });
  } else if (sortBy === 'name') {
      filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div style={{ position: 'relative' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Student Management</h1>
      
      {/* Search Bar */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
              type="text" 
              placeholder="Search by Name, ID, or Admission No..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '250px', padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }}
          >
              <option value="none">Sort By: Default</option>
              <option value="name">Sort By: Name</option>
              <option value="lab">Sort By: Lab Number</option>
          </select>
          {role === 'SUPERADMIN' && (
              <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setActiveTab('STUDENTS')}
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none', background: activeTab === 'STUDENTS' ? 'var(--primary)' : 'transparent', color: activeTab === 'STUDENTS' ? 'white' : 'var(--foreground)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Student Roster
                  </button>
                  <button 
                    onClick={() => setActiveTab('RESETS')}
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none', background: activeTab === 'RESETS' ? 'var(--primary)' : 'transparent', color: activeTab === 'RESETS' ? 'white' : 'var(--foreground)', cursor: 'pointer', fontWeight: 'bold', position: 'relative' }}
                  >
                    Reset Requests
                    {resetRequests.filter(r => r.status === 'PENDING').length > 0 && (
                        <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--error)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {resetRequests.filter(r => r.status === 'PENDING').length}
                        </span>
                    )}
                  </button>
              </div>
          )}
      </div>

      {activeTab === 'RESETS' ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ margin: 0 }}>Active Password Reset Requests</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>Students requesting credential recovery. Verify their details before changing passwords.</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '1rem' }}>Student Details</th>
                          <th>Admission No</th>
                          <th>Login ID</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {resetRequests.map(req => (
                          <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '1.25rem 1rem' }}>
                                  <div style={{ fontWeight: '700' }}>{req.fullName}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Requested {new Date(req.createdAt).toLocaleString()}</div>
                              </td>
                              <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{req.admissionNo}</code></td>
                              <td><code>{req.loginId}</code></td>
                              <td>{req.phoneNumber}</td>
                              <td>
                                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', background: req.status === 'PENDING' ? '#fffbeb' : '#f1f5f9', color: req.status === 'PENDING' ? '#b45309' : '#64748b', fontWeight: 'bold', border: '1px solid currentColor' }}>
                                      {req.status}
                                  </span>
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                      {req.status === 'PENDING' && (
                                          <button 
                                            onClick={() => handleResolveReset(req.id)}
                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                                          >
                                              Resolve
                                          </button>
                                      )}
                                      <button 
                                        onClick={() => handleDeleteReset(req.id)}
                                        style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                                      >
                                          Delete
                                      </button>
                                      <button 
                                        onClick={() => {
                                            const student = students.find(s => s.loginId === req.loginId);
                                            if (student) {
                                                handleEdit(student);
                                                setActiveTab('STUDENTS');
                                            } else {
                                                alert("Student not found in roster.");
                                            }
                                        }}
                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                                      >
                                          Reset Password
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {resetRequests.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No password reset requests found.</td></tr>
                      )}
                  </tbody>
              </table>
              </div>
          </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: role === 'SUPERADMIN' ? '1fr 400px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Student List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Registered Students</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{filteredStudents.length} Students Total</span>
            </div>
            
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Synchronizing Students...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem' }}>Student Info</th>
                      <th>Batch / Lab</th>
                      <th>Class Status</th>
                      <th>Account</th>
                      <th>Package</th>
                      <th>Placement</th>
                      <th>Courses</th>
                      <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => {
                      const profile = Array.isArray(s.studentProfile) ? s.studentProfile[0] : s.studentProfile;
                      return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '1.25rem 1rem' }}>
                            <div style={{ fontWeight: '600' }}>{s.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{profile?.admissionNo || 'No ID'} • {s.loginId}</div>
                        </td>
                        <td>
                            <div style={{ fontSize: '0.85rem' }}>{profile?.batch || 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{profile?.labNumber || 'N/A'}</div>
                        </td>
                        <td>
                            {role === 'FACULTY' || role === 'SUPERADMIN' ? (
                                <select 
                                    value={profile?.currentStatus || 'Autocad'}
                                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                    style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white' }}
                                >
                                    <option value="Autocad">Autocad</option>
                                    <option value="Exterior">Exterior</option>
                                    <option value="Interior">Interior</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            ) : (
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid var(--border)' }}>{profile?.currentStatus || 'Autocad'}</span>
                            )}
                        </td>
                        <td>
                            <span style={{ 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700',
                                background: s.isApproved ? '#ecfdf5' : '#fff7ed', 
                                color: s.isApproved ? '#059669' : '#c2410c', 
                                border: s.isApproved ? '1px solid #34d399' : '1px solid #fbbf24' 
                            }}>
                                {s.isApproved ? 'Approved' : 'Pending'}
                            </span>
                        </td>
                        <td>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', background: profile?.packageType === 'PREMIUM' ? '#fdf2f8' : '#eff6ff', color: profile?.packageType === 'PREMIUM' ? '#db2777' : '#2563eb', border: profile?.packageType === 'PREMIUM' ? '1px solid #fbcfe8' : '1px solid #bfdbfe' }}>{profile?.packageType || 'BASIC'}</span>
                        </td>
                        <td>
                            {(role === 'FACULTY' || role === 'SUPERADMIN') ? (
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Placed At..." 
                                        defaultValue={profile?.placedAt || ''}
                                        onBlur={(e) => handlePlacementUpdate(s.id, e.target.value, e.target.value.length > 0)}
                                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', width: '120px' }}
                                    />
                                    {profile?.isPlaced && <span title="Placed" style={{ cursor: 'help' }}>✅</span>}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: profile?.isPlaced ? 'var(--success)' : '#64748b' }}>
                                    {profile?.isPlaced ? `Placed: ${profile.placedAt}` : 'Not Placed'}
                                </div>
                            )}
                        </td>
                        <td style={{ maxWidth: '200px' }}>
                            <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.courseName || 'General'}</div>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {(role === 'FACULTY' || role === 'SUPERADMIN') && (
                                    <button 
                                        onClick={() => handleDownloadPhoto(s)} 
                                        className="btn-secondary" 
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc' }}
                                        title="Download Profile Photo"
                                    >
                                        📷 ↓
                                    </button>
                                )}
                                <button onClick={() => setViewingStudent(s)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Details</button>
                                {role === 'SUPERADMIN' && (
                                    <>
                                        {!s.isApproved && (
                                            <button 
                                                onClick={() => handleApprove(s.id, s.name)} 
                                                style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(s)} style={{ background: '#f59e0b', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => handleRemove(s.id, s.name)} style={{ background: 'var(--error)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Remove</button>
                                    </>
                                )}
                            </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Admin Sidebar */}
        {role === 'SUPERADMIN' && (
        <div className="card" style={{ position: 'sticky', top: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingId ? 'Edit Student' : 'New Registration'}
                {editingId && <button onClick={() => { setEditingId(null); window.location.reload(); }} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}>Cancel</button>}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                
                <SectionTitle title="Identity" />
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <FloatInput label="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <FloatInput label="Login ID" required value={formData.loginId} onChange={e => setFormData({...formData, loginId: e.target.value})} />
                        <FloatInput label={editingId ? "Update Password" : "Password"} type="password" placeholder={editingId ? 'Leave blank to keep' : 'Password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                </div>

                <SectionTitle title="Academic Timeline" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <DateInput label="Admission Date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                    <DateInput label="Course Start" value={formData.courseStartDate} onChange={e => setFormData({...formData, courseStartDate: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FloatInput label="Admission No" placeholder="ADM-XXXXXX" value={formData.admissionNo} onChange={e => setFormData({...formData, admissionNo: e.target.value})} />
                    <FloatInput label="College Name" value={formData.collegeName} onChange={e => setFormData({...formData, collegeName: e.target.value})} />
                </div>

                <SectionTitle title="Personal Details" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <DateInput label="Date of Birth" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                    <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FloatInput label="Mobile Number" value={formData.phone} onChange={e => handlePhoneChange(e, 'phone')} />
                    <FloatInput label="Email ID" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <SectionTitle title="Family & Residence" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <FloatInput label="Father's Name" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                    <FloatInput label="Father's Number" value={formData.fatherPhone} onChange={e => handlePhoneChange(e, 'fatherPhone')} />
                </div>
                <textarea placeholder="Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', height: '80px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <FloatInput label="District" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                    <FloatInput label="Taluk" value={formData.taluk} onChange={e => setFormData({...formData, taluk: e.target.value})} />
                    <FloatInput label="Pincode" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                </div>

                <SectionTitle title="Batch & Course" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <select value={formData.currentStatus} onChange={e => setFormData({...formData, currentStatus: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <option value="Autocad">Status: Autocad</option>
                        <option value="Exterior">Status: Exterior</option>
                        <option value="Interior">Status: Interior</option>
                        <option value="Completed">Status: Completed</option>
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <select value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                        <option value="EVENING">Evening</option>
                    </select>
                    <select value={formData.labNumber} onChange={e => setFormData({...formData, labNumber: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <option value="LAB-1">Lab 1</option>
                        <option value="LAB-2">Lab 2</option>
                        <option value="LAB-3">Lab 3</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <label style={{ flex: 1, textAlign: 'center', padding: '0.4rem', borderRadius: '6px', background: formData.packageType === 'BASIC' ? 'var(--primary)' : 'white', color: formData.packageType === 'BASIC' ? 'white' : 'inherit', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                        <input type="radio" checked={formData.packageType === 'BASIC'} onChange={() => setFormData({...formData, packageType: 'BASIC'})} style={{ display: 'none' }} /> BASIC
                    </label>
                    <label style={{ flex: 1, textAlign: 'center', padding: '0.4rem', borderRadius: '6px', background: formData.packageType === 'PREMIUM' ? 'var(--primary)' : 'white', color: formData.packageType === 'PREMIUM' ? 'white' : 'inherit', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                        <input type="radio" checked={formData.packageType === 'PREMIUM'} onChange={() => setFormData({...formData, packageType: 'PREMIUM'})} style={{ display: 'none' }} /> PREMIUM
                    </label>
                </div>

                <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Select Courses</label>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'grid', gap: '0.4rem' }}>
                        {['REVIT', 'REVIT(BIM)', 'AUTOCAD', '3DS MAX', 'SKETCHUP', 'LUMION', 'INTERIOR DESIGNING', 'VASTU', 'QUANTITY SURVEY', 'ESTIMATION'].map(c => (
                            <label key={c} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={formData.courses.includes(c)} onChange={() => handleCourseChange(c)} /> {c}
                            </label>
                        ))}
                    </div>
                </div>

                {editingId && (
                  <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <SectionTitle title="Placement Status" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" checked={formData.isPlaced} onChange={e => setFormData({ ...formData, isPlaced: e.target.checked })} />
                          <label style={{ fontSize: '0.85rem' }}>Mark as Placed</label>
                      </div>
                      <FloatInput label="Placed Company / Location" value={formData.placedAt} onChange={e => setFormData({ ...formData, placedAt: e.target.value })} />
                  </div>
                )}

                <div style={{ position: 'sticky', bottom: 0, padding: '1rem 0', background: 'var(--surface)' }}>
                    <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        {editingId ? '💾 Update Records' : '➕ Complete Registration'}
                    </button>
                </div>
            </form>
        </div>
        )}
      </div>
      )}

      {/* Student Details Modal */}
      {viewingStudent && (() => {
          const profile = Array.isArray(viewingStudent.studentProfile) ? viewingStudent.studentProfile[0] : viewingStudent.studentProfile;
          return (
          <div style={{ position: 'fixed', inset: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
              <div className="card" style={{ 
                  maxWidth: '800px', 
                  width: '100%', 
                  maxHeight: '95vh', 
                  overflowY: 'auto', 
                  padding: '2.5rem', 
                  position: 'relative', 
                  animation: 'slideIn 0.3s ease-out',
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}>
                  <button 
                    onClick={() => setViewingStudent(null)} 
                    style={{ 
                        position: 'absolute', 
                        top: '1.25rem', 
                        right: '1.25rem', 
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    ×
                  </button>
                  
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                          {viewingStudent.name[0]}
                      </div>
                      <h2 style={{ margin: 0 }}>{viewingStudent.name}</h2>
                      <p style={{ color: '#64748b', margin: '0.5rem 0' }}>{viewingStudent.loginId} • {profile?.admissionNo}</p>
                      
                      {role === 'SUPERADMIN' && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
                            <strong>Security Note:</strong> Student passwords can be reset via the "Edit" panel in the management view.
                        </div>
                      )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div>
                          <SectionTitle title="Academic Profile" />
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                              <DetailRow label="Admission No" value={profile?.admissionNo} />
                              <DetailRow label="Batch" value={profile?.batch} />
                              <DetailRow label="Lab Number" value={profile?.labNumber} />
                              <DetailRow label="College" value={profile?.collegeName} />
                              <DetailRow label="Courses" value={profile?.courseName} />
                          </div>
                      </div>
                      <div>
                          <SectionTitle title="Personal & Contact" />
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                              <DetailRow label="Date of Birth" value={profile?.dob?.split('T')[0]} />
                              <DetailRow label="Sex" value={profile?.sex} />
                              <DetailRow label="Mobile" value={viewingStudent.phone} />
                              <DetailRow label="Email" value={viewingStudent.email} />
                          </div>
                      </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                      <div>
                          <SectionTitle title="Home Address" />
                          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', minHeight: '100px' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>{profile?.address || 'Address not registered'}</p>
                              <div style={{ marginTop: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                {profile?.taluk ? `${profile.taluk}, ` : ''}{profile?.district}, {profile?.pincode}
                              </div>
                          </div>
                      </div>
                      <div>
                          <SectionTitle title="Family Contacts" />
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                              <DetailRow label="Father's Name" value={profile?.fatherName} />
                              <DetailRow label="Father's Number" value={profile?.fatherPhone} />
                          </div>
                          <SectionTitle title="Timelines" />
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <DetailRow label="Admitted On" value={profile?.admissionDate?.split('T')[0]} />
                            <DetailRow label="Course Started" value={profile?.courseStartDate?.split('T')[0]} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          );
      })()}

      <style jsx>{`
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .btn-secondary {
            background: var(--surface);
            border: 1px solid var(--border);
            color: #64748b;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .btn-secondary:hover {
            border-color: var(--primary);
            color: var(--primary);
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
    return (
        <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem', marginTop: '1rem' }}>
            {title}
        </label>
    );
}

function FloatInput({ label, required = false, type = 'text', placeholder = '', value = '', onChange }: { label: string, required?: boolean, type?: string, placeholder?: string, value?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>{label}{required && '*'}</label>
            <input type={type} placeholder={placeholder} value={value} required={required} onChange={onChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
        </div>
    );
}

function DateInput({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
            <input type="date" value={value} onChange={onChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
        </div>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#64748b' }}>{label}:</span>
            <span style={{ fontWeight: '600' }}>{value || 'Not Set'}</span>
        </div>
    );
}
