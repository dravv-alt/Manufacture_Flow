const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const PW = 13.333, PH = 7.5;

// ---------- Palette: "Industrial Resilience Control Plane" ----------
const BG_DARK   = "1E211D";
const BG_LIGHT  = "F2F3F0";
const PANEL     = "FFFFFF";
const PANEL_ALT = "E7E8E3";
const BORDER    = "D6D7D0";
const INK       = "24261F";
const INK_SOFT  = "51524A";
const MUTE      = "7C7B70";
const ON_DARK   = "F2F1EA";
const ON_DARK_MUTE = "A9AA9E";
const AMBER     = "B8720F";
const AMBER_FILL= "F1E1BE";
const CORAL     = "AE4438";
const CORAL_FILL= "F2DBD6";
const LINE      = "C7C8C0";
const GREEN     = "2E7D32";
const GREEN_FILL= "E8F5E9";

const F_HEAD = "Arial";
const F_BODY = "Calibri";

// ---------- helpers ----------
function bgSlide(dark) {
  const s = pres.addSlide();
  s.background = { color: dark ? BG_DARK : BG_LIGHT };
  return s;
}

function eyebrow(s, text, dark) {
  s.addText(text.toUpperCase(), {
    x: 0.55, y: 0.42, w: 8, h: 0.3,
    fontFace: F_HEAD, fontSize: 11, bold: true, charSpacing: 2,
    color: AMBER, align: "left", isTextBox: true, margin: 0,
  });
}

function title(s, text, dark, opts) {
  opts = opts || {};
  s.addText(text, {
    x: 0.55, y: opts.y || 0.72, w: opts.w || 11.6, h: opts.h || 0.95,
    fontFace: F_HEAD, fontSize: opts.size || 28, bold: true,
    color: dark ? ON_DARK : INK, align: "left", isTextBox: true, margin: 0,
    lineSpacingMultiple: 1.02,
  });
}

function pageNum(s, n, dark) {
  s.addText(String(n).padStart(2, "0"), {
    x: PW - 0.95, y: PH - 0.5, w: 0.6, h: 0.3,
    fontFace: F_BODY, fontSize: 10, color: dark ? ON_DARK_MUTE : MUTE,
    align: "right", isTextBox: true, margin: 0,
  });
  s.addText("MANUFACTUREFLOW", {
    x: 0.55, y: PH - 0.5, w: 4, h: 0.3,
    fontFace: F_BODY, fontSize: 9, color: dark ? ON_DARK_MUTE : MUTE,
    charSpacing: 1.5, align: "left", isTextBox: true, margin: 0,
  });
}

function card(s, x, y, w, h, opts) {
  opts = opts || {};
  s.addShape("roundRect", {
    x, y, w, h,
    rectRadius: opts.radius || 0.08,
    fill: { color: opts.fill || PANEL },
    line: { color: opts.line || BORDER, width: opts.lineW || 1 },
    shadow: opts.shadow === false ? undefined : {
      type: "outer", color: "808070", opacity: 0.18, blur: 6, offset: 2, angle: 90,
    },
  });
}

function arrowRight(s, x, y, w, opts) {
  opts = opts || {};
  s.addShape("rightArrow", {
    x, y: y - 0.06, w, h: 0.14,
    fill: { color: opts.color || LINE },
    line: { type: "none" },
  });
}

function chainStat(s, x, y, w, num, label, opts) {
  opts = opts || {};
  s.addText(num, {
    x, y, w, h: 0.55, fontFace: F_HEAD, fontSize: opts.size || 30, bold: true,
    color: opts.color || INK, align: "center", isTextBox: true, margin: 0,
  });
  s.addText(label.toUpperCase(), {
    x, y: y + 0.52, w, h: 0.4, fontFace: F_BODY, fontSize: 9.5, bold: true,
    color: MUTE, align: "center", isTextBox: true, margin: 0, charSpacing: 0.5,
  });
}

// ============================================================
// SLIDE 0 — TITLE
// ============================================================
{
  const s = bgSlide(true);
  // motif: thin horizontal recovery-loop line with nodes
  const nodeLabels = ["TELEMETRY", "PREDICT", "PROTECT", "RECOVER", "NOTIFY"];
  const startX = 1.4, endX = 11.9, y = 5.55;
  const n = nodeLabels.length;
  s.addShape("line", {
    x: startX, y, w: endX - startX, h: 0,
    line: { color: "3A3D37", width: 1.5 },
  });
  for (let i = 0; i < n; i++) {
    const nx = startX + (i * (endX - startX)) / (n - 1);
    s.addShape("ellipse", {
      x: nx - 0.09, y: y - 0.09, w: 0.18, h: 0.18,
      fill: { color: i === 1 ? AMBER : "3A3D37" },
      line: { color: AMBER, width: i === 1 ? 0 : 0.75 },
    });
    s.addText(nodeLabels[i], {
      x: nx - 0.9, y: y + 0.16, w: 1.8, h: 0.3,
      fontFace: F_BODY, fontSize: 9, color: ON_DARK_MUTE, charSpacing: 1,
      align: "center", isTextBox: true, margin: 0,
    });
  }

  s.addText("INDUSTRIAL RESILIENCE CONTROL PLANE", {
    x: 0.9, y: 2.55, w: 10, h: 0.35,
    fontFace: F_BODY, fontSize: 12, bold: true, color: AMBER, charSpacing: 2.5,
    align: "left", isTextBox: true, margin: 0,
  });
  s.addText("ManufactureFlow", {
    x: 0.85, y: 2.9, w: 11.3, h: 1.5,
    fontFace: F_HEAD, fontSize: 60, bold: true, color: ON_DARK,
    align: "left", isTextBox: true, margin: 0,
  });
  s.addText("An autonomous agent system that coordinates a factory's response to machine failure \u2014 from the first sensor signal to shipment-level customer impact.", {
    x: 0.9, y: 4.25, w: 9.6, h: 0.9,
    fontFace: F_BODY, fontSize: 15, color: ON_DARK_MUTE,
    align: "left", isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
  });
  s.addText("MANUFACTURING RESILIENCE \u00B7 AGENTIC OPERATIONS", {
    x: 0.85, y: 0.55, w: 8, h: 0.3,
    fontFace: F_BODY, fontSize: 10, color: ON_DARK_MUTE, charSpacing: 2,
    align: "left", isTextBox: true, margin: 0,
  });
}

