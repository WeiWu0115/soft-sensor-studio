import type { Project } from "../models/project";
import {
  emptyCircuit,
  kindLabel,
  type CircuitElement,
  type CircuitKind,
  type Point,
} from "../models/circuit";
import { findCircuitProfile } from "../data/softCircuitLibrary";
import { grid } from "./geometry";
export function createCircuitElement(
  kind: CircuitKind,
  point: Point,
  materialId = "",
): CircuitElement {
  return {
    id: crypto.randomUUID(),
    kind,
    name: kindLabel[kind],
    materialId,
    channel: "",
    ...point,
    width:
      kind === "trace"
        ? 1
        : kind === "sensing-region"
          ? 12
          : kind === "insulation"
            ? 16
            : 4,
    height: kind === "sensing-region" ? 24 : kind === "insulation" ? 28 : 4,
    points: [],
    notes: "",
  };
}
export function updateCircuitElement(
  p: Project,
  id: string,
  patch: Partial<CircuitElement>,
): Project {
  const circuit = p.circuit ?? emptyCircuit(p.garment.joint);
  return {
    ...p,
    circuit: {
      ...circuit,
      elements: circuit.elements.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    },
  };
}
export function finishTrace(
  p: Project,
  points: Point[],
  materialId = "c-yarn",
): Project {
  if (
    points.length < 2 ||
    points.length > 64 ||
    (p.circuit?.elements.reduce((n, e) => n + e.points.length, 0) ?? 0) +
      points.length >
      2048 ||
    (p.circuit?.elements.length ?? 0) >= 200
  )
    return p;
  const e = createCircuitElement("trace", points[0], materialId);
  e.points = points.map((q) => ({ ...q }));
  const c = p.circuit ?? emptyCircuit(p.garment.joint);
  return { ...p, circuit: { ...c, elements: [...c.elements, e] } };
}
const distance = (p: Point, a: Point, b: Point) => {
  const x = b.column - a.column,
    y = b.row - a.row,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.column - a.column) * x + (p.row - a.row) * y) /
          (x * x + y * y || 1),
      ),
    );
  return Math.hypot(p.column - a.column - t * x, p.row - a.row - t * y);
};
const cross = (a: Point, b: Point, c: Point) =>
  (b.column - a.column) * (c.row - a.row) -
  (b.row - a.row) * (c.column - a.column);
export function segmentDistance(a: Point, b: Point, c: Point, d: Point) {
  if (
    cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0
  )
    return 0;
  return Math.min(
    distance(a, c, d),
    distance(b, c, d),
    distance(c, a, b),
    distance(d, a, b),
  );
}
const segments = (e: CircuitElement) =>
  e.kind === "trace"
    ? e.points.slice(1).map((p, i) => [e.points[i], p] as [Point, Point])
    : [];
const corners = (e: {
  column: number;
  row: number;
  width: number;
  height: number;
}): Point[] => [
  { column: e.column, row: e.row },
  { column: e.column + e.width, row: e.row },
  { column: e.column + e.width, row: e.row + e.height },
  { column: e.column, row: e.row + e.height },
];
const inside = (
  q: Point,
  e: { column: number; row: number; width: number; height: number },
) =>
  q.column >= e.column &&
  q.column <= e.column + e.width &&
  q.row >= e.row &&
  q.row <= e.row + e.height;
const padDistance = (q: Point, e: CircuitElement) =>
  Math.hypot(
    Math.max(e.column - q.column, 0, q.column - e.column - e.width),
    Math.max(e.row - q.row, 0, q.row - e.row - e.height),
  );
