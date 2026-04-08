'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newLoginId, setNewLoginId] = useState('');
    const [updating, setUpdating] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
    const [sslcFile, setSslcFile] = useState<File | null>(null);

    // Branding state
    const [companyName, setCompanyName] = useState('Planners Group');
    const [logoUrl, setLogoUrl] = useState('');
    const [brandingFile, setBrandingFile] = useState<File | null>(null);

    const fetchProfile = async () => {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
        
        if (authCookie) {
            try {
                const decoded = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
                const res = await fetch(`/api/profile?userId=${decoded.id}`);
                const data = await res.json();
                setUser(data);
                setNewLoginId(data.loginId);
            } catch (e) { console.error('Profile fetch error', e); }
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.companyName) setCompanyName(data.companyName);
            if (data.logoUrl) setLogoUrl(data.logoUrl);
        } catch (e) { console.error('Settings fetch error', e); }
    };

    useEffect(() => {
        const init = async () => {
            await fetchProfile();
            await fetchSettings();
            setLoading(false);
        };
        init();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setUpdating(true);
        const res = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, newPassword: password })
        });

        if (res.ok) {
            alert('Password updated successfully!');
            setPassword('');
            setConfirmPassword('');
        } else {
            alert('Failed to update password.');
        }
        setUpdating(false);
    };

    const handleLoginIdChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLoginId) return;

        setUpdating(true);
        const res = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, loginId: newLoginId })
        });

        if (res.ok) {
            alert('Login ID updated! Please log in again if you refresh.');
            fetchProfile();
        } else {
            const error = await res.json();
            alert(error.error || 'Failed to update Login ID.');
        }
        setUpdating(false);
    };

    const handleBrandingUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);

        let finalLogoUrl = logoUrl;
        if (brandingFile) {
            const formData = new FormData();
            formData.append('file', brandingFile);
            formData.append('userId', user.id);
            formData.append('type', 'SYSTEM');

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                finalLogoUrl = uploadData.url;
            }
        }

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName, logoUrl: finalLogoUrl })
        });

        if (res.ok) {
            alert('Branding updated successfully! Refreshing dashboard logo.');
            window.location.reload();
        } else {
            alert('Failed to update branding.');
        }
        setUpdating(false);
    };

    const handleFileUpload = async (e: React.FormEvent, type: string, fileToUpload: File | null) => {
        e.preventDefault();
        if (!fileToUpload) return;

        setUpdating(true);
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('userId', user.id);
        formData.append('type', type);

        const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (uploadRes.ok) {
            alert(`${type.replace('_', ' ')} uploaded successfully!`);
            fetchProfile(); 
        } else {
            alert(`Failed to upload ${type.toLowerCase()}.`);
        }
        setUpdating(false);
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>;
    if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Could not load profile. Please login again.</div>;

    const profilePhoto = user.fileUploads?.find((f: any) => f.type === 'PHOTO')?.url || '/placeholder-profile.png';
    const sProfile = user.studentProfile?.[0] || user.studentProfile; 

    return (
        <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>My Profile</h1>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Manage your account settings and view your academic registration details.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Profile Photo Section */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 1.5rem', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)' }}>
                        <img src={profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h3 style={{ marginBottom: '1rem' }}>Profile Picture</h3>
                    <form onSubmit={(e) => handleFileUpload(e, 'PHOTO', file)}>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={e => setFile(e.target.files?.[0] || null)} 
                            style={{ fontSize: '0.8rem', marginBottom: '1rem', width: '100%' }}
                        />
                        <button type="submit" disabled={updating || !file} style={{ width: '100%', padding: '0.6rem' }}>
                            {updating ? 'Uploading...' : 'Update Profile Photo'}
                        </button>
                    </form>
                </div>

                {/* Academic Documents Section (Student Only) */}
                {user.role === 'STUDENT' && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Academic Documents</h3>
                        
                        <div style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Passport Size Photo</label>
                            <form onSubmit={(e) => handleFileUpload(e, 'PASSPORT_PHOTO', passportPhoto)}>
                                <input type="file" accept="image/*" onChange={e => setPassportPhoto(e.target.files?.[0] || null)} style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }} />
                                <button type="submit" disabled={updating || !passportPhoto} style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}>Upload Passport Photo</button>
                            </form>
                        </div>

                        <div style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>SSLC Certificate (PDF/Image)</label>
                            <form onSubmit={(e) => handleFileUpload(e, 'SSLC', sslcFile)}>
                                <input type="file" accept="image/*,application/pdf" onChange={e => setSslcFile(e.target.files?.[0] || null)} style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }} />
                                <button type="submit" disabled={updating || !sslcFile} style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}>Upload SSLC</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Account Details Section */}
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Registration Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Full Name</p>
                            <p style={{ fontWeight: 'bold' }}>{user.name}</p>
                        </div>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Login ID</p>
                            <p style={{ fontWeight: 'bold' }}>{user.loginId}</p>
                        </div>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>User Role</p>
                            <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{user.role}</p>
                        </div>
                        {user.role === 'STUDENT' && (
                        <>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Admission No</p>
                                <p style={{ fontWeight: 'bold' }}>{sProfile?.admissionNo || 'N/A'}</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Course Name</p>
                                <p style={{ fontWeight: 'bold' }}>{sProfile?.courseName || 'General'}</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Package Type</p>
                                <p style={{ fontWeight: 'bold', color: 'var(--success)' }}>{sProfile?.packageType || 'BASIC'}</p>
                            </div>
                            <div>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Start Date</p>
                                <p style={{ fontWeight: 'bold' }}>
                                    {sProfile?.courseStartDate ? new Date(sProfile.courseStartDate).toLocaleDateString('en-GB') : 'N/A'}
                                </p>
                            </div>
                        </>
                        )}
                    </div>
                </div>

                {/* Identity & Branding Management for SUPERADMIN */}
                {user.role === 'SUPERADMIN' && (
                    <div className="card" style={{ gridColumn: '1 / -1', borderTop: '4px solid var(--primary)' }}>
                        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Administrative Identity & Branding</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* Change Login ID */}
                            <form onSubmit={handleLoginIdChange}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Change Admin Login ID</label>
                                <input 
                                    type="text" 
                                    value={newLoginId} 
                                    onChange={e => setNewLoginId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1rem' }} 
                                />
                                <button type="submit" disabled={updating} style={{ background: 'var(--primary)', width: '100%' }}>Update Login ID</button>
                            </form>

                            {/* Company Branding */}
                            <form onSubmit={handleBrandingUpdate}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Name</label>
                                <input 
                                    type="text" 
                                    value={companyName} 
                                    onChange={e => setCompanyName(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1rem' }} 
                                />
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Logo</label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => setBrandingFile(e.target.files?.[0] || null)}
                                    style={{ fontSize: '0.8rem', marginBottom: '1rem', width: '100%' }} 
                                />
                                <button type="submit" disabled={updating} style={{ background: 'var(--success)', width: '100%' }}>Save Branding Global Settings</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Change Section */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Security Credentials</h3>
                    <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>New Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }} 
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Confirm Password</label>
                            <input 
                                type="password" 
                                required 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }} 
                            />
                        </div>
                        <button type="submit" disabled={updating} style={{ padding: '0.75rem', gridColumn: '1 / -1' }}>
                            {updating ? 'Processing...' : 'Update Security Credentials'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
