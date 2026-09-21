import type { EditableLayerData, EditableLayerPatch } from '../drawing/editableLayers.js';

export interface EditableLayerPropertiesCallbacks {
  onCommit: (patch: EditableLayerPatch) => void;
}

const LABELS: Record<EditableLayerData['kind'], string> = {
  text: 'Text Layer', balloon: 'Balloon Layer', panel: 'Panel Grid',
  'screen-tone': 'Screen Tone', 'manga-effect': 'Manga Effect', material: 'Material'
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]!);
}

function numberField(name: string, label: string, value: number, min?: number, max?: number, step = '1'): string {
  return `<label class="editable-field"><span>${label}</span><input data-editable-field="${name}" type="number" value="${value}" step="${step}"${min === undefined ? '' : ` min="${min}"`}${max === undefined ? '' : ` max="${max}"`}></label>`;
}

function colorField(name: string, label: string, value: string): string {
  return `<label class="editable-field color"><span>${label}</span><input data-editable-field="${name}" type="color" value="${escapeHtml(value)}"></label>`;
}

function selectField(name: string, label: string, value: string, options: Array<[string,string]>): string {
  return `<label class="editable-field"><span>${label}</span><select data-editable-field="${name}">${options.map(([key,text])=>`<option value="${key}"${key===value?' selected':''}>${text}</option>`).join('')}</select></label>`;
}

function fields(data: EditableLayerData): string {
  if (data.kind === 'text') return `<label class="editable-field wide"><span>Content</span><textarea data-editable-field="content" rows="3">${escapeHtml(data.content)}</textarea></label>
    <label class="editable-field"><span>Font</span><input data-editable-field="fontFamily" value="${escapeHtml(data.fontFamily)}"></label>
    ${numberField('fontSize','Size',data.fontSize,1,4096)}${numberField('fontWeight','Weight',data.fontWeight,100,900, '100')}
    ${selectField('alignment','Align',data.alignment,[['left','Left'],['center','Center'],['right','Right']])}
    ${numberField('lineHeight','Line height',data.lineHeight,.1,10,'.1')}${numberField('letterSpacing','Letter spacing',data.letterSpacing,-1000,1000,'.1')}
    ${colorField('fillColor','Fill',data.fillColor)}${colorField('outlineColor','Outline',data.outlineColor)}${numberField('outlineWidth','Outline width',data.outlineWidth,0,1024,'.5')}
    ${numberField('x','X',data.x)}${numberField('y','Y',data.y)}`;
  if (data.kind === 'balloon') return `${selectField('shape','Shape',data.shape,[['ellipse','Ellipse'],['rounded-rectangle','Rounded rectangle']])}
    ${numberField('x','X',data.x)}${numberField('y','Y',data.y)}${numberField('width','Width',data.width,1)}${numberField('height','Height',data.height,1)}
    ${numberField('cornerRadius','Corner',data.cornerRadius,0)}${numberField('tailEndX','Tail X',data.tailEndX)}${numberField('tailEndY','Tail Y',data.tailEndY)}${numberField('tailBaseSize','Tail base',data.tailBaseSize,1)}
    ${colorField('fillColor','Fill',data.fillColor)}${colorField('strokeColor','Stroke',data.strokeColor)}${numberField('strokeWidth','Stroke width',data.strokeWidth,0,1024,'.5')}`;
  if (data.kind === 'panel') return `${numberField('rows','Rows',data.rows,1,100)}${numberField('columns','Columns',data.columns,1,100)}${numberField('margin','Margin',data.margin,0)}${numberField('gutter','Gutter',data.gutter,0)}${colorField('strokeColor','Stroke',data.strokeColor)}${numberField('strokeWidth','Stroke width',data.strokeWidth,.1,1024,'.1')}`;
  if (data.kind === 'screen-tone') return `${selectField('pattern','Pattern',data.pattern,[['dots','Dots'],['lines','Lines']])}${numberField('frequency','Frequency',data.frequency,.5,4096,'.5')}${numberField('angle','Angle',data.angle,-360000,360000,'.5')}${numberField('density','Density',data.density,.01,1,'.01')}${colorField('color','Color',data.color)}`;
  if (data.kind === 'manga-effect') return `${selectField('effect','Effect',data.effect,[['speed','Speed lines'],['focus','Focus lines']])}${numberField('seed','Seed',data.seed,0,4294967295)}${numberField('count','Count',data.count,1,2000)}${numberField('width','Width',data.width,.1,1024,'.1')}${numberField('length','Length',data.length,.1,undefined,'.1')}${numberField('centerX','Center X',data.centerX)}${numberField('centerY','Center Y',data.centerY)}${numberField('angle','Angle',data.angle,-360000,360000,'.5')}${colorField('color','Color',data.color)}`;
  return `${selectField('materialType','Type',data.materialType,[['image','Image'],['pattern','Pattern'],['texture','Texture']])}${numberField('x','X',data.x)}${numberField('y','Y',data.y)}${numberField('scale','Scale',data.scale,.001,1000,'.001')}${numberField('rotation','Rotation',data.rotation,-360000,360000,'.5')}${selectField('repeat','Repeat',data.repeat,[['no-repeat','None'],['repeat','Both'],['repeat-x','Horizontal'],['repeat-y','Vertical']])}<div class="material-asset-readout">Embedded ${data.asset.width} × ${data.asset.height} RGBA</div>`;
}