export function circuitChecks(p: Project): string[] {
  const es = p.circuit?.elements ?? [],
    out: string[] = [],
    dims = grid(p.garment);
  const nodes = [
    ...es.filter((e) => e.kind !== "trace" && e.kind !== "insulation"),
    ...p.sensors,
  ];
  for (const e of es) {
    if (!e.channel && e.kind !== "insulation")
      out.push(`${e.name}: channel unassigned.`);
    if (
      !findCircuitProfile(e.materialId) &&
      !p.materials.some((m) => m.id === e.materialId)
    )
      out.push(`${e.name}: material unassigned or unavailable.`);
    const qs = e.kind === "trace" ? e.points : corners(e);
    const margin = e.kind === "trace" ? e.width / 2 : 0;
    if (
      qs.some(
        (q) =>
          q.column - margin < 0 ||
          q.row - margin < 0 ||
          q.column + margin > dims.columns ||
          q.row + margin > dims.rows,
      )
    )
      out.push(`${e.name}: extends outside garment / seam boundary.`);
    if (
      e.kind === "terminal" &&
      !es.some(
        (t) => t.kind === "trace" && (t.fromId === e.id || t.toId === e.id),
      )
    )
      out.push(`${e.name}: no explicitly assigned trace connection.`);
    if (e.kind === "trace") {
      if (
        e.points.every(
          (q) => q.column === e.points[0].column && q.row === e.points[0].row,
        )
      )
        out.push(`${e.name}: trace has zero geometric length.`);
      if (
        findCircuitProfile(e.materialId)?.conductive === false ||
        p.materials.find((m) => m.id === e.materialId)?.yarnType ===
          "Nonconductive"
      )
        out.push(`${e.name}: trace uses a nonconductive profile.`);
      if (e.fromId && e.fromId === e.toId)
        out.push(
          `${e.name}: start and end assign the same object; review routing intent.`,
        );
      const ss = segments(e);
      if (
        ss.some(([a, b], i) =>
          ss.some(
            ([c, d], j) => j > i + 1 && segmentDistance(a, b, c, d) <= e.width,
          ),
        )
      )
        out.push(
          `${e.name}: possible self-crossing or touching trace geometry.`,
        );
      for (const [field, q] of [
        ["fromId", e.points[0]],
        ["toId", e.points.at(-1)],
      ] as const) {
        const id = e[field],
          node = nodes.find((n) => n.id === id);
        if (!node || !q)
          out.push(
            `${e.name}: ${field === "fromId" ? "start" : "end"} connection unassigned or missing.`,
          );
        else {
          if (!inside(q, node))
            out.push(
              `${e.name}: assigned endpoint does not geometrically land on ${node.name}.`,
            );
          if (e.channel && node.channel && e.channel !== node.channel)
            out.push(`${e.name}: channel differs from ${node.name}.`);
        }
      }
    }
  }
  for (const s of p.sensors)
    if (!s.channel) out.push(`${s.name}: channel unassigned.`);
  const conductors = es.filter(
    (e) =>
      e.kind !== "insulation" &&
      (findCircuitProfile(e.materialId)?.conductive ?? true),
  );
  for (let i = 0; i < conductors.length; i++)
    for (let j = i + 1; j < conductors.length; j++) {
      const a = conductors[i],
        b = conductors[j];
      let contact = false;
      if (a.kind === "trace" && b.kind === "trace")
        contact = segments(a).some(([u, v]) =>
          segments(b).some(
            ([x, y]) => segmentDistance(u, v, x, y) <= (a.width + b.width) / 2,
          ),
        );
      else if (a.kind === "trace" || b.kind === "trace") {
        const t = a.kind === "trace" ? a : b,
          r = a.kind === "trace" ? b : a;
        const cs = corners(r);
        contact = segments(t).some(
          ([u, v]) =>
            inside(u, r) ||
            inside(v, r) ||
            cs.some(
              (x, k) =>
                segmentDistance(u, v, x, cs[(k + 1) % 4]) <= t.width / 2,
            ),
        );
        const assigned = t.fromId === r.id || t.toId === r.id;
        if (assigned && contact) {
          out.push(
            `${t.name} / ${r.name}: assigned contact overlaps geometrically; verify physical junction and isolation.`,
          );
          continue;
        }
      } else
        contact =
          a.column <= b.column + b.width &&
          a.column + a.width >= b.column &&
          a.row <= b.row + b.height &&
          a.row + a.height >= b.row;
      if (contact)
        out.push(
          `${a.name} / ${b.name}: possible crossing or touching conductive geometry; review isolation and intended connections.`,
        );
    }
  // Include legacy sensing areas in geometric contact review.
  for (const e of conductors)
    for (const s of p.sensors) {
      if (e.kind === "trace") {
        if (e.fromId === s.id || e.toId === s.id) continue;
        const cs = corners(s);
        if (
          segments(e).some(
            ([u, v]) =>
              inside(u, s) ||
              inside(v, s) ||
              cs.some(
                (q, i) =>
                  segmentDistance(u, v, q, cs[(i + 1) % 4]) <= e.width / 2,
              ),
          )
        )
          out.push(
            `${e.name} / ${s.name}: possible unintended contact with sensing area.`,
          );
      } else if (
        corners(e).some((q) => inside(q, s)) ||
        corners(s).some((q) => inside(q, e)) ||
        (e.column <= s.column + s.width &&
          e.column + e.width >= s.column &&
          e.row <= s.row + s.height &&
          e.row + e.height >= s.row)
      )
        out.push(
          `${e.name} / ${s.name}: possible unintended conductive region contact.`,
        );
    }
  return out;
}
export function applyIntentTemplate(p: Project): Project {
  const c = p.circuit ?? emptyCircuit(p.garment.joint);
  if (
    c.elements.length > 194 ||
    c.elements.reduce((n, e) => n + e.points.length, 0) > 2043
  )
    return p;
  const { columns, rows } = grid(p.garment);
  const x = Math.max(4, Math.floor(columns * 0.3)),
    y = Math.max(8, Math.floor(rows * 0.35));
  const sensing = createCircuitElement(
    "sensing-region",
    { column: x, row: y },
    c.intent.measurement === "Joint movement"
      ? "resistive"
      : c.intent.measurement === "Other"
        ? ""
        : "capacitive",
  );
  sensing.name = `${c.intent.measurement} concept`;
  sensing.width = Math.max(2, Math.min(12, Math.floor(columns * 0.15)));
  sensing.height = Math.max(2, Math.min(24, Math.floor(rows * 0.3)));
  const pad = createCircuitElement(
    "electrode",
    { column: x, row: y - 4 },
    "c-fabric",
  );
  const terminal = createCircuitElement(
    "terminal",
    { column: x + 24, row: 8 },
    "connector",
  );
  const trace = createCircuitElement(
    "trace",
    { column: x + 2, row: y - 2 },
    "c-yarn",
  );
  trace.points = [
    { column: x + 2, row: y - 2 },
    { column: x + 26, row: y - 2 },
    { column: x + 26, row: 10 },
  ];
  trace.fromId = pad.id;
  trace.toId = terminal.id;
  const contact = createCircuitElement(
    "trace",
    { column: x + 2, row: y - 2 },
    "c-yarn",
  );
  contact.points = [
    { column: x + 2, row: y - 2 },
    { column: x + 2, row: y + 2 },
  ];
  contact.fromId = pad.id;
  contact.toId = sensing.id;
  const insulation = createCircuitElement(
    "insulation",
    { column: x - 2, row: y - 6 },
    "dielectric",
  );
  for (const e of [sensing, pad, terminal, trace, contact]) e.channel = "CH-01";
  return {
    ...p,
    circuit: {
      ...c,
      elements: [
        ...c.elements,
        insulation,
        sensing,
        pad,
        terminal,
        trace,
        contact,
      ],
    },
  };
}
/** Add a two-terminal textile sensor template with every segment assigned to
 * explicit endpoint objects. This is an editable concept layout, not a
 * validated or electrically simulated circuit. */
