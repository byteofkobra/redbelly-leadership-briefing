#!/usr/bin/env node
// Builds every deliverable from build/content.js, data/sources.json and data/claims.json:
//   briefing/redbelly-leadership-briefing.docx  (then PDF via LibreOffice, see README)
//   briefing/redbelly-leadership-briefing.md
//   x-thread/x-thread.md, x-thread/x-thread.txt
//   sources/sources.md, sources/sources.csv, sources/claim-check.md
// Citation numbers are assigned in order of first appearance in the briefing.

const fs = require('fs');
const path = require('path');
const D = require('docx');
const { AS_OF, briefing, thread } = require('./content');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);
const { sources, reviewed_not_cited: reviewed } = read('data/sources.json');
const { claims } = read('data/claims.json');
const byId = Object.fromEntries(sources.map((s) => [s.id, s]));

// ---------- citation numbering ----------
const CITE_RE = /\[@([^\]]+)\]/g;
const num = {};
const order = [];
for (const m of JSON.stringify(briefing).matchAll(CITE_RE)) {
  for (const id of m[1].split(',').map((x) => x.trim())) {
    if (!byId[id]) throw new Error(`Unknown source id in briefing: ${id}`);
    if (!(id in num)) { order.push(id); num[id] = order.length; }
  }
}
const unused = sources.filter((s) => !(s.id in num)).map((s) => s.id);
if (unused.length) throw new Error(`Sources never cited in the briefing: ${unused.join(', ')}`);
for (const post of thread) for (const id of post.links) {
  if (!(id in num)) throw new Error(`Thread links to a source the briefing does not cite: ${id}`);
}
for (const c of claims) for (const s of c.support) {
  if (!byId[s.source]) throw new Error(`Unknown source id in claims: ${s.source}`);
}
const numbered = order.map((id) => ({ n: num[id], ...byId[id] }));

// ---------- X weighted length (twitter-text v3: URLs = 23, most other code points = 1) ----------
function xLength(text) {
  const t = text.replace(/https?:\/\/\S+/g, 'x'.repeat(23));
  let n = 0;
  for (const ch of t) {
    const c = ch.codePointAt(0);
    const light = c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
    n += light ? 1 : 2;
  }
  return n;
}
const posts = thread.map((p, i) => {
  const urls = p.links.map((id) => byId[id].url);
  const full = [p.text, ...urls].join('\n');
  const len = xLength(full);
  if (len > 280) throw new Error(`Post ${i + 1} is ${len}/280`);
  return { i: i + 1, text: p.text, urls, ids: p.links, full, len };
});

// ---------- inline markup ----------
function tokens(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(/(\*\*[^*]+\*\*|_[^_]+_|\[@[^\]]+\])/g)) {
    if (m.index > last) out.push({ t: 'text', s: text.slice(last, m.index) });
    const s = m[0];
    if (s.startsWith('**')) out.push({ t: 'text', s: s.slice(2, -2), bold: true });
    else if (s.startsWith('[@')) out.push({ t: 'cite', ids: s.slice(2, -1).split(',').map((x) => x.trim()) });
    else out.push({ t: 'text', s: s.slice(1, -1), italic: true });
    last = m.index + s.length;
  }
  if (last < text.length) out.push({ t: 'text', s: text.slice(last) });
  // keep a citation on the same line as the word before it
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].t === 'text' && out[i + 1].t === 'cite') out[i].s = out[i].s.replace(/ $/, ' ');
  }
  return out;
}

// ---------- design tokens ----------
const FONT = 'Calibri';
const C = {
  ink: '1F2933', muted: '5B6670', accent: 'A61E2A', rule: 'D5DAE0', panel: 'F6F7F9', accentTint: 'F8E9EA',
  link: '1B5FAA', amber: 'A86A00', amberTint: 'FFF6E5', factFill: 'E3F1E8', factText: '1D6440',
  qFill: 'E6EDF7', qText: '27497A', white: 'FFFFFF',
};
const PAGE = { w: 11906, h: 16838, mx: 960, my: 900 };
const CW = PAGE.w - 2 * PAGE.mx; // content width in DXA
const SZ = { body: 19, small: 17, tiny: 15, cite: 15 };
const NONE = { style: D.BorderStyle.NONE, size: 0, color: 'auto' };
const line = (color = C.rule, size = 4) => ({ style: D.BorderStyle.SINGLE, size, color });
const fill = (hex) => ({ type: D.ShadingType.CLEAR, fill: hex, color: 'auto' });

