/** Format seconds as mm:ss for read-only display (e.g. 125 → "02:05"). */
export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Same as formatTime but used as initial value of editable inputs. */
export function formatTimeInput(sec: number): string {
  return formatTime(sec);
}

/**
 * Parse a user input string into seconds. Accepts:
 *   - "125"     → 125
 *   - "125.5"   → 125.5
 *   - "2:05"    → 125
 *   - "02:05"   → 125
 *   - "2:05.5"  → 125.5
 * Returns null on invalid input.
 */
export function parseTimeInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes(':')) {
    const [mStr, secStr] = s.split(':', 2);
    const m = parseInt(mStr, 10);
    const sec = parseFloat(secStr);
    if (isNaN(m) || isNaN(sec)) return null;
    return m * 60 + sec;
  }
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}
