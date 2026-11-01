# Python knit-graph adapter (phase 1)

This folder is the first executable step in the CAD → Python → KnitScript → Knitout → Shima Seiki DAT workflow.

It accepts `soft-sensor-studio-knit-handoff-v1` JSON downloaded from the CAD and maps the base fabric loops and stitch links into the public [`knit_graphs`](https://github.com/mhofmann-Khoury/knit_graph) object model. It also reports operation symbols, sensors, conductive route coverage, and blockers.

## Run

Use Python 3.11–3.13, then install the adapter and its upstream dependency:

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -e ./machine_export
python -m soft_sensor_knit_export design-shima-swg-handoff.json --report handoff-report.json
```

To compile a **circuit-free, knit-only Jersey swatch** through KnitScript into Knitout, install the optional compiler and request the explicit swatch target:

```sh
python -m pip install -e './machine_export[knit-script]'
python -m soft_sensor_knit_export plain-jersey-handoff.json \
  --compile-jersey-swatch out/plain-jersey.k \
  --report out/plain-jersey-report.json
```

This writes `plain-jersey.ks` and `plain-jersey.k`. It intentionally refuses projects containing sensors, circuit geometry, conductive routes, or anything other than knit-only base Jersey. The result is a flat base-fabric swatch, not the CAD garment or its sensors.

## Experimental DAT conversion

The `.k` produced by KnitScript has a machine/gauge header. The public DAT converter is pre-alpha and is currently incompatible with the newest Knitout/virtual-machine packages. Keep DAT conversion in a **separate** Python environment with this known-compatible dependency set:

```sh
python -m venv .venv-dat
. .venv-dat/bin/activate
python -m pip install knitout-to-dat-python==0.0.4 knitout-interpreter==0.1.2 virtual-knitting-machine==0.0.22 knit-graphs==0.0.11
python machine_export/tools/convert_swg_dat.py out/plain-jersey.k out/plain-jersey.dat \
  --expected-machine SWG091N2 --expected-gauge 15
```

The expected machine and gauge are mandatory and must match the Knitout header. `SWG091N2 / 15` are only the upstream KnitScript default observed during compilation; confirm that they match your actual machine before conversion. The DAT is experimental and has not been loaded on a physical Shima Seiki machine. Do not treat successful file conversion as machine validation.

The CLI exits non-zero if the handoff is invalid or contains stitch operations that are not yet mapped. The first supported machine-independent mapping is knit (`K`) and purl (`P`) loop topology. Tuck, miss, transfer, cable, and lace operations need explicit Knit_Graph and machine semantics before they can be accepted.

## Current boundary

The optional Jersey path uses KnitScript to create Knitout (`.k`) for a flat base-yarn swatch. The separate, version-pinned converter script can create an experimental `.dat`, but that has not been machine-validated. This does not compile the CAD garment. Conductive routes and sensor regions are retained as design intent; they are not yet compiled into separate inlay/plating operations, carriers, beds, or needle actions. Shaping, tube construction, finishing, gauge, yarn tension, and SWG model compatibility remain unresolved. A report marked `topology_valid: true` does **not** mean the design is electrically continuous, physically manufacturable, or ready to load on an SWG.

The CAD's current course plan orders each course in alternating directions. The adapter uses that as the base-yarn order and uses the exported stitch edges as wale links. This assumption is explicit so it can be replaced when the graph schema carries a validated machine/course model.
