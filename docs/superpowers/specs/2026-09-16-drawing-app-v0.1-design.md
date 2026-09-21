# Drawing Web App V0.1 Design

## Goal
Build the first working vertical slice of a browser drawing application: a polished dark Standard workspace that can genuinely draw, erase, change brush settings, undo/redo, pan/zoom, export PNG, and switch to a denser Advanced view.

## Product principles
1. Standard means clean, not crippled. Core drawing features remain available.
2. Advanced expands the same workspace instead of replacing it with a different interface.
3. Drawing engine code is separated from React presentation code so later WebGL/WebGPU or worker rendering does not require rewriting the UI.
4. The visual hierarchy uses charcoal surfaces instead of pure black to avoid excessive canvas contrast.
5. No V0.1 control is decorative: visible controls must affect behavior.

## Architecture
The application uses TypeScript and native DOM APIs for the V0.1 UI because the execution environment could not reach the npm registry to verify third-party packages. Drawing behavior lives under `src/drawing/` as small framework-independent modules. The `DrawingCanvas` class owns DOM pointer interaction and delegates color parsing, stroke sampling, view transforms, and history logic to tested modules. This boundary keeps a future React shell migration straightforward without rewriting the drawing engine.

V0.1 intentionally uses one real paint canvas over a visual locked background. Full multi-layer compositing is deferred to V0.3 so the first release can validate pointer input, stroke feel, history, and workspace ergonomics without locking in an immature layer engine.

## Workspace layout
- Top bar: brand placeholder, File menu action for PNG export, undo, redo, Standard/Advanced mode toggle.
- Left toolbar: Brush, Eraser, Fill disabled until V0.4, Select disabled until V0.6, Pan.
- Center: neutral charcoal workspace containing a white drawing canvas.
- Right panel: color controls above a layers section showing `Paint Layer 1` and locked `Background`.
- Bottom bar: brush size, opacity, zoom. Advanced mode additionally exposes stroke spacing.

## Drawing behavior
- Pointer down begins a stroke and stores the pre-stroke canvas snapshot in undo history.
- Pointer move interpolates between the previous and current point to prevent holes during fast movement.
- Brush draws with the selected RGB color and opacity.
- Eraser uses destination-out compositing.
- Pointer up/cancel ends the stroke and commits the resulting snapshot to history.
- Undo and redo restore complete canvas snapshots in V0.1.
- Space + primary-button drag pans the workspace; the Pan tool provides the same behavior without holding Space.
- Wheel with Ctrl/Cmd or the zoom controls changes zoom within bounded limits.

## State
Application state contains:
- active tool: brush | eraser | pan
- workspace mode: standard | advanced
- color: normalized six-digit HEX string
- brush size: 1..200 CSS pixels before zoom
- opacity: 0.01..1
- stroke spacing: 1..40 percent of brush diameter
- zoom: 0.25..4
- pan offset: x/y CSS pixels

Canvas bitmap history is intentionally kept outside a global state library in V0.1.

## Error handling
- Invalid HEX input remains editable but is applied only after it parses successfully.
- PNG export no-ops safely if the canvas is unavailable.
- Undo/redo buttons disable when no state exists in that direction.
- Pointer capture is used where available so leaving the canvas during a stroke does not strand input state.

## Testing
Unit tests cover:
- HEX normalization and rejection.
- Generic undo/redo history semantics.
- Stroke interpolation spacing and endpoint inclusion.
- Brush setting clamps.

Build verification covers TypeScript and Vite production bundling. A Chromium smoke test checks that the production page loads and the canvas element is present.

## Non-goals for V0.1
- Pressure curves or stylus tilt.
- Multiple editable layers.
- Blend modes, masks, clipping, or vector layers.
- Smart Fill.
- Animation timeline.
- Cloud accounts or autosave.
