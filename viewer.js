// Results viewer for the Spain power-market model (github.com/Leide0022/spain-model-runs).
// Reads reference/basemap.js and runs/manifest.js (loaded by index.html), then each picked run's
// package from runs/<id>/. Packages are written by scripts/publish_run.py in the model repo.
(() => {
  // Runs are listed in runs/manifest.js; a run's files (runs/<id>/data.js and one file per month)
  // are loaded when it is picked. Both are written by scripts/publish_run.py in the model repo.
  const MANIFEST = window.RUN_MANIFEST || [];
  const D = { categories: [], categories_phys: [], runs: [] };   // the runs loaded so far
  window.MAP_LAYERS = window.BASEMAP;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const PRICE_STAGES = ["DA", "ID2", "ID3", "CID", "BAL"];
  const MIX_STAGES = [["DA", "Day-ahead", "DA"], ["BAL", "Balancing", "BAL"], ["RD", "Redispatch", "RD"]];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const NS = "http://www.w3.org/2000/svg";

  const state = { run: MANIFEST.length ? MANIFEST[0].id : null, priceStage: "DA", priceRes: "hour", mixStage: "DA", mixRes: "hour", mixRef: "omie", zoom: null, tab: "overview", gridMode: "max", gridHour: null, gridSel: null, mapStyle: "terrain", plantSize: "cap", plantTime: "period", plantHour: null, plantSel: null, plantHidden: [], playSpeed: 2,
    gridLayers: ["hv", "lv", "trafo", "border"], gridSort: ["max", -1], gridQuery: "", gridAll: false };
  const TABS = [["overview", "Overview"], ["price", "Price"], ["mix", "Generation mix"], ["status", "AC redispatch"], ["grid", "Grid"], ["plants", "Power plants"], ["stages", "Market stages"], ["esios", "REE (e·sios)"]];
  try { const saved = localStorage.getItem("runviewer.tab"); if (TABS.some(x => x[0] === saved)) state.tab = saved; } catch (e) {}
  try { const ms = localStorage.getItem("runviewer.mapStyle"); if (["plain", "political", "terrain", "dark"].includes(ms)) state.mapStyle = ms; } catch (e) {}
  const CAT_COLOR = { Hydro: "var(--cat-1)", CCGT: "var(--cat-2)", Wind: "var(--cat-3)", Solar: "var(--cat-4)",
    "CHP group": "var(--cat-5)", Imports: "var(--cat-6)", Nuclear: "var(--cat-7)", Coal: "var(--cat-8)",
    Gas: "var(--cat-2)", "Bio & other": "var(--cat-5)" };
  const STACK = ["Coal", "Nuclear", "Imports", "CHP group", "Solar", "Wind", "CCGT", "Hydro"]; // bottom to top
  const STACK_PHYS = ["Coal", "Nuclear", "Imports", "Bio & other", "Solar", "Wind", "Gas", "Hydro"];
  const REF_NAME = { omie: "OMIE day-ahead programme", entsoe: "ENTSO-E actual generation" };
  // the real data and model grouping the mix section compares
  function mixData(r) {
    const phys = state.mixRef === "entsoe";
    return {
      ref: state.mixRef, cats: phys ? D.categories_phys : D.categories, stack: phys ? STACK_PHYS : STACK,
      real: phys ? r.real_phys : r.real_mix, model: (phys ? r.mix_phys : r.mix)[state.mixStage],
    };
  }
  try {
    const h = location.hash.slice(1);
    if (MANIFEST.some(m => m.id === h)) state.run = h;
  } catch (e) {}


  // ---------- hover explanations ----------
  const GLOSS = {
    solved: ["AC hours solved", "Share of hours where the AC redispatch (Ipopt) found a solution. In a failed hour the market stages still have results, but the redispatch has none."],
    failed: ["Failed hour", "The AC redispatch stopped without a solution, usually Ipopt getting stuck (local infeasibility). It does not mean the system was short of power."],
    okhour: ["Solved hour", "The AC redispatch found a schedule that respects line limits and voltages for this hour."],
    meanprice: ["Mean day-ahead price", "Average of the model's day-ahead price over the hours shown, next to OMIE's real Spanish day-ahead price for the same hours."],
    bias: ["Price bias", "Model mean minus real mean. Negative means the model price is too low on average. Errors up and down can cancel out here, so read it together with MAE."],
    mae: ["MAE (mean absolute error)", "The average size of the hourly price error, ignoring the sign. 0 is perfect. 20 €/MWh means the model is off by 20 €/MWh in a typical hour."],
    corr: ["Correlation", "How well the model follows the ups and downs of the real price, from −1 to 1. 1 means the same shape (even if the level is off), 0 means no relation."],
    shed: ["Load shed", "Demand the redispatch could not supply, summed over the solved hours shown. It should be 0."],
    real_price: ["Real price", "OMIE's day-ahead marginal price for the Spanish zone (the marginalpdbc files)."],
    real_bal: ["Real balancing price", "REE's price for replacement reserve (RR), the hourly balancing energy market, from e·sios. The closest real counterpart of the model's balancing (BAL) price; Spain has no single balancing price."],
    ree_rd: ["REE redispatch", "What REE changed after the market for grid security, from e·sios: technical constraints after the day-ahead (phase I adds energy where the grid needs it, phase II takes about the same amount out elsewhere) and real-time constraints."],
    model_bal: ["Model balancing", "What the model's balancing stage moved compared with the continuous intraday schedule, summed up and down over the plants that respond (wind, solar and the fixed cross-border flows left out: their forecast change is what has to be balanced)."],
    ree_imb: ["REE net imbalance", "e·sios indicator 1338: the net imbalance of generation and demand in each hour, which REE covers with balancing energy."],
    model_imb: ["Model forecast change", "Load minus wind minus solar at the balancing stage, minus the same at the continuous intraday stage: the forecast change the model's balancing stage has to cover. It is the model's counterpart of the imbalance."],
    model_rd: ["Model redispatch", "The model's AC redispatch minus its balancing schedule, summed over the power plants on the map (CHP, waste and mini-hydro blocks and the border are left out). Failed AC hours have no value."],
    real_mix: ["Real generation", "OMIE's day-ahead programme per technology (the 'Energía horaria por tecnologías' report)."],
    DA: ["Day-ahead (DA)", "Clears all 24 hours the day before delivery, using the day-ahead forecast of load, wind and solar."],
    ID2: ["Intraday 2 (ID2)", "Re-clears all 24 hours with an updated forecast, starting from the DA schedule."],
    ID3: ["Intraday 3 (ID3)", "Re-clears hours 12–23 with a newer forecast, starting from ID2."],
    CID: ["Continuous intraday (CID)", "Rolling trading up to one hour before delivery. Each hour is settled with the latest forecast for that hour."],
    BAL: ["Balancing (BAL)", "The last adjustment before delivery, using the realised load, wind and solar."],
    RD: ["Redispatch", "An AC power-flow solve for each hour that changes the balancing schedule so it works on the real grid (line limits, voltages)."],
    Nuclear: ["Nuclear", "Nuclear plants. Their available capacity is set per day from OMIE data."],
    Coal: ["Coal", "Coal plants. The model has no minimum output for coal, so it often runs them at zero."],
    CCGT: ["CCGT", "Combined-cycle gas plants and gas turbines. Industrial CHP gas is counted in the CHP group, not here."],
    Hydro: ["Hydro", "Reservoir, run-of-river and pumped-storage generation. Mini-hydro is in the CHP group."],
    Wind: ["Wind", "Onshore and offshore wind."],
    Solar: ["Solar", "Solar PV and solar thermal."],
    "CHP group": ["CHP group", "OMIE's group 'cogeneration / waste / mini-hydro'. In the model: industrial CHP gas, waste and mini-hydro blocks, plus biomass."],
    Imports: ["Imports", "Imports from France and Portugal. Real: OMIE's import columns. Model: the interconnector units."],
    input: ["Model input", "At day-ahead this comes from OMIE's own numbers, so it matches by construction and says nothing about model accuracy."],
    diff: ["Difference", "Model energy minus real energy over the hours shown. The bar shows its size next to the other technologies."],
    hourly_error: ["Hourly error", "Average absolute difference in MW between model and real, hour by hour. Unlike the total, errors up and down do not cancel."],
    commit: ["Code version", "The git commit the run used. Anyone can get exactly that code with git checkout and the commit id."],
    dirty: ["Uncommitted changes", "Files that were edited but not committed when the run started. The commit alone does not reproduce the run exactly."],
    rd_setup: ["Redispatch setup", "AC means a full AC power flow solved with Ipopt. HSL MA57 is the fast linear solver Ipopt uses; MUMPS is the slower default."],
    Gas: ["Gas", "All gas-fired generation: combined cycles, gas turbines and industrial CHP gas. ENTSO-E reports them together as 'Fossil Gas'."],
    "Bio & other": ["Biomass & other", "Biomass, waste, oil and ENTSO-E's 'other' types. In the model: biomass, the waste block and the oil units."],
    ref_omie: ["OMIE day-ahead programme", "The result of the day-ahead market: what was planned the day before. Right reference for the market stages (DA to BAL)."],
    ref_entsoe: ["ENTSO-E actual generation", "Measured output per fuel type: what plants really produced after all markets and REE's grid fixes. Right reference for the redispatch."],
    g_max: ["Highest loading", "For each line, the highest loading in any solved hour of the shown period."],
    g_h90: ["Hours at 90 % or more", "For each line, how many solved hours in the shown period it was loaded to 90 % of its limit or more."],
    g_hour: ["One hour", "Loading of every line in a single hour. Pick the hour with the slider; failed AC hours have no flows."],
    st_plain: ["Plain map", "Land, sea and country borders only, so the lines stand out most."],
    st_political: ["Political map", "Spain's autonomous communities and provinces, the largest cities, and Soto de Ribera."],
    st_terrain: ["Terrain map", "Shaded mountains and valleys (Natural Earth shaded relief), with the communities and cities."],
    st_dark: ["Dark map", "A dark background where the loaded lines light up. Stays dark in a light page."],
    p_cap: ["Installed capacity", "The MW the plants can produce at most. Shows where the generation fleet is."],
    p_out: ["Output", "What the plants produced in the AC redispatch (the final stage), as an average over the shown period or in one hour."],
    p_chg: ["Redispatch change", "Redispatch output minus balancing output: how much the grid stage turned each plant up or down to keep line flows and voltages within limits."],
    p_period: ["Average over period", "The average over all solved hours in the shown period."],
    p_hour: ["One hour", "A single hour; pick it with the slider. Failed AC hours have no redispatch output."],
    p_realout: ["Real output", "What the plant really produced (ENTSO-E's measured output per unit), as an average over the shown period or in one hour. Only plants ENTSO-E reports one by one are shown."],
    p_real: ["Real vs model", "Compares the model's redispatch output with what the plant really produced (ENTSO-E). Only plants ENTSO-E reports one by one are shown."],
    p_above: ["Model above real", "A filled circle: the model ran the plant more than it really ran."],
    p_below: ["Model below real", "A ring: the model ran the plant less than it really ran."],
    p_entsoe: ["ENTSO-E unit data", "ENTSO-E's 'actual generation per generation unit': measured hourly output of each large unit (about 100 MW and up), matched to the model's plants by a hand-made table."],
    p_up: ["Turned up", "A filled circle: the grid stage made the plant produce more than in the balancing market."],
    p_down: ["Turned down", "A ring: the grid stage made the plant produce less than in the balancing market."],
    soto: ["Soto de Ribera", "The coal plant studied in the thesis (Ribera de Arriba, Asturias). Location approximate."],
    g_hv: ["400 kV lines", "The main transmission grid (400 kV, plus the 320 kV DC link to France counted as a line). Drawn thick."],
    g_lv: ["220 kV and lower", "The regional grid: 220 kV and the few 132 kV lines. Drawn thin."],
    g_trafo: ["Transformers", "Connect two voltage levels at one substation (e.g. 400/220 kV). Both ends are at the same place, so they are drawn as squares, coloured by loading like the lines."],
    g_border: ["Border lines", "The lines to France and Portugal. The model enters the exchange with each country as fixed power at the far end of these lines, split by line rating."],
    g_nlim: ["Hours at limit", "Solved AC hours in the period where this line or transformer carried its full limit (100 % loading). Failed hours are not counted."],
    g_limit: ["At limit", "The line carries its full limit. The AC redispatch does not let a line go over its limit, so 100 % means the limit is binding."],
    gas_dot: ["CCGT running", "A combined-cycle gas plant produced more than 1 MW at the balancing stage in that hour."],
  };
  const term = (label, key) => `<span class="term" tabindex="0" data-tip="${key}">${label}</span>`;
  const gloss = document.createElement("div");
  gloss.className = "gloss"; gloss.hidden = true; gloss.setAttribute("role", "tooltip");
  document.body.appendChild(gloss);
  let glossAnchor = null;
  function showGloss(el) {
    const g = GLOSS[el.dataset.tip]; if (!g) return;
    glossAnchor = el;
    gloss.innerHTML = `<b>${g[0]}</b>${g[1]}`; gloss.hidden = false;
    const r = el.getBoundingClientRect(), gw = gloss.offsetWidth, vw = document.documentElement.clientWidth;
    const left = Math.max(8, Math.min(r.left, vw - gw - 8));
    let top = r.bottom + 6;
    if (top + gloss.offsetHeight > window.innerHeight - 8) top = r.top - gloss.offsetHeight - 6;
    gloss.style.left = left + window.scrollX + "px"; gloss.style.top = top + window.scrollY + "px";
  }
  function hideGloss() { gloss.hidden = true; glossAnchor = null; }
  document.addEventListener("pointerover", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) showGloss(el); });
  document.addEventListener("pointerout", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) hideGloss(); });
  document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) showGloss(el); });
  document.addEventListener("focusout", hideGloss);
  document.addEventListener("pointermove", () => { if (glossAnchor && !glossAnchor.isConnected) hideGloss(); });
  window.addEventListener("scroll", hideGloss, { passive: true });

  // ---------- the visible period (zoom) ----------
  function view() {
    const r = run(), z = state.zoom;
    if (!z) return { ...r, offset: 0 };
    const h0 = z[0] * 24, h1 = (z[1] + 1) * 24;
    const sl = a => a.slice(h0, h1);
    const each = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
    return {
      ...r, offset: z[0], days: r.days.slice(z[0], z[1] + 1),
      price: each(r.price, sl), real_price: sl(r.real_price), status: sl(r.status), shed: sl(r.shed),
      real_mix: each(r.real_mix, sl), mix: each(r.mix, m => each(m, sl)),
      real_phys: each(r.real_phys, sl), mix_phys: each(r.mix_phys, m => each(m, sl)),
      balancing: r.balancing ? each(r.balancing, sl) : null,
    };
  }
  function setZoom(a, b) {
    const nd = run().days.length;
    a = Math.max(0, Math.min(nd - 1, a)); b = Math.max(a, Math.min(nd - 1, b));
    state.zoom = a === 0 && b === nd - 1 ? null : [a, b];
    hideGloss(); renderAll();
  }
  // a drag on a chart gives chart-local indices; hourly charts snap to whole days
  function zoomFromChart(a, b, hourly) {
    const off = view().offset;
    setZoom(off + (hourly ? Math.floor(a / 24) : a), off + (hourly ? Math.floor(b / 24) : b));
  }

  // ---------- helpers ----------
  const $ = id => document.getElementById(id);
  const nf = (x, d = 1) => x == null || Number.isNaN(x) ? "–" :
    x.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");
  const signed = (x, d = 1) => x == null ? "–" : (x > 0 ? "+" : "") + nf(x, d);
  const dt = iso => new Date(iso + "T00:00:00Z");
  const dayLabel = (iso, dow = true) => { const d = dt(iso); return (dow ? DOW[d.getUTCDay()] + " " : "") + d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
  const hh = h => String(h).padStart(2, "0") + ":00";
  function period(days) {
    const a = dt(days[0]), b = dt(days[days.length - 1]);
    return a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}–${b.getUTCDate()} ${MON[b.getUTCMonth()]} ${b.getUTCFullYear()}`
      : `${dayLabel(days[0], false)} – ${dayLabel(days[days.length - 1], false)} ${b.getUTCFullYear()}`;
  }
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // REE e·sios series (reference/esios_2024.js) for the days a view shows, 24 values per day
  const esiosDay = window.ESIOS ? Object.fromEntries(window.ESIOS.days.map((d, i) => [d, i])) : {};
  function esiosFor(r, key) {
    const E = window.ESIOS, s = E && E.series[key];
    if (!s) return null;
    return r.days.flatMap(d => { const i = esiosDay[d]; return i == null ? Array(24).fill(null) : s.slice(i * 24, i * 24 + 24); });
  }
  const mean = a => { let s = 0, n = 0; for (const x of a) if (x != null) { s += x; n++; } return n ? s / n : null; };
  function pairs(a, b) { const out = []; for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) out.push([a[i], b[i]]); return out; }
  function corr(p) {
    const n = p.length; if (n < 3) return null;
    const mx = p.reduce((s, q) => s + q[0], 0) / n, my = p.reduce((s, q) => s + q[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
  function dailyMean(arr, nDays) {
    const out = [];
    for (let d = 0; d < nDays; d++) out.push(mean(arr.slice(d * 24, d * 24 + 24)));
    return out;
  }
  function dailySum(arr, nDays) {
    const out = [];
    for (let d = 0; d < nDays; d++) {
      const sl = arr.slice(d * 24, d * 24 + 24).filter(x => x != null);
      out.push(sl.length ? sl.reduce((s, x) => s + x, 0) / 1000 : null);
    }
    return out;
  }
  function niceTicks(lo, hi, count) {
    const span = hi - lo || 1, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count) || 10 * mag;
    const t0 = Math.floor(lo / step) * step, t1 = Math.ceil(hi / step) * step, out = [];
    for (let t = t0; t <= t1 + step / 2; t += step) out.push(+t.toFixed(6));
    return out;
  }
  const run = () => D.runs.find(r => r.id === state.run);
  const icon = kind => kind === "bad"
    ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="var(--critical)"/><path d="M6 3v3.6M6 8.4v.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>'
    : kind === "warn"
    ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 11.4 10.6H.6Z" fill="#fab219"/><path d="M6 4.3v3M6 8.9v.1" stroke="#141413" stroke-width="1.4" stroke-linecap="round"/></svg>'
    : '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="var(--good)"/><path d="m3.4 6.2 1.8 1.8 3.4-3.6" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function solveStatus(pct) {
    if (pct >= 97) return ["good", "Good"];
    if (pct >= 90) return ["warn", "Some failures"];
    return ["bad", "Many failures"];
  }

  // ---------- generic line chart ----------
  function lineChart(host, o) {
    host.innerHTML = "";
    const W = Math.max(260, host.clientWidth);
    const H = o.height;
    const m = { l: 40, r: o.endLabels ? 66 : 8, t: o.yUnit ? 22 : 8, b: (o.band ? 34 : 0) + 22 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const n = o.n;
    const all = o.series.flatMap(s => s.values.filter(v => v != null));
    let lo = Math.min(0, ...all), hi = Math.max(...all, 1);
    const ticks = niceTicks(lo, hi, o.yTicks || 4);
    lo = ticks[0]; hi = ticks[ticks.length - 1];
    const x = i => m.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const y = v => m.t + ph - ((v - lo) / (hi - lo)) * ph;
    const s = svg("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label }, host);

    for (const t of ticks) {
      svg("line", { x1: m.l, x2: m.l + pw, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1 }, s);
      const tx = svg("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end" }, s);
      tx.textContent = t.toLocaleString("en-GB");
    }
    if (o.yUnit) { const u = svg("text", { x: 0, y: 11, "text-anchor": "start" }, s); u.textContent = o.yUnit; }
    const xb = m.t + ph;
    for (const t of o.xTicks) {
      svg("line", { x1: x(t.i), x2: x(t.i), y1: xb, y2: xb + 4, stroke: "var(--axis)" }, s);
      const tx = svg("text", { x: x(t.i), y: xb + (o.band ? 34 : 0) + 16, "text-anchor": "middle" }, s);
      tx.textContent = t.label;
    }

    if (o.band) {
      const by = xb + 10, bh = 14;
      svg("rect", { x: m.l, y: by, width: pw, height: bh, fill: "var(--surface-2)", rx: 2 }, s);
      const bw = Math.max(1.5, pw / Math.max(n, 1));
      o.band.forEach((v, i) => {
        if (!v) return;
        const hgt = Math.max(3, bh * v);
        svg("rect", { x: x(i) - bw / 2, y: by + bh - hgt, width: bw, height: hgt, fill: "var(--critical)" }, s);
      });
      const bl = svg("text", { x: m.l - 6, y: by + 11, "text-anchor": "end" }, s);
      bl.textContent = "AC";
    }

    for (const ser of o.series) {
      let d = "", pen = false;
      ser.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
        pen = true;
      });
      svg("path", { d, fill: "none", stroke: ser.color, "stroke-width": ser.width || 1.75, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
    }

    if (o.endLabels) {
      const ends = o.series.map(ser => {
        let i = ser.values.length - 1; while (i >= 0 && ser.values[i] == null) i--;
        return { ser, yy: i >= 0 ? y(ser.values[i]) : null };
      }).filter(e => e.yy != null).sort((a, b) => a.yy - b.yy);
      for (let k = 1; k < ends.length; k++) if (ends[k].yy - ends[k - 1].yy < 14) ends[k].yy = ends[k - 1].yy + 14;
      for (const e of ends) {
        const t = svg("text", { x: m.l + pw + 8, y: e.yy + 4, class: "end-label" }, s);
        t.style.fill = e.ser.color;
        t.textContent = e.ser.name;
      }
    }

    // hover layer
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    const guide = svg("line", { y1: m.t, y2: xb, stroke: "var(--axis)", "stroke-width": 1, visibility: "hidden" }, s);
    const dots = o.series.map(ser => svg("circle", { r: 4, fill: ser.color, stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" }, s));
    const sel = svg("rect", { y: m.t, height: ph, fill: "var(--model)", opacity: 0.12, visibility: "hidden", "pointer-events": "none" }, s);
    const hit = svg("rect", { x: m.l, y: m.t, width: pw, height: ph + (o.band ? 34 : 0), fill: "transparent", tabindex: 0, "aria-label": o.label + ". Use the arrow keys to read values." }, s);
    if (o.onZoom) { hit.style.cursor = "crosshair"; hit.style.touchAction = "pan-y"; }
    let cur = -1, drag = null;
    const idxAt = ev => { const r = s.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width); return Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / pw) * (n - 1)))); };
    hit.addEventListener("pointerdown", ev => { if (!o.onZoom || n < 2) return; drag = idxAt(ev); hit.setPointerCapture(ev.pointerId); });
    hit.addEventListener("pointerup", ev => {
      if (drag == null) return;
      const j = idxAt(ev), a = Math.min(drag, j), b = Math.max(drag, j);
      drag = null; sel.setAttribute("visibility", "hidden");
      if (x(b) - x(a) > 6) o.onZoom(a, b);
    });
    hit.addEventListener("pointercancel", () => { drag = null; sel.setAttribute("visibility", "hidden"); });
    function show(i) {
      if (i < 0 || i >= n) return hide();
      cur = i;
      guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("visibility", "visible");
      o.series.forEach((ser, k) => {
        const v = ser.values[i];
        if (v == null) { dots[k].setAttribute("visibility", "hidden"); return; }
        dots[k].setAttribute("cx", x(i)); dots[k].setAttribute("cy", y(v)); dots[k].setAttribute("visibility", "visible");
      });
      tip.innerHTML = o.tooltip(i);
      tip.hidden = false;
      const k = s.getBoundingClientRect().width / W, tw = tip.offsetWidth, hw = host.clientWidth;
      let left = x(i) * k + 12; if (left + tw > hw) left = x(i) * k - tw - 12;
      tip.style.left = Math.max(0, left) + "px"; tip.style.top = m.t * k + "px";
    }
    function hide() {
      cur = -1; tip.hidden = true; guide.setAttribute("visibility", "hidden");
      dots.forEach(d => d.setAttribute("visibility", "hidden"));
    }
    hit.addEventListener("pointermove", ev => {
      const r = s.getBoundingClientRect();
      const px = (ev.clientX - r.left) * (W / r.width);
      show(Math.round(((px - m.l) / pw) * (n - 1)));
      if (drag != null) {
        const j = idxAt(ev);
        sel.setAttribute("x", Math.min(x(drag), x(j))); sel.setAttribute("width", Math.abs(x(j) - x(drag))); sel.setAttribute("visibility", "visible");
      }
    });
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", () => show(cur < 0 ? n - 1 : cur));
    hit.addEventListener("blur", hide);
    hit.addEventListener("keydown", ev => {
      const step = ev.shiftKey ? 24 : 1;
      if (ev.key === "ArrowRight") { show(Math.min(n - 1, cur + step)); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { show(Math.max(0, cur - step)); ev.preventDefault(); }
    });
  }

  function stackChart(host, o) {
    host.innerHTML = "";
    const W = Math.max(260, host.clientWidth), H = o.height;
    const m = { l: 48, r: 8, t: 22, b: 22 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, n = o.n;
    const ticks = niceTicks(0, o.yMax, 4), hi = ticks[ticks.length - 1];
    const x = i => m.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const y = v => m.t + ph - (v / hi) * ph;
    const s = svg("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label }, host);
    for (const tk of ticks) {
      svg("line", { x1: m.l, x2: m.l + pw, y1: y(tk), y2: y(tk), stroke: tk === 0 ? "var(--axis)" : "var(--grid)" }, s);
      const tx = svg("text", { x: m.l - 6, y: y(tk) + 4, "text-anchor": "end" }, s); tx.textContent = tk.toLocaleString("en-GB");
    }
    const u = svg("text", { x: 0, y: 11 }, s); u.textContent = o.yUnit;
    const valid = Array.from({ length: n }, (_, i) => o.layers.every(L => L.values[i] != null));
    let base = new Array(n).fill(0);
    for (const L of o.layers) {
      const top = base.map((b, i) => valid[i] ? b + Math.max(0, L.values[i]) : null);
      for (let i = 0; i < n;) {
        while (i < n && !valid[i]) i++;
        if (i >= n) break;
        let j = i; while (j + 1 < n && valid[j + 1]) j++;
        let d = `M${x(i).toFixed(1)},${y(top[i]).toFixed(1)}`;
        for (let k = i + 1; k <= j; k++) d += `L${x(k).toFixed(1)},${y(top[k]).toFixed(1)}`;
        for (let k = j; k >= i; k--) d += `L${x(k).toFixed(1)},${y(base[k]).toFixed(1)}`;
        svg("path", { d: d + "Z", fill: L.color, stroke: "var(--surface)", "stroke-width": 0.75, "stroke-linejoin": "round" }, s);
        i = j + 1;
      }
      base = top.map((tp, i) => tp == null ? base[i] : tp);
    }
    for (const tk of o.xTicks) {
      svg("line", { x1: x(tk.i), x2: x(tk.i), y1: m.t + ph, y2: m.t + ph + 4, stroke: "var(--axis)" }, s);
      const tx = svg("text", { x: x(tk.i), y: m.t + ph + 16, "text-anchor": "middle" }, s); tx.textContent = tk.label;
    }
    const guide = svg("line", { y1: m.t, y2: m.t + ph, stroke: "var(--ink)", "stroke-width": 1, visibility: "hidden" }, s);
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    const sel = svg("rect", { y: m.t, height: ph, fill: "var(--ink)", opacity: 0.15, visibility: "hidden", "pointer-events": "none" }, s);
    const hit = svg("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent", tabindex: 0, "aria-label": o.label + ". Use the arrow keys to read values." }, s);
    hit.style.cursor = "crosshair"; hit.style.touchAction = "pan-y";
    let cur = -1, drag = null;
    const idxAt = ev => { const r = s.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.round((((ev.clientX - r.left) * (W / r.width)) - m.l) / pw * (n - 1)))); };
    hit.addEventListener("pointerdown", ev => { if (n < 2) return; drag = idxAt(ev); hit.setPointerCapture(ev.pointerId); });
    hit.addEventListener("pointerup", ev => {
      if (drag == null) return;
      const j = idxAt(ev), a = Math.min(drag, j), b = Math.max(drag, j);
      drag = null; sel.setAttribute("visibility", "hidden");
      if (x(b) - x(a) > 6) o.onZoom(a, b);
    });
    hit.addEventListener("pointercancel", () => { drag = null; sel.setAttribute("visibility", "hidden"); });
    hit.addEventListener("pointermove", ev => {
      if (drag == null) return;
      const j = idxAt(ev);
      sel.setAttribute("x", Math.min(x(drag), x(j))); sel.setAttribute("width", Math.abs(x(j) - x(drag))); sel.setAttribute("visibility", "visible");
    });
    const api = {
      guide(i) { guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("visibility", "visible"); },
      hide() { guide.setAttribute("visibility", "hidden"); tip.hidden = true; },
      hideTip() { tip.hidden = true; },
      tip(i, html) {
        tip.innerHTML = html; tip.hidden = false;
        const k = s.getBoundingClientRect().width / W, tw = tip.offsetWidth, hw = host.clientWidth;
        let left = x(i) * k + 14; if (left + tw > hw) left = x(i) * k - tw - 14;
        tip.style.left = Math.max(0, left) + "px"; tip.style.top = "4px";
      },
    };
    const go = i => { if (i < 0 || i >= n) return; cur = i; o.onMove(i, api); };
    hit.addEventListener("pointermove", ev => { const r = s.getBoundingClientRect(); go(Math.round((((ev.clientX - r.left) * (W / r.width)) - m.l) / pw * (n - 1))); });
    hit.addEventListener("pointerleave", () => { cur = -1; o.onLeave(); });
    hit.addEventListener("focus", () => go(cur < 0 ? n - 1 : cur));
    hit.addEventListener("blur", () => o.onLeave());
    hit.addEventListener("keydown", ev => {
      const st = ev.shiftKey ? 24 : 1;
      if (ev.key === "ArrowRight") { go(Math.min(n - 1, cur + st)); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { go(Math.max(0, cur - st)); ev.preventDefault(); }
    });
    return api;
  }

  function renderStacks(r) {
    const hourly = state.mixRes === "hour", nd = r.days.length;
    const md = mixData(r), CATS = md.cats, STACK = md.stack;
    const series = src => Object.fromEntries(CATS.map(c => [c, hourly ? src[c] : dailyMean(src[c], nd)]));
    const real = series(md.real), model = series(md.model);
    const n = real[CATS[0]].length;
    let yMax = 1;
    for (const src of [real, model]) for (let i = 0; i < n; i++) {
      let tot = 0; for (const c of CATS) tot += Math.max(0, src[c][i] || 0); yMax = Math.max(yMax, tot);
    }
    const stageName = MIX_STAGES.find(s => s[0] === state.mixStage)[1];
    $("stack-real-title").innerHTML = `<span class="st-main"><i style="background:var(--real)"></i>Real</span><span class="st-sub">${REF_NAME[md.ref]}</span>`;
    $("stack-model-title").innerHTML = `<span class="st-main"><i style="background:var(--model)"></i>Model</span><span class="st-sub">${stageName}${state.mixStage === "RD" ? ", gaps are failed hours" : ""} · grouped like ${md.ref === "entsoe" ? "ENTSO-E" : "OMIE"}</span>`;
    $("stack-legend").innerHTML = [...STACK].reverse().map(c => `<span><i class="sw-box" style="background:${CAT_COLOR[c]}"></i>${term(c, c)}</span>`).join("")
      + `<span style="color:var(--muted)">${hourly ? "MW each hour" : "Average MW per day"}</span>`;
    const charts = [];
    const tipHtml = i => {
      const day = hourly ? Math.floor(i / 24) : i;
      const when = dayLabel(r.days[day]) + (hourly ? ", " + hh(i % 24) : " (daily average)");
      let tr = 0, tm = 0, mOk = true;
      const rows = [...STACK].reverse().map(c => {
        const a = real[c][i], b = model[c][i];
        tr += a || 0; if (b == null) mOk = false; else tm += b;
        return `<tr><td><i class="sw-box" style="background:${CAT_COLOR[c]};margin-right:6px"></i>${c}</td><td>${nf(a, 0)}</td><td>${nf(b, 0)}</td></tr>`;
      }).join("");
      return `<b>${when}</b><table><tr><th></th><th>Real MW</th><th>Model MW</th></tr>${rows}
        <tr class="total"><td>Total</td><td>${nf(tr, 0)}</td><td>${mOk ? nf(tm, 0) : "–"}</td></tr></table>`;
    };
    const opts = (host, src, label) => ({
      n, height: state.tab === "mix" ? 300 : 230, yMax, yUnit: "MW", label,
      xTicks: dayTicks(r.days, hourly, host.clientWidth - 60),
      layers: STACK.map(c => ({ name: c, color: CAT_COLOR[c], values: src[c] })),
      onMove: (i, me) => { charts.forEach(c => { c.guide(i); if (c !== me) c.hideTip(); }); me.tip(i, tipHtml(i)); },
      onLeave: () => charts.forEach(c => c.hide()),
      onZoom: (a, b) => zoomFromChart(a, b, hourly),
    });
    charts.push(stackChart($("stack-real"), opts($("stack-real"), real, "Real generation mix, stacked")));
    charts.push(stackChart($("stack-model"), opts($("stack-model"), model, "Model generation mix, stacked")));
  }

  function dayTicks(days, perHour, width) {
    const n = days.length;
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(width / 64))));
    const out = [];
    for (let d = 0; d < n; d += every) out.push({ i: perHour ? d * 24 : d, label: dayLabel(days[d], false) });
    if (perHour && n <= 2) for (let d = 0; d < n; d++) for (const h of [6, 12, 18]) out.push({ i: d * 24 + h, label: hh(h) });
    else if (perHour && n <= 4) for (let d = 0; d < n; d++) out.push({ i: d * 24 + 12, label: "12:00" });
    return out;
  }

  function seg(host, options, current, onPick) {
    host.innerHTML = "";
    for (const [val, label, tip] of options) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      if (tip) b.dataset.tip = tip;
      b.setAttribute("aria-pressed", String(val === current));
      b.addEventListener("click", () => onPick(val));
      host.appendChild(b);
    }
  }

  // ---------- sections ----------
  function renderRunList() {
    const host = $("run-list"); host.innerHTML = "";
    for (const m of MANIFEST) {
      const pct = m.ac_total ? 100 * m.ac_solved / m.ac_total : 0, i = m.info || {};
      const b = document.createElement("button");
      b.type = "button"; b.className = "run-item";
      b.setAttribute("aria-current", String(m.id === state.run));
      b.innerHTML = `<span class="ri-name">${esc(m.name)}</span>
        <span class="ri-meta"><span>${period([m.first_day, m.last_day])}</span><span class="mono">${esc(i.commit || "–")}</span><span>${esc(i.ran_by || "–")}</span></span>
        <span class="ri-meta"><span>${nf(pct, 0)} % of hours solved</span></span>
        <span class="meter" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
      b.addEventListener("click", () => { if (m.id !== state.run || !run()) selectRun(m.id); });
      host.appendChild(b);
    }
    $("run-count").textContent = String(MANIFEST.length);
  }

  function renderHead(r) {
    const i = r.info;
    $("run-head").innerHTML = `
      <h2>${esc(r.name)}</h2>
      <p class="note">${esc(r.note)}</p>
      <dl class="facts">
        <div><dt>Period</dt><dd>${period(r.days)} · ${r.days.length} days</dd></div>
        <div><dt>${term("Code version", "commit")}</dt><dd><span class="mono">${i.commit}</span> on <span class="mono">${i.branch}</span></dd></div>
        <div><dt>${term("Uncommitted changes", "dirty")}</dt><dd>${i.dirty.length ? `<span class="flag">${icon("warn")} ${i.dirty.map(f => `<span class="mono">${f}</span>`).join(", ")}</span>` : "None"}</dd></div>
        <div><dt>${term("Redispatch", "rd_setup")}</dt><dd>${i.power_flow}, ${i.solver}</dd></div>
        <div><dt>Ran by</dt><dd>${i.ran_by}</dd></div>
        <div><dt>Finished</dt><dd>${i.finished} · ${i.runtime}</dd></div>
      </dl>
      <p class="fineprint" style="margin:0">${i.commit_msg ? `Commit message: “${esc(i.commit_msg)}”. ` : ""}${i.reconstructed ? "This run was made before runs recorded their own info, so it was filled in by hand when it was published. " : ""}Published ${esc((r.meta.published || "").slice(0, 10))} by ${esc(r.meta.published_by || "–")}.</p>`;
  }

  function renderTabs(v) {
    const p = pairs(v.price.DA, v.real_price);
    const mae = mean(p.map(q => Math.abs(q[0] - q[1])));
    const solvedPct = 100 * v.status.reduce((a, b) => a + b, 0) / v.status.length;
    const hint = { price: `MAE ${nf(mae)} €/MWh`, status: `${nf(solvedPct, 0)} % solved` };
    const host = $("tabs"); host.innerHTML = "";
    TABS.forEach(([key, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.id = "tab-" + key;
      b.setAttribute("aria-selected", String(key === state.tab));
      b.tabIndex = key === state.tab ? 0 : -1;
      b.innerHTML = label + (hint[key] ? `<small>${hint[key]}</small>` : "");
      b.addEventListener("click", () => pickTab(key));
      b.addEventListener("keydown", ev => {
        const i = TABS.findIndex(x => x[0] === state.tab);
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
          const j = (i + (ev.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
          pickTab(TABS[j][0]); $("tab-" + TABS[j][0]).focus(); ev.preventDefault();
        }
      });
      host.appendChild(b);
    });
    document.querySelectorAll("[data-tabs]").forEach(el => { el.hidden = !el.dataset.tabs.split(" ").includes(state.tab); });
  }
  function pickTab(key) {
    if (key === state.tab) return;
    state.tab = key;
    try { localStorage.setItem("runviewer.tab", key); } catch (e) {}
    hideGloss();
    const v = view();
    renderTabs(v);
    // sections that were hidden have no width yet, so draw them now that they are visible
    renderPrice(v); renderMix(v); renderStatus(v); renderRedispatch(v); renderBalancing(v); renderGrid(v); renderPlants(v);
    // if the page was scrolled down, jump back to the top of the new tab's content
    const headBottom = $("run-head").getBoundingClientRect().bottom;
    if (headBottom < 0) window.scrollTo({ top: window.scrollY + headBottom + 16 });
  }



  // ---------- play through the hours ----------
  // key: "gh" (line map) or "ph" (plant map). The timer lives outside the render functions,
  // which rebuild the hour bar on every step.
  const players = {};
  const PLAYERS = {
    gh: { active: () => state.gridMode === "hour" && !$("sec-grid").hidden, get: () => state.gridHour,
          set: h => { state.gridHour = h; }, draw: () => renderGrid(view()) },
    ph: { active: () => state.plantSize !== "cap" && state.plantTime === "hour" && !$("sec-plants").hidden, get: () => state.plantHour,
          set: h => { state.plantHour = h; }, draw: () => renderPlants(view()) },
  };
  function stopPlay(key) { if (players[key]) { clearInterval(players[key].id); players[key] = null; } }
  function playControls(key) {
    const on = !!players[key];
    return `<button type="button" class="play" id="${key}-play" aria-pressed="${on}">${on ? "❚❚ Pause" : "▶ Play"}</button>
      <select id="${key}-speed" aria-label="Seconds per hour">${[0.5, 1, 2, 3].map(v => `<option value="${v}"${v === state.playSpeed ? " selected" : ""}>${v} s per hour</option>`).join("")}</select>`;
  }
  function wirePlay(key) {
    const P = PLAYERS[key];
    const bounds = () => { const r = view(); return [r.offset * 24, (r.offset + r.days.length) * 24]; };
    const start = () => {
      const runId = state.run;
      players[key] = { id: setInterval(() => {
        const [h0, h1] = bounds(), next = P.get() + 1;
        if (state.run !== runId || !P.active() || next >= h1) { stopPlay(key); P.draw(); return; }
        P.set(Math.max(h0, next)); P.draw();
      }, state.playSpeed * 1000) };
    };
    $(`${key}-play`).onclick = () => {
      if (players[key]) { stopPlay(key); P.draw(); return; }
      const [h0, h1] = bounds();
      if (P.get() >= h1 - 1) P.set(h0);  // at the end: start again from the first hour
      start(); P.draw();
    };
    $(`${key}-speed`).onchange = e => { state.playSpeed = +e.target.value; if (players[key]) { stopPlay(key); start(); } };
  }

  // ---------- grid map ----------
  const G = { outline: window.BASEMAP.outline, frame: null, corridors: [], runs: {} };  // corridors: the picked run's grid
  const G_BINS = [[25, "var(--ld-0)", "under 25 %"], [50, "var(--ld-1)", "25–50 %"], [75, "var(--ld-2)", "50–75 %"],
                  [90, "var(--ld-3)", "75–90 %"], [99.5, "var(--ld-4)", "90–99 %"], [Infinity, "var(--critical)", "at limit"]];
  const H_BINS = [[1, "var(--ld-0)", "0 h"], [3, "var(--ld-1)", "1–2 h"], [11, "var(--ld-2)", "3–10 h"],
                  [51, "var(--ld-3)", "11–50 h"], [Infinity, "var(--ld-4)", "over 50 h"]];
  const gridCache = {};
  function gridRun(id) {
    if (!gridCache[id]) {
      const g = G.runs[id], dec = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
      gridCache[id] = { H: g.hours, load: dec(g.load), flow: new Int16Array(dec(g.flow).buffer) };
    }
    return gridCache[id];
  }
  const binOf = (bins, v) => bins.find(b => v < b[0]);
  const gName = c => c.t === "trafo" ? c.names.join(" + ") : c.names.map(n => n.replace(/^LTGES/, "")).join(" + ");
  // map layers the Show buttons switch on and off
  const G_LAYERS = [["hv", "400 kV lines", "g_hv"], ["lv", "220 kV and lower", "g_lv"], ["trafo", "Transformers", "g_trafo"], ["border", "Border lines", "g_border"]];
  const gLayer = k => k.cls === "international" ? "border" : k.t === "trafo" ? "trafo" : (parseFloat(k.kv) >= 300 ? "hv" : "lv");
  const gShown = k => state.gridLayers.includes(gLayer(k));
  // the foreign end of a border line, from its position (the Portuguese border lies west of 5° W)
  const gCountry = k => k.a[0] / (111.32 * Math.cos(40 * Math.PI / 180)) < -5 ? "Portugal" : "France";
  const gType = k => k.t === "trafo" ? `Transformer ${k.kv} kV` : gLayer(k) === "border" ? `Border line to ${gCountry(k)}, ${k.kv} kV` : `${k.kv ?? "?"} kV line`;
  const gText = k => [gName(k), ...k.names, gType(k), ...k.ab].join(" ").toLowerCase();  // what the search matches
  const gOption = k => `${gName(k)} (${k.ab.join("–")})`;

  // per corridor over the shown period: highest loading (and when), hours ≥ 90 %, hours at the limit
  const statCache = {};
  function gridStats(r) {
    const key = `${r.id}|${r.offset}|${r.days.length}`;
    if (statCache[key]) return statCache[key];
    const gr = gridRun(r.id), H = gr.H, h0 = r.offset * 24, h1 = h0 + r.days.length * 24, C = G.corridors.length;
    const max = new Float32Array(C).fill(NaN), when = new Int32Array(C).fill(-1), n90 = new Int32Array(C), nlim = new Int32Array(C);
    for (let c = 0; c < C; c++) for (let h = h0; h < h1; h++) {
      const v = gr.load[c * H + h]; if (v === 255) continue;
      if (!(v <= max[c])) { max[c] = v; when[c] = h; }
      if (v >= 90) n90[c]++;
      if (v >= 99.5) nlim[c]++;
    }
    return (statCache[key] = { max, when, n90, nlim });
  }

  // select a line or transformer, switch its layer on and zoom the map to it
  function gridFocus(c, scroll) {
    const k = G.corridors[c], F = G.frame, l = gLayer(k);
    if (!state.gridLayers.includes(l)) state.gridLayers = [...state.gridLayers, l];
    state.gridSel = c;
    const w = k.t === "trafo" ? F[2] / 14 : Math.max(F[2] / 8, Math.abs(k.a[0] - k.b[0]) * 3);
    const cx = (k.a[0] + k.b[0]) / 2, cy = (k.a[1] + k.b[1]) / 2;
    mapVBs.grid = [cx - w / 2, cy - w * F[3] / F[2] / 2, w, w * F[3] / F[2]];
    renderGrid(view());
    if (scroll) $("grid-map").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function wireGridSearch() {
    const inp = $("grid-search");
    if (inp.dataset.wired) return;
    inp.dataset.wired = "1";
    let t = null;
    const pick = c => { inp.value = gName(G.corridors[c]); state.gridQuery = inp.value; state.gridAll = false; gridFocus(c, true); };
    inp.addEventListener("input", () => {
      const c = G.searchIdx && G.searchIdx.get(inp.value);
      if (c != null) return pick(c);  // picked from the suggestions
      clearTimeout(t);
      t = setTimeout(() => { state.gridQuery = inp.value; state.gridAll = false; renderGrid(view()); }, 200);
    });
    inp.addEventListener("keydown", ev => {
      if (ev.key !== "Enter") return;
      const q = inp.value.trim().toLowerCase();
      const c = q ? G.corridors.findIndex(k => gText(k).includes(q)) : -1;
      if (c >= 0) { state.gridQuery = inp.value; gridFocus(c, true); }
    });
  }

  function gridValues(r) {
    const gr = gridRun(r.id), H = gr.H, h0 = r.offset * 24, h1 = h0 + r.days.length * 24, C = G.corridors.length;
    const vals = new Float32Array(C).fill(NaN), when = new Int32Array(C).fill(-1);
    if (state.gridMode === "hour") {
      const h = state.gridHour;
      for (let c = 0; c < C; c++) { const v = gr.load[c * H + h]; if (v !== 255) vals[c] = v; }
    } else {
      for (let c = 0; c < C; c++) {
        let best = -1, bi = -1, n90 = 0, any = false;
        for (let h = h0; h < h1; h++) {
          const v = gr.load[c * H + h]; if (v === 255) continue;
          any = true; if (v > best) { best = v; bi = h; } if (v >= 90) n90++;
        }
        if (any) { vals[c] = state.gridMode === "max" ? best : n90; when[c] = bi; }
      }
    }
    return { vals, when, gr, h0, h1 };
  }

  function peakHour(r) {
    const gr = gridRun(r.id), H = gr.H, h0 = r.offset * 24, h1 = h0 + r.days.length * 24;
    let best = -1, bh = h0, C = G.corridors.length;
    for (let h = h0; h < h1; h++) { let s = 0, n = 0; for (let c = 0; c < C; c++) { const v = gr.load[c * H + h]; if (v !== 255 && v >= 90) s++; if (v !== 255) n++; } if (n && s > best) { best = s; bh = h; } }
    return bh;
  }

  function renderGrid(r) {
    if ($("sec-grid").hidden) return;
    seg($("grid-mode"), [["max", "Highest loading", "g_max"], ["h90", "Hours ≥ 90 %", "g_h90"], ["hour", "One hour", "g_hour"]], state.gridMode,
      v => { state.gridMode = v; renderGrid(view()); });
    seg($("grid-style"), [["plain", "Plain", "st_plain"], ["political", "Political", "st_political"], ["terrain", "Terrain", "st_terrain"], ["dark", "Dark", "st_dark"]],
      state.mapStyle, v => { state.mapStyle = v; try { localStorage.setItem("runviewer.mapStyle", v); } catch (e) {} renderGrid(view()); });
    const h0 = r.offset * 24, h1 = h0 + r.days.length * 24;
    if (state.gridMode === "hour" && (state.gridHour == null || state.gridHour < h0 || state.gridHour >= h1)) state.gridHour = peakHour(r);

    // hour bar
    const hb = $("grid-hour");
    hb.hidden = state.gridMode !== "hour";
    if (state.gridMode === "hour") {
      const rel = state.gridHour - h0, d = Math.floor(rel / 24), hr = rel % 24;
      const ok = r.status[rel] === 1;
      hb.innerHTML = `${playControls("gh")}
        <button type="button" id="gh-prev" aria-label="Previous hour">‹</button>
        <input type="range" id="gh-range" min="0" max="${h1 - h0 - 1}" value="${rel}" aria-label="Hour shown on the map">
        <button type="button" id="gh-next" aria-label="Next hour">›</button>
        <span class="gh-label">${dayLabel(r.days[d])}, ${hh(hr)}</span>
        <span class="status">${ok ? icon("good") + " AC solved" : icon("bad") + " AC failed"}</span>
        <button type="button" id="gh-peak">Busiest hour</button>
        <button type="button" id="gh-fail">Next failed hour</button>`;
      const go = rr => { stopPlay("gh"); state.gridHour = h0 + Math.max(0, Math.min(h1 - h0 - 1, rr)); renderGrid(view()); };
      wirePlay("gh");
      $("gh-range").addEventListener("input", e => go(+e.target.value));
      $("gh-prev").onclick = () => go(rel - 1);
      $("gh-next").onclick = () => go(rel + 1);
      $("gh-peak").onclick = () => { stopPlay("gh"); state.gridHour = peakHour(r); renderGrid(view()); };
      $("gh-fail").onclick = () => {
        const n = h1 - h0;
        for (let k = 1; k <= n; k++) { const j = (rel + k) % n; if (r.status[j] === 0) return go(j); }
      };
    }

    const bins = state.gridMode === "h90" ? H_BINS : G_BINS;
    $("grid-legend").className = "legend" + (state.mapStyle === "dark" ? " st-dark" : "");
    const SYM = {
      hv: `<svg width="18" height="10" aria-hidden="true"><line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`,
      lv: `<svg width="18" height="10" aria-hidden="true"><line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
      trafo: `<svg width="12" height="12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" fill="currentColor"/></svg>`,
      border: `<svg width="18" height="10" aria-hidden="true"><line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 2"/></svg>`,
    };
    const nOf = l => G.corridors.reduce((n, k) => n + (gLayer(k) === l), 0);
    $("grid-legend").innerHTML = `<div class="legend-row">` + bins.map(b => `<span><i class="lsw" style="background:${b[1]}"></i>${b[2] === "at limit" ? term("at limit", "g_limit") : b[2]}</span>`).join("")
      + `<span><svg width="12" height="12" aria-hidden="true"><path d="M6 1L11 6L6 11L1 6Z" fill="var(--soto)"/></svg>${term("Soto de Ribera", "soto")}</span></div>`
      + `<div class="legend-row"><span class="ctl-label">Show</span>` + G_LAYERS.map(([l, label, tk]) =>
          `<button type="button" class="chip layer" data-l="${l}" data-tip="${tk}" aria-pressed="${state.gridLayers.includes(l)}">${SYM[l]}${label}<span class="n">${nOf(l)}</span></button>`).join("") + `</div>`;
    $("grid-legend").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      const l = b.dataset.l;
      state.gridLayers = state.gridLayers.includes(l) ? state.gridLayers.filter(x => x !== l) : [...state.gridLayers, l];
      renderGrid(view());
    }));
    // search suggestions: rebuilt when the run (and so the grid) changes
    if (G.listFor !== r.id) {
      G.listFor = r.id;
      G.searchIdx = new Map(G.corridors.map((k, c) => [gOption(k), c]));
      $("grid-search-list").innerHTML = G.corridors.map(k => `<option value="${esc(gOption(k))}">${esc(gType(k))}</option>`).join("");
    }
    wireGridSearch();

    const { vals, when, gr } = gridValues(r);
    const C = G.corridors.length;
    const host = $("grid-map");
    const M = baseMap(host, "grid", "Map of the Spanish grid coloured by line loading");
    const F = M.F, tip = M.tip;

    // lines first, transformers on top; within each, the most loaded last so they stay visible
    const isTr = c => G.corridors[c].t === "trafo" ? 1 : 0;
    const order = [...Array(C).keys()].filter(c => gShown(G.corridors[c]))
      .sort((a, b) => isTr(a) - isTr(b) || (isNaN(vals[a]) ? -1 : vals[a]) - (isNaN(vals[b]) ? -1 : vals[b]));
    const gLines = svg("g", { "stroke-linecap": "round" }, M.data), gHit = svg("g", {}, M.data);
    const els = {};
    for (const c of order) {
      const k = G.corridors[c], v = vals[c], tr = k.t === "trafo";
      const col = isNaN(v) ? "var(--ld-0)" : binOf(bins, v)[1];
      const at = { x1: k.a[0], y1: k.a[1], x2: k.b[0], y2: k.b[1], "vector-effect": "non-scaling-stroke" };
      if (tr) {
        // both ends sit at one substation: a square of fixed screen size with a dark edge
        const g = svg("g", isNaN(v) ? { opacity: 0.55 } : {}, gLines);
        svg("line", { ...at, stroke: "var(--mp-sel)", "stroke-width": 11, "stroke-linecap": "square" }, g);
        svg("line", { ...at, stroke: col, "stroke-width": 8, "stroke-linecap": "square" }, g);
        els[c] = g;
      } else {
        const attrs = { ...at, stroke: col, "stroke-width": parseFloat(k.kv) >= 300 ? 2.4 : 1.2 };
        if (gLayer(k) === "border") attrs["stroke-dasharray"] = "5 2.5";
        if (isNaN(v)) attrs.opacity = 0.5;
        els[c] = svg("line", attrs, gLines);
      }
      svg("line", { ...at, class: "hit", "stroke-width": tr ? 14 : 10, "stroke-linecap": tr ? "square" : "butt", "data-c": c }, gHit);
    }
    if (state.gridSel != null && els[state.gridSel]) {
      const k = G.corridors[state.gridSel], tr = k.t === "trafo";
      svg("line", { x1: k.a[0], y1: k.a[1], x2: k.b[0], y2: k.b[1], stroke: "var(--mp-sel)", "stroke-width": tr ? 22 : 7, opacity: tr ? 0.35 : 0.3, "stroke-linecap": tr ? "square" : "round", "vector-effect": "non-scaling-stroke", "pointer-events": "none" }, gLines);
      gLines.appendChild(els[state.gridSel]);
    }
    M.rescale();

    const empty = !Array.prototype.some.call(vals, v => !isNaN(v));
    if (empty) {
      const n = document.createElement("div"); n.className = "map-note";
      n.innerHTML = state.gridMode === "hour" ? "The AC redispatch failed in this hour, so there are no line flows." : "No solved AC hours in the shown period.";
      host.appendChild(n);
    }

    // hover details
    gHit.addEventListener("pointermove", ev => {
      if (M.panning()) return;
      const c = +ev.target.getAttribute("data-c"); if (isNaN(c)) return;
      const k = G.corridors[c], v = vals[c];
      let rows = `<div class="row">${gType(k)}${k.names.length > 1 ? `<span class="v">${k.names.length} circuits</span>` : ""}</div>`;
      if (k.km) rows += `<div class="row">Length<span class="v">${nf(k.km, 0)} km</span></div>`;
      rows += `<div class="row">Between<span class="v">${k.ab[0]} – ${k.ab[1]}</span></div>`;
      rows += `<div class="row">Limit<span class="v">${nf(k.lim, 0)} MW</span></div>`;
      if (state.gridMode === "hour") {
        const f = gr.flow ? gr.flow[c * gr.H + state.gridHour] : v / 100 * k.lim;  // packages store loading, not flow
        rows += isNaN(v) ? `<div class="row">No flow in this hour</div>`
          : `<div class="row">Flow<span class="v">${nf(Math.abs(f), 0)} MW</span></div><div class="row">Loading<span class="v">${nf(v, 0)} %</span></div>`;
      } else if (!isNaN(v)) {
        const wh = when[c] - r.offset * 24;
        rows += state.gridMode === "max"
          ? `<div class="row">Highest loading<span class="v">${nf(v, 0)} %</span></div><div class="row">When<span class="v">${dayLabel(r.days[Math.floor(wh / 24)])}, ${hh(wh % 24)}</span></div>`
          : `<div class="row">Hours at ≥ 90 %<span class="v">${v} of ${r.status.reduce((a, b) => a + b, 0)}</span></div>`;
        rows += `<div class="row">Hours at limit<span class="v">${gridStats(r).nlim[c]}</span></div>`;
      }
      M.showTip(ev, `<b>${gName(k)}</b>${rows}`);
    });
    gHit.addEventListener("pointerleave", () => { tip.hidden = true; });
    gHit.addEventListener("click", ev => {
      if (M.panning()) return;
      const c = +ev.target.getAttribute("data-c"); if (isNaN(c)) return;
      state.gridSel = state.gridSel === c ? null : c; renderGrid(view());
    });

    // most-loaded list
    const unit = state.gridMode === "h90" ? "h" : "%";
    $("grid-top-title").textContent = state.gridMode === "h90" ? "Most hours at ≥ 90 %" : state.gridMode === "hour" ? "Most loaded in this hour" : "Highest loading in the period";
    const top = [...Array(C).keys()].filter(c => gShown(G.corridors[c]) && !isNaN(vals[c]) && vals[c] > 0).sort((a, b) => vals[b] - vals[a] || G.corridors[b].lim - G.corridors[a].lim).slice(0, 12);
    $("grid-top").innerHTML = `<thead><tr><th>Line</th><th>kV</th><th>${state.gridMode === "h90" ? "Hours" : "Loading"}</th></tr></thead><tbody>` +
      (top.length ? top.map(c => { const k = G.corridors[c]; return `<tr data-c="${c}" class="${state.gridSel === c ? "sel" : ""}"><td>${gName(k)}</td><td>${k.kv ?? "?"}</td><td><i class="lsw" style="background:${binOf(bins, vals[c])[1]};margin-right:6px"></i>${nf(vals[c], 0)} ${unit}</td></tr>`; }).join("")
        : `<tr><td colspan="3" style="color:var(--muted)">No data</td></tr>`) + "</tbody>";
    $("grid-top").querySelectorAll("tbody tr[data-c]").forEach(tr => tr.addEventListener("click", () => gridFocus(+tr.dataset.c)));

    // every line and transformer: sortable, follows the Show buttons and the search box
    const st = gridStats(r), q = state.gridQuery.trim().toLowerCase(), one = state.gridMode === "hour";
    const cols = [["name", "Name"], ["type", "Type"], ["lim", "Limit MW"], ...(one ? [["now", "This hour"]] : []),
                  ["max", "Highest loading"], ["n90", "Hours ≥ 90 %"], ["nlim", term("Hours at limit", "g_nlim")]];
    const val = { name: c => gName(G.corridors[c]), type: c => gType(G.corridors[c]), lim: c => G.corridors[c].lim,
                  now: c => vals[c], max: c => st.max[c], n90: c => st.n90[c], nlim: c => st.nlim[c] };
    let [sk, sd] = state.gridSort;
    if (!val[sk] || (sk === "now" && !one)) { sk = "max"; sd = -1; }
    const all = [...Array(C).keys()].filter(c => gShown(G.corridors[c]) && (!q || gText(G.corridors[c]).includes(q)));
    all.sort((a, b) => {
      const x = val[sk](a), y = val[sk](b);
      if (typeof x === "string") return sd * x.localeCompare(y);
      if (isNaN(x) || isNaN(y)) return isNaN(x) - isNaN(y);  // no data last
      return sd * (x - y) || G.corridors[b].lim - G.corridors[a].lim;
    });
    const LIMIT = 60, rows = state.gridAll ? all : all.slice(0, LIMIT);
    const pct = v => isNaN(v) ? "–" : `<i class="lsw" style="background:${binOf(G_BINS, v)[1]}"></i>${nf(v, 0)} %`;
    $("grid-table").innerHTML = `<thead><tr>${cols.map(([k2, l]) => `<th aria-sort="${sk === k2 ? (sd < 0 ? "descending" : "ascending") : "none"}"><button type="button" class="sort" data-k="${k2}">${l}${sk === k2 ? (sd < 0 ? " ↓" : " ↑") : ""}</button></th>`).join("")}</tr></thead><tbody>`
      + (rows.length ? rows.map(c => {
        const k = G.corridors[c], wh = st.when[c] - h0;
        return `<tr data-c="${c}" class="${state.gridSel === c ? "sel" : ""}"><td>${esc(gName(k))}<div class="sub">${k.ab.join(" – ")}</div></td><td>${gType(k)}</td><td>${nf(k.lim, 0)}</td>`
          + (one ? `<td>${pct(vals[c])}</td>` : "")
          + `<td>${pct(st.max[c])}${wh >= 0 ? `<div class="sub">${dayLabel(r.days[Math.floor(wh / 24)])}, ${hh(wh % 24)}</div>` : ""}</td><td>${st.n90[c]}</td><td>${st.nlim[c] ? `<b>${st.nlim[c]}</b>` : "0"}</td></tr>`;
      }).join("")
        : `<tr><td colspan="${cols.length}" style="color:var(--muted)">Nothing matches${q ? ` “${esc(q)}”` : ""}. Check the search box and the Show buttons above the map.</td></tr>`) + "</tbody>";
    $("grid-table-count").innerHTML = `${all.length.toLocaleString("en-GB")} of ${C.toLocaleString("en-GB")} · hours counted over the ${r.status.reduce((a, b) => a + b, 0)} solved AC hours in the period`
      + (all.length > LIMIT ? ` · <button type="button" class="linkbtn" id="grid-table-all">${state.gridAll ? `Show the first ${LIMIT}` : `Show all ${all.length.toLocaleString("en-GB")}`}</button>` : "");
    $("grid-table").querySelectorAll("button.sort").forEach(b => b.addEventListener("click", () => {
      const k2 = b.dataset.k;
      state.gridSort = [k2, state.gridSort[0] === k2 ? -state.gridSort[1] : (k2 === "name" || k2 === "type" ? 1 : -1)];
      renderGrid(view());
    }));
    $("grid-table").querySelectorAll("tbody tr[data-c]").forEach(tr => tr.addEventListener("click", () => gridFocus(+tr.dataset.c, true)));
    if ($("grid-table-all")) $("grid-table-all").onclick = () => { state.gridAll = !state.gridAll; renderGrid(view()); };
  }

  // ---------- shared map: basemap, cities, Soto de Ribera, zoom and drag ----------
  const mapVBs = {};  // each map keeps its own zoom
  function baseMap(host, key, label) {
    const F = G.frame;
    if (!mapVBs[key]) mapVBs[key] = F.slice();
    host.innerHTML = "";
    const s = svg("svg", { viewBox: mapVBs[key].join(" "), role: "img", "aria-label": label, preserveAspectRatio: "xMidYMid meet" }, host);
    s.style.aspectRatio = `${F[2]} / ${F[3]}`;
    const ML = window.MAP_LAYERS, st = state.mapStyle, plain = st === "plain", terrain = st === "terrain";
    host.className = "map st-" + st;
    const seaCol = plain ? "var(--sea)" : terrain ? "var(--mp-tsea)" : "var(--mp-sea)";
    svg("rect", { x: F[0] - 3 * F[2], y: F[1] - 3 * F[3], width: 7 * F[2], height: 7 * F[3], fill: seaCol }, s);
    const land = svg("g", {}, s);
    for (const [name, d] of Object.entries(G.outline)) {
      const fill = plain ? (name === "Spain" ? "var(--land)" : "var(--surface-2)")
        : name === "Spain" || name === "Portugal" ? (terrain ? "var(--mp-tland)" : "var(--mp-land)") : "var(--mp-land2)";
      svg("path", { d, fill, stroke: plain ? "var(--coast)" : "var(--mp-coast)", "stroke-width": 1, "vector-effect": "non-scaling-stroke" }, land);
    }
    if (terrain) {
      const defs = svg("defs", {}, s), cp = svg("clipPath", { id: "landclip-" + key }, defs);
      for (const d of Object.values(G.outline)) svg("path", { d }, cp);
      svg("image", { href: ML.relief.href, x: ML.relief.x, y: ML.relief.y, width: ML.relief.w, height: ML.relief.h,
        preserveAspectRatio: "none", "clip-path": `url(#landclip-${key})`, class: "rel" }, s);
    }
    if (!plain) {
      svg("path", { d: ML.provinces, fill: "none", stroke: "var(--mp-prov)", "stroke-width": 0.6, "vector-effect": "non-scaling-stroke" }, s);
      svg("path", { d: ML.regions, fill: "none", stroke: "var(--mp-reg)", "stroke-width": 1, opacity: 0.8, "vector-effect": "non-scaling-stroke" }, s);
    }
    const scaled = [];  // labels and markers keep their screen size when the map is zoomed
    if (!plain) {
      const gReg = svg("g", {}, s);
      for (const rl of ML.region_labels) {
        const tx = svg("text", { x: rl.x, y: rl.y, "text-anchor": "middle", class: "reg" }, gReg); tx.textContent = rl.name;
        scaled.push({ el: tx, fs: 9.5, sw: 3 });
      }
    }
    const data = svg("g", {}, s);  // the caller draws its layer here
    const gTop = svg("g", {}, s);  // cities and Soto de Ribera stay on top
    const OFFSET = { Oviedo: [5, -5, "start"], "San Sebastián": [5, -4, "start"], Porto: [-6, 3, "end"], Lisboa: [-6, 3, "end"], Vigo: [-6, 3, "end"] };
    if (!plain) for (const c of ML.cities) {
      const dot = svg("circle", { cx: c.x, cy: c.y, fill: "var(--mp-label)", stroke: "var(--mp-halo)", "pointer-events": "none" }, gTop);
      const [dx, dy, anchor] = OFFSET[c.name] || [5, 3, "start"];
      const tx = svg("text", { x: c.x, y: c.y, "text-anchor": anchor }, gTop); tx.textContent = c.name;
      scaled.push({ el: dot, r: c.rank === 1 ? 3 : 2.2, sw: 1, minZoom: c.rank === 3 ? 1.8 : 0 });
      scaled.push({ el: tx, fs: c.rank === 1 ? 11.5 : 10, sw: 3, dx, dy, x: c.x, y: c.y, weight: c.rank === 1 ? 600 : 400, minZoom: c.rank === 3 ? 1.8 : 0 });
    }
    {
      const so = ML.soto;
      const mk = svg("path", { fill: "var(--soto)", stroke: "var(--mp-halo)", "data-tip": "soto", tabindex: 0 }, gTop);
      mk.style.pointerEvents = "auto"; mk.style.cursor = "help";
      const tx = svg("text", { x: so.x, y: so.y, "text-anchor": "end", class: "soto" }, gTop); tx.textContent = "Soto de Ribera";
      scaled.push({ el: mk, diamond: 5.5, x: so.x, y: so.y, sw: 1.2 });
      scaled.push({ el: tx, fs: 10.5, sw: 3, dx: -8, dy: 12, x: so.x, y: so.y });
    }
    const rescale = () => {
      const vb = mapVBs[key], pxw = s.getBoundingClientRect().width || 600, k = vb[2] / pxw, zoom = F[2] / vb[2];
      for (const o of scaled) {
        if (o.minZoom) o.el.style.display = zoom >= o.minZoom ? "" : "none";
        if (o.fs) { o.el.setAttribute("font-size", o.fs * k); if (o.weight) o.el.setAttribute("font-weight", o.weight); }
        if (o.dx != null) { o.el.setAttribute("x", o.x + o.dx * k); o.el.setAttribute("y", o.y + o.dy * k); }
        if (o.r) o.el.setAttribute("r", o.r * k);
        if (o.diamond) { const a = o.diamond * k; o.el.setAttribute("d", `M${o.x},${o.y - a}L${o.x + a},${o.y}L${o.x},${o.y + a}L${o.x - a},${o.y}Z`); }
        o.el.setAttribute("stroke-width", o.sw * k);
      }
    };

    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true;
    const tools = document.createElement("div"); tools.className = "map-tools";
    tools.innerHTML = `<button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Zoom out">−</button><button type="button" aria-label="Show all of Spain" style="font-size:12px">⤢</button>`;
    host.appendChild(tools); host.appendChild(tip);
    const setVB = vb => { mapVBs[key] = vb; s.setAttribute("viewBox", vb.join(" ")); rescale(); };
    const zoomAt = (f, cx, cy) => {
      const [x, y, w, h] = mapVBs[key], nw = Math.min(F[2] * 1.2, Math.max(F[2] / 25, w * f)), nh = nw * h / w;
      setVB([cx - (cx - x) * nw / w, cy - (cy - y) * nh / h, nw, nh]);
    };
    const ctr = () => { const v = mapVBs[key]; return [v[0] + v[2] / 2, v[1] + v[3] / 2]; };
    const [bIn, bOut, bAll] = tools.querySelectorAll("button");
    bIn.onclick = () => zoomAt(0.6, ...ctr()); bOut.onclick = () => zoomAt(1 / 0.6, ...ctr()); bAll.onclick = () => setVB(F.slice());
    const toSvg = ev => { const r0 = s.getBoundingClientRect(), v = mapVBs[key], k = v[2] / r0.width; return [v[0] + (ev.clientX - r0.left) * k, v[1] + (ev.clientY - r0.top) * k]; };
    s.addEventListener("wheel", ev => { if (!(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); zoomAt(ev.deltaY < 0 ? 0.8 : 1.25, ...toSvg(ev)); }, { passive: false });
    s.addEventListener("dblclick", ev => zoomAt(0.5, ...toSvg(ev)));
    let pan = null;
    s.addEventListener("pointerdown", ev => { if (ev.button !== 0) return; pan = { x: ev.clientX, y: ev.clientY, vb: mapVBs[key].slice(), moved: false }; s.setPointerCapture(ev.pointerId); });
    s.addEventListener("pointermove", ev => {
      if (!pan) return;
      const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { pan.moved = true; s.classList.add("panning"); tip.hidden = true; }
      if (!pan.moved) return;
      const k = mapVBs[key][2] / s.getBoundingClientRect().width;
      setVB([pan.vb[0] - dx * k, pan.vb[1] - dy * k, pan.vb[2], pan.vb[3]]);
    });
    const endPan = () => { setTimeout(() => { pan = null; }, 0); s.classList.remove("panning"); };
    s.addEventListener("pointerup", endPan); s.addEventListener("pointercancel", endPan);
    const showTip = (ev, html) => {
      tip.innerHTML = html; tip.hidden = false;
      const hr = host.getBoundingClientRect(), tw = tip.offsetWidth;
      let left = ev.clientX - hr.left + 14; if (left + tw > hr.width) left = ev.clientX - hr.left - tw - 14;
      tip.style.left = Math.max(4, left) + "px"; tip.style.top = Math.max(4, ev.clientY - hr.top - 10) + "px";
    };
    return {
      s, F, data, tip, scaled, rescale, showTip,
      panning: () => !!(pan && pan.moved),
      zoomTo: (cx, cy, w) => { mapVBs[key] = [cx - w / 2, cy - w * F[3] / F[2] / 2, w, w * F[3] / F[2]]; },
    };
  }

  // ---------- power plants map ----------
  const PD = { groups: [], runs: {} };  // groups: the picked run's plants
  const PLANT_FUELS = ["Nuclear", "Coal", "Gas", "Hydro", "Wind", "Solar", "Biomass", "Imports"];
  const PLANT_COLOR = { Hydro: "var(--cat-1)", Gas: "var(--cat-2)", Wind: "var(--cat-3)", Solar: "var(--cat-4)",
    Biomass: "var(--cat-5)", Imports: "var(--cat-6)", Nuclear: "var(--cat-7)", Coal: "var(--cat-8)" };
  const plantCache = {};
  function plantRun(id) {
    if (!plantCache[id]) {
      const g = PD.runs[id], dec = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
      const out = dec(g.out), chg = new Int8Array(dec(g.chg).buffer);
      let maxChg = 1;
      PD.groups.forEach((p, i) => { for (let h = 0; h < g.hours; h++) { const v = chg[i * g.hours + h]; if (v !== -128) maxChg = Math.max(maxChg, Math.abs(v) / 127 * p.cap); } });
      plantCache[id] = { H: g.hours, out, chg, maxChg };
    }
    return plantCache[id];
  }
  let maxCap = 1;  // largest plant group of the picked run
  // real names: a plant group at the same substation and fuel as an ENTSO-E site takes the site's name
  const plantName = p => { const s = PD.siteOf && PD.siteOf.get(`${p.x},${p.y},${p.f}`); return s == null ? null : RP.sites[s].name; };
  const plantOption = (p, i) => `${plantName(p) ? plantName(p) + " — " : ""}${p.f}${p.tech && p.tech.toLowerCase() !== p.f.toLowerCase() ? " " + p.tech : ""} at ${p.bus}, ${nf(p.cap, 0)} MW`;
  function plantFocus(i) {
    const p = PD.groups[i], F = G.frame, realMode = state.plantSize === "real" || state.plantSize === "realout";
    const s = PD.siteOf.get(`${p.x},${p.y},${p.f}`);
    if (realMode && s == null) state.plantSize = "cap";  // no ENTSO-E data for this plant: show it on the capacity map
    state.plantHidden = state.plantHidden.filter(f => f !== p.f);
    state.plantSel = state.plantSize === "real" || state.plantSize === "realout" ? "s" + s : i;
    const w = F[2] / 10;
    mapVBs.plants = [p.x - w / 2, p.y - w * F[3] / F[2] / 2, w, w * F[3] / F[2]];
    renderPlants(view());
    $("plant-map").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function wirePlantSearch() {
    const inp = $("plant-search");
    if (inp.dataset.wired) return;
    inp.dataset.wired = "1";
    inp.addEventListener("input", () => {
      const i = PD.searchIdx && PD.searchIdx.get(inp.value);
      if (i != null) { inp.value = plantName(PD.groups[i]) || `${PD.groups[i].f} at ${PD.groups[i].bus}`; plantFocus(i); }
    });
    inp.addEventListener("keydown", ev => {
      if (ev.key !== "Enter") return;
      const q = inp.value.trim().toLowerCase();
      if (!q) return;
      // biggest matching plant first
      let best = -1;
      PD.groups.forEach((p, i) => { if (plantOption(p, i).toLowerCase().includes(q) && (best < 0 || p.cap > PD.groups[best].cap)) best = i; });
      if (best >= 0) plantFocus(best);
    });
  }
  function plantValues(r) {
    const pr = plantRun(r.id), H = pr.H, h0 = r.offset * 24, h1 = h0 + r.days.length * 24, N = PD.groups.length;
    const vals = new Float32Array(N).fill(NaN), size = state.plantSize, one = state.plantTime === "hour";
    for (let i = 0; i < N; i++) {
      const cap = PD.groups[i].cap;
      if (size === "cap") { vals[i] = cap; continue; }
      const read = h => { const v = size === "out" ? pr.out[i * H + h] : pr.chg[i * H + h];
        return size === "out" ? (v === 255 ? NaN : v / 250 * cap) : (v === -128 ? NaN : v / 127 * cap); };
      if (one) { vals[i] = read(state.plantHour); continue; }
      let s = 0, n = 0;
      for (let h = h0; h < h1; h++) { const v = read(h); if (!isNaN(v)) { s += v; n++; } }
      if (n) vals[i] = s / n;
    }
    return { vals, pr, h0, h1 };
  }
  function plantBusiestHour(r) {
    const pr = plantRun(r.id), H = pr.H, h0 = r.offset * 24, h1 = h0 + r.days.length * 24;
    let best = -1, bh = h0;
    for (let h = h0; h < h1; h++) {
      let s = 0, any = false;
      PD.groups.forEach((p, i) => { const v = pr.chg[i * H + h]; if (v !== -128) { any = true; s += Math.abs(v) / 127 * p.cap; } });
      if (any && s > best) { best = s; bh = h; }
    }
    return bh;
  }


  // ---------- real vs model per plant (ENTSO-E actual generation per unit) ----------
  const RP = { sites: [], coverage: {}, runs: {} };  // ENTSO-E sites, from the picked run's package
  const realCache = {};
  function realRun(id) {
    if (!realCache[id]) {
      const g = RP.runs[id], dec = s => new Uint16Array(Uint8Array.from(atob(s), ch => ch.charCodeAt(0)).buffer);
      realCache[id] = { H: g.hours, model: dec(g.model), real: dec(g.real) };
    }
    return realCache[id];
  }
  // two views of the ENTSO-E plants: "realout" = real output only, "real" = model minus real
  function renderRealVsModel(r, one, h0, h1) {
    const rr = realRun(r.id), H = rr.H, S = RP.sites.length, NA = 65535;
    const only = state.plantSize === "realout";
    // model and real over the hours that have both (for the comparison and the hover)
    const md = new Float32Array(S).fill(NaN), rl = new Float32Array(S).fill(NaN);
    // real alone over every hour ENTSO-E has, failed AC hours included (for "Real output")
    const ro = new Float32Array(S).fill(NaN);
    for (let s = 0; s < S; s++) {
      if (one) {
        const a = rr.model[s * H + state.plantHour], b = rr.real[s * H + state.plantHour];
        if (b !== NA) ro[s] = b;
        if (a !== NA && b !== NA) { md[s] = a; rl[s] = b; }
        continue;
      }
      let sa = 0, sb = 0, n = 0, so = 0, no = 0;
      for (let h = h0; h < h1; h++) {
        const a = rr.model[s * H + h], b = rr.real[s * H + h];
        if (b !== NA) { so += b; no++; }
        if (a !== NA && b !== NA) { sa += a; sb += b; n++; }
      }
      if (n) { md[s] = sa / n; rl[s] = sb / n; }
      if (no) ro[s] = so / no;
    }
    const value = s => only ? ro[s] : md[s] - rl[s];
    const fuels = PLANT_FUELS.filter(f => RP.sites.some(x => x.f === f));
    const shown = [...RP.sites.keys()].filter(s => !isNaN(value(s)) && !state.plantHidden.includes(RP.sites[s].f));
    let ref = only ? maxCap : 1;
    if (!only) shown.forEach(s => { ref = Math.max(ref, Math.abs(value(s))); });
    const RMAX = only ? 22 : 24, radius = v => Math.max(only ? 1.8 : 2, RMAX * Math.sqrt(Math.abs(v) / ref));
    const niceFloor = x => { const m = 10 ** Math.floor(Math.log10(x)); return [5, 2, 1].map(k => k * m).find(v => v <= x) || m; };
    const sizes = only ? [100, 500, 2000] : [...new Set([ref / 25, ref / 5, ref].map(niceFloor))];

    const cov = RP.coverage;
    const covText = fuels.map(f => `${f.toLowerCase()} ${Math.round(100 * cov[f].matched / cov[f].total)} %`).join(", ");
    const sizeSvg = sizes.map(mw => { const q = radius(mw); return `<span><svg width="${2 * q + 2}" height="${2 * q + 2}" aria-hidden="true"><circle cx="${q + 1}" cy="${q + 1}" r="${q}" fill="none" stroke="var(--ink-2)"/></svg>${mw.toLocaleString("en-GB")} MW</span>`; }).join("");
    $("plant-legend").innerHTML = `<div class="legend-row">` + fuels.map(f => `<button type="button" class="chip" data-f="${f}" aria-pressed="${!state.plantHidden.includes(f)}"><i style="background:${PLANT_COLOR[f]}"></i>${f}</button>`).join("") + `</div>`
      + `<div class="legend-row sizes">${sizeSvg}`
      + (only ? "" : `<span class="legend-gap"></span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--ink-2)"/></svg>${term("model above real", "p_above")}</span>`
        + `<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink-2)" stroke-width="1.8"/></svg>${term("model below real", "p_below")}</span>`) + `</div>`
      + `<div class="legend-note">${RP.sites.length} sites with ${term("ENTSO-E unit data", "p_entsoe")}, covering ${covText} of the model's capacity. Wind, smaller plants and imports have no per-unit data.</div>`;
    $("plant-legend").className = "legend" + (state.mapStyle === "dark" ? " st-dark" : "");
    $("plant-legend").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      const f = b.dataset.f;
      state.plantHidden = state.plantHidden.includes(f) ? state.plantHidden.filter(x => x !== f) : [...state.plantHidden, f];
      renderPlants(view());
    }));

    const host = $("plant-map");
    const M = baseMap(host, "plants", only ? "Map of the real output of plants ENTSO-E reports one by one" : "Map of plants with real output, sized by the model's error");
    const order = [...shown].sort((a, b) => Math.abs(value(b)) - Math.abs(value(a)));
    const gP = svg("g", {}, M.data);
    for (const s of order) {
      const site = RP.sites[s], v = value(s), ring = !only && v < 0, zero = only && v < 0.5;
      const c = svg("circle", { cx: site.x, cy: site.y, "data-s": s, fill: ring ? "transparent" : PLANT_COLOR[site.f],
        stroke: ring ? PLANT_COLOR[site.f] : "var(--mp-halo)", opacity: zero ? 0.35 : 0.9 }, gP);
      c.style.cursor = "pointer";
      M.scaled.push({ el: c, r: zero ? 1.4 : radius(v), sw: ring ? 2 : 0.8 });
      if (state.plantSel === "s" + s) M.scaled.push({ el: svg("circle", { cx: site.x, cy: site.y, fill: "none", stroke: "var(--mp-sel)", "pointer-events": "none" }, gP), r: radius(v) + 4, sw: 2 });
    }
    M.rescale();
    if (!shown.length) {
      const n = document.createElement("div"); n.className = "map-note";
      n.innerHTML = only ? "ENTSO-E has no data for this choice."
        : one && r.status[state.plantHour - h0] === 0 ? "The AC redispatch failed in this hour, so there is no model output to compare." : "No hours with both model and real data in this period.";
      host.appendChild(n);
    }

    const mw = v => isNaN(v) ? "–" : nf(v, 0) + " MW";
    const avg = one ? "" : " (average)";
    gP.addEventListener("pointermove", ev => {
      if (M.panning()) return;
      const s = +ev.target.getAttribute("data-s"); if (isNaN(s)) return;
      const site = RP.sites[s];
      const rows = (only
        ? `<div class="row">Real (ENTSO-E)${avg}<span class="v">${mw(ro[s])}</span></div>
           <div class="row">Model${avg}<span class="v">${isNaN(md[s]) ? "AC failed" : mw(md[s])}</span></div>`
        : `<div class="row">Model${avg}<span class="v">${mw(md[s])}</span></div>
           <div class="row">Real (ENTSO-E)${avg}<span class="v">${mw(rl[s])}</span></div>
           <div class="row">Difference<span class="v">${signed(value(s), 0)} MW</span></div>`)
        + `<div class="row">Model capacity<span class="v">${mw(site.cap)} · ${site.model_units} unit${site.model_units > 1 ? "s" : ""}</span></div>
        <div class="row">ENTSO-E units<span class="v">${site.entsoe.length > 4 ? site.entsoe.slice(0, 4).join(", ") + ", …" : site.entsoe.join(", ")}</span></div>
        <div class="row">Match<span class="v">${site.conf === "sure" ? "sure" : "probable (from the unit code)"}</span></div>`;
      M.showTip(ev, `<b><i class="sw-box" style="background:${PLANT_COLOR[site.f]};margin-right:6px"></i>${site.name}</b>${rows}`);
    });
    gP.addEventListener("pointerleave", () => { M.tip.hidden = true; });
    gP.addEventListener("click", ev => {
      if (M.panning()) return;
      const s = +ev.target.getAttribute("data-s"); if (isNaN(s)) return;
      state.plantSel = state.plantSel === "s" + s ? null : "s" + s; renderPlants(view());
    });

    $("plant-top-title").textContent = only ? "Largest real output" : "Biggest differences, model − real";
    $("plant-top").innerHTML = `<thead><tr><th>Plant</th><th>${only ? "Real" : "Model − real"}</th></tr></thead><tbody>` +
      (order.length ? order.slice(0, 12).map(s => {
        const site = RP.sites[s];
        const sub = only ? `model ${isNaN(md[s]) ? "–" : nf(md[s], 0)} MW` : `model ${nf(md[s], 0)} · real ${nf(rl[s], 0)} MW`;
        return `<tr data-s="${s}" class="${state.plantSel === "s" + s ? "sel" : ""}"><td class="wrap"><i class="sw-box" style="background:${PLANT_COLOR[site.f]};margin-right:6px"></i>${site.name}<div class="sub">${sub}</div></td><td>${only ? mw(ro[s]) : signed(value(s), 0) + " MW"}</td></tr>`;
      }).join("") : `<tr><td colspan="2" style="color:var(--muted)">No data</td></tr>`) + "</tbody>";
    $("plant-top").querySelectorAll("tbody tr[data-s]").forEach(tr => tr.addEventListener("click", () => {
      const s = +tr.dataset.s, site = RP.sites[s];
      state.plantSel = "s" + s;
      M.zoomTo(site.x, site.y, M.F[2] / 5);
      renderPlants(view());
    }));
  }

  function renderPlants(r) {
    if ($("sec-plants").hidden) return;
    wirePlantSearch();
    seg($("plant-size"), [["cap", "Installed capacity", "p_cap"], ["out", "Output", "p_out"], ["chg", "Redispatch change", "p_chg"], ["realout", "Real output", "p_realout"], ["real", "Real vs model", "p_real"]], state.plantSize,
      v => { state.plantSize = v; renderPlants(view()); });
    const timeHost = $("plant-time");
    timeHost.hidden = state.plantSize === "cap";
    seg(timeHost, [["period", "Average over period", "p_period"], ["hour", "One hour", "p_hour"]], state.plantTime,
      v => { state.plantTime = v; renderPlants(view()); });
    seg($("plant-style"), [["plain", "Plain", "st_plain"], ["political", "Political", "st_political"], ["terrain", "Terrain", "st_terrain"], ["dark", "Dark", "st_dark"]],
      state.mapStyle, v => { state.mapStyle = v; try { localStorage.setItem("runviewer.mapStyle", v); } catch (e) {} renderPlants(view()); });

    const h0 = r.offset * 24, h1 = h0 + r.days.length * 24;
    const one = state.plantSize !== "cap" && state.plantTime === "hour";
    if (one && (state.plantHour == null || state.plantHour < h0 || state.plantHour >= h1)) state.plantHour = plantBusiestHour(r);
    const hb = $("plant-hour");
    hb.hidden = !one;
    if (one) {
      const rel = state.plantHour - h0, d = Math.floor(rel / 24), hr = rel % 24, ok = r.status[rel] === 1;
      hb.innerHTML = `${playControls("ph")}
        <button type="button" id="ph-prev" aria-label="Previous hour">‹</button>
        <input type="range" id="ph-range" min="0" max="${h1 - h0 - 1}" value="${rel}" aria-label="Hour shown on the plant map">
        <button type="button" id="ph-next" aria-label="Next hour">›</button>
        <span class="gh-label">${dayLabel(r.days[d])}, ${hh(hr)}</span>
        <span class="status">${ok ? icon("good") + " AC solved" : icon("bad") + " AC failed"}</span>
        ${state.plantSize === "real" || state.plantSize === "realout" ? "" : `<button type="button" id="ph-busy">Biggest redispatch hour</button>`}
        <button type="button" id="ph-fail">Next failed hour</button>`;
      const go = rr => { stopPlay("ph"); state.plantHour = h0 + Math.max(0, Math.min(h1 - h0 - 1, rr)); renderPlants(view()); };
      wirePlay("ph");
      $("ph-range").addEventListener("input", e => go(+e.target.value));
      $("ph-prev").onclick = () => go(rel - 1);
      $("ph-next").onclick = () => go(rel + 1);
      if ($("ph-busy")) $("ph-busy").onclick = () => { stopPlay("ph"); state.plantHour = plantBusiestHour(r); renderPlants(view()); };
      $("ph-fail").onclick = () => { const n = h1 - h0; for (let k = 1; k <= n; k++) { const j = (rel + k) % n; if (r.status[j] === 0) return go(j); } };
    }

    if (state.plantSize === "real" || state.plantSize === "realout") return renderRealVsModel(r, one, h0, h1);
    const { vals, pr } = plantValues(r);
    const chg = state.plantSize === "chg";
    // circle area ∝ MW; changes are scaled to the largest change shown, so period averages stay visible
    let ref = maxCap;
    if (chg) { ref = 1; vals.forEach((v, i) => { if (!isNaN(v) && !state.plantHidden.includes(PD.groups[i].f)) ref = Math.max(ref, Math.abs(v)); }); }
    const RMAX = 22;
    const radius = v => Math.max(1.8, RMAX * Math.sqrt(Math.abs(v) / ref));
    const niceFloor = x => { const m = 10 ** Math.floor(Math.log10(x)); return [5, 2, 1].map(k => k * m).find(v => v <= x) || m; };

    // legend: clickable fuels + circle sizes
    const sizes = chg ? [...new Set([ref / 25, ref / 5, ref].map(niceFloor))] : [100, 500, 2000];
    const sizeSvg = sizes.map(mw => { const rr = radius(mw); return `<span><svg width="${2 * rr + 2}" height="${2 * rr + 2}" aria-hidden="true"><circle cx="${rr + 1}" cy="${rr + 1}" r="${rr}" fill="none" stroke="var(--ink-2)"/></svg>${mw.toLocaleString("en-GB")} MW</span>`; }).join("");
    // two rows: the fuel buttons, then the circle sizes (and up/down) on one line underneath
    $("plant-legend").innerHTML = `<div class="legend-row">` + PLANT_FUELS.map(f => `<button type="button" class="chip" data-f="${f}" aria-pressed="${!state.plantHidden.includes(f)}"><i style="background:${PLANT_COLOR[f]}"></i>${f}</button>`).join("") + `</div>`
      + `<div class="legend-row sizes">` + sizeSvg
      + (chg ? `<span class="legend-gap"></span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--ink-2)"/></svg>${term("turned up", "p_up")}</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink-2)" stroke-width="1.8"/></svg>${term("turned down", "p_down")}</span>` : "") + `</div>`;
    $("plant-legend").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      const f = b.dataset.f;
      state.plantHidden = state.plantHidden.includes(f) ? state.plantHidden.filter(x => x !== f) : [...state.plantHidden, f];
      renderPlants(view());
    }));
    $("plant-legend").className = "legend" + (state.mapStyle === "dark" ? " st-dark" : "");

    const host = $("plant-map");
    const M = baseMap(host, "plants", "Map of the power plants in the model");
    const shown = [...PD.groups.keys()].filter(i => !state.plantHidden.includes(PD.groups[i].f) && !isNaN(vals[i]) && (!chg || Math.abs(vals[i]) >= 1));
    shown.sort((a, b) => Math.abs(vals[b]) - Math.abs(vals[a]));  // big ones first, small ones on top
    const gP = svg("g", {}, M.data);
    for (const i of shown) {
      const p = PD.groups[i], v = vals[i], down = chg && v < 0, zero = !chg && v < 0.5;
      const c = svg("circle", { cx: p.x, cy: p.y, "data-i": i, fill: down ? "transparent" : PLANT_COLOR[p.f],
        stroke: down ? PLANT_COLOR[p.f] : "var(--mp-halo)", opacity: zero ? 0.35 : 0.9 }, gP);
      c.style.cursor = "pointer";
      M.scaled.push({ el: c, r: zero ? 1.4 : radius(v), sw: down ? 1.8 : 0.8 });
      if (state.plantSel === i) M.scaled.push({ el: svg("circle", { cx: p.x, cy: p.y, fill: "none", stroke: "var(--mp-sel)", "pointer-events": "none" }, gP), r: radius(v) + 4, sw: 2 });
    }
    M.rescale();
    if (!shown.length) {
      const n = document.createElement("div"); n.className = "map-note";
      n.innerHTML = one && r.status[state.plantHour - h0] === 0 ? "The AC redispatch failed in this hour, so there is no redispatch output." : "Nothing to show for this choice.";
      host.appendChild(n);
    }

    const what = state.plantSize === "cap" ? "Capacity" : state.plantSize === "out" ? (one ? "Output this hour" : "Average output") : (one ? "Change this hour" : "Average change");
    const mw = v => (chg ? signed(v, 0) : nf(v, 0)) + " MW";
    gP.addEventListener("pointermove", ev => {
      if (M.panning()) return;
      const i = +ev.target.getAttribute("data-i"); if (isNaN(i)) return;
      const p = PD.groups[i];
      let rows = `<div class="row">Type<span class="v">${p.tech || p.f.toLowerCase()}</span></div>
        <div class="row">Substation<span class="v">${p.bus}</span></div>
        <div class="row">Capacity<span class="v">${nf(p.cap, 0)} MW${p.n > 1 ? ` · ${p.n} units` : ""}</span></div>`;
      if (state.plantSize !== "cap") rows += `<div class="row">${what}<span class="v">${mw(vals[i])}</span></div>`;
      if (chg) rows += `<div class="row">${vals[i] > 0 ? "Turned up by the grid stage" : "Turned down by the grid stage"}</div>`;
      M.showTip(ev, `<b><i class="sw-box" style="background:${PLANT_COLOR[p.f]};margin-right:6px"></i>${plantName(p) ? esc(plantName(p)) + " · " : ""}${p.f}</b>${rows}`);
    });
    gP.addEventListener("pointerleave", () => { M.tip.hidden = true; });
    gP.addEventListener("click", ev => {
      if (M.panning()) return;
      const i = +ev.target.getAttribute("data-i"); if (isNaN(i)) return;
      state.plantSel = state.plantSel === i ? null : i; renderPlants(view());
    });

    // list beside the map
    $("plant-top-title").textContent = state.plantSize === "cap" ? "Largest plants" : chg ? "Largest redispatch changes" : "Largest output";
    const top = shown.slice(0, 12);
    $("plant-top").innerHTML = `<thead><tr><th>Plant</th><th>${chg ? "Change" : "MW"}</th></tr></thead><tbody>` +
      (top.length ? top.map(i => { const p = PD.groups[i]; return `<tr data-i="${i}" class="${state.plantSel === i ? "sel" : ""}"><td class="wrap"><i class="sw-box" style="background:${PLANT_COLOR[p.f]};margin-right:6px"></i>${plantName(p) ? esc(plantName(p)) : p.f + " · " + p.bus}</td><td>${mw(vals[i])}</td></tr>`; }).join("")
        : `<tr><td colspan="2" style="color:var(--muted)">No data</td></tr>`) + "</tbody>";
    $("plant-top").querySelectorAll("tbody tr[data-i]").forEach(tr => tr.addEventListener("click", () => {
      const i = +tr.dataset.i, p = PD.groups[i];
      state.plantSel = i;
      M.zoomTo(p.x, p.y, M.F[2] / 5);
      renderPlants(view());
    }));
  }

  function renderPeriod() {
    const r = run(), nd = r.days.length, z = state.zoom || [0, nd - 1], len = z[1] - z[0] + 1;
    const opts = selI => r.days.map((d, i) => `<option value="${i}"${i === selI ? " selected" : ""}>${dayLabel(d)}</option>`).join("");
    const el = $("period");
    el.classList.toggle("zoomed", !!state.zoom);
    el.innerHTML = `<span class="p-label">Showing</span>
      <select id="p-from" aria-label="First day shown">${opts(z[0])}</select><span>to</span>
      <select id="p-to" aria-label="Last day shown">${opts(z[1])}</select>
      <span class="p-count">${len} of ${nd} days</span>
      <button type="button" id="p-prev" aria-label="Show the previous ${len} days" ${z[0] === 0 || !state.zoom ? "disabled" : ""}>← Earlier</button>
      <button type="button" id="p-next" aria-label="Show the next ${len} days" ${z[1] === nd - 1 || !state.zoom ? "disabled" : ""}>Later →</button>
      <button type="button" id="p-reset" ${state.zoom ? "" : "disabled"}>Show all days</button>
      <span class="p-hint">Drag across a chart to zoom in, or click a day in the solve grid.</span>`;
    $("p-from").onchange = e => { const a = +e.target.value; setZoom(a, Math.max(a, z[1])); };
    $("p-to").onchange = e => { const b = +e.target.value; setZoom(Math.min(z[0], b), b); };
    $("p-prev").onclick = () => { const a = Math.max(0, z[0] - len); setZoom(a, a + len - 1); };
    $("p-next").onclick = () => { const b = Math.min(nd - 1, z[1] + len); setZoom(b - len + 1, b); };
    $("p-reset").onclick = () => setZoom(0, nd - 1);
  }

  function renderKpis(r) {
    const solved = r.status.reduce((a, b) => a + b, 0), N = r.status.length, pct = 100 * solved / N;
    const p = pairs(r.price.DA, r.real_price);
    const mm = mean(p.map(q => q[0])), mr = mean(p.map(q => q[1]));
    const mae = mean(p.map(q => Math.abs(q[0] - q[1])));
    const c = corr(p);
    const shed = r.shed.reduce((a, x) => a + Math.abs(x || 0), 0);
    const [k, word] = solveStatus(pct);
    const tiles = [
      [term("AC hours solved", "solved"), `${nf(pct, 0)}<small>%</small>`, `<span class="status">${icon(k)} ${word}</span> · ${solved} of ${N} hours`],
      [term("Mean day-ahead price", "meanprice"), `${nf(mm)}<small>€/MWh</small>`, `Real: ${nf(mr)} €/MWh`],
      [term("Price bias", "bias"), `${signed(mm - mr)}<small>€/MWh</small>`, mm < mr ? "Model below real" : "Model above real"],
      [term("Price error (MAE)", "mae"), `${nf(mae)}<small>€/MWh</small>`, "Typical size of the hourly error"],
      [term("Price correlation", "corr"), `${nf(c, 2)}`, "Hourly, model vs real (1 = same shape)"],
      [term("Load shed", "shed"), `${nf(shed / 1000, 1)}<small>GWh</small>`, "In the solved redispatch hours"],
    ];
    $("kpis").innerHTML = tiles.map(([l, v, s]) => `<div class="kpi"><span class="k-label">${l}</span><span class="k-value">${v}</span><span class="k-sub">${s}</span></div>`).join("");
  }

  function renderPrice(r) {
    seg($("price-stage"), PRICE_STAGES.map(s => [s, s, s]), state.priceStage, v => { state.priceStage = v; renderPrice(view()); });
    seg($("price-res"), [["hour", "Hourly"], ["day", "Daily mean"]], state.priceRes, v => { state.priceRes = v; renderPrice(view()); });
    $("price-legend").innerHTML = `<span><i class="sw-line" style="background:var(--real)"></i>${term("Real (OMIE day-ahead)", "real_price")}</span>
      <span><i class="sw-line" style="background:var(--model)"></i>${term(`Model (${state.priceStage})`, state.priceStage)}</span>
      <span><i class="sw-box" style="background:var(--critical)"></i>${term("AC redispatch failed", "failed")}</span>`;
    const host = $("price-chart");
    const nd = r.days.length, hourly = state.priceRes === "hour";
    const model = r.price[state.priceStage], real = r.real_price;
    const failed = r.status.map(s => 1 - s);
    const mv = hourly ? model : dailyMean(model, nd);
    const rv = hourly ? real : dailyMean(real, nd);
    const band = hourly ? failed : dailyMean(failed, nd);
    const n = mv.length;
    lineChart(host, {
      n, height: state.tab === "price" ? 440 : 310, label: "Price, model vs real", endLabels: true, band, yUnit: "€/MWh",
      onZoom: (a, b) => zoomFromChart(a, b, hourly),
      xTicks: dayTicks(r.days, hourly, host.clientWidth - 110),
      series: [
        { name: "Real", values: rv, color: "var(--real)", width: 1.5 },
        { name: "Model", values: mv, color: "var(--model)", width: 2 },
      ],
      tooltip: i => {
        const day = hourly ? Math.floor(i / 24) : i;
        const when = dayLabel(r.days[day]) + (hourly ? ", " + hh(i % 24) : " (daily mean)");
        const a = rv[i], b = mv[i];
        const st = hourly
          ? (failed[i] ? `<span style="color:var(--critical)">AC failed</span>` : "AC solved")
          : `${Math.round(band[i] * 24)} of 24 hours failed`;
        return `<b>${when}</b>
          <div class="row"><i class="sw-line" style="background:var(--real)"></i>Real<span class="v">${nf(a)} €/MWh</span></div>
          <div class="row"><i class="sw-line" style="background:var(--model)"></i>Model ${state.priceStage}<span class="v">${nf(b)} €/MWh</span></div>
          <div class="row">Difference<span class="v">${a != null && b != null ? signed(b - a) : "–"}</span></div>
          <div class="row">${st}</div>`;
      },
    });
  }

  function renderMix(r) {
    seg($("mix-stage"), MIX_STAGES, state.mixStage, v => {
      state.mixStage = v; state.mixRef = v === "RD" ? "entsoe" : "omie"; renderMix(view());
    });
    seg($("mix-ref"), [["omie", "OMIE day-ahead", "ref_omie"], ["entsoe", "ENTSO-E actual", "ref_entsoe"]], state.mixRef,
      v => { state.mixRef = v; renderMix(view()); });
    seg($("mix-res"), [["hour", "Hourly"], ["day", "Daily mean"]], state.mixRes, v => { state.mixRes = v; renderMix(view()); });
    renderStacks(r);
    const md = mixData(r), mix = md.model, realSrc = md.real;
    const N = r.status.length, solved = r.status.reduce((a, b) => a + b, 0), nd = r.days.length;
    const rows = md.cats.map(c => {
      const p = pairs(mix[c], realSrc[c]);
      const gm = p.reduce((s, q) => s + q[0], 0) / 1000, gr = p.reduce((s, q) => s + q[1], 0) / 1000;
      const mae = mean(p.map(q => Math.abs(q[0] - q[1])));
      return { c, gm, gr, diff: gm - gr, pct: gr > 0.5 ? 100 * (gm - gr) / gr : null, mae };
    });
    // Switching the real data only regroups the model into that source's categories; say so,
    // with the model total (all hours with a model value), which is the same in both groupings.
    const modelTotal = md.cats.reduce((s, c) => s + mix[c].reduce((a, v) => a + (v || 0), 0), 0) / 1000;
    $("mix-ref-note").innerHTML = (md.ref === "entsoe"
      ? `<b>Same model run, regrouped</b> into ENTSO-E's fuel types so it can be compared: CCGT and CHP gas → <b>Gas</b>; mini-hydro → <b>Hydro</b>; biomass, waste and oil → <b>Bio & other</b>.`
      : `<b>Model grouped like OMIE's technology report:</b> CHP gas, biomass, waste and mini-hydro → <b>CHP group</b>. "ENTSO-E actual" regroups the same model numbers into fuel types.`)
      + ` Only the grouping changes, not the model: total ${nf(modelTotal, 0)} GWh in both views.`;
    const tot = rows.reduce((s, x) => ({ gm: s.gm + x.gm, gr: s.gr + x.gr }), { gm: 0, gr: 0 });
    const maxAbs = Math.max(...rows.map(x => Math.abs(x.diff)), 1);
    const input = state.mixStage === "DA" && md.ref === "omie" ? { Wind: 1, Solar: 1 } : {};
    $("mix-table").innerHTML = `<thead><tr><th>Technology</th><th>${term("Real GWh", md.ref === "entsoe" ? "ref_entsoe" : "real_mix")}</th><th>Model GWh</th><th>${term("Difference", "diff")}</th><th></th><th>${term("Hourly error", "hourly_error")}</th></tr></thead><tbody>` +
      rows.map(x => {
        const w = 35 * Math.abs(x.diff) / maxAbs;
        const bar = `<span class="diffbar" aria-hidden="true"><i style="left:${x.diff < 0 ? 35 - w : 35}px;width:${Math.max(w, 0.5)}px"></i></span>`;
        return `<tr><td>${term(x.c, x.c)}${input[x.c] ? `<span class="tag">${term("input", "input")}</span>` : ""}</td>
          <td>${nf(x.gr, 0)}</td><td>${nf(x.gm, 0)}</td>
          <td>${signed(x.diff, 0)} GWh${x.pct != null ? ` <span style="color:var(--muted)">(${signed(x.pct, 0)} %)</span>` : ""}</td><td>${bar}</td>
          <td>${nf(x.mae, 0)} MW</td></tr>`;
      }).join("") + `<tr class="total-row"><td>Total</td><td>${nf(tot.gr, 0)}</td><td>${nf(tot.gm, 0)}</td>
          <td>${signed(tot.gm - tot.gr, 0)} GWh</td><td></td><td></td></tr></tbody>`;
    const notes = [];
    const omie = md.ref === "omie";
    if (state.mixStage === "DA" && omie) notes.push("Wind and solar match exactly because the day-ahead uses OMIE's own numbers as input. The other rows are the model's own decisions.");
    if (state.mixStage === "BAL" && omie) notes.push("Balancing uses the updated wind, solar and load forecasts, while the reference is OMIE's day-ahead programme, so wind and solar differ here by design.");
    if (state.mixStage === "RD") notes.push(`Redispatch counts only the ${solved} of ${N} hours where the AC solve finished.`);
    if (state.mixStage === "RD" && omie) notes.push("OMIE's day-ahead programme is a plan, so this comparison also includes everything that changed in reality after the day-ahead. ENTSO-E actual is the fairer reference for this stage.");
    if (!omie) notes.push("Imports are measured physical flows from France and Portugal.");
    if (!omie && state.mixStage !== "RD") notes.push("This compares a market stage with the final real outcome, so the difference also includes the real changes made after that market.");
    notes.push("Hourly error is the mean absolute difference per hour.");
    $("mix-note").textContent = notes.join(" ");

    $("mix-legend").innerHTML = `<span><i class="sw-line" style="background:var(--real)"></i>Real (${md.ref === "entsoe" ? "ENTSO-E" : "OMIE"})</span><span><i class="sw-line" style="background:var(--model)"></i>Model (${MIX_STAGES.find(s => s[0] === state.mixStage)[1].toLowerCase()})</span><span style="color:var(--muted)">${nd <= 3 ? "MW each hour" : "Energy per day"} for each technology</span>`;
    const sm = $("mix-sm"); sm.innerHTML = "";
    const smHourly = nd <= 3;
    for (const x of rows) {
      const box = document.createElement("div"); box.className = "sm";
      box.innerHTML = `<h4>${x.c}<span>${x.pct != null ? signed(x.pct, 0) + " %" : signed(x.diff, 1) + " GWh"}</span></h4>`;
      const ch = document.createElement("div"); ch.className = "chart"; box.appendChild(ch); sm.appendChild(box);
      const masked = realSrc[x.c].map((v, i) => mix[x.c][i] == null ? null : v);
      const rv = smHourly ? masked : dailySum(masked, nd);
      const mv = smHourly ? mix[x.c] : dailySum(mix[x.c], nd);
      const unit = smHourly ? "MW" : "GWh";
      requestAnimationFrame(() => lineChart(ch, {
        n: rv.length, height: 122, yTicks: 2, yUnit: smHourly ? "MW" : "GWh/day", label: x.c + ", model vs real",
        xTicks: dayTicks(r.days, smHourly, ch.clientWidth - 60).filter((t, k, a) => smHourly ? t.label.includes(" ") : (k === 0 || k === a.length - 1)),
        series: [{ name: "Real", values: rv, color: "var(--real)", width: 1.5 }, { name: "Model", values: mv, color: "var(--model)", width: 1.75 }],
        onZoom: (a, b) => zoomFromChart(a, b, smHourly),
        tooltip: i => `<b>${smHourly ? dayLabel(r.days[Math.floor(i / 24)]) + ", " + hh(i % 24) : dayLabel(r.days[i])}</b>
          <div class="row"><i class="sw-line" style="background:var(--real)"></i>Real<span class="v">${nf(rv[i])} ${unit}</span></div>
          <div class="row"><i class="sw-line" style="background:var(--model)"></i>Model<span class="v">${nf(mv[i])} ${unit}</span></div>`,
      }));
    }
  }

  // ---------- balancing: the model's BAL stage next to REE's balancing markets (e·sios) ----------
  function renderBalancing(r) {
    if ($("sec-bal").hidden || !window.ESIOS) return;
    const nd = r.days.length, hourly = nd <= 3, E = k => esiosFor(r, k);
    const agg = a => hourly ? a : dailyMean(a, nd);
    const PR = [["Model, balancing (BAL)", r.price.BAL, "var(--model)", 2], ["REE, RR price", E("rr_price"), "var(--real)", 1.5],
                ["REE, aFRR up", E("afrr_up_price"), "var(--cat-2)", 1.2], ["REE, aFRR down", E("afrr_down_price"), "var(--cat-3)", 1.2]];
    $("bal-legend").innerHTML = PR.map(([n, , c]) => `<span><i class="sw-line" style="background:${c}"></i>${n}</span>`).join("")
      + `<span style="color:var(--muted)">${hourly ? "each hour" : "daily mean"}</span>`;
    const host = $("bal-chart");
    const ser = PR.map(([name, v, color, width]) => ({ name, values: agg(v), color, width }));
    lineChart(host, {
      n: ser[0].values.length, height: 300, yUnit: "€/MWh", label: "Balancing price, model vs REE", endLabels: false,
      xTicks: dayTicks(r.days, hourly, host.clientWidth - 60), onZoom: (a, b) => zoomFromChart(a, b, hourly),
      series: ser,
      tooltip: i => `<b>${hourly ? dayLabel(r.days[Math.floor(i / 24)]) + ", " + hh(i % 24) : dayLabel(r.days[i]) + " (daily mean)"}</b>`
        + ser.map(s => `<div class="row"><i class="sw-line" style="background:${s.color}"></i>${s.name}<span class="v">${nf(s.values[i])} €/MWh</span></div>`).join(""),
    });
    const sum = a => a ? a.reduce((s, x) => s + (x || 0), 0) / 1000 : 0;
    const sumAbs = a => a ? a.reduce((s, x) => s + Math.abs(x || 0), 0) / 1000 : 0;
    const V = [["aFRR (secondary)", "afrr"], ["mFRR (tertiary)", "mfrr"], ["RR (replacement)", "rr"]];
    const rows = V.map(([l, k]) => [l, sum(E(k + "_up")), sum(E(k + "_down")), mean(E(k === "rr" ? "rr_price" : k + "_up_price"))]);
    const ru = rows.reduce((s, x) => s + x[1], 0), rd = rows.reduce((s, x) => s + x[2], 0);
    const B = r.balancing;
    const pct = (a, b) => b ? ` <span class="pv-muted-txt">(${nf(100 * a / b, 0)} % of REE)</span>` : "";
    $("bal-table").innerHTML = `<thead><tr><th>Balancing energy, ${nd} day${nd > 1 ? "s" : ""}</th><th>Up, GWh</th><th>Down, GWh</th><th>Mean price up, €/MWh (RR: its one price)</th></tr></thead><tbody>`
      + rows.map(([l, u, d, pz]) => `<tr><td>REE, ${l}</td><td>${nf(u, 0)}</td><td>${nf(d, 0)}</td><td>${nf(pz, 1)}</td></tr>`).join("")
      + `<tr class="total-row"><td>REE, total</td><td>${nf(ru, 0)}</td><td>${nf(rd, 0)}</td><td></td></tr>`
      + (B ? `<tr class="total-row"><td>${term("Model, balancing stage", "model_bal")}</td><td>${nf(sum(B.up), 0)}${pct(sum(B.up), ru)}</td><td>${nf(sum(B.down), 0)}${pct(sum(B.down), rd)}</td><td>${nf(mean(r.price.BAL), 1)} <span class="pv-muted-txt">(BAL price)</span></td></tr>`
           : `<tr><td colspan="4" class="pv-tbc">The model's balancing volume is not in this run's package yet; publish it again with the current publish_run.py.</td></tr>`)
      + "</tbody>";
    $("imb-table").innerHTML = `<thead><tr><th>What had to be balanced, ${nd} day${nd > 1 ? "s" : ""}</th><th>Sum of hourly absolute values, GWh</th></tr></thead><tbody>`
      + `<tr><td>${term("REE, net imbalance of generation and demand", "ree_imb")}</td><td>${nf(sumAbs(E("imbalance")), 0)}</td></tr>`
      + (B ? `<tr><td>${term("Model, forecast change from CID to balancing", "model_imb")}</td><td>${nf(sumAbs(B.need), 0)}${pct(sumAbs(B.need), sumAbs(E("imbalance")))}</td></tr>` : "")
      + "</tbody>";
    // volume charts: REE's balancing energy (aFRR + mFRR + RR) vs the model's balancing stage
    const vhost = $("bal-vol");
    if (!B) { vhost.innerHTML = ""; return; }
    const add = (...a) => a[0].map((_, i) => a.reduce((s, x) => s + (x[i] || 0), 0));
    const rUp = add(E("afrr_up"), E("mfrr_up"), E("rr_up")), rDn = add(E("afrr_down"), E("mfrr_down"), E("rr_down"));
    const unit = hourly ? "MW" : "GWh/day", ag = a => hourly ? a : dailySum(a, nd);
    vhost.innerHTML = `<div class="rd-pair"><div><h4>Balancing up</h4><div class="chart" id="bal-up"></div></div><div><h4>Balancing down</h4><div class="chart" id="bal-down"></div></div></div>`;
    const draw = (id, label, real, model) => {
      const rv = ag(real), mv = ag(model);
      lineChart($(id), {
        n: rv.length, height: 220, yTicks: 4, yUnit: unit, label, endLabels: true,
        xTicks: dayTicks(r.days, hourly, $(id).clientWidth - 110), onZoom: (a, b) => zoomFromChart(a, b, hourly),
        series: [{ name: "REE", values: rv, color: "var(--real)", width: 1.5 }, { name: "Model", values: mv, color: "var(--model)", width: 2 }],
        tooltip: i => `<b>${hourly ? dayLabel(r.days[Math.floor(i / 24)]) + ", " + hh(i % 24) : dayLabel(r.days[i])}</b>
          <div class="row"><i class="sw-line" style="background:var(--real)"></i>REE<span class="v">${nf(rv[i], hourly ? 0 : 1)} ${unit}</span></div>
          <div class="row"><i class="sw-line" style="background:var(--model)"></i>Model<span class="v">${nf(mv[i], hourly ? 0 : 1)} ${unit}</span></div>`,
      });
    };
    requestAnimationFrame(() => { draw("bal-up", "Balancing up, REE vs model", rUp, B.up); draw("bal-down", "Balancing down, REE vs model", rDn, B.down); });
  }

  // ---------- redispatch: model vs what REE really did (e·sios) ----------
  function renderRedispatch(r) {
    if ($("sec-rd").hidden) return;
    const host = $("rd-charts");
    if (!window.ESIOS) { host.innerHTML = `<p class="fineprint">reference/esios_2024.js is missing. Run tools/build_esios.py.</p>`; return; }
    const nd = r.days.length, N = nd * 24, h0 = r.offset * 24, hourly = nd <= 3;
    const pr = plantRun(r.id), H = pr.H;
    // model: redispatch minus balancing per plant group, summed up and down (no value in failed hours)
    const mUp = new Array(N).fill(null), mDown = new Array(N).fill(null);
    for (let i = 0; i < N; i++) {
      if (r.status[i] !== 1) continue;
      let up = 0, dn = 0;
      PD.groups.forEach((p, g) => {
        if (p.f === "Imports") return;
        const v = pr.chg[g * H + h0 + i]; if (v === -128) return;
        const mw = v / 127 * p.cap; if (mw > 0) up += mw; else dn -= mw;
      });
      mUp[i] = up; mDown[i] = dn;
    }
    const E = k => esiosFor(r, k);
    const add = (...a) => a[0].map((_, i) => a.reduce((s, x) => s + (x[i] || 0), 0));
    const rUp = add(E("rt1_up"), E("rt2_up"), E("rtr_up")), rDown = add(E("rt1_down"), E("rt2_down"), E("rtr_down"));
    const unit = hourly ? "MW" : "GWh/day";
    const agg = a => hourly ? a : dailySum(a, nd);
    const draw = (id, label, real, model) => {
      const rv = agg(real), mv = agg(model);
      lineChart($(id), {
        n: rv.length, height: 230, yTicks: 4, yUnit: unit, label, endLabels: true,
        xTicks: dayTicks(r.days, hourly, $(id).clientWidth - 110),
        onZoom: (a, b) => zoomFromChart(a, b, hourly),
        series: [{ name: "REE", values: rv, color: "var(--real)", width: 1.5 }, { name: "Model", values: mv, color: "var(--model)", width: 2 }],
        tooltip: i => `<b>${hourly ? dayLabel(r.days[Math.floor(i / 24)]) + ", " + hh(i % 24) : dayLabel(r.days[i])}</b>
          <div class="row"><i class="sw-line" style="background:var(--real)"></i>REE<span class="v">${nf(rv[i], hourly ? 0 : 1)} ${unit}</span></div>
          <div class="row"><i class="sw-line" style="background:var(--model)"></i>Model<span class="v">${nf(mv[i], hourly ? 0 : 1)} ${unit}</span></div>`,
      });
    };
    host.innerHTML = `<div class="rd-pair"><div><h4>Turned up</h4><div class="chart" id="rd-up"></div></div><div><h4>Turned down</h4><div class="chart" id="rd-down"></div></div></div>`;
    $("rd-legend").innerHTML = `<span><i class="sw-line" style="background:var(--real)"></i>${term("REE redispatch", "ree_rd")}</span><span><i class="sw-line" style="background:var(--model)"></i>${term("Model redispatch", "model_rd")}</span><span style="color:var(--muted)">${hourly ? "MW each hour" : "Energy per day"}</span>`;
    requestAnimationFrame(() => { draw("rd-up", "Redispatch up, REE vs model", rUp, mUp); draw("rd-down", "Redispatch down, REE vs model", rDown, mDown); });
    // totals over the solved hours, so both sides cover the same hours
    const ok = i => r.status[i] === 1;
    const tot = a => a ? a.reduce((s, x, i) => s + (ok(i) ? (x || 0) : 0), 0) / 1000 : 0;
    const rows = [["REE, technical constraints after day-ahead, phase I", tot(E("rt1_up")), tot(E("rt1_down"))],
                  ["REE, technical constraints, phase II", tot(E("rt2_up")), tot(E("rt2_down"))],
                  ["REE, real-time constraints", tot(E("rtr_up")), tot(E("rtr_down"))]];
    const ru = rows.reduce((s, x) => s + x[1], 0), rd = rows.reduce((s, x) => s + x[2], 0), mu = tot(mUp), md = tot(mDown);
    const solved = r.status.reduce((a, b) => a + b, 0);
    $("rd-table").innerHTML = `<thead><tr><th>Over the ${solved} solved hours</th><th>Up, GWh</th><th>Down, GWh</th></tr></thead><tbody>`
      + rows.map(([l, u, d]) => `<tr><td>${l}</td><td>${nf(u, 0)}</td><td>${nf(d, 0)}</td></tr>`).join("")
      + `<tr class="total-row"><td>REE, total</td><td>${nf(ru, 0)}</td><td>${nf(rd, 0)}</td></tr>`
      + `<tr class="total-row"><td>Model</td><td>${nf(mu, 0)} <span class="pv-muted-txt">(${ru ? nf(100 * mu / ru, 0) : "–"} % of REE)</span></td><td>${nf(md, 0)} <span class="pv-muted-txt">(${rd ? nf(100 * md / rd, 0) : "–"} %)</span></td></tr></tbody>`;
  }

  function renderStatus(r) {
    const host = $("status-chart"); host.innerHTML = "";
    const nd = r.days.length;
    const ccgt = r.mix.BAL.CCGT;
    $("status-legend").innerHTML = `<span><i class="sw-box" style="background:var(--cell-ok)"></i>${term("Solved", "okhour")}</span>
      <span><i class="sw-box" style="background:var(--critical)"></i>${term("Failed", "failed")}</span>
      <span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="2.5" fill="var(--ink-2)"/></svg>${term("CCGT running", "gas_dot")}</span>`;
    const W = Math.max(260, host.clientWidth);
    const lab = 52, gap = 2;
    const big = state.tab === "status";
    const cw = Math.min(big ? 34 : 22, (W - lab) / 24);
    const ch = Math.min(big ? 22 : 16, Math.max(10, cw * 0.7));
    const H = 18 + nd * ch;
    const s = svg("svg", { width: lab + 24 * cw, height: H, role: "img", "aria-label": "Solved and failed AC hours per day" }, host);
    for (const h of [0, 6, 12, 18, 23]) { const t = svg("text", { x: lab + h * cw + cw / 2, y: 11, "text-anchor": "middle" }, s); t.textContent = hh(h).slice(0, 2); }
    const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    r.days.forEach((d, di) => {
      const yy = 18 + di * ch;
      const t = svg("text", { x: lab - 6, y: yy + ch / 2 + 4, "text-anchor": "end", class: "day-link" }, s); t.textContent = dayLabel(d);
      if (r.days.length > 1) {
        const tt = svg("title", {}, t); tt.textContent = "Show only " + dayLabel(d);
        t.addEventListener("click", () => setZoom(r.offset + di, r.offset + di));
      } else t.removeAttribute("class");
      for (let h = 0; h < 24; h++) {
        const i = di * 24 + h, ok = r.status[i] === 1, gas = (ccgt[i] || 0) > 1;
        const cell = svg("rect", { x: lab + h * cw + gap / 2, y: yy + gap / 2, width: cw - gap, height: ch - gap, rx: 2, fill: ok ? "var(--cell-ok)" : "var(--critical)" }, s);
        if (gas) svg("circle", { cx: lab + h * cw + cw / 2, cy: yy + ch / 2, r: Math.min(2.5, ch / 5), fill: ok ? "var(--ink-2)" : "#fff", "pointer-events": "none" }, s);
        cell.addEventListener("pointerenter", () => {
          tip.innerHTML = `<b>${dayLabel(d)}, ${hh(h)}</b><div class="row">${ok ? "Solved" : '<span style="color:var(--critical)">Failed</span>'}</div>
            <div class="row">CCGT at balancing<span class="v">${nf(ccgt[i] || 0, 0)} MW</span></div>
            <div class="row">Model DA price<span class="v">${nf(r.price.DA[i])} €/MWh</span></div>
            <div class="row">Real price<span class="v">${nf(r.real_price[i])} €/MWh</span></div>`;
          tip.hidden = false;
          const tw = tip.offsetWidth;
          let left = lab + (h + 1) * cw + 6; if (left + tw > W) left = lab + h * cw - tw - 6;
          tip.style.left = Math.max(0, left) + "px"; tip.style.top = Math.max(0, yy - 10) + "px";
        });
        cell.addEventListener("pointerleave", () => { tip.hidden = true; });
      }
    });

    const grp = on => { let n = 0, f = 0; r.status.forEach((sv, i) => { if (((ccgt[i] || 0) > 1) === on) { n++; if (!sv) f++; } }); return { n, f }; };
    const g1 = grp(true), g0 = grp(false), all = { n: r.status.length, f: r.status.filter(x => !x).length };
    const rate = (lbl, g, sub) => `<div class="rate"><div class="r-top"><span>${lbl}</span><b>${g.n ? nf(100 * g.f / g.n, 0) : "–"} %</b></div>
      <div class="r-bar"><span style="width:${g.n ? 100 * g.f / g.n : 0}%"></span></div><div class="r-sub">${g.f} of ${g.n} hours failed${sub ? " · " + sub : ""}</div></div>`;
    $("rates").innerHTML = rate("All hours", all) + rate("With CCGT running", g1) + rate("Without CCGT", g0, "gas off at balancing");
  }

  // ---------- market stages: the model laid out like the PowerVision paper ----------
  // Static facts about the model (reference/model_facts.js); the same for every run.
  let stagesDone = false;
  function renderStages() {
    if (stagesDone) return;
    const F = window.MODEL_FACTS;
    if (!F) { $("pv-structure").innerHTML = `<p class="fineprint">reference/model_facts.js is missing. Run tools/build_model_facts.py.</p>`; return; }
    stagesDone = true;
    const n0 = x => Number(x).toLocaleString("en-GB");
    const cap = (label, text, paper) => `<b>${label}</b> ${text} <span class="pv-ref">${paper}</span>`;
    const tbc = `<span class="pv-tbc">to be checked</span>`;

    // Fig. 2: model structure, drawn like the paper's flow diagram
    const X = i => 20 + i * 156, W = i => (i === 5 ? 140 : 118), CX = i => X(i) + W(i) / 2;
    const ST = [["DA", "day-ahead"], ["ID2", "IDA2 · 22:00 D−1"], ["ID3", "IDA3 · 10:00 D"], ["CID", "h − 1"], ["BAL", "h · paper: BE"], ["Redispatch", "AC · h"]];
    const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ar" marker-end="url(#pv-head)"/>`;
    const lines = (x, y0, list, cls = "") => list.map((s, k) => `<text x="${x}" y="${y0 + k * 18}" class="${cls}">${s}</text>`).join("");
    $("pv-structure").innerHTML = `<svg class="pv-svg" viewBox="0 0 960 400" role="img" aria-label="Structure of the model: inputs and a forecasting model feed a chain of market stages, DA, ID2, ID3, CID and BAL on one zone, then an AC redispatch on the transmission grid">
      <defs><marker id="pv-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="hd"/></marker></defs>
      <rect x="20" y="20" width="380" height="165" rx="8" class="bx"/>
      <text x="36" y="46" class="ti">Inputs</text><text x="100" y="46" class="df">paper: all from FanSi</text>
      <text x="36" y="72" class="hd2">Static</text>${lines(36, 92, ["Production capacity", "Plant costs", "Grid model"])}
      <text x="200" y="72" class="hd2">Time-dependent</text>${lines(200, 92, ["Water values, SDDP (weekly)", "Fuel and CO₂ prices (daily)", "Nuclear, coal, CHP (daily)", "Demand, wind, solar (hourly)", "Cross-border flow (hourly)"])}
      <rect x="430" y="20" width="340" height="165" rx="8" class="bx"/>
      <text x="446" y="46" class="ti">Forecasting model</text>
      ${lines(446, 72, ["ENTSO-E data:", "day-ahead forecast and", "lagged actuals of wind,", "solar and load", "→ linear regression"])}
      <text x="446" y="172" class="df">paper: wind and load only</text>
      <line x1="642" y1="62" x2="642" y2="150" class="ax"/><line x1="642" y1="150" x2="756" y2="150" class="ax"/>
      <path d="M648,140 C672,104 700,88 752,76" class="cv"/>
      <text x="646" y="58" class="sm">RMSE</text><text x="700" y="168" class="sm" text-anchor="middle">lead time [h]</text>
      <rect x="800" y="20" width="140" height="165" rx="8" class="bx"/>
      <text x="812" y="46" class="ti">Transmission</text><text x="812" y="64" class="ti">grid data</text>
      ${lines(812, 88, [`${n0(F.n_buses)} buses`, `${n0(F.lines.reduce((s, l) => s + l.lines, 0))} lines`, `${n0(F.n_trafos)} transformers`, "shunt reactors"])}
      <text x="812" y="172" class="df">paper: DC flow</text>
      ${arrow(CX(0), 185, CX(0), 246)}
      <line x1="600" y1="185" x2="600" y2="214" class="ar"/><line x1="${CX(1)}" y1="214" x2="${CX(4)}" y2="214" class="ar"/>
      ${[1, 2, 3, 4].map(i => arrow(CX(i), 214, CX(i), 246)).join("")}
      <text x="608" y="207" class="sm">forecast updates</text>
      ${arrow(CX(5), 185, CX(5), 246)}
      ${ST.map(([s, d], i) => `<rect x="${X(i)}" y="250" width="${W(i)}" height="58" rx="6" class="${i === 5 ? "st rd" : "st"}"/>
        <text x="${CX(i)}" y="274" class="ti" text-anchor="middle">${s}</text><text x="${CX(i)}" y="294" class="sm" text-anchor="middle">${d}</text>`).join("")}
      ${[0, 1, 2, 3, 4].map(i => arrow(X(i) + W(i) + 3, 279, X(i + 1) - 3, 279)).join("")}
      <text x="${(CX(1) + CX(4)) / 2}" y="330" class="sm" text-anchor="middle">trading adjustments at every gate (the active case)</text>
      <text x="20" y="352" class="hd2">Resolution</text>
      <rect x="20" y="358" width="${X(4) + W(4) - 20}" height="30" rx="4" class="zn"/>
      <text x="${(20 + X(4) + W(4)) / 2}" y="378" class="lb" text-anchor="middle">Zonal: Spain as one zone, no grid</text>
      <rect x="${X(5)}" y="358" width="${W(5)}" height="30" rx="4" class="gr"/>
      <text x="${CX(5)}" y="378" class="lb" text-anchor="middle">Transmission grid</text>
    </svg>`;
    $("pv-structure-cap").innerHTML = cap("Fig. 2, Spanish version.", "The model is a chain of deterministic optimisation problems. DA to BAL clear Spain as one zone with no grid; each re-clears with that gate's forecast and moves the previous schedule as little as possible. Only the redispatch sees the transmission grid. Yellow labels show where the paper's Norway model differs.", "PowerVision paper, Fig. 2");

    // Table 1: gates
    const G = [
      ["DA", "12:00 D−1 (−12 h)", "0–23", "Zonal", "12:00 D−1", "12:00 D−1"],
      ["IDA1", "not modelled", "–", "–", "15:00 D−1", "–"],
      ["ID2", "22:00 D−1 (−2 h)", "0–23", "Zonal", "IDA2, 22:00 D−1", tbc],
      ["ID3", "10:00 D (+10 h)", "12–23", "Zonal", "IDA3, 10:00 D (hours 12–23)", tbc],
      ["CID", "h − 1", "h", "Zonal", `continuous; closing ${tbc}`, tbc],
      ["BAL", "h", "h", "Zonal", `REE balancing; ${tbc}`, tbc],
      ["Redispatch", "h", "h", `Grid (${n0(F.n_buses)} buses)`, `REE redispatch; ${tbc}`, tbc],
    ];
    $("pv-gates").innerHTML = `<thead><tr><th rowspan="2">Stage</th><th colspan="3" class="grp">Model</th><th colspan="2" class="grp">Real Spain, gate closure</th></tr>
      <tr><th>GCT</th><th>Delivery hours</th><th>Resolution</th><th>from 14 June 2024</th><th>before 14 June 2024</th></tr></thead><tbody>`
      + G.map(r => `<tr${r[1] === "not modelled" ? ` class="pv-muted"` : ""}>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("") + "</tbody>";
    $("pv-gates-cap").innerHTML = cap("Table 1, Spanish version.", "Gate closure time (GCT), delivery hours and resolution of each stage. Hours are Spanish local time relative to 0:00 on the delivery day; −12 h is 12:00 the day before. The model's times are those used to build each gate's forecast (forecast_updates/main.py). Since 14 June 2024 Spain trades in the three European intraday auctions at the times in the paper's Fig. 1; the model's ID2 matches IDA2 and ID3 matches IDA3. Before that Spain had its own MIBEL sessions, so January and May have no one-to-one match.", "PowerVision paper, Table 1");

    // Table 2: capacity and load
    const C = F.capacity;
    $("pv-capacity").innerHTML = `<thead><tr><th>Spain (one zone)</th><th>Model</th><th>Real 2024 (ENTSO-E)</th><th>Model − real</th></tr></thead><tbody>`
      + C.rows.map(r => `<tr><td>${r.item}</td><td>${n0(r.model)} ${r.unit}${r.model_note ? `<div class="sub">${r.model_note}</div>` : ""}</td><td>${n0(r.real)} ${r.unit}</td><td>${signed(r.model - r.real, 0)} ${r.unit} <span class="pv-muted-txt">(${signed(100 * (r.model - r.real) / r.real, 0)} %)</span></td></tr>`).join("") + "</tbody>";
    $("pv-capacity-cap").innerHTML = cap("Table 2, Spanish version.", `Installed wind and solar capacity and mean load. Model: ${C.model_src}. Real: ${C.real_src}. ENTSO-E gives one capacity per year, so solar built during 2024 may be missing from it (to be checked). The model's load includes exports to France and Portugal; ENTSO-E's does not.`, "PowerVision paper, Table 2");

    // Fig. 7: data sources, grouped like the paper
    const nd = `<span class="pv-tbc">source not documented</span>`;
    const P = [
      ["Demand, wind and solar", "zn", "Zonal stages", [
        ["Day-ahead baseline per hour", "OMIE technology report, 2024", "omie_conversion/"],
        ["Forecast at each gate", "ENTSO-E actuals and day-ahead forecasts, 2022–2024", "forecast_updates/"],
        ["Spread over the buses", `share per bus (Data/load.csv) ${nd}`, "data_preparation.jl"]]],
      ["Generators", "zn", "Zonal stages and grid", [
        ["Plant list and capacity", `Data/generations.csv ${nd}`, ""],
        ["Nuclear, coal and CHP per day", "OMIE technology report", "omie_conversion/"],
        ["Fuel and CO₂ prices", "MIBGAS, EU ETS", "fuel_prices.jl"],
        ["Hydro water values", "37 climate years of inflow (Data/ts)", "midterm_sddp4.jl"]]],
      ["Cross-border", "zn", "Zonal stages and grid", [
        ["Exchange with France and Portugal", "ENTSO-E flows, OMIE exchange, 2024", "entsoe_download/"]]],
      ["Transmission grid", "gr", "Grid", [
        ["Buses, lines, transformers", `${nd}; the per-km values match the open European grid model`, "data_preparation.jl"],
        ["Shunt reactors", "REE, installed fleet December 2024", "data_preparation.jl"],
        [`Line rating × ${F.line_rating_factor}`, "N-1 margin, config.toml", ""]]],
    ];
    $("pv-sources").innerHTML = `<div class="pv-panels">` + P.map(([h, cls, use, items]) => `<div class="pv-panel">
        <div class="pv-panel-h">${h}</div>
        <ul>${items.map(([what, src, code]) => `<li><b>${what}</b><span>${src}</span>${code ? `<code>${code}</code>` : ""}</li>`).join("")}</ul>
        <div class="pv-panel-f ${cls}">Used in: ${use}</div></div>`).join("") + `</div>`;
    $("pv-sources-cap").innerHTML = cap("Fig. 7, Spanish version.", "The main data sources and the code that processes them (in the model repo). The paper builds its Norway grid from an open European grid model and line data from NVE; here the grid's source is not documented, but its standard line values match that same open model.", "PowerVision paper, Fig. 7");

    // Table 3: lines and transformers
    const lrf = F.line_rating_factor;
    $("pv-lines").innerHTML = `<thead><tr><th>Lines</th><th>Count</th><th>Circuits</th><th>Current limit</th><th>Thermal capacity per circuit</th><th>Limit in the model (× ${lrf})</th><th>r / x per km</th></tr></thead><tbody>`
      + F.lines.map(l => `<tr><td>${l.kv} kV${l.dc ? " DC" : ""}</td><td>${n0(l.lines)}</td><td>${n0(l.circuits)}</td><td>${l.imax_ka} kA</td><td>${n0(l.mva)} MVA</td><td>${n0(l.limit)} MW</td><td>${l.dc ? "–" : `${l.r} / ${l.x} Ω`}</td></tr>`).join("") + "</tbody>";
    $("pv-trafos").innerHTML = `<thead><tr><th>Transformers (high side)</th><th>Count</th><th>Standard unit</th><th>Units</th><th>Installed</th><th>Limit in the model (× ${lrf})</th></tr></thead><tbody>`
      + F.trafos.map(t => `<tr><td>${t.hv} kV</td><td>${t.count}</td><td>${n0(t.unit_mva)} MVA</td><td>${t.units}</td><td>${n0(t.installed)} MVA</td><td>${n0(t.limit)} MW</td></tr>`).join("") + "</tbody>";
    $("pv-lines-cap").innerHTML = cap("Table 3, Spanish version.", `Line and transformer assumptions. Every line of one voltage level has the same current limit and values per km: standard line types, not the real rating of each line, which is not public. The 400 kV and 320 kV reactances (0.246 and 0.265 Ω/km) are the values the paper uses. Transformers are sized by a rule (a number of standard units), with ${F.trafo_x.map(x => Math.round(x * 100)).join("–")} % reactance. Example: the Arkale transformer at the French border is 3 × 100 MVA here but a 550 MVA phase-shifter in reality (REE, 2017). The 320 kV link to France is modelled as four AC lines; the one DC line is the 250 kV link to the Balearic Islands. The paper compares three line-type cases; this model has one.`, "PowerVision paper, Table 3");
  }

  function renderAll() {
    const v = view();
    renderRunList(); renderHead(run()); renderTabs(v); renderPeriod(); renderKpis(v); renderPrice(v); renderMix(v); renderStatus(v); renderRedispatch(v); renderBalancing(v); renderGrid(v); renderPlants(v); renderStages();
  }

  // ---------- loading runs ----------
  const pending = { run: {}, months: {} };
  window.VIEWER = {
    addRun(pkg) { pending.run[pkg.id] = pkg; },
    addMonth(id, month, part) { (pending.months[id] = pending.months[id] || {})[month] = part; },
  };
  const loadScript = src => new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
  const decodeB64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  // packages store the hourly map data hour by hour; the drawing code reads one row per line or plant
  function byItem(bytes, n, H, Type) {
    const src = new Type(bytes.buffer), out = new Type(n * H);
    for (let h = 0; h < H; h++) for (let i = 0; i < n; i++) out[i * H + h] = src[h * n + i];
    return out;
  }
  function runInfo(meta) {
    const i = meta.info || {}, m = i.runtime_min;
    const rt = m == null ? "–" : m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`;
    return { ran_by: i.ran_by || "–", branch: i.branch || "–", commit: i.commit || "–", commit_msg: i.commit_message || "",
      dirty: i.uncommitted_files || [], power_flow: i.power_flow || "AC",
      solver: i.linear_solver ? `Ipopt + ${String(i.linear_solver).toUpperCase()}` : "–",
      finished: i.finished || "–", runtime: rt, reconstructed: !!i.reconstructed };
  }
  async function loadRun(id) {
    if (D.runs.some(r => r.id === id)) return;
    const base = `runs/${encodeURIComponent(id)}/`;
    await loadScript(base + "data.js");
    const pkg = pending.run[id];
    if (!pkg) throw new Error(`runs/${id}/data.js does not contain the run`);
    await Promise.all(pkg.months.map(m => loadScript(`${base}${m}.js`)));
    const parts = pkg.months.map(m => pending.months[id][m]);
    const H = pkg.days.length * 24;
    const join = (key, Type, n) => {
      const all = new Uint8Array(H * n * Type.BYTES_PER_ELEMENT);
      let off = 0;
      for (const p of parts) { const b = decodeB64(p[key]); all.set(b, off); off += b.length; }
      return byItem(all, n, H, Type);
    };
    const C = pkg.grid.corridors.length, NG = pkg.plants.groups.length, NS = pkg.sites.sites.length;
    gridCache[id] = { H, load: join("grid_load", Uint8Array, C), flow: null };
    const out = join("plant_out", Uint8Array, NG), chg = join("plant_chg", Int8Array, NG);
    let maxChg = 1;
    pkg.plants.groups.forEach((p, i) => { for (let h = 0; h < H; h++) { const v = chg[i * H + h]; if (v !== -128) maxChg = Math.max(maxChg, Math.abs(v) / 127 * p.cap); } });
    plantCache[id] = { H, out, chg, maxChg };
    realCache[id] = { H, model: join("site_model", Uint16Array, NS), real: join("site_real", Uint16Array, NS) };
    const meta = MANIFEST.find(m => m.id === id) || {};
    D.runs.push({ ...pkg, name: meta.name || id, note: meta.note || "", info: runInfo(meta), meta });
    delete pending.run[id]; delete pending.months[id];
  }
  async function selectRun(id) {
    stopPlay("gh"); stopPlay("ph");
    state.run = id; state.zoom = null; state.gridHour = null; state.gridSel = null; state.plantHour = null; state.plantSel = null;
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    renderRunList();
    const note = $("status-note");
    note.hidden = false; note.textContent = "Loading the run …";
    $("report").classList.add("loading");
    try { await loadRun(id); }
    catch (e) { note.textContent = `${e.message}. Is this run in your copy of runs/? Try git pull.`; return; }
    if (state.run !== id) return;   // another run was picked while this one loaded
    const r = run();
    G.corridors = r.grid.corridors; G.frame = r.grid.frame;
    PD.groups = r.plants.groups; maxCap = Math.max(1, ...PD.groups.map(p => p.cap));
    RP.sites = r.sites.sites; RP.coverage = r.sites.coverage;
    PD.siteOf = new Map(RP.sites.map((s, i) => [`${s.x},${s.y},${s.f}`, i]));
    PD.searchIdx = new Map(PD.groups.map((p, i) => [plantOption(p, i), i]));
    $("plant-search-list").innerHTML = [...PD.groups.keys()].sort((a, b) => (plantName(PD.groups[b]) ? 1 : 0) - (plantName(PD.groups[a]) ? 1 : 0) || PD.groups[b].cap - PD.groups[a].cap)
      .map(i => `<option value="${esc(plantOption(PD.groups[i], i))}"></option>`).join("");
    D.categories = r.categories; D.categories_phys = r.categories_phys;
    note.hidden = true; $("report").classList.remove("loading");
    renderAll();
  }
  function start() {
    renderRunList();
    if (!MANIFEST.length) {
      $("status-note").hidden = false;
      $("status-note").textContent = "No runs published yet. Publish one with scripts/publish_run.py in the model repo.";
      return;
    }
    selectRun(state.run);
  }

  start();
  // Redraw the charts whenever the report column changes width (also covers the frame
  // settling to its final size after the first render, and late web-font loads).
  const redraw = () => { if (!run()) return; const v = view(); renderPrice(v); renderMix(v); renderStatus(v); renderRedispatch(v); renderBalancing(v); renderGrid(v); renderPlants(v); };
  let rt, lastW = $("report").clientWidth;
  new ResizeObserver(() => {
    const w = $("report").clientWidth;
    if (Math.abs(w - lastW) < 4) return;
    lastW = w;
    clearTimeout(rt); rt = setTimeout(redraw, 120);
  }).observe($("report"));
  window.addEventListener("load", redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
