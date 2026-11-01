"""Command-line validation and Knit_Graph adapter for CAD handoff JSON."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from .adapter import HandoffError, build_knit_graph, compile_plain_jersey_swatch, inspect_handoff


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Soft Sensor Studio knit handoff.")
    parser.add_argument("handoff", type=Path, help="JSON exported from the CAD")
    parser.add_argument("--report", type=Path, help="Write the report JSON to this path")
    parser.add_argument(
        "--build-knit-graph",
        action="store_true",
        help="Also instantiate the upstream knit_graphs.Knit_Graph object model",
    )
    parser.add_argument(
        "--compile-jersey-swatch",
        type=Path,
        metavar="OUTPUT.k",
        help="Compile a circuit-free knit-only Jersey swatch to KnitScript (.ks) and Knitout (.k); not a garment or DAT file",
    )
    args = parser.parse_args()

    try:
        handoff = json.loads(args.handoff.read_text(encoding="utf-8"))
        report = inspect_handoff(handoff)
        if args.build_knit_graph:
            knit_graph, loops = build_knit_graph(handoff)
            report["upstream_knit_graph"] = {
                "built": True,
                "loop_count": len(loops),
                "stitch_edge_count": sum(1 for _ in knit_graph.stitch_iter),
                "yarn_count": len(knit_graph.yarns),
            }
        if args.compile_jersey_swatch:
            script_path, knitout_path = compile_plain_jersey_swatch(handoff, str(args.compile_jersey_swatch))
            machine_header = None
            gauge_header = None
            for line in knitout_path.read_text(encoding="utf-8", errors="replace").splitlines():
                if line.startswith(";;Machine:"):
                    machine_header = line.partition(":")[2].strip()
                elif line.startswith(";;Gauge:"):
                    match = re.search(r"\d+", line.partition(":")[2])
                    gauge_header = int(match.group()) if match else None
            report["plain_jersey_swatch"] = {
                "compiled": True,
                "knitscript": str(script_path),
                "knitout": str(knitout_path),
                "knitout_machine_header": machine_header,
                "knitout_gauge_header": gauge_header,
                "machine_ready": False,
                "note": "Flat base-fabric swatch only. Sensor/circuit features are omitted. Header values are the compiler configuration, not confirmation of the physical machine.",
            }
    except (OSError, json.JSONDecodeError, HandoffError) as error:
        print(f"handoff error: {error}", file=sys.stderr)
        return 2

    output = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.report:
        args.report.write_text(output, encoding="utf-8")
    print(output, end="")
    return 0 if report["topology_valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
