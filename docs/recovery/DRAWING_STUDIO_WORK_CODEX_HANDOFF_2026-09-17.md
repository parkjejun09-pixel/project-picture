# Drawing Studio — Work / Codex 개발 인수인계
**작성일:** 2026-09-17  
**목적:** 누락된 V0.6.7 ~ V0.6.8.4를 현재 복구된 V0.6.9 베이스 위에 정확히 재적용하고, 이후 V0.6.9 완료 → V0.7 → V0.8 → V0.9 → V1.0까지 Work/Codex에서 이어서 개발하기 위한 단일 인수인계 문서.

---

## 0. 가장 중요한 결론

이 프로젝트는 **처음부터 다시 만들면 안 된다.**

현재 사용할 시작점은 Library의 다음 파일이다.

`/코딩/recovery-work/drawing-webapp-v0.6.9-base.zip`

이 ZIP은 이름은 V0.6.9이지만 내부 `package.json`의 버전 문자열은 아직 `0.6.6`이다.  
그 이유는 **마지막으로 완전하게 남아 있던 소스가 V0.6.6이고, 그 위에 V0.6.9의 persistence foundation을 복구해서 만든 베이스**이기 때문이다.

즉:

> **V0.6.6 소스 기능 + V0.6.9 저장/복구 기반 = 현재 복구 베이스**

따라서 Work/Codex는 옛 V0.6.6 ZIP부터 다시 시작하거나 V0.6.9 저장 시스템을 버리면 안 된다.  
반드시 `drawing-webapp-v0.6.9-base.zip`을 풀어서 그 결과물 위에 **V0.6.7 → V0.6.8 → V0.6.8.1 → V0.6.8.2 → V0.6.8.3 → V0.6.8.4**를 순서대로 재적용해야 한다.

그 다음 현재 V0.6.9의 나머지 범위를 완성한다.

---

# 1. 프로젝트의 최종 방향

Drawing Studio는 단순한 연습용 그림 사이트가 아니다.

목표는 **Clip Studio Paint / MediBang Paint / ibisPaint 계열의 전문적인 사용 경험을 웹에서 제공하는 browser-first illustration application**이다.

단, 특정 상용 프로그램의 proprietary asset, 브러시 파일, 아이콘, 소스 코드, 정확한 UI를 복제하는 것이 아니라 다음과 같은 **기능적·정보구조적 장점**을 독립적으로 구현한다.

핵심 방향:

- Drawing-first.
- Animation은 별도/선택적 Workspace로 추가한다.
- Standard 모드도 실제 작업에 충분히 강력해야 한다.
- Advanced 모드는 기본 기능을 숨겨놓았다가 보여주는 모드가 아니라 더 깊은 조정 기능을 제공해야 한다.
- 어두운 near-black / charcoal professional workspace.
- 둥글고 여백이 큰 SaaS 카드형 UI 지양.
- 연결된 dock palette 구조.
- 얇은 separator.
- restrained translucency.
- compact square controls.
- muted blue-gray active state.
- 빈 공간 최소화.
- 데스크톱 전문 툴처럼 정보 밀도를 높인다.
- 기능 버튼은 **실제로 작동해야 한다.**
- 아직 구현되지 않은 기능을 가짜 버튼/가짜 완료 상태로 노출하지 않는다.
- 사용자가 초보자라고 해서 코드를 “초보자용 장난감 구현”으로 낮추지 않는다.
- 실제 제품 수준의 구조를 만들면서 사용자가 버전업 과정을 통해 배워가는 방식이다.

---

# 2. 사용자 작업 방식 / 반드시 지킬 개발 규칙

## 2.1 버전은 하나씩 복구한다

누락된 버전이 많다고 한 번에 전부 구현하지 않는다.

순서:

1. V0.6.7 완성
2. 전체 테스트 / build / visual 확인
3. 체크포인트 ZIP과 commit 생성
4. 그 다음 V0.6.8
5. 같은 방식으로 반복

한 버전이 크다면 그 버전 내부 작업을 더 작은 checkpoint로 나누는 것은 좋지만, **이전 버전이 완전히 검증되기 전에 다음 버전으로 넘어가지 않는다.**

사용자가 특히 우려한 것은 긴 계산/스트리밍 때문에 작업이 중간에 끊기고 결과물이 사라지는 것이다.

따라서 “큰 한 방”보다 **작은 성공 단위 + 매 단계 검증**이 우선이다.

---

## 2.2 항상 최신 결과물 위에 누적한다

각 버전 완료 후 다음 버전은 반드시 직전 완료본을 기반으로 한다.

예:

`V0.6.9 recovery base`
→ `+ restored V0.6.7`
→ `+ restored V0.6.8`
→ `+ restored V0.6.8.1`
→ ...

과거 프리뷰를 재현한다고 해서 현재 베이스에서 이미 살아난 기능을 없애면 안 된다.

특히 **현재 V0.6.9 persistence foundation은 모든 누락 버전 복원 과정에서 계속 유지되어야 한다.**

---

## 2.3 UI 복원 시 “옛 프리뷰 그대로”보다 “기능 누적”이 우선

예를 들어 V0.6.8.4 당시 프리뷰에서는 New/Open/Save가 V0.9 이전 단계라는 이유로 disabled 상태였던 기록이 있다.

하지만 지금 사용하는 베이스에는 이미 실제 `.drawstudio` Open / Save / Save As가 구현되어 있다.

따라서 V0.6.8.4 UI를 재구성할 때:

