import type { EditorState } from '../editor/types.js';

export interface ToolPropertyPanelCallbacks {
  onSize: (value: number) => void;
  onOpacity: (value: number) => void;
  onStabilizer: (value: number) => void;
  onFlow: (value: number) => void;
}

export class ToolPropertyPanel {
  readonly element: HTMLElement;
  private state: EditorState;
  private readonly callbacks: ToolPropertyPanelCallbacks;

  constructor(state: EditorState, callbacks: ToolPropertyPanelCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'panel palette-panel tool-property-panel';
    this.render();
  }

  update(state: EditorState): void { this.state = state; this.render(); }

  private render(): void {
    const toolName = this.state.tool === 'brush' ? 'Brush' : this.state.tool === 'eraser' ? 'Eraser' : this.state.tool === 'vector' ? 'Vector Pen' : this.state.tool[0]!.toUpperCase() + this.state.tool.slice(1);
    const drawingTool = ['brush','eraser','smudge','blur','mix','vector'].includes(this.state.tool);
    this.element.innerHTML = `
      <div class="palette-heading"><span>TOOL PROPERTY</span><small>${toolName}</small></div>
      ${drawingTool ? `<div class="tool-property-list">
        <label><span>Brush size</span><output>${Math.round(this.state.brushSize)} px</output><input data-tool-property="size" type="range" min="1" max="200" value="${Math.round(this.state.brushSize)}"></label>
        <label><span>Opacity</span><output>${Math.round(this.state.opacity * 100)}%</output><input data-tool-property="opacity" type="range" min="1" max="100" value="${Math.round(this.state.opacity * 100)}"></label>
        <label><span>Stabilization</span><output>${Math.round(this.state.stabilizer)}</output><input data-tool-property="stabilizer" type="range" min="0" max="100" value="${Math.round(this.state.stabilizer)}"></label>
        <label><span>${['smudge','blur','mix'].includes(this.state.tool) ? 'Strength' : 'Flow'}</span><output>${Math.round(this.state.flow * 100)}%</output><input data-tool-property="flow" type="range" min="1" max="100" value="${Math.round(this.state.flow * 100)}"></label>
      </div>` : `<div class="tool-property-summary"><b>${toolName}</b><span>Context-specific controls appear in the Properties palette.</span></div>`}`;
    this.element.querySelector<HTMLInputElement>('[data-tool-property="size"]')?.addEventListener('input', (event) => this.callbacks.onSize(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelector<HTMLInputElement>('[data-tool-property="opacity"]')?.addEventListener('input', (event) => this.callbacks.onOpacity(Number((event.currentTarget as HTMLInputElement).value) / 100));
    this.element.querySelector<HTMLInputElement>('[data-tool-property="stabilizer"]')?.addEventListener('input', (event) => this.callbacks.onStabilizer(Number((event.currentTarget as HTMLInputElement).value)));
    this.element.querySelector<HTMLInputElement>('[data-tool-property="flow"]')?.addEventListener('input', (event) => this.callbacks.onFlow(Number((event.currentTarget as HTMLInputElement).value) / 100));
  }
}
