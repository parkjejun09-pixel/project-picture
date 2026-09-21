# V0.6.7 restoration checkpoint

Status: **implementation and integrated acceptance verified; release archive gate pending**. The accompanying release verification report records the final archive hash, fresh-extraction results and release decision.

## Provenance

- Sole source: `/코딩/recovery-work/drawing-webapp-v0.6.9-base.zip`.
- Baseline SHA-256: `be7afc35e91d2014a5c218db72e678c7af5633a2bfc8627fb67d38eac7f5d52d`.
- Original ZIP: 229,368 bytes, 154 entries, CRC verified; 153 source files.
- Untouched baseline: 184 tests passed and production build passed with TypeScript 5.6.3. TypeScript 5.9.3 exposed pre-existing ImageData typed-array type errors, so the compatible compiler is pinned rather than modifying baseline behavior.
- Branch: `recovery/v067-text-manga-materials`; original source commit `cac11cc`.
- Keep `.drawstudio` format version 1, foundation appVersion0.6.9, unknown extensions, Open/Save/Save As, dirty state, local IndexedDB checkpoints and explicit recovery.

## Scope and current evidence

Six first-class editable layer kinds: Text, Balloon, Panel, Screen Tone, Manga Effect and Material. Material RGBA pixels are embedded losslessly. Metadata participates in history, duplication, compositing, Navigator, flatten, PNG export and project persistence.

Engine commit `9c164dc`; Unicode shaping fix `7dfccc3`; editable UI commit `c18d667`; text defaults fix `b4a1926`; final validation/material bounds fix `fceb38f`. Final integrated commands on 2026-09-20: `npm test` — 197 passed, 0 failed/skipped; `npm run test:browser` — production build passed, Unicode rendering passed, 7 focused UI groups and 12 broad acceptance groups passed. Browser errors: none. Chromium 133.0.6943.0; TypeScript 5.6.3; Playwright 1.51.1. All original184 test cases/assertions remain. One original valid-project fixture was corrected to include its referenced background node instead of an empty node list.

Final regressions cover missing active-layer references, duplicate IDs, dangling/non-group parents and cycles rejected before document mutation, including App title/dimensions/dirty state/writable binding preservation. Repeat materials cover the canvas after translation, rotation and scaling while repeat-x/repeat-y retain axis-specific bounds.

Acceptance includes real pointer-painted raster Draft exclusion from PNG; six editable renderers; opacity/blends/visibility/reordering; duplicate isolation, delete, Undo/Redo; Navigator pixel equality; assist exclusion; pixel-identical Save As/Open with embedded RGBA and unknown extensions; durable IndexedDB reload and explicit recovery; dirty state; atomic rejection of corrupt material/raster documents without replacing artwork/title or writable file binding; flatten pixel equality and Undo restoring editable kinds. UI tests exercise every field, IME/focus, locked layers, invalid input, PNG/JPEG/WebP imports, all rail/palette actions, filters and badges, and corrupt recovery dismissal.

## Visual comparison

Inspected historical static HTML and the running app at 1440×1000, plus the supplied 1600×1000 preview reference. The connected charcoal docks, compact tool rail, primary Manga/Materials controls, secondary Properties/Layers and centered artwork hierarchy are retained. The running app intentionally keeps the baseline Color, Navigator and explicit Open/Save/Save As/Project Safety controls, and exposes real editable fields instead of the historical static readouts. This is a hierarchy comparison, not a pixel-perfect reproduction of sample artwork.

The 1024×768 left-handed capture mirrors the rail and primary dock to the right and secondary dock to the left. Docks and Layers scroll; the focused test verifies Project Safety reachability without overlap. Screenshots, browser result JSON, example `.drawstudio`, before/reopened PNGs and test logs accompany the release evidence.

## Intentional limits

- Balloon bodies: ellipse and rounded rectangle, with a straight tail; freehand contours are deferred.
- Panels: straight row/column grid; arbitrary polygon frames are deferred.
- Material imports: PNG/JPEG/WebP; no marketplace or external asset dependency.
- System/browser fonts are used; font files are not embedded. Font availability may change rendered text between systems.
- Browser validation covers Chromium desktop/tablet viewports, not physical iPad or Safari testing. Large assets retain the baseline full-snapshot memory costs.
- Full-base64 material cache keys remain a nonblocking performance follow-up for large assets.
- V0.6.8 and later features are not restored here. Existing baseline correction/brush features remain in place.
