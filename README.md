# Soft Sensor Studio V2 — Phases 1–3

[Live demo](https://sharkburger.github.io/soft-sensor-studio/) · [Repository](https://github.com/sharkburger/soft-sensor-studio)

A local-first React/TypeScript CAD research prototype for cylindrical knitted sensor sleeves. No backend or account required.

## Run

Requires Node.js 22.12+, 24 LTS, or 26+ (Vitest 5 supports even-numbered Node releases).

```sh
npm install
npm run dev
npm test
npm run build
```

Open the local URL printed by Vite. Production output is in `dist/`.

## Use

1. Choose Knee, Elbow or Wrist. These are starting examples, not clinical recommendations.
2. Set circumference, length, and measured stitch/course gauge. Requested and stitch-rounded achievable sizes are shown separately.
3. Add any number of rectangular sensors; select them from the list or canvas. Drag to move and use the eight handles to resize. All geometry snaps to integer cells. The properties panel edits position, dimensions, material, structure, channel, name and display color.
4. Use V for selection, H for pan, or toolbar buttons. Scroll zooms the pattern. The percentage button resets zoom. Split mode has a draggable divider through the pattern pane's bottom-right resize control.
5. Orbit/zoom the linked 3D sleeve. Select sensors in 3D. Choose camera directions, reset the camera, toggle transparency or seam visibility.
6. Save project downloads editable JSON; Open validates and reloads it. Recent work restores from localStorage. Save to a file for a durable copy. New/reset operations are undoable.
7. Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Cmd/Ctrl+D duplicates; Delete removes; Cmd/Ctrl+S downloads the project.

## Architecture

- `src/models/project.ts`: versioned domain model and illustrative defaults.
- `src/stores/studio.ts`: Zustand source of truth, bounded history, autosave, sensor operations.
- `src/services/geometry.ts`: physical/grid conversion, shared coordinate transforms, snapping, validation.
- `src/services/projectIO.ts`: import validation and lossless JSON persistence.
- `src/components/Editor2D.tsx`: Konva pattern interactions.
- `src/components/Viewer3D.tsx`: Three.js/R3F cylinder, curved sensor meshes, selection, camera.
- `src/components/Properties.tsx`: sensor inspector and numeric editing.
- `src/App.tsx`: shell and garment/material configuration.
- `src/tests/core.test.ts`: geometry, data validation, round trip, editing and history tests.
- `examples/knee-sleeve.json`: importable sample project.

## Coordinate convention

Columns are stitches around the circumference; rows are courses along the length. Column 0 is the seam. Row 0 is the bottom. Counts are `round(requestedMm / cellMm)` and achieved dimensions are `count * cellMm`. Screen `(x,y) = (column * scale, (totalRows-row) * scale)` before viewport translation. Rectangle top uses `row + height`. Cylinder angle is `2π * column / totalColumns`, with seam at +Z and increasing columns toward +X. Cylinder Y is `(row-totalRows/2) * rowHeightMm`; radius uses achieved circumference. Sensors use tessellated cylindrical surfaces at a 1.2 mm offset to avoid z-fighting.

Changing garment dimensions preserves sensor data, including invalid geometry; warnings identify regions outside the new boundaries. Direct edits constrain and round the edited region to the valid grid. Seam-crossing conductive regions are unsupported. Imported invalid boundary geometry is preserved and reported rather than silently rewritten.

## Scope and limitations

Phases 1–3 implemented. JSON persistence belongs to Phase 1. Pixel PNG, CSV, intermediate fabrication grid, fabrication-specific electrode/connectivity validation, verified Kniterate import, and simulation belong to later phases and are not exposed as placeholder controls.

The intended later workflow is CAD → intermediate stitch representation → verified Kniterate Design App import → machine fabrication. Kniterate import requirements have not yet been researched or verified in this phase. No `.kc` or KnitScript is generated. Display colors do not assign carriers or knitting operations. Structure labels do not imply machine support. Default yarn profiles are illustrative and contain no electrical values.

The cylinder is a spatial preview, not a cloth, anatomical fit, electrical or clinical prediction. Regions may overlap with a warning. Transparent surfaces can have normal WebGL sorting artifacts. Large grids are intended for desktop use; zoom/pan is supported. Import files are limited to 5 MB and 500 sensors/materials. There is no machine validation. Actual fabrication requires official import specification review, carrier/operation mapping, swatch gauge measurement, electrode design, electrical calibration and supervised machine trials.

## Verification performed

- `npm install`: completed; final audit reported zero vulnerabilities.
- `npm test`: 10 tests passed.
- `npm run build`: TypeScript and production build passed. Vite reports a large bundle warning from the combined canvas/3D dependencies; code splitting is a future optimization.
- `npm run dev`: started successfully. Browser verified add, numeric move/resize, duplicate, dimension-change warnings, undo, reload/autosave restore, camera switching, and visible curved 3D sensor regions. Browser console error log was empty.
- Pointer drag/resize, orbit gestures and OS file chooser save/open were implemented but not exhaustively automated; data operations and JSON round trip are covered by automated tests.
- PNG/palette and machine compatibility tests are deferred with Phase 4.
- Host Node 25 ran build and tests successfully but Vitest 5 reports its supported-engine warning. Prefer a supported even-numbered Node release listed above.


## GitHub Pages deployment

The pinned GitHub Actions workflow `.github/workflows/deploy.yml` runs tests and builds on Node 24 before deploying `dist/` to Pages. Pushes to `main` redeploy automatically; manual workflow dispatch is also available. The Vite base is `/soft-sensor-studio/`, matching this repository path. Deployment follows the [official Vite GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages). No tokens are embedded in the source or frontend; projects remain in the visitor’s own browser localStorage.
