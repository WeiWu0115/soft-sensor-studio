import { circuitKinds } from "../models/circuit";
export function validateCircuit(value: unknown, existingIds: Set<string>) {
  const fail = () => {
    throw Error("Invalid soft circuit design.");
  };
  if (!value || typeof value !== "object") return fail();
  const c = value as Record<string, any>;
  const str = (v: unknown, max = 2000) =>
    typeof v === "string" && v.length <= max;
  const integer = (v: unknown, min = -100000) =>
    Number.isSafeInteger(v) &&
    (v as number) >= min &&
    Math.abs(v as number) <= 100000;
  if (
    c.version !== 1 ||
    !c.intent ||
    !["bodyLocation", "measurement", "goal"].every((k) => str(c.intent[k])) ||
    !str(c.assumptions, 10000) ||
    !str(c.validationNotes, 10000) ||
    !Array.isArray(c.elements) ||
    c.elements.length > 200
  )
    fail();
  const ids = new Set(existingIds);
  let totalPoints = 0;
  for (const e of c.elements) {
    if (
      !e ||
      !str(e.id, 100) ||
      !e.id ||
      ids.has(e.id) ||
      !circuitKinds.includes(e.kind) ||
      (e.textileLayer !== undefined && !["surface", "integrated", "inner"].includes(e.textileLayer)) ||
      (e.sensorId !== undefined && (!str(e.sensorId, 100) || !existingIds.has(e.sensorId))) ||
      (e.knitStructureId !== undefined && !str(e.knitStructureId, 100)) ||
      (e.sensorTemplateVersion !== undefined && ![1, 2, 3].includes(e.sensorTemplateVersion)) ||
      !["name", "materialId", "channel", "notes"].every((k) => str(e[k])) ||
      !["column", "row"].every((k) => integer(e[k])) ||
      !["width", "height"].every((k) => integer(e[k], 1)) ||
      !Array.isArray(e.points) ||
      e.points.length > 64
    )
      fail();
    ids.add(e.id);
    totalPoints += e.points.length;
    if (e.kind === "trace" && e.points.length < 2) fail();
    if (e.kind !== "trace" && e.points.length) fail();
    for (const q of e.points)
      if (!q || !integer(q.column) || !integer(q.row)) fail();
    for (const k of ["fromId", "toId"])
      if (e[k] !== undefined && !str(e[k], 100)) fail();
  }
  if (totalPoints > 2048) fail();
}
