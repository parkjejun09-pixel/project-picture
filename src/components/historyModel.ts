export function appendHistoryEntry(entries: readonly string[], label: string, limit = 10): string[] {
  const clean = label.trim();
  if (!clean) return [...entries];
  const next = [clean, ...entries];
  return next.slice(0, Math.max(1, limit));
}
