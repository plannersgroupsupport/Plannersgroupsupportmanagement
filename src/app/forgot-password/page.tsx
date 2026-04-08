'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [formData, setFormData] = useState({
        admissionNo: '',
        fullName: '',
        loginId: '',
        phoneNumber: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong.');
            }
        } catch (err) {
            setError('Failed to submit request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div className="auth-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#1e293b' }}>Request Submitted</h1>
                    <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
                        Your password reset request has been sent to the administrator. 
                        Please contact your faculty or the office to collect your new credentials.
                    </p>
                    <Link href="/" style={{ display: 'inline-block', padding: '0.75rem 2rem', background: 'var(--primary)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                        Return to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
            <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: '500px', width: '100%', padding: '3rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#1e293b' }}>Forgot Password?</h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Provide your details below to request a password reset from the administrator.</p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Admission Number</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g. ADM-123456"
                            value={formData.admissionNo}
                            onChange={e => setFormData({...formData, admissionNo: e.target.value})}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Full Name</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="As registered in portal"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Login ID</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="Your Portal Username"
                            value={formData.loginId}
                            onChange={e => setFormData({...formData, loginId: e.target.value})}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Phone Number</label>
                        <input 
                            type="tel" 
                            required 
                            placeholder="+91 XXXXX XXXXX"
                            value={formData.phoneNumber}
                            onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={submitting} 
                    style={{ 
                        width: '100%', 
                        marginTop: '2rem', 
                        padding: '1rem', 
                        background: 'var(--primary)', 
                        color: 'white', 
                        borderRadius: '8px', 
                        border: 'none', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '1rem',
                        opacity: submitting ? 0.7 : 1
                    }}
                >
                    {submitting ? 'Submitting Request...' : 'Submit Request'}
                </button>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link href="/" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none' }}>
                        ← Back to Login
                    </Link>
                </div>
            </form>
        </div>
    );
}
