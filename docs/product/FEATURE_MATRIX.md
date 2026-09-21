# Drawing Studio Master Feature Matrix

This is the product-wide coverage list used before the Animation phase. It tracks the common capabilities users expect from major illustration apps such as Clip Studio Paint, MediBang Paint, and ibisPaint, without attempting to clone any one product's proprietary assets or exact UI.

Legend: ✅ implemented · 🟡 partial/foundation exists · ⬜ planned

## Core drawing and brushes
| Feature | Status | Target phase |
|---|---|---|
| Brush / Pen / Eraser | ✅ | V0.1 |
| Pencil / Inking / Marker / Airbrush presets | ✅ | V0.2 |
| Brush size / opacity / spacing | ✅ | V0.2 |
| Stylus pressure size / opacity | ✅ | V0.2 |
| Tilt response | ✅ | V0.2 |
| Stabilization | ✅ | V0.2 |
| Brush pressure curve | ✅ | V0.2 |
| Flow control | ✅ | V0.6.4 |
| Rotation / velocity dynamics | ✅ | V0.6.4 |
| Taper | ✅ independent start/end taper with full-stroke replay | V0.6.5 |
| Texture / grain | ✅ procedural texture + paper grain + imported image texture map | V0.6.5 |
| Scatter / jitter | ✅ | V0.6.4 |
| Dual brush | ✅ procedural secondary-dab modulation | V0.6.4 |
| Color jitter | ✅ | V0.6.4 |
| Wet mixing / watercolor mixing | ✅ local sampled-color mixing | V0.6.4 |
| Smudge / Blend | ✅ Smudge + Wet Mix tools | V0.6.4 |
| Blur brush | ✅ | V0.6.4 |
| Custom brush creation | ✅ configurable Brush Studio + `.drawbrush` export/import | V0.6.4 |
| Brush folder / favorite / search | 🟡 favorites + search + categories; user folders later | V0.6.4 |
| Brush import/export format | 🟡 `.drawbrush` settings export/import; imported bitmap texture embedding later | V0.6.4/V0.6.5 |

## Color
| Feature | Status | Target phase |
|---|---|---|
| Circular hue wheel + saturation/value | ✅ | V0.4/V0.6.1 |
| HEX / RGB / HSV | ✅ | V0.4 |
| Recent / favorite / project colors | ✅ | V0.4 |
| Color Set palette | ✅ | V0.6.1 |
| Harmony generator | ✅ | V0.4 |
| Tint / Shade / Tone / Warm / Cool | ✅ | V0.4 |
| Image → palette extraction | ✅ | V0.4 |
| Eyedropper | ✅ | V0.6.2 |
| Color slider palette | ⬜ | V0.6.2 |
| Color mixing palette | ⬜ | V0.6.4 |
| Gradient map | ⬜ | V0.6.8 |

## Layers and document structure
| Feature | Status | Target phase |
|---|---|---|
| Raster layers | ✅ | V0.3 |
| Vector layers | ✅ | V0.6 |
| Groups / folders | ✅ | V0.3 |
| Layer visibility / reorder / rename / duplicate / delete | ✅ | V0.3 |
| Layer opacity | ✅ | V0.3 |
| Blend modes: Normal/Multiply/Screen/Overlay/Add | ✅ | V0.3 |
| Alpha lock | ✅ | V0.3 |
| Clipping | ✅ | V0.3 |
| Layer mask | ✅ | V0.3 |
| Merge down | ✅ | V0.3 |
| Flatten | ✅ Flatten Visible | V0.6.5 |
| Reference layer | ✅ raster Reference role drives line-art reference workflows | V0.6.5 |
| Draft layer | ✅ raster Draft role; visible while editing, omitted from PNG export | V0.6.5 |
| Fill layer | ✅ editable non-destructive color layer | V0.6.5 |
| Gradient layer | ✅ editable linear/radial colors + angle | V0.6.5 |
| Correction layer | ✅ infrastructure + Brightness/Contrast and Hue/Saturation | V0.6.5 |
| Selection layer | ✅ stores and recalls selection masks | V0.6.5 |
| Layer search / filter | ✅ text + kind + role + color-tag filters | V0.6.5 |