export function applyCompleteCircuitTemplate(p: Project): Project {
  const c = p.circuit ?? emptyCircuit(p.garment.joint);
  if (
    c.elements.length > 190 ||
    c.elements.some((element) => element.name === "Readout terminal A") ||
    c.elements.reduce((count, element) => count + element.points.length, 0) > 2038
  ) return p;
  const { columns, rows } = grid(p.garment);
  if (columns < 52 || rows < 40) return p;
  const candidates = Array.from(
    { length: Math.floor((columns - 50) / 4) + 1 },
    (_, index) => 22 + index * 4,
  );
  const x = candidates.find((candidate) =>
    p.sensors.every(
      (sensor) => candidate + 28 < sensor.column || candidate - 22 > sensor.column + sensor.width,
    ),
  ) ?? 22;
  const y = Math.max(8, Math.floor((rows - 36) / 2));
  const sensing = createCircuitElement("sensing-region", { column: x, row: y }, "resistive");
  sensing.name = `${c.intent.measurement} sensing element`;
  sensing.width = 12;
  sensing.height = 24;
  const leftPad = createCircuitElement("electrode", { column: x - 4, row: y + 9 }, "c-fabric");
  leftPad.name = "Sensor contact A";
  leftPad.width = 4;
  leftPad.height = 6;
  const rightPad = createCircuitElement("electrode", { column: x + 12, row: y + 9 }, "c-fabric");
  rightPad.name = "Sensor contact B";
  rightPad.width = 4;
  rightPad.height = 6;
  const leftTerminal = createCircuitElement("terminal", { column: x - 22, row: 6 }, "connector");
  leftTerminal.name = "Readout terminal A";
  const rightTerminal = createCircuitElement("terminal", { column: x + 24, row: 6 }, "connector");
  rightTerminal.name = "Readout terminal B";
  const makeTrace = (name: string, points: Point[], fromId: string, toId: string) => {
    const trace = createCircuitElement("trace", points[0], "c-yarn");
    trace.name = name;
    trace.points = points;
    trace.fromId = fromId;
    trace.toId = toId;
    trace.channel = "CH-01";
    return trace;
  };
  const yMid = y + 12;
  const traces = [
    makeTrace("Contact A → sensor", [{ column: x - 2, row: yMid }, { column: x, row: yMid }], leftPad.id, sensing.id),
    makeTrace("Contact B → sensor", [{ column: x + 14, row: yMid }, { column: x + 12, row: yMid }], rightPad.id, sensing.id),
    makeTrace("Sensor lead A", [{ column: x - 2, row: yMid }, { column: x - 2, row: 8 }, { column: x - 20, row: 8 }], leftPad.id, leftTerminal.id),
    makeTrace("Sensor lead B", [{ column: x + 14, row: yMid }, { column: x + 14, row: 8 }, { column: x + 26, row: 8 }], rightPad.id, rightTerminal.id),
  ];
  for (const element of [sensing, leftPad, rightPad, leftTerminal, rightTerminal, ...traces])
    if (element.kind !== "insulation") element.channel = "CH-01";
  const insulation = createCircuitElement("insulation", { column: x - 8, row: y - 5 }, "dielectric");
  insulation.name = "Sensor isolation zone";
  insulation.width = 28;
  insulation.height = 34;
  return {
    ...p,
    circuit: { ...c, elements: [...c.elements, insulation, sensing, leftPad, rightPad, leftTerminal, rightTerminal, ...traces] },
  };
}
export function designSummary(p: Project) {
  const c = p.circuit ?? emptyCircuit(p.garment.joint);
  return `SOFT SENSOR STUDIO — CO-DESIGN BRIEF\nResearch prototype; not a clinically validated design.\n\nProject: ${p.name}\nBody location: ${c.intent.bodyLocation}\nDesired measurement: ${c.intent.measurement}\nClinical / research goal: ${c.intent.goal || "Not specified"}\nGarment: ${p.garment.joint}; ${p.garment.circumferenceMm} × ${p.garment.lengthMm} mm\nTextile structure: ${p.structure}\nGrid: wale upward, course around circumference, column 0 at seam.\n\nLAYOUT AND MATERIALS\n${p.sensors.map((s) => `${s.name} (legacy sensing region): (${s.column},${s.row}) ${s.width}×${s.height}; ${p.materials.find((m) => m.id === s.materialId)?.name ?? s.materialId}; channel ${s.channel || "unassigned"}`).join("\n")}\n${c.elements.map((e) => `${e.name} [${e.id}] (${e.kind}): ${e.kind === "trace" ? e.points.map((q) => `(${q.column},${q.row})`).join(" → ") : `(${e.column},${e.row}) ${e.width}×${e.height}`}; material ${findCircuitProfile(e.materialId)?.name ?? p.materials.find((m) => m.id === e.materialId)?.name ?? "unassigned"}; channel ${e.channel || "unassigned"}; notes: ${e.notes || "none"}${e.kind === "trace" ? `; explicit start ${e.fromId || "unassigned"}, end ${e.toId || "unassigned"}` : ""}`).join("\n")}\n\nSCHEMATIC GEOMETRY REVIEW\n${circuitChecks(p).join("\n") || "No flagged geometric issues."}\nOverlap, adjacency, endpoint assignments and shared stitches do not establish electrical continuity. No electrical behavior is simulated. Insulation geometry does not prove isolation.\n\nFABRICATION ASSUMPTIONS\n${c.assumptions}\n\nUNRESOLVED VALIDATION\n${c.validationNotes}\nNo Kniterate or fabrication export is included. Template layouts may be incomplete circuits and must be reviewed by fabrication and electronics specialists.`;
}
export function translateElement(
  e: CircuitElement,
  dx: number,
  dy: number,
): CircuitElement {
  const moved = {
    ...e,
    column: e.column + dx,
    row: e.row + dy,
    points: e.points.map((q) => ({ column: q.column + dx, row: q.row + dy })),
  };
  return [moved, ...moved.points].some(
    (q) => Math.abs(q.column) > 100000 || Math.abs(q.row) > 100000,
  )
    ? e
    : moved;
}
export { padDistance };
