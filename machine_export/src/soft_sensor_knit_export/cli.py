"""Command-line validation and Knit_Graph adapter for CAD handoff JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .adapter import HandoffError, build_knit_graph, inspect_handoff


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Soft Sensor Studio knit handoff.")
    parser.add_argument("handoff", type=Path, help="JSON exported from the CAD")
    parser.add_argument("--report", type=Path, help="Write the report JSON to this path")
    parser.add_argument(
        "--build-knit-graph",
        action="store_true",
        help="Also instantiate the upstream knit_graphs.Knit_Graph object model",
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
