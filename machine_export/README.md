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

The CLI exits non-zero if the handoff is invalid or contains stitch operations that are not yet mapped. The first supported machine-independent mapping is knit (`K`) and purl (`P`) loop topology. Tuck, miss, transfer, cable, and lace operations need explicit Knit_Graph and machine semantics before they can be accepted.

## Current boundary

This is a topology adapter and validation report, not a machine compiler. Conductive routes and sensor regions are retained as design intent; they are not yet compiled into separate inlay/plating operations, carriers, beds, or needle actions. Course starts/ends, cast-on, bind-off, shaping, gauge, yarn tension, and SWG model compatibility remain unresolved. A report marked `topology_valid: true` does **not** mean the design is electrically continuous, physically manufacturable, or ready to load on an SWG.

The CAD's current course plan orders each course in alternating directions. The adapter uses that as the base-yarn order and uses the exported stitch edges as wale links. This assumption is explicit so it can be replaced when the graph schema carries a validated machine/course model.
