'use client';

import { useEffect, useState, useCallback } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function StudentAttendanceCalendar({ userId }: { userId: string }) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const monthKey = getMonthKey(year, month);
      
      // Fetch Holidays
      const holidayRes = await fetch(`/api/holidays?month=${monthKey}`);
      const holidayData = await holidayRes.json();
      setHolidayMap(holidayData.holidayMap || {});

      // Fetch Attendance
      const attendanceRes = await fetch(`/api/attendance?userId=${userId}&month=${monthKey}`);
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
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', color: day === 'Sun' ? '#ef4444' : '#64748b' }}>{day}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dateObj = new Date(currentYear, currentMonth, day);
              const isSunday = dateObj.getDay() === 0;
              const isToday = dateKey === todayKey;
              const isHoliday = !!holidayMap[dateKey];
              const status = attendanceMap[dateKey];

              let bg = 'transparent';
              let borderColor = '#f1f5f9';
              let textColor = 'var(--foreground)';
              let icon = '';

              if (isSunday) { bg = '#fef2f2'; textColor = '#fca5a5'; borderColor = '#fee2e2'; }
              if (isHoliday) { bg = '#fffbeb'; borderColor = '#fde68a'; icon = '🏖️'; }
              if (status === 'PRESENT') { bg = '#ecfdf5'; borderColor = '#34d399'; icon = '✓'; textColor = '#059669'; }
              if (status === 'ABSENT') { bg = '#fef2f2'; borderColor = '#f87171'; icon = '✕'; textColor = '#dc2626'; }
              if (status === 'MEDICAL') { bg = '#f5f3ff'; borderColor = '#a78bfa'; icon = '🏥'; textColor = '#7c3aed'; }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fffbeb', border: '1px solid #fde68a' }} /> Holiday</div>
          </div>
        </div>
      )}
    </div>
  );
}
