// Shared color conversion utilities used across all Color tools.
// All conversions go through sRGB (0-255) as the common intermediate format.

// ---------- Parsing ----------

export function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6) return null
  const num = parseInt(h, 16)
  if (Number.isNaN(num)) return null
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')
}

export function decimalToRgb(dec) {
  const num = Math.floor(Number(dec))
  if (Number.isNaN(num) || num < 0 || num > 16777215) return null
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function rgbToDecimal(r, g, b) {
  return (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)
}

// ---------- HSL ----------

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  s /= 100; l /= 100
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360
  return {
    r: hue2rgb(p, q, hk + 1 / 3) * 255,
    g: hue2rgb(p, q, hk) * 255,
    b: hue2rgb(p, q, hk - 1 / 3) * 255,
  }
}

// ---------- HSV ----------

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h
  if (d === 0) h = 0
  else switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h: h * 360, s: s * 100, v: v * 100 }
}

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360
  s /= 100; v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r, g, b
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

// ---------- sRGB <-> linear ----------

function srgbToLinear(c) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return clamp(v * 255, 0, 255)
}

// ---------- CIE XYZ (D65) ----------

function rgbToXyz(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b)
  return {
    x: lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    y: lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750,
    z: lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041,
  }
}

function xyzToRgb(x, y, z) {
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252
  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(b),
  }
}

// D65 reference white
const WHITE = { x: 0.95047, y: 1.0, z: 1.08883 }

// ---------- CIE Lab / LCH ----------

function fLab(t) {
  const delta = 6 / 29
  return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29
}

function fLabInv(t) {
  const delta = 6 / 29
  return t > delta ? Math.pow(t, 3) : 3 * delta * delta * (t - 4 / 29)
}

export function rgbToLab(r, g, b) {
  const { x, y, z } = rgbToXyz(r, g, b)
  const fx = fLab(x / WHITE.x), fy = fLab(y / WHITE.y), fz = fLab(z / WHITE.z)
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

export function labToRgb(l, a, b) {
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const x = fLabInv(fx) * WHITE.x
  const y = fLabInv(fy) * WHITE.y
  const z = fLabInv(fz) * WHITE.z
  return xyzToRgb(x, y, z)
}

export function labToLch(l, a, b) {
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { l, c, h }
}

export function lchToLab(l, c, h) {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

export function rgbToLch(r, g, b) {
  const lab = rgbToLab(r, g, b)
  return labToLch(lab.l, lab.a, lab.b)
}

export function lchToRgb(l, c, h) {
  const lab = lchToLab(l, c, h)
  return labToRgb(lab.l, lab.a, lab.b)
}

// ---------- OKLab / OKLCH ----------

export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s)
  return {
    l: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  }
}

export function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  }
}

export function oklabToOklch(l, a, b) {
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { l, c, h }
}

export function oklchToOklab(l, c, h) {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

export function rgbToOklch(r, g, b) {
  const lab = rgbToOklab(r, g, b)
  return oklabToOklch(lab.l, lab.a, lab.b)
}

export function oklchToRgb(l, c, h) {
  const lab = oklchToOklab(l, c, h)
  return oklabToRgb(lab.l, lab.a, lab.b)
}

// ---------- Helpers ----------

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

export function rgbToCss(r, g, b) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

// Returns every supported color format from an {r,g,b} object (0-255 each)
export function getAllFormats(r, g, b) {
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255)
  const hsl = rgbToHsl(r, g, b)
  const lab = rgbToLab(r, g, b)
  const lch = rgbToLch(r, g, b)
  const oklab = rgbToOklab(r, g, b)
  const oklch = rgbToOklch(r, g, b)
  return {
    HEX: rgbToHex(r, g, b).toUpperCase(),
    RGB: rgbToCss(r, g, b),
    'Decimal RGB': `rgb(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)})`,
    HSL: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
    LAB: `lab(${lab.l.toFixed(2)} ${lab.a.toFixed(2)} ${lab.b.toFixed(2)})`,
    LCH: `lch(${lch.l.toFixed(2)} ${lch.c.toFixed(2)} ${lch.h.toFixed(1)})`,
    OKLAB: `oklab(${oklab.l.toFixed(3)} ${oklab.a.toFixed(3)} ${oklab.b.toFixed(3)})`,
    OKLCH: `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)})`,
  }
}

// ---------- WCAG Contrast ----------
export function getLuminance(rgb) {
  const rsrgb = rgb.r / 255
  const gsrgb = rgb.g / 255
  const bsrgb = rgb.b / 255
  
  const r = rsrgb <= 0.03928 ? rsrgb / 12.92 : Math.pow((rsrgb + 0.055) / 1.055, 2.4)
  const g = gsrgb <= 0.03928 ? gsrgb / 12.92 : Math.pow((gsrgb + 0.055) / 1.055, 2.4)
  const b = bsrgb <= 0.03928 ? bsrgb / 12.92 : Math.pow((bsrgb + 0.055) / 1.055, 2.4)
  
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

export function contrastRatio (rgb1, rgb2) {
  const l1 = getLuminance(rgb1)
  const l2 = getLuminance(rgb2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function wcagLevels(ratio) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  }
}

// ---------- Harmony ----------

// Returns array of { r, g, b } based on a base color and harmony type
export function getHarmony(r, g, b, type) {
  const { h, s, l } = rgbToHsl(r, g, b)
  const fromHue = (hue) => hslToRgb(hue, s, l)

  switch (type) {
    case 'complementary':
      return [{ r, g, b }, fromHue(h + 180)]
    case 'analogous':
      return [fromHue(h - 30), { r, g, b }, fromHue(h + 30)]
    case 'triadic':
      return [{ r, g, b }, fromHue(h + 120), fromHue(h + 240)]
    case 'tetradic':
      return [{ r, g, b }, fromHue(h + 60), fromHue(h + 180), fromHue(h + 240)]
    case 'square':
      return [{ r, g, b }, fromHue(h + 90), fromHue(h + 180), fromHue(h + 270)]
    case 'split-complementary':
      return [{ r, g, b }, fromHue(h + 150), fromHue(h + 210)]
    case 'monochromatic':
      return [10, 30, 50, 70, 90].map(lightness => hslToRgb(h, s, lightness))
    default:
      return [{ r, g, b }]
  }
}

// ---------- Random color ----------

export function randomRgb() {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  }
}