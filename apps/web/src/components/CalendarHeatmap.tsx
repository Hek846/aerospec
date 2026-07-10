import { useMemo, useState } from 'react';
import type { AnalyticsCalendar, CalendarDay, ScoreBand } from '../api/analytics';
import './CalendarHeatmap.css';

interface CalendarHeatmapProps {
  data: AnalyticsCalendar | null;
  month: string;
  loading: boolean;
  onMonthChange: (month: string) => void;
}

interface CalendarCell {
  key: string;
  date: Date | null;
  day: CalendarDay | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthDate(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function toMonthString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftMonth(month: string, offset: number) {
  const date = monthDate(month);
  date.setMonth(date.getMonth() + offset);
  return toMonthString(date);
}

function scoreBandClass(band: ScoreBand | null, score: number | null) {
  if (!band && score === null) return 'calendar-cell--empty';
  if (band === 'excellent' || band === 'good') return 'calendar-cell--good';
  if (band === 'fair') return 'calendar-cell--moderate';
  if (band === 'poor') return 'calendar-cell--sensitive';
  if (band === 'bad') return 'calendar-cell--unhealthy';

  if ((score ?? 0) >= 80) return 'calendar-cell--good';
  if ((score ?? 0) >= 60) return 'calendar-cell--moderate';
  if ((score ?? 0) >= 40) return 'calendar-cell--sensitive';
  if ((score ?? 0) >= 20) return 'calendar-cell--unhealthy';
  return 'calendar-cell--hazardous';
}

function isSameDate(left: CalendarDay | null, right: CalendarDay | null) {
  return !!left && !!right && left.date === right.date;
}

function formatMetric(metric: string | null) {
  const labels: Record<string, string> = {
    score: 'Score',
    pm25: 'PM2.5',
    pm10: 'PM10',
    co2: 'CO2',
    vocIndex: 'VOC',
    humidity: 'Humidity',
    aqi: 'AQI',
  };

  return metric ? labels[metric] ?? metric : 'None';
}

function buildCells(month: string, days: CalendarDay[]): CalendarCell[] {
  const first = monthDate(month);
  const daysByDate = new Map(days.map(day => [day.date, day]));
  const cellCount = Math.ceil((first.getDay() + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const dayOffset = index - first.getDay() + 1;
    const date = new Date(first.getFullYear(), first.getMonth(), dayOffset);
    const inMonth = date.getMonth() === first.getMonth();
    const dateKey = inMonth ? toDateKey(date) : `blank-${index}`;

    return {
      key: dateKey,
      date: inMonth ? date : null,
      day: inMonth ? daysByDate.get(dateKey) ?? null : null,
    };
  });
}

function Skeleton() {
  return (
    <section className="calendar-panel calendar-panel--loading" aria-label="Loading calendar">
      <div className="calendar-panel__header">
        <div className="calendar-skeleton calendar-skeleton--title" />
        <div className="calendar-panel__nav">
          <div className="calendar-skeleton calendar-skeleton--button" />
          <div className="calendar-skeleton calendar-skeleton--button" />
        </div>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: 35 }, (_, index) => (
          <div className="calendar-skeleton calendar-skeleton--cell" key={index} />
        ))}
      </div>
    </section>
  );
}

export function CalendarHeatmap({ data, month, loading, onMonthChange }: CalendarHeatmapProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const monthLabel = formatMonth(monthDate(month));
  const cells = useMemo(() => buildCells(month, data?.days ?? []), [data?.days, month]);
  const selectedDay = data?.days.find(day => day.date === selectedDate) ?? null;
  const hasData = (data?.days ?? []).some(day => day.score !== null);

  if (loading) return <Skeleton />;

  return (
    <section className="calendar-panel" aria-label="Monthly score heatmap">
      <div className="calendar-panel__header">
        <div>
          <p>Calendar</p>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-panel__nav">
          <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid">
        {cells.map(cell => {
          if (!cell.date) {
            return <span className="calendar-cell calendar-cell--blank" key={cell.key} />;
          }

          const isBest = isSameDate(cell.day, data?.bestDay ?? null);
          const isWorst = isSameDate(cell.day, data?.worstDay ?? null);
          const isSelected = selectedDate === cell.day?.date;
          const classes = [
            'calendar-cell',
            scoreBandClass(cell.day?.band ?? null, cell.day?.score ?? null),
            isBest ? 'calendar-cell--best' : '',
            isWorst ? 'calendar-cell--worst' : '',
            isSelected ? 'calendar-cell--selected' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              type="button"
              className={classes}
              key={cell.key}
              onClick={() => setSelectedDate(cell.day?.date ?? null)}
              disabled={!cell.day}
              aria-label={`${cell.date.getDate()} ${monthLabel}: ${cell.day?.score ?? 'no'} score`}
            >
              <span>{cell.date.getDate()}</span>
              <strong>{cell.day?.score ?? '--'}</strong>
            </button>
          );
        })}
      </div>

      {!hasData && (
        <div className="calendar-panel__empty">
          No daily score data for this month yet.
        </div>
      )}

      <div className="calendar-detail">
        {selectedDay ? (
          <>
            <span>Selected day</span>
            <strong>{selectedDay.date}: {selectedDay.score ?? '--'} score</strong>
            <small>Worst metric: {formatMetric(selectedDay.worstMetric)}</small>
          </>
        ) : (
          <>
            <span>Day detail</span>
            <strong>Select a recorded day</strong>
            <small>Best and worst days are outlined in the grid.</small>
          </>
        )}
      </div>
    </section>
  );
}
