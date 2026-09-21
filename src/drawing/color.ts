const HEX_3 = /^#?([0-9a-fA-F]{3})$/;
const HEX_6 = /^#?([0-9a-fA-F]{6})$/;

export function normalizeHex(input: string): string | null {
  const value = input.trim();
  const short = value.match(HEX_3);
  if (short?.[1]) {
    const expanded = [...short[1]].map((char) => `${char}${char}`).join('');
    return `#${expanded.toUpperCase()}`;
  }

  const full = value.match(HEX_6);
  if (full?.[1]) return `#${full[1].toUpperCase()}`;
  return null;
}
