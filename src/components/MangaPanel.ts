import type { EditorState } from '../editor/types.js';
import type { EditableLayerKind, MangaEffectType, MaterialAsset, MaterialType } from '../drawing/editableLayers.js';
import { bytesToBase64 } from '../persistence/projectFormat.js';

export interface MangaPanelCallbacks {
  onAdd: (kind: Exclude<EditableLayerKind, 'material'>, effect?: MangaEffectType) => void;
  onMaterial: (asset: MaterialAsset, type: MaterialType) => void;
  onTextContent: (value: string) => void;
  onTextSize: (value: number) => void;
  onTextFont: (value: string) => void;
}

const TEXT_CONTENT_LIMIT = 1000;
const TEXT_SIZE_MIN = 6;
const TEXT_SIZE_MAX = 300;

function normalizeTextSize(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, parsed)) : TEXT_SIZE_MIN;
}

export class MangaPanel {
  readonly element: HTMLElement;
  private readonly fileInput: HTMLInputElement;
  private readonly error: HTMLElement;
  private materialType: MaterialType = 'image';

  constructor(state: EditorState, private readonly callbacks: MangaPanelCallbacks) {
    this.element = document.createElement('section');
    this.element.className = 'panel manga-panel';
    this.element.innerHTML = `<div class="panel-heading compact-heading"><div><span class="eyebrow">CREATE</span><h2>Manga / Materials</h2></div><span class="brush-engine-badge">V0.6.7</span></div>
      <div class="manga-action-grid">
        <button data-editable-add="text"><b>T</b><span>Text</span></button><button data-editable-add="balloon"><b>◯</b><span>Balloon</span></button><button data-editable-add="panel"><b>▦</b><span>Panel</span></button><button data-editable-add="tone"><b>⠿</b><span>Tone</span></button><button data-editable-add="speed"><b>≋</b><span>Speed</span></button><button data-editable-add="focus"><b>✦</b><span>Focus</span></button>
      </div>
      <div class="manga-subhead">Text defaults</div>
      <label class="manga-text-default wide"><span>Content</span><textarea data-text-default="content" rows="2" maxlength="${TEXT_CONTENT_LIMIT}"></textarea></label>
      <div class="manga-default-row"><label class="manga-text-default"><span>Font</span><select data-text-default="fontFamily"><option value="sans-serif">Sans</option><option value="serif">Serif</option><option value="monospace">Mono</option></select></label><label class="manga-text-default"><span>Size</span><input data-text-default="fontSize" type="number" min="${TEXT_SIZE_MIN}" max="${TEXT_SIZE_MAX}" step="1"></label></div>
      <div class="manga-subhead">Material import</div>
      <div class="material-import-grid"><button data-material-import="image">Image</button><button data-material-import="pattern">Pattern</button><button data-material-import="texture">Texture</button></div>
      <input data-material-file type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" hidden>
      <div class="material-import-error" data-material-error hidden role="alert"></div>`;
    this.fileInput = this.element.querySelector<HTMLInputElement>('[data-material-file]')!;
    this.error = this.element.querySelector<HTMLElement>('[data-material-error]')!;
    this.element.querySelectorAll<HTMLButtonElement>('[data-editable-add]').forEach((button)=>button.addEventListener('click',()=>{
      const action=button.dataset.editableAdd!;
      if(action==='speed'||action==='focus')this.callbacks.onAdd('manga-effect',action);
      else this.callbacks.onAdd(action === 'tone' ? 'screen-tone' : action as Exclude<EditableLayerKind,'material'>);
    }));
    this.element.querySelectorAll<HTMLButtonElement>('[data-material-import]').forEach((button)=>button.addEventListener('click',()=>this.openImport(button.dataset.materialImport as MaterialType)));
    this.fileInput.addEventListener('change',()=>{void this.importSelectedFile();});
    const contentControl=this.element.querySelector<HTMLTextAreaElement>('[data-text-default="content"]')!;
    contentControl.addEventListener('input',()=>this.callbacks.onTextContent(contentControl.value.slice(0,TEXT_CONTENT_LIMIT)));
    contentControl.addEventListener('change',(event)=>{
      const control=event.currentTarget as HTMLTextAreaElement;const value=control.value.slice(0,TEXT_CONTENT_LIMIT);
      this.callbacks.onTextContent(value);control.value=value;
    });
    const sizeControl=this.element.querySelector<HTMLInputElement>('[data-text-default="fontSize"]')!;
    sizeControl.addEventListener('input',()=>this.callbacks.onTextSize(normalizeTextSize(sizeControl.value)));
    sizeControl.addEventListener('change',(event)=>{
      const control=event.currentTarget as HTMLInputElement;const value=normalizeTextSize(control.value);
      this.callbacks.onTextSize(value);control.value=String(value);
    });
    this.element.querySelector<HTMLSelectElement>('[data-text-default="fontFamily"]')!.addEventListener('change',(event)=>this.callbacks.onTextFont((event.currentTarget as HTMLSelectElement).value));
    this.update(state);
  }

  update(state: EditorState): void {
    const entries: Array<[string,string]> = [['content',state.textValue],['fontSize',String(state.textSize)],['fontFamily',state.textFont]];
    for(const [name,value] of entries){const control=this.element.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(`[data-text-default="${name}"]`);if(control&&document.activeElement!==control)control.value=value;}
  }

  openImport(type: MaterialType): void {
    this.materialType=type;this.error.hidden=true;this.error.textContent='';this.fileInput.value='';this.fileInput.click();
  }

  private async importSelectedFile(): Promise<void> {
    const file=this.fileInput.files?.[0];if(!file)return;
    try {
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP image.');
      const bitmap=await createImageBitmap(file);
      try {
        if(bitmap.width<1||bitmap.height<1||bitmap.width>8192||bitmap.height>8192||bitmap.width*bitmap.height*4>64*1024*1024)throw new Error('Image dimensions are too large.');
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Could not decode image pixels.');
        context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
        this.callbacks.onMaterial({width:bitmap.width,height:bitmap.height,rgba:bytesToBase64(new Uint8Array(pixels.buffer,pixels.byteOffset,pixels.byteLength))},this.materialType);
      } finally {bitmap.close();}
    } catch(error) {
      this.error.textContent=error instanceof Error?`Could not import material: ${error.message}`:'Could not import material.';this.error.hidden=false;
    } finally {this.fileInput.value='';}
  }
}
