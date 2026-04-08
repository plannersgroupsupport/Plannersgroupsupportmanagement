'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{loginId: string, password: string} | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    admissionNo: '',
    dob: '',
    sex: 'MALE',
    email: '',
    phone: '',
    admissionDate: new Date().toISOString().split('T')[0],
    courseStartDate: new Date().toISOString().split('T')[0],
    batch: 'MORNING',
    labNumber: 'LAB-1',
    collegeName: '',
    fatherName: '',
    fatherPhone: '',
    address: '',
    district: '',
    pincode: '',
    packageType: 'BASIC',
    courses: [] as string[]
  });

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
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/register/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          courseName: formData.courses.join(', ') || 'General'
        })
      });
      const result = await res.json();
      if (res.ok) {
        setCredentials({ loginId: result.loginId, password: result.password });
        setStep(5); // Success step
      } else {
        setError(result.error || 'Failed to complete registration.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  if (step === 5 && credentials) {
      return (
          <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ maxWidth: '500px', width: '100%', background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#10b981', fontSize: '2.5rem' }}>✓</div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>Registration Successful!</h1>
                  <p style={{ color: '#64748b', marginBottom: '2rem' }}>Welcome to the Planners Group. Please save your login credentials below.</p>
                  
                  <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', textAlign: 'left' }}>
                      <div style={{ marginBottom: '1rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Login ID</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', fontFamily: 'monospace' }}>{credentials.loginId}</div>
                      </div>
                      <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Password</label>
                          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>{credentials.password}</div>
                      </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '1.5rem', fontWeight: '600' }}>⚠️ Please take a screenshot of this page now.</p>
                  
                  <Link href="/" style={{ display: 'block', padding: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
                      Go to Login Page
                  </Link>
              </div>
          </main>
      )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      
      <div style={{ maxWidth: '600px', width: '100%', marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>Student Registration</h1>
          <p style={{ color: '#64748b' }}>Planners Group Management System</p>
      </div>

      <div style={{ maxWidth: '600px', width: '100%', background: 'white', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          
          {/* Progress Bar */}
          <div style={{ display: 'flex', height: '6px', background: '#f1f5f9' }}>
              {[1,2,3,4].map(s => (
                  <div key={s} style={{ flex: 1, background: s <= step ? 'var(--primary)' : 'transparent', transition: 'all 0.4s' }}></div>
              ))}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '2.5rem' }}>
              {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #fee2e2' }}>{error}</div>}

              {step === 1 && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>1. Basic Identity</h2>
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                          <FloatInput label="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                          <DateInput label="Date of Birth" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <FloatInput label="Admission No" required placeholder="XXXX" value={formData.admissionNo} onChange={e => setFormData({...formData, admissionNo: e.target.value})} />
                          </div>
                      </div>
                  </div>
              )}

              {step === 2 && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>2. Academic Details</h2>
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                          <FloatInput label="College Name" required value={formData.collegeName} onChange={e => setFormData({...formData, collegeName: e.target.value})} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <select value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <option value="MORNING">Morning Batch</option>
                                  <option value="AFTERNOON">Afternoon Batch</option>
                                  <option value="EVENING">Evening Batch</option>
                              </select>
                              <select value={formData.labNumber} onChange={e => setFormData({...formData, labNumber: e.target.value})} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  <option value="LAB-1">Lab 1</option>
                                  <option value="LAB-2">Lab 2</option>
                                  <option value="LAB-3">Lab 3</option>
                              </select>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                              <label style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '8px', background: formData.packageType === 'BASIC' ? 'var(--primary)' : 'white', color: formData.packageType === 'BASIC' ? 'white' : 'inherit', border: '1px solid #e2e8f0' }}>
                                  <input type="radio" name="package" value="BASIC" checked={formData.packageType === 'BASIC'} onChange={() => setFormData({...formData, packageType: 'BASIC'})} style={{ display: 'none' }} /> BASIC
                              </label>
                              <label style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '8px', background: formData.packageType === 'PREMIUM' ? 'var(--primary)' : 'white', color: formData.packageType === 'PREMIUM' ? 'white' : 'inherit', border: '1px solid #e2e8f0' }}>
                                  <input type="radio" name="package" value="PREMIUM" checked={formData.packageType === 'PREMIUM'} onChange={() => setFormData({...formData, packageType: 'PREMIUM'})} style={{ display: 'none' }} /> PREMIUM
                              </label>
                          </div>

                          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>Select Your Courses*</label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                  {['REVIT', 'REVIT(BIM)', 'AUTOCAD', '3DS MAX', 'SKETCHUP', 'LUMION', 'INTERIOR DESIGNING', 'VASTU', 'QUANTITY SURVEY', 'ESTIMATION'].map(c => (
                                      <label key={c} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                          <input type="checkbox" checked={formData.courses.includes(c)} onChange={() => handleCourseChange(c)} /> {c}
                                      </label>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {step === 3 && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>3. Contact & Family</h2>
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                          <FloatInput label="Mobile Number" required value={formData.phone} onChange={e => handlePhoneChange(e, 'phone')} />
                          <FloatInput label="Email ID" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <FloatInput label="Father's Name" required value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                              <FloatInput label="Father's Number" required value={formData.fatherPhone} onChange={e => handlePhoneChange(e, 'fatherPhone')} />
                          </div>
                      </div>
                  </div>
              )}

              {step === 4 && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>4. Residential Address</h2>
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                          <textarea placeholder="Full Address with Street & Door No*" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '120px', fontSize: '1rem' }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <FloatInput label="District" required value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                              <FloatInput label="Pincode" required value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                          </div>
                      </div>
                  </div>
              )}

              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                  {step > 1 && <button type="button" onClick={() => setStep(step - 1)} style={{ flex: 1, padding: '1rem', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Previous</button>}
                  
                  {step < 4 ? (
                      <button type="button" onClick={() => {
                          if (step === 1 && (!formData.name || !formData.dob || !formData.admissionNo)) { alert('Please fill all identity details'); return; }
                          if (step === 2 && (!formData.collegeName || formData.courses.length === 0)) { alert('Please choose college and at least one course'); return; }
                          if (step === 3 && (!formData.phone || !formData.email || !formData.fatherName || !formData.fatherPhone)) { alert('Please provide contact and family info'); return; }
                          setStep(step + 1);
                      }} style={{ flex: 2, padding: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Next Step</button>
                  ) : (
                      <button type="submit" disabled={loading} style={{ flex: 2, padding: '1rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4c6ef5 100%)', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                          {loading ? 'Processing...' : 'Submit Registration'}
                      </button>
                  )}
              </div>
          </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}

function FloatInput({ label, required = false, type = 'text', placeholder = '', value, onChange }: { label: string, required?: boolean, type?: string, placeholder?: string, value?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{label}{required && '*'}</label>
            <input type={type} placeholder={placeholder} value={value} required={required} onChange={onChange} style={{ width: '100%', padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem' }} />
        </div>
    );
}

function DateInput({ label, required = false, value, onChange }: { label: string, required?: boolean, value?: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>{label}{required && '*'}</label>
            <input type="date" value={value} required={required} onChange={onChange} style={{ width: '100%', padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem' }} />
        </div>
    );
}
