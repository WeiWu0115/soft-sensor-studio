"""Validate CAD handoffs and map supported topology to Hofmann's Knit_Graph.

Only K/P stitch-loop topology is currently mapped. Conductive yarn routes are
kept as metadata because assigning them to physical machine operations without
carrier, bed, and inlay rules would imply fabrication semantics we do not have.
"""

from __future__ import annotations

from collections import Counter
from typing import Any


HANDOFF_FORMAT = "soft-sensor-studio-knit-handoff-v1"
SUPPORTED_OPERATIONS = {"K", "P"}


class HandoffError(ValueError):
    """Raised when an exported handoff cannot be safely interpreted."""


def _coordinate(loop_id: str) -> tuple[int, int]:
    try:
        prefix, column, row = loop_id.split(":")
        if prefix != "L":
            raise ValueError
        return int(column), int(row)
    except (AttributeError, TypeError, ValueError) as error:
        raise HandoffError(f"Invalid loop id {loop_id!r}; expected L:<column>:<row>.") from error


def inspect_handoff(handoff: dict[str, Any]) -> dict[str, Any]:
    """Return a serializable validation summary without loading Knit_Graph."""
    if handoff.get("format") != HANDOFF_FORMAT:
        raise HandoffError(
            f"Unsupported handoff format {handoff.get('format')!r}; expected {HANDOFF_FORMAT!r}."
        )
    graph = handoff.get("graph")
    if not isinstance(graph, dict):
        raise HandoffError("Handoff is missing its graph object.")

    columns, rows = graph.get("columns"), graph.get("rows")
    if not isinstance(columns, int) or not isinstance(rows, int) or columns < 1 or rows < 1:
        raise HandoffError("Graph columns and rows must be positive integers.")

    loops = graph.get("loops")
    edges = graph.get("edges")
    if not isinstance(loops, list) or not isinstance(edges, list):
        raise HandoffError("Graph loops and edges must be arrays.")

    loop_ids: set[str] = set()
    operations: Counter[str] = Counter()
    for loop in loops:
        if not isinstance(loop, dict):
            raise HandoffError("Each loop must be an object.")
        loop_id = loop.get("id")
        column, row = _coordinate(loop_id)
        if not (0 <= column < columns and 0 <= row < rows):
            raise HandoffError(f"Loop {loop_id} is outside the {columns}×{rows} grid.")
        if loop_id in loop_ids:
            raise HandoffError(f"Duplicate loop id {loop_id}.")
        loop_ids.add(loop_id)
        operation = loop.get("stitch")
        if not isinstance(operation, str) or not operation:
            raise HandoffError(f"Loop {loop_id} has no stitch operation.")
        operations[operation] += 1

    expected_count = columns * rows
    if len(loops) != expected_count:
        raise HandoffError(f"Grid declares {expected_count} loops but handoff contains {len(loops)}.")

    stitch_edges = []
    for edge in edges:
        if not isinstance(edge, dict):
            raise HandoffError("Each edge must be an object.")
        if edge.get("kind") != "stitch":
            continue
        parent, child = edge.get("from"), edge.get("to")
        if parent not in loop_ids or child not in loop_ids:
            raise HandoffError(f"Stitch edge {edge.get('id', '<unnamed>')} refers to a missing loop.")
        stitch_edges.append((parent, child))

    unsupported = sorted(set(operations) - SUPPORTED_OPERATIONS)
    course_plan = handoff.get("coursePlan")
    route_count = len(graph.get("conductivePaths") or [])
    sensors = (handoff.get("project") or {}).get("sensors") or []
    blockers = []
    if unsupported:
        blockers.append("Unsupported stitch operations: " + ", ".join(unsupported))
    if route_count:
        blockers.append("Conductive routes are design intent; yarn inlay/carrier operations are not compiled.")
    if not course_plan:
        blockers.append("No course plan is present to define yarn order.")

    expected_stitch_edges = {
        (f"L:{column}:{row - 1}", f"L:{column}:{row}")
        for row in range(1, rows)
        for column in range(columns)
    }
    topology_valid = (
        len(stitch_edges) == len(expected_stitch_edges)
        and set(stitch_edges) == expected_stitch_edges
    )
    if not topology_valid:
        blockers.append("Loop-to-loop stitch edges do not match the rectangular wale topology.")

    return {
        "format": HANDOFF_FORMAT,
        "topology_valid": topology_valid,
        "machine_ready": False,
        "grid": {"columns": columns, "rows": rows},
        "loop_count": len(loops),
        "stitch_edge_count": len(stitch_edges),
        "stitch_operations": dict(sorted(operations.items())),
        "unsupported_operations": unsupported,
        "operations_supported_by_adapter": not unsupported,
        "sensor_count": len(sensors),
        "conductive_path_count": route_count,
        "course_count": len(course_plan) if isinstance(course_plan, list) else 0,
        "structure": graph.get("structure"),
        "blockers": blockers,
        "next_stage": "Add explicit machine/course semantics, compile supported structures to KnitScript/Knitout, then validate the selected SWG model.",
    }


