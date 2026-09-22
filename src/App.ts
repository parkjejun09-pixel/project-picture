import { createBottomBar } from './components/BottomBar.js';
import { AssistPanel } from './components/AssistPanel.js';
import { createBrushPanel } from './components/BrushPanel.js';
import { BrushStudioPanel } from './components/BrushStudioPanel.js';
import { pressureResponseLabel } from './components/brushPanelMarkup.js';
import { ColorPanel } from './components/ColorPanel.js';
import { ColorSetPanel } from './components/ColorSetPanel.js';
import { createCommandBar, updateCommandBar } from './components/CommandBar.js';
import { createDockGroup } from './components/DockGroup.js';
import { createDocumentBar, updateDocumentBar } from './components/DocumentBar.js';
import { FillPanel } from './components/FillPanel.js';
import { DrawingCanvas } from './components/DrawingCanvas.js';
import { HistoryPanel } from './components/HistoryPanel.js';
import { LayerPanel } from './components/LayerPanel.js';
import { MangaPanel } from './components/MangaPanel.js';
import { NavigatorPanel } from './components/NavigatorPanel.js';
import { PropertiesPanel } from './components/PropertiesPanel.js';
import { ReferencePanel } from './components/ReferencePanel.js';
import { ProjectStatusPanel } from './components/ProjectStatusPanel.js';
import { decorateCollapsiblePanel } from './components/panelBehavior.js';
import { createToolBar } from './components/ToolBar.js';
import { createTopBar, updateTopBarHandedness } from './components/TopBar.js';
import { ToolPropertyPanel } from './components/ToolPropertyPanel.js';
import { WorkspacePanel } from './components/WorkspacePanel.js';
import { getBrushPreset } from './drawing/brushPresets.js';
import { createEditableLayerData, type EditableLayerKind, type MangaEffectType } from './drawing/editableLayers.js';
import { pressureCurvePath } from './drawing/pressure.js';
import { editorReducer, initialEditorState } from './editor/editorReducer.js';
import {
  parseWorkspacePreferences,
  serializeWorkspacePreferences,
  WORKSPACE_STORAGE_KEY,
  workspacePreferencesFromState
} from './editor/workspacePreferences.js';
import type { EditorAction, EditorState, Tool } from './editor/types.js';
import { EditorCommandRegistry, type EditorCommandId } from './editor/commands.js';
import { TOOL_SHORTCUTS, shortcutForTool } from './editor/shortcuts.js';
import { createProjectSnapshot, ProjectDirtyTracker } from './persistence/projectModel.js';
import { decodeProjectFile, encodeProjectFile } from './persistence/projectFormat.js';
import { deserializeEditorState } from './persistence/editorStateDto.js';
import { validateProjectDocumentDto } from './persistence/documentDto.js';
import type { ProjectDocumentDto } from './persistence/documentDto.js';
import { createBrowserProjectIo, ProjectController } from './persistence/projectController.js';
import { AutosaveCoordinator, IndexedDbAutosaveStore, MemoryAutosaveStore, loadValidRecovery, type AutosaveStore } from './persistence/autosaveStore.js';

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

