# V0.6.6 Handoff for Work / Codex

## Current status
V0.6.6 adds a real Ruler & Assist subsystem on top of the V0.6.5 brush/layer editor. Existing brush, selection, transform, vector, special-layer, workspace, and export behavior must remain intact.

## Key invariants
1. Assist geometry lives in `src/drawing/assist.ts` and `src/drawing/perspective.ts` and stays DOM-independent.
2. Stroke order is `pointer → assist constraint → stabilizer → brush/vector engine`.
3. Assist overlays are view-only and must never be composited into PNG/project artwork.
4. Symmetry duplicates raster dabs and vector path points around the configured center; it must not mirror the document itself.
5. Direct assist handles communicate through typed `AssistDragUpdate` callbacks and reducer actions.
6. Standard exposes Grid/Guide/Straight; Advanced exposes Parallel/Curve/Radial/Concentric/Symmetry/Perspective.
7. Curve ruler control points are not editable yet; do not describe that as complete.

## V0.6.6 files
- `src/drawing/assist.ts`: grid/guide/line/curve/radial/concentric/symmetry geometry.
- `src/drawing/perspective.ts`: 1/2/3-point layouts and nearest-ray projection.
- `src/components/AssistPanel.ts`: ruler configuration UI.
- `src/components/DrawingCanvas.ts`: snapping, symmetry replication, overlays, direct handles.
- `src/components/CommandBar.ts`: global Snap toggle.
- `src/editor/types.ts` + `editorReducer.ts`: persistent editor state for assist settings.

## V0.9 persistence decision
Prefer File System Access API Open/Save/Save As when supported. Keep IndexedDB for autosave, crash recovery, recent metadata, and fallback. Always retain upload/download project-file fallback for browsers without direct file handles.

## Verification
```bash
npm test
npm run build
node scripts/serve.mjs dist
```
