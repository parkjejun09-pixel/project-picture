# Drawing Web App V0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-buildable browser drawing workspace that supports real drawing, erasing, color/size/opacity control, undo/redo, zoom/pan, PNG export, and Standard/Advanced UI density.

**Architecture:** TypeScript and native DOM APIs present the V0.1 editor shell while framework-light drawing modules own color parsing, brush setting constraints, stroke sampling, view transforms, and generic history. `DrawingCanvas` bridges Pointer Events to Canvas 2D and keeps bitmap snapshots local to the drawing surface. The UI boundary is intentionally isolated so Work/Codex can migrate it to React later without replacing the engine.

**Tech Stack:** TypeScript, native DOM APIs, Node built-in test runner, CSS, Canvas 2D, Pointer Events.

**Spec:** `docs/superpowers/specs/2026-09-16-drawing-app-v0.1-design.md`

## Global Constraints
- Standard mode must expose all core drawing controls needed for normal illustration.
- Advanced mode extends the same workspace rather than replacing the layout.
- Every visible V0.1 control must affect real behavior.
- Pure black is not the primary workspace surface; use charcoal hierarchy.
- Full multi-layer compositing is deferred to V0.3.
- Production code for behavior is written only after a failing test for that behavior.

---

### Task 1: Project shell and tested editor primitives

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/drawing/color.test.ts`
- Create: `src/drawing/color.ts`
- Create: `src/drawing/history.test.ts`
- Create: `src/drawing/history.ts`
- Create: `src/drawing/stroke.test.ts`
- Create: `src/drawing/stroke.ts`
- Create: `src/drawing/settings.test.ts`
- Create: `src/drawing/settings.ts`

**Interfaces:**
- Produces: `normalizeHex(input: string): string | null`
- Produces: `HistoryStack<T>` with `push`, `undo`, `redo`, `canUndo`, `canRedo`, `clear`
- Produces: `sampleSegment(from, to, spacing): Point[]`
- Produces: clamp helpers for brush size, opacity, spacing, and zoom.

- [ ] Write failing unit tests for the four interfaces.
- [ ] Run `npm test -- --run` and confirm failures are due to missing modules/implementations.
- [ ] Implement the minimum primitive modules.
- [ ] Run `npm test -- --run` and confirm all primitive tests pass.
- [ ] Commit as `feat: add tested drawing primitives`.

### Task 2: Editor application state and visual shell

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/editor/editorReducer.test.ts`
- Create: `src/editor/editorReducer.ts`
- Create: `src/editor/types.ts`
- Create: `src/styles.css`
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ToolBar.tsx`
- Create: `src/components/ColorPanel.tsx`
- Create: `src/components/LayerPanel.tsx`
- Create: `src/components/BottomBar.tsx`

**Interfaces:**
- Consumes clamp/color helpers from Task 1.
- Produces: `editorReducer(state, action): EditorState`.
- Produces: stateless shell components driven by explicit props.

- [ ] Write failing reducer tests for tool selection, mode switch, valid color application, brush size, opacity, spacing, zoom, and pan reset.
- [ ] Run the reducer tests and confirm RED.
- [ ] Implement reducer/types and shell components.
- [ ] Implement charcoal responsive CSS and disabled future-tool styling.
- [ ] Run tests and `npm run build`.
- [ ] Commit as `feat: add editor workspace shell`.

### Task 3: Functional Canvas 2D drawing surface

**Files:**
- Create: `src/components/DrawingCanvas.tsx`
- Create: `src/drawing/canvasRenderer.ts`
- Create: `src/drawing/canvasRenderer.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `EditorState`, `sampleSegment`, history primitives.
- Produces: Canvas renderer helpers for brush/eraser dabs and snapshot restore.
- Produces: `DrawingCanvas` imperative API with `undo`, `redo`, `exportPng`, `canUndo`, `canRedo` surfaced through `forwardRef`.

- [ ] Write failing tests for renderer mode selection and dab radius/alpha calculations without requiring a browser canvas.
- [ ] Run the renderer tests and confirm RED.
- [ ] Implement renderer helpers.
- [ ] Implement pointer drawing, erasing, snapshot history, and canvas resize initialization in `DrawingCanvas`.
- [ ] Wire toolbar/settings into canvas behavior.
- [ ] Run all tests and production build.
- [ ] Commit as `feat: add functional drawing canvas`.

### Task 4: Pan, zoom, export and workspace-mode behavior

**Files:**
- Modify: `src/components/DrawingCanvas.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/BottomBar.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: zoom/pan state from the reducer.
- Produces: space-drag/pan-tool panning, bounded zoom, PNG export, functional Advanced spacing control.

- [ ] Write failing reducer/input tests for zoom bounds and pan updates.
- [ ] Run tests and confirm RED.
- [ ] Implement pan/zoom interactions and PNG export.
- [ ] Verify Standard hides only advanced spacing controls and Advanced reveals them without changing the overall layout.
- [ ] Run all tests and `npm run build`.
- [ ] Commit as `feat: finish v0.1 editor interactions`.

### Task 5: Browser smoke verification and handoff documentation

**Files:**
- Create: `README.md`
- Create: `docs/product/HANDOFF.md`
- Modify: `docs/product/ROADMAP.md` only if implementation changes require an accurate note.

**Interfaces:**
- Produces: reproducible setup/build/test instructions and architecture handoff for future Work/Codex sessions.

- [ ] Write README setup, architecture, controls, and known V0.1 limitations.
- [ ] Write handoff notes naming the next V0.2 entry points and invariants that should not be broken.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Start the built site and use Chromium headless to assert the page title and canvas exist.
- [ ] Commit as `docs: add v0.1 handoff and verification notes`.