function runs(text, o = {}) {
  const size = o.size || SZ.body;
  const out = [];
  for (const tk of tokens(text)) {
    if (tk.t === 'text') {
      out.push(new D.TextRun({
        text: tk.s, font: FONT, size, bold: tk.bold || o.bold, italics: tk.italic || o.italics,
        color: tk.bold && o.boldColor ? o.boldColor : o.color || C.ink,
      }));
    } else {
      for (const id of tk.ids) {
        out.push(new D.ExternalHyperlink({
          link: byId[id].url,
          children: [new D.TextRun({ text: `[${num[id]}]`, font: FONT, size: o.citeSize || SZ.cite, color: C.link })],
        }));
      }
    }
  }
  return out;
}
const para = (text, o = {}) => new D.Paragraph({
  spacing: { before: o.before || 0, after: o.after ?? 95, line: o.line || 259, lineRule: D.LineRuleType.AUTO },
  keepNext: !!o.keepNext, alignment: o.align, indent: o.indent, numbering: o.numbering,
  children: runs(text, o),
});
const cell = (children, o = {}) => new D.TableCell({
  width: { size: o.w, type: D.WidthType.DXA },
  shading: o.fill ? fill(o.fill) : undefined,
  margins: { top: o.mt ?? 60, bottom: o.mb ?? 60, left: o.ml ?? 100, right: o.mr ?? 100 },
  borders: o.borders, columnSpan: o.span, verticalAlign: o.valign || D.VerticalAlign.TOP,
  children,
});

const TAGS = {
  fact: { text: 'SOURCED FACT', fill: C.factFill, color: C.factText },
  analysis: { text: 'ANALYSIS, NOT FACT', fill: C.amberTint, color: C.amber },
  questions: { text: 'OPEN QUESTIONS', fill: C.qFill, color: C.qText },
  sources: { text: 'SOURCES', fill: C.qFill, color: C.qText },
  thread: { text: 'READY TO POST', fill: C.qFill, color: C.qText },
};
function h1(numText, text, tag, o = {}) {
  const t = TAGS[tag];
  return new D.Paragraph({
    heading: D.HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: !!o.pageBreak,
    spacing: { before: o.pageBreak ? 0 : 200, after: 100 },
    border: { bottom: line(C.rule, 6) },
    tabStops: [{ type: D.TabStopType.RIGHT, position: CW }],
    children: [
      new D.TextRun({ text: `${numText} `, font: FONT, size: 26, bold: true, color: C.accent }),
      new D.TextRun({ text, font: FONT, size: 26, bold: true, color: C.ink }),
      new D.TextRun({ children: [new D.Tab()] }),
      new D.TextRun({ text: ` ${t.text} `, font: FONT, size: 14, bold: true, color: t.color, shading: fill(t.fill), characterSpacing: 16 }),
    ],
  });
}
const h2 = (text) => new D.Paragraph({
  heading: D.HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 140, after: 60 },
  children: [new D.TextRun({ text, font: FONT, size: 21, bold: true, color: C.accent })],
});
const bulletP = (text, o = {}) => new D.Paragraph({
  numbering: { reference: 'dot', level: 0 }, spacing: { after: o.after ?? 70, line: 259, lineRule: D.LineRuleType.AUTO },
  keepNext: !!o.keepNext, children: runs(text, o),
});

