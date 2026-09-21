export function normalizeTextSize(value: number): number {
  return Math.max(6, Math.min(300, Number.isFinite(value) ? value : 24));
}

export function textLines(value: string): string[] {
  return value.replace(/\r\n?/g, '\n').split('\n');
}