- V0.6.8.4의 **배치, 밀도, command/context bar 디자인은 복원**
- 하지만 현재 베이스의 실제 Open / Save / Save As는 **절대 disabled로 되돌리지 않음**

즉 과거 디자인을 현재 기능 위에 적용한다.

---

## 2.4 완료 선언 전에 반드시 실제 검증

각 checkpoint에서 최소:

```bash
npm test
npm run build
```

둘 다 성공해야 한다.

가능하다면 로컬 serve 후 주요 화면/소스에 대한 smoke check도 수행한다.

UI 버전이라면 preview/screenshot을 만들어 이전 PNG/HTML reference와 육안 비교한다.

---

# 3. 현재 가장 최신으로 “실제로 사용 가능한” 베이스

## 파일

`/코딩/recovery-work/drawing-webapp-v0.6.9-base.zip`

크기 기록: 약 **229,368 bytes**

동일 내용의 recovery artifact:

`/코딩/drawing-webapp-v0.6.9-persistence-foundation-recovery.zip`

Recovery 상태 문서:

`/코딩/drawing-studio-v0.6.9-recovery-status.md`

---

## 3.1 현재 베이스의 실제 출발 소스

Recovered source baseline:

**V0.6.6**

현재 `package.json`:

```json
{
  "name": "drawing-webapp",
  "version": "0.6.6"
}
```

이 version 문자열이 현재 기능 상태를 완전히 표현하지는 않는다.

V0.6.9 persistence가 이미 추가된 상태이므로, 이 문자열만 보고 V0.6.9 코드가 없다고 판단하면 안 된다.

---

## 3.2 현재 베이스에서 독립 재검증한 상태

인수인계 직전 기준:

- **184 / 184 tests PASS**
- production build 성공
- `dist/` build 성공

현재 source tree에는 다음 persistence 모듈이 실제 존재한다.

```text
src/persistence/autosaveStore.ts
src/persistence/documentDto.ts
src/persistence/editorStateDto.ts
src/persistence/projectController.ts
src/persistence/projectFormat.ts
src/persistence/projectModel.ts
```

V0.6.9 관련 tests도 존재한다.

```text
tests/autosaveV069.test.mjs
tests/documentDtoV069.test.mjs
tests/editorStateDtoV069.test.mjs
tests/projectControllerV069.test.mjs
tests/projectFormatV069.test.mjs
tests/projectModelV069.test.mjs
tests/v069Markup.test.mjs
```

---

## 3.3 현재 V0.6.9 persistence foundation에서 이미 구현된 것

### `.drawstudio` project format
- versioned `.drawstudio` v1
- UTF-8 JSON codec

### serialization
- Raster/background pixel surface
- layer mask
- vector strokes
- selection-layer masks
- editor state
- brush texture byte data

### document safety
- dirty revision tracking
- document tab dirty indicator

### local file workflow
- Open
- Save
- Save As
- File System Access API 지원 브라우저에서 직접 로컬 파일 사용
- 지원하지 않는 환경에서 upload/download fallback

### autosave / recovery
- IndexedDB autosave
- recovery checkpoint
- recent-project metadata
- explicit recovery UI
- recovery가 현재 작업을 자동으로 덮어쓰지 않음
- corrupt payload는 fail-closed

### forward compatibility
Project format에는 `extensions` 영역이 존재한다.

따라서 V0.6.7 이후의 Text/Manga/Material/Smart Effect 데이터를 다시 추가할 때 **project format 전체를 폐기하거나 새로 설계하지 말고 현재 format을 확장**하는 것이 기본 방침이다.

---

# 4. 왜 복원 작업이 필요한가

과거 V0.6.7 ~ V0.6.8.4는 실제로 구현되었고 테스트를 통과한 기록이 있다.

하지만 현재 Library에 남은 해당 버전 ZIP들은 대부분 **22-byte 빈 ZIP**이라 실제 source archive로 사용할 수 없다.

예:

```text
/코딩/drawing-webapp-v0.6.8.1.zip
/코딩/drawing-webapp-v0.6.8.2.zip
/코딩/drawing-webapp-v0.6.8.3.zip
/코딩/drawing-webapp-v0.6.8.3-workspace-polish.zip
/코딩/drawing-webapp-v0.6.8.4-top-density.zip
```

따라서 이들을 source라고 믿고 unzip하거나 merge해서는 안 된다.

복원 근거는 다음 4종류를 조합한다.

1. 최신 roadmap
2. feature matrix
3. 당시 static HTML preview
4. 당시 visual PNG preview / 대화에서 기록된 구현 결과

---

# 5. V0.1 ~ V0.6.6 — 현재 베이스에 이미 존재하는 핵심 기능

이 범위는 원칙적으로 다시 만들지 않는다.  
누락 버전 작업으로 인해 깨지지 않도록 regression을 막는 대상이다.

---

## V0.1 — Foundation / Vertical Slice

- HTML Canvas drawing surface
- mouse / touch / stylus pointer input
- Brush / Eraser
- size / opacity
- HEX color
- stroke interpolation
- undo / redo
- zoom / space-drag pan
- PNG export
- 초기 layer UI
- Standard / Advanced foundation

---

## V0.2 — Brush Feel

- stylus pressure
- pressure response curve
- size / opacity pressure strength
- stabilizer
- tilt
- Pencil
- Inking Pen
- Marker
- Soft Airbrush
- coalesced pointer handling
- compact professional brush UI

---

## V0.3 — Layer & Compositing

- multiple raster layers
- reorder / rename / visibility / duplicate / delete / merge
- opacity
- Normal / Multiply / Screen / Overlay / Add
- groups/folders
- alpha lock
- clipping
- layer mask
- composite preview caching
- document-aware undo/redo

