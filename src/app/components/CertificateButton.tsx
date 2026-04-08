'use client';

import { useState } from 'react';

export default function CertificateButton({ studentProfileId, currentStatus, existingRequest }: { studentProfileId: string, currentStatus: string, existingRequest: any }) {
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState(existingRequest);

    const handleApply = async () => {
        if (!confirm('Apply for your completion certificate?')) return;
        
        setLoading(true);
        try {
            const res = await fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentProfileId, type: 'ALL' })
            });
            const data = await res.json();
            
            if (res.ok) {
                setRequest({ status: 'APPLIED', type: 'ALL' });
            } else {
                alert(data.error || 'Failed to apply');
            }
        } catch (e) {
            alert('An error occurred. Please try again later.');
        }
        setLoading(false);
    };

    if (request) {
        return (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '0.5rem' }}>Certificate Status</div>
                <div style={{ 
                    display: 'inline-block',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: request.status === 'ISSUED' ? '#ecfdf5' : '#fffbeb',
                    color: request.status === 'ISSUED' ? '#059669' : '#b45309',
                    border: request.status === 'ISSUED' ? '1px solid #10b981' : '1px solid #f59e0b'
                }}>
                    {request.status === 'ISSUED' ? `Issued (${request.type})` : 'Application Pending ⏳'}
                </div>
                {request.status === 'ISSUED' && (
                    <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: '#64748b' }}>Visit the office for pickup or download.</p>
                )}
            </div>
        );
    }

    const isEligible = currentStatus === 'Completed';

    return (
        <div style={{ padding: '1rem', background: isEligible ? '#eff6ff' : '#f1f5f9', borderRadius: '12px', border: isEligible ? '1px solid #bfdbfe' : '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '1rem' }}>Certificate Eligibility</div>
            
            {!isEligible ? (
                <div>
                   <span style={{ fontSize: '1.5rem', display: 'block' }}>🔒</span>
                   <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0' }}>Unlocks once faculty marks your course as "Completed".</p>
                </div>
            ) : (
                <div>
                    <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600', marginBottom: '1rem' }}>Congratulations! You are eligible for certification.</p>
                    <button 
                        onClick={handleApply}
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', width: '100%' }}
                    >
                        {loading ? 'Processing...' : 'Request Certificate Now'}
                    </button>
                </div>
            )}
        </div>
    );
}
