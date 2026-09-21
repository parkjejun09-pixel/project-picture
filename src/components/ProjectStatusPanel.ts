import type { RecoveryCheckpoint, RecentProjectEntry } from '../persistence/autosaveStore.js';

export interface ProjectStatusPanelCallbacks {
  onRestoreRecovery: () => void;
  onDismissRecovery: () => void;
}

export class ProjectStatusPanel {
  readonly element: HTMLElement;
  private readonly recoveryHost: HTMLElement;
  private readonly recentHost: HTMLElement;

  constructor(callbacks: ProjectStatusPanelCallbacks) {
    this.element = document.createElement('section');
    this.element.className = 'dock-panel project-status-panel';
    this.element.innerHTML = `
      <header class="panel-heading"><span>Project Safety</span><small>V0.6.9</small></header>
      <div class="project-recovery" data-project-recovery></div>
      <div class="project-recent-block">
        <div class="project-status-subhead">Recent Projects</div>
        <div class="project-recent-list" data-project-recent></div>
      </div>`;
    this.recoveryHost = this.element.querySelector<HTMLElement>('[data-project-recovery]')!;
    this.recentHost = this.element.querySelector<HTMLElement>('[data-project-recent]')!;
    this.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'restore-recovery') callbacks.onRestoreRecovery();
      if (button.dataset.action === 'dismiss-recovery') callbacks.onDismissRecovery();
    });
  }

  update(recovery: RecoveryCheckpoint | null, recent: RecentProjectEntry[], recoveryValid = true): void {
    if (recovery) {
      const saved = formatTimestamp(recovery.savedAt);
      this.recoveryHost.innerHTML = `
        <div class="project-recovery-card${recoveryValid ? ' is-available' : ' is-unavailable'}">
          <div><strong>${recoveryValid ? 'Recovery available' : 'Recovery unavailable'}</strong><small>${escapeHtml(recovery.title)} · ${escapeHtml(saved)} · rev ${recovery.revision}${recoveryValid ? '' : ' · checkpoint is invalid'}</small></div>
          <div class="project-recovery-actions">
            ${recoveryValid ? '<button type="button" data-action="restore-recovery">Restore Recovery</button>' : ''}
            <button type="button" data-action="dismiss-recovery">Dismiss</button>
          </div>
        </div>`;
    } else {
      this.recoveryHost.innerHTML = `<div class="project-recovery-card"><strong>No recovery pending</strong><small>Autosave checkpoints stay local to this browser.</small></div>`;
    }

    if (recent.length === 0) {
      this.recentHost.innerHTML = `<div class="project-recent-empty">No recent project metadata yet.</div>`;
      return;
    }
    this.recentHost.innerHTML = recent.map((entry) => `
      <div class="project-recent-row">
        <span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.source)} · ${escapeHtml(formatTimestamp(entry.updatedAt))}</small></span>
      </div>`).join('');
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character] ?? character));
}
