import React, { useState, useMemo, useRef, useEffect } from "react";
import "./brassBook.css";
import {
  BRASS_STATS,
  ALLOY_PRESETS,
  METAL_COMPARISONS,
  SEVEN_CRAFT_STEPS,
  VASTU_SACRED_GUIDE,
  AUTHENTICITY_TESTS,
  CARE_METHODS,
  GLOSSARY_TERMS
} from "./brassBookData";

const BRAND_LOGO = "/assets/brand/decorbeats-logo.svg";
const MEGHA_WHATSAPP = "919811133661";

export default function TheBrassBook({ onBackToStore }) {
  // Navigation & Chapter anchors
  const [activeSection, setActiveSection] = useState("hero");

  // Chapter 1: Alloy Interactive State
  const [copperRatio, setCopperRatio] = useState(70);
  const activeAlloyPreset = useMemo(() => {
    if (copperRatio <= 64) return ALLOY_PRESETS[0];
    if (copperRatio >= 80) return ALLOY_PRESETS[2];
    return ALLOY_PRESETS[1];
  }, [copperRatio]);

  // Chapter 2: Craft Steps State
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = SEVEN_CRAFT_STEPS[activeStepIndex];

  // Chapter 4: Authenticity Inspector State
  const [activeTestTab, setActiveTestTab] = useState("magnet");
  const [magnetTested, setMagnetTested] = useState(false);
  const [soundTested, setSoundTested] = useState(false);

  // Chapter 5: Care Methods State
  const [activeCareId, setActiveCareId] = useState("pitambari");
  const activeCare = useMemo(
    () => CARE_METHODS.find((c) => c.id === activeCareId) || CARE_METHODS[0],
    [activeCareId]
  );

  // Chapter 6: Glossary State
  const [glossarySearch, setGlossarySearch] = useState("");
  const [selectedGlossaryCategory, setSelectedGlossaryCategory] = useState("All");

  // Web Audio Context for Authentic 432Hz Brass Bell Chime
  const [isChiming, setIsChiming] = useState(false);
  const audioCtxRef = useRef(null);

  function playBrassBellChime(pitchMultiplier = 1.0, isReal = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      setIsChiming(true);

      if (!isReal) {
        // Fake pot metal dull thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        setTimeout(() => setIsChiming(false), 200);
        return;
      }

      // Real Brass: Sacred D5 resonant fundamental (587.33 Hz) + golden overtones
      const fundamental = 587.33 * pitchMultiplier;
      const partials = [
        { freq: fundamental, gain: 0.5, decay: 4.5 },
        { freq: fundamental * 1.51, gain: 0.35, decay: 3.8 },
        { freq: fundamental * 2.76, gain: 0.22, decay: 2.9 },
        { freq: fundamental * 3.42, gain: 0.15, decay: 2.2 },
        { freq: fundamental * 5.38, gain: 0.08, decay: 1.5 },
        { freq: fundamental * 0.5, gain: 0.25, decay: 4.8 } // deep warm foundation
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(gain, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });

      setTimeout(() => setIsChiming(false), 4500);
    } catch (err) {
      console.info("Web Audio play error:", err);
      setIsChiming(false);
    }
  }

  // Smooth scroll handler for chapter jump
  function scrollToSection(id) {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const topOffset = 84;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  }

  // Handle back to store navigation
  function handleBack() {
    if (onBackToStore) {
      onBackToStore();
    } else {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new Event("decorbeats:navigate"));
    }
  }

  // WhatsApp concierge share generator
  function openWhatsAppConcierge(topic = "general") {
    let text = "Hi Megha! I was reading *The Brass Book* on Decorbeats and would love your guidance on genuine handcrafted brass.";
    if (topic === "care") {
      text = "Hi Megha! I checked the *Brass Care Protocol* in The Brass Book. Could you help me with tips for cleaning my brass pooja deepams?";
    } else if (topic === "authenticity") {
      text = "Hi Megha! I learned about the *Zero-Magnet & Acoustic Ping tests* in The Brass Book. I want to order verified solid brass from Decorbeats.";
    } else if (topic === "vastu") {
      text = "Hi Megha! I'm looking for a solid brass entrance urli as guided in *The Brass Book* for Vastu prosperity.";
    }
    const url = `https://wa.me/${MEGHA_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Share Brass Book URL
  const [copiedLink, setCopiedLink] = useState(false);
  function handleShareLink() {
    const shareUrl = "https://www.decorbeats.com/brass-book";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2800);
      });
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2800);
    }
  }

  // Filtered glossary
  const glossaryCategories = ["All", "Metallurgy", "Crafting Process", "Pooja Heritage", "Ayurveda & Science", "Care & Cleaning", "Living Decor"];
  const filteredGlossary = useMemo(() => {
    return GLOSSARY_TERMS.filter((item) => {
      const matchesCategory =
        selectedGlossaryCategory === "All" ||
        item.category.toLowerCase().includes(selectedGlossaryCategory.toLowerCase());
      const query = glossarySearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.term.toLowerCase().includes(query) ||
        item.definition.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [glossarySearch, selectedGlossaryCategory]);

  return (
    <div className="brass-book-root">
      {/* Top Sticky Navigation */}
      <header className="bb-nav">
        <div className="bb-container bb-nav-inner">
          <button type="button" className="bb-nav-brand" onClick={handleBack} title="Return to Decorbeats Storefront">
            <img src={BRAND_LOGO} alt="Decorbeats" className="bb-nav-logo" />
            <div className="bb-brand-text">
              <span className="bb-brand-name">Decorbeats</span>
              <span className="bb-brand-tag">The Brass Book 📖</span>
            </div>
          </button>

          <nav className="bb-nav-links" aria-label="Brass Book Chapters">
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("alchemy")}>
              01 The Alchemy
            </button>
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("craft")}>
              02 7 Craft Steps
            </button>
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("vastu")}>
              03 Sacred & Vastu
            </button>
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("authenticity")}>
              04 Real vs Fake
            </button>
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("care")}>
              05 Care Protocol
            </button>
            <button type="button" className="bb-nav-link" onClick={() => scrollToSection("glossary")}>
              06 Glossary
            </button>
          </nav>

          <div className="bb-nav-actions">
            <button type="button" className="bb-btn-ghost" onClick={handleBack}>
              ← Back to Shop
            </button>
            <button type="button" className="bb-btn-primary" onClick={() => openWhatsAppConcierge("general")}>
              <span>WhatsApp Megha</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="bb-hero" id="hero">
        <div className="bb-container">
          <div className="bb-hero-badge">
            <span>✦ Decorbeats Atelier · Living Metal Encyclopedia ✦</span>
          </div>

          <h1>
            The Brass Book: <br />
            <span className="gold-glow">The Living Soul of Indian Metalcraft</span>
          </h1>

          <p className="bb-hero-lead">
            The definitive interactive encyclopedia of authentic Indian brass. From 950°C Moradabad crucible smelting
            to the sacred acoustics of 432Hz temple bells and the science of heirloom preservation.
          </p>

          <div className="bb-hero-actions">
            <button
              type="button"
              className="bb-sound-trigger"
              onClick={() => playBrassBellChime(1.0, true)}
              title="Click to hear the acoustic resonance of authentic cast brass"
            >
              <span className="bb-bell-icon">🔔</span>
              <span>{isChiming ? "Resonating in 432 Hz..." : "Sound the Sacred Brass Bell (432 Hz Ping)"}</span>
            </button>

            <button type="button" className="bb-btn-ghost" onClick={() => scrollToSection("alchemy")}>
              Explore the Chapters ↓
            </button>
          </div>

          {/* Key Facts Bar */}
          <div className="bb-stats-grid">
            {BRASS_STATS.map((stat, i) => (
              <div key={i} className="bb-stat-card">
                <div className="bb-stat-value">{stat.value}</div>
                <div className="bb-stat-label">{stat.label}</div>
                <div className="bb-stat-note">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAPTER 1: The Alchemy & Metallurgy */}
      <section className="bb-section" id="alchemy">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 01 · Metallurgy</span>
            <h2 className="bb-section-title">The Alchemy of Peetal (पीतल)</h2>
            <p className="bb-section-desc">
              Brass is neither a simple mined ore nor a generic metal. It is a divine alloy synthesized by fusing pure
              Copper (<em>Tamra</em>) and refined Zinc (<em>Jasad</em>). Drag the slider below to witness how the alloy
              transforms in color, tensile strength, and acoustic resonance.
            </p>
          </div>

          <div className="bb-alloy-box">
            <div className="bb-alloy-visual">
              <div
                className="bb-crucible-sphere"
                style={{
                  background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${activeAlloyPreset.color} 50%, #5c3809 100%)`,
                  boxShadow: `0 0 60px ${activeAlloyPreset.glow}`
                }}
              >
                <div className="bb-crucible-inner-text">
                  {copperRatio}% Cu : {100 - copperRatio}% Zn
                </div>
              </div>
              <small style={{ color: "var(--bb-muted)", fontSize: "0.8rem" }}>
                Molten Crucible Representation @ 950°C
              </small>
            </div>

            <div className="bb-alloy-controls">
              <div className="bb-slider-container">
                <div className="bb-slider-labels">
                  <span>60% Copper (Muntz / Tensile)</span>
                  <span><strong>{copperRatio}% Cu</strong> ({100 - copperRatio}% Zn)</span>
                  <span>90% Copper (Red Tombac)</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="88"
                  value={copperRatio}
                  onChange={(e) => setCopperRatio(Number(e.target.value))}
                  className="bb-range-slider"
                  aria-label="Copper to Zinc Ratio Slider"
                />
              </div>

              <div className="bb-preset-chips">
                {ALLOY_PRESETS.map((preset) => (
                  <button
                    key={preset.copper}
                    type="button"
                    className={copperRatio === preset.copper ? "bb-preset-chip active" : "bb-preset-chip"}
                    onClick={() => setCopperRatio(preset.copper)}
                  >
                    {preset.name.split("(")[0]} ({preset.copper}:{preset.zinc})
                  </button>
                ))}
              </div>

              <div className="bb-alloy-details-card">
                <h4>{activeAlloyPreset.name}</h4>
                <p style={{ color: "var(--bb-muted)", fontSize: "0.9rem", margin: "0 0 0.75rem" }}>
                  {activeAlloyPreset.description}
                </p>

                <div className="bb-alloy-prop-grid">
                  <div>
                    <span className="bb-alloy-prop-label">Tensile Character</span>
                    <div className="bb-alloy-prop-val">{activeAlloyPreset.strength}</div>
                  </div>
                  <div>
                    <span className="bb-alloy-prop-label">Acoustic Tone</span>
                    <div className="bb-alloy-prop-val">{activeAlloyPreset.resonance}</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span className="bb-alloy-prop-label">Decorbeats Application</span>
                    <div className="bb-alloy-prop-val" style={{ color: "var(--bb-gold-light)" }}>
                      {activeAlloyPreset.bestFor}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metals Comparison Matrix */}
          <div className="bb-table-wrapper">
            <table className="bb-table">
              <thead>
                <tr>
                  <th>Metal Specification</th>
                  <th>Chemical Formula</th>
                  <th>Visual Hue</th>
                  <th>Density & Hand Feel</th>
                  <th>Acoustic Ping</th>
                  <th>Rust / Degradation</th>
                  <th>Heirloom Lifespan</th>
                </tr>
              </thead>
              <tbody>
                {METAL_COMPARISONS.map((m, i) => (
                  <tr key={i} className={i === 0 ? "highlight-row" : ""}>
                    <td>
                      <strong>{m.name}</strong>
                      {i === 0 && <span className="bb-badge-gold">Decorbeats Grade</span>}
                    </td>
                    <td>{m.alloy}</td>
                    <td>{m.color}</td>
                    <td>{m.density}</td>
                    <td>{m.resonance}</td>
                    <td>{m.rustResistance}</td>
                    <td>{m.lifespan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CHAPTER 2: The 7 Sacred Craft Steps */}
      <section className="bb-section" id="craft">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 02 · The Artisan Journey</span>
            <h2 className="bb-section-title">The 7 Sacred Steps of Moradabad Metalcraft</h2>
            <p className="bb-section-desc">
              Every authentic solid brass piece from Decorbeats undergoes an unbroken 4,000-year Vedic lost-wax journey.
              Select any step below to reveal the specialized craft techniques, tool names, and generational mastery.
            </p>
          </div>

          {/* Step Navigator */}
          <div className="bb-step-nav" role="tablist">
            {SEVEN_CRAFT_STEPS.map((s, index) => (
              <button
                key={s.step}
                type="button"
                className={activeStepIndex === index ? "bb-step-tab active" : "bb-step-tab"}
                onClick={() => setActiveStepIndex(index)}
                role="tab"
                aria-selected={activeStepIndex === index}
              >
                <span>{s.icon}</span>
                <span>Step 0{s.step}: {s.title.split("(")[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Step Showcase */}
          <div className="bb-step-card-active">
            <div>
              <div className="bb-step-number-badge">Stage {activeStep.step} of 07</div>
              <div className="bb-step-hindi-title">{activeStep.hindiTitle}</div>
              <h3 className="bb-step-title">{activeStep.title}</h3>
              <p className="bb-step-summary">{activeStep.summary}</p>
              <p className="bb-step-details">{activeStep.details}</p>

              <div className="bb-step-meta-chips">
                <div className="bb-meta-chip">
                  <span className="bb-meta-chip-label">Master Artisan</span>
                  <span className="bb-meta-chip-val">{activeStep.artisanRole}</span>
                </div>
                <div className="bb-meta-chip">
                  <span className="bb-meta-chip-label">Working Temperature</span>
                  <span className="bb-meta-chip-val">{activeStep.temperature}</span>
                </div>
                <div className="bb-meta-chip">
                  <span className="bb-meta-chip-label">Time Required</span>
                  <span className="bb-meta-chip-val">{activeStep.duration}</span>
                </div>
              </div>
            </div>

            <div className="bb-step-visual-pane">
              <img
                src="/assets/images/decorbeats-atelier-campaign-v2.jpg"
                alt={activeStep.title}
                loading="lazy"
              />
              <div className="bb-step-visual-overlay">
                <span className="bb-step-visual-caption">
                  Decorbeats Atelier · Handcrafting in Moradabad
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 3: Sacred & Vastu Energy */}
      <section className="bb-section" id="vastu">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 03 · Energy & Ayurveda</span>
            <h2 className="bb-section-title">Sacred Resonance, Vastu Shastra & Living Harmony</h2>
            <p className="bb-section-desc">
              In Indian tradition, brass is not just an aesthetic metal; it is a bio-energetic conductor. Here is why
              our ancestors strictly prescribed pure cast brass for mandir sanctums, festive entries, and ritual sound.
            </p>
          </div>

          <div className="bb-vastu-grid">
            {VASTU_SACRED_GUIDE.map((item, i) => (
              <div key={i} className="bb-vastu-card">
                <span className="bb-vastu-placement">{item.placement}</span>
                <h4>{item.title}</h4>
                <div className="bb-vastu-mantra">{item.mantra}</div>
                <p className="bb-vastu-significance">{item.significance}</p>
                <div className="bb-vastu-tip">
                  <strong>Vastu Pro-Tip:</strong> {item.proTip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAPTER 4: The Authenticity Inspector (Interactive Lab) */}
      <section className="bb-section" id="authenticity">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 04 · Authenticity Lab</span>
            <h2 className="bb-section-title">The 4-Point Brass Authenticity Inspector</h2>
            <p className="bb-section-desc">
              Cheap street markets and online portals often disguise iron or scrap pot metal with a 2-micron yellow
              coating. Here is the exact test protocol Megha uses to verify 100% solid, heirloom-grade brass.
            </p>
          </div>

          <div className="bb-authenticity-deck">
            {AUTHENTICITY_TESTS.map((test) => (
              <div key={test.id} className="bb-test-card">
                <div className="bb-test-header">
                  <span className="bb-test-difficulty">{test.difficulty}</span>
                  <span style={{ fontSize: "1.2rem" }}>
                    {test.id === "magnet" ? "🧲" : test.id === "sound" ? "🔔" : test.id === "weight" ? "⚖️" : "🔍"}
                  </span>
                </div>

                <h4>{test.name}</h4>
                <div className="bb-test-tool">
                  <strong>Required Tool:</strong> {test.tool}
                </div>

                <div className="bb-test-compare">
                  <div className="bb-test-block real">
                    <strong>✓ Solid Brass (Decorbeats)</strong>
                    {test.realBehavior}
                  </div>
                  <div className="bb-test-block fake">
                    <strong>✗ Fake Plated Pot Metal / Iron</strong>
                    {test.fakeBehavior}
                  </div>
                </div>

                {/* Interactive Simulated Testing */}
                {test.id === "magnet" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <button
                      type="button"
                      className="bb-btn-ghost"
                      style={{ width: "100%", borderColor: magnetTested ? "#7ce499" : "var(--bb-gold)" }}
                      onClick={() => setMagnetTested(!magnetTested)}
                    >
                      {magnetTested
                        ? "🧲 Test Passed: Magnet Slides Off (100% Non-Ferrous Solid Brass!)"
                        : "🧲 Tap to Test Magnet On Solid Brass"}
                    </button>
                  </div>
                )}

                {test.id === "sound" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                    <button
                      type="button"
                      className="bb-btn-ghost"
                      style={{ flex: 1, borderColor: "#7ce499" }}
                      onClick={() => playBrassBellChime(1.0, true)}
                    >
                      🔔 Hear Real Brass Chime
                    </button>
                    <button
                      type="button"
                      className="bb-btn-ghost"
                      style={{ flex: 1, borderColor: "#ff8585" }}
                      onClick={() => playBrassBellChime(1.0, false)}
                    >
                      🪵 Hear Fake Metal Thud
                    </button>
                  </div>
                )}

                <div className="bb-test-why">
                  <strong>Why it matters:</strong> {test.whyItMatters}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAPTER 5: Care & Restoration Protocol */}
      <section className="bb-section" id="care">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 05 · Longevity</span>
            <h2 className="bb-section-title">The Master Care & Restoration Protocol</h2>
            <p className="bb-section-desc">
              Solid brass never rusts or degrades. Whether you desire blinding 22K mirror luster for festive celebrations
              or a distinguished temple patina, here is the master care recipe passed down through generations.
            </p>
          </div>

          <div className="bb-care-selector">
            {CARE_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={activeCareId === m.id ? "bb-care-tab active" : "bb-care-tab"}
                onClick={() => setActiveCareId(m.id)}
              >
                {m.title.split(":")[0]} ({m.speed})
              </button>
            ))}
          </div>

          <div className="bb-care-panel">
            <h3>{activeCare.title}</h3>
            <div className="bb-care-meta">
              <span>Goal: {activeCare.type}</span>
              <span>Speed: {activeCare.speed}</span>
            </div>

            <div className="bb-care-ingredients">
              <strong>Ingredients:</strong> {activeCare.ingredients}
            </div>

            <div className="bb-care-steps-list">
              {activeCare.steps.map((st, idx) => (
                <div key={idx} className="bb-care-step-item">
                  <div className="bb-care-step-num">{idx + 1}</div>
                  <div>{st}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--bb-gold-light)", borderTop: "1px solid var(--bb-border-subtle)", paddingTop: "1rem" }}>
              <strong>Best Applied To:</strong> {activeCare.idealFor}
            </div>
          </div>

          {/* The 4 Cardinal Rules */}
          <div className="bb-cardinal-rules">
            <h4>⚠️ The 4 Cardinal Rules of Brass Preservation</h4>
            <div className="bb-rules-grid">
              <div className="bb-rule-item">
                <strong>1. Never in the Dishwasher</strong>
                Harsh alkaline detergents and high steam temperatures strip natural protective lacquer and cause permanent chemical pitting.
              </div>
              <div className="bb-rule-item">
                <strong>2. Dry Immediately</strong>
                Never let brass air-dry wet. Residual chlorine and mineral deposits from tap water will form cloudy water spots.
              </div>
              <div className="bb-rule-item">
                <strong>3. No Steel Wool or Wire Brushes</strong>
                Abrasive scouring pads cut deep micro-scratches into the golden surface. Always use unbleached cotton or soft sponges.
              </div>
              <div className="bb-rule-item">
                <strong>4. Acidic Foods Require Kalai</strong>
                Never store pickles, citrus juices, or yogurt in unlined brass for prolonged hours without traditional tin-lining (Kalai).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 6: Encyclopedia Glossary (A–Z) */}
      <section className="bb-section" id="glossary">
        <div className="bb-container">
          <div className="bb-section-head">
            <span className="bb-eyebrow">Chapter 06 · Lexicon</span>
            <h2 className="bb-section-title">The Encyclopedia Glossary (A–Z)</h2>
            <p className="bb-section-desc">
              The essential terminology of Indian metallurgical heritage, craft jargon, sacred Sanskrit concepts, and
              historical metallurgy.
            </p>
          </div>

          <div className="bb-glossary-controls">
            <input
              type="text"
              placeholder="Search terms (e.g. Akhand Diya, Dhokra, Vastu, Naqqashi)..."
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              className="bb-search-input"
            />

            <div className="bb-glossary-chips">
              {glossaryCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={selectedGlossaryCategory === cat ? "bb-preset-chip active" : "bb-preset-chip"}
                  onClick={() => setSelectedGlossaryCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bb-glossary-grid">
            {filteredGlossary.map((item, idx) => (
              <div key={idx} className="bb-glossary-card">
                <div className="bb-glossary-term">{item.term}</div>
                <span className="bb-glossary-category">{item.category}</span>
                <p className="bb-glossary-def">{item.definition}</p>
              </div>
            ))}
          </div>

          {filteredGlossary.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--bb-muted)" }}>
              No terms found matching "{glossarySearch}". Try searching "Diya", "Alloy", or "Vastu".
            </div>
          )}
        </div>
      </section>

      {/* CHAPTER 7: Concierge & WhatsApp Share */}
      <section className="bb-section" id="concierge" style={{ borderBottom: "none" }}>
        <div className="bb-container">
          <div className="bb-concierge-card">
            <div className="bb-concierge-badge">Decorbeats Brand Assurance</div>
            <h2>Own a Piece of Unbroken Metalcraft</h2>
            <p>
              Decorbeats bridges generational Moradabad artisan families directly with homes across India.
              Every diya, urli, and sanctum accent is cast in solid, verified brass, hand-inspected, and delivered from
              our Bengaluru Experience Center.
            </p>

            <div className="bb-concierge-actions">
              <button
                type="button"
                className="bb-btn-whatsapp"
                onClick={() => openWhatsAppConcierge("general")}
              >
                <span>💬 Consult Megha on WhatsApp (+91 98111 33661)</span>
              </button>

              <button
                type="button"
                className="bb-btn-share"
                onClick={handleShareLink}
              >
                <span>{copiedLink ? "✓ Link Copied to Clipboard!" : "🔗 Share The Brass Book"}</span>
              </button>

              <button
                type="button"
                className="bb-btn-ghost"
                onClick={handleBack}
              >
                Browse Brass Catalog →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bb-footer">
        <div className="bb-container">
          <p>© 2026 Decorbeats · Handcrafted in Moradabad · Curated in Bengaluru · All Rights Reserved.</p>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            The Brass Book is an original educational publication by Decorbeats to preserve Indian metallurgical heritage.
          </p>
        </div>
      </footer>
    </div>
  );
}