---

## V0.4 — Color Lab & Smart Fill

- HEX / RGB / HSV synchronized model
- color wheel + saturation/value
- recent / favorite / project colors
- tint / shade / tone / warm / cool
- harmony generator
- image palette extraction
- fill tolerance
- gap closing
- under-line expansion
- Active / Visible / Line Art reference

---

## V0.5 — Advanced Workspace

- professional charcoal shell
- collapsible docks
- Brush Studio
- Navigator
- History
- Workspace settings
- document tabs
- right/left handed mirrored layout
- workspace persistence via localStorage
- canvas surround setting
- compact/comfortable density
- Drawing Studio / Adobe-like / Clip-like shortcut profile foundation

---

## V0.6 — Selection, Transform & Vector

- rectangle selection
- raster move
- scale presets
- rotate / flip
- contextual Properties
- first-class vector layers
- editable vector stroke
- control points
- vector eraser
- rasterize vector

---

## V0.6.1 — UI Reconstruction

핵심 구조:

```text
Application menu
Command bar
Document tabs
Tool strip
Primary dock
Canvas
Secondary dock
Status bar
```

Standard mode에도:

- Color
- Color Set
- Sub Tool
- Tool Property
- Navigator
- Layers
- contextual properties

가 보여야 한다.

UI 원칙:

- floating rounded SaaS cards 금지
- connected dock palette
- large circular hue wheel
- inset saturation/value
- separate Color Set
- handedness 전환 시 dock + tool strip 전체 mirroring

---

## V0.6.2 — Core Tool Expansion

- Eyedropper
- Gradient
- line / rectangle / ellipse
- Magic Wand
- Lasso
- raster text foundation
- Reference image palette
- Enclose & Fill foundation
- unpainted-area fill

---

## V0.6.3 — Selection / Transform / Vector Complete

- ellipse / polygon / selection pen
- selection add/subtract/intersect
- feather
- expand / contract
- invert
- interactive free transform
- rotation handle
- perspective / distort
- 3×3 mesh warp
- vector anchor add/delete
- Bezier handles
- partial segment erase
- simplify / connect / redraw

Known partial/later items:
- numerical transform fields
- true intersection-aware vector eraser
- select by opacity/brightness
- Liquify

복원 작업 중 억지로 “완료” 처리하지 않는다.

---

## V0.6.4 / V0.6.5 — Brush Complete + Layer Complete

### Brush
- Flow
- velocity
- rotation
- scatter / jitter
- color jitter
- grain / texture
- dual brush
- Watercolor / Oil wet mixing
- Smudge
- Blur
- search / favorite
- `.drawbrush` transfer
- independent start/end taper
- imported image → luminance texture map
- generated stroke preview

### Layer
- Fill Layer
- Gradient Layer
- Correction Layer foundation
- Selection Layer
- Reference role
- Draft role
- layer color tags
- layer search/filter
- Flatten Visible

---

## V0.6.6 — Ruler & Assist

- grid / guide + snap
- direct guide positioning
- straight ruler
- parallel ruler
- cubic curve ruler
- radial
- concentric
- 2–12 axis symmetry
- raster dab + editable vector symmetry replication
- 1/2/3 point perspective
- draggable horizon
- draggable vanishing points
- assist overlay는 view-only
- export artwork에 assist graphics가 포함되면 안 됨

Known partial:
- curve ruler의 direct Bezier control-node editing은 later

---

# 6. 누락 버전 복원 — 반드시 이 순서

---

# 6.1 V0.6.7 — Text, Manga & Materials

## 목표

텍스트와 만화/소재 기능을 단순히 canvas에 bake하는 방식이 아니라 **first-class editable layer**로 복원한다.

---

## 필수 Layer 종류

최소 다음 계열이 실제 document model에 존재해야 한다.

- Text
- Balloon
- Panel
- Screen Tone
- Manga Effect
- Material

Chat에서 한 차례 이 6개 layer type을 model에 다시 넣는 작은 복원 작업이 성공했다는 기록은 있지만, **그 결과를 담은 새 source ZIP이 Library에 저장되어 있지 않다.**

따라서 다음 agent는 그 작업이 저장돼 있다고 가정하지 말고 현재 V0.6.9 base에서 다시 구현/검증한다.

---

## Text Layer

Editable properties:

- content
- font family
- size
- weight
- alignment
- line height
- letter spacing
- fill color
- outline color
- outline width
- x/y position

텍스트 배치 후에도 수정 가능해야 한다.

---

## Balloon Layer

최소:

- ellipse body
- rounded-rectangle body
- editable straight tail
- body position/size
- fill/stroke

Freehand balloon contour는 당시에도 later였다.  
가짜 완료 처리하지 않는다.

---

## Panel Layer

- straight grid
- rows
- columns
- margin
- gutter
- stroke

Arbitrary polygon comic frame은 later.

---

## Screen Tone Layer

- dots
- lines
- frequency
- angle
- density

editable metadata로 유지한다.

---

## Manga Effect Layer

- Speed Lines
- Focus Lines
- deterministic rendering
- editable parameters

다시 생성 가능한 효과여야 하며 raster 결과만 저장하는 구조로 만들지 않는다.

---

## Material Layer

- PNG
- JPEG
- WebP

종류:

- Image
- Pattern
- Texture

Editable transform:

- position
- scale
- rotation
- repeat mode

현재는 V0.6.9 project format이 존재하므로, 옛 V0.6.7 당시 “future project format에서 asset embedding”으로 미뤘던 부분을 그대로 방치하지 말고 **현재 `.drawstudio` round-trip에서 material asset이 유실되지 않는 방식**으로 통합한다.

