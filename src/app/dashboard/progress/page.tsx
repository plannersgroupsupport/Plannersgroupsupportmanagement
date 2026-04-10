'use client';

import { useState, useEffect } from 'react';

export default function StudentProgress() {
  const [sslcFile, setSslcFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchProfile = async () => {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    
    if (authCookie) {
        try {
            const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
            const res = await fetch(`/api/profile?userId=${decoded.id}`);
            const data = await res.json();
            setUser(data);
        } catch (e) { console.error('Profile fetch error', e); }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpload = async (file: File | null, type: 'SSLC' | 'PHOTO') => {
    if (!file || !user) return;

    setUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    formData.append('type', type);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      alert(`${type} uploaded successfully!`);
      fetchProfile();
    } else {
      alert(`Failed to upload ${type}.`);
    }
    setUploading(null);
  };

  const hasSslc = user?.fileUploads?.some((f: any) => f.type === 'SSLC');
  const hasPhoto = user?.fileUploads?.some((f: any) => f.type === 'PHOTO');

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .prog-grid { grid-template-columns: 1fr !important; }
          .prog-h1 { font-size: 1.5rem !important; }
        }
      `}</style>
      <h1 className="prog-h1" style={{ fontSize: '2rem', marginBottom: '1rem' }}>My Progress & Documents</h1>
      
      <div style={{ background: '#fff9db', border: '1px solid #fcc419', color: '#856404', padding: '1rem', borderRadius: '6px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>
            <strong>Certification Notice:</strong> Your SSLC certificate and photo are utilized solely for official certification purposes. Please ensure they are clear and authentic.
        </p>
      </div>

      <div className="prog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* SSLC Upload Section */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>SSLC Certificate (PDF)</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>Please upload your SSLC in PDF format for verification.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                    type="file" 
                    accept=".pdf"
                    onChange={e => setSslcFile(e.target.files?.[0] || null)} 
                    style={{ border: '1px dashed var(--border)', padding: '0.75rem', borderRadius: '4px', width: '100%' }} 
                />
                <button 
                    onClick={() => handleUpload(sslcFile, 'SSLC')} 
                    disabled={!sslcFile || uploading === 'SSLC'}
                    style={{ background: hasSslc ? 'var(--success)' : 'var(--primary)' }}
                >
                    {uploading === 'SSLC' ? 'Uploading...' : (hasSslc ? '✓ Update SSLC PDF' : 'Upload SSLC PDF')}
                </button>
                {hasSslc && <p style={{ fontSize: '0.75rem', color: 'var(--success)', margin: 0 }}>✓ Document received and ready for certification! </p>}
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Passport Size Photo</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>Upload a clear photo for your certificate. (JPG/PNG)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setPhotoFile(e.target.files?.[0] || null)} 
                    style={{ border: '1px dashed var(--border)', padding: '0.75rem', borderRadius: '4px', width: '100%' }} 
                />
                <button 
                    onClick={() => handleUpload(photoFile, 'PHOTO')} 
                    disabled={!photoFile || uploading === 'PHOTO'}
                    style={{ background: hasPhoto ? 'var(--success)' : 'var(--primary)' }}
                >
                    {uploading === 'PHOTO' ? 'Uploading...' : (hasPhoto ? '✓ Update Photo' : 'Upload Photo')}
                </button>
                {hasPhoto && <p style={{ fontSize: '0.75rem', color: 'var(--success)', margin: 0 }}>✓ Photo received and ready for certification! </p>}
            </div>
          </div>
      </div>

      <div className="card">
         <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Academic Progress</h3>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '6px' }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Current Course</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(Array.isArray(user?.studentProfile) ? user?.studentProfile[0]?.currentStatus : user?.studentProfile?.currentStatus) || 'Autocad'}</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '6px' }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Attendance</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>Active Progress</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '6px', gridColumn: '1 / -1' }}>
                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Course Status</p>
                <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>In Progress (Faculty marked remaining duration)</p>
            </div>
         </div>
      </div>
    </div>
  );
}