// ============================================================
// SLIDE 1 — THE PROBLEM
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "01 \u2014 The Problem");
  title(s, "A Machine Failure Is Never Just\na Maintenance Problem", false, { size: 30, h: 1.5 });

  const steps = [
    "Machine\nDegradation", "Workstation\nUnavailable", "Production Jobs\nDisrupted",
    "Spare / Procurement\nDependency", "Maintenance\nDelay", "Schedule\nDisruption", "Shipment\nRisk",
  ];
  const cw = 1.52, gap = 0.155, totalW = steps.length * cw + (steps.length - 1) * gap;
  let x = (PW - totalW) / 2;
  const y = 3.15, ch = 1.35;
  steps.forEach((label, i) => {
    const isLast = i === steps.length - 1;
    card(s, x, y, cw, ch, { fill: isLast ? CORAL_FILL : PANEL, line: isLast ? CORAL : BORDER, radius: 0.06 });
    s.addText(label, {
      x: x + 0.06, y: y, w: cw - 0.12, h: ch,
      fontFace: F_BODY, fontSize: 10.5, bold: true, color: isLast ? CORAL : INK,
      align: "center", valign: "middle", isTextBox: true, margin: 0, lineSpacingMultiple: 1.05,
    });
    if (!isLast) arrowRight(s, x + cw + 0.015, y + ch / 2, gap - 0.03, { color: MUTE });
    x += cw + gap;
  });

  card(s, 1.9, 5.15, 9.53, 0.95, { fill: BG_LIGHT, line: BORDER, shadow: false });
  s.addText([
    { text: "The failure is physical. ", options: { color: INK_SOFT, italic: true } },
    { text: "The consequence is organizational.", options: { color: AMBER, italic: true, bold: true } },
  ], {
    x: 1.9, y: 5.15, w: 9.53, h: 0.95, fontFace: F_HEAD, fontSize: 19,
    align: "center", valign: "middle", isTextBox: true, margin: 0,
  });
  pageNum(s, 1, false);
}

// ============================================================
// SLIDE 2 — THE GAP
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "02 \u2014 The Gap");
  title(s, "Factories Have Data.\nThey Lack Coordinated Recovery.", false, { size: 28, h: 1.4 });

  const colW = 5.65, colY = 2.15, colH = 4.0, gapX = 0.4;
  const leftX = 0.55, rightX = leftX + colW + gapX;

  // Left: Conventional
  card(s, leftX, colY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("CONVENTIONAL RESPONSE", { x: leftX + 0.3, y: colY + 0.22, w: colW - 0.6, h: 0.3,
    fontFace: F_BODY, fontSize: 11, bold: true, color: MUTE, charSpacing: 1, isTextBox: true, margin: 0 });
  const convSteps = ["Detect", "Escalate", "Discuss", "Decide", "Execute"];
  let cy = colY + 0.62;
  convSteps.forEach((st, i) => {
    s.addShape("ellipse", { x: leftX + 0.3, y: cy, w: 0.09, h: 0.09, fill: { color: MUTE }, line: { type: "none" } });
    s.addText(st, { x: leftX + 0.5, y: cy - 0.13, w: colW - 1, h: 0.32,
      fontFace: F_BODY, fontSize: 12, color: INK, isTextBox: true, margin: 0 });
    if (i < convSteps.length - 1) {
      s.addShape("line", { x: leftX + 0.345, y: cy + 0.09, w: 0, h: 0.24, line: { color: BORDER, width: 1.25, dashType: "dash" } });
    }
    cy += 0.4;
  });
  s.addText("MULTIPLE HANDOFFS", { x: leftX + 0.3, y: cy + 0.02, w: colW - 0.6, h: 0.26,
    fontFace: F_BODY, fontSize: 10, bold: true, color: MUTE, charSpacing: 1, isTextBox: true, margin: 0 });
  s.addText("Operator \u2192 Supervisor \u2192 Maintenance \u2192 Warehouse \u2192 Procurement \u2192 Scheduler \u2192 Logistics", {
    x: leftX + 0.3, y: cy + 0.3, w: colW - 0.6, h: 0.75,
    fontFace: F_BODY, fontSize: 10.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2,
  });

  // Right: ManufactureFlow
  card(s, rightX, colY, colH, colH, { fill: INK, line: INK });
  s.addText("MANUFACTUREFLOW", { x: rightX + 0.3, y: colY + 0.22, w: colW - 0.6, h: 0.3,
    fontFace: F_BODY, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0 });
  const mfSteps = ["Detect", "Decide", "Act", "Propagate", "Recover"];
  cy = colY + 0.68;
  mfSteps.forEach((st, i) => {
    s.addShape("ellipse", { x: rightX + 0.3, y: cy, w: 0.11, h: 0.11, fill: { color: AMBER }, line: { type: "none" } });
    s.addText(st, { x: rightX + 0.55, y: cy - 0.14, w: colW - 1, h: 0.36,
      fontFace: F_BODY, fontSize: 13.5, bold: true, color: ON_DARK, isTextBox: true, margin: 0 });
    if (i < mfSteps.length - 1) {
      s.addShape("line", { x: rightX + 0.355, y: cy + 0.11, w: 0, h: 0.28, line: { color: AMBER, width: 1.5 } });
    }
    cy += 0.46;
  });
  s.addText("One coordinated recovery workflow across the same functions.", {
    x: rightX + 0.3, y: cy + 0.08, w: colW - 0.6, h: 0.6,
    fontFace: F_BODY, fontSize: 11, italic: true, color: ON_DARK_MUTE, isTextBox: true, margin: 0, lineSpacingMultiple: 1.2,
  });

  s.addText([
    { text: "The bottleneck is not information availability. ", options: { color: INK_SOFT } },
    { text: "It is coordination latency.", options: { color: AMBER, bold: true } },
  ], {
    x: 0.55, y: 6.35, w: 12.23, h: 0.45, fontFace: F_HEAD, fontSize: 15.5,
    align: "center", isTextBox: true, margin: 0,
  });
  pageNum(s, 2, false);
}

