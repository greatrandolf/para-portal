/** "₱15.00" */
export function formatPeso(value: number, fractionDigits = 2): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
}

/** 862 -> "14m 22s" */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** 10.3175 -> "10.3175° N" */
export function formatCoord(value: number, axis: 'lat' | 'lng'): string {
  const dir = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(4)}° ${dir}`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '—';
  const minutes = Math.round((now - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(then).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
