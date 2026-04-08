import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import StudentAttendanceCalendar from '@/app/components/AttendanceCalendar';
import CertificateButton from '@/app/components/CertificateButton';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  let userPayload;
  try {
    userPayload = token ? JSON.parse(decodeURIComponent(token)) : null;
  } catch (e) {
    userPayload = null;
  }

  if (!userPayload) return <div>Access Denied</div>;

  const currentRole = userPayload.role;

  if (currentRole === 'STUDENT') {
      const studentData = await prisma.user.findUnique({
          where: { id: userPayload.id },
          include: { 
             studentProfile: { include: { attendances: true } }, 
             feePayments: true 
          }
      });
      const profile = studentData?.studentProfile;
      const fees = studentData?.feePayments || [];
      const totalPaid = fees.filter(f => f.status === 'PAID').reduce((acc, f) => acc + f.amount, 0);
      const profileData: any = profile;
      
      const attendances = profileData?.attendances || [];
      const totalClasses = attendances.length;
      const presentClasses = attendances.filter((a: any) => a.status === 'PRESENT').length;
      const attendancePercentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);

      const courseFeeOverride = profileData?.totalCourseFee ?? (profileData?.packageType === 'PREMIUM' ? 65000 : 35000);
      const totalPayable = Math.max(0, courseFeeOverride - totalPaid);
      
      const courses = profile?.courseName ? profile.courseName.split(',').map((s: string)=>s.trim()).filter(Boolean) : [];

      const instructors = await prisma.user.findMany({
          where: { role: 'FACULTY' },
          select: { id: true, name: true, facultyProfile: { include: { lab: true } } }
      });

      const notesCourses = profile?.courseName ? profile.courseName.split(',').map((s: string)=>s.trim()).filter(Boolean) : [];

      const notes = await (prisma as any).file.findMany({
          where: { 
            type: 'NOTES',
            OR: notesCourses.length > 0 ? [
              { course: { in: notesCourses } },
              { course: null },
              { course: '' }
            ] : undefined
          },
          orderBy: { uploadedAt: 'desc' },
          take: 3,
          include: { user: true }
      });

      const certRecords: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM "CertificateRecord" WHERE "studentProfileId" = $1 ORDER BY "updatedAt" DESC LIMIT 1',
        profile?.id
      );
      const existingRequest = certRecords && certRecords.length > 0 ? certRecords[0] : null;

      return (
        <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          
          {/* Main Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Banner */}
                  <div style={{ 
                      background: 'var(--primary)', 
                      borderRadius: '16px', 
                      padding: '2rem 1.5rem', 
                      color: 'white', 
                      position: 'relative', 
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }}>
                      <div style={{ position: 'relative', zIndex: 2 }}>
                          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem', fontWeight: 500 }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                          <h1 style={{ fontSize: '2.2rem', margin: '0 0 0.5rem 0', fontWeight: '800' }}>Welcome back, {studentData?.name.split(' ')[0] || 'Student'}!</h1>
                          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>Always stay updated in your student portal</p>
                      </div>
                      
                      {/* Decorative elements to mimic 3D layout */}
                      <div style={{ position: 'absolute', right: '-5%', top: '-20%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', zIndex: 1 }}></div>
                      <div style={{ position: 'absolute', right: '15%', bottom: '-10%', width: '150px', height: '150px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', zIndex: 1 }}></div>
                  </div>

                  {/* Enrolled Courses */}
                  <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--foreground)' }}>Enrolled Courses</h3>
                          <Link href="/dashboard/progress" style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none' }}>See all</Link>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                          {courses.length > 0 ? courses.map((course: string, i: number) => {
                              const bgs = [
                                  `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, #f5f3ff, #ede9fe)`,
                                  `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, #fdf4ff, #fae8ff)`,
                                  `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E"), linear-gradient(135deg, #f0fdfa, #ccfbf1)`
                              ];
                              const bg = bgs[i % bgs.length];
                              return (
                              <div key={i} style={{ background: bg, borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                  <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', maxWidth: '65%', lineHeight: '1.4', fontSize: '1.1rem', fontWeight: 700, position: 'relative', zIndex: 2 }}>{course}</h4>
                                  <Link href="/dashboard/progress" style={{ position: 'relative', zIndex: 2, display: 'inline-block' }}>
                                      <button style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.6rem 1.8rem', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 6px rgba(100,0,255,0.2)' }}>View</button>
                                  </Link>
                                  <div style={{ position: 'absolute', right: '-0.5rem', bottom: '-1rem', fontSize: '5rem', opacity: 0.1, transform: 'rotate(-10deg)', zIndex: 1 }}>📐</div>
                              </div>
                              )
                          }) : (
                              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '16px', color: '#64748b' }}>No enrolled courses found.</div>
                          )}
                      </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--foreground)' }}>Notes</h3>
                          <Link href="/dashboard/notes" style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none' }}>See all</Link>
                      </div>
                      
                      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                          {notes.length > 0 ? notes.map((note: any, i: number) => {
                              const noteName = note.url.split('-').slice(1).join('-') || note.url.split('/').pop() || 'Document';
                              return (
                              <div key={note.id} style={{ padding: '1rem 1.5rem', borderBottom: i < notes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: '700' }}>{noteName}</h4>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                                      Uploaded by <span style={{fontWeight: 600}}>{note.user?.name || 'System'}</span> on {new Date(note.uploadedAt).toLocaleDateString()}
                                  </p>
                                  <a href={note.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none' }}>Download File</a>
                              </div>
                              )
                          }) : (
                              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>No recent notes.</div>
                          )}
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Attendance Performance Head */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Attendance Performance</h3>
                      <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <div>
                                <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: attendancePercentage >= 75 ? '#10b981' : attendancePercentage >= 50 ? '#f59e0b' : '#ef4444' }}>{attendancePercentage}%</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Overall Attendance Rate</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--foreground)' }}>{presentClasses} / {totalClasses}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Days Present</div>
                              </div>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: attendancePercentage >= 75 ? '#10b981' : attendancePercentage >= 50 ? '#f59e0b' : '#ef4444', width: `${attendancePercentage}%`, transition: 'width 1s ease-in-out' }}></div>
                          </div>
                      </div>
                  </div>

                  {/* Course Instructors */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Course instructors</h3>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                          {instructors.length > 0 ? instructors.map((inst: any) => (
                              <div key={inst.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.4rem', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                                      {inst.name.charAt(0)}
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', maxWidth: '75px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name.split(' ')[0]}</div>
                                  </div>
                              </div>
                          )) : (
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No instructors assigned right now.</div>
                          )}
                      </div>
                  </div>

                  {/* Certificate Application */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Certification</h3>
                      <CertificateButton 
                        studentProfileId={profileData?.id || ''} 
                        currentStatus={profileData?.currentStatus || ''} 
                        existingRequest={existingRequest} 
                      />
                  </div>

                  {/* Attendance Calendar */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Monthly Attendance</h3>
                      <StudentAttendanceCalendar userId={userPayload.id} />
                  </div>

              </div>
          </div>
        </div>
      );
  }

  // Fallback / Admin Dashboard
  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--foreground)', fontWeight: '800' }}>
        Welcome, {userPayload?.name || userPayload?.role || 'User'}!
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
        Here is your quick overview dashboard. Note that some features are restricted based on your role.
      </p>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="stat-card" style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <span className="stat-card-title" style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Notifications</span>
          <span className="stat-card-value" style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: 'var(--success)' }}>0</span>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <span className="stat-card-title" style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Actions</span>
          <span className="stat-card-value" style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: 'var(--warning)' }}>0</span>
        </div>
      </div>
    </div>
  );
}