---

## V0.6.7 통합 요구사항

모든 신규 layer는 기존 pipeline에서 다음을 지원해야 한다.

- visibility
- opacity
- blend
- duplication
- history
- flattening
- Navigator
- PNG export
- `.drawstudio` Save/Open
- autosave/recovery
- dirty tracking

---

## V0.6.7 visual reference

Library:

```text
/코딩/drawing-studio-v0.6.7-static-preview.html
/코딩/drawing-studio-v0.6.7-roadmap.md
/코딩/drawing-studio-v0.6.7-feature-matrix.md
```

Static preview의 핵심 UI:

Left tool rail:
- Text
- Balloon
- Panel
- Tone
- Effect
- Material

Primary dock:
- MANGA / MATERIALS
- TEXT
- MATERIAL

Secondary dock:
- Properties
- Layers

Layer badges 예:
- TXT
- BAL
- FX
- TONE
- PNL
- MAT

---

## V0.6.7 Definition of Done

다음이 모두 만족되어야 다음 버전으로 이동:

1. 신규 layer가 document tree에 first-class type으로 존재
2. canvas render
3. properties editing
4. history
5. duplicate/delete/reorder
6. composite/export
7. `.drawstudio` round-trip
8. autosave/recovery round-trip
9. regression tests
10. build 성공

---

# 6.2 V0.6.8 — Filters & Color Correction

## 목표

Color correction은 editable Correction Layer 중심으로, spatial filter는 Preview/Apply와 이후 Smart Effect로 이어지는 구조를 복원한다.

---

## Non-destructive Correction Layers

- Brightness / Contrast
- Hue / Saturation
- Levels
- master RGB Curves
- Color Balance
- Posterize
- two-color Gradient Map

V0.6.5의 기존 Brightness/Contrast, Hue/Saturation correction foundation을 확장한다.

---

## Raster filters — V0.6.8 기본 5종

- Gaussian Blur
- Sharpen
- deterministic Noise
- Pixelate
- Wave

V0.6.8 시점 동작:

`Preview → Apply / Cancel`

조건:

- preview는 stored source pixels를 즉시 파괴하지 않음
- Apply는 undoable
- selection이 있으면 compute/writeback 모두 selection으로 제한

---

## Historical checkpoint

과거 대화 기록:

- commit: `de60441`
- tests: **192 / 192 PASS**
- build: success

이 commit source 자체는 현재 usable archive로 남아 있지 않다.  
숫자/commit은 역사적 검증 수준을 파악하기 위한 참고점이다.

현재 재구현의 테스트 개수가 반드시 192와 같을 필요는 없다.

---

# 6.3 V0.6.8.1 — Non-Destructive Effects Foundation

## 핵심 architecture

Raster/background node에 ordered:

```ts
effects[]
```

stack을 둔다.

Render order:

```text
source raster
→ enabled Smart Effects in order
→ layer mask
→ opacity / blend
→ composite
```

---

## 필수 기능

- add Smart Effect
- select/edit effect
- enable/disable
- reorder
- remove
- explicit Rasterize Effects
- deep-cloned snapshot/history metadata

Smart Effect 종류:

- Gaussian Blur
- Sharpen
- Noise
- Pixelate
- Wave

V0.6.8 raster algorithm을 그대로 adapter하여 destructive path와 non-destructive path가 서로 다른 알고리즘이 되지 않도록 한다.

---

## cache

- revision-aware per-layer effect cache
- parameter-only edit는 source pixel을 다시 쓰지 않음
- source edit / merge / restore 후 stale cache 무효화
- foundation 단계에서는 whole-layer caching 허용

tile/region caching은 later performance work.

---

## Correction Layer와 Smart Effect를 섞지 않는다

- Correction Layer = composite-level tonal/color adjustment
- Smart Effect = raster/background node의 ordered per-layer effect stack

둘을 하나의 개념으로 합치지 않는다.

---

## Historical checkpoint

- commit: `36ee1bd`
- tests: **205 / 205 PASS**
- production build success

당시 foundation에 포함:

- ordered non-destructive effects stack
- Gaussian Blur
- Sharpen
- Noise
- Pixelate
- Wave

당시 아직 다음 단계였던 것:

- Motion/Radial Blur
- Ripple
- Twirl
- Fisheye
- Chromatic Aberration
- Replace Color

---

# 6.4 V0.6.8.2 — Smart Filter Expansion

## 새 filter families

- Motion Blur
- Radial Blur
  - Spin
  - Zoom
- Ripple
- Twirl
- Fisheye
- Chromatic Aberration
- Replace Color

Replace Color:
- tolerance
- feather

---

## Curves 확장

Correction Layer의 Curves:

- master
- Red
- Green
- Blue

독립 channel curve 지원.

---

## Per-effect pixel mask

- current selection에서 effect mask capture
- invert
- clear
- mask-aware cache signature
- effect stage마다 mask가 실제 적용
- source raster는 mutate하지 않음

---

## 알고리즘 공유

새 filter family도:

- destructive Preview/Apply
- Smart Effect stack

둘 모두 **같은 tested algorithm path**를 사용한다.

---

## Historical checkpoint

- commit: `530f832`
- tests: **223 / 223 PASS**
- build success

---

## Reference files

```text
/코딩/drawing-studio-v0.6.8.2-roadmap.md
/코딩/drawing-studio-v0.6.8.2-feature-matrix.md
/코딩/drawing-studio-v0.6.8.2-static-preview.html
/코딩/drawing-studio-v0.6.8.2-visual-preview.png
```