export class EditorApp {
  private state: EditorState = initialEditorState;
  private readonly root: HTMLElement;
  private shell!: HTMLElement;
  private topBar!: HTMLElement;
  private commandBar!: HTMLElement;
  private documentBar!: HTMLElement;
  private primaryDock!: HTMLElement;
  private secondaryDock!: HTMLElement;
  private drawingCanvas!: DrawingCanvas;
  private layerPanel!: LayerPanel;
  private mangaPanel!: MangaPanel;
  private colorPanel!: ColorPanel;
  private colorSetPanel!: ColorSetPanel;
  private toolPropertyPanel!: ToolPropertyPanel;
  private fillPanel!: FillPanel;
  private brushStudioPanel!: BrushStudioPanel;
  private navigatorPanel!: NavigatorPanel;
  private historyPanel!: HistoryPanel;
  private workspacePanel!: WorkspacePanel;
  private propertiesPanel!: PropertiesPanel;
  private referencePanel!: ReferencePanel;
  private assistPanel!: AssistPanel;
  private projectStatusPanel!: ProjectStatusPanel;
  private panelRegistry: Array<{ element: HTMLElement; id: string }> = [];
  private readonly projectDirty = new ProjectDirtyTracker(() => this.syncProjectChrome());
  private readonly projectController = new ProjectController(createBrowserProjectIo());
  private readonly autosaveStore: AutosaveStore = typeof indexedDB === 'undefined' ? new MemoryAutosaveStore() : new IndexedDbAutosaveStore();
  private readonly autosave = new AutosaveCoordinator(this.autosaveStore, { onError: () => { /* autosave is best-effort; explicit Save remains authoritative */ } });
  private projectTitle = 'Untitled';
  private projectCreatedAt = new Date().toISOString();
  private projectExtensions: Record<string, unknown> = {};
  private readonly commands = new EditorCommandRegistry();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  mount(): void {
    this.loadWorkspacePreferences();
    this.registerCommands();
    this.shell = document.createElement('div');
    this.shell.className = 'editor-shell';

    this.topBar = createTopBar({
      onCommand: (command) => this.commands.execute(command),
      onModeChange: (mode) => this.dispatch({ type: 'mode/set', mode }),
      onToggleHandedness: () => this.dispatch({ type: 'handedness/set', value: this.state.handedness === 'right' ? 'left' : 'right' })
    });

    this.commandBar = createCommandBar(this.state, {
      onCommand: (command) => this.commands.execute(command),
      onSize: (value) => this.dispatch({ type: 'brush-size/set', value }),
      onOpacity: (value) => this.dispatch({ type: 'opacity/set', value }),
      onStabilizer: (value) => this.dispatch({ type: 'stabilizer/set', value }),
      onZoom: (value) => this.dispatch({ type: 'zoom/set', value }),
      onSnapToggle: () => this.dispatch({ type: 'assist-snap/set', value: !this.state.assistSnapEnabled })
    });
    this.documentBar = createDocumentBar();
    const toolBar = createToolBar((tool) => {
      this.dispatch({ type: 'tool/set', tool });
      if (tool === 'material') this.mangaPanel?.openImport('image');
    });
    this.primaryDock = createDockGroup('primary');
    this.secondaryDock = createDockGroup('secondary');
    const center = document.createElement('main');
    center.className = 'workspace';
    center.innerHTML = `<section class="canvas-stage" id="canvas-stage"></section>`;
    const stage = center.querySelector<HTMLElement>('#canvas-stage')!;

    this.historyPanel = new HistoryPanel({ onUndo: () => this.drawingCanvas.undo(), onRedo: () => this.drawingCanvas.redo() });
    this.navigatorPanel = new NavigatorPanel({
      onFit: () => this.dispatch({ type: 'view/reset' }),
      onActual: () => { this.dispatch({ type: 'zoom/set', value: 1 }); this.dispatch({ type: 'pan/set', x: 0, y: 0 }); }
    });

    this.drawingCanvas = new DrawingCanvas(this.state, {
      onHistoryChange: () => { this.syncHistoryButtons(); this.syncNavigator(); },
      onHistoryEntry: (label) => {
        this.historyPanel?.add(label);
        const revision = this.projectDirty.markDirty();
        this.autosave.schedule({ revision, title: this.projectTitle, createProjectText: () => this.buildProjectFileText() });
      },
      onPanChange: (x, y) => this.dispatch({ type: 'pan/set', x, y }),
      onZoomChange: (zoom) => this.dispatch({ type: 'zoom/set', value: zoom }),
      onLayersChange: (layerState) => {
        this.layerPanel?.update(layerState);
        this.propertiesPanel?.update(this.state, this.drawingCanvas.selectionInfo);
        this.syncPanelChrome();
        this.syncNavigator();
      },
      onSelectionChange: (info) => this.propertiesPanel?.update(this.state, info),
      onColorSample: (hex) => this.dispatch({ type: 'color/set', value: hex }),
      onAssistChange: (update) => {
        if (update.type === 'guide-position') this.dispatch({ type: 'guide-position/set', value: update.value });
        else if (update.type === 'radial-center') this.dispatch({ type: 'radial-center/set', x: update.x, y: update.y });
        else if (update.type === 'symmetry-center') this.dispatch({ type: 'symmetry-center/set', x: update.x, y: update.y });
        else if (update.type === 'perspective-horizon') this.dispatch({ type: 'perspective-horizon/set', value: update.value });
        else if (update.type === 'perspective-vp') this.dispatch({ type: 'perspective-vp/set', index: update.index, x: update.x, y: update.y });
      }
    });
    stage.append(this.drawingCanvas.element);

    this.propertiesPanel = new PropertiesPanel(this.state, this.drawingCanvas.selectionInfo, {
      onSelectAll: () => this.drawingCanvas.selectAll(),
      onClearSelection: () => this.drawingCanvas.clearSelection(),
      onSelectionShape: (value) => this.dispatch({ type: 'selection-shape/set', value }),
      onSelectionMode: (value) => this.dispatch({ type: 'selection-mode/set', value }),
      onSelectionFeather: (value) => this.dispatch({ type: 'selection-feather/set', value }),
      onSelectionPenSize: (value) => this.dispatch({ type: 'selection-pen-size/set', value }),
      onSelectionExpand: () => this.drawingCanvas.expandSelection(),
      onSelectionContract: () => this.drawingCanvas.contractSelection(),
      onSelectionInvert: () => this.drawingCanvas.invertSelection(),
      onSelectionFeatherApply: () => this.drawingCanvas.featherSelection(),
      onFinishPolygon: () => this.drawingCanvas.finishPolygonSelection(),
      onTransformMode: (value) => this.dispatch({ type: 'transform-mode/set', value }),
      onFlipHorizontal: () => this.drawingCanvas.flipSelection('horizontal'),
      onFlipVertical: () => this.drawingCanvas.flipSelection('vertical'),
      onRotate90: () => this.drawingCanvas.rotateSelection90(),
      onScale: (factor) => this.drawingCanvas.scaleSelection(factor),
      onVectorWidth: (value) => this.drawingCanvas.setSelectedVectorStrokeWidth(value),
      onVectorRecolor: () => this.drawingCanvas.recolorSelectedVectorStroke(),
      onVectorDelete: () => this.drawingCanvas.deleteSelectedVectorStroke(),
      onVectorRasterize: () => this.drawingCanvas.rasterizeVectorLayer(),
      onVectorAddPoint: () => this.drawingCanvas.addVectorControlPoint(),
      onVectorDeletePoint: () => this.drawingCanvas.deleteVectorControlPoint(),
      onVectorHandles: () => this.drawingCanvas.toggleVectorHandles(),
      onVectorSimplify: () => this.drawingCanvas.simplifySelectedVectorStroke(),
      onVectorConnect: () => this.drawingCanvas.connectSelectedVectorStroke(),
      onVectorRedraw: () => this.drawingCanvas.beginVectorRedraw(),
      onGradientMode: (value) => this.dispatch({ type: 'gradient-mode/set', value }),
      onSecondaryColor: (value) => this.dispatch({ type: 'secondary-color/set', value }),
      onShapeType: (value) => this.dispatch({ type: 'shape-type/set', value }),
      onShapeFill: (value) => this.dispatch({ type: 'shape-fill/set', value }),
      onMagicWandTolerance: (value) => this.dispatch({ type: 'magic-wand-tolerance/set', value }),
      onTextValue: (value) => this.dispatch({ type: 'text-value/set', value }),
      onTextSize: (value) => this.dispatch({ type: 'text-size/set', value }),
      onTextFont: (value) => this.dispatch({ type: 'text-font/set', value }),
      onAssistMode: (value) => this.dispatch({ type: 'assist-mode/set', value }),
      onAssistSnap: (value) => this.dispatch({ type: 'assist-snap/set', value }),
      onEditablePatch: (patch) => this.drawingCanvas.updateEditableLayer(patch)
    });

    const addEditable = (kind: Exclude<EditableLayerKind, 'material'>, effect?: MangaEffectType): void => {
      const size = this.drawingCanvas.canvasSize;
      let data = createEditableLayerData(kind, size.width, size.height);
      if (data.kind === 'text') data = { ...data, content: this.state.textValue, fontFamily: this.state.textFont, fontSize: this.state.textSize, fillColor: this.state.color };
      if (data.kind === 'manga-effect' && effect) data = { ...data, effect };
      this.drawingCanvas.addEditableLayer(data);
    };
    this.mangaPanel = new MangaPanel(this.state, {
      onAdd: addEditable,
      onMaterial: (asset, materialType) => {
        const size = this.drawingCanvas.canvasSize;
        const data = createEditableLayerData('material', size.width, size.height, asset);
        this.drawingCanvas.addEditableLayer({ ...data, materialType, repeat: materialType === 'image' ? 'no-repeat' : 'repeat' });
      },
      onTextContent: (value) => this.dispatch({ type: 'text-value/set', value }),
      onTextSize: (value) => this.dispatch({ type: 'text-size/set', value }),
      onTextFont: (value) => this.dispatch({ type: 'text-font/set', value })
    });

    this.layerPanel = new LayerPanel(this.drawingCanvas.layerState, {
      onAdd: () => this.drawingCanvas.addLayer(),
      onAddVector: () => this.drawingCanvas.addVectorLayer(),
      onAddFill: () => this.drawingCanvas.addFillLayer(),
      onAddGradient: () => this.drawingCanvas.addGradientLayer(),
      onAddCorrection: () => this.drawingCanvas.addCorrectionLayer(),
      onAddSelection: () => this.drawingCanvas.addSelectionLayer(),
      onGroup: () => this.drawingCanvas.groupLayer(),
      onDuplicate: () => this.drawingCanvas.duplicateLayer(),
      onDelete: () => this.drawingCanvas.deleteLayer(),
      onMergeDown: () => this.drawingCanvas.mergeLayerDown(),
      onFlattenVisible: () => this.drawingCanvas.flattenVisibleLayers(),
      onMove: (direction) => this.drawingCanvas.moveLayer(direction),
      onSelect: (id) => this.drawingCanvas.selectLayer(id),
      onVisibility: (id) => this.drawingCanvas.toggleLayerVisibility(id),
      onRename: (name) => this.drawingCanvas.renameLayer(name),
      onOpacity: (opacity) => this.drawingCanvas.setLayerOpacity(opacity),
      onBlendMode: (mode) => this.drawingCanvas.setLayerBlendMode(mode),
      onAlphaLock: () => this.drawingCanvas.toggleAlphaLock(),
      onClipping: () => this.drawingCanvas.toggleClipping(),
      onMask: () => this.drawingCanvas.toggleMask(),
      onSelectMask: (id) => {
        if (id && id !== this.drawingCanvas.layerState.activeLayerId) this.drawingCanvas.selectLayer(id);
        this.drawingCanvas.editMask();
      },
      onRole: (role) => this.drawingCanvas.setLayerRole(role),
      onColorTag: (tag) => this.drawingCanvas.setLayerColorTag(tag),
      onSpecialPatch: (patch) => this.drawingCanvas.updateSpecialLayer(patch)
    });

    this.colorPanel = new ColorPanel(this.state, {
      onColorPreview: (value) => this.dispatch({ type: 'color/preview', value }),
      onColorCommit: (value) => this.dispatch({ type: 'color/commit', value }),
      onToggleFavorite: (value) => this.dispatch({ type: 'favorite-color/toggle', value }),
      onAddProject: (value) => this.dispatch({ type: 'project-color/add', value }),
      onExtractedColors: (values) => this.dispatch({ type: 'extracted-colors/set', values })
    });
    this.colorSetPanel = new ColorSetPanel(this.state, {
      onColorChange: (value) => this.dispatch({ type: 'color/set', value }),
      onToggleFavorite: (value) => this.dispatch({ type: 'favorite-color/toggle', value }),
      onAddProject: (value) => this.dispatch({ type: 'project-color/add', value })
    });
    this.toolPropertyPanel = new ToolPropertyPanel(this.state, {
      onSize: (value) => this.dispatch({ type: 'brush-size/set', value }),
      onOpacity: (value) => this.dispatch({ type: 'opacity/set', value }),
      onStabilizer: (value) => this.dispatch({ type: 'stabilizer/set', value }),
      onFlow: (value) => this.dispatch({ type: 'flow/set', value })
    });
    this.fillPanel = new FillPanel(this.state, {
      onTolerance: (value) => this.dispatch({ type: 'fill-tolerance/set', value }),
      onGap: (value) => this.dispatch({ type: 'fill-gap/set', value }),
      onExpansion: (value) => this.dispatch({ type: 'fill-expansion/set', value }),
      onAntialias: (value) => this.dispatch({ type: 'fill-antialias/set', value }),
      onReference: (value) => this.dispatch({ type: 'fill-reference/set', value }),
      onMode: (value) => this.dispatch({ type: 'fill-mode/set', value })
    });

    const brushPanel = createBrushPanel(this.state, {
      onPreset: (preset) => this.dispatch({ type: 'brush-preset/set', preset }),
      onStabilizer: (value) => this.dispatch({ type: 'stabilizer/set', value }),
      onPressureResponse: (value) => this.dispatch({ type: 'pressure-response/set', value }),
      onPressureSize: (value) => this.dispatch({ type: 'pressure-size/set', value }),
      onPressureOpacity: (value) => this.dispatch({ type: 'pressure-opacity/set', value }),
      onTiltInfluence: (value) => this.dispatch({ type: 'tilt-influence/set', value })
    });

    this.brushStudioPanel = new BrushStudioPanel(this.state, {
      onPressureResponse: (value) => this.dispatch({ type: 'pressure-response/set', value }),
      onPressureSize: (value) => this.dispatch({ type: 'pressure-size/set', value }),
      onPressureOpacity: (value) => this.dispatch({ type: 'pressure-opacity/set', value }),
      onTiltInfluence: (value) => this.dispatch({ type: 'tilt-influence/set', value }),
      onSpacing: (value) => this.dispatch({ type: 'spacing/set', value }),
      onFlow: (value) => this.dispatch({ type: 'flow/set', value }),
      onVelocitySize: (value) => this.dispatch({ type: 'velocity-size/set', value }),
      onRotation: (value) => this.dispatch({ type: 'brush-rotation/set', value }),
      onTaper: (value) => this.dispatch({ type: 'taper/set', value }),
      onTaperStart: (value) => this.dispatch({ type: 'taper-start/set', value }),
      onTaperEnd: (value) => this.dispatch({ type: 'taper-end/set', value }),
      onTaperLength: (value) => this.dispatch({ type: 'taper-length/set', value }),
      onScatter: (value) => this.dispatch({ type: 'scatter/set', value }),
      onSizeJitter: (value) => this.dispatch({ type: 'size-jitter/set', value }),
      onAngleJitter: (value) => this.dispatch({ type: 'angle-jitter/set', value }),
      onColorJitter: (value) => this.dispatch({ type: 'color-jitter/set', value }),
      onGrain: (value) => this.dispatch({ type: 'grain/set', value }),
      onTextureStrength: (value) => this.dispatch({ type: 'texture-strength/set', value }),
      onTextureScale: (value) => this.dispatch({ type: 'texture-scale/set', value }),
      onTextureRotation: (value) => this.dispatch({ type: 'texture-rotation/set', value }),
      onPaperGrain: (value) => this.dispatch({ type: 'paper-grain/set', value }),
      onTextureMap: (value) => this.dispatch({ type: 'brush-texture-map/set', value }),
      onDualBrush: (value) => this.dispatch({ type: 'dual-brush/set', value }),
      onWetMix: (value) => this.dispatch({ type: 'wet-mix/set', value }),
      onImportPreset: (preset) => {
        this.dispatch({ type: 'brush-size/set', value: preset.size }); this.dispatch({ type: 'opacity/set', value: preset.opacity }); this.dispatch({ type: 'spacing/set', value: preset.spacing }); this.dispatch({ type: 'stabilizer/set', value: preset.stabilizer });
        this.dispatch({ type: 'pressure-response/set', value: preset.pressureResponse }); this.dispatch({ type: 'pressure-size/set', value: preset.pressureSize }); this.dispatch({ type: 'pressure-opacity/set', value: preset.pressureOpacity }); this.dispatch({ type: 'tilt-influence/set', value: preset.tiltInfluence });
        this.dispatch({ type: 'flow/set', value: preset.flow }); this.dispatch({ type: 'velocity-size/set', value: preset.velocitySize }); this.dispatch({ type: 'brush-rotation/set', value: preset.rotation }); this.dispatch({ type: 'taper/set', value: preset.taper }); this.dispatch({ type: 'taper-start/set', value: preset.taperStart }); this.dispatch({ type: 'taper-end/set', value: preset.taperEnd }); this.dispatch({ type: 'taper-length/set', value: preset.taperLength }); this.dispatch({ type: 'scatter/set', value: preset.scatter }); this.dispatch({ type: 'size-jitter/set', value: preset.sizeJitter }); this.dispatch({ type: 'angle-jitter/set', value: preset.angleJitter }); this.dispatch({ type: 'color-jitter/set', value: preset.colorJitter }); this.dispatch({ type: 'grain/set', value: preset.grain }); this.dispatch({ type: 'texture-strength/set', value: preset.textureStrength }); this.dispatch({ type: 'texture-scale/set', value: preset.textureScale }); this.dispatch({ type: 'texture-rotation/set', value: preset.textureRotation }); this.dispatch({ type: 'paper-grain/set', value: preset.paperGrain }); this.dispatch({ type: 'dual-brush/set', value: preset.dualBrush }); this.dispatch({ type: 'wet-mix/set', value: preset.wetMix });
      }
    });
    this.workspacePanel = new WorkspacePanel(this.state, {
      onHandedness: (value) => this.dispatch({ type: 'handedness/set', value }),
      onCanvasSurround: (value) => this.dispatch({ type: 'canvas-surround/set', value }),
      onDensity: (value) => this.dispatch({ type: 'ui-density/set', value }),
      onShortcutProfile: (value) => this.dispatch({ type: 'shortcut-profile/set', value }),
      onReset: () => this.dispatch({ type: 'workspace/reset' })
    });

    this.assistPanel = new AssistPanel(this.state, {
      onMode: (value) => this.dispatch({ type: 'assist-mode/set', value }),
      onSnap: (value) => this.dispatch({ type: 'assist-snap/set', value }),
      onGridSize: (value) => this.dispatch({ type: 'grid-size/set', value }),
      onGuideOrientation: (value) => this.dispatch({ type: 'guide-orientation/set', value }),
      onGuidePosition: (value) => this.dispatch({ type: 'guide-position/set', value }),
      onStraightAngle: (value) => this.dispatch({ type: 'straight-angle/set', value }),
      onParallelAngle: (value) => this.dispatch({ type: 'parallel-angle/set', value }),
      onRadialCenter: (x, y) => this.dispatch({ type: 'radial-center/set', x, y }),
      onRadialRays: (value) => this.dispatch({ type: 'radial-rays/set', value }),
      onConcentricSpacing: (value) => this.dispatch({ type: 'concentric-spacing/set', value }),
      onSymmetryAxes: (value) => this.dispatch({ type: 'symmetry-axes/set', value }),
      onSymmetryCenter: (x, y) => this.dispatch({ type: 'symmetry-center/set', x, y }),
      onPerspectiveMode: (value) => this.dispatch({ type: 'perspective-mode/set', value }),
      onPerspectiveHorizon: (value) => this.dispatch({ type: 'perspective-horizon/set', value }),
      onPerspectiveVp: (index, x, y) => this.dispatch({ type: 'perspective-vp/set', index, x, y })
    });
    this.referencePanel = new ReferencePanel();
    this.projectStatusPanel = new ProjectStatusPanel({
      onRestoreRecovery: () => { void this.restoreRecovery(); },
      onDismissRecovery: () => { void this.dismissRecovery(); }
    });

    this.primaryDock.append(
      this.mangaPanel.element,
      this.colorPanel.element,
      this.colorSetPanel.element,
      brushPanel,
      this.toolPropertyPanel.element,
      this.fillPanel.element,
      this.assistPanel.element,
      this.brushStudioPanel.element
    );
    this.secondaryDock.append(
      this.navigatorPanel.element,
      this.propertiesPanel.element,
      this.layerPanel.element,
      this.referencePanel.element,
      this.historyPanel.element,
      this.projectStatusPanel.element,
      this.workspacePanel.element
    );
    this.panelRegistry = [
      { element: this.propertiesPanel.element, id: 'properties' },
      { element: this.mangaPanel.element, id: 'manga-materials' },
      { element: this.referencePanel.element, id: 'reference' },
      { element: brushPanel, id: 'subtool' },
      { element: this.toolPropertyPanel.element, id: 'tool-property' },
      { element: this.fillPanel.element, id: 'fill-property' },
      { element: this.assistPanel.element, id: 'assist' },
      { element: this.brushStudioPanel.element, id: 'brush-studio' },
      { element: this.colorPanel.element, id: 'color' },
      { element: this.colorSetPanel.element, id: 'color-set' },
      { element: this.layerPanel.element, id: 'layers' },
      { element: this.navigatorPanel.element, id: 'navigator' },
      { element: this.historyPanel.element, id: 'history' },
      { element: this.projectStatusPanel.element, id: 'project-safety' },
      { element: this.workspacePanel.element, id: 'workspace' }
    ];

    const bottomBar = createBottomBar({
      onSize: (value) => this.dispatch({ type: 'brush-size/set', value }),
      onOpacity: (value) => this.dispatch({ type: 'opacity/set', value }),
      onStabilizer: (value) => this.dispatch({ type: 'stabilizer/set', value }),
      onSpacing: (value) => this.dispatch({ type: 'spacing/set', value }),
      onZoom: (value) => this.dispatch({ type: 'zoom/set', value })
    });

    const body = document.createElement('div');
    body.className = 'editor-body';
    body.append(toolBar, this.primaryDock, center, this.secondaryDock);
    this.shell.append(this.topBar, this.commandBar, this.documentBar, body, bottomBar);
    this.root.replaceChildren(this.shell);
    this.installKeyboardShortcuts();
    this.syncUI();
    this.syncNavigator();
    void this.refreshProjectStatus();
  }

