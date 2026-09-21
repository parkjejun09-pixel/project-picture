# Drawing Web App Product Roadmap

## Product direction
A browser-first drawing application that combines a professional dark workspace with a low-friction Standard mode and a denser Advanced mode. The core product remains drawing-first; animation is an optional workspace layered on top of the same document and rendering engines.

## V0.1 — Foundation / Vertical Slice
Goal: open the site and immediately draw in a polished dark workspace.

- TypeScript application shell with no runtime dependencies in V0.1; UI-framework migration remains optional because editor state and drawing modules are isolated.
- Dark charcoal Standard workspace inspired by desktop drawing tools without panel overload.
- Real HTML Canvas drawing surface with mouse, touch, and stylus pointer input.
- Brush and eraser tools.
- Brush size and opacity controls.
- HEX color input plus native color picker.
- Basic stroke interpolation so fast pointer movement does not leave gaps.
- Undo / redo using snapshot history.
- Zoom controls and space-drag panning.
- Export current artwork as PNG.
- Layer panel representing one paint layer over a locked background.
- Standard / Advanced workspace switch. Advanced exposes the functional stroke-spacing control but keeps the same layout language.
- Responsive desktop/tablet layout.

Exit criteria: a user can draw, erase, change color/size/opacity, undo/redo, pan/zoom, export, and switch workspace density without reloading.

## V0.2 — Brush Feel
Goal: make the basic act of drawing feel materially better before adding document complexity.

- Stylus pressure input via Pointer Events, with mouse/touch fallback at full pressure.
- Adjustable pressure-response curve shared by brush dynamics.
- Separate pressure strength controls for size and opacity.
- Stroke stabilizer with adjustable smoothing.
- Tilt input for compatible styluses, used to widen/rotate supported brush dabs.
- Four first-party brush presets: Pencil, Inking Pen, Marker, Soft Airbrush.
- Preset-specific hardness and spacing characteristics.
- Coalesced pointer-event handling where the browser exposes it.
- Brush panel added to the Standard workspace; deep pressure/tilt controls appear only in Advanced.
- UI refinement pass toward compact neutral-charcoal desktop drawing tools, with fewer rounded/mobile-looking controls.

Deferred intentionally: user-created brush preset files, velocity/taper/rotation editors, favorites/recent brushes, and full Brush Studio belong to V0.5 so V0.2 can validate the core input pipeline first.

Exit criteria: Pencil/stylus pressure changes stroke size/opacity, compatible tilt changes dab shape, stabilization is adjustable, and the four presets feel visibly different while Standard mode remains approachable.

## V0.3 — Layer & Compositing Engine
Goal: move from a single paint surface to real illustration documents.

- Multiple raster layers.
- Reorder, rename, hide/show, duplicate, delete, merge.
- Layer opacity.
- Core blend modes: Normal, Multiply, Screen, Overlay, Add.
- Groups/folders.
- Alpha lock and clipping.
- Layer masks.
- Composite preview caching for performance.

Exit criteria: multi-layer artwork remains editable and renders consistently during reorder, opacity, and blend changes.

Implementation status (V0.3): implemented with independent raster surfaces, nested group metadata, masks, alpha lock, clipping, core blend modes, merge/duplicate/reorder operations, cached Canvas 2D compositing, and document-aware undo/redo.

## V0.4 — Color Lab & Smart Fill
Goal: make color selection and flat coloring a product strength.

- HEX, RGB, HSV input synchronized in one color model.
- Color wheel and saturation/value square.
- Recent, favorite, and project palettes.
- Tone, tint, shade, warm/cool variants.
- Harmony generators: analogous, complementary, split-complementary, triadic, monochromatic.
- Palette extraction from imported images.
- Fill tolerance, gap closing, fill expansion, anti-alias control.
- Reference-layer selection for fill.
- White-gap prevention under line art.

Exit criteria: users can design a palette and perform clean flat coloring without leaving the drawing workspace.

