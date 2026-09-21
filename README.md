# Drawing Studio — V0.6.7 restoration on the V0.6.9 base

This branch restores Text / Manga / Materials on the recovered V0.6.9 persistence foundation. The `.drawstudio` format remains version 1, and its foundation `appVersion` remains `0.6.9`; package version `0.6.7-restored` identifies the restored feature checkpoint. V0.6.8 and later work is outside this checkpoint.

Restoration verification is recorded in [V067_CHECKPOINT.md](docs/recovery/V067_CHECKPOINT.md). Do not treat historical preview files as executable application code.

A browser-first drawing editor prototype with a dark professional workspace, Standard / Advanced density modes, pressure-aware Canvas 2D brushes, a real multi-layer compositing model, and an integrated Color Lab + Smart Fill workflow, and a persistent professional workspace shell.

## V0.6.7 editable tools

- Text: multiline content, font family/size/weight, alignment, line height, letter spacing, fill, outline and position. Zero-spacing text uses native Canvas shaping; custom spacing preserves grapheme clusters.
- Balloons: ellipse or rounded rectangle, size/position, corner radius, straight tail endpoint/base, fill and stroke.
- Panels: row/column grid, margin, gutter and stroke.
- Screen tones: dots/lines, frequency, angle, density and color.
- Manga effects: deterministic Speed/Focus lines with seed, count, width, length, center, angle and color.
- Materials: PNG/JPEG/WebP imports as Image, Pattern or Texture; embedded pixels, position, scale, rotation and repeat modes.

Use the rail to place content or the Manga / Materials palette to add it. Selecting a layer exposes its editable fields regardless of the active drawing tool. Property edits commit on change (finish typing and leave the field); they participate in Undo/Redo. Text defaults in the primary dock apply to new text.

The existing `.drawstudio` Open/Save/Save As flow includes these layers and embedded material pixels. Autosave recovery is explicit; reopening the app does not silently replace the current document. PNG export excludes raster Draft layers and view-only assist overlays. Fonts use the browser/system fonts and are not embedded in project files.

## What V0.6.6 can do

### Drawing / brush feel
- Draw with mouse, touch, or stylus Pointer Events.
- Brush, eraser, Smudge, Blur, Wet Mix, pan, and Smart Fill tools.
- Apple Pencil / compatible stylus pressure input where the browser exposes it.
- Pressure changes brush size and opacity independently.
- Adjustable pressure-response curve (`Firm ↔ Linear ↔ Soft`).
- Adjustable stroke stabilizer and stylus tilt influence.
- Eight first-party presets: Pencil, Inking Pen, Marker, Soft Airbrush, Watercolor, Oil Paint, Chalk, and Spray.
- Coalesced pointer samples when available.
- Advanced Brush Studio controls: Flow, velocity-size response, rotation, independent start/end taper with configurable stroke length, scatter, size/angle/color jitter, grain, image texture mapping, paper grain, dual-brush modulation, and wet mixing.
- Watercolor/Oil presets sample underlying paint and mix it with the foreground color while drawing.
- Smudge and Blur operate on a bounded pixel region around the brush instead of reprocessing the whole document.
- Brush search and persistent favorites in Sub Tool.
- Current brush settings can be exported and re-imported as a `.drawbrush` JSON preset. PNG/JPEG/WebP images can also be imported as live brush texture maps.
- Sub Tool presets now render actual generated stroke-feel previews; Brush Studio includes a larger live preview pad.

### Color Lab
- Synchronized HEX, RGB, and HSV editing.
- Combined circular color wheel: hue ring with an inset saturation/value field.
- Harmony generation: Analogous, Complementary, Split Complementary, Triadic, Monochromatic.
- Tint, Shade, Tone, Warm, and Cool variant strips.
- Recent colors, favorite colors, and project palette.
- Extract up to eight dominant colors from an imported image using deterministic quantization.
- Clicking any generated or saved swatch immediately changes the foreground color.

### Smart Fill
- Flood fill with adjustable color tolerance.
- Gap Closing temporarily expands line barriers so small openings do not leak as easily.
- Expand Under Line grows the fill mask beneath line art to reduce white seams.
- Optional anti-aliased fill edge.
- Reference modes: Active layer, all Visible layers, or Line Art (visible composite excluding the active paint layer).
- Fill writes only to the currently selected editable raster content layer and participates in undo/redo history.
- Shortcut: `G`.

