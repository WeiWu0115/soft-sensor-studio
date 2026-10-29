export const circuitKinds = [
  "battery",
  "sensing-region",
  "trace",
  "electrode",
  "terminal",
  "insulation",
] as const;
export type CircuitKind = (typeof circuitKinds)[number];
export type TextileLayer = "surface" | "integrated" | "inner";
export type Point = { column: number; row: number };
export interface CircuitElement {
  id: string;
  kind: CircuitKind;
  name: string;
  materialId: string;
  channel: string;
  column: number;
  row: number;
  width: number;
  height: number;
  points: Point[];
  fromId?: string;
  toId?: string;
  notes: string;
  textileLayer?: TextileLayer;
  sensorId?: string;
  batteryId?: string;
  knitStructureId?: string;
  sensorTemplateVersion?: number;
}
export interface CircuitDesign {
  version: 1;
  intent: { bodyLocation: string; measurement: string; goal: string };
  elements: CircuitElement[];
  assumptions: string;
  validationNotes: string;
}
export const emptyCircuit = (bodyLocation = "Knee"): CircuitDesign => ({
  version: 1,
  intent: { bodyLocation, measurement: "Joint movement", goal: "" },
  elements: [],
  assumptions:
    "Prototype assembly only. Verify yarn, insulation, attachments, connector strain relief and readout hardware on physical samples.",
  validationNotes:
    "Requires fabrication review, electrical continuity and isolation tests, calibration, repeatability, hysteresis, wear and skin-contact assessment. No clinical performance claims.",
});
export const kindLabel: Record<CircuitKind, string> = {
  battery: "Battery position",
  "sensing-region": "Sensing Region",
  trace: "Conductive Trace",
  electrode: "Electrode / Contact Pad",
  terminal: "Connector Terminal",
  insulation: "Insulation Region",
};
export const circuitColors: Record<CircuitKind, string> = {
  battery: "#526c54",
  "sensing-region": "#b66547",
  trace: "#b58a25",
  electrode: "#467f86",
  terminal: "#766096",
  insulation: "#a6b3c3",
};
