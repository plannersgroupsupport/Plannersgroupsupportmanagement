/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to get a range of 7 days starting from a specific date
function getWeekDays(startDate: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function AttendancePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('none');
  
  // Date state: Start of the visible week
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // Center around today
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [bulkData, setBulkData] = useState<Record<string, Record<string, string>>>({});
  const [monthData, setMonthData] = useState<Record<string, Record<string, string>>>({}); // Full month for stats
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [markingCell, setMarkingCell] = useState<string | null>(null); // "userId-date"
  const [popover, setPopover] = useState<{ userId: string, dateKey: string } | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const startDateStr = useMemo(() => formatDate(weekDays[0]), [weekDays]);
  const endDateStr = useMemo(() => formatDate(weekDays[6]), [weekDays]);

  const fetchAttendance = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
      const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
      
      const [weekRes, monthRes] = await Promise.all([
        fetch(`/api/attendance?startDate=${startDateStr}&endDate=${endDateStr}`).then(r => r.json()),
        fetch(`/api/attendance?startDate=${formatDate(monthStart)}&endDate=${formatDate(monthEnd)}`).then(r => r.json())
      ]);
      
      setBulkData(weekRes.bulkMap || {});
      setMonthData(monthRes.bulkMap || {});
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, [startDateStr, endDateStr, weekStart]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/users?role=STUDENT')
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setStudents(data); 
        } else {
          console.error('Invalid student data:', data);
          setStudents([]);
        }
        setLoading(false); 
      });
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Calculate monthly stats for each student
  const studentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    students.forEach(s => {
      const records = monthData[s.id] || {};
      let present = 0;
      let workingDays = 0;
      
      // Calculate for the current month up to today
      const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
      const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
      const endCalc = today < monthEnd ? today : monthEnd;

      for (let d = new Date(monthStart); d <= endCalc; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue; // Skip Sundays
        
        const dKey = formatDate(d);
        const status = records[dKey];
        
        if (status === 'HOLIDAY') continue; // Global/Set holidays don't count towards percentage usually
        
        workingDays++;
        if (status === 'PRESENT') present++;
        else if (status === 'MEDICAL') {
            // Medical usually counts as neutralized/excused
            // We'll reduce working days requirement
            workingDays--;
        }
      }
      
      stats[s.id] = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
    });
    return stats;
  }, [students, monthData, weekStart]);

  const handleMarkAttendance = async (userId: string, dateKey: string, status: string) => {
    const cellId = `${userId}-${dateKey}`;
    setMarkingCell(cellId);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, date: dateKey })
      });

      if (res.ok) {
        // Update both maps
        const updateMap = (prev: any) => {
            const studentData = { ...(prev[userId] || {}) };
            if (status === 'CLEAR') delete studentData[dateKey];
            else studentData[dateKey] = status;
            return { ...prev, [userId]: studentData };
        };
        setBulkData(updateMap);
        setMonthData(updateMap);
      }
    } catch (err) {
      console.error('Failed to mark attendance:', err);
    }
    setMarkingCell(null);
    setPopover(null);
  };

  const handleBulkMark = async (status: string) => {
    if (!confirm(`Mark everyone ${status.toLowerCase()} for the current visible week?`)) return;
    
    setCalendarLoading(true);
    // In a real production app, we'd have a bulk API. For now, we'll sequentially update or 
    // better, just mark today for everyone. Let's do bulk for today.
    const todayStr = formatDate(new Date());
    
    try {
      await Promise.all(students.map(s => 
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: s.id, status, date: todayStr })
        })
      ));
      fetchAttendance();
    } catch (err) {
      console.error('Bulk marking failed:', err);
    }
    setCalendarLoading(false);
  };

  const navigateWeek = (offset: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(weekStart.getDate() + offset);
    setWeekStart(newDate);
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const filteredStudents = useMemo(() => {
    let list = [...students].filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.loginId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [students, searchTerm, sortBy]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading student directory...</div>;

  return (
    <div style={{ padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: '800', background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attendance Registry</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Track and manage student presence across the institution.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => {
                const m = weekStart.getMonth() + 1;
                const y = weekStart.getFullYear();
                window.open(`/api/attendance/download?month=${y}-${String(m).padStart(2, '0')}`, '_blank');
            }} 
            style={{ padding: '0.75rem 1.25rem', background: 'white', color: '#64748b', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📊 Download Report
          </button>
          <button onClick={() => handleBulkMark('PRESENT')} style={{ padding: '0.75rem 1.25rem', background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Mark Today Present ✅</button>
          <button onClick={() => handleBulkMark('HOLIDAY')} style={{ padding: '0.75rem 1.25rem', background: '#fffbeb', color: '#d97706', border: '1px solid #f59e0b', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Mark Today Holiday 🏖️</button>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Search students..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '300px', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)' }}
          />
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            <option value="none">Sort: Default</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px' }}>
          <button onClick={() => navigateWeek(-7)} style={navButtonStyle}>← Prev Week</button>
          <button onClick={goToToday} style={{ ...navButtonStyle, background: 'white', color: 'var(--primary)' }}>Today</button>
          <button onClick={() => navigateWeek(7)} style={navButtonStyle}>Next Week →</button>
        </div>
      </div>

      {/* Grid Registry */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1.5rem 1rem', width: '250px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10 }}>Student Details</th>
                {weekDays.map(date => {
                  const isToday = formatDate(date) === formatDate(new Date());
                  return (
                    <th key={date.getTime()} style={{ padding: '1rem', textAlign: 'center', minWidth: '100px', borderLeft: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{DAYS[date.getDay()]}</div>
                      <div style={{ 
                        fontSize: '1rem', 
                        fontWeight: isToday ? '800' : '600', 
                        color: isToday ? 'var(--primary)' : 'inherit',
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: isToday ? '#e8f5e9' : 'transparent'
                      }}>
                        {date.getDate()} {date.toLocaleString('default', { month: 'short' })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '1rem', position: 'sticky', left: 0, background: 'white', zIndex: 5, boxShadow: '2px 0 5px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569', fontSize: '0.85rem' }}>
                        {student.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{student.name}</div>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: '800', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '20px', 
                                background: (studentStats[student.id] || 0) > 85 ? '#dcfce7' : (studentStats[student.id] || 0) > 75 ? '#fef3c7' : '#fef2f2',
                                color: (studentStats[student.id] || 0) > 85 ? '#166534' : (studentStats[student.id] || 0) > 75 ? '#92400e' : '#991b1b',
                                border: '1px solid currentColor'
                            }}>
                                {studentStats[student.id] || 0}%
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.loginId}</div>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(date => {
                    const dateKey = formatDate(date);
                    const status = bulkData[student.id]?.[dateKey];
                    const isFuture = date > new Date();
                    const isSunday = date.getDay() === 0;
                    
                    return (
                      <td key={dateKey} style={{ padding: '0.75rem', textAlign: 'center', borderLeft: '1px solid #f1f5f9', background: isSunday ? '#fef2f2' : 'transparent' }}>
                        {!isFuture && !isSunday ? (
                          <AttendanceMarker 
                            status={status} 
                            loading={markingCell === `${student.id}-${dateKey}`}
                            onMark={(s) => handleMarkAttendance(student.id, dateKey, s)}
                            onOpenOptions={() => setPopover({ userId: student.id, dateKey })}
                            activePopover={popover?.userId === student.id && popover?.dateKey === dateKey}
                          />
                        ) : (
                          <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{isSunday ? 'OFF' : '-'}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend Footer */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Present
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> Absent
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} /> Medical
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> Holiday
        </div>
      </div>
    </div>
  );
}

function AttendanceMarker({ status, loading, onMark, onOpenOptions, activePopover }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem', position: 'relative' }}>
      {/* Present (Check) */}
      <button 
        onClick={() => onMark(status === 'PRESENT' ? 'CLEAR' : 'PRESENT')}
        disabled={loading}
        style={{ ...markerButtonStyle, 
          background: status === 'PRESENT' ? '#dcfce7' : '#f8fafc',
          color: status === 'PRESENT' ? '#166534' : '#94a3b8',
          borderColor: status === 'PRESENT' ? '#86efac' : '#e2e8f0',
          transform: status === 'PRESENT' ? 'scale(1.1)' : 'scale(1)'
        }}
        title="Present"
      >
        ✓
      </button>

      {/* Absent (Cross) */}
      <button 
        onClick={() => onMark(status === 'ABSENT' ? 'CLEAR' : 'ABSENT')}
        disabled={loading}
        style={{ ...markerButtonStyle, 
          background: status === 'ABSENT' ? '#fef2f2' : '#f8fafc',
          color: status === 'ABSENT' ? '#991b1b' : '#94a3b8',
          borderColor: status === 'ABSENT' ? '#fca5a5' : '#e2e8f0',
          transform: status === 'ABSENT' ? 'scale(1.1)' : 'scale(1)'
        }}
        title="Absent"
      >
        ✕
      </button>

      {/* Options (Tag) Button with Labels */}
      <button 
        onClick={onOpenOptions}
        disabled={loading}
        style={{ ...markerButtonStyle, 
          width: (status === 'MEDICAL' || status === 'HOLIDAY') ? 'auto' : '28px',
          padding: (status === 'MEDICAL' || status === 'HOLIDAY') ? '0 0.5rem' : '0',
          background: (status === 'MEDICAL' || status === 'HOLIDAY') ? '#f3e8ff' : '#f8fafc',
          color: status === 'MEDICAL' ? '#6b21a8' : status === 'HOLIDAY' ? '#92400e' : '#94a3b8',
          borderColor: (status === 'MEDICAL' || status === 'HOLIDAY') ? '#c084fc' : '#e2e8f0',
          gap: '0.25rem'
        }}
        title="Special Status"
      >
        <span>🏷️</span>
        {(status === 'MEDICAL' || status === 'HOLIDAY') && (
            <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>{status === 'MEDICAL' ? 'M' : 'H'}</span>
        )}
      </button>

      {/* Popover Menu */}
      {activePopover && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onOpenOptions} />
          <div style={{
            position: 'absolute',
            top: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 101,
            padding: '0.4rem',
            minWidth: '120px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', padding: '0.2rem 0.6rem' }}>Label As:</div>
            <button onClick={() => onMark('MEDICAL')} style={popoverButtonStyle}>🏥 Medical</button>
            <button onClick={() => onMark('HOLIDAY')} style={popoverButtonStyle}>🏖️ Holiday</button>
            <div style={{ height: '1px', background: '#f1f5f9', margin: '0.2rem 0' }} />
            <button onClick={() => onMark('CLEAR')} style={{ ...popoverButtonStyle, color: '#ef4444' }}>🗑️ Clear</button>
          </div>
        </>
      )}
    </div>
  );
}

const markerButtonStyle: any = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  outline: 'none',
  padding: 0
};

const popoverButtonStyle: any = {
  padding: '0.5rem 0.8rem',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  width: '100%',
  borderRadius: '8px',
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const navButtonStyle: any = {
  padding: '0.4rem 0.8rem',
  background: 'transparent',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#64748b',
  cursor: 'pointer',
  transition: 'all 0.2s'
};