function dataTable(block) {
  // widths in content.js are relative; scale them to the content width
  const total = block.widths.reduce((a, b) => a + b, 0);
  const widths = block.widths.map((w) => Math.floor((w * CW) / total));
  widths[widths.length - 1] += CW - widths.reduce((a, b) => a + b, 0);
  const head = new D.TableRow({
    tableHeader: true, cantSplit: true,
    children: block.head.map((h, i) => cell([new D.Paragraph({ children: [new D.TextRun({ text: h.toUpperCase(), font: FONT, size: 14, bold: true, color: C.white, characterSpacing: 12 })] })], { w: widths[i], fill: C.ink, mt: 50, mb: 50 })),
  });
  const rows = block.rows.map((r, ri) => new D.TableRow({
    cantSplit: true,
    children: r.map((txt, i) => cell([new D.Paragraph({ spacing: { after: 0, line: 252, lineRule: D.LineRuleType.AUTO }, children: runs(txt, { size: SZ.small, bold: i === 0 && block.head[0] !== 'Organisation' ? true : undefined }) })], { w: widths[i], fill: ri % 2 ? C.panel : C.white, mt: 40, mb: 40 })),
  }));
  return new D.Table({
    width: { size: CW, type: D.WidthType.DXA }, columnWidths: widths,
    borders: { top: NONE, left: NONE, right: NONE, bottom: line(C.rule, 6), insideHorizontal: line(C.rule, 4), insideVertical: NONE },
    rows: [head, ...rows],
  });
}

function glanceTable(block) {
  const lw = 2000;
  const widths = [lw, CW - lw];
  const sep = { top: NONE, left: NONE, right: NONE, bottom: { style: D.BorderStyle.SINGLE, size: 12, color: C.white } };
  const title = new D.TableRow({
    cantSplit: true,
    children: [cell([new D.Paragraph({ children: [new D.TextRun({ text: block.title.toUpperCase(), font: FONT, size: 15, bold: true, color: C.white, characterSpacing: 24 })] })], { w: CW, span: 2, fill: C.accent, mt: 70, mb: 70, ml: 140, borders: sep })],
  });
  const rows = block.rows.map(([label, text]) => new D.TableRow({
    cantSplit: true,
    children: [
      cell([new D.Paragraph({ children: [new D.TextRun({ text: label, font: FONT, size: SZ.small, bold: true, color: C.accent })] })], { w: widths[0], fill: C.accentTint, ml: 140, mt: 45, mb: 45, borders: sep, valign: D.VerticalAlign.CENTER }),
      cell([new D.Paragraph({ spacing: { after: 0, line: 252, lineRule: D.LineRuleType.AUTO }, children: runs(text, { size: SZ.small + 1 }) })], { w: widths[1], fill: C.panel, ml: 140, mt: 45, mb: 45, borders: sep, valign: D.VerticalAlign.CENTER }),
    ],
  }));
  return new D.Table({
    width: { size: CW, type: D.WidthType.DXA }, columnWidths: widths,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [title, ...rows],
  });
}

// One coloured panel made of stacked rows, so it can break cleanly across pages.
function panel(rowsOfParagraphs, { accent, tint }) {
  const b = { top: NONE, bottom: NONE, right: NONE, left: { style: D.BorderStyle.SINGLE, size: 24, color: accent } };
  return new D.Table({
    width: { size: CW, type: D.WidthType.DXA }, columnWidths: [CW],
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: rowsOfParagraphs.map((ps, i) => new D.TableRow({
      cantSplit: true,
      children: [cell(ps, { w: CW, fill: tint, borders: b, ml: 220, mr: 180, mt: i === 0 ? 110 : 20, mb: i === rowsOfParagraphs.length - 1 ? 110 : 20 })],
    })),
  });
}

const spacer = (after = 120) => new D.Paragraph({ spacing: { after, before: 0 }, children: [] });