Implementation status (V0.4): implemented with synchronized HEX/RGB/HSV controls, hue/SV UI, harmony and tone variants, recent/favorite/project/image palettes, image quantization, Smart Fill tolerance/gap closing/under-line expansion/anti-aliasing, and Active/Visible/Line Art reference modes.

## V0.5 — Advanced Workspace
Goal: expose professional controls without making Standard mode intimidating.

- Professional near-black charcoal shell with compact document tabs and desktop-tool hierarchy.
- Collapsible dock panels; arbitrary free drag docking remains deferred.
- Brush Studio with all V0.2 dynamics in one editor.
- Navigator, history, workspace settings, and document-tab surfaces.
- Right-handed / left-handed mirrored layouts.
- Drawing Studio, Adobe-like, and Clip-like shortcut profile preference.
- Persistent workspace preferences via localStorage: handedness, collapse state, density, surround, shortcut profile.
- Neutral/dark/light canvas surround and comfortable/compact density.

Exit criteria: Standard stays clean while Advanced gives power users persistent access to deep controls.

Implementation status (V0.5): implemented with mirrored handedness layouts, persistent collapsible docks, a dedicated Brush Studio, live Navigator, history operation log, document tabs, canvas-surround themes, UI density preferences, and shortcut-profile foundations.

## V0.6 — Selection, Transform & Vector
Goal: add precise editing instead of only freehand painting.

- Rectangle selection foundation with visible selection bounds, Select All, and Clear.
- Raster move by drag, scale presets, rotate 90°, and horizontal/vertical flip.
- Context-sensitive Properties panel for editing tools.
- First-class vector layers and editable vector stroke data.
- Editable vector control points, stroke width/color, whole-stroke vector eraser, and rasterize action.
- Vector data participates in compositing, duplication, history, previews, and export.
- Follow-up V0.6.x scope: ellipse/lasso masks, feather/expand/contract, free-transform handles, Bezier handles, partial vector eraser.

Exit criteria: users can reposition selected raster artwork and edit vector linework after drawing it without the line being baked into raster pixels.

Implementation status (V0.6): rectangle selection, raster move/flip/rotate/scale presets, contextual Properties, first-class vector layers, editable vector strokes/control points, vector eraser, and rasterization are implemented. The V0.5 shell also received a V0.5.1 softening pass with layered charcoal sector depths and a combined circular color wheel.

## V0.6.1 — UI Reconstruction
Goal: replace the sparse/card-like shell with a dense professional docked-palette workspace before adding more tools.

- Clip Studio/MediBang-inspired information architecture: application menu, command bar, document tabs, tool strip, primary dock, canvas, secondary dock, status bar.
- Standard mode exposes Color, Color Set, Sub Tool, Tool Property, Navigator, Layers, and contextual properties without requiring Advanced mode.
- Connected dock palettes replace floating rounded SaaS-style cards.
- Large circular hue wheel + inset saturation/value field stays visible.
- Separate Color Set palette for recent/project colors.
- Right/left-handed mirroring now swaps both dock groups and the tool strip around the canvas.
- Advanced mode adds deep Brush Studio, detailed Color Lab, History, and Workspace controls.

Exit criteria: the app reads immediately as a professional drawing workspace rather than a generic dashboard while preserving all V0.6 drawing behavior.

## V0.6.2 — Core Tool Expansion
Goal: fill the most visible gaps in the tool strip.

- Eyedropper.
- Gradient tool.
- Line/shape tools.
- Magic Wand / Auto Select.
- Lasso selection.
- Text foundation.
- Reference image palette/window foundation.
- Enclose & Fill / unpainted-area fill.

Implementation status (V0.6.2): implemented with composite Eyedropper sampling, foreground→secondary linear/radial gradients, raster line/rectangle/ellipse primitives, connected Magic Wand selection, freehand lasso masks, raster text foundation, independent reference-image palette, and Bucket/selection-Enclose/connected-Unpainted fill modes. Irregular-selection transforms, editable text layers, curve/polygon shapes, and gesture-based enclosure remain intentionally assigned to later V0.6.x phases.