### Layer & compositing engine
- Raster, Vector, Group, Fill, Gradient, Correction, and Selection layers.
- Add, select, rename, reorder, hide/show, duplicate, delete, merge-down, group, and Flatten Visible.
- Non-destructive Fill and Gradient parameters plus Brightness/Contrast and Hue/Saturation correction layers.
- Selection Layers store and recall real selection masks.
- Raster layers can be marked Reference or Draft; Reference layers feed Smart Fill line-art mode, while Draft layers stay visible while editing but are omitted from final PNG export.
- Layer color tags plus persistent text/kind/role/tag filtering controls in the Layers palette.
- Layer opacity and blend modes: Normal, Multiply, Screen, Overlay, Add (Glow). Alpha lock, clipping, and layer masks remain available for raster layers.
- Undo / redo snapshots include layer metadata, raster pixels, masks, vector data, and stored selection masks.
- Hidden Background allows transparent PNG export.

### Workspace
- Layered charcoal UI with Clip Studio / MediBang-inspired sector contrast: toolbar, inspector rail, panels, primary cards, and details use distinct neutral depths instead of one flat black.
- Pan with Pan tool or Space + drag.
- Zoom from bottom bar or Ctrl/Cmd + wheel.
- PNG export.
- Standard / Advanced switch. Advanced reveals deeper brush dynamics, color variants/image extraction, and Fill reference controls.
- Keyboard shortcuts: `B` brush, `E` eraser, `I` eyedropper, `H` pan, `G` fill, `D` gradient, `U` shape, `M` select, `W` magic wand, `L` lasso, `T` transform, `V` vector pen, `A` text, `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo, `0` reset view.


### V0.5 professional workspace
- Near-black neutral charcoal visual system with compact desktop-tool spacing and document tabs.
- Standard / Advanced remain the same workspace; Advanced reveals Brush Studio, Navigator, History, and Workspace Settings.
- One-click right-handed / left-handed mirror layout. Tools and inspector dock swap sides without moving the artwork.
- Handedness, panel collapse state, canvas surround, UI density, and shortcut profile persist in localStorage.
- Collapsible inspector panels for Sub Tool, Color, Layers, Brush Studio, Navigator, History, and Workspace.
- Dedicated Brush Studio with pressure response, size/opacity pressure, tilt influence, and spacing.
- Live Navigator preview with Fit and 100% actions.
- High-level History operation list backed by the existing undo/redo snapshots.
- Neutral, deep-charcoal, or light canvas-surround choices.
- Comfortable and Compact UI density choices.
- Drawing Studio / Adobe-like / Clip-like shortcut-profile foundation. Current shared core shortcuts remain B/E/H/G while more tools are added.

### V0.5.1 UI softening
- Inspector panels sit on a darker rail with slightly different translucent charcoal depths per sector instead of one continuous color block.
- Selective 5–10px radii and subtle shadows soften the rigid rectangle-heavy V0.5 shell while keeping a desktop professional-tool feel.
- Important/contextual controls are visually larger; dense numeric controls live behind disclosure rows.
- Color Lab now centers on one large circular hue ring with the saturation/value picker inset into the ring.
- Right/left-handed workspace mirroring still applies to the softened shell.


### V0.6.4 brush engine expansion
- Expanded first-party brush library from four to eight presets, including Watercolor, Oil Paint, Chalk, and Spray.
- Deterministic Flow, velocity size, rotation, scatter, size/angle/color jitter, grain, and dual-brush dynamics. V0.6.5 completes full-stroke taper and imported texture maps.
- Real Smudge, Blur, and Wet Mix raster tools with bounded-region pixel processing.
- Watercolor/Oil wet-paint sampling integrated into ordinary brush strokes.
- Searchable Sub Tool list with persistent per-browser brush favorites.
- Brush Studio exposes the new dynamics in Advanced mode while Standard keeps Size/Opacity/Stabilization/Flow immediately reachable.
- `.drawbrush` export/import round-trips the current configurable brush preset.


### V0.6.6 ruler & assist
- New Assist tool (`R`) with Grid, Guide, Straight, Parallel, Curve, Radial, Concentric, Symmetry, and Perspective modes.
- Global Snap toggle in the command bar and matching Assist-palette control.
- Stroke input is constrained before stabilization so rulers cooperate with the existing stabilizer instead of fighting it.
- Symmetry supports 2–12 axes and replicates both raster brush dabs and editable vector strokes.
- Perspective supports 1-, 2-, and 3-point layouts with visible horizon/vanishing-point handles.
- Guide, radial/concentric center, symmetry center, horizon, and vanishing points can be moved directly on the canvas while Assist is active.
- Assist graphics use a separate view-only canvas and are never included in PNG export.
- Curve snapping currently uses a centered cubic preset; editable curve-ruler control nodes remain a later refinement.

### V0.6.5 brush finishing + Layer Complete
- Full-stroke replay gives start/end taper a known 0→1 stroke progress instead of guessing the end while the pointer is still moving.
- Image textures are converted to luminance maps and sampled by the actual brush dab engine; procedural texture and paper grain remain available.
- Generated miniature stroke previews in Sub Tool and a larger Brush Studio preview make preset feel visible before drawing.
- First-class Fill, Gradient, Correction, and Selection layers are editable without immediately baking pixels.
- Reference/Draft raster roles, layer color tags, text/kind/role/tag filters, and Flatten Visible are wired to the real document model.
- Draft layers remain visible in the workspace but are excluded from final PNG export.

### V0.6.3 selection / transform / vector completion
- Rectangle, ellipse, polygon, freehand lasso, Magic Wand, and Selection Pen masks share one editable selection-mask model.
- Selection Replace/Add/Subtract/Intersect modes plus Expand, Contract, Feather, and Invert. Selection Pen + Subtract doubles as a practical selection eraser workflow.
- Irregular selection edges render on-canvas instead of showing only a rectangular bounding box.
- Free Transform adds direct corner/edge scaling, move, Shift-aspect scaling, and a rotation handle.
- Perspective and Distort expose editable corner cages; Mesh exposes a draggable 3 × 3 warp grid. Raster pixels and the selection mask are warped together.
- Vector paths support add/delete anchors, Bezier in/out handles, selected-anchor editing, partial segment erasing, simplify, connect, and redraw-segment workflows.
- Vector history snapshots deep-clone Bezier handle data so undo/redo preserves path edits.

### V0.6.1 professional UI reconstruction
- Rebuilt the workspace around a true application menu, command bar, document tabs, tool strip, primary dock, canvas, secondary dock, and status bar.
- Standard mode now exposes Color, Color Set, Sub Tool, Tool Property, Navigator, Layers, and contextual properties at a glance.
- Replaced detached rounded dashboard cards with connected compact palette sections and multiple neutral charcoal depth levels.
- Added a separate always-visible Color Set while retaining the large hue wheel + inset saturation/value control.
- Right/left-handed mode mirrors the tool strip and both dock groups around the canvas without touching artwork coordinates.
- Added a master feature coverage checklist at `docs/product/FEATURE_MATRIX.md` to drive the V0.6.x expansion phases before animation.


### V0.6.2 core tool expansion
- **Eyedropper (`I`)** samples the visible composite and immediately updates the foreground color.
- **Gradient (`D`)** paints Linear or Radial gradients from foreground → secondary color and respects active selections.
- **Shape (`U`)** draws Line, Rectangle, or Ellipse primitives on the active raster layer; closed shapes can optionally be filled.
- **Magic Wand (`W`)** creates a connected color selection with adjustable tolerance.
- **Lasso (`L`)** creates a freehand polygon selection mask rather than only a rectangular UI boundary.
- **Text (`A`)** provides a first raster-text foundation with multiline text, size, and basic sans/serif/monospace family choices.
- **Reference Image** palette can import an image, adjust reference opacity, and clear/replace it without altering the artwork.
- **Fill modes** now include Bucket, Enclose (selection-based foundation), and connected Unpainted-area fill.
- Foreground and secondary colors are tracked separately so gradients and future two-color tools have a real editor state.
- Context Properties changes for Eyedropper, Gradient, Shape, Magic Wand, Lasso, and Text just like the existing Select/Transform/Vector tools.

### V0.6 selection, transform & vector foundation
- Functional rectangle selection with drag-to-select, Select All, Clear, and a visible transform boundary.
- Transform tool can drag selected raster pixels, flip horizontally/vertically, rotate 90°, and scale to 90%/110%.
- Context Properties panel changes automatically for Select, Transform, and Vector tools.
- First-class Vector Layer type in the layer tree (`V+` creates one).
- Vector Pen stores paths as editable points plus color, width, and opacity rather than baking them into raster pixels.
- Vector Select picks the nearest stroke and exposes width/recolor/delete controls.
- Vector control points appear on the selected line and can be dragged directly with Select.
- Eraser on a vector layer removes the nearest whole vector stroke.
- Vector layers can be rasterized when pixel editing is required.
- Vector strokes participate in layer opacity/blend compositing, duplication, document history, Navigator previews, and PNG export.

## Run the already-built version

The release ZIP includes `dist/`, so no package installation is needed to preview that build. A Git checkout must first use the build steps below.

```bash
node scripts/serve.mjs dist
```

Open `http://127.0.0.1:4173`.

