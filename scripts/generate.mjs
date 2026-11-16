// Builds this profile README and its images in the portfolio's "registration
// form" look (greens only), from the portfolio's own data files.
// Usage: node scripts/generate.mjs <portfolio checkout> <this repo>
// Needs the portfolio's node_modules (Playwright) and Chrome installed.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [site, repo] = process.argv.slice(2)
const load = (f) => import(pathToFileURL(path.join(site, 'src/data', f)).href)
const { projects } = await load('projects.js')
const { certifications } = await load('certifications.js')
const { skillGroups } = await load('skills.js')
const { profile } = await load('profile.js')

const SITE = 'https://fredanthonygallano.vercel.app'
const THEMES = {
  light: { paper: '#d3ead9', field: '#eaf5ec', ink: '#0e3a2d', soft: '#33614f', line: 'rgba(14,58,45,0.22)', onInk: '#e4f4e8', accent: '#8fb8a8', card: '#fbfdf9' },
  dark: { paper: '#0c2b22', field: '#11382c', ink: '#cfeedb', soft: '#9ccab2', line: 'rgba(207,238,219,0.22)', onInk: '#0c2b22', accent: '#4f7a66', card: '#133d30' },
}
const SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans', Helvetica, Arial, sans-serif"
const MONO = "'Courier New', Courier, 'Liberation Mono', monospace"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Rough text measuring, good enough to wrap lines inside fixed columns.
const width = (text, size, mono) => (mono ? text.length * size * 0.6 : [...text].reduce((w, ch) => w + size * (/[il.,:;'|!]/.test(ch) ? 0.28 : /[mwMW]/.test(ch) ? 0.85 : /[A-Z]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : 0.53), 0))
function wrap(text, size, max, mono = false, sep = ' ') {
  const lines = []
  let line = ''
  for (const word of text.split(sep)) {
    const next = line ? line + sep + word : word
    if (line && width(next, size, mono) > max) {
      lines.push(line + (sep === ', ' ? ',' : ''))
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

const style = (t, extra = '') => `<style>
    .sans { font-family: ${SANS}; }
    .mono { font-family: ${MONO}; }
    .in { animation: rise .6s cubic-bezier(.16,1,.3,1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
    ${extra}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>`

const svg = (w, h, title, desc, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title>
  <desc id="desc">${esc(desc)}</desc>
${body}
</svg>
`

// The FG lockup from the logo kit, drawn in `color` with the accent squares.
function logo(x, y, h, color, accent, animate) {
  const s = h / 122
  const L = ['M10 100V14H46', 'M4 46H34', 'M56 100V46H88', 'M104 70H144V46H104V76A18 18 0 0 0 122 94H150', 'M208 8V100', 'M208 46H164V76A18 18 0 0 0 182 94H208']
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-linecap="butt" stroke-linejoin="miter">
      <path d="M114 16H16V72A34 34 0 0 0 50 106H106V76H50" stroke-width="16" pathLength="1" stroke-dasharray="1 1" ${animate ? 'class="draw"' : ''}/>
      <path d="M8 46H76" stroke-width="16" pathLength="1" stroke-dasharray="1 1" ${animate ? 'class="draw2"' : ''}/>
      <rect x="92" y="38" width="16" height="16" fill="${accent}" stroke="none"/>
      <g transform="translate(146 14)" stroke-width="12">${L.map((d) => `<path d="${d}"/>`).join('')}
        <rect x="222" y="88" width="12" height="12" fill="${accent}" stroke="none" ${animate ? 'class="blink"' : ''}/></g>
    </g>`
}

// A labelled blank of the form.
const blank = (t, x, y, w, h, label, value, size = 21) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${t.paper}" stroke="${t.ink}" stroke-width="1.5"/>
    <text x="${x + 16}" y="${y + 26}" class="sans" font-size="15" font-weight="600" fill="${t.soft}">${esc(label)}</text>
    ${(Array.isArray(value) ? value : [value]).map((v, i) => `<text x="${x + 16}" y="${y + 58 + i * 26}" class="mono" font-size="${size}" font-weight="700" fill="${t.ink}">${esc(v)}</text>`).join('')}`

function header(t, photo) {
  const W = 1200, H = 470
  const name = profile.name
  const typeStart = 0.5, perChar = 0.07
  const typed = [...name].map((ch, i) => `<tspan class="ch" style="animation-delay:${(typeStart + i * perChar).toFixed(2)}s">${esc(ch)}</tspan>`).join('')
  const stampAt = typeStart + name.length * perChar + 0.3
  const extra = `
    .ch { animation: show .01s steps(1) backwards; }
    @keyframes show { from { fill-opacity: 0; } }
    .caret { animation: blink 1.1s steps(1) infinite; }
    .blink { animation: blink 1.1s steps(1) infinite 2.4s; }
    @keyframes blink { 50% { opacity: 0; } }
    .draw { animation: draw .9s cubic-bezier(.65,0,.35,1) .1s both; }
    .draw2 { animation: draw .35s cubic-bezier(.3,0,.2,1) .85s both; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    .stamp { animation: stamp .5s cubic-bezier(.3,1.6,.5,1) ${stampAt.toFixed(2)}s backwards; transform-box: fill-box; transform-origin: center; }
    @keyframes stamp { from { opacity: 0; transform: scale(1.8); } }`
  const top = 64, mastH = 92, rowY = top + mastH, rowH = H - rowY - 2
  const px = 2, pw = 236, ix = px + pw, iw = 640, sx = ix + iw, sw = W - 2 - sx
  return svg(W, H, `${name} — portfolio registration form`, `${name}. Role: ${profile.role}. Course: ${profile.status}. School: City College of Calapan. Address: ${profile.location}. Status: available for work — ${profile.availability.detail}.`, `  ${style(t, extra)}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="${t.paper}" stroke="${t.ink}" stroke-width="3"/>
  <rect x="1" y="1" width="${W - 2}" height="${top}" fill="${t.ink}"/>
  ${logo(28, 15, 34, t.onInk, t.accent, true)}
  <text x="${W - 28}" y="41" text-anchor="end" class="mono" font-size="18" font-weight="700" fill="${t.onInk}">fredanthonygallano.vercel.app</text>
  <g class="in" style="animation-delay:.2s">
    <text x="28" y="${top + 46}" class="sans" font-size="34" font-weight="800" fill="${t.ink}">Portfolio registration form</text>
    <text x="28" y="${top + 74}" class="sans" font-size="17" fill="${t.soft}">Full-stack web and mobile developer from Calapan City, Philippines.</text>
  </g>
  <path d="M1 ${rowY}H${W - 1}" stroke="${t.ink}" stroke-width="1.5"/>
  <!-- photo box -->
  <path d="M${ix} ${rowY}V${H - 1}M${sx} ${rowY}V${H - 1}" stroke="${t.ink}" stroke-width="1.5"/>
  <g transform="rotate(-2.5 ${px + pw / 2} ${rowY + rowH / 2})">
    <rect x="${px + 30}" y="${rowY + 34}" width="172" height="214" fill="${t.card}" stroke="${t.line}"/>
    <image x="${px + 36}" y="${rowY + 40}" width="160" height="200" preserveAspectRatio="xMidYMid slice" href="${photo}"/>
  </g>
  <path d="M${px + 64} ${rowY + 64}V${rowY + 20}a10 10 0 0 1 20 0V${rowY + 70}a6 6 0 0 1-12 0V${rowY + 30}" fill="none" stroke="${t.soft}" stroke-width="3" stroke-linecap="round"/>
  <!-- details -->
  <rect x="${ix}" y="${rowY}" width="${iw}" height="104" fill="${t.field}"/>
  <text x="${ix + 18}" y="${rowY + 28}" class="sans" font-size="15" font-weight="600" fill="${t.soft}">Name</text>
  <text x="${ix + 18}" y="${rowY + 82}" class="mono" font-size="44" font-weight="700" fill="${t.ink}">${typed}<tspan class="caret" fill="${t.soft}">_</tspan></text>
  ${blank(t, ix, rowY + 104, iw / 2, 102, 'Role', profile.role)}
  ${blank(t, ix + iw / 2, rowY + 104, iw / 2, 102, 'Course', ['BS Information Systems,', '4th year'], 19)}
  ${blank(t, ix, rowY + 206, iw / 2, H - 1 - rowY - 206, 'School', 'City College of Calapan')}
  ${blank(t, ix + iw / 2, rowY + 206, iw / 2, H - 1 - rowY - 206, 'Address', ['Calapan City, Oriental', 'Mindoro, Philippines'], 19)}
  <!-- status -->
  <rect x="${sx}" y="${rowY}" width="${sw}" height="34" fill="${t.ink}"/>
  <text x="${sx + 16}" y="${rowY + 23}" class="sans" font-size="16" font-weight="700" fill="${t.onInk}">Status</text>
  <g transform="rotate(-6 ${sx + sw / 2} ${rowY + 160})">
    <g class="stamp">
      <rect x="${sx + 30}" y="${rowY + 98}" width="${sw - 60}" height="124" rx="10" fill="none" stroke="${t.ink}" stroke-width="3"/>
      <rect x="${sx + 37}" y="${rowY + 105}" width="${sw - 74}" height="110" rx="6" fill="none" stroke="${t.ink}" stroke-width="1.5"/>
      <text x="${sx + sw / 2}" y="${rowY + 136}" text-anchor="middle" class="sans" font-size="15" font-weight="800" letter-spacing="2" fill="${t.ink}">AVAILABLE FOR</text>
      <text x="${sx + sw / 2}" y="${rowY + 180}" text-anchor="middle" class="sans" font-size="44" font-weight="900" letter-spacing="2" fill="${t.ink}">WORK</text>
      <text x="${sx + sw / 2}" y="${rowY + 205}" text-anchor="middle" class="sans" font-size="15" font-weight="800" letter-spacing="1" fill="${t.ink}">OJT / FREELANCE / REMOTE</text>
    </g>
  </g>`)
}

// Column positions of the projects table, shared by the head and the rows.
const COL = { no: 18, shot: 70, name: 300, type: 760, tech: 935, end: 1198 }

function tableHead(t) {
  const W = 1200, H = 92
  return svg(W, H, `Projects (${projects.length})`, `Table of ${projects.length} projects. Each row links to the project's page on the portfolio.`, `  ${style(t)}
  <rect x="1" y="1" width="${W - 2}" height="${H}" fill="${t.paper}"/>
  <path d="M1.5 ${H}V1.5H${W - 1.5}V${H}" fill="none" stroke="${t.ink}" stroke-width="3"/>
  <rect x="1" y="1" width="${W - 2}" height="50" fill="${t.ink}"/>
  <text x="18" y="34" class="sans" font-size="21" font-weight="800" fill="${t.onInk}">Projects (${projects.length})</text>
  <text x="${W - 18}" y="34" text-anchor="end" class="sans" font-size="16" font-weight="600" fill="${t.onInk}">Click a row to open its page</text>
  <text x="${COL.no}" y="78" class="mono" font-size="16" font-weight="700" fill="${t.soft}">No.</text>
  <text x="${COL.shot}" y="78" class="sans" font-size="16" font-weight="600" fill="${t.soft}">Project</text>
  <text x="${COL.type + 14}" y="78" class="sans" font-size="16" font-weight="600" fill="${t.soft}">Type</text>
  <text x="${COL.tech + 14}" y="78" class="mono" font-size="16" font-weight="700" fill="${t.soft}">Built with</text>
  <path d="M${COL.type} 51V${H}M${COL.tech} 51V${H}" stroke="${t.line}"/>
  <path d="M1 ${H - 0.75}H${W - 1}" stroke="${t.ink}" stroke-width="1.5"/>`)
}

function row(t, p, i, shot, last) {
  const W = 1200, H = 150
  const pitch = wrap(p.pitch, 19, COL.type - COL.name - 24)
  const tech = wrap(p.tech.join(', '), 17, COL.end - COL.tech - 30, true, ', ')
  const badges = p.badges.filter((b) => !`${p.kind} ${p.tech.join(' ')}`.toLowerCase().includes(b.toLowerCase()))
  const sub = badges.map((b) => (b.charAt(0) + b.slice(1).toLowerCase()).replace(/(^| )ai(?=-|$)/i, '$1AI'))
  const nameSize = width(p.name, 27, true) > COL.type - COL.name - 30 ? 22 : 27
  const live = p.liveUrl ? 'Live demo' : 'Not public'
  return svg(W, H, `${String(i + 1).padStart(2, '0')} · ${p.name}`, `${p.name} (${p.kind}): ${p.pitch} Built with ${p.tech.join(', ')}.`, `  ${style(t)}
  <rect x="1" y="0" width="${W - 2}" height="${H}" fill="${t.paper}"/>
  <path d="M1.5 0V${H}M${W - 1.5} 0V${H}" stroke="${t.ink}" stroke-width="3"/>
  ${last ? `<path d="M0 ${H - 1.5}H${W}" stroke="${t.ink}" stroke-width="3"/>` : `<path d="M1 ${H - 0.5}H${W - 1}" stroke="${t.line}"/>`}
  <path d="M${COL.type} 0V${H}M${COL.tech} 0V${H}" stroke="${t.line}"/>
  <text x="${COL.no}" y="36" class="mono" font-size="18" fill="${t.soft}">${String(i + 1).padStart(2, '0')}</text>
  <rect x="${COL.shot}" y="18" width="210" height="114" fill="${t.card}" stroke="${t.line}"/>
  <image x="${COL.shot + 4}" y="22" width="202" height="106" preserveAspectRatio="xMidYMin slice" href="${shot}"/>
  <text x="${COL.name}" y="40" class="mono" font-size="${nameSize}" font-weight="700" fill="${t.ink}" text-decoration="underline">${esc(p.name)}</text>
  ${pitch.map((l, k) => `<text x="${COL.name}" y="${72 + k * 25}" class="sans" font-size="19" fill="${t.soft}">${esc(l)}</text>`).join('')}
  <text x="${COL.name}" y="${pitch.length > 1 ? 131 : 106}" class="sans" font-size="16" font-weight="700" fill="${t.ink}">${live} ↗</text>
  <text x="${COL.type + 14}" y="38" class="sans" font-size="18" fill="${t.ink}">${esc(p.kind)}</text>
  ${sub.map((b, k) => `<text x="${COL.type + 14}" y="${64 + k * 23}" class="sans" font-size="16" fill="${t.soft}">${esc(b)}</text>`).join('')}
  ${tech.map((l, k) => `<text x="${COL.tech + 14}" y="${37 + k * 23}" class="mono" font-size="17" font-weight="700" fill="${t.ink}">${esc(l)}</text>`).join('')}`)
}

function stackAndCerts(t) {
  const W = 1200
  const half = 600
  const groups = skillGroups.map((g) => ({ title: g.title, lines: wrap(g.items.map((s) => s.name).join('   '), 19, half - 50, true, '   ') }))
  const certs = certifications.map((c) => ({ name: wrap(c.name, 18, half - 50), meta: [c.issuer, c.kind, c.year].filter(Boolean).join(', ') }))
  let y = 92
  const left = groups.map((g) => {
    const out = `<text x="20" y="${y}" class="sans" font-size="15" font-weight="600" fill="${t.soft}">${esc(g.title)}</text>` + g.lines.map((l, k) => `<text x="20" y="${y + 28 + k * 27}" class="mono" font-size="19" font-weight="700" fill="${t.ink}" xml:space="preserve">${esc(l)}</text>`).join('')
    y += 28 + g.lines.length * 27 + 22
    return out
  }).join('\n  ')
  let cy = 90
  const right = certs.map((c, i) => {
    const out = (i ? `<path d="M${half} ${cy - 26}H${W - 2}" stroke="${t.line}"/>` : '') +
      c.name.map((l, k) => `<text x="${half + 20}" y="${cy + k * 23}" class="sans" font-size="18" font-weight="700" fill="${t.ink}">${esc(l)}</text>`).join('') +
      `<text x="${half + 20}" y="${cy + c.name.length * 23 + 2}" class="sans" font-size="15" fill="${t.soft}">${esc(c.meta)}</text>`
    cy += c.name.length * 23 + 46
    return out
  }).join('\n  ')
  const H = Math.max(y, cy) + 4
  return svg(W, H, 'Tech stack and certifications', `Tech stack — ${skillGroups.map((g) => `${g.title}: ${g.items.map((s) => s.name).join(', ')}`).join('. ')}. Certifications — ${certifications.map((c) => c.name).join('; ')}.`, `  ${style(t)}
  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="${t.paper}" stroke="${t.ink}" stroke-width="3"/>
  <rect x="1" y="1" width="${W - 2}" height="50" fill="${t.ink}"/>
  <text x="20" y="34" class="sans" font-size="21" font-weight="800" fill="${t.onInk}">Tech stack</text>
  <text x="${half + 20}" y="34" class="sans" font-size="21" font-weight="800" fill="${t.onInk}">Certifications (${certifications.length})</text>
  <path d="M${half} 51V${H - 2}" stroke="${t.ink}" stroke-width="1.5"/>
  <path d="M${half} 1V51" stroke="${t.paper}" stroke-opacity=".35" stroke-width="1.5"/>
  ${left}
  ${right}`)
}

// Screenshots shrunk to small WebP data URLs in a real browser.
const require = createRequire(path.join(site, 'package.json'))
const { chromium } = require('playwright')
const browser = await chromium.launch({ executablePath: ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync) })
const page = await browser.newPage()
async function shrink(file, w, h, quality = 0.72) {
  const data = 'data:image/webp;base64,' + readFileSync(file).toString('base64')
  return page.evaluate(async ({ data, w, h, quality }) => {
    const img = new Image(); img.src = data; await img.decode()
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const scale = Math.max(w / img.width, h / img.height)
    c.getContext('2d').drawImage(img, 0, 0, img.width * scale, img.height * scale)
    return c.toDataURL('image/webp', quality)
  }, { data, w, h, quality })
}
const photo = await shrink(path.join(site, 'public/profile/fred.webp'), 320, 400, 0.8)
const shots = {}
for (const p of projects) {
  const s = (p.gallery?.[0] ?? p.image).src
  shots[p.id] = await shrink(path.join(site, 'public', s), 404, 212)
}
await browser.close()

const out = path.join(repo, 'assets')
rmSync(out, { recursive: true, force: true })
mkdirSync(path.join(out, 'projects'), { recursive: true })
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(path.join(out, `header-${name}.svg`), header(t, photo))
  writeFileSync(path.join(out, `projects-head-${name}.svg`), tableHead(t))
  projects.forEach((p, i) => writeFileSync(path.join(out, 'projects', `${String(i + 1).padStart(2, '0')}-${p.id}-${name}.svg`), row(t, p, i, shots[p.id], i === projects.length - 1)))
  writeFileSync(path.join(out, `stack-${name}.svg`), stackAndCerts(t))
}

// The README itself.
const pic = (base, alt, extra = '') => `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg"><img alt="${esc(alt)}" src="assets/${base}-light.svg" width="100%"${extra}></picture>`
const shield = (label, value, href) => `<a href="${href}"><img alt="${esc(`${label}: ${value}`)}" src="https://img.shields.io/badge/${encodeURIComponent(label.replace(/ /g, '_'))}-${encodeURIComponent(value.replace(/-/g, '--').replace(/ /g, '_'))}-d3ead9?style=flat-square&labelColor=0e3a2d"></a>`
const rows = projects.map((p, i) => `<a href="${SITE}/projects/${p.id}">${pic(`projects/${String(i + 1).padStart(2, '0')}-${p.id}`, `${String(i + 1).padStart(2, '0')} · ${p.name} (${p.kind}): ${p.pitch} Built with ${p.tech.join(', ')}.`, ' align="top"')}</a>`).join('\n')
const readme = `<a href="${SITE}">${pic('header', `${profile.name} — portfolio registration form. ${profile.role}, ${profile.status}, City College of Calapan. Available for work: ${profile.availability.detail}.`)}</a>

<p align="center">
  ${shield('Portfolio', 'fredanthonygallano.vercel.app', SITE)}
  ${shield('Open to', 'OJT / Freelance / Remote', `${SITE}/#contact`)}
  ${shield('Email', profile.contact.email, `mailto:${profile.contact.email}`)}
</p>

${profile.lede}

<a href="${SITE}/projects">${pic('projects-head', `Projects (${projects.length})`, ' align="top"')}</a>
${rows}

<a href="${SITE}/#stack">${pic('stack', 'Tech stack and certifications')}</a>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/heyitsmefarid/heyitsmefarid/output/snake-dark.svg">
  <img alt="A snake eating Fred's GitHub contribution graph" src="https://raw.githubusercontent.com/heyitsmefarid/heyitsmefarid/output/snake-light.svg" width="100%">
</picture>

<p align="center"><sub>Full details, screenshots and a contact form on <a href="${SITE}">fredanthonygallano.vercel.app</a></sub></p>
`
writeFileSync(path.join(repo, 'README.md'), readme)
console.log('written', Object.keys(shots).length, 'project rows')
