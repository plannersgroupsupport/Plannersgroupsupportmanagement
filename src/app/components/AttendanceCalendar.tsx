'use client';

import { useEffect, useState, useCallback } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// All date keys use UTC-based ISO strings to match what is stored in the DB
// Dates stored in DB as UTC midnight e.g. "2026-06-21T00:00:00.000Z" → key "2026-06-21"
// Calendar always generates keys the same way, so they always match

function getMonthKey(year: number, month: number) {
  // month is 0-indexed (JS convention)
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  // month is 0-indexed
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function getFirstDayOfWeekUTC(year: number, month: number) {
  // Returns 0=Sun, 1=Mon ... 6=Sat for the 1st of the month, using UTC
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}

function makeDateKey(year: number, month: number, day: number) {
  // month is 0-indexed
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeekUTC(year: number, month: number, day: number) {
  // Returns 0=Sun ... 6=Sat using UTC (avoids IST/local timezone shift)
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

export default function StudentAttendanceCalendar({ userId }: { userId: string }) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getUTCMonth()); // 0-indexed
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchCalendarData = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const monthKey = getMonthKey(year, month);

      // Fetch Holidays
      const holidayRes = await fetch(`/api/holidays?month=${monthKey}&_t=${Date.now()}`);
      const holidayData = await holidayRes.json();
      setHolidayMap(holidayData.holidayMap || {});

      // Fetch Attendance for this student
      const attendanceRes = await fetch(`/api/attendance?userId=${userId}&month=${monthKey}&_t=${Date.now()}`);
      const attendanceData = await attendanceRes.json();
      setAttendanceMap(attendanceData.attendanceMap || {});
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCalendarData(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchCalendarData]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeekUTC(currentYear, currentMonth);

  // Today's key using UTC (matches DB storage)
  const todayUTC = new Date();
  const todayKey = makeDateKey(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate());

  if (!mounted) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading calendar...
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ 
        padding: '1.25rem', 
        background: 'linear-gradient(135deg, var(--primary), #4c6ef5)', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}>◀</button>
        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{MONTHS[currentMonth]} {currentYear}</div>
        <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}>▶</button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Loading calendar...</div>
      ) : (
        <div style={{ padding: '0.75rem' }}>
          {/* Day Headers — Sun is red */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', color: day === 'Sun' ? '#ef4444' : '#64748b' }}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              // Generate the date key the same way the DB stores it (UTC midnight → YYYY-MM-DD)
              const dateKey = makeDateKey(currentYear, currentMonth, day);
              // Day-of-week using UTC to avoid timezone drift (0=Sun, 6=Sat)
              const dayOfWeek = getDayOfWeekUTC(currentYear, currentMonth, day);
              const isSunday = dayOfWeek === 0;
              const isToday = dateKey === todayKey;
              const isHoliday = !!holidayMap[dateKey];
              const status = attendanceMap[dateKey];

              let bg = '#f8fafc';        // default: subtle gray background
              let borderColor = '#e2e8f0'; // default: visible light border
              let textColor = '#64748b';   // default: muted text
              let icon = '';

              // Faculty-marked statuses (applied first, lowest priority base)
              if (status === 'HOLIDAY') { bg = '#fffbeb'; borderColor = '#fde68a'; icon = '🏖️'; textColor = '#d97706'; }
              if (status === 'PRESENT') { bg = '#ecfdf5'; borderColor = '#34d399'; icon = '✓'; textColor = '#059669'; }
              if (status === 'ABSENT') { bg = '#fef2f2'; borderColor = '#f87171'; icon = '✕'; textColor = '#dc2626'; }
              if (status === 'MEDICAL') { bg = '#f5f3ff'; borderColor = '#a78bfa'; icon = '🏥'; textColor = '#7c3aed'; }
              // Admin-set holiday (overrides individual marks)
              if (isHoliday) { bg = '#fffbeb'; borderColor = '#fde68a'; icon = '🏖️'; textColor = '#d97706'; }
              // SUNDAY always = Holiday — highest priority, cannot be overridden
              if (isSunday) { bg = '#fffbeb'; borderColor = '#fde68a'; icon = '🏖️'; textColor = '#d97706'; }

              return (
                <div key={day} style={{ 
                  aspectRatio: '1', 
                  borderRadius: '6px', 
                  border: isToday ? '2px solid var(--primary)' : `1px solid ${borderColor}`,
                  background: bg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: isToday ? '800' : '500',
                  color: textColor,
                  position: 'relative'
                }}>
                  {day}
                  {icon && <span style={{ fontSize: '0.5rem', marginTop: '2px' }}>{icon}</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ecfdf5', border: '1px solid #34d399' }} /> Present</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fef2f2', border: '1px solid #f87171' }} /> Absent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f5f3ff', border: '1px solid #a78bfa' }} /> Medical</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fffbeb', border: '1px solid #fde68a' }} /> Holiday/Sunday</div>
          </div>
        </div>
      )}
    </div>
  );
}
