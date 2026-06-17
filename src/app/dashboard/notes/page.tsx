/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';

const AUTOCAD_CATEGORIES = ['traditional', 'contemporary', 'colonial', 'sanction', '4 side elevation', 'landscape', 'electrical', 'isometric', 'Temple', 'Mosque', 'Church', 'Grid drawing', 'Centerline', 'Commercial', 'Setout'];
const THREED_EXTERIOR = ['traditional', 'contemporary', 'colonial'];
const THREED_INTERIOR = ['bedroom', 'bathroom', 'dinning', 'living', 'kitchen'];
const LUMION_OPTIONS = ['Option 1', 'Option 2', 'Option 3'];

export default function ProjectSubmissionPage() {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Student state
  const [studentCourses, setStudentCourses] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  // Faculty state
  const [facultyLabNumber, setFacultyLabNumber] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentProjects, setStudentProjects] = useState<any[]>([]);

  useEffect(() => {
    let uId = '';
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    if (authCookie) {
        try {
            const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
            setRole(decoded.role);
            uId = decoded.id;
            setUserId(uId);
        } catch {}
    }

    if (uId) {
       // Fetch user profile to get enrolled courses or lab config
       fetch(`/api/users?role=STUDENT`)
         .then(res => res.json())
         .then(studentList => {
             if (Array.isArray(studentList)) {
                 setStudents(studentList);
                 const myStudentProfile = studentList.find(s => s.id === uId);
                 if (myStudentProfile && myStudentProfile.studentProfile?.courseName) {
                     setStudentCourses(myStudentProfile.studentProfile.courseName);
                 }
             }
         });
         
       fetch('/api/users?role=FACULTY')
         .then(res => res.json())
         .then(facultyList => {
             const me = facultyList.find((f: any) => f.id === uId);
             if (me?.facultyProfile?.lab?.name) {
                 setFacultyLabNumber(me.facultyProfile.lab.name);
             }
         });
         
       fetchProjects(uId);
    }
  }, []);

  const fetchProjects = async (uId: string) => {
    const res = await fetch(`/api/notes?userId=${uId}&type=PROJECT`);
    const data = await res.json();
    setProjects(data || []);
    setLoading(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, courseKey: string, requirePdf: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (requirePdf && file.type !== 'application/pdf') {
        alert('This section requires PDF documents only.');
        event.target.value = '';
        return;
    }

    if (!requirePdf) {
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            alert('Images should be in PNG or JPG format.');
            event.target.value = '';
            return;
        }
        if (file.size > 7 * 1024 * 1024) {
            alert(`File size exceeds 7MB (Your file: ${(file.size/1024/1024).toFixed(1)}MB). Please compress and try again.`);
            event.target.value = '';
            return;
        }
    }

    setUploadingCategory(courseKey);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'PROJECT');
    formData.append('course', courseKey);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            alert('Project submitted successfully!');
            fetchProjects(userId);
        } else {
            alert('Failed to upload project.');
        }
    } catch {
        alert('Network error during upload.');
    } finally {
        setUploadingCategory(null);
        event.target.value = '';
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to remove sequence: "${filename}"?`)) return;
    try {
        const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setProjects(projects.filter(p => p.id !== id));
            if (selectedStudent) {
               setStudentProjects(studentProjects.filter(p => p.id !== id));
            }
        } else {
            alert('Failed to remove project.');
        }
    } catch {
        alert('An error occurred.');
    }
  };

  const handleSelectStudent = async (student: any) => {
      setSelectedStudent(student);
      setStudentProjects([]);
      const res = await fetch(`/api/notes?userId=${student.id}&type=PROJECT`);
      const data = await res.json();
      setStudentProjects(data || []);
  };

  const hasCourse = (term: string) => {
      return new RegExp(term, 'i').test(studentCourses);
  };

  const getUploadedProject = (courseKey: string, arr: any[] = projects) => {
      return arr.find(p => p.course === courseKey);
  };

  // Student Views Map Configuration
  const renderSubheading = (title: string, keys: string[], prefix: string, requiresPdf: boolean) => {
      return (
          <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase' }}>
                  {title}
                  {!requiresPdf && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#f59e0b', background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>PNG/JPG • Max 7MB</span>}
                  {requiresPdf && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#10b981', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>PDF Only</span>}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {keys.map(k => {
                      const courseKey = `${prefix}_${k}`;
                      const proj = getUploadedProject(courseKey);
                      return (
                          <div key={courseKey} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ fontWeight: '600', textTransform: 'uppercase' }}>{k}</div>
                              {proj ? (
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <a href={proj.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', background: 'var(--primary)', color: 'white', padding: '0.4rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}>View</a>
                                      <button onClick={() => handleDelete(proj.id, k)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                  </div>
                              ) : (
                                  <div>
                                      <label style={{ display: 'block', background: 'white', border: '1px dashed var(--primary)', color: 'var(--primary)', textAlign: 'center', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                          {uploadingCategory === courseKey ? 'Uploading...' : 'Upload File'}
                                          <input type="file" style={{ display: 'none' }} accept={requiresPdf ? "application/pdf" : "image/png, image/jpeg"} onChange={e => handleUpload(e, courseKey, requiresPdf)} disabled={uploadingCategory !== null} />
                                      </label>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Project Submission Panel...</div>;

  // Faculty Layout
  if (role === 'FACULTY' || role === 'SUPERADMIN') {
      const filteredStudents = facultyLabNumber ? students.filter(s => Array.isArray(s.studentProfile) ? s.studentProfile[0]?.labNumber === facultyLabNumber : s.studentProfile?.labNumber === facultyLabNumber) : students;
      
      return (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '85vh', gap: '1rem' }}>
              <div>
                  <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Student Projects Viewer</h1>
                  <p style={{ color: '#64748b' }}>Select a student from your assigned lab to view and download their submitted projects.</p>
                  {facultyLabNumber && <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Constrained to {facultyLabNumber}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '2rem', flex: 1 }}>
                  {/* Left Sidebar - Student List */}
                  <div className="card" style={{ overflowY: 'auto', maxHeight: '70vh', padding: '1rem' }}>
                      <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Your Students</h3>
                      {filteredStudents.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No students found in lab.</div> : 
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {filteredStudents.map(s => (
                                  <button 
                                      key={s.id} 
                                      onClick={() => handleSelectStudent(s)}
                                      style={{ 
                                          padding: '0.75rem', textAlign: 'left', borderRadius: '8px', 
                                          background: selectedStudent?.id === s.id ? 'var(--primary)' : '#f8fafc', 
                                          color: selectedStudent?.id === s.id ? 'white' : 'var(--foreground)',
                                          border: selectedStudent?.id === s.id ? '1px solid transparent' : '1px solid #e2e8f0',
                                          cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', fontSize: '0.9rem' 
                                      }}
                                  >
                                      {s.name}
                                  </button>
                              ))}
                          </div>
                      }
                  </div>

                  {/* Right View - Project Gallery */}
                  <div className="card" style={{ overflowY: 'auto', maxHeight: '70vh', padding: '1.5rem' }}>
                      {!selectedStudent ? (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                              Select a student to view their projects.
                          </div>
                      ) : (
                          <div>
                              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
                                  <div>
                                      <h2 style={{ margin: 0, color: 'var(--primary)' }}>{selectedStudent.name}'s Projects</h2>
                                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Enrolled: {selectedStudent.studentProfile?.courseName || 'N/A'}</div>
                                  </div>
                                  <span style={{ background: '#ecfdf5', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid #a7f3d0', fontWeight: 'bold' }}>
                                      {studentProjects.length} Uploads
                                  </span>
                              </div>

                              {studentProjects.length === 0 ? (
                                  <p style={{ color: '#64748b' }}>This student hasn't submitted any projects yet.</p>
                              ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                      {studentProjects.map(p => (
                                          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                  {p.course?.replace('_', ' » ')}
                                              </div>
                                              
                                              {p.url.toLowerCase().endsWith('.pdf') ? (
                                                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#e2e8f0', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold', color: '#ef4444' }}>PDF Document</div>
                                              ) : (
                                                  <div style={{ flex: 1, height: '120px', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem', background: '#e2e8f0', backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                              )}
                                              
                                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                  <a href={p.url} download target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', background: 'var(--primary)', color: 'white', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none', borderRadius: '4px' }}>Download</a>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // Student Layout
  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Project Submission</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Submit assignments securely to your instructors. Submissions are categorized strictly by your enrolled academic units.
      </p>

      {hasCourse('autocad') && (
          <div className="card" style={{ marginBottom: '2rem' }}>
             <h3 style={{ color: '#1d4ed8', borderBottom: '2px solid #bfdbfe', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>AutoCAD Submissions</h3>
             {renderSubheading('Project Requirements', AUTOCAD_CATEGORIES, 'AUTOCAD', true)}
          </div>
      )}

      {hasCourse('3d modeling|3ds max|sketchup') && (
          <div className="card" style={{ marginBottom: '2rem' }}>
             <h3 style={{ color: '#7c3aed', borderBottom: '2px solid #ddd6fe', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>3D Modeling</h3>
             {renderSubheading('Exterior Projects', THREED_EXTERIOR, '3DMODELING_Exterior', false)}
             {renderSubheading('Interior Projects', THREED_INTERIOR, '3DMODELING_Interior', false)}
          </div>
      )}

      {hasCourse('lumion') && (
          <div className="card" style={{ marginBottom: '2rem' }}>
             <h3 style={{ color: '#059669', borderBottom: '2px solid #a7f3d0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Lumion Projects</h3>
             {renderSubheading('File Uploads', LUMION_OPTIONS, 'LUMION', false)}
          </div>
      )}

      {!hasCourse('autocad') && !hasCourse('3d modeling|3ds max|sketchup') && !hasCourse('lumion') && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <h3>No Project Categories Available</h3>
              <p>Your current course enrollments ({studentCourses || 'None'}) do not require structured project uploads.</p>
          </div>
      )}

    </div>
  );
}