export class EditableLayerProperties {
  readonly element: HTMLElement;
  private kind: EditableLayerData['kind'] | null = null;
  private composing = false;
  private data: EditableLayerData | null = null;

  constructor(private readonly callbacks: EditableLayerPropertiesCallbacks) {
    this.element = document.createElement('div');
    this.element.className = 'editable-layer-properties';
  }

  update(data: EditableLayerData, locked = false): void {
    this.data = data;
    if (this.kind !== data.kind) {
      this.kind = data.kind;
      this.element.dataset.kind = data.kind;
      this.element.setAttribute('data-editable-properties', '');
      this.element.innerHTML = `<div class="context-hero editable-hero"><span class="context-icon">${data.kind === 'text' ? 'T' : data.kind === 'material' ? '▧' : '◇'}</span><div><b>${LABELS[data.kind]}</b><span data-editable-status>Editable after placement</span></div></div><div class="editable-property-error" data-editable-error hidden role="alert"></div><div class="editable-field-grid">${fields(data)}</div>`;
      this.installEvents();
    }
    const values = data as unknown as Record<string, unknown>;
    this.element.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-editable-field]').forEach((control) => {
      if (document.activeElement === control || this.composing) return;
      const value = values[control.dataset.editableField ?? ''];
      if (value !== undefined) control.value = String(value);
    });
    if (data.kind === 'material') {
      const readout=this.element.querySelector<HTMLElement>('.material-asset-readout');
      if(readout)readout.textContent=`Embedded ${data.asset.width} × ${data.asset.height} RGBA`;
    }
    const status=this.element.querySelector<HTMLElement>('[data-editable-status]');if(status)status.textContent=locked?'Layer locked · unlock before editing':'Editable after placement';
    this.element.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-editable-field]').forEach((control)=>{control.disabled=locked;});
  }

  private installEvents(): void {
    this.element.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-editable-field]').forEach((control) => {
      control.addEventListener('compositionstart', () => { this.composing = true; });
      control.addEventListener('compositionend', () => { this.composing = false; });
      control.addEventListener('change', () => {
        const key = control.dataset.editableField;
        if (!key) return;
        const value = control instanceof HTMLInputElement && control.type === 'number' ? Number(control.value) : control.value;
        const error=this.element.querySelector<HTMLElement>('[data-editable-error]')!;
        try {
          this.callbacks.onCommit({ [key]: value } as EditableLayerPatch);
          error.hidden=true;error.textContent='';
        } catch (caught) {
          const previous=(this.data as unknown as Record<string,unknown>|null)?.[key];
          if(previous!==undefined)control.value=String(previous);
          error.textContent=caught instanceof Error?`Could not update property: ${caught.message}`:'Could not update property.';
          error.hidden=false;
        }
      });
    });
  }
}
