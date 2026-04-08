/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

const generateMonthOptions = (student: any) => {
    const profile = Array.isArray(student.studentProfile) ? student.studentProfile[0] : student.studentProfile;
    const pkg = profile?.packageType || 'BASIC';
    const startDate = profile?.courseStartDate ? new Date(profile.courseStartDate) : new Date();
    
    const regularMonths = pkg === 'PREMIUM' ? 8 : 6;
    const extraMonths = 4;
    
    const workingDate = new Date(startDate.getTime());
    
    const options = [];
    for (let i = 1; i <= regularMonths; i++) {
        const monthName = workingDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        options.push(`${monthName} (Month ${i}, Regular)`);
        workingDate.setMonth(workingDate.getMonth() + 1);
    }
    for (let i = 1; i <= extraMonths; i++) {
        const monthName = workingDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        options.push(`${monthName} (Month ${regularMonths + i}, Extension Phase)`);
        workingDate.setMonth(workingDate.getMonth() + 1);
    }
    return options;
};

export default function AccountantFeesPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState<Record<string, { amount: string, month: string }>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const fetchStudents = () => {
        fetch('/api/users?role=STUDENT')
          .then(res => res.json())
          .then(data => { 
              if (Array.isArray(data)) {
                  setStudents(data); 
                  const initData: Record<string, { amount: string, month: string }> = {};
                  data.forEach((s: any) => {
                      const opts = generateMonthOptions(s);
                      initData[s.id] = { amount: '', month: opts[0] };
                  });
                  setPaymentData(initData);
              } else {
                  console.error('Data is not an array:', data);
                  setStudents([]);
              }
              setLoading(false); 
          });
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleInput = (id: string, field: string, value: string) => {
        setPaymentData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const markPaid = async (student: any) => {
        const data = paymentData[student.id];
        if (!data.amount || isNaN(Number(data.amount))) {
            alert('Please enter a valid payment amount first.');
            return;
        }
        if (!confirm(`Confirm ₹${data.amount} payment collected from ${student.name} targeting the ${data.month} cycle?`)) return;

        const res = await fetch('/api/fees', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               studentId: student.id,
               month: data.month,
               amount: Number(data.amount),
               status: 'PAID'
           })
        });

        if (res.ok) {
           alert(`Success! Payment logged for ${student.name}!`);
           // Refresh data to show updated total and history
           fetchStudents();
        } else {
           alert('Failed to log payment to the database.');
        }
    };

    const removePayment = async (paymentId: string, studentName: string) => {
        if (!confirm(`Are you absolutely sure you want to remove this payment record for ${studentName}? This action cannot be undone.`)) return;

        const res = await fetch(`/api/fees?id=${paymentId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Payment record removed successfully.');
            fetchStudents();
        } else {
            alert('Failed to remove payment record.');
        }
    };

    const updateCourseFee = async (studentId: string, newFee: string) => {
        const fee = parseFloat(newFee);
        if (isNaN(fee)) return;

        const res = await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: studentId,
                totalCourseFee: fee
            })
        });

        if (res.ok) {
            fetchStudents();
        } else {
            alert('Failed to update course fee.');
        }
    };

    const filteredStudents = students.filter(s => {
        const profile = Array.isArray(s.studentProfile) ? s.studentProfile[0] : s.studentProfile;
        return s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               s.loginId.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (profile?.admissionNo && profile.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return (
        <div>
           <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Collect Monthly Fees</h1>
           <p style={{ color: '#64748b', marginBottom: '2rem' }}>Accountant Dashboard - Real calendar months automatically generated relative to each student&apos;s exact Admission Date.</p>

           <div className="card">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3 style={{ color: 'var(--primary)' }}>Active Student Directory</h3>
                 <input 
                     type="text" 
                     placeholder="Search by Name or ID..." 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', width: '300px' }}
                 />
             </div>
             
             {loading ? <p>Loading student directory...</p> : (
               <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem' }}>Student Detail</th>
                    <th>Package</th>
                    <th>Total Course Fee (₹)</th>
                    <th>Payment History</th>
                    <th>Balance Owed</th>
                    <th>Select Admission Month Cycle</th>
                    <th>Amount Paid (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => {
                    const monthOpts = generateMonthOptions(s);
                    const profile = Array.isArray(s.studentProfile) ? s.studentProfile[0] : s.studentProfile;
                    const pkgType = profile?.packageType || 'BASIC';
                    
                    // Calculate total paid across ALL recorded months
                    const totalPaidAmount = s.feePayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                    
                    return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{s.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{profile?.admissionNo || 'N/A'} • {s.loginId}</div>
                      </td>
                      <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', background: 'var(--surface)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                             {pkgType}
                          </span>
                      </td>
                      <td>
                          <input 
                              type="number" 
                              defaultValue={profile?.totalCourseFee ?? (pkgType === 'PREMIUM' ? 65000 : 35000)}
                              onBlur={(e) => updateCourseFee(s.id, e.target.value)}
                              style={{ padding: '0.5rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 'bold', background: '#f8fafc' }}
                              title="Edit to override total course fee"
                          />
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: '0.75rem' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.4rem' }}>
                              Paid: ₹{totalPaidAmount.toLocaleString()}
                          </div>
                          {s.feePayments && s.feePayments.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.3rem', borderRadius: '4px' }}>
                                  {s.feePayments.map((p: any) => (
                                      <div key={p.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>
                                              {p.month}: ₹{p.amount} 
                                              <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>
                                                  Logged: {(() => {
                                                      const d = new Date(p.createdAt || p.updatedAt);
                                                      const day = String(d.getDate()).padStart(2, '0');
                                                      const month = String(d.getMonth() + 1).padStart(2, '0');
                                                      const year = d.getFullYear();
                                                      return `${day}/${month}/${year}`;
                                                  })()}
                                              </span>
                                          </span>
                                          <button 
                                              onClick={() => removePayment(p.id, s.name)} 
                                              style={{ 
                                                  background: 'none', 
                                                  border: 'none', 
                                                  color: 'var(--error)', 
                                                  cursor: 'pointer', 
                                                  padding: '0 4px', 
                                                  fontSize: '0.85rem',
                                                  lineHeight: 1
                                              }}
                                              title="Remove record"
                                          >
                                              ✕
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </td>
                      <td>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)' }}>
                              ₹{(Math.max(0, (profile?.totalCourseFee ?? (pkgType === 'PREMIUM' ? 65000 : 35000)) - totalPaidAmount)).toLocaleString()}
                          </div>
                      </td>
                      <td>
                          <select 
                            value={paymentData[s.id]?.month || monthOpts[0]} 
                            onChange={e => handleInput(s.id, 'month', e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', width: '220px', fontWeight: 'bold' }}
                          >
                             {monthOpts.map(opt => (
                                 <option key={opt} value={opt}>{opt}</option>
                             ))}
                          </select>
                      </td>
                      <td>
                          <input 
                             type="number" 
                             placeholder="e.g. 10000" 
                             value={paymentData[s.id]?.amount || ''}
                             onChange={e => handleInput(s.id, 'amount', e.target.value)}
                             style={{ padding: '0.5rem', width: '100px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 'bold' }}
                          />
                      </td>
                      <td>
                        <button onClick={() => markPaid(s)} style={{ background: 'var(--success)', padding: '0.5rem 1rem', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '4px' }}>
                           ✓ Log Payment
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', fontStyle: 'italic', color: '#64748b' }}>No students found matching your search.</td></tr>}
                </tbody>
               </table>
               </div>
             )}
           </div>
        </div>
    )
}
