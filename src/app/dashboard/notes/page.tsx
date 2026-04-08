'use client';
import { useState, useEffect } from 'react';

export default function FacultyNotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState('');

  const fetchNotes = async (uId?: string) => {
    const url = uId ? `/api/notes?userId=${uId}` : '/api/notes';
    const res = await fetch(url);
    const data = await res.json();
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let uId = '';
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    if (authCookie) {
        try {
            const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
            setRole(decoded.role);
            uId = decoded.id;
        } catch {}
    }
    fetchNotes(uId);
  }, []);

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
        const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setNotes(notes.filter(n => n.id !== id));
        } else {
            alert('Failed to remove note.');
        }
    } catch {
        alert('An error occurred while deleting.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    let userId = '';
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    if (authCookie) {
        try {
            const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
            userId = decoded.id;
        } catch {}
    }

    if (!userId) {
        alert('You must be logged in to upload notes.');
        setUploading(false);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'NOTES');
    formData.append('course', selectedCourse);

    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        alert(`Study Material "${file.name}" uploaded successfully for ${selectedCourse || 'All Courses'}!`);
        setFile(null);
        setSelectedCourse('');
        fetchNotes();
        const fileInput = document.getElementById('noteUploadInput') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    } else {
        alert('Failed to upload material.');
    }
    setUploading(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        {role === 'STUDENT' ? 'Study Materials' : 'Upload Study Materials'}
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        {role === 'STUDENT' ? 'View and download study materials shared by your faculty.' : "Share PDF notes and image resources directly into your students' portals."}
      </p>

      {role !== 'STUDENT' && (
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Distribute File</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Max file size: 10MB.</p>
        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Assignment Course</label>
            <select 
                value={selectedCourse} 
                onChange={e => setSelectedCourse(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'white' }}
            >
                <option value="">Public (All Courses)</option>
                {['REVIT', 'REVIT(BIM)', 'AUTOCAD', '3DS MAX', 'SKETCHUP', 'LUMION', 'INTERIOR DESIGNING', 'VASTU', 'QUANTITY SURVEY', 'ESTIMATION'].map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Select File</label>
            <input id="noteUploadInput" type="file" required onChange={e => setFile(e.target.files?.[0] || null)} style={{ border: '1px dashed var(--border)', padding: '0.75rem', width: '100%', borderRadius: '6px', cursor: 'pointer', background: 'white', fontSize: '0.85rem' }} />
          </div>
          <button type="submit" disabled={uploading || !file} style={{ padding: '0.85rem 2rem', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : 'Upload to Portal'}
          </button>
        </form>
      </div>
      )}

      <div className="card">
        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{role === 'STUDENT' ? 'Available Materials' : 'Uploaded Materials'}</h3>
        {loading ? (
             <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>Loading notes...</p>
        ) : notes.length === 0 ? (
             <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No study materials uploaded yet.</p>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notes.map(note => (
                    <div key={note.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {note.url.split('-').slice(1).join('-') || note.url.split('/').pop()}
                                {note.course && (
                                    <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase' }}>{note.course}</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                                Uploaded by {note.user?.name || 'System'} on {new Date(note.uploadedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <a href={note.url} target="_blank" rel="noopener noreferrer" style={{ background: 'white', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                {role === 'STUDENT' ? 'Download' : 'View File'}
                            </a>
                            {role !== 'STUDENT' && (
                            <button onClick={() => handleDelete(note.id, note.url.split('-').slice(1).join('-') || note.url.split('/').pop() || '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                Remove
                            </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