---

# 6.5 V0.6.8.3 — Professional Workspace Complete

## 목표

기존 엔진을 건드리기보다 **이미 구현된 기능을 전문 작업공간에 제대로 surface**하는 UI 단계.

사용자가 특별히 요구했던 것:

> 왼쪽 툴바를 빈 공간 없이 채우고, Clip Studio / MediBang을 참고한 색감·배치의 차콜 UI.

---

## Left rail

큰 flexible empty spacer를 남기지 않는다.

Tool grouping:

### Paint
- Brush
- Eraser
- Smudge
- Blur
- Mix

### Color
- Pick
- Fill
- Gradient

### Selection
- Select
- Lasso
- Wand
- Transform

### Construction
- Shape
- Vector
- Text
- Assist

### View
- Hand

### Manga
- Balloon
- Panel
- Tone
- Speed
- Focus

실제 엔진/액션이 있는 항목만 노출한다.

---

## Primary dock

Standard에서 직접:

- Color
- Color Set
- Sub Tool
- Tool Property
- Brush Size

---

## Secondary dock

### Navigator
계속 visible.

### Layers
secondary dock에서 가장 큰 영역을 차지.

필수:
- persistent footer
- complete New Layer menu

### Auxiliary tabs
compact tab dock:

- History
- Material
- Reference
- Filter

History는 Standard에서도 보인다.

---

## Visual language

- near-black
- charcoal
- connected palette
- thin separator
- restrained translucency
- compact square controls
- muted blue-gray selection
- UI density 높게
- large empty regions 최소화

---

## Historical checkpoint

- commit: `4bd7b3b`
- tests: **230 / 230 PASS**
- production build success
- HTTP smoke checks success

---

## Reference files

```text
/코딩/drawing-studio-v0.6.8.3-roadmap.md
/코딩/drawing-studio-v0.6.8.3-feature-matrix.md
/코딩/drawing-studio-v0.6.8.3-static-preview.html
/코딩/drawing-studio-v0.6.8.3-visual-preview.png
/코딩/drawing-studio-v0.6.8.3-workspace-polish-preview.html
/코딩/drawing-studio-v0.6.8.3-workspace-polish-preview.png
```

---

# 6.6 V0.6.8.4 — Command & Context Toolbar / Top Bar Density Polish

V0.6.8.4는 두 번의 UI refinement checkpoint가 있었다.

---

## 1차: Command & Context Toolbar

Historical checkpoint:

- commit: `75d8d51`
- tests: **238 / 238 PASS**
- production build success
- HTTP checks success

추가한 방향:

- main command bar
- context-sensitive toolbar
- undo/redo
- export
- zoom/canvas controls
- tool-specific settings

---

## 최종: Top Bar Density Polish

Historical final checkpoint:

- commit: `a8d5c4f`
- tests: **241 / 241 PASS**
- production build success
- HTTP 200 checks success

---

## 최종 top hierarchy

대략:

```text
Menu
Dense Command Strip
Context Bar
Document Tab
Main Workspace
Status Bar
```

Final preview에서 row density는 매우 작고 compact했다.

---

## Command strip에 노출했던 그룹

### document
- New
- Open
- Save
- Export

### history
- Undo
- Redo

### selection/edit
- Deselect
- Invert
- Transform

### canvas / zoom
- Fit
- 1:1
- Zoom -
- numeric Zoom
- Zoom +

### assist
- Snap
- Grid
- Symmetry
- Perspective

### color
오른쪽 foreground/background color chips.

---

## Context Bar

현재 tool에 따라 내용이 바뀐다.

Brush 예:

- tool name
- Size
- Opacity
- Flow
- Stabilizer
- Pressure
- current preset

UI는 command bar보다도 작고 압축되어야 한다.

---

## 현재 V0.6.9와 합칠 때 매우 중요한 점

옛 V0.6.8.4 preview에서는 당시 V0.9 persistence가 없어서 New/Open/Save 일부가 disabled로 표시됐다.

**지금은 절대 그렇게 복원하지 않는다.**

현재 V0.6.9 base에는 이미:

- Open
- Save
- Save As
- autosave
- recovery

가 실제로 있다.

따라서 최종 V0.6.8.4 스타일에서는 그 실제 command를 dense toolbar에 연결한다.

---

## Reference files

```text
/코딩/drawing-studio-v0.6.8.4-static-preview.html
/코딩/drawing-studio-v0.6.8.4-visual-preview.png
/코딩/drawing-studio-v0.6.8.4-top-density-preview.html
/코딩/drawing-studio-v0.6.8.4-top-density-preview.png
```

특히 **top-density preview를 최종 시각 기준**으로 삼는다.

---

# 7. 누락 버전 복원이 끝난 뒤 V0.6.9 완료

현재 V0.6.9는 persistence foundation만 먼저 복구되어 있다.

누락된 V0.6.7~0.6.8.4가 다시 합쳐진 후 다음을 완성한다.

---

## 이미 완료된 V0.6.9 영역

- `.drawstudio`
- Open
- Save
- Save As
- File System Access API
- fallback upload/download
- IndexedDB autosave
- recovery
- recent project metadata
- dirty tracking

다시 만들지 않는다.

---

## 남은 V0.6.9 목표

### Shortcut Editor
- per-command shortcut editing
- 기존 shortcut profile foundation과 연결
- conflict detection 필요
- keyboard navigation과 충돌하지 않도록 함

### Quick Access
- 사용자 지정 자주 쓰는 명령 surface
- 실제 command registry와 연결
- fake duplicate logic 금지