## Selection
| Feature | Status | Target phase |
|---|---|---|
| Rectangle selection | ✅ | V0.6 |
| Select all / clear | ✅ | V0.6 |
| Ellipse selection | ✅ | V0.6.3 |
| Polygon selection | ✅ | V0.6.3 |
| Lasso | ✅ irregular mask + mask-aware transform | V0.6.2/V0.6.3 |
| Magic wand / auto select | ✅ connected tolerance selection | V0.6.2 |
| Selection pen / eraser | ✅ pen + subtract-mode eraser workflow | V0.6.3 |
| Select from layer opacity | ⬜ | V0.6.3 |
| Select by brightness/color | ⬜ | V0.6.3 |
| Expand / contract | ✅ | V0.6.3 |
| Feather | ✅ | V0.6.3 |
| Invert selection | ✅ | V0.6.3 |

## Transform and geometry
| Feature | Status | Target phase |
|---|---|---|
| Move selection | ✅ | V0.6 |
| Horizontal / vertical flip | ✅ | V0.6 |
| Rotate 90° | ✅ | V0.6 |
| Scale presets | ✅ | V0.6 |
| Interactive free transform handles | ✅ | V0.6.3 |
| Free rotate / numerical transform | 🟡 direct rotation handle implemented; numerical fields later | V0.6.3 |
| Distort | ✅ corner-cage warp | V0.6.3 |
| Perspective transform | ✅ constrained corner-cage warp | V0.6.3 |
| Mesh transform | ✅ 3 × 3 draggable warp grid | V0.6.3 |
| Liquify | ⬜ | V0.6.3 |

## Fill, gradients, shapes
| Feature | Status | Target phase |
|---|---|---|
| Bucket / Smart Fill | ✅ | V0.4 |
| Tolerance | ✅ | V0.4 |
| Gap closing | ✅ | V0.4 |
| Under-line expansion | ✅ | V0.4 |
| Active / visible / line-art reference | ✅ | V0.4 |
| Enclose & Fill | 🟡 selection-enclosure foundation | V0.6.2 |
| Unpainted area fill | ✅ connected transparent-area fill | V0.6.2 |
| Linear gradient | ✅ foreground → secondary | V0.6.2 |
| Radial gradient | ✅ foreground → secondary | V0.6.2 |
| Line / curve shape | 🟡 line implemented; curve planned | V0.6.2 |
| Rectangle / ellipse / polygon shape | 🟡 rectangle + ellipse implemented; polygon planned | V0.6.2 |

## Vector editing
| Feature | Status | Target phase |
|---|---|---|
| Vector path storage | ✅ | V0.6 |
| Select vector stroke | ✅ | V0.6 |
| Move control points | ✅ | V0.6 |
| Change stroke width/color | ✅ | V0.6 |
| Whole-stroke vector eraser | ✅ | V0.6 |
| Rasterize vector | ✅ | V0.6 |
| Add/delete individual control points | ✅ | V0.6.3 |
| Bezier handles | ✅ | V0.6.3 |
| Partial/intersection vector eraser | 🟡 nearest-segment partial erase implemented; intersection-aware erase later | V0.6.3 |
| Simplify / connect / redraw vector | ✅ | V0.6.3 |
| Raster → vector conversion | ⬜ | Later |
| SVG export | ⬜ | V0.9 |

## Rulers and drawing assists
| Feature | Status | Target phase |
|---|---|---|
| Grid / guide | ✅ overlay + snap + direct guide handle | V0.6.6 |
| Straight / parallel ruler | ✅ stroke-origin projection + snap | V0.6.6 |
| Curve ruler | 🟡 cubic ruler + snap implemented; control-node editing later | V0.6.6 |
| Radial / concentric ruler | ✅ center/ray/spacing controls + direct center handle | V0.6.6 |
| Symmetry ruler | ✅ 2–12 axes; raster dab + editable vector replication | V0.6.6 |
| Perspective ruler | ✅ 1/2/3 point snap + horizon/VP handles | V0.6.6 |
| Snap controls | ✅ global command-bar toggle + Assist palette control | V0.6.6 |