// ---------- DOCX body ----------
const body = [];
for (const b of briefing) {
  switch (b.type) {
    case 'kicker':
      body.push(new D.Paragraph({ spacing: { after: 90 }, children: [new D.TextRun({ text: b.text, font: FONT, size: 15, bold: true, color: C.accent, characterSpacing: 24 })] }));
      break;
    case 'title':
      body.push(new D.Paragraph({ spacing: { before: 0, after: 80, line: 250, lineRule: D.LineRuleType.AUTO }, children: [new D.TextRun({ text: b.text, font: FONT, size: 46, bold: true, color: C.ink })] }));
      break;
    case 'subtitle':
      body.push(new D.Paragraph({ spacing: { after: 160 }, border: { bottom: line(C.accent, 12) }, children: [new D.TextRun({ text: b.text, font: FONT, size: 23, color: C.muted })] }));
      break;
    case 'guide':
      body.push(para(b.text, { size: SZ.small, color: C.muted, boldColor: C.ink, before: 60, after: 150 }));
      break;
    case 'glance':
      body.push(glanceTable(b), spacer(60));
      break;
    case 'h1':
      body.push(h1(b.num, b.text, b.tag));
      break;
    case 'h2':
      body.push(h2(b.text));
      break;
    case 'p':
      body.push(para(b.text, { keepNext: b.keepNext }));
      break;
    case 'bullets':
      b.items.forEach((t, i) => body.push(bulletP(t, { after: i === b.items.length - 1 ? 120 : 70 })));
      break;
    case 'table':
      body.push(dataTable(b));
      if (b.note) body.push(para(b.note, { size: SZ.tiny, italics: true, color: C.muted, before: 50, after: 130, line: 240 }));
      else body.push(spacer(110));
      break;
    case 'quote':
      body.push(panel(b.paras.map((t) => [para(t, { italics: true, after: 0, line: 270 })]), { accent: C.accent, tint: C.panel }), spacer(90));
      break;
    case 'analysis': {
      const rows = [[para(b.label, { size: SZ.small, color: C.amber, boldColor: C.amber, after: 0 })]];
      b.items.forEach((t) => rows.push([bulletP(t, { after: 0 })]));
      rows.push([new D.Paragraph({ spacing: { before: 60, after: 0 }, keepNext: true, children: [new D.TextRun({ text: b.subhead, font: FONT, size: SZ.body + 1, bold: true, color: C.amber })] })]);
      b.items2.forEach((t) => rows.push([bulletP(t, { after: 0 })]));
      body.push(panel(rows, { accent: C.amber, tint: C.amberTint }), spacer(60));
      break;
    }
    default:
      throw new Error(`Unknown block ${b.type}`);
  }
}

// Annex A: sources
body.push(h1('A', 'Annex A: Source list', 'sources', { pageBreak: true }));
body.push(para(`Every link below was opened and checked on ${AS_OF}. Numbers match the citations in the briefing and the X thread. Company figures are as reported by the companies themselves. A claim-by-claim table with a verbatim excerpt from each source is in sources/claim-check.md.`, { size: SZ.small, color: C.muted, after: 120 }));
for (const s of numbered) {
  const children = [
    new D.TextRun({ text: `[${s.n}]`, font: FONT, size: SZ.small, bold: true, color: C.accent }),
    new D.TextRun({ children: [new D.Tab()] }),
    new D.TextRun({ text: `${s.publisher}. `, font: FONT, size: SZ.small, bold: true, color: C.ink }),
    new D.TextRun({ text: `“${s.title}”. `, font: FONT, size: SZ.small, color: C.ink }),
    new D.TextRun({ text: `${s.date[0].toUpperCase()}${s.date.slice(1)}.`, font: FONT, size: SZ.small, color: C.muted }),
  ];
  if (s.note) children.push(new D.TextRun({ text: ` ${s.note}`, font: FONT, size: SZ.small, italics: true, color: C.muted }));
  children.push(new D.TextRun({ break: 1, text: '' }));
  children.push(new D.ExternalHyperlink({ link: s.url, children: [new D.TextRun({ text: s.url, font: FONT, size: SZ.tiny, color: C.link, underline: { type: D.UnderlineType.SINGLE, color: C.link } })] }));
  body.push(new D.Paragraph({
    spacing: { after: 34, line: 236, lineRule: D.LineRuleType.AUTO }, keepLines: true,
    indent: { left: 460, hanging: 460 }, tabStops: [{ type: D.TabStopType.LEFT, position: 460 }], children,
  }));
}
body.push(new D.Paragraph({ spacing: { before: 80, after: 40 }, keepNext: true, children: [new D.TextRun({ text: 'Reviewed but not cited', font: FONT, size: SZ.body, bold: true, color: C.ink })] }));
for (const r of reviewed) {
  body.push(new D.Paragraph({
    spacing: { after: 60, line: 245, lineRule: D.LineRuleType.AUTO }, children: [
      new D.TextRun({ text: `${r.publisher}. `, font: FONT, size: SZ.small, bold: true, color: C.ink }),
      new D.TextRun({ text: `${r.title}. ${r.reason} `, font: FONT, size: SZ.small, color: C.muted }),
      new D.ExternalHyperlink({ link: r.url, children: [new D.TextRun({ text: r.url, font: FONT, size: SZ.tiny, color: C.link, underline: { type: D.UnderlineType.SINGLE, color: C.link } })] }),
    ],
  }));
}