### Multi-document
- 실제 여러 document state
- active document
- dirty state per document
- project handle / autosave state per document
- tab switch가 raster/editor state를 섞지 않도록 설계

### Export
- JPEG
- WebP

PNG 기존 동작 회귀 금지.

### PSD
Roadmap은 “research/implementation”.

PSD는 무리하게 fake-complete 하지 말고:
- 지원 범위를 먼저 명시
- import/export 중 어느 방향부터 가능한지 검증
- unsupported feature를 명확히 처리

### Large canvas performance
- 현재 composite cache를 기반으로 profiling
- Smart Effect whole-layer cache의 한계 확인
- tile/region caching 후보
- memory budget 측정

---

# 8. 그 이후 공식 Roadmap

누락 버전 복원 + V0.6.9 완료 후 순서.

---

# V0.7 — Animation Core

Goal:
**frame-by-frame animation을 folder-heavy하지 않게 만든다.**

- optional Animation workspace
- Timeline
- frames / cels
- `+ Frame`가 필요한 cel state를 자동 생성
- Onion Skin
- duplicate frame
- hold/expose
- configurable FPS
- playback
- frame thumbnails
- nearby-frame caching
- basic animated PNG / WebM preview export path

중요:

Drawing Studio의 core는 drawing-first다.  
Timeline 때문에 기존 Illustration Workspace가 복잡해지면 안 된다.

---

# V0.8 — Animation Pro

- audio import
- waveform timeline
- reference video track
- 2D camera
  - pan
  - zoom
  - rotation keyframes
- general transform keyframes
- long-project cache eviction
- worker-based frame compositing
- smart colorization research prototype
- background render/export jobs
- progress
- cancellation

V1.0 성능 작업과 연결되므로 worker/offscreen architecture를 무계획하게 중복 구현하지 않는다.

---

# V0.9 — Persistence, Project Format & Sharing

중요:

현재 V0.6.9 recovery base에서 아래 일부가 이미 선행 구현됐다.

이미 foundation 존재:
- versioned `.drawstudio`
- File System Access API
- upload/download fallback
- IndexedDB autosave/recovery

따라서 V0.9에서 이걸 다시 갈아엎지 않는다.

확장 목표:

- mature project format migrations
- PNG/WebP export presets
- layered export research
- brush import/export
- palette import/export
- workspace import/export
- SVG export 연구/구현 범위 확정
- Timelapse
- optional account/cloud sync backend
- shareable read-only project link
- corruption safeguards

Local-first 원칙 유지.

Cloud가 canonical storage가 되면 안 된다.  
사용자 소유 local project file이 계속 중요한 경로다.

---

# V1.0 — Public Beta

Goal:
**지금까지 만든 시스템을 coherent / fast / understandable한 public beta로 정리**

- guided first-run
- performance profiling
- memory budgets
- Worker / OffscreenCanvas where supported
- fallback path
- cross-browser test matrix
- tablet testing
- accessibility
- keyboard navigation
- error recovery UI
- corrupted project safeguards
- PWA installability
- 최소한의 UX/performance analytics

Exit condition:

- external tester에게 제공 가능
- supported browser에서 known data-loss bug가 없어야 함

---

# 9. 최신 Feature Matrix에서 아직 미완료/부분인 주요 항목

이 항목들은 누락 버전 복원 중 “이미 완료됐다”고 잘못 표시하지 않는다.

### Brush
- user-created brush folders: later
- imported bitmap texture embedding in `.drawbrush`: partial/later

### Color
- Color Slider palette
- Color Mixing palette

### Selection
- select from layer opacity
- select by brightness/color

### Transform
- numerical transform
- Liquify

### Shapes
- curve shape
- polygon shape 일부

### Vector
- true intersection-aware vector erase
- raster → vector
- SVG export future scope

### Assist
- curve ruler direct control-node editing

### Comic
- arbitrary polygon comic frame
- freehand balloon contour

### Workspace
- arbitrary free drag docking
- detached/floating palettes

### Reference
- Material browser/search
- 3D pose/reference

이 목록을 보고 feature creep로 누락 복원 단계에 무리하게 추가하지 않는다.

---

# 10. Historical 구현 체크포인트

아래는 소스 ZIP을 잃기 전 대화에서 기록된 과거 checkpoint다.

| Version | Commit | Tests | Build | 내용 |
|---|---|---:|---|---|
| V0.6.8 | `de60441` | 192/192 | PASS | Correction Layers + 5 raster filters |
| V0.6.8.1 | `36ee1bd` | 205/205 | PASS | ordered Smart Effect foundation |
| V0.6.8.2 | `530f832` | 223/223 | PASS | expanded smart filters + effect mask + RGB Curves |
| V0.6.8.3 | `4bd7b3b` | 230/230 | PASS | Professional Workspace Complete |
| V0.6.8.4 Command/Context | `75d8d51` | 238/238 | PASS | command/context toolbar |
| V0.6.8.4 Top Density | `a8d5c4f` | 241/241 | PASS | final dense top bar polish |

주의:

이 commit들이 현재 연결된 Git repository에서 반드시 조회 가능하다는 의미는 아니다.

현재 accessible source archive가 없으므로 **reference checkpoint**로 취급한다.

현재 reconstruction이 정확히 같은 test count를 만들 필요도 없다.

---

# 11. Source of Truth 우선순위

충돌이 생길 경우 다음 순서로 판단한다.

## 1순위 — 현재 실제 source
`drawing-webapp-v0.6.9-base.zip`

