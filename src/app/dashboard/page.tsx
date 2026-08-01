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

      // Fetch all holidays to exclude them from working day count
      const allHolidays = await prisma.holiday.findMany();
      const holidaySet = new Set(allHolidays.map((h: any) => h.date.toISOString().split('T')[0]));

      // Build a set of dates with PRESENT attendance
      const presentSet = new Set(
        attendances
          .filter((a: any) => a.status === 'PRESENT')
          .map((a: any) => (a.date instanceof Date ? a.date : new Date(a.date)).toISOString().split('T')[0])
      );

      // Count working days (Mon–Sat, not a holiday) from courseStartDate to today
      const startDate = profile?.courseStartDate ? new Date(profile.courseStartDate) : null;
      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);

      let totalWorkingDays = 0;
      let presentWorkingDays = 0;

      if (startDate) {
        const cursor = new Date(startDate);
        cursor.setUTCHours(0, 0, 0, 0);
        while (cursor <= today) {
          const dayOfWeek = cursor.getUTCDay(); // 0=Sun, 6=Sat
          const dateKey = cursor.toISOString().split('T')[0];
          if (dayOfWeek !== 0 && !holidaySet.has(dateKey)) { // Mon–Sat, non-holiday
            totalWorkingDays++;
            if (presentSet.has(dateKey)) presentWorkingDays++;
          }
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }

      const presentClasses = presentWorkingDays;
      const totalClasses = totalWorkingDays;
      const attendancePercentage = totalWorkingDays === 0 ? 0 : Math.round((presentWorkingDays / totalWorkingDays) * 100);

      // Month-by-month breakdown from courseStartDate to today
      const monthlyStats: { label: string; workingDays: number; presentDays: number; percentage: number }[] = [];
      if (startDate) {
        const todayUTC = new Date();
        todayUTC.setUTCHours(23, 59, 59, 999);
        const cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
        while (cur <= todayUTC) {
          const y = cur.getUTCFullYear();
          const m = cur.getUTCMonth();
          const mStart = new Date(Date.UTC(y, m, 1));
          const mEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
          const effStart = startDate > mStart ? new Date(startDate) : mStart;
          effStart.setUTCHours(0, 0, 0, 0);
          const effEnd = mEnd < todayUTC ? mEnd : todayUTC;
          let wDays = 0, pDays = 0;
          const dc = new Date(effStart);
          while (dc <= effEnd) {
            const dow = dc.getUTCDay();
            const dk = dc.toISOString().split('T')[0];
            if (dow !== 0 && !holidaySet.has(dk)) { wDays++; if (presentSet.has(dk)) pDays++; }
            dc.setUTCDate(dc.getUTCDate() + 1);
          }
          const pct = wDays > 0 ? Math.round((pDays / wDays) * 100) : 0;
          const label = new Date(y, m).toLocaleString('en-US', { month: 'long', year: 'numeric' });
          monthlyStats.push({ label, workingDays: wDays, presentDays: pDays, percentage: pct });
          cur.setUTCMonth(cur.getUTCMonth() + 1);
        }
      }

      const courseFeeOverride = profileData?.totalCourseFee ?? (profileData?.packageType === 'PREMIUM' ? 65000 : 35000);
      const totalPayable = Math.max(0, courseFeeOverride - totalPaid);
      
      const courses = profile?.courseName ? profile.courseName.split(',').map((s: string)=>s.trim()).filter(Boolean) : [];

      const instructors = await prisma.user.findMany({
          where: { role: 'FACULTY' },
          select: { id: true, name: true, phone: true, facultyProfile: { include: { lab: true } }, fileUploads: { where: { type: 'PHOTO' }, take: 1, orderBy: { uploadedAt: 'desc' } } }
      });

      // Filter: show only faculty assigned to student's lab, plus unassigned faculty
      const studentLabNumber = profile?.labNumber || null;
      const filteredInstructors = instructors.filter((inst: any) => {
        const assignedLab = inst.facultyProfile?.lab?.name;
        return !assignedLab || assignedLab === studentLabNumber;
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
          <style>{`
            @media (max-width: 768px) {
              .dash-grid { grid-template-columns: 1fr !important; }
              .course-grid { grid-template-columns: 1fr !important; }
              .dash-h1 { font-size: 1.6rem !important; }
            }
          `}</style>
          
          {/* Main Layout Grid */}
          <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
              
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
                          <h1 className="dash-h1" style={{ fontSize: '2.2rem', margin: '0 0 0.5rem 0', fontWeight: '800' }}>Welcome back, {studentData?.name?.split(' ')[0] || userPayload?.name?.split(' ')[0] || 'Student'}!</h1>
                          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>Always stay updated in your student portal</p>
                      </div>
                      
                      {/* Decorative elements to mimic 3D layout */}
                      <div style={{ position: 'absolute', right: '-5%', top: '-20%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', zIndex: 1 }}></div>
                      <div style={{ position: 'absolute', right: '15%', bottom: '-10%', width: '150px', height: '150px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', zIndex: 1 }}></div>
                  </div>

                  {/* Notes (Moved to Front) */}
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
                                  <a href={note.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none' }}>Download File</a>
                              </div>
                              )
                          }) : (
                              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>No recent notes.</div>
                          )}
                      </div>
                  </div>

                  {/* Enrolled Courses */}
                  <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--foreground)' }}>Enrolled Courses</h3>
                          <Link href="/dashboard/progress" style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '700', textDecoration: 'none' }}>See all</Link>
                      </div>
                      <div className="course-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
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

                  {/* Certificate Application */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Certification</h3>
                      <CertificateButton 
                        studentProfileId={profileData?.id || ''} 
                        currentStatus={profileData?.currentStatus || ''} 
                        existingRequest={existingRequest} 
                      />
                  </div>
                  
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                               {/* Attendance Performance */}
                   <div>
                       <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Attendance Performance</h3>
                       <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
                           {/* Overall */}
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                               <div>
                                 <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: '800', color: attendancePercentage >= 75 ? '#10b981' : attendancePercentage >= 50 ? '#f59e0b' : '#ef4444' }}>{attendancePercentage}%</span>
                                 <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Overall Attendance Rate</span>
                               </div>
                               <div style={{ textAlign: 'right' }}>
                                 <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--foreground)' }}>{presentClasses} / {totalClasses}</div>
                                 <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Days Present / Working Days</div>
                               </div>
                           </div>
                           <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                               <div style={{ height: '100%', background: attendancePercentage >= 75 ? '#10b981' : attendancePercentage >= 50 ? '#f59e0b' : '#ef4444', width: `${attendancePercentage}%`, transition: 'width 1s ease-in-out', borderRadius: '10px' }}></div>
                           </div>

                           {/* Month-by-month table */}
                           {monthlyStats.length > 0 && (
                             <div>
                               <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Monthly Breakdown</div>
                               <div style={{ overflowX: 'auto' }}>
                                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                   <thead>
                                     <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                       <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#475569' }}>Month</th>
                                       <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#475569' }}>Working Days</th>
                                       <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#475569' }}>Present</th>
                                       <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#475569' }}>%</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {monthlyStats.map((ms, idx) => (
                                       <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                         <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#1e293b' }}>{ms.label}</td>
                                         <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#475569' }}>{ms.workingDays}</td>
                                         <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#475569' }}>{ms.presentDays}</td>
                                         <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                           <span style={{
                                             display: 'inline-block',
                                             padding: '0.15rem 0.5rem',
                                             borderRadius: '20px',
                                             fontWeight: '700',
                                             fontSize: '0.75rem',
                                             background: ms.percentage >= 75 ? '#ecfdf5' : ms.percentage >= 50 ? '#fffbeb' : '#fef2f2',
                                             color: ms.percentage >= 75 ? '#059669' : ms.percentage >= 50 ? '#d97706' : '#dc2626',
                                           }}>{ms.percentage}%</span>
                                         </td>
                                       </tr>
                                     ))}
                                   </tbody>
                                 </table>
                               </div>
                             </div>
                           )}
                       </div>
                   </div>

                   {/* Course Instructors */}
                  <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--foreground)' }}>Course Instructors</h3>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                          {filteredInstructors.length > 0 ? filteredInstructors.map((inst: any) => {
                            const photoUrl = inst.fileUploads?.[0]?.url || null;
                            return (
                              <div key={inst.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  width: '64px', height: '64px', borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--primary), #4c6ef5)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontWeight: 'bold', fontSize: '1.4rem',
                                  border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                  overflow: 'hidden', flexShrink: 0
                                }}>
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={inst.name}
                                      style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        pointerEvents: 'none',
                                        userSelect: 'none'
                                      }}
                                    />
                                  ) : inst.name.charAt(0)}
                                </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', maxWidth: '75px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name.split(' ')[0]}</div>
                                    {inst.facultyProfile?.lab?.name && (
                                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{inst.facultyProfile.lab.name}</div>
                                    )}
                                    {inst.facultyProfile?.isIncharge && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.2rem', lineHeight: '1.2' }}>👑 In-charge<br/>📞 {inst.phone || 'N/A'}</div>
                                    )}
                                  </div>
                              </div>
                            );
                          }) : (
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No instructors assigned right now.</div>
                          )}
                      </div>
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
      <h1 className="dash-h1" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--foreground)', fontWeight: '800' }}>
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