// Annex B: X thread
body.push(h1('B', 'Annex B: X thread', 'thread', { pageBreak: true }));
body.push(para(`${posts.length} posts, ready to copy. X counts every link as 23 characters; each count below includes the links, and every post is within the 280-character limit and links to its sources. Post 8 is analysis and says so.`, { size: SZ.small, color: C.muted, after: 140 }));
for (const p of posts) {
  const inner = [
    new D.Paragraph({ spacing: { after: 50 }, children: [
      new D.TextRun({ text: `POST ${p.i} OF ${posts.length}`, font: FONT, size: 14, bold: true, color: C.accent, characterSpacing: 20 }),
      new D.TextRun({ text: ` ${p.len}/280 characters`, font: FONT, size: 14, color: C.muted }),
    ] }),
    new D.Paragraph({ spacing: { after: 50, line: 264, lineRule: D.LineRuleType.AUTO }, children: [new D.TextRun({ text: p.text, font: FONT, size: SZ.body, color: C.ink })] }),
    ...p.urls.map((u) => new D.Paragraph({ spacing: { after: 0 }, children: [new D.ExternalHyperlink({ link: u, children: [new D.TextRun({ text: u, font: FONT, size: SZ.tiny, color: C.link })] })] })),
  ];
  body.push(new D.Table({
    width: { size: CW, type: D.WidthType.DXA }, columnWidths: [CW],
    borders: { top: line(), bottom: line(), left: { style: D.BorderStyle.SINGLE, size: 18, color: C.accent }, right: line(), insideHorizontal: NONE, insideVertical: NONE },
    rows: [new D.TableRow({ cantSplit: true, children: [cell(inner, { w: CW, ml: 180, mr: 160, mt: 90, mb: 90 })] })],
  }), spacer(100));
}

// ---------- header / footer ----------
const small = (text, o = {}) => new D.TextRun({ text, font: FONT, size: 14, color: C.muted, ...o });
const header = new D.Header({ children: [new D.Paragraph({
  border: { bottom: line(C.rule, 4) }, spacing: { after: 0 }, tabStops: [{ type: D.TabStopType.RIGHT, position: CW }],
  children: [small('Redbelly’s incoming CEO  ·  Community briefing', { bold: true, color: C.ink }), new D.TextRun({ children: [new D.Tab()] }), small(`Information current to ${AS_OF}`)],
})] });
const footer = new D.Footer({ children: [new D.Paragraph({
  border: { top: line(C.rule, 4) }, spacing: { before: 0 }, tabStops: [{ type: D.TabStopType.RIGHT, position: CW }],
  children: [
    small('Independent community briefing. Not an official Redbelly Network or Tokeniser publication. Not financial advice.'),
    new D.TextRun({ children: [new D.Tab()] }),
    new D.TextRun({ font: FONT, size: 14, color: C.muted, children: ['Page ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES] }),
  ],
})] });

const doc = new D.Document({
  creator: '', lastModifiedBy: '',
  title: 'Redbelly’s incoming CEO: Christian Westerlind Wigstrom',
  subject: 'Community briefing on Redbelly Network’s incoming CEO and what his record could mean for Tokeniser',
  keywords: 'Redbelly Network; Tokeniser; CEO; tokenisation; briefing',
  description: `Sourced community briefing. Information current to ${AS_OF}.`,
  styles: {
    default: { document: { run: { font: FONT, size: SZ.body, color: C.ink } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 46, bold: true, color: C.ink }, paragraph: { spacing: { after: 70 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: C.ink }, paragraph: { spacing: { before: 230, after: 110 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 21, bold: true, color: C.accent }, paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'dot', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 200 } }, run: { color: C.accent, bold: true } } }] }] },
  sections: [{
    properties: { page: { size: { width: PAGE.w, height: PAGE.h }, margin: { top: PAGE.my, bottom: PAGE.my, left: PAGE.mx, right: PAGE.mx, header: 480, footer: 480 } }, titlePage: true },
    headers: { default: header, first: new D.Header({ children: [new D.Paragraph({ children: [] })] }) },
    footers: { default: footer, first: footer },
    children: body,
  }],
});