현재 이미 작동하는 기능을 보존하기 위한 source of truth.

## 2순위 — 가장 최신 version-specific roadmap / feature matrix
특정 버전에서 무엇을 실제 구현했는지 판단.

## 3순위 — 마지막 visual/static preview
UI 배치/밀도/색감 판단.

## 4순위 — 대화에 기록된 implementation result
commit/test/history와 사용자 요구 확인.

## 5순위 — 더 오래된 generic roadmap
신규 version-specific 기록과 충돌하지 않을 때 사용.

---

# 12. Reference Artifact Inventory

Work/Codex는 필요할 때 Library의 다음 자료를 직접 확인한다.

---

## Current baseline

```text
/코딩/recovery-work/drawing-webapp-v0.6.9-base.zip
/코딩/drawing-webapp-v0.6.9-persistence-foundation-recovery.zip
/코딩/drawing-studio-v0.6.9-recovery-status.md
```

---

## V0.6.7

```text
/코딩/drawing-studio-v0.6.7-roadmap.md
/코딩/drawing-studio-v0.6.7-feature-matrix.md
/코딩/drawing-studio-v0.6.7-static-preview.html
```

---

## V0.6.8.1

```text
/코딩/drawing-studio-v0.6.8.1-roadmap.md
/코딩/drawing-studio-v0.6.8.1-feature-matrix.md
/코딩/drawing-studio-v0.6.8.1-static-preview.html
```

---

## V0.6.8.2

```text
/코딩/drawing-studio-v0.6.8.2-roadmap.md
/코딩/drawing-studio-v0.6.8.2-feature-matrix.md
/코딩/drawing-studio-v0.6.8.2-static-preview.html
/코딩/drawing-studio-v0.6.8.2-visual-preview.png
```

---

## V0.6.8.3

```text
/코딩/drawing-studio-v0.6.8.3-roadmap.md
/코딩/drawing-studio-v0.6.8.3-feature-matrix.md
/코딩/drawing-studio-v0.6.8.3-static-preview.html
/코딩/drawing-studio-v0.6.8.3-visual-preview.png
/코딩/drawing-studio-v0.6.8.3-workspace-polish-preview.html
/코딩/drawing-studio-v0.6.8.3-workspace-polish-preview.png
```

---

## V0.6.8.4

```text
/코딩/drawing-studio-v0.6.8.4-static-preview.html
/코딩/drawing-studio-v0.6.8.4-visual-preview.png
/코딩/drawing-studio-v0.6.8.4-top-density-preview.html
/코딩/drawing-studio-v0.6.8.4-top-density-preview.png
```

V0.6.8.4는 roadmap markdown보다 **최종 preview + V0.6.8.3 roadmap의 누적 기능 + 대화 checkpoint 기록**이 중요하다.

---

# 13. ZIP / Artifact 안전 프로토콜

이번 복구가 필요한 가장 큰 이유 중 하나가 **과거 생성된 ZIP이 22-byte 빈 ZIP으로 남은 것**이다.

다시는 반복하지 않는다.

각 버전 완료 시:

## 1. source repo에서 tests/build

```bash
npm test
npm run build
```

## 2. ZIP 생성

예:

```text
drawing-webapp-v0.6.7-restored.zip
drawing-webapp-v0.6.8-restored.zip
...
```

## 3. ZIP 무결성 검사

```bash
unzip -t drawing-webapp-vX.Y.Z.zip
```

반드시 archive 내부 파일 목록이 실제 source tree를 포함하는지 확인.

22-byte 혹은 비정상적으로 작은 ZIP이면 완료 처리 금지.

## 4. 임시 디렉터리에 다시 extract

ZIP을 새 디렉터리에 풀고 그 복사본에서:

```bash
npm test
npm run build
```

가능하면 다시 실행.

즉 **원본 repo만 성공하는 것이 아니라 전달 artifact 자체가 재현 가능**해야 한다.

## 5. checkpoint metadata 남기기

최소:

- version
- commit hash
- tests passed
- build
- 주요 변경점
- known incomplete items
- ZIP filename

---

# 14. 권장 Git 작업 방식

각 복원 버전은 한꺼번에 섞지 않는다.

예:

```text
recovery/v067-text-manga-materials
recovery/v068-filters
recovery/v0681-smart-effects
recovery/v0682-filter-expansion
recovery/v0683-workspace
recovery/v0684-top-density
feature/v069-complete
```

한 version 안에서도 큰 작업이면 작은 commit을 사용.

예: V0.6.7

```text
1. add layer data model + tests
2. add rendering/compositing
3. add editor/actions/history
4. add UI/properties/tools
5. add project serialization/recovery
6. visual polish + regression
```

하지만 최종 artifact는 V0.6.7 전체가 완성된 뒤 만든다.

---

# 15. 테스트 전략

새 기능마다 단순 markup test만 늘리는 방식은 피한다.

가능하면 다음 계층을 모두 포함.

### data/model
- create
- clone
- serialize
- validate

### algorithms
- deterministic output
- selection/mask behavior
- edge cases

### history
- undo
- redo
- deep clone

### persistence
- `.drawstudio` save/open round-trip
- autosave/recovery round-trip

### rendering
- layer composite behavior
- cache invalidation

### UI wiring
- control이 실제 action/command와 연결
- 버튼만 존재하는 fake UI 방지

### regression
기존 184 tests가 계속 통과해야 한다.

---

# 16. UI 비교 원칙

PNG/HTML preview는 그대로 pixel-perfect clone하라는 뜻이 아니다.

복원해야 하는 것은:

