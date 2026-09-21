import type { CanvasSurround, ShortcutProfile, UiDensity, WorkspaceHandedness } from './types.js';

export interface WorkspacePreferences {
  handedness: WorkspaceHandedness;
  canvasSurround: CanvasSurround;
  uiDensity: UiDensity;
  shortcutProfile: ShortcutProfile;
  collapsedPanels: string[];
}

export const WORKSPACE_PREFERENCES_VERSION = 1;
export const WORKSPACE_STORAGE_KEY = 'drawing-studio.workspace.v1';

export const defaultWorkspacePreferences: WorkspacePreferences = {
  handedness: 'right',
  canvasSurround: 'neutral',
  uiDensity: 'comfortable',
  shortcutProfile: 'studio',
  collapsedPanels: []
};

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

export function workspacePreferencesFromState(state: WorkspacePreferences): WorkspacePreferences {
  return {
    handedness: state.handedness,
    canvasSurround: state.canvasSurround,
    uiDensity: state.uiDensity,
    shortcutProfile: state.shortcutProfile,
    collapsedPanels: [...state.collapsedPanels]
  };
}

export function serializeWorkspacePreferences(preferences: WorkspacePreferences): string {
  return JSON.stringify({ version: WORKSPACE_PREFERENCES_VERSION, ...preferences });
}

export function parseWorkspacePreferences(raw: string | null | undefined): WorkspacePreferences {
  if (!raw) return { ...defaultWorkspacePreferences, collapsedPanels: [] };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== WORKSPACE_PREFERENCES_VERSION) return { ...defaultWorkspacePreferences, collapsedPanels: [] };
    const handedness: WorkspaceHandedness = parsed.handedness === 'left' || parsed.handedness === 'right' ? parsed.handedness : defaultWorkspacePreferences.handedness;
    const canvasSurround: CanvasSurround = parsed.canvasSurround === 'neutral' || parsed.canvasSurround === 'dark' || parsed.canvasSurround === 'light' ? parsed.canvasSurround : defaultWorkspacePreferences.canvasSurround;
    const uiDensity: UiDensity = parsed.uiDensity === 'comfortable' || parsed.uiDensity === 'compact' ? parsed.uiDensity : defaultWorkspacePreferences.uiDensity;
    const shortcutProfile: ShortcutProfile = parsed.shortcutProfile === 'studio' || parsed.shortcutProfile === 'adobe' || parsed.shortcutProfile === 'clip' ? parsed.shortcutProfile : defaultWorkspacePreferences.shortcutProfile;
    return {
      handedness,
      canvasSurround,
      uiDensity,
      shortcutProfile,
      collapsedPanels: uniqueStrings(parsed.collapsedPanels)
    };
  } catch {
    return { ...defaultWorkspacePreferences, collapsedPanels: [] };
  }
}