## Text, comic and manga tools
| Feature | Status | Target phase |
|---|---|---|
| Text tool | ✅ first-class editable multiline text | V0.6.7 restoration |
| Font / size / spacing / outline | ✅ post-placement fields, alignment and position | V0.6.7 restoration |
| Speech balloons | ✅ ellipse/rounded rectangle with editable straight tail; freehand later | V0.6.7 restoration |
| Panel/frame divider | ✅ straight grid, rows/columns/margin/gutter; polygon later | V0.6.7 restoration |
| Comic guides | 🟡 straight panel-grid foundation; arbitrary polygon frames later | V0.6.7 restoration |
| Screen tones | ✅ editable dots/lines, frequency/angle/density/color | V0.6.7 restoration |
| Speed lines / focus lines | ✅ deterministic editable seeded effects | V0.6.7 restoration |

## Filters and correction
| Feature | Status | Target phase |
|---|---|---|
| Gaussian blur | ⬜ | V0.6.8 |
| Motion / radial blur | ⬜ | V0.6.8 |
| Sharpen | ⬜ | V0.6.8 |
| Noise / mosaic | ⬜ | V0.6.8 |
| Chromatic aberration | ⬜ | V0.6.8 |
| Wave / ripple / twirl / fisheye | ⬜ | V0.6.8 |
| Brightness / contrast | ⬜ | V0.6.8 |
| Hue / saturation | ⬜ | V0.6.8 |
| Levels / curves | ⬜ | V0.6.8 |
| Color balance | ⬜ | V0.6.8 |
| Posterize / replace color | ⬜ | V0.6.8 |

## Workspace and productivity
| Feature | Status | Target phase |
|---|---|---|
| Professional menu + command + document chrome | ✅ | V0.6.1 |
| Primary / secondary dock palettes | ✅ | V0.6.1 |
| Standard / Advanced modes | ✅ | V0.1+ |
| Right / left-handed layout | ✅ | V0.5 |
| Collapsible palettes | ✅ | V0.5 |
| Navigator | ✅ | V0.5 |
| History | ✅ | V0.5 |
| Workspace persistence | ✅ | V0.5 |
| UI density | ✅ | V0.5 |
| Canvas surround options | ✅ | V0.5 |
| Shortcut profile foundation | ✅ | V0.5 |
| Per-command shortcut editor | ⬜ | V0.6.9 |
| Quick Access palette | ⬜ | V0.6.9 |
| Arbitrary drag docking | ⬜ | Later |
| Floating/detached palettes | ⬜ | Later |
| Multi-document editing | ⬜ | V0.6.9 |

## Reference and materials
| Feature | Status | Target phase |
|---|---|---|
| Reference image window | ✅ import / preview / opacity / clear foundation | V0.6.2 |
| Image material / texture | ✅ PNG/JPEG/WebP import, embedded pixels and editable transform | V0.6.7 restoration |
| Pattern / tone material | ✅ repeat modes and editable screen-tone layers | V0.6.7 restoration |
| Material browser/search | ⬜ | Later |
| 3D pose/reference | ⬜ | Later |

## File, safety and performance
| Feature | Status | Target phase |
|---|---|---|
| PNG export / transparent PNG | ✅ | V0.1/V0.3 |
| JPEG / WebP export | ⬜ | V0.6.9 |
| PSD import/export | ⬜ | V0.6.9 |
| SVG export | ⬜ | V0.9 |
| App project format | ✅ `.drawstudio` version1 foundation retained; editable layers/materials round-trip | V0.6.9 base + V0.6.7 restoration |
| Autosave / recovery | ✅ local IndexedDB checkpoints and explicit recovery | V0.6.9 base + V0.6.7 restoration |
| Large-canvas memory optimization | 🟡 composite cache foundation | V0.6.9 |
| Worker / OffscreenCanvas rendering | ⬜ | V0.8/V1.0 |

## Animation and sharing
| Feature | Status | Target phase |
|---|---|---|
| Timeline / cels / frames | ⬜ | V0.7 |
| Onion skin | ⬜ | V0.7 |
| FPS / playback | ⬜ | V0.7 |
| Audio / camera / keyframes | ⬜ | V0.8 |
| Video/GIF export | ⬜ | V0.7/V0.8 |
| Timelapse | ⬜ | V0.9 |
| Cloud project sync | ⬜ | V0.9 |
| Brush/palette/settings sync | ⬜ | V0.9 |
| Project sharing / collaboration | ⬜ | V0.9+ |