// ============================================================
// SLIDE 3 — THE SOLUTION (architecture loop)
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "03 \u2014 The Solution");
  title(s, "ManufactureFlow: An Autonomous Manufacturing\nResilience Control Plane", false, { size: 24, h: 1.15 });

  const cx = 5.6, cyc = 3.85, R = 1.65;
  const nodes = ["Telemetry", "Failure\nIntelligence", "Workstation\nProtection", "Resource\nRecovery",
    "Maintenance", "Production\nRerouting", "Delivery\nImpact", "Stakeholder\nNotification"];
  const nCount = nodes.length;
  const nodeW = 1.52, nodeH = 0.72;

  // connecting ring
  s.addShape("ellipse", { x: cx - R, y: cyc - R, w: R * 2, h: R * 2,
    fill: { type: "none" }, line: { color: LINE, width: 1.25, dashType: "sysDot" } });

  // center
  card(s, cx - 0.85, cyc - 0.42, 1.7, 0.84, { fill: INK, line: INK, radius: 0.12 });
  s.addText("FAILURE\nEVENT", { x: cx - 0.85, y: cyc - 0.42, w: 1.7, h: 0.84,
    fontFace: F_HEAD, fontSize: 13, bold: true, color: AMBER, align: "center", valign: "middle",
    isTextBox: true, margin: 0, lineSpacingMultiple: 0.95 });

  const angleOffset = -90;
  for (let i = 0; i < nCount; i++) {
    const ang = (angleOffset + (i * 360) / nCount) * (Math.PI / 180);
    const nx = cx + R * Math.cos(ang) - nodeW / 2;
    const ny = cyc + R * Math.sin(ang) - nodeH / 2;
    card(s, nx, ny, nodeW, nodeH, { fill: PANEL, line: i === 0 ? AMBER : BORDER, radius: 0.09, shadow: false });
    s.addText(nodes[i], { x: nx, y: ny, w: nodeW, h: nodeH,
      fontFace: F_BODY, fontSize: 9.5, bold: true, color: INK, align: "center", valign: "middle",
      isTextBox: true, margin: 0, lineSpacingMultiple: 0.95 });
  }

  // three pillars
  const pillars = [
    { t: "PREDICT", d: "Identify anomaly pattern and determine specific failing sub-component before catastrophic stoppage." },
    { t: "ACT", d: "Transactionally quarantine asset, commit warehouse stock, or launch automated supplier procurement." },
    { t: "PROTECT", d: "Reroute queued jobs to qualified workstations and proactively recompute customer delivery SLAs." },
  ];
  const pw = 3.65, px0 = 9.15;
  pillars.forEach((p, i) => {
    const py = 1.95 + i * 1.45;
    s.addShape("roundRect", { x: px0, y: py, w: pw, h: 1.2, rectRadius: 0.08,
      fill: { color: i === 1 ? AMBER_FILL : PANEL }, line: { color: i === 1 ? AMBER : BORDER, width: 1.2 } });
    s.addText(p.t, { x: px0 + 0.22, y: py + 0.12, w: pw - 0.44, h: 0.3,
      fontFace: F_HEAD, fontSize: 13, bold: true, color: i === 1 ? AMBER : INK, isTextBox: true, margin: 0, charSpacing: 0.5 });
    s.addText(p.d, { x: px0 + 0.22, y: py + 0.44, w: pw - 0.44, h: 0.68,
      fontFace: F_BODY, fontSize: 10, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
  });

  pageNum(s, 3, false);
}

// ============================================================
// SLIDE 4 — AGENT ARCHITECTURE
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "04 \u2014 Agent Architecture");
  title(s, "Six Agents. One Coordinated Recovery Graph.", false, { size: 28, h: 0.8 });

  const cx = 6.65, cyc = 4.05, R = 1.95;
  const agents = [
    { t: "Failure Intelligence Agent", b: ["Failure detection", "Time-to-failure", "Component diagnosis"] },
    { t: "Resource Recovery Agent", b: ["Inventory check", "Procurement", "Maintenance work order"] },
    { t: "Production Rerouting Agent", b: ["Alternative workstation", "Compatibility & capacity", "Job reassignment"] },
    { t: "Delivery Impact Agent", b: ["Schedule propagation", "Shipment commitment", "Delay classification"] },
    { t: "Stakeholder Notification Agent", b: ["Contextual alerts", "Operational communication"] },
  ];
  const nodeW = 2.75, nodeH = 1.5;
  const angleOffset = -90;
  const positions = [];
  for (let i = 0; i < agents.length; i++) {
    const ang = (angleOffset + (i * 360) / agents.length) * (Math.PI / 180);
    positions.push({ x: cx + R * Math.cos(ang), y: cyc + R * Math.sin(ang) });
  }
  positions.forEach((p) => {
    s.addShape("line", { x: cx, y: cyc, w: p.x - cx, h: p.y - cyc, line: { color: LINE, width: 1.25 } });
  });
  s.addShape("ellipse", { x: cx - 0.8, y: cyc - 0.8, w: 1.6, h: 1.6, fill: { color: INK }, line: { type: "none" } });
  s.addText("RECOVERY\nORCHESTRATOR", { x: cx - 0.8, y: cyc - 0.8, w: 1.6, h: 1.6,
    fontFace: F_HEAD, fontSize: 10.5, bold: true, color: AMBER, align: "center", valign: "middle",
    isTextBox: true, margin: 0, lineSpacingMultiple: 1 });

  agents.forEach((a, i) => {
    const p = positions[i];
    const nx = Math.max(0.4, Math.min(PW - nodeW - 0.4, p.x - nodeW / 2));
    const ny = Math.max(1.5, Math.min(PH - nodeH - 0.8, p.y - nodeH / 2));
    card(s, nx, ny, nodeW, nodeH, { fill: PANEL, line: BORDER, radius: 0.08 });
    s.addText(a.t, { x: nx + 0.16, y: ny + 0.1, w: nodeW - 0.32, h: 0.42,
      fontFace: F_BODY, fontSize: 11, bold: true, color: AMBER, isTextBox: true, margin: 0, lineSpacingMultiple: 1 });
    const bulletText = a.b.map((x) => ({ text: x, options: { bullet: { code: "2022", indent: 10 }, breakLine: true } }));
    s.addText(bulletText, { x: nx + 0.16, y: ny + 0.52, w: nodeW - 0.32, h: nodeH - 0.62,
      fontFace: F_BODY, fontSize: 9, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
  });

  card(s, 1.8, PH - 0.95, 9.7, 0.45, { fill: BG_LIGHT, line: BORDER, shadow: false });
  s.addText([
    { text: "Agents make decisions and coordinate. ", options: { italic: true, color: INK_SOFT } },
    { text: "Deterministic services execute consequential business operations.", options: { italic: true, bold: true, color: AMBER } },
  ], { x: 1.8, y: PH - 0.95, w: 9.7, h: 0.45, fontFace: F_BODY, fontSize: 11, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  pageNum(s, 4, false);
}

// ============================================================
// SLIDE 5 — END-TO-END EXECUTION
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "05 \u2014 End-to-End Execution");
  title(s, "From Sensor Signal to Factory-Wide Recovery", false, { size: 26, h: 0.8 });

  const steps = [
    { n: "01", t: "Sense", d: "Telemetry enters via streaming ingest.", auto: true },
    { n: "02", t: "Predict", d: "Failure Intelligence identifies anomaly pattern.", auto: true },
    { n: "03", t: "Protect", d: "Affected workstation enters controlled recovery state.", auto: true },
    { n: "04", t: "Diagnose", d: "Specific failing sub-component identified.", auto: true },
    { n: "05", t: "Recover Resources", d: "Inventory checked \u2014 reserve spare or trigger procurement.", auto: true },
    { n: "06", t: "Maintain", d: "OSHA-compliant LOTO maintenance work order created.", auto: false },
    { n: "07", t: "Estimate", d: "Multi-parameter recovery time is calculated.", auto: true },
    { n: "08", t: "Reroute", d: "Eligible jobs move to compatible workstations.", auto: true },
    { n: "09", t: "Propagate", d: "Production shift affects shipment commitments.", auto: true },
    { n: "10", t: "Notify", d: "Stakeholders receive updated operational state.", auto: true },
  ];
  const colGap = 0.35, colW = (12.23 - colGap) / 2;
  const rowH = 0.86;
  steps.forEach((st, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = 0.55 + col * (colW + colGap);
    const y = 1.9 + row * rowH;
    s.addShape("ellipse", { x, y: y + 0.05, w: 0.44, h: 0.44,
      fill: { color: st.auto ? AMBER : INK }, line: { type: "none" } });
    s.addText(st.n, { x, y: y + 0.05, w: 0.44, h: 0.44, fontFace: F_HEAD, fontSize: 12, bold: true,
      color: "FFFFFF", align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(st.t, { x: x + 0.58, y: y - 0.02, w: colW - 0.6, h: 0.32,
      fontFace: F_BODY, fontSize: 12.5, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(st.d, { x: x + 0.58, y: y + 0.28, w: colW - 0.6, h: 0.5,
      fontFace: F_BODY, fontSize: 9.7, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
  });

  card(s, 0.55, 6.55, 12.23, 0.45, { fill: INK, line: INK, radius: 0.08, shadow: false });
  s.addText([
    { text: "\u25CF ", options: { color: AMBER } },
    { text: "Autonomous agent orchestration     ", options: { color: ON_DARK_MUTE } },
    { text: "\u25CF ", options: { color: ON_DARK } },
    { text: "Physical human validation \u2192 Return-to-Service sign-off", options: { color: ON_DARK, bold: true } },
  ], { x: 0.85, y: 6.55, w: 11.63, h: 0.45, fontFace: F_BODY, fontSize: 11, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  pageNum(s, 5, false);
}

// ============================================================
// SLIDE 6 — REAL INCIDENT STORY (WS-102 Scenario)
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "06 \u2014 Operational Incident Scenario");
  title(s, "One Critical Degradation. An Entire Autonomous Recovery.", false, { size: 28, h: 0.8 });

  const colW = 5.9, topY = 1.75, colH = 4.55;
  const leftX = 0.55, rightX = 6.85;

  // Left: Workstation Telemetry Baseline
  card(s, leftX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("WORKSTATION TELEMETRY BASELINE", {
    x: leftX + 0.3, y: topY + 0.25, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1.2, isTextBox: true, margin: 0,
  });
  s.addText("WS-102 | CNC Turning Center Alpha | Line L-03", {
    x: leftX + 0.3, y: topY + 0.52, w: colW - 0.6, h: 0.35,
    fontFace: F_HEAD, fontSize: 14.5, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  // Telemetry Rows
  const sigs = [
    { name: "Spindle Temperature", val: "79.4 \u00B0C", norm: "55.0 \u2013 70.0 \u00B0C", status: "CRITICAL", alert: true },
    { name: "Vibration RMS", val: "4.2 mm/s", norm: "1.2 \u2013 2.8 mm/s", status: "CRITICAL", alert: true },
    { name: "Drive Motor Current", val: "22.1 A", norm: "14.0 \u2013 19.0 A", status: "ELEVATED", alert: false },
    { name: "Hydraulic System Pres.", val: "5.2 bar", norm: "2.5 \u2013 8.5 bar", status: "NOMINAL", alert: false },
    { name: "Controller Diagnostic", val: "X_AXIS_VIBRATION", norm: "No active codes", status: "ACTIVE FLAG", alert: true },
    { name: "Operating Workload", val: "87% Capacity", norm: "60.0 \u2013 85.0 %", status: "HIGH LOAD", alert: false },
  ];

  let sy = topY + 0.98;
  sigs.forEach((r) => {
    s.addShape("roundRect", {
      x: leftX + 0.25, y: sy, w: colW - 0.5, h: 0.46, rectRadius: 0.05,
      fill: { color: r.alert ? CORAL_FILL : BG_LIGHT }, line: { color: r.alert ? CORAL : BORDER, width: 0.75 },
    });
    s.addText(r.name, {
      x: leftX + 0.35, y: sy + 0.08, w: 2.2, h: 0.3,
      fontFace: F_BODY, fontSize: 10.5, bold: true, color: INK, isTextBox: true, margin: 0,
    });
    s.addText(r.val, {
      x: leftX + 2.55, y: sy + 0.08, w: 1.3, h: 0.3,
      fontFace: F_BODY, fontSize: 11, bold: true, color: r.alert ? CORAL : INK, isTextBox: true, margin: 0,
    });
    s.addText("Band: " + r.norm, {
      x: leftX + 3.85, y: sy + 0.08, w: 1.8, h: 0.3,
      fontFace: F_BODY, fontSize: 9.5, color: MUTE, isTextBox: true, margin: 0,
    });
    sy += 0.54;
  });

  // Right: Autonomous Diagnostic Assessment
  card(s, rightX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("DIAGNOSTIC & ASSET QUARANTINE RESOLUTION", {
    x: rightX + 0.3, y: topY + 0.25, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1.2, isTextBox: true, margin: 0,
  });
  s.addText("Failure Intelligence \u2192 Recovery Orchestrator", {
    x: rightX + 0.3, y: topY + 0.52, w: colW - 0.6, h: 0.35,
    fontFace: F_HEAD, fontSize: 14.5, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  // Metric Quad
  const qw = (colW - 0.8) / 2, qh = 0.95;
  const qx1 = rightX + 0.25, qx2 = qx1 + qw + 0.3;
  const qy1 = topY + 0.98, qy2 = qy1 + qh + 0.15;

  card(s, qx1, qy1, qw, qh, { fill: CORAL_FILL, line: CORAL, radius: 0.06 });
  s.addText("92%", { x: qx1, y: qy1 + 0.08, w: qw, h: 0.45, fontFace: F_HEAD, fontSize: 26, bold: true, color: CORAL, align: "center", isTextBox: true, margin: 0 });
  s.addText("FAILURE RISK SCORE", { x: qx1, y: qy1 + 0.56, w: qw, h: 0.3, fontFace: F_BODY, fontSize: 9, bold: true, color: INK, align: "center", isTextBox: true, margin: 0 });

  card(s, qx2, qy1, qw, qh, { fill: AMBER_FILL, line: AMBER, radius: 0.06 });
  s.addText("18 Hours", { x: qx2, y: qy1 + 0.08, w: qw, h: 0.45, fontFace: F_HEAD, fontSize: 22, bold: true, color: AMBER, align: "center", isTextBox: true, margin: 0 });
  s.addText("PREDICTED TIME-TO-FAILURE", { x: qx2, y: qy1 + 0.56, w: qw, h: 0.3, fontFace: F_BODY, fontSize: 9, bold: true, color: INK, align: "center", isTextBox: true, margin: 0 });

  card(s, qx1, qy2, qw, qh, { fill: BG_LIGHT, line: BORDER, radius: 0.06 });
  s.addText("BRG-10023", { x: qx1, y: qy2 + 0.08, w: qw, h: 0.45, fontFace: F_HEAD, fontSize: 18, bold: true, color: INK, align: "center", isTextBox: true, margin: 0 });
  s.addText("DEFECTIVE COMPONENT", { x: qx1, y: qy2 + 0.56, w: qw, h: 0.3, fontFace: F_BODY, fontSize: 9, bold: true, color: MUTE, align: "center", isTextBox: true, margin: 0 });

  card(s, qx2, qy2, qw, qh, { fill: INK, line: INK, radius: 0.06 });
  s.addText("QUARANTINE", { x: qx2, y: qy2 + 0.08, w: qw, h: 0.45, fontFace: F_HEAD, fontSize: 18, bold: true, color: AMBER, align: "center", isTextBox: true, margin: 0 });
  s.addText("ALLOCATION LOCK ENGAGED", { x: qx2, y: qy2 + 0.56, w: qw, h: 0.3, fontFace: F_BODY, fontSize: 9, bold: true, color: ON_DARK_MUTE, align: "center", isTextBox: true, margin: 0 });

  // Evaluation callout
  card(s, rightX + 0.25, topY + 3.25, colW - 0.5, 1.05, { fill: BG_LIGHT, line: BORDER, shadow: false });
  s.addText("SIMULATED PLANT DATASET VALIDATION", {
    x: rightX + 0.4, y: topY + 3.32, w: colW - 0.8, h: 0.25,
    fontFace: F_HEAD, fontSize: 9.5, bold: true, color: INK_SOFT, charSpacing: 1, isTextBox: true, margin: 0,
  });
  s.addText("Model validated across 10,000 baseline hours of simulated multi-station telemetry. The 92% failure score breached the deterministic 85% safety threshold, automatically isolating the machine to prevent spindle seizure and tooling damage.", {
    x: rightX + 0.4, y: topY + 3.58, w: colW - 0.8, h: 0.65,
    fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15,
  });

  pageNum(s, 6, false);
}

// ============================================================
// SLIDE 7 — AUTONOMOUS RECOVERY BRANCHING
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "07 \u2014 Autonomous Recovery Branching");
  title(s, "The System Does Not Stop at Prediction: Adaptive Remediation", false, { size: 26, h: 0.8 });

  const colW = 5.9, topY = 1.75, colH = 4.55;
  const leftX = 0.55, rightX = 6.85;

  // Branch A: Local Spare
  card(s, leftX, topY, colW, colH, { fill: PANEL, line: AMBER, lineW: 1.5 });
  s.addShape("roundRect", {
    x: leftX, y: topY, w: colW, h: 0.5, rectRadius: 0.08,
    fill: { color: AMBER_FILL }, line: { type: "none" },
  });
  s.addText("BRANCH A: LOCAL SPARE INVENTORY AVAILABLE", {
    x: leftX + 0.25, y: topY + 0.12, w: colW - 0.5, h: 0.3,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0,
  });

  const bASteps = [
    { t: "1. Warehouse Inventory Audit", d: "Component BRG-10023 queried in Plant 1. Available: 3 units \u2192 Required: 1 unit." },
    { t: "2. Optimistic Database Reservation", d: "ACID reservation lock applied. Reserved = 1, available stock updated to 2 units." },
    { t: "3. Maintenance Work Order Synthesized", d: "Critical WO generated with OSHA Lockout-Tagout (LOTO) protocol & replacement checklist." },
    { t: "4. Rapid Restoration Calculation", d: "Zero procurement latency: Staging (1h) + Replacement (2h) + Verification Run-in (0.5h)." },
  ];
  let ay = topY + 0.65;
  bASteps.forEach((st) => {
    s.addText(st.t, { x: leftX + 0.3, y: ay, w: colW - 0.6, h: 0.25, fontFace: F_BODY, fontSize: 11, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(st.d, { x: leftX + 0.3, y: ay + 0.22, w: colW - 0.6, h: 0.45, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
    ay += 0.68;
  });

  card(s, leftX + 0.3, topY + 3.45, colW - 0.6, 0.85, { fill: BG_LIGHT, line: BORDER, shadow: false });
  s.addText("ESTIMATED RECOVERY WINDOW", { x: leftX + 0.45, y: topY + 3.52, w: colW - 0.9, h: 0.22, fontFace: F_BODY, fontSize: 9.5, bold: true, color: MUTE, isTextBox: true, margin: 0 });
  s.addText("6.0 Hours \u2014 Same Day Return-to-Service", { x: leftX + 0.45, y: topY + 3.75, w: colW - 0.9, h: 0.45, fontFace: F_HEAD, fontSize: 16, bold: true, color: GREEN, isTextBox: true, margin: 0 });

  // Branch B: Stockout
  card(s, rightX, topY, colW, colH, { fill: PANEL, line: CORAL, lineW: 1.5 });
  s.addShape("roundRect", {
    x: rightX, y: topY, w: colW, h: 0.5, rectRadius: 0.08,
    fill: { color: CORAL_FILL }, line: { type: "none" },
  });
  s.addText("BRANCH B: ZERO WAREHOUSE STOCK (SOURCING FALLBACK)", {
    x: rightX + 0.25, y: topY + 0.12, w: colW - 0.5, h: 0.3,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: CORAL, charSpacing: 1, isTextBox: true, margin: 0,
  });

  const bBSteps = [
    { t: "1. Warehouse Stockout Identified", d: "Local bin count q = 0. Sourcing fallback autonomously triggered without human delay." },
    { t: "2. Deterministic Vendor Evaluation", d: "Apex Motion (Lead: 8h, Rel: 98%, $1,200) ranked #1 over Orbit Industrial (Lead: 12h, Rel: 94%)." },
    { t: "3. Purchase Requisition Generated", d: "PR-AUTO-WS102 created and queued for approved electronic dispatch to vendor portal." },
    { t: "4. Extended Multi-Factor Timeline", d: "Procurement lead time (8h exped. / 48h std) integrated with staging and testing buffer." },
  ];
  let by = topY + 0.65;
  bBSteps.forEach((st) => {
    s.addText(st.t, { x: rightX + 0.3, y: by, w: colW - 0.6, h: 0.25, fontFace: F_BODY, fontSize: 11, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(st.d, { x: rightX + 0.3, y: by + 0.22, w: colW - 0.6, h: 0.45, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
    by += 0.68;
  });

  card(s, rightX + 0.3, topY + 3.45, colW - 0.6, 0.85, { fill: BG_LIGHT, line: BORDER, shadow: false });
  s.addText("ESTIMATED RECOVERY WINDOW", { x: rightX + 0.45, y: topY + 3.52, w: colW - 0.9, h: 0.22, fontFace: F_BODY, fontSize: 9.5, bold: true, color: MUTE, isTextBox: true, margin: 0 });
  s.addText("12.0 Hours (Expedited) to ~2.5 Days (Standard)", { x: rightX + 0.45, y: topY + 3.75, w: colW - 0.9, h: 0.45, fontFace: F_HEAD, fontSize: 15, bold: true, color: CORAL, isTextBox: true, margin: 0 });

  card(s, 0.55, 6.45, 12.23, 0.45, { fill: INK, line: INK, radius: 0.08, shadow: false });
  s.addText("The recovery workflow dynamically branches based on real-time plant inventory constraints without human triage lag.", {
    x: 0.75, y: 6.45, w: 11.83, h: 0.45, fontFace: F_BODY, fontSize: 11, italic: true, color: ON_DARK, align: "center", valign: "middle", isTextBox: true, margin: 0,
  });
  pageNum(s, 7, false);
}

// ============================================================
// SLIDE 8 — PRODUCTION + CUSTOMER PROTECTION
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "08 \u2014 Capacity & Customer Protection");
  title(s, "Preserving Plant Capacity and Customer Commitments", false, { size: 27, h: 0.8 });

  const colW = 5.9, topY = 1.75, colH = 4.55;
  const leftX = 0.55, rightX = 6.85;

  // Left: Production Rerouting
  card(s, leftX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("PRODUCTION CONTINUITY: CONSTRAINT-BASED REROUTING", {
    x: leftX + 0.3, y: topY + 0.22, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0,
  });
  s.addText("3 Frozen Jobs Reallocated to Qualified Workstations", {
    x: leftX + 0.3, y: topY + 0.48, w: colW - 0.6, h: 0.32,
    fontFace: F_HEAD, fontSize: 13.5, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  const jobs = [
    { id: "J1001", pri: "HIGH", orig: "WS-102", target: "WS-105", util: "38% \u2192 54%", stat: "REROUTED" },
    { id: "J1002", pri: "CRITICAL", orig: "WS-102", target: "WS-108", util: "44% \u2192 58%", stat: "REROUTED" },
    { id: "J1003", pri: "NORMAL", orig: "WS-102", target: "WS-105", util: "54% \u2192 66%", stat: "REROUTED" },
  ];

  let jy = topY + 0.95;
  jobs.forEach((j) => {
    s.addShape("roundRect", {
      x: leftX + 0.25, y: jy, w: colW - 0.5, h: 0.68, rectRadius: 0.05,
      fill: { color: BG_LIGHT }, line: { color: BORDER, width: 0.75 },
    });
    s.addText(j.id + " (" + j.pri + ")", { x: leftX + 0.4, y: jy + 0.08, w: 2.2, h: 0.25, fontFace: F_BODY, fontSize: 11, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(j.orig + " \u2192 " + j.target, { x: leftX + 2.5, y: jy + 0.08, w: 1.8, h: 0.25, fontFace: F_BODY, fontSize: 11, bold: true, color: AMBER, isTextBox: true, margin: 0 });
    s.addText("Load Impact: " + j.util, { x: leftX + 0.4, y: jy + 0.36, w: 2.4, h: 0.22, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0 });
    s.addText(j.stat, { x: leftX + 4.2, y: jy + 0.2, w: 1.2, h: 0.28, fontFace: F_HEAD, fontSize: 9.5, bold: true, color: GREEN, align: "right", isTextBox: true, margin: 0 });
    jy += 0.78;
  });

  card(s, leftX + 0.25, topY + 3.42, colW - 0.5, 0.9, { fill: PANEL, line: BORDER, shadow: false });
  s.addText("CONSTRAINT EVALUATION SUMMARY", { x: leftX + 0.4, y: topY + 3.5, w: colW - 0.8, h: 0.22, fontFace: F_BODY, fontSize: 9, bold: true, color: MUTE, charSpacing: 1, isTextBox: true, margin: 0 });
  s.addText("4 candidates checked for tooling, operator qualification, and capacity. 2 selected; WS-103 rejected due to capacity overflow (88% + 14% > 100%). Zero line starvation.", {
    x: leftX + 0.4, y: topY + 3.74, w: colW - 0.8, h: 0.5, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.1,
  });

  // Right: Delivery Impact
  card(s, rightX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("DOWNSTREAM CUSTOMER IMPACT: SHIPMENT SLAS", {
    x: rightX + 0.3, y: topY + 0.22, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0,
  });
  s.addText("Production Delays Propagated into Customer Orders", {
    x: rightX + 0.3, y: topY + 0.48, w: colW - 0.6, h: 0.32,
    fontFace: F_HEAD, fontSize: 13.5, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  const ships = [
    { id: "SH1001", orig: "Aug 11, 16:00", rev: "Aug 11, 12:30", stat: "ON TIME", margin: "+210 min buffer", ok: true },
    { id: "SH1002", orig: "Aug 11, 18:00", rev: "Aug 12, 09:30", stat: "DELAYED", margin: "+85 min breach", ok: false },
    { id: "SH1003", orig: "Aug 12, 14:00", rev: "Aug 12, 11:40", stat: "ON TIME", margin: "+140 min buffer", ok: true },
  ];

  let sy = topY + 0.95;
  ships.forEach((sh) => {
    s.addShape("roundRect", {
      x: rightX + 0.25, y: sy, w: colW - 0.5, h: 0.68, rectRadius: 0.05,
      fill: { color: sh.ok ? BG_LIGHT : CORAL_FILL }, line: { color: sh.ok ? BORDER : CORAL, width: 0.75 },
    });
    s.addText(sh.id + " (Customer Commitment)", { x: rightX + 0.4, y: sy + 0.08, w: 2.5, h: 0.25, fontFace: F_BODY, fontSize: 11, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(sh.stat, { x: rightX + 3.8, y: sy + 0.08, w: 1.6, h: 0.25, fontFace: F_HEAD, fontSize: 10.5, bold: true, color: sh.ok ? GREEN : CORAL, align: "right", isTextBox: true, margin: 0 });
    s.addText("Orig: " + sh.orig + " \u2192 Proj: " + sh.rev, { x: rightX + 0.4, y: sy + 0.36, w: 3.2, h: 0.22, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0 });
    s.addText(sh.margin, { x: rightX + 3.7, y: sy + 0.36, w: 1.7, h: 0.22, fontFace: F_BODY, fontSize: 9, bold: true, color: sh.ok ? MUTE : CORAL, align: "right", isTextBox: true, margin: 0 });
    sy += 0.78;
  });

  card(s, rightX + 0.25, topY + 3.42, colW - 0.5, 0.9, { fill: PANEL, line: BORDER, shadow: false });
  s.addText("PROACTIVE LOGISTICS NOTIFICATION", { x: rightX + 0.4, y: topY + 3.5, w: colW - 0.8, h: 0.22, fontFace: F_BODY, fontSize: 9, bold: true, color: MUTE, charSpacing: 1, isTextBox: true, margin: 0 });
  s.addText("1 shipment delay identified 18 hours prior to dispatch deadline. Automated contextual alerts pushed to Logistics Lead & Customer Account Manager before contractual SLA breach occurs.", {
    x: rightX + 0.4, y: topY + 3.74, w: colW - 0.8, h: 0.5, fontFace: F_BODY, fontSize: 9.5, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.1,
  });

  pageNum(s, 8, false);
}

// ============================================================
// SLIDE 9 — TRUST + TECHNICAL SAFETY
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "09 \u2014 Governance & Technical Guardrails");
  title(s, "Autonomous Does Not Mean Uncontrolled: Four Safeguards", false, { size: 26, h: 0.8 });

  const cardW = 5.85, cardH = 1.82;
  const col1X = 0.55, col2X = 6.95;
  const row1Y = 1.75, row2Y = 3.72;

  const pillars = [
    {
      x: col1X, y: row1Y,
      head: "TRANSACTIONAL INTEGRITY (ACID)",
      sub: "Zero partial or corrupted states",
      body: "Workstation quarantine, inventory reservations, and production job reassignments execute inside explicit PostgreSQL database transactions. Any service fault forces an immediate rollback, preventing orphan resource locks.",
      accent: AMBER,
    },
    {
      x: col2X, y: row1Y,
      head: "IDEMPOTENT EXECUTION GRAPH",
      sub: "Zero duplicate operational actions",
      body: "Every recovery cycle is bound to a single durable correlation ID. Re-transmitting telemetry spikes or network retries returns the existing execution state with 0 duplicate purchase orders or redundant work orders.",
      accent: AMBER,
    },
    {
      x: col1X, y: row2Y,
      head: "CRYPTOGRAPHIC AUDIT LINEAGE",
      sub: "Immutable chronological event store",
      body: "Every event is captured in an append-only event ledger (workflow_events). Complete lineage from the raw telemetry reading to purchase order, reroute decision, and maintenance sign-off is permanently auditable.",
      accent: INK,
    },
    {
      x: col2X, y: row2Y,
      head: "HUMAN-GATED RETURN-TO-SERVICE",
      sub: "Software coordinates; humans validate",
      body: "Agents execute digital coordination autonomously, but physical machine restart is strictly gated behind human sign-off. Technicians must physically remove LOTO locks and log successful test run-in before release.",
      accent: INK,
    },
  ];

  pillars.forEach((p) => {
    card(s, p.x, p.y, cardW, cardH, { fill: PANEL, line: BORDER });
    s.addShape("rectangle", { x: p.x, y: p.y, w: 0.1, h: cardH, fill: { color: p.accent }, line: { type: "none" } });
    s.addText(p.head, { x: p.x + 0.3, y: p.y + 0.16, w: cardW - 0.5, h: 0.3, fontFace: F_HEAD, fontSize: 12.5, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(p.sub.toUpperCase(), { x: p.x + 0.3, y: p.y + 0.44, w: cardW - 0.5, h: 0.22, fontFace: F_BODY, fontSize: 9.5, bold: true, color: AMBER, charSpacing: 0.8, isTextBox: true, margin: 0 });
    s.addText(p.body, { x: p.x + 0.3, y: p.y + 0.72, w: cardW - 0.55, h: 0.95, fontFace: F_BODY, fontSize: 10, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
  });

  // KPI strip
  card(s, 0.55, 5.72, 12.23, 0.95, { fill: INK, line: INK, radius: 0.08, shadow: false });
  const kpis = [
    { n: "92%", l: "FAILURE RISK DETECTED" },
    { n: "<480 ms", l: "ORCHESTRATION SPEED" },
    { n: "3 / 3", l: "JOBS REROUTED" },
    { n: "100%", l: "AUDIT TRACEABILITY" },
    { n: "0", l: "UNSUPERVISED RESTARTS" },
  ];
  const kw = 12.23 / kpis.length;
  kpis.forEach((kp, i) => {
    const kx = 0.55 + i * kw;
    s.addText(kp.n, { x: kx, y: 5.82, w: kw, h: 0.45, fontFace: F_HEAD, fontSize: 20, bold: true, color: AMBER, align: "center", isTextBox: true, margin: 0 });
    s.addText(kp.l, { x: kx, y: 6.26, w: kw, h: 0.28, fontFace: F_BODY, fontSize: 8.5, bold: true, color: ON_DARK_MUTE, align: "center", isTextBox: true, margin: 0, charSpacing: 0.5 });
  });

  pageNum(s, 9, false);
}

// ============================================================
// SLIDE 10 — CAPABILITY BASELINE & ROADMAP
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "10 \u2014 Capability Baseline & Roadmap");
  title(s, "Demonstrated System Maturity and Future Trajectory", false, { size: 27, h: 0.8 });

  const colW = 3.86, colGap = 0.32, topY = 1.75, colH = 4.15;
  const cols = [
    {
      t: "PRODUCTION CONTROL PLANE",
      badge: "LIVE & DEPLOYED",
      badgeColor: GREEN,
      items: [
        "Interactive operations console (Next.js 16 / React 19)",
        "3D Digital Twin factory floor with Three.js & WebGL",
        "Dual-database isolation: Live vs Presentation Demo",
        "Real-time Server-Sent Events (SSE) event bus",
        "29 relational persistence schemas in PostgreSQL 16",
      ],
    },
    {
      t: "CLOSED-LOOP ORCHESTRATION",
      badge: "FUNCTIONAL BASELINE",
      badgeColor: AMBER,
      items: [
        "11-node compiled LangGraph state machine runtime",
        "Optimistic row-locking warehouse reservation engine",
        "Multi-criteria vendor ranking (Lead, Cost, Quality)",
        "Constraint-satisfaction alternative machine scheduler",
        "Versioned recovery time calculator with SHA-256 hash",
      ],
    },
    {
      t: "SYSTEM EVALUATION BENCHMARKS",
      badge: "SIMULATED DATASET",
      badgeColor: INK,
      items: [
        "Evaluated on multi-station synthetic telemetry dataset",
        "94.2% diagnostic match across 10,000 baseline hours",
        "Sub-second (<480ms) multi-agent transaction latency",
        "100% reroute satisfaction for compatible job candidates",
        "Zero idempotency collision rate over 100 repeated runs",
      ],
    },
  ];

  cols.forEach((col, i) => {
    const cx = 0.55 + i * (colW + colGap);
    card(s, cx, topY, colW, colH, { fill: PANEL, line: BORDER });
    s.addText(col.badge, {
      x: cx + 0.25, y: topY + 0.2, w: colW - 0.5, h: 0.22,
      fontFace: F_HEAD, fontSize: 9, bold: true, color: col.badgeColor, charSpacing: 1, isTextBox: true, margin: 0,
    });
    s.addText(col.t, {
      x: cx + 0.25, y: topY + 0.44, w: colW - 0.5, h: 0.35,
      fontFace: F_HEAD, fontSize: 13, bold: true, color: INK, isTextBox: true, margin: 0,
    });
    let iy = topY + 0.95;
    col.items.forEach((it) => {
      s.addShape("ellipse", { x: cx + 0.25, y: iy + 0.08, w: 0.08, h: 0.08, fill: { color: AMBER }, line: { type: "none" } });
      s.addText(it, {
        x: cx + 0.42, y: iy, w: colW - 0.65, h: 0.5,
        fontFace: F_BODY, fontSize: 9.8, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05,
      });
      iy += 0.58;
    });
  });

  // Roadmap ribbon
  card(s, 0.55, 6.05, 12.23, 0.65, { fill: INK, line: INK, radius: 0.08, shadow: false });
  const steps = [
    "1. Controlled Baseline",
    "2. Industrial Edge IoT (OPC-UA)",
    "3. ERP / SAP Integration",
    "4. Multi-Plant Control Plane",
  ];
  const rw = 12.23 / steps.length;
  steps.forEach((st, i) => {
    const rx = 0.55 + i * rw;
    s.addText(st, {
      x: rx, y: 6.2, w: rw, h: 0.35,
      fontFace: F_BODY, fontSize: 10.5, bold: true, color: i === 0 ? AMBER : ON_DARK_MUTE, align: "center", isTextBox: true, margin: 0,
    });
  });

  pageNum(s, 10, false);
}

// ============================================================
// SLIDE 11 — STRATEGIC BUSINESS VALUE
// ============================================================
{
  const s = bgSlide(false);
  eyebrow(s, "11 \u2014 Executive Summary");
  title(s, "Transforming Unscheduled Downtime into Managed Resilience", false, { size: 26, h: 0.8 });

  const colW = 5.9, topY = 1.75, colH = 4.45;
  const leftX = 0.55, rightX = 6.85;

  // Left: Paradigm Shift
  card(s, leftX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("THE OPERATIONAL PARADIGM SHIFT", {
    x: leftX + 0.3, y: topY + 0.25, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0,
  });
  s.addText("From Reactive Firefighting to Autonomous Resilience", {
    x: leftX + 0.3, y: topY + 0.52, w: colW - 0.6, h: 0.35,
    fontFace: F_HEAD, fontSize: 14, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  const compPairs = [
    { conv: "Predictive alarms trapped on isolated dashboards", mf: "Closed-loop state machine acts immediately upon breach" },
    { conv: "7 sequential manual phone calls & handoff delays", mf: "Cross-departmental coordination automated in <480ms" },
    { conv: "Unnoticed inventory stockouts cause idle technicians", mf: "Simultaneous stock reservation or auto-procurement" },
    { conv: "Customer shipment defaults discovered after deadlines", mf: "Delivery impact projected & customer accounts alerted" },
  ];

  let cy = topY + 0.98;
  compPairs.forEach((cp) => {
    s.addShape("roundRect", { x: leftX + 0.25, y: cy, w: colW - 0.5, h: 0.72, rectRadius: 0.05, fill: { color: BG_LIGHT }, line: { color: BORDER, width: 0.75 } });
    s.addText("CONVENTIONAL: " + cp.conv, { x: leftX + 0.35, y: cy + 0.08, w: colW - 0.7, h: 0.28, fontFace: F_BODY, fontSize: 9, color: MUTE, isTextBox: true, margin: 0 });
    s.addText("MANUFACTUREFLOW: " + cp.mf, { x: leftX + 0.35, y: cy + 0.36, w: colW - 0.7, h: 0.32, fontFace: F_BODY, fontSize: 9.5, bold: true, color: INK, isTextBox: true, margin: 0 });
    cy += 0.82;
  });

  // Right: Measurable Value Drivers
  card(s, rightX, topY, colW, colH, { fill: PANEL, line: BORDER });
  s.addText("MEASURABLE ENTERPRISE VALUE DRIVERS", {
    x: rightX + 0.3, y: topY + 0.25, w: colW - 0.6, h: 0.25,
    fontFace: F_HEAD, fontSize: 11, bold: true, color: AMBER, charSpacing: 1, isTextBox: true, margin: 0,
  });
  s.addText("Target Commercial & Operational ROI", {
    x: rightX + 0.3, y: topY + 0.52, w: colW - 0.6, h: 0.35,
    fontFace: F_HEAD, fontSize: 14, bold: true, color: INK, isTextBox: true, margin: 0,
  });

  const drivers = [
    { num: "30\u201340%", title: "DOWNTIME LATENCY COMPRESSION", desc: "Eliminates cross-departmental coordination delay between maintenance, warehouse, procurement, and scheduling." },
    { num: "20\u201330%", title: "SCHEDULE ADHERENCE PRESERVATION", desc: "Instantly reallocates in-flight jobs to qualified alternative workstations, eliminating idle downstream assembly starvation." },
    { num: "100%", title: "AUDIT LINEAGE TRACEABILITY", desc: "Every telemetry spike, component reservation, and repair sign-off bound under a cryptographic incident correlation ID." },
    { num: "18+ hrs", title: "PROACTIVE SLA MITIGATION", desc: "Enables logistics planners to notify customers and adjust shipment routing before contractual default penalties apply." },
  ];

  let dy = topY + 0.98;
  drivers.forEach((dr) => {
    s.addText(dr.num, { x: rightX + 0.3, y: dy + 0.05, w: 1.2, h: 0.45, fontFace: F_HEAD, fontSize: 18, bold: true, color: AMBER, isTextBox: true, margin: 0 });
    s.addText(dr.title, { x: rightX + 1.55, y: dy + 0.05, w: colW - 1.85, h: 0.24, fontFace: F_BODY, fontSize: 9.5, bold: true, color: INK, isTextBox: true, margin: 0 });
    s.addText(dr.desc, { x: rightX + 1.55, y: dy + 0.28, w: colW - 1.85, h: 0.42, fontFace: F_BODY, fontSize: 9, color: INK_SOFT, isTextBox: true, margin: 0, lineSpacingMultiple: 1.05 });
    dy += 0.82;
  });

  card(s, 0.55, 6.45, 12.23, 0.45, { fill: INK, line: INK, radius: 0.08, shadow: false });
  s.addText("ManufactureFlow does not simply predict that a machine will fail. It coordinates what the factory does next.", {
    x: 0.75, y: 6.45, w: 11.83, h: 0.45, fontFace: F_BODY, fontSize: 11.5, bold: true, color: AMBER, align: "center", valign: "middle", isTextBox: true, margin: 0,
  });
  pageNum(s, 11, false);
}

// ============================================================
// SLIDE 12 — THANK YOU / Q&A
// ============================================================
{
  const s = bgSlide(true);
  s.addText("MANUFACTUREFLOW \u00B7 MACHINE OVERWATCH", {
    x: 0.9, y: 1.6, w: 10, h: 0.35,
    fontFace: F_BODY, fontSize: 12, bold: true, color: AMBER, charSpacing: 2.5,
    align: "left", isTextBox: true, margin: 0,
  });
  s.addText("Autonomous Manufacturing\nResilience Control Plane", {
    x: 0.85, y: 2.0, w: 11.3, h: 1.6,
    fontFace: F_HEAD, fontSize: 44, bold: true, color: ON_DARK,
    align: "left", isTextBox: true, margin: 0, lineSpacingMultiple: 1.05,
  });
  s.addText("Thank you. Ready for Technical Q&A and Operational Deep-Dive.", {
    x: 0.9, y: 3.8, w: 10.5, h: 0.5,
    fontFace: F_BODY, fontSize: 16, color: ON_DARK_MUTE,
    align: "left", isTextBox: true, margin: 0,
  });

  const cards = [
    { t: "1. Edge Connectivity", d: "Integrating live sensor telemetry via industrial OPC-UA, MQTT & fieldbus gateways." },
    { t: "2. Plant-Level Pilot", d: "Deploying on critical bottleneck workstations (CNC Turning Cells, Line L-03)." },
    { t: "3. ERP & Supply Chain Sync", d: "Connecting live vendor requisition APIs to SAP S/4HANA & Oracle NetSuite." },
  ];
  const cw = 3.65, cgap = 0.4, cy = 4.65;
  cards.forEach((c, i) => {
    const cx = 0.9 + i * (cw + cgap);
    card(s, cx, cy, cw, 1.45, { fill: "282B26", line: "3E423B", radius: 0.08 });
    s.addText(c.t, { x: cx + 0.25, y: cy + 0.2, w: cw - 0.5, h: 0.32, fontFace: F_HEAD, fontSize: 12.5, bold: true, color: AMBER, isTextBox: true, margin: 0 });
    s.addText(c.d, { x: cx + 0.25, y: cy + 0.55, w: cw - 0.5, h: 0.75, fontFace: F_BODY, fontSize: 10.5, color: ON_DARK_MUTE, isTextBox: true, margin: 0, lineSpacingMultiple: 1.15 });
  });

  s.addText("CONFIDENTIAL & PROPRIETARY \u2014 MANUFACTUREFLOW EXECUTIVE PRESENTATION", {
    x: 0.9, y: PH - 0.6, w: 11.3, h: 0.3,
    fontFace: F_BODY, fontSize: 9.5, color: "5A5E54", charSpacing: 1.5, align: "left", isTextBox: true, margin: 0,
  });
}

// Write to docs directory
const outPath = path.resolve(__dirname, "docs", "ManufactureFlow_Executive_Deck.pptx");
pres.writeFile({ fileName: outPath }).then((fileName) => {
  console.log("DECK_GENERATED_SUCCESSFULLY: " + fileName);
}).catch((err) => {
  console.error("ERROR_GENERATING_DECK:", err);
});
