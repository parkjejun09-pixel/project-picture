import type { ShortcutProfile, Tool } from './types.js';

export const TOOL_SHORTCUTS: Record<ShortcutProfile, Readonly<Record<string, Tool>>> = {
  studio: { b:'brush', e:'eraser', s:'smudge', q:'blur', x:'mix', h:'pan', g:'fill', i:'eyedropper', d:'gradient', u:'shape', m:'select', w:'magic-wand', l:'lasso', t:'transform', v:'vector', a:'text', r:'assist' },
  adobe: { b:'brush', e:'eraser', s:'smudge', q:'blur', x:'mix', h:'pan', g:'fill', i:'eyedropper', d:'gradient', u:'shape', m:'select', w:'magic-wand', l:'lasso', t:'transform', p:'vector', a:'text', r:'assist' },
  clip: { p:'brush', e:'eraser', j:'smudge', q:'blur', x:'mix', h:'pan', g:'fill', i:'eyedropper', d:'gradient', u:'shape', m:'select', w:'magic-wand', l:'lasso', t:'transform', v:'vector', a:'text', r:'assist' }
};

export function shortcutForTool(tool: Tool, profile: ShortcutProfile): string | undefined {
  return Object.entries(TOOL_SHORTCUTS[profile]).find(([, mapped]) => mapped === tool)?.[0]?.toUpperCase();
}
