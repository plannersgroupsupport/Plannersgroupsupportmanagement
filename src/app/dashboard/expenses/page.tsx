/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Maintenance', 'Marketing', 'Supplies', 'Others'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        category: CATEGORIES[0],
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const fetchExpenses = async () => {
        try {
            const res = await fetch('/api/expenses');
            const data = await res.json();
            if (data && Array.isArray(data.expenses)) {
                setExpenses(data.expenses);
                setTotalRevenue(data.totalRevenue || 0);
            } else {
                console.error('Invalid expenditure data:', data);
                setExpenses([]);
                setTotalRevenue(0);
            }
        } catch (e) {
            console.error('Fetch error:', e);
            setExpenses([]);
            setTotalRevenue(0);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchExpenses();
        fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            fetchExpenses();
            setShowForm(false);
            setFormData({ title: '', category: CATEGORIES[0], amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        } else {
            alert('Failed to save expense.');
        }
    };

    const deleteExpense = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchExpenses();
    };

    const downloadBill = (expense: any) => {
        // Simple printable bill generation
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = new Date(expense.date).toLocaleDateString('en-US', { dateStyle: 'full' });
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Expenditure Bill - ${expense.title}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                        .bill-card { border: 2px solid #eee; padding: 40px; max-width: 800px; margin: auto; }
                        .header { text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo-container { margin-bottom: 15px; }
                        .logo { height: 80px; object-fit: contain; }
                        .company-name { font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; margin-bottom: 5px; }
                        .title { font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase; }
                        .details { margin-bottom: 40px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #f9f9f9; padding-bottom: 5px; }
                        .label { font-weight: bold; color: #666; }
                        .amount { font-size: 28px; font-weight: 800; color: #000; text-align: right; margin-top: 20px; }
                        .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; font-style: italic; }
                        .stamp { border: 3px solid #e2e8f0; display: inline-block; padding: 10px 20px; border-radius: 10px; margin-top: 30px; opacity: 0.5; }
                    </style>
                </head>
                <body>
                    <div class="bill-card">
                        <div class="header">
                            <div class="logo-container">
                                ${settings?.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
                            </div>
                            <div class="company-name">${settings?.companyName || 'PLANNERS GROUP'}</div>
                            <div class="title">EXPENDITURE VOUCHER & BILL</div>
                            <div style="font-size: 12px; color: #94a3b8; font-weight: normal; margin-top: 5px;">OFFICIAL INSTITUTIONAL RECORD</div>
                        </div>
                        <div class="details">
                            <div class="row">
                                <span class="label">Expense Title:</span>
                                <span>${expense.title}</span>
                            </div>
                            <div class="row">
                                <span class="label">Category:</span>
                                <span>${expense.category}</span>
                            </div>
                            <div class="row">
                                <span class="label">Date:</span>
                                <span>${dateStr}</span>
                            </div>
                            <div class="row">
                                <span class="label">Reference ID:</span>
                                <span>${expense.id}</span>
                            </div>
                            <div class="row" style="margin-top: 20px; flex-direction: column;">
                                <span class="label">Description:</span>
                                <div style="margin-top: 5px; background: #fcfcfc; padding: 10px; border-radius: 5px;">${expense.description || 'No additional details provided.'}</div>
                            </div>
                        </div>
                        <div class="amount">
                            TOTAL AMOUNT: ₹${parseFloat(expense.amount).toLocaleString()}
                        </div>
                        <div style="text-align: right;">
                             <div class="stamp">OFFICIALLY LOGGED</div>
                        </div>
                        <div class="footer">
                            Generated on ${new Date().toLocaleString()} by internal system.
                        </div>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filtered = expenses.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenditure = expenses.reduce((s, e) => s + e.amount, 0);
    const netBalance = totalRevenue - totalExpenditure;

    return (
        <div>
            <style>{`
              @media (max-width: 768px) {
                .exp-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
                .exp-h1 { font-size: 1.5rem !important; }
                .exp-form-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div className="exp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                   <h1 className="exp-h1" style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>Financial Registry</h1>
                   <p style={{ color: '#64748b' }}>Complete overview of Revenue vs. Institutional Expenditure.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
                   + Record Expense
                </button>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Total Amount Received (Fees)</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>Total student payments collected</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}>
                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Total Expenditure</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{totalExpenditure.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>Sum of all logged expenses</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>Current Net Balance</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{netBalance.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>Revenue minus Expenditure</div>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                        type="text" 
                        placeholder="Search by title or category..." 
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
                                    <th style={{ padding: '1rem' }}>Title</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Amount (₹)</th>
                                    <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => (
                                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>{e.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {e.id.slice(0,8)}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px', background: '#f1f5f9', color: '#475569' }}>
                                                {e.category}
                                            </span>
                                        </td>
                                        <td>{new Date(e.date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: '800', color: 'var(--error)' }}>
                                            ₹{e.amount.toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => downloadBill(e)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    📄 Bill
                                                </button>
                                                <button onClick={() => deleteExpense(e.id)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    ✕
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                            No expenditure records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Expense Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', animation: 'slideUp 0.3s ease-out' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Record Expenditure</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>Expense Title</label>
                                <input 
                                    required 
                                    className="input-field" 
                                    placeholder="e.g. Monthly Electricity Bill"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="exp-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>Category</label>
                                    <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>Amount (₹)</label>
                                    <input 
                                        required 
                                        type="number" 
                                        className="input-field" 
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>Transaction Date</label>
                                <input 
                                    required 
                                    type="date" 
                                    className="input-field"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>Description (Optional)</label>
                                <textarea 
                                    className="input-field" 
                                    rows={3} 
                                    placeholder="Add payment notes, reference numbers, etc."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px' }}>Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