Exit criteria: the most obvious missing everyday tools are usable from the reconstructed workspace without introducing fake controls, while selection and raster operations remain compatible with document history.

## V0.6.3 — Selection, Transform & Vector Complete
- Ellipse/polygon/selection-pen tools.
- Feather, expand/contract, invert.
- Interactive free-transform handles, free rotate, perspective/distort/mesh.
- Add/delete vector control points, Bezier handles, partial vector eraser, simplify/connect/redraw.

Implementation status (V0.6.3): implemented with shared irregular selection masks, replace/add/subtract/intersect composition, mask-edge overlay, selection refinement, direct free-transform handles and rotation, perspective/distort cages, a draggable 3 × 3 mesh warp, and mask-aware raster warping. Vector editing now includes anchor insertion/deletion, Bezier handles, partial segment erasing, simplify/connect/redraw, and deep-cloned history snapshots. Numerical transform fields, true intersection-aware vector erasing, select-by-opacity/brightness, and Liquify remain tracked follow-ups rather than fake-complete controls.

Exit criteria: everyday selection refinement and interactive raster/vector geometry editing are usable from real canvas controls and preserve undo/redo state.

## V0.6.4 — Brush Complete
- Flow, velocity, rotation, taper, scatter/jitter, texture/grain, dual brush, color jitter.
- Smudge, blur, wet mixing, custom brush creation.
- Brush folders/favorites/search and richer preset management.

Implementation status (V0.6.4 → V0.6.5 brush finish): the eight-preset library, Flow/velocity/rotation/scatter/jitter/color-jitter/grain/dual-brush dynamics, Watercolor/Oil wet mixing, bounded Smudge/Blur, search/favorites, and `.drawbrush` settings transfer remain intact. V0.6.5 closes the two intentionally deferred brush gaps: independent start/end taper now replays the completed stroke with exact full-stroke progress, and PNG/JPEG/WebP images can be converted to luminance texture maps used by the real dab engine. Sub Tool and Brush Studio now draw generated stroke-feel previews. Bitmap texture data is not yet embedded into `.drawbrush` files, and user-created folders remain tracked.

Exit criteria: brush feel varies materially by preset and dynamics, paint can smear/blur/mix directly on raster layers, and custom settings can be moved through a real preset file.

## V0.6.5 — Layer Complete
- Fill/gradient/correction/selection layers.
- Reference and draft layers.
- Flatten and layer search/filter.

Implementation status (V0.6.5): implemented with first-class Fill, Gradient, Correction, and Selection nodes in the document tree. Fill/Gradient parameters remain editable; Correction layers currently provide Brightness/Contrast and Hue/Saturation without destructively rewriting source layers; Selection layers store/recall real selection masks. Raster layers support Reference and Draft roles plus color tags. Reference layers participate in Smart Fill line-art reference mode, Draft layers remain visible on canvas but are excluded from final PNG export. Layers can be searched and filtered by text/kind/role/tag, and Flatten Visible converts the current composite into one editable raster layer. Additional correction types belong to V0.6.8 rather than being exposed as fake-complete controls.

Exit criteria: everyday layer organization, role-based reference workflows, basic non-destructive generated/correction layers, stored selections, search/filter, and final flattening are all backed by the real document model.

## V0.6.6 — Ruler & Assist
- Grid/guides with real snapping and direct guide positioning.
- Straight/parallel projection rulers, cubic curve ruler, radial/concentric rulers.
- 2–12 axis symmetry that replicates raster brush dabs and editable vector strokes.
- 1/2/3-point perspective snapping with draggable horizon and vanishing-point handles.
- View-only assist overlay; assist graphics never enter exported artwork.

Implementation status (V0.6.6): implemented. The curve ruler uses a fixed centered cubic preset in this phase; direct Bezier ruler-node editing remains a later refinement rather than being marked complete.

Exit criteria: users can keep ordinary strokes, symmetric drawing, and perspective/radial construction constrained by visible rulers without baking guide graphics into the document.