// ---------- Markdown outputs ----------
const mdCite = (ids) => ids.map((id) => `[[${num[id]}]](${byId[id].url})`).join('');
function md(text) {
  return tokens(text).map((tk) => {
    if (tk.t === 'cite') return mdCite(tk.ids);
    const s = tk.s.replace(/ /g, ' ');
    if (tk.bold) return `**${s}**`;
    if (tk.italic) return `*${s}*`;
    return s;
  }).join('');
}
const mdTagLabel = { fact: 'SOURCED FACT', analysis: 'ANALYSIS, NOT FACT', questions: 'OPEN QUESTIONS' };
const mdEsc = (s) => s.replace(/\|/g, '\\|');

const M = [];
for (const b of briefing) {
  switch (b.type) {
    case 'kicker': M.push(`<sub>${b.text}</sub>`, ''); break;
    case 'title': M.push(`# ${b.text}`, ''); break;
    case 'subtitle': M.push(`*${b.text}*`, ''); break;
    case 'guide': M.push(`> ${md(b.text)}`, ''); break;
    case 'glance':
      M.push(`### ${b.title}`, '', '| | |', '|---|---|', ...b.rows.map(([l, t]) => `| **${l}** | ${mdEsc(md(t))} |`), '');
      break;
    case 'h1': M.push(`## ${b.num}. ${b.text}`, '', `<kbd>${mdTagLabel[b.tag]}</kbd>`, ''); break;
    case 'h2': M.push(`### ${b.text}`, ''); break;
    case 'p': M.push(md(b.text), ''); break;
    case 'bullets': M.push(...b.items.map((t) => `- ${md(t)}`), ''); break;
    case 'table':
      M.push(`| ${b.head.join(' | ')} |`, `|${b.head.map(() => '---').join('|')}|`, ...b.rows.map((r) => `| ${r.map((x) => mdEsc(md(x))).join(' | ')} |`), '');
      if (b.note) M.push(`<sub>${b.note}</sub>`, '');
      break;
    case 'quote': M.push(...b.paras.flatMap((t, i) => (i ? ['>', `> *${md(t)}*`] : [`> *${md(t)}*`])), ''); break;
    case 'analysis':
      M.push('> [!IMPORTANT]', `> ${md(b.label)}`, '>', ...b.items.map((t) => `> - ${md(t)}`), '>', `> **${b.subhead}**`, '>', ...b.items2.map((t) => `> - ${md(t)}`), '');
      break;
    default: throw new Error(b.type);
  }
}
M.push('---', '', '## Annex A: Source list', '', `Every link was opened and checked on ${AS_OF}. Numbers match the citations above. For a verbatim excerpt supporting each claim, see [the claim-by-claim check](../sources/claim-check.md).`, '');
for (const s of numbered) M.push(`${s.n}. **${s.publisher}.** “${s.title}”. ${s.date[0].toUpperCase()}${s.date.slice(1)}. <${s.url}>${s.note ? ` *${s.note}*` : ''}`);
M.push('', '## Annex B: X thread', '', 'The ready-to-post thread is in [x-thread/x-thread.md](../x-thread/x-thread.md).', '', '---', '', '<sub>Independent community briefing. Not an official Redbelly Network or Tokeniser publication. Not financial advice.</sub>', '');

// X thread
const T = [
  '# X thread: Redbelly’s incoming CEO', '',
  `${posts.length} posts summarising the [community briefing](../briefing/redbelly-leadership-briefing.md). Information current to ${AS_OF}.`, '',
  '- Copy each block as one post. The links are part of the post.',
  '- Character counts follow X’s rules: every link counts as 23 characters, whatever its length.',
  '- Every post links to the source that supports it. Post 8 is analysis and is labelled as such.',
  '- `scripts/verify.py` re-checks the counts and links.', '',
];
for (const p of posts) {
  T.push(`### Post ${p.i} of ${posts.length} · ${p.len}/280`, '', '```text', p.full, '```', '');
  T.push(`<sub>Sources: ${p.ids.map((id) => `[[${num[id]}] ${byId[id].publisher}](${byId[id].url})`).join(' · ')}</sub>`, '');
}
const TXT = posts.map((p) => `[${p.i}/${posts.length}] ${p.len}/280\n${p.full}`).join('\n\n----\n\n') + '\n';