def build_knit_graph(handoff: dict[str, Any]):
    """Construct an upstream ``knit_graphs.Knit_Graph`` for K/P topology.

    Returns the Knit_Graph and a coordinate-to-Loop mapping. The installed
    upstream package is imported lazily so validation can run without it.
    """
    report = inspect_handoff(handoff)
    if report["unsupported_operations"]:
        raise HandoffError(
            "Cannot map operations to Knit_Graph yet: "
            + ", ".join(report["unsupported_operations"])
        )
    if not report["topology_valid"]:
        raise HandoffError("Loop topology failed validation; no Knit_Graph was created.")
    if not handoff.get("coursePlan"):
        raise HandoffError("A course plan is required to define base-yarn sequence.")

    try:
        from knit_graphs.Knit_Graph import Knit_Graph
        from knit_graphs.Loop import Loop
        from knit_graphs.Pull_Direction import Pull_Direction
        from knit_graphs.Yarn import Yarn, Yarn_Properties
    except ImportError as error:
        raise HandoffError(
            "Missing dependency 'knit-graphs'. Install machine_export with pip install -e ./machine_export."
        ) from error

    raw_graph = handoff["graph"]
    knit_graph = Knit_Graph()
    base_yarn = Yarn(
        knit_graph,
        Yarn_Properties(name=f"base:{raw_graph.get('structure', 'unknown')}", color="natural"),
    )
    loop_by_id: dict[str, Any] = {}
    record_by_id = {loop["id"]: loop for loop in raw_graph["loops"]}

    if not isinstance(handoff["coursePlan"], list) or len(handoff["coursePlan"]) != raw_graph["rows"]:
        raise HandoffError("Course plan must contain exactly one pass for each graph row.")
    seen_rows: set[int] = set()
    sequence_id = 0
    for course in handoff["coursePlan"]:
        row = course.get("row")
        operations = course.get("operations")
        if not isinstance(row, int) or not 0 <= row < raw_graph["rows"] or not isinstance(operations, list):
            raise HandoffError("Malformed course plan entry.")
        if row in seen_rows:
            raise HandoffError(f"Course {row} occurs more than once.")
        seen_rows.add(row)
        expected_columns = list(range(raw_graph["columns"]))
        if course.get("direction") == "left":
            expected_columns.reverse()
        elif course.get("direction") != "right":
            raise HandoffError(f"Course {row} has an unsupported direction.")
        if any(not isinstance(item, dict) for item in operations):
            raise HandoffError(f"Course {row} contains a malformed operation.")
        if [item.get("column") for item in operations] != expected_columns:
            raise HandoffError(f"Course {row} is not a complete ordered pass across all columns.")
        for operation in operations:
            column = operation["column"]
            source_loop_id = f"L:{column}:{row}"
            loop_record = record_by_id.get(source_loop_id)
            if loop_record is None or loop_record["stitch"] != operation.get("stitch"):
                raise HandoffError(f"Course plan does not match graph loop {source_loop_id}.")
            if source_loop_id in loop_by_id:
                raise HandoffError(f"Course plan visits loop {source_loop_id} more than once.")
            loop = Loop(base_yarn, loop_id=sequence_id)
            base_yarn.add_loop_to_end(loop)
            loop_by_id[source_loop_id] = loop
            sequence_id += 1

    if len(loop_by_id) != len(raw_graph["loops"]):
        raise HandoffError("Course plan does not visit every graph loop exactly once.")
    if len(seen_rows) != raw_graph["rows"]:
        raise HandoffError("Course plan is missing one or more graph rows.")

    direction_by_operation = {
        "K": Pull_Direction.BtF,
        "P": Pull_Direction.FtB,
    }
    for parent_id, child_id in (
        (edge["from"], edge["to"])
        for edge in raw_graph["edges"]
        if edge.get("kind") == "stitch"
    ):
        stitch = record_by_id[child_id]["stitch"]
        knit_graph.connect_loops(loop_by_id[parent_id], loop_by_id[child_id], direction_by_operation[stitch])

    return knit_graph, loop_by_id