## V0.6.7 — Text, Manga & Materials
- Full text properties, balloons, panel divider, comic guides.
- Screen tone, speed/focus lines, image/pattern/texture materials.

Implementation status (V0.6.7): implemented with first-class editable Text layers (font family/size/weight/alignment/line-height/letter-spacing/fill/outline/position), ellipse and rounded-rectangle Balloon layers with editable tails, straight-grid Panel layers, dot/line Screen Tone layers, deterministic Speed/Focus manga-effect layers, and PNG/JPEG/WebP-backed Image/Pattern/Texture Material layers with editable transforms and repeat modes. All content renders through the existing layer/compositing pipeline and participates in visibility, opacity, blend, duplication, history, flattening, Navigator, and PNG export. Arbitrary polygon comic frames, freehand balloon contours, embedded material bytes in the future project format, and marketplace/search remain later work rather than being marked complete.

Exit criteria: text remains editable after placement, core manga construction/effect layers can be changed without repainting, and imported materials stay transformable/repeatable inside the normal layer workflow.

## V0.6.8 — Filters & Color Correction
- Blur/sharpen/noise/distortion families.
- Brightness/contrast, hue/saturation, levels, curves, balance, posterize, gradient map.

## V0.6.9 — File, Productivity & Stability
- Shortcut editor and Quick Access.
- Multi-document workflow.
- JPEG/WebP, PSD research/implementation.
- Autosave/recovery and large-canvas performance work.

The canonical coverage checklist for V0.6.x is `docs/product/FEATURE_MATRIX.md`.

## V0.7 — Animation Core
Goal: make frame-by-frame animation simple rather than folder-heavy.

- Optional Animation workspace.
- Timeline with frames/cels.
- `+ Frame` automatically creates the required cel state.
- Onion skin.
- Duplicate/hold/expose frames.
- Playback at configurable FPS.
- Frame thumbnails and nearby-frame caching.
- Basic animated PNG/WebM preview export path.

Exit criteria: a user unfamiliar with animation folders can create and preview a short hand-drawn animation immediately.

## V0.8 — Animation Pro
Goal: absorb the strongest workflow advantages of dedicated 2D animation software.

- Audio track import and waveform timeline.
- Reference video track.
- 2D camera with pan/zoom/rotation keyframes.
- General transform keyframes.
- Long-project cache eviction and worker-based frame compositing.
- Smart colorization research prototype inspired by marker-based coloring workflows.
- Background rendering/export jobs with progress and cancellation.

Exit criteria: longer animation projects stay interactive and support sound/camera work without leaving the app.

## V0.9 — Persistence, Project Format & Sharing
Goal: make the app safe for real work without forcing large projects into browser quota storage.

- Versioned app-owned `.drawstudio` project format.
- **Local Open / Save / Save As through the File System Access API when the browser supports it** (primarily Chromium-based desktop browsers such as Chrome/Edge).
- Feature-detect file-system access; require user-initiated picker actions and secure contexts as the platform requires.
- Keep **IndexedDB for autosave checkpoints, crash recovery, recent-document metadata, and fallback**, not as the only canonical project store.
- Provide ordinary upload/download project-file fallback when direct file handles are unavailable.
- PNG/WebP export presets and layered export research.
- Brush/palette/workspace import/export.
- Optional account/cloud sync backend.
- Shareable read-only project links if cloud is enabled.

Exit criteria: supported browsers can work directly with user-owned local project files, unsupported browsers still have a safe fallback, and closing/reloading the browser does not silently destroy recoverable work.

## V1.0 — Public Beta
Goal: make the accumulated system coherent, fast, and understandable.

- Guided first-run experience.
- Performance profiling and memory budgets for large canvases.
- Worker/offscreen rendering where supported, with fallback paths.
- Cross-browser and tablet testing matrix.
- Accessibility pass for controls and keyboard navigation.
- Error recovery UI and corrupted-project safeguards.
- PWA installability where it improves the experience.
- Product analytics limited to UX/performance events needed to improve the editor.

Exit criteria: stable beta suitable for external testers, with no known data-loss bugs in supported browsers.