  private loadWorkspacePreferences(): void {
    try {
      const prefs = parseWorkspacePreferences(window.localStorage?.getItem(WORKSPACE_STORAGE_KEY));
      this.state = { ...this.state, ...prefs };
    } catch { /* private browsing / restricted storage */ }
  }

  private persistWorkspacePreferences(): void {
    try { window.localStorage?.setItem(WORKSPACE_STORAGE_KEY, serializeWorkspacePreferences(workspacePreferencesFromState(this.state))); } catch { /* ignore */ }
  }

  private projectFileName(): string {
    const base = this.projectTitle.trim().replace(/[\/:*?"<>|]+/g, '-').replace(/\.drawstudio$/i, '') || 'Untitled';
    return `${base}.drawstudio`;
  }

  private buildProjectFileText(): string {
    const now = new Date().toISOString();
    return encodeProjectFile(createProjectSnapshot({
      title: this.projectTitle,
      createdAt: this.projectCreatedAt,
      modifiedAt: now,
      editorState: this.state,
      document: this.drawingCanvas.exportProjectDocument(),
      canvas: this.drawingCanvas.canvasSize,
      extensions: this.projectExtensions
    }));
  }

  private async openProjectFile(): Promise<void> {
    try {
      const staging: { value?: { project: ReturnType<typeof decodeProjectFile>; state: EditorState } } = {};
      const opened = await this.projectController.open((candidate) => {
        const project = decodeProjectFile(candidate.text);
        const state = deserializeEditorState(project.editor);
        const document = validateProjectDocumentDto(project.document, project.canvas.width, project.canvas.height);
        this.drawingCanvas.importProjectDocument(document, project.canvas.width, project.canvas.height);
        staging.value = { project, state };
      });
      if (!opened) return;
      if (!staging.value) throw new Error('Project did not finish staging');
      const { project, state: nextState } = staging.value;
      this.state = nextState;
      this.projectTitle = project.metadata.title || opened.name.replace(/\.drawstudio$/i, '') || 'Untitled';
      this.projectCreatedAt = project.metadata.createdAt || new Date().toISOString();
      this.projectExtensions = { ...project.extensions };
      this.drawingCanvas.updateState(this.state);
      this.persistWorkspacePreferences();
      this.projectDirty.resetClean();
      await this.autosave.clearRecovery();
      await this.safeRecordRecent(opened.name, this.projectController.hasWritableHandle ? 'direct' : 'upload');
      this.historyPanel?.add(`Opened ${opened.name}`);
      this.syncUI();
      await this.refreshProjectStatus();
    } catch (error) {
      window.alert(error instanceof Error ? `Could not open project: ${error.message}` : 'Could not open project.');
    }
  }

  private async saveProjectFile(saveAs: boolean): Promise<void> {
    try {
      const text = this.buildProjectFileText();
      const result = saveAs
        ? await this.projectController.saveAs(text, this.projectFileName())
        : await this.projectController.save(text, this.projectFileName());
      if (!result) return;
      this.projectTitle = result.name.replace(/\.drawstudio$/i, '') || this.projectTitle;
      this.projectDirty.markClean();
      await this.autosave.clearRecovery();
      await this.safeRecordRecent(result.name, result.kind);
      this.historyPanel?.add(`Saved ${result.name}`);
      await this.refreshProjectStatus();
    } catch (error) {
      window.alert(error instanceof Error ? `Could not save project: ${error.message}` : 'Could not save project.');
    }
  }

  private async safeRecordRecent(name: string, source: 'direct' | 'download' | 'upload' | 'recovery'): Promise<void> {
    try { await this.autosaveStore.recordRecent({ name, source, updatedAt: new Date().toISOString() }); }
    catch { /* recent metadata must never block drawing or saving */ }
  }

  private async refreshProjectStatus(): Promise<void> {
    if (!this.projectStatusPanel) return;
    try {
      const [recovery, validRecovery, recent] = await Promise.all([
        this.autosaveStore.getRecovery(),
        loadValidRecovery(this.autosaveStore),
        this.autosaveStore.listRecent(6)
      ]);
      this.projectStatusPanel.update(recovery, recent, !recovery || Boolean(validRecovery));
    } catch {
      this.projectStatusPanel.update(null, []);
    }
    this.syncProjectChrome();
  }

  private syncProjectChrome(): void {
    if (!this.documentBar || !this.drawingCanvas) return;
    const size = this.drawingCanvas.canvasSize;
    updateDocumentBar(this.documentBar, { name: this.projectTitle, dirty: this.projectDirty.dirty, width: size.width, height: size.height });
  }

  private async restoreRecovery(): Promise<void> {
    try {
      const recovery = await loadValidRecovery(this.autosaveStore);
      if (!recovery) { await this.refreshProjectStatus(); return; }
      const project = recovery.project;
      const nextState = deserializeEditorState(project.editor);
      const document = validateProjectDocumentDto(project.document, project.canvas.width, project.canvas.height);
      this.drawingCanvas.importProjectDocument(document, project.canvas.width, project.canvas.height);
      this.projectController.resetFileBinding();
      this.state = nextState;
      this.projectTitle = project.metadata.title || recovery.checkpoint.title || 'Recovered';
      this.projectCreatedAt = project.metadata.createdAt || new Date().toISOString();
      this.projectExtensions = { ...project.extensions };
      this.drawingCanvas.updateState(this.state);
      this.projectDirty.resetClean();
      this.projectDirty.markDirty();
      await this.safeRecordRecent(`${this.projectTitle}.drawstudio`, 'recovery');
      this.historyPanel?.add('Restored recovery checkpoint');
      this.syncUI();
      await this.refreshProjectStatus();
    } catch (error) {
      window.alert(error instanceof Error ? `Could not restore recovery: ${error.message}` : 'Could not restore recovery.');
    }
  }

  private async dismissRecovery(): Promise<void> {
    try { await this.autosave.clearRecovery(); } catch { /* best effort */ }
    await this.refreshProjectStatus();
  }

  private dispatch(action: EditorAction): void {
    this.state = editorReducer(this.state, action);
    this.persistWorkspacePreferences();
    this.drawingCanvas?.updateState(this.state);
    this.syncUI();
  }

  private installKeyboardShortcuts(): void {
    window.addEventListener('keydown', (event) => {
      if (isEditableTarget(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        this.commands.execute(event.shiftKey ? 'edit.redo' : 'edit.undo');
        return;
      }
      const tool = TOOL_SHORTCUTS[this.state.shortcutProfile][event.key.toLowerCase()];
      if (tool) { this.dispatch({ type: 'tool/set', tool }); return; }
      if (event.key === '0') this.commands.execute('view.fitCanvas');
    });
  }

  private registerCommands(): void {
    const register = (id: EditorCommandId, run: () => void | Promise<void>): void => this.commands.register(id, { run });
    register('file.open', () => this.openProjectFile());
    register('file.save', () => this.saveProjectFile(false));
    register('file.saveAs', () => this.saveProjectFile(true));
    register('file.exportPng', () => this.drawingCanvas?.exportPng());
    register('edit.undo', () => this.drawingCanvas?.undo());
    register('edit.redo', () => this.drawingCanvas?.redo());
    register('layer.addRaster', () => this.drawingCanvas?.addLayer());
    register('select.all', () => this.drawingCanvas?.selectAll());
    register('select.clear', () => this.drawingCanvas?.clearSelection());
    register('view.fitCanvas', () => this.dispatch({ type: 'view/reset' }));
    register('view.actualSize', () => { this.dispatch({ type: 'zoom/set', value: 1 }); this.dispatch({ type: 'pan/set', x: 0, y: 0 }); });
    register('window.resetWorkspace', () => this.dispatch({ type: 'workspace/reset' }));
    register('help.about', () => window.alert('Drawing Studio V0.6.7.1 — interaction stability release'));
  }

  private syncUI(): void {
    this.shell.dataset.mode = this.state.mode;
    this.shell.dataset.tool = this.state.tool;
    this.shell.dataset.preset = this.state.brushPreset;
    this.shell.dataset.handedness = this.state.handedness;
    this.shell.dataset.surround = this.state.canvasSurround;
    this.shell.dataset.density = this.state.uiDensity;
    this.shell.dataset.shortcutProfile = this.state.shortcutProfile;
    this.shell.style.setProperty('--active-color', this.state.color);
    this.shell.style.setProperty('--secondary-color', this.state.secondaryColor);

    this.shell.querySelectorAll<HTMLElement>('[data-tool]').forEach((node) => node.classList.toggle('active', node.dataset.tool === this.state.tool));
    this.shell.querySelectorAll<HTMLElement>('.toolbar [data-tool]').forEach((node) => { const tool=node.dataset.tool as Tool; const key=shortcutForTool(tool,this.state.shortcutProfile); const label=node.querySelector('span:last-child')?.textContent ?? tool; node.title=key?`${label} (${key})`:label; });
    this.shell.querySelectorAll<HTMLElement>('[data-preset]').forEach((node) => node.classList.toggle('selected', node.dataset.preset === this.state.brushPreset));
    const mode = this.shell.querySelector<HTMLSelectElement>('[data-control="mode"]');
    if (mode) mode.value = this.state.mode;
    updateTopBarHandedness(this.topBar, this.state.handedness);

    const setRange = (control: string, output: string, value: number, label: string): void => {
      const input = this.shell.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
      const out = this.shell.querySelector<HTMLElement>(`[data-output="${output}"]`);
      if (input) input.value = String(value);
      if (out) out.textContent = label;
    };
    setRange('size', 'size', this.state.brushSize, `${Math.round(this.state.brushSize)} px`);
    setRange('opacity', 'opacity', Math.round(this.state.opacity * 100), `${Math.round(this.state.opacity * 100)}%`);
    setRange('spacing', 'spacing', this.state.spacing, `${Math.round(this.state.spacing)}%`);
    setRange('stabilizer', 'stabilizer', this.state.stabilizer, `${Math.round(this.state.stabilizer)}`);
    setRange('stabilizer-bottom', 'stabilizer-bottom', this.state.stabilizer, `${Math.round(this.state.stabilizer)}`);
    setRange('pressure-response', 'pressure-label', Math.round(this.state.pressureResponse * 100), pressureResponseLabel(this.state.pressureResponse));
    setRange('pressure-size', 'pressure-size', Math.round(this.state.pressureSize * 100), `${Math.round(this.state.pressureSize * 100)}%`);
    setRange('pressure-opacity', 'pressure-opacity', Math.round(this.state.pressureOpacity * 100), `${Math.round(this.state.pressureOpacity * 100)}%`);
    setRange('tilt-influence', 'tilt-influence', Math.round(this.state.tiltInfluence * 100), `${Math.round(this.state.tiltInfluence * 100)}%`);
    setRange('zoom', 'zoom', Math.round(this.state.zoom * 100), `${Math.round(this.state.zoom * 100)}%`);
    const curve = this.shell.querySelector<SVGPathElement>('[data-pressure-curve]');
    curve?.setAttribute('d', pressureCurvePath(this.state.pressureResponse));
    const presetName = this.shell.querySelector<HTMLElement>('[data-output="preset-name"]');
    if (presetName) presetName.textContent = getBrushPreset(this.state.brushPreset).label;

    this.colorPanel?.update(this.state);
    this.colorSetPanel?.update(this.state);
    this.toolPropertyPanel?.update(this.state);
    updateCommandBar(this.commandBar, this.state);
    this.fillPanel?.update(this.state);
    this.assistPanel?.update(this.state);
    this.brushStudioPanel?.update(this.state);
    this.workspacePanel?.update(this.state);
    this.mangaPanel?.update(this.state);
    this.propertiesPanel?.update(this.state, this.drawingCanvas.selectionInfo);
    this.syncPanelChrome();
    this.syncHistoryButtons();
    this.syncNavigator();
    this.syncProjectChrome();
  }

  private syncPanelChrome(): void {
    for (const panel of this.panelRegistry) {
      decorateCollapsiblePanel(panel.element, panel.id, this.state.collapsedPanels.includes(panel.id), (panelId) => this.dispatch({ type: 'panel/toggle', panelId }));
    }
  }

  private syncNavigator(): void {
    if (!this.navigatorPanel || !this.drawingCanvas) return;
    this.drawingCanvas.copyCompositeTo(this.navigatorPanel.preview);
    this.navigatorPanel.updateZoom(this.state.zoom);
  }

  private syncHistoryButtons(): void {
    this.shell?.querySelectorAll<HTMLButtonElement>('[data-action="undo"]').forEach((button) => { button.disabled = !this.drawingCanvas?.canUndo; });
    this.shell?.querySelectorAll<HTMLButtonElement>('[data-action="redo"]').forEach((button) => { button.disabled = !this.drawingCanvas?.canRedo; });
    this.historyPanel?.updateAvailability(Boolean(this.drawingCanvas?.canUndo), Boolean(this.drawingCanvas?.canRedo));
  }
}
