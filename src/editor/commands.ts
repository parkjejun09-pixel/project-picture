export type EditorCommandId =
  | 'file.open' | 'file.save' | 'file.saveAs' | 'file.exportPng'
  | 'edit.undo' | 'edit.redo'
  | 'layer.addRaster' | 'select.all' | 'select.clear'
  | 'view.fitCanvas' | 'view.actualSize'
  | 'window.resetWorkspace' | 'help.about';

export interface EditorCommand {
  run: () => void | Promise<void>;
  enabled?: () => boolean;
}

/** One command implementation shared by menus, command bars, and shortcuts. */
export class EditorCommandRegistry {
  private readonly commands = new Map<EditorCommandId, EditorCommand>();

  register(id: EditorCommandId, command: EditorCommand): void { this.commands.set(id, command); }
  has(id: EditorCommandId): boolean { return this.commands.has(id); }
  isEnabled(id: EditorCommandId): boolean { const command = this.commands.get(id); return Boolean(command && (command.enabled?.() ?? true)); }
  execute(id: EditorCommandId): boolean {
    const command = this.commands.get(id);
    if (!command || !(command.enabled?.() ?? true)) return false;
    void command.run();
    return true;
  }
}
