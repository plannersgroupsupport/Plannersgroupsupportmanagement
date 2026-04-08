/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

export default function FeesPage() {
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    // Automatically grab the student's logged in ID from the auth cookie
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    
    if (authCookie) {
      try {
        const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        
        // Prevent student from accessing this page if they try to browse directly
        if (decoded.role === 'STUDENT') {
          window.location.href = '/dashboard';
          return;
        }

        // Fetch profile to get totalCourseFee
        fetch(`/api/profile?userId=${decoded.id}`)
          .then(res => res.json())
          .then(data => {
            setStudentProfile(data?.studentProfile?.[0] || data?.studentProfile || null);
          });

        fetch(`/api/fees?studentId=${decoded.id}`)
          .then(res => res.json())
          .then(data => {
             if(Array.isArray(data)) setFeeRecords(data);
             setLoading(false);
          });
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, []);

  const totalPaid = feeRecords.filter(r => r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0);
  const courseFee = (studentProfile?.totalCourseFee ?? (studentProfile?.packageType === 'PREMIUM' ? 65000 : 35000));
  const balance = Math.max(0, courseFee - totalPaid);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Fee Management</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Student Portal - Live overview of your course fees and payment tracking.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Course Fee</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--foreground)' }}>₹{courseFee.toLocaleString()}</span>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--success)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Paid</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>₹{totalPaid.toLocaleString()}</span>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Balance Owed</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>₹{balance.toLocaleString()}</span>
          </div>
      </div>
      
      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Mapped Payment History</h3>
        
        {loading ? <p>Loading historical fee ledger...</p> : (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
               <th style={{ padding: '0.75rem' }}>Billed Admission Month Cycle</th>
               <th>Amount Paid</th>
               <th>Status</th>
               <th>Date Logged By Admin</th>
            </tr>
          </thead>
          <tbody>
             {feeRecords.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{record.month}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{record.amount}</td>
                    <td>
                        <span style={{ background: 'var(--success)', padding: '0.2rem 0.5rem', color: 'white', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {record.status}
                        </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {(() => {
                            const d = record.createdAt ? new Date(record.createdAt) : (record.updatedAt ? new Date(record.updatedAt) : null);
                            if (!d) return 'Pending';
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            return `${day}/${month}/${year}`;
                        })()}
                    </td>
                </tr>
             ))}
             {feeRecords.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>No tuition fee logs have been officially verified by the accountant yet!</td></tr>
             )}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
