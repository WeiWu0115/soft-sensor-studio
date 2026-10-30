import { knitStructures } from "../data/knitStructures";
import { KnitTexturePreview } from "../components/KnitLibrary/KnitTexturePreview";

const featuredIds = ["jersey", "rib-1x1", "full-milano", "interlock"];
const featured = featuredIds
  .map((id) => knitStructures.find((structure) => structure.id === id))
  .filter((structure) => structure !== undefined);

export default function Home() {
  return (
    <div className="home-shell">
      <header className="home-nav">
        <a className="home-brand" href="./" aria-label="Soft Sensor Studio home">
          <span className="home-brand-mark soft-cad-logo-crop"><img src="./soft-sensor-cad-logo.png" alt="" /></span>
          <span>soft sensor <small>STUDIO</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-current" href="./">Home</a>
          <a href="./studio.html">CAD Studio</a>
          <a href="./research.html">Research</a>
          <a href="#knit-structures">Knit Structures</a>
          <a href="./showcase.html">Pattern Playground</a>
        </nav>
        <a className="nav-cta" href="./studio.html">Open the studio <span>↗</span></a>
      </header>

      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow"><i /> TEXTILE CIRCUIT DESIGN / RESEARCH PROTOTYPE</p>
            <h1>Soft Sensor <em>CAD</em></h1>
            <p className="hero-description">Explore how sensors, conductive yarns, textile layers, and knitted structures can come together in a wearable soft circuit.</p>
            <div className="hero-actions">
              <a className="button-primary" href="./studio.html">Start designing <span>↗</span></a>
              <a className="button-secondary" href="#workflow">See how it works <span>↓</span></a>
            </div>
            <div className="hero-meta"><span>01 — Design the textile</span><span>02 — Place the sensor</span><span>03 — Explore the stitch graph</span></div>
          </div>
          <div className="hero-art">
            <img src="./soft-sensor-cad-template.png" alt="CAD pattern editor alongside a three dimensional knitted sensor garment preview" />
          </div>
        </section>

        <section id="workflow" className="home-workflow">
          <div className="section-heading"><p className="eyebrow">A WORKSPACE FOR CO-DESIGN</p><h2>From textile idea to stitch-level view.</h2></div>
          <div className="workflow-grid">
            <article><span className="step-number">01</span><h3>Shape the textile</h3><p>Choose a knit structure, yarn appearance, garment dimensions, and textile layer stack.</p><a href="./studio.html">Open CAD Studio <span>↗</span></a></article>
            <article><span className="step-number">02</span><h3>Place and route</h3><p>Add sensor concepts, contacts, readout terminals, and conductive paths on the stitch grid.</p><a href="./studio.html">Explore the circuit editor <span>↗</span></a></article>
            <article><span className="step-number">03</span><h3>Inspect the knit graph</h3><p>View loop topology and course-wise stitch ordering to reason about textile construction.</p><a href="./studio.html">View the stitch graph <span>↗</span></a></article>
          </div>
        </section>

        <section className="home-structures" id="knit-structures">
          <div className="structure-section-head">
            <div><p className="eyebrow">KNIT STRUCTURE COLLECTION · 01—26</p><h2>Choose your textile base.</h2><p>Card textures are drawn from each structure’s stitch repeat. Open one to inspect its repeat and apply it in CAD.</p></div>
            <a href="./studio.html?library=all">Browse full library <span>↗</span></a>
          </div>
          <div className="structure-card-grid">
            {featured.map((structure) => (
              <a className={`structure-card structure-card-${structure.id.replace(/[^a-z0-9]+/g, "-")}`} href={`./studio.html?library=${encodeURIComponent(structure.id)}`} key={structure.id}>
                <div className="structure-card-top"><span>KNIT CARD · {structure.catalogSlot}</span><b>{structure.verificationStatus === "verified" ? "IDENTITY VERIFIED" : "CATALOG PENDING"}</b></div>
                <div className="structure-card-art"><KnitTexturePreview structure={structure} columns={15} rows={6} /></div>
                <div className="structure-card-copy">
                  <span className="structure-type">{structure.construction.toUpperCase()} / {structure.category.toUpperCase()}</span>
                  <h3>{structure.name}<small>NO. {structure.catalogSlot}</small></h3>
                  <p>{structure.description}</p>
                  <div className="structure-card-stats"><span>REPEAT <b>{structure.repeat.columns} × {structure.repeat.rows}</b></span><span>STRETCH <b>{structure.stretch}</b></span></div>
                  <span className="structure-card-action">Inspect structure <i>↗</i></span>
                </div>
              </a>
            ))}
          </div>
          <p className="structure-disclaimer">Stitch previews follow the recorded repeat and loop operations. They remain schematics; catalog checks do not validate machine implementation or physical performance.</p>
        </section>

        <section className="home-boundary">
          <div><p className="eyebrow">PROTOTYPE STATUS</p><h2>Designed for exploration.<br />Grounded in what is known.</h2></div>
          <p>Soft Sensor Studio is a research co-design prototype. Its circuit routes and stitch graphs help organize design intent; they do not yet confirm electrical behavior or machine-specific manufacturability. Knitting machine, yarn, and swatch validation are still required.</p>
          <a href="./research.html">Explore the research database <span>↗</span></a>
        </section>
      </main>

      <footer className="home-footer"><a className="home-brand" href="./"><span className="home-brand-mark soft-cad-logo-crop"><img src="./soft-sensor-cad-logo.png" alt="" /></span><span>soft sensor <small>STUDIO</small></span></a><span>Research co-design · Local-first CAD · Textile sensing</span><a href="./studio.html">Enter the studio ↗</a></footer>
    </div>
  );
}