- information architecture
- relative density
- palette placement
- tool grouping
- hierarchy
- charcoal color language
- empty-space 최소화
- command/context division
- active-state visual language

현재 기능이 더 발전했으면 **현재 기능을 유지한 채 예전 visual concept를 업그레이드해서 적용**한다.

---

# 17. Work와 Codex에 넘길 때의 역할

## Work에 적합한 작업

- 이 handoff + Library 자료 전체 읽기
- 버전별 큰 scope 관리
- reference image/HTML 비교
- 여러 파일/기능에 걸친 reconstruction
- 누락 기능 분석
- 버전 checkpoint 관리
- 다음 버전으로 넘어가기 전 verification

## Codex에 적합한 작업

- 실제 repository 수정
- 테스트 우선 구현
- focused bug fix
- refactor
- Git branch/commit
- build/test 반복
- regression 탐지

둘을 번갈아 사용하더라도 **동일 repository / 동일 최신 checkpoint**를 계속 사용해야 한다.

새 session에서 옛 ZIP을 다시 기준으로 삼지 않는다.

---

# 18. 다음 agent가 처음 해야 할 일

## Step 1

`drawing-webapp-v0.6.9-base.zip`을 working directory에 extract.

## Step 2

baseline 확인:

```bash
npm test
npm run build
```

기대 baseline:

- 184 tests PASS
- build PASS

## Step 3

V0.6.7 reference를 읽는다.

특히:

```text
drawing-studio-v0.6.7-roadmap.md
drawing-studio-v0.6.7-feature-matrix.md
drawing-studio-v0.6.7-static-preview.html
```

## Step 4

V0.6.7만 구현한다.

아직 V0.6.8 filter를 같이 구현하지 않는다.

## Step 5

V0.6.7 완료 후:

- full tests
- build
- `.drawstudio` round-trip
- autosave recovery
- PNG export
- visual comparison
- ZIP integrity
- commit

그 다음에만 V0.6.8로 이동한다.

---

# 19. V0.6.7 첫 구현 순서 권장안

### Checkpoint A — Document Model
- Text
- Balloon
- Panel
- Screen Tone
- Manga Effect
- Material
- clone/history
- unit tests

### Checkpoint B — Rendering
- each layer compositor
- deterministic manga effect
- material transforms/repeat
- navigator/flatten/export

### Checkpoint C — Editing/UI
- ToolBar
- PropertiesPanel
- LayerPanel
- App wiring
- placement + post-placement editing

### Checkpoint D — Persistence
- `.drawstudio`
- material asset
- autosave
- recovery
- corrupt data validation

### Checkpoint E — Final regression
- all tests
- build
- visual comparison
- archive

이후 V0.6.8.

---

# 20. 절대 하지 말아야 할 것

1. **V0.6.9 base를 버리고 V0.6.6부터 새로 시작**
2. 22-byte ZIP을 실제 source라고 가정
3. 누락 버전 전체를 한 번에 구현
4. UI preview를 맞추기 위해 현재 작동하는 persistence command를 disabled로 회귀
5. 기능 없는 버튼을 “완성”으로 표시
6. Correction Layer와 Smart Effect architecture를 하나로 뭉개기
7. non-destructive effect parameter 변경 시 source pixels mutate
8. current project format을 이유 없이 폐기
9. animation 때문에 drawing workspace 구조를 망가뜨리기
10. 테스트/build 없이 완료 선언
11. ZIP 생성 후 무결성 검사 생략
12. 사용자가 초보라는 이유로 제품 구조를 tutorial 수준으로 낮추기

---

# 21. 인수인계 한 문장 요약

> **현재 `drawing-webapp-v0.6.9-base.zip`의 V0.6.6 drawing engine + V0.6.9 persistence foundation을 절대 회귀시키지 않은 상태에서, 남아 있는 roadmap/feature-matrix/static preview/PNG/대화 checkpoint를 source of truth로 사용하여 V0.6.7 → V0.6.8 → V0.6.8.1 → V0.6.8.2 → V0.6.8.3 → V0.6.8.4를 하나씩 복원하고, 이후 V0.6.9의 shortcut/quick access/multi-document/export/performance를 완성한 뒤 V0.7 Animation Core → V0.8 Animation Pro → V0.9 Persistence & Sharing 확장 → V1.0 Public Beta까지 진행한다. 매 단계는 실제 기능 + tests + build + persistence round-trip + visual verification + 정상 ZIP checkpoint가 있어야 완료다.**

---

# 22. 최초 Work/Codex 지시문으로 그대로 사용 가능한 문장

이 문서와 함께 다음처럼 시작하면 된다.

> 이 프로젝트는 Drawing Studio 웹 그림 앱이다. `DRAWING_STUDIO_WORK_CODEX_HANDOFF_2026-09-17.md`를 먼저 전부 읽고, Library의 `/코딩/recovery-work/drawing-webapp-v0.6.9-base.zip`을 유일한 현재 source baseline으로 사용해라. 기존 V0.6.9 persistence foundation을 절대 회귀시키지 말고, 누락된 버전을 V0.6.7부터 한 버전씩 복원한다. 먼저 baseline tests/build를 검증하고 V0.6.7 Text/Manga/Materials만 작업해라. V0.6.8 이상으로 넘어가기 전에 V0.6.7의 실제 동작, `.drawstudio` round-trip, autosave/recovery, export, full tests, production build, visual reference 비교와 ZIP 무결성까지 확인해라. fake control이나 문서상 완료만 만들지 말고 실제 동작하는 기능과 테스트를 기준으로 진행해라.

---

**END OF HANDOFF**