## Build and verify

```bash
npm ci
npm test
npm run build
npm run serve
```

The project has no third-party runtime dependencies. TypeScript 5.6.3 and Playwright 1.51.1 are pinned development dependencies. Use a current Node.js LTS release.

Browser acceptance uses real Canvas pixels, user events, project downloads/uploads, and IndexedDB:

```bash
npx playwright install chromium
npm run test:browser
```

The browser command builds first, then runs Unicode rendering, editable UI and persistence/export acceptance. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an already-installed compatible Chromium binary. Browser evidence is written under `test-results/`.

## Architecture

```text
src/
├─ components/
│  ├─ BrushPanel.ts
│  ├─ ColorPanel.ts        # wheel/SV + harmonies + palettes + extraction
│  ├─ FillPanel.ts         # bucket/enclose/unpainted + tolerance/gap/expansion/reference controls
│  ├─ ReferencePanel.ts    # imported reference image preview + opacity controls
│  ├─ DrawingCanvas.ts     # pointer bridge + raster/vector surfaces + selection/transform integration
│  ├─ LayerPanel.ts
│  ├─ PropertiesPanel.ts   # contextual drawing/selection/transform/vector/text controls
│  └─ ToolBar.ts
├─ drawing/
│  ├─ brushDynamics.ts
│  ├─ colorModel.ts        # RGB/HSV + harmony/variant math
│  ├─ palette.ts           # palette state helpers + image quantization
│  ├─ smartFill.ts         # flood fill + gap/expansion/AA masks
│  ├─ advancedFill.ts      # enclose/unpainted mask helpers
│  ├─ eyedropper.ts        # pixel sampling
│  ├─ gradient.ts          # gradient interpolation/geometry
│  ├─ selectionMask.ts     # magic-wand/lasso masks + mask bounds
│  ├─ shapes.ts            # line/rectangle/ellipse geometry
│  ├─ textTool.ts          # text normalization helpers
│  ├─ selection.ts         # selection rectangle geometry
│  ├─ transform.ts         # transform geometry helpers
│  ├─ vector.ts            # editable vector path model + renderer
│  ├─ compositing.ts
│  ├─ layers.ts
│  ├─ pointer.ts
│  ├─ pressure.ts
│  ├─ stabilizer.ts
│  └─ stroke.ts
├─ editor/
│  ├─ editorReducer.ts
│  └─ types.ts
├─ App.ts
└─ main.ts
```

## Current limitations

- Smart Fill Gap Closing is morphology-based; complex broken line art still needs a more contour-aware solver.
- Layer thumbnails are schematic rather than live pixel thumbnails. Group drag/drop reparenting and detached/dockable windows remain future UI polish.
- Correction layers currently provide Brightness/Contrast and Hue/Saturation; the full correction/filter family is scheduled for V0.6.8.
- Image brush textures work in the current editor session but are not embedded inside `.drawbrush` preset files yet.
- Full-stroke taper performs a final replay when the stroke ends. This gives correct start/end taper, but very large canvases will eventually need a tiled stroke cache instead of a full temporary ImageData snapshot.
- Undo/redo still stores full pixel snapshots and is memory-heavy on large documents. GPU/tile compositing, cloud sharing, and collaboration remain later work.
- Editable text uses system fonts; font files are not embedded. Freehand balloons and arbitrary polygon panels remain future work.
- Numerical transform fields, select-by-layer-opacity/brightness, Liquify, and intersection-aware vector erasing remain tracked follow-ups.


See `docs/product/ROADMAP.md` for the full V0.1 → V1.0 plan.
