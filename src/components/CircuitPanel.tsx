import { useState } from "react";
import { useStudio } from "../stores/studio";
import { useCircuitUI } from "../stores/circuitUI";
import {
  circuitKinds,
  kindLabel,
  emptyCircuit,
  circuitColors,
} from "../models/circuit";
import { circuitLibrary } from "../data/softCircuitLibrary";
import {
  applyIntentTemplate,
  finishTrace,
  designSummary,
} from "../services/circuit";
export function CircuitPanel() {
  const { project: p, commit, select, selected } = useStudio(),
    ui = useCircuitUI(),
    c = p.circuit ?? emptyCircuit(p.garment.joint);
  const [category, setCategory] = useState("All"),
    [summary, setSummary] = useState(false);
  const update = (patch: Partial<typeof c>) =>
    commit({ ...p, circuit: { ...c, ...patch } });
  const selectedElement = c.elements.find((element) => element.id === selected);
  const useProfile = (profile: (typeof circuitLibrary)[number]) => {
    if (selectedElement && selectedElement.kind === profile.kind) {
      commit({
        ...p,
        circuit: {
          ...c,
          elements: c.elements.map((element) =>
            element.id === selectedElement.id
              ? { ...element, materialId: profile.id }
              : element,
          ),
        },
      });
      ui.set({ enabled: true, tool: "select", materialId: profile.id, draft: [] });
      return;
    }
    ui.set({
      enabled: true,
      tool: profile.kind ?? "select",
      materialId: profile.id,
      draft: [],
    });
  };
  const download = () => {
    const url = URL.createObjectURL(
        new Blob([designSummary(p)], { type: "text/plain" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "soft-sensor-design-brief.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <section>
        <h3>Sensing intent</h3>
        <p className="hint">
          Co-design a concept, then review it with fabrication and electronics
          specialists.
        </p>
        <label className="field">
          Body location
          <select
            value={c.intent.bodyLocation}
            onChange={(e) =>
              update({ intent: { ...c.intent, bodyLocation: e.target.value } })
            }
          >
            {["Knee", "Elbow", "Wrist", "Other"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Desired measurement
          <select
            value={c.intent.measurement}
            onChange={(e) =>
              update({ intent: { ...c.intent, measurement: e.target.value } })
            }
          >
            {["Joint movement", "Pressure", "Touch", "Other"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Clinical / research goal
          <textarea
            maxLength={2000}
            value={c.intent.goal}
            placeholder="Describe the movement, contact or task to explore"
            onChange={(e) =>
              update({ intent: { ...c.intent, goal: e.target.value } })
            }
          />
        </label>
        <p className="hint">
          Intent labels do not change garment dimensions or predict
          measurements. Use Design to set sleeve dimensions.
        </p>
        <button
          disabled={c.elements.length > 194}
          onClick={() => {
            const next = applyIntentTemplate(p);
            commit(next);
            select(next.circuit?.elements.at(-5)?.id ?? null);
            ui.set({ enabled: true, tool: "select", draft: [] });
          }}
        >
          Add editable concept layout
        </button>
        <p className="hint">
          Adds six labeled objects. This is an incomplete assembly concept, not
          a functional sensor circuit. Pressure/touch use a capacitive
          placeholder; separate plate layers and hardware still need design.
        </p>
      </section>
      <section>
        <h3>Circuit tools</h3>
        <label>
          <input
            type="checkbox"
            checked={ui.enabled}
            onChange={(e) =>
              ui.set({ enabled: e.target.checked, draft: [], tool: "select" })
            }
          />{" "}
          Circuit editing mode
        </label>
        <div className="circuit-tools">
          {(["select", ...circuitKinds] as const).map((k) => (
            <button
              key={k}
              className={ui.tool === k ? "active" : ""}
              onClick={() =>
                ui.set({
                  enabled: true,
                  tool: k,
                  draft: [],
                  materialId: {
                    trace: "c-yarn",
                    electrode: "c-fabric",
                    terminal: "connector",
                    insulation: "dielectric",
                    "sensing-region": "resistive",
                    select: ui.materialId,
                  }[k],
                })
              }
            >
              {k === "select" ? "Select / move" : kindLabel[k]}
            </button>
          ))}
        </div>
        <p className="hint">
          Click the grid to place an object. For traces, click successive
          vertices, then Finish trace. Select to move an object; edit vertices
          in Properties. Escape cancels drawing.
        </p>
        {ui.tool === "trace" && (
          <div className="circuit-tools">
            <button
              disabled={ui.draft.length < 2}
              onClick={() => {
                const next = finishTrace(p, ui.draft, ui.materialId);
                commit(next);
                select(next.circuit?.elements.at(-1)?.id ?? null);
                ui.set({ draft: [], tool: "select" });
              }}
            >
              Finish trace ({ui.draft.length})
            </button>
            <button onClick={() => ui.set({ draft: [] })}>Cancel trace</button>
          </div>
        )}
        <label className="field">
          Drawing material
          <select
            value={ui.materialId}
            onChange={(e) => ui.set({ materialId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {circuitLibrary.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section>
        <h3>Visual layers</h3>
        {Object.entries(ui.layers).map(([key, on]) => (
          <label className="circuit-layer" key={key}>
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                ui.set({ layers: { ...ui.layers, [key]: e.target.checked } })
              }
            />
            {
              (
                {
                  textile: "Textile structure",
                  sensing: "Sensing areas",
                  routing: "Conductive routing",
                  contacts: "Connection points",
                  insulation: "Insulation regions",
                } as Record<string, string>
              )[key]
            }
          </label>
        ))}
        <p className="hint">
          Visibility affects 2D and 3D views, not connection checks.
        </p>
      </section>
      <section>
        <h3>Soft Circuit Library</h3>
        <p className="hint">
          Select a matching circuit object to link a profile directly. With no
          matching object selected, it becomes the default for your next draw.
          Profiles are generic and unmeasured, with no vendor, medical or
          fabrication certification.
        </p>
        <label className="field">
          Library category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["All", ...new Set(circuitLibrary.map((m) => m.category))].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        {circuitLibrary
          .filter((m) => category === "All" || m.category === category)
          .map((m) => (
            <article className="circuit-profile" key={m.id}>
              <strong>{m.name}</strong>
              <p>{m.description}</p>
              <p className="hint">{m.consideration}</p>
              <button
                className={
                  selectedElement && selectedElement.kind === m.kind &&
                  selectedElement.materialId === m.id
                    ? "active"
                    : ""
                }
                aria-pressed={
                  selectedElement && selectedElement.kind === m.kind
                    ? selectedElement.materialId === m.id
                    : ui.materialId === m.id
                }
                onClick={() => useProfile(m)}
              >
                {selectedElement && selectedElement.kind === m.kind
                  ? selectedElement.materialId === m.id
                    ? "Linked to selected object"
                    : "Link to selected object"
                  : ui.materialId === m.id
                    ? "Selected for next draw"
                    : "Use for next draw"}
              </button>
            </article>
          ))}
      </section>
      <section>
        <h3>Circuit objects · {c.elements.length}</h3>
        <p className="hint">
          Legacy sensing areas remain in Design and are available as connection
          targets.
        </p>
        {c.elements.map((e) => (
          <button
            className={"circuit-object " + (selected === e.id ? "active" : "")}
            key={e.id}
            onClick={() => {
              select(e.id);
              ui.set({ enabled: true, tool: "select", draft: [] });
            }}
          >
            <span style={{ color: circuitColors[e.kind] }}>●</span>
            {e.name}
            <small>{kindLabel[e.kind]}</small>
          </button>
        ))}
        {!c.elements.length && (
          <p className="hint">
            No circuit objects yet. Add a concept layout or choose a drawing
            tool.
          </p>
        )}
      </section>
      <section>
        <h3>Design brief</h3>
        <label className="field">
          Fabrication assumptions
          <textarea
            maxLength={10000}
            value={c.assumptions}
            onChange={(e) => update({ assumptions: e.target.value })}
          />
        </label>
        <label className="field">
          Unresolved validation
          <textarea
            maxLength={10000}
            value={c.validationNotes}
            onChange={(e) => update({ validationNotes: e.target.value })}
          />
        </label>
        <button onClick={() => setSummary(!summary)}>
          {summary ? "Hide" : "Show"} design summary
        </button>
        <button onClick={download}>Download design brief</button>
        {summary && <pre className="circuit-summary">{designSummary(p)}</pre>}
        <p className="hint">
          Schematic geometry only. No electrical, physical or clinical
          simulation. No Kniterate / fabrication export.
        </p>
      </section>
    </>
  );
}
