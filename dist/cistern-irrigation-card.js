/**
 * Cistern Irrigation Card
 * A single-file custom Lovelace card (no build step required).
 *
 * Install:
 *   1. Copy this file to  <config>/www/cistern-irrigation-card.js
 *   2. Settings > Dashboards > (top-right menu) Resources > + Add resource
 *        URL: /local/cistern-irrigation-card.js
 *        Type: JavaScript Module
 *      (or add under lovelace.resources in YAML mode)
 *   3. Hard-refresh the browser (Ctrl/Cmd+Shift+R).
 *
 * Example config:
 *   type: custom:cistern-irrigation-card
 *   title: Irrigation
 *   cistern:
 *     level: sensor.cistern_level          # 0-100 %
 *     volume: sensor.cistern_volume        # gallons (optional)
 *     capacity: 500                        # gallons (used if volume omitted)
 *   source:
 *     valve: switch.cistern_valve     # on = cistern, off = street
 *     pump: switch.cistern_pump
 *     active_source: sensor.active_water_source   # optional; else derived
 *   zones:
 *     - entity: switch.irrigation_zone_1
 *       name: Zone 1
 *     - entity: switch.irrigation_zone_2
 *       name: Zone 2
 *     - entity: switch.irrigation_zone_3
 *       name: Zone 3
 *     - entity: switch.irrigation_zone_4
 *       name: Zone 4
 *   schedule: switch.irrigation_schedule
 *   columns: 2
 *
 * Satellite overlay (optional): add a property map with zones drawn on top.
 *   property:
 *     image: /local/property.jpg     # satellite screenshot in <config>/www/
 *     aspect_ratio: "16 / 9"         # shape of the map area
 *     debug: true                    # show live x/y readout to place zones
 *   hide_zone_grid: false            # set true to show only the map
 *   zones:
 *     - entity: switch.irrigation_zone_1
 *       name: Zone 1
 *       x: 55            # marker position, % of width  (optional)
 *       y: 40            # marker position, % of height (optional)
 *       points: "50,30 70,35 68,55 48,52"   # polygon area in % coords (optional)
 */

const CARD_VERSION = "1.0.0";

class CisternIrrigationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
  }

  setConfig(config) {
    if (!config.cistern || !config.cistern.level) {
      throw new Error("You must define cistern.level (a 0-100 % sensor).");
    }
    if (!config.source || !config.source.valve) {
      throw new Error("You must define source.valve (the cistern valve switch).");
    }
    this._config = {
      title: config.title || "Irrigation",
      columns: config.columns || 2,
      ...config,
    };
    this._built = false; // rebuild structure when config changes
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() {
    const zones = (this._config.zones || []).length;
    return 6 + Math.ceil(zones / (this._config.columns || 2));
  }

  static getStubConfig() {
    return {
      title: "Irrigation",
      cistern: { level: "sensor.cistern_level", volume: "sensor.cistern_volume", capacity: 500 },
      source: { valve: "switch.cistern_valve", pump: "switch.cistern_pump" },
      zones: [{ entity: "switch.zone_1", name: "Zone 1" }],
    };
  }

  // ---- helpers -------------------------------------------------------------
  _st(entity) {
    const s = this._hass && this._hass.states[entity];
    return s ? s.state : "unavailable";
  }
  _num(entity, fallback = 0) {
    const v = parseFloat(this._st(entity));
    return isNaN(v) ? fallback : v;
  }
  _isOn(entity) {
    return this._st(entity) === "on";
  }
  _toggle(entity) {
    if (!entity) return;
    const domain = entity.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: entity });
  }
  _turnOff(entity) {
    if (!entity) return;
    const domain = entity.split(".")[0];
    this._hass.callService(domain, "turn_off", { entity_id: entity });
  }
  _fireMoreInfo(entity) {
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId: entity };
    this.dispatchEvent(ev);
  }

  // ---- structure (built once) ---------------------------------------------
  _build() {
    const c = this._config;
    const zones = c.zones || [];
    const zoneCards = zones
      .map(
        (z, i) => `
        <button class="zone" data-zone="${i}" data-entity="${z.entity}">
          <ha-icon class="zicon" icon="${z.icon || "mdi:sprinkler-variant"}"></ha-icon>
          <div class="zname">${z.name || z.entity}</div>
          <div class="zstate">—</div>
        </button>`
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="header">
          <div class="title">${c.title}</div>
          <div class="src-pill" id="srcpill"><ha-icon icon="mdi:water-pump"></ha-icon><span id="srctext">—</span></div>
        </div>

        ${this._mapSection()}

        <div class="main">
          <div class="tankwrap" id="tankwrap" title="Cistern level">
            <div class="tank">
              <div class="water" id="water"><span class="wave w1"></span><span class="wave w2"></span></div>
              <div class="tank-labels">
                <div class="gal" id="gal">— gal</div>
                <div class="pct" id="pct">—%</div>
              </div>
            </div>
            <div class="tank-caption">Cistern</div>
          </div>

          <div class="controls">
            <div class="seg" id="seg">
              <button class="seg-btn" id="seg-street" data-src="street">Street</button>
              <button class="seg-btn" id="seg-cistern" data-src="cistern">Cistern</button>
            </div>
            <button class="pumpbtn" id="pumpbtn">
              <ha-icon icon="mdi:pump"></ha-icon><span id="pumptext">Pump</span>
            </button>
            <div class="warn" id="warn" hidden>
              <ha-icon icon="mdi:alert"></ha-icon>
              <span>Pump running with valve closed — open the cistern valve.</span>
            </div>
          </div>
        </div>

        ${
          c.hide_zone_grid
            ? ""
            : `<div class="zones" id="zones" style="grid-template-columns:repeat(${c.columns},1fr)">
          ${zoneCards}
        </div>`
        }

        <div class="footer">
          ${c.schedule ? `<button class="fbtn" id="schedbtn"><ha-icon icon="mdi:calendar-clock"></ha-icon><span id="schedtext">Schedule</span></button>` : ""}
          <button class="fbtn stop" id="stopbtn"><ha-icon icon="mdi:stop"></ha-icon><span>Stop All</span></button>
        </div>
      </ha-card>
    `;

    // ---- event wiring ----
    const $ = (id) => this.shadowRoot.getElementById(id);
    $("tankwrap").addEventListener("click", () => this._fireMoreInfo(c.cistern.level));
    $("seg-street").addEventListener("click", () => this._setSource("street"));
    $("seg-cistern").addEventListener("click", () => this._setSource("cistern"));
    $("pumpbtn").addEventListener("click", () => this._toggle(c.source.pump));
    $("srcpill").addEventListener("click", () => this._toggle(c.source.valve));
    if (c.schedule) $("schedbtn").addEventListener("click", () => this._toggle(c.schedule));
    $("stopbtn").addEventListener("click", () => this._stopAll());

    this.shadowRoot.querySelectorAll(".zone").forEach((el) => {
      el.addEventListener("click", () => this._toggle(el.dataset.entity));
    });

    // ---- map wiring ----
    const map = this.shadowRoot.getElementById("map");
    if (map) {
      this.shadowRoot.querySelectorAll(".marker, .zpoly").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this._toggle(el.dataset.entity);
        });
      });
      if (c.property && c.property.debug) {
        const ro = this.shadowRoot.getElementById("mapreadout");
        ro.hidden = false;
        const coords = (e) => {
          const r = map.getBoundingClientRect();
          const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
          const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
          return { x, y };
        };
        map.addEventListener("mousemove", (e) => {
          const { x, y } = coords(e);
          ro.textContent = `x:${x}  y:${y}`;
        });
        map.addEventListener("click", (e) => {
          const { x, y } = coords(e);
          console.info(`[cistern-irrigation-card] map point  x:${x}%  y:${y}%`);
        });
      }
    }

    this._built = true;
  }

  _mapSection() {
    const p = this._config.property;
    if (!p || !p.image) return "";
    const zones = this._config.zones || [];
    const polys = zones
      .map((z, i) =>
        z.points
          ? `<polygon class="zpoly" data-zone="${i}" data-entity="${z.entity}" points="${z.points}"></polygon>`
          : ""
      )
      .join("");
    const labels = zones
      .map((z, i) =>
        z.points
          ? `<text class="zpolylabel" data-zone="${i}" x="${this._polyCenter(z.points).x}" y="${this._polyCenter(z.points).y}">${z.name || ""}</text>`
          : ""
      )
      .join("");
    const markers = zones
      .map((z, i) =>
        z.x != null && z.y != null
          ? `<button class="marker" data-zone="${i}" data-entity="${z.entity}" style="left:${z.x}%;top:${z.y}%">
               <span class="dot"></span><span class="mlabel">${z.name || ""}</span>
             </button>`
          : ""
      )
      .join("");
    const ratio = p.aspect_ratio || "16 / 9";
    return `
      <div class="mapsec">
        <div class="map" id="map" style="aspect-ratio:${ratio};background-image:url('${p.image}')">
          <svg class="mapsvg" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${polys}
            ${labels}
          </svg>
          ${markers}
          <div class="mapreadout" id="mapreadout" hidden></div>
        </div>
      </div>`;
  }

  _polyCenter(points) {
    const pts = points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    const x = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const y = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return { x: x.toFixed(1), y: y.toFixed(1) };
  }

  _setSource(which) {
    const valve = this._config.source.valve;
    const wantOn = which === "cistern";
    if (this._isOn(valve) !== wantOn) this._toggle(valve);
  }

  _stopAll() {
    const ids = (this._config.zones || []).map((z) => z.entity);
    if (this._config.schedule) ids.push(this._config.schedule);
    if (ids.length) this._hass.callService("switch", "turn_off", { entity_id: ids });
  }

  // ---- live update --------------------------------------------------------
  _update() {
    const c = this._config;
    const $ = (id) => this.shadowRoot.getElementById(id);

    const level = Math.max(0, Math.min(100, this._num(c.cistern.level, 0)));
    const gal =
      c.cistern.volume != null && c.cistern.volume !== undefined && this._hass.states[c.cistern.volume]
        ? this._num(c.cistern.volume, 0)
        : Math.round((level / 100) * (c.cistern.capacity || 500));

    // tank fill + color
    const water = $("water");
    water.style.height = level + "%";
    const color = level < 30 ? "#ef5350" : level < 60 ? "#ffb300" : "#42a5f5";
    water.style.background = color;
    $("pct").textContent = level.toFixed(0) + "%";
    $("gal").textContent = Math.round(gal) + " gal";

    // source state
    const onCistern = c.source.active_source
      ? String(this._st(c.source.active_source)).toLowerCase().indexOf("cistern") > -1
      : this._isOn(c.source.valve);
    $("srctext").textContent = onCistern ? "Cistern" : "Street";
    $("srcpill").classList.toggle("active", onCistern);
    $("seg-street").classList.toggle("on", !onCistern);
    $("seg-cistern").classList.toggle("on", onCistern);

    // pump
    const pumpOn = c.source.pump ? this._isOn(c.source.pump) : false;
    $("pumpbtn").classList.toggle("on", pumpOn);
    $("pumptext").textContent = pumpOn ? "Pump On" : "Pump Off";

    // interlock warning
    $("warn").hidden = !(pumpOn && c.source.valve && !this._isOn(c.source.valve));

    // zones
    this.shadowRoot.querySelectorAll(".zone").forEach((el) => {
      const on = this._isOn(el.dataset.entity);
      el.classList.toggle("active", on);
      el.querySelector(".zstate").textContent = on ? "Running" : "Idle";
    });

    // map overlay (highlight where the yard is being watered)
    this.shadowRoot.querySelectorAll(".marker, .zpoly, .zpolylabel").forEach((el) => {
      el.classList.toggle("active", this._isOn(el.dataset.entity || (this._config.zones[el.dataset.zone] || {}).entity));
    });

    // schedule
    if (c.schedule) {
      const on = this._isOn(c.schedule);
      $("schedbtn").classList.toggle("on", on);
      $("schedtext").textContent = on ? "Schedule On" : "Schedule";
    }
  }

  _styles() {
    return `
      ha-card { padding: 16px; }
      .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .title { font-size:1.3rem; font-weight:600; }
      .src-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px;
        background: var(--secondary-background-color); color: var(--secondary-text-color); cursor:pointer;
        font-weight:600; transition: all .3s; }
      .src-pill.active { background:#1e88e5; color:#fff; }
      .src-pill ha-icon { --mdc-icon-size:18px; }

      .main { display:flex; gap:16px; align-items:stretch; flex-wrap:wrap; }

      .tankwrap { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
      .tank { position:relative; width:120px; height:170px; border:3px solid var(--divider-color);
        border-radius:14px; overflow:hidden; background: var(--card-background-color);
        box-shadow: inset 0 0 8px rgba(0,0,0,.15); }
      .water { position:absolute; left:0; right:0; bottom:0; height:0%;
        transition: height 1s ease, background .6s ease; }
      .wave { position:absolute; left:-50%; width:200%; height:200%; top:-165%;
        background: rgba(255,255,255,.35); }
      .wave.w1 { border-radius:43%; animation: spin 7s linear infinite; }
      .wave.w2 { border-radius:47%; background: rgba(255,255,255,.18); animation: spin 12s linear infinite; }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      .tank-labels { position:absolute; inset:0; display:flex; flex-direction:column;
        align-items:center; justify-content:center; text-shadow:0 1px 2px rgba(0,0,0,.35); pointer-events:none; }
      .gal { font-size:1.15rem; font-weight:700; color:#fff; }
      .pct { font-size:.85rem; color:#f5f5f5; }
      .tank-caption { margin-top:6px; font-size:.8rem; color:var(--secondary-text-color); }

      .controls { flex:1; min-width:180px; display:flex; flex-direction:column; gap:10px; justify-content:center; }
      .seg { display:flex; border:1px solid var(--divider-color); border-radius:10px; overflow:hidden; }
      .seg-btn { flex:1; padding:12px 8px; border:0; background:transparent; color:var(--primary-text-color);
        font-size:1rem; font-weight:600; cursor:pointer; transition: all .25s; }
      .seg-btn.on { background:#1e88e5; color:#fff; }
      .pumpbtn, .fbtn { display:inline-flex; align-items:center; justify-content:center; gap:8px;
        padding:10px; border:1px solid var(--divider-color); border-radius:10px; background:transparent;
        color:var(--primary-text-color); font-size:.95rem; font-weight:600; cursor:pointer; transition: all .25s; }
      .pumpbtn.on { background:#2e7d32; color:#fff; border-color:#2e7d32; }
      .fbtn.on { background:#1e88e5; color:#fff; border-color:#1e88e5; }
      .pumpbtn ha-icon, .fbtn ha-icon { --mdc-icon-size:20px; }
      .warn { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px;
        background: rgba(244,67,54,.12); color:#c62828; font-size:.85rem; }
      .warn[hidden] { display:none; }
      .warn ha-icon { --mdc-icon-size:20px; color:#c62828; }

      .zones { display:grid; gap:10px; margin-top:16px; }
      .zone { display:flex; flex-direction:column; align-items:center; gap:4px; padding:14px 8px;
        border:1px solid var(--divider-color); border-radius:12px; background:transparent;
        color:var(--primary-text-color); cursor:pointer; transition: all .3s; }
      .zone .zicon { --mdc-icon-size:30px; color: var(--secondary-text-color); transition: color .3s; }
      .zone .zname { font-weight:600; font-size:.9rem; text-align:center; }
      .zone .zstate { font-size:.75rem; color: var(--secondary-text-color); }
      .zone.active { border-color:#43a047; box-shadow:0 0 12px rgba(67,160,71,.6); background: rgba(67,160,71,.08); }
      .zone.active .zicon { color:#43a047; }
      .zone.active .zstate { color:#43a047; font-weight:600; }

      .footer { display:flex; gap:10px; margin-top:16px; }
      .footer .fbtn { flex:1; }
      .fbtn.stop { color:#c62828; border-color: rgba(198,40,40,.5); }
      .fbtn.stop ha-icon { color:#c62828; }

      /* ---- satellite map overlay ---- */
      .mapsec { margin-bottom:16px; }
      .map { position:relative; width:100%; background-size:cover; background-position:center;
        border-radius:12px; overflow:hidden; border:1px solid var(--divider-color); }
      .mapsvg { position:absolute; inset:0; width:100%; height:100%; }
      .zpoly { fill: rgba(255,255,255,.05); stroke: rgba(255,255,255,.55); stroke-width:.4;
        cursor:pointer; transition: fill .4s ease; vector-effect: non-scaling-stroke; }
      .zpoly:hover { fill: rgba(255,255,255,.15); }
      .zpoly.active { fill: rgba(67,160,71,.45); stroke:#66bb6a; stroke-width:1;
        animation: waterpulse 1.8s ease-in-out infinite; }
      @keyframes waterpulse {
        0%, 100% { fill: rgba(67,160,71,.30); }
        50%      { fill: rgba(67,160,71,.60); }
      }
      .zpolylabel { fill:#fff; font-size:3px; font-weight:700; text-anchor:middle;
        paint-order:stroke; stroke:rgba(0,0,0,.6); stroke-width:.5px; pointer-events:none;
        transition: fill .3s; }
      .zpolylabel.active { fill:#c8f7c8; }

      .marker { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column;
        align-items:center; gap:2px; background:none; border:0; padding:0; cursor:pointer; }
      .marker .dot { width:16px; height:16px; border-radius:50%; background: rgba(33,150,243,.9);
        border:2px solid #fff; box-shadow:0 0 4px rgba(0,0,0,.6); transition: all .3s; }
      .marker.active .dot { background:#43a047; animation: pulse 1.6s infinite; }
      .marker .mlabel { font-size:.72rem; color:#fff; font-weight:600; white-space:nowrap;
        text-shadow:0 1px 3px rgba(0,0,0,.9); }
      @keyframes pulse {
        0%   { box-shadow:0 0 0 0 rgba(67,160,71,.7); }
        70%  { box-shadow:0 0 0 14px rgba(67,160,71,0); }
        100% { box-shadow:0 0 0 0 rgba(67,160,71,0); }
      }
      .mapreadout { position:absolute; top:6px; left:6px; background:rgba(0,0,0,.6); color:#fff;
        font-size:.75rem; padding:3px 8px; border-radius:6px; font-family:monospace; pointer-events:none; }
    `;
  }
}

customElements.define("cistern-irrigation-card", CisternIrrigationCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "cistern-irrigation-card",
  name: "Cistern Irrigation Card",
  description: "Cistern tank level, street/cistern source switching with pump interlock, and Rachio zone control.",
  preview: false,
});

console.info(
  `%c CISTERN-IRRIGATION-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#1e88e5;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px;",
  "color:#1e88e5;background:#e3f2fd;border-radius:0 3px 3px 0;padding:2px 6px;"
);
