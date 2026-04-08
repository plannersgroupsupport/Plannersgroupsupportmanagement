/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = ['TESI', 'AUTODESK', 'EXP', 'ALL'];

export default function CertificatesPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ applied: 0, issued: 0 });

    const fetchRecords = async () => {
        try {
            const res = await fetch('/api/certificates');
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecords(data);
                const applied = data.filter(r => r.status === 'APPLIED').length;
                const issued = data.filter(r => r.status === 'ISSUED').length;
                setStats({ applied, issued });
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const toggleCategory = async (record: any, cat: string) => {
        let currentTypes = record.type === 'ALL' ? ['TESI', 'AUTODESK', 'EXP'] : (record.type ? record.type.split(', ') : []);
        
        if (cat === 'ALL') {
            currentTypes = ['TESI', 'AUTODESK', 'EXP'];
        } else {
            if (currentTypes.includes(cat)) {
                currentTypes = currentTypes.filter((t: string) => t !== cat);
            } else {
                currentTypes.push(cat);
            }
        }

        const newType = currentTypes.length === 3 ? 'ALL' : currentTypes.join(', ');
        
        const res = await fetch('/api/certificates', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: record.id, type: newType, status: record.status })
        });

        if (res.ok) fetchRecords();
    };

    const markAsIssued = async (id: string, currentType: string) => {
        if (!currentType) {
            alert("Please select at least one certificate category first.");
            return;
        }
        if (!confirm('Mark this application as officially ISSUED?')) return;
        
        await fetch('/api/certificates', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'ISSUED', type: currentType })
        });
        fetchRecords();
    };

    const deleteRecord = async (id: string) => {
        if (!confirm('Are you sure you want to remove this record?')) return;
        const res = await fetch(`/api/certificates?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchRecords();
    };

    const downloadReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate Issuance Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .report-header { text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
                        .stats-box { display: flex; justify-content: space-around; background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
                        .stat-item { text-align: center; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #1a73e8; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 13px; }
                        th { background: #f1f5f9; }
                        .issued { color: #059669; font-weight: bold; }
                        .pending { color: #d97706; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h1>CERTIFICATE ISSUANCE REPORT</h1>
                        <p>Planners Group Institutional Management</p>
                        <p style="font-size: 12px; color: #64748b;">Report Generated on: ${dateStr}</p>
                    </div>
                    
                    <div class="stats-box">
                        <div class="stat-item">
                            <div class="stat-value">${records.length}</div>
                            <div style="font-size: 12px;">Total Applications</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.issued}</div>
                            <div style="font-size: 12px;">Certificates Issued</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.applied}</div>
                            <div style="font-size: 12px;">Pending Processing</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Admission No</th>
                                <th>Student Name</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Applied At</th>
                                <th>Issued At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => `
                                <tr>
                                    <td>${r.admissionNo}</td>
                                    <td>${r.studentName}</td>
                                    <td>${r.type}</td>
                                    <td class="${r.status === 'ISSUED' ? 'issued' : 'pending'}">${r.status}</td>
                                    <td>${new Date(r.appliedAt).toLocaleDateString()}</td>
                                    <td>${r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filtered = records.filter(r => 
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                   <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>Financial & Certificate Registry</h1>
                   <p style={{ color: '#64748b' }}>Process student certificate applications and track issuance categories.</p>
                </div>
                <button onClick={downloadReport} className="btn-primary" style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: '#3b82f6' }}>
                   📊 Download Report
                </button>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Applied</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b' }}>{records.length}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 'bold' }}>Total Issued ✔</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b' }}>{stats.issued}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ color: '#d97706', fontSize: '0.9rem', fontWeight: 'bold' }}>Total Pending ⏳</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b' }}>{stats.applied}</div>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Search by student name or Admission No..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    />
                </div>

                {loading ? <p>Loading registry...</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', color: '#64748b', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem' }}>Admission No</th>
                                    <th>Student Name</th>
                                    <th>Documents</th>
                                    <th>Status</th>
                                    <th>Active Categories</th>
                                    <th>Applied Date</th>
                                    <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Update Issuance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => {
                                    const rTypes = r.type === 'ALL' ? ['TESI', 'AUTODESK', 'EXP'] : (r.type ? r.type.split(', ') : []);
                                    return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1rem' }}><code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{r.admissionNo}</code></td>
                                        <td style={{ fontWeight: '600' }}>{r.studentName}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {r.sslcUrl ? (
                                                    <a href={r.sslcUrl} download={`SSLC_${r.admissionNo}`} target="_blank" rel="noopener noreferrer" 
                                                       style={{ fontSize: '0.65rem', color: 'white', fontWeight: 'bold', textDecoration: 'none', background: '#3b82f6', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        📥 SSLC
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>No SSLC</span>
                                                )}
                                                
                                                {r.passportPhotoUrl ? (
                                                    <a href={r.passportPhotoUrl} download={`Passport_${r.admissionNo}`} target="_blank" rel="noopener noreferrer" 
                                                       style={{ fontSize: '0.65rem', color: 'white', fontWeight: 'bold', textDecoration: 'none', background: '#10b981', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        📸 Passport
                                                    </a>
                                                ) : r.profilePhotoUrl ? (
                                                    <a href={r.profilePhotoUrl} download={`Profile_${r.admissionNo}`} target="_blank" rel="noopener noreferrer" 
                                                       style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 'bold', textDecoration: 'none', background: '#ecfdf5', border: '1px solid #10b981', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        👤 Profile
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>No Photo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: '700', 
                                                padding: '0.3rem 0.75rem', 
                                                borderRadius: '20px', 
                                                background: r.status === 'ISSUED' ? '#ecfdf5' : '#fffbeb', 
                                                color: r.status === 'ISSUED' ? '#059669' : '#b45309',
                                                border: r.status === 'ISSUED' ? '1px solid #10b981' : '1px solid #f59e0b'
                                            }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', maxWidth: '150px' }}>{r.type}</td>
                                        <td>{new Date(r.appliedAt).toLocaleDateString()}</td>
                                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', borderRight: '1px solid var(--border)', paddingRight: '0.8rem', marginRight: '0.4rem', gap: '0.6rem' }}>
                                                    {CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                                                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={rTypes.includes(cat)}
                                                                onChange={() => toggleCategory(r, cat)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            {cat}
                                                        </label>
                                                    ))}
                                                </div>

                                                {r.status === 'APPLIED' ? (
                                                    <button 
                                                        onClick={() => markAsIssued(r.id, r.type)}
                                                        style={{ 
                                                            padding: '0.4rem 0.8rem', 
                                                            borderRadius: '8px', 
                                                            background: '#10b981', 
                                                            color: 'white', 
                                                            border: 'none', 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: 'bold', 
                                                            cursor: 'pointer' 
                                                        }}
                                                    >
                                                        Mark Issued
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>Finalized ✔</span>
                                                )}
                                                
                                                <button onClick={() => deleteRecord(r.id)} title="Remove Application" style={{ color: '#ef4444', padding: '0.3rem', marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No certificate records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