// Sources
const S = [
  '# Source list', '',
  `${numbered.length} sources, numbered as cited in the briefing. Every link was opened and checked on ${AS_OF}; \`scripts/check_sources.py\` re-checks them and confirms each supporting excerpt is still on the page. The latest run is in [verification-report.md](verification-report.md), and the claim-by-claim mapping is in [claim-check.md](claim-check.md).`, '',
  '| # | Publisher | Title | Date | Type | Link |', '|---:|---|---|---|---|---|',
  ...numbered.map((s) => `| ${s.n} | ${mdEsc(s.publisher)} | ${mdEsc(s.title)} | ${s.date} | ${s.kind} | [Open](${s.url}) |`), '',
  '## Notes on access', '',
  ...numbered.filter((s) => s.note).map((s) => `- **[${s.n}] ${s.publisher}:** ${s.note}`),
  '- Company figures (payment volumes, client reach, network statistics) are as reported by the companies themselves.', '',
  '## Reviewed but not cited', '',
  ...reviewed.map((r) => `- **${r.publisher}**: [${r.title}](${r.url}). ${r.reason}`), '',
  '## Full URLs', '',
  ...numbered.map((s) => `${s.n}. <${s.url}>`), '',
];
const csvq = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const CSV = ['number,id,publisher,title,date,type,url,access,note', ...numbered.map((s) => [s.n, s.id, s.publisher, s.title, s.date, s.kind, s.url, s.access, s.note].map(csvq).join(','))].join('\n') + '\n';

// Claim check
const K = [
  '# Claim-by-claim check', '',
  `Each factual claim in the briefing, the source that supports it, and a short verbatim excerpt from that source. Checked on ${AS_OF}. Run \`python3 scripts/check_sources.py\` to confirm every excerpt is still on the live page.`, '',
  `**${claims.length} claims · ${claims.reduce((a, c) => a + c.support.filter((x) => x.excerpt).length, 0)} verbatim excerpts · ${numbered.length} sources**` + ' (one coverage link, SMB Tech, is checked by hand).', '',
];
let lastSection = null;
claims.forEach((c, i) => {
  if (c.section !== lastSection) {
    K.push('', `## ${c.section}`, '', '| # | Claim | Source | Verbatim excerpt from the source |', '|---:|---|---|---|');
    lastSection = c.section;
  }
  c.support.forEach((s, j) => {
    const src = byId[s.source];
    const ex = s.excerpt ? `“${mdEsc(s.excerpt)}”` : `*${s.manual}*`;
    K.push(`| ${j === 0 ? i + 1 : ''} | ${j === 0 ? mdEsc(c.claim) : ''} | [[${num[s.source]}] ${mdEsc(src.publisher)}](${src.url}) | ${ex} |`);
  });
});
K.push('', '## X thread', '', '| Post | Text | Sources linked in the post |', '|---:|---|---|');
for (const p of posts) K.push(`| ${p.i} | ${mdEsc(p.text)} | ${p.ids.map((id) => `[[${num[id]}]](${byId[id].url})`).join(' ')} |`);
K.push('', 'Every statement in the thread repeats a claim from the briefing and is checked in the tables above.', '');

(async () => {
  const buf = await D.Packer.toBuffer(doc);
  write('briefing/redbelly-leadership-briefing.docx', buf);
  write('briefing/redbelly-leadership-briefing.md', M.join('\n'));
  write('x-thread/x-thread.md', T.join('\n'));
  write('x-thread/x-thread.txt', TXT);
  write('sources/sources.md', S.join('\n'));
  write('sources/sources.csv', CSV);
  write('sources/claim-check.md', K.join('\n'));
  console.log(`Built: ${numbered.length} sources, ${claims.length} claims, ${posts.length} posts (${posts.map((p) => p.len).join(', ')} chars).`);
})();
