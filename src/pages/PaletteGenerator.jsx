import { useState, useCallback } from 'react'
import { Shuffle, Copy, Check, Lock, Unlock } from 'lucide-react'
import { rgbToHex, hslToRgb, randomRgb } from '../lib/colorUtils'

const MODES = [
  { id: 'random', label: 'Random' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'dark', label: 'Dark' },
]

function generateColor(mode) {
  switch (mode) {
    case 'pastel': {
      const h = Math.random() * 360
      const c = hslToRgb(h, 40 + Math.random() * 30, 75 + Math.random() * 12)
      return rgbToHex(c.r, c.g, c.b)
    }
    case 'vibrant': {
      const h = Math.random() * 360
      const c = hslToRgb(h, 70 + Math.random() * 30, 45 + Math.random() * 15)
      return rgbToHex(c.r, c.g, c.b)
    }
    case 'dark': {
      const h = Math.random() * 360
      const c = hslToRgb(h, 30 + Math.random() * 40, 12 + Math.random() * 18)
      return rgbToHex(c.r, c.g, c.b)
    }
    default: {
      const c = randomRgb()
      return rgbToHex(c.r, c.g, c.b)
    }
  }
}

function makePalette(mode, prev) {
  return Array.from({ length: 5 }, (_, i) =>
    prev?.[i]?.locked
      ? prev[i]
      : { color: generateColor(mode).toUpperCase(), locked: false }
  )
}

export default function PaletteGenerator() {
  const [mode, setMode] = useState('random')
  const [palette, setPalette] = useState(() => makePalette('random'))
  const [copied, setCopied] = useState(null)

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const generate = () => setPalette(prev => makePalette(mode, prev))

  const changeMode = (m) => {
    setMode(m)
    setPalette(prev => makePalette(m, prev))
  }

  const toggleLock = (i) => {
    setPalette(prev => prev.map((s, idx) => idx === i ? { ...s, locked: !s.locked } : s))
  }

  const copyAll = () => {
    const text = palette.map(s => s.color).join(', ')
    copyToClipboard(text)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-poppins">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-accentBg border border-accentBorder rounded-[10px] p-2 text-accent">
            <Shuffle size={20} />
          </span>
          <h1 className="text-2xl font-semibold text-textHeader m-0">Palette Generator</h1>
        </div>
        <p className="text-text text-sm m-0">
          Generate random color palettes. Lock colors you like and regenerate the rest.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-backgroundCard border border-borderColor rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors
                  ${mode === m.id
                    ? 'bg-accentBg text-accent border-accentBorder'
                    : 'bg-backgroundColor text-text border-borderColor hover:border-accent hover:text-accent'
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-accentBg text-accent border border-accentBorder cursor-pointer hover:opacity-80 transition-opacity"
            >
              {copied === palette.map(s => s.color).join(', ') ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              Copy All
            </button>
            <button
              onClick={generate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-accent text-white border-none cursor-pointer hover:opacity-90 transition-all"
            >
              <Shuffle size={14} /> Generate
            </button>
          </div>
        </div>
      </div>

      {/* Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {palette.map((swatch, i) => (
          <div key={i} className="bg-backgroundCard border border-borderColor rounded-2xl overflow-hidden flex flex-col">
            <div
              className="w-full aspect-square sm:aspect-[3/4] relative"
              style={{ background: swatch.color }}
            >
              <button
                onClick={() => toggleLock(i)}
                className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border-none cursor-pointer transition-colors
                  ${swatch.locked ? 'bg-white/90 text-backgroundColor' : 'bg-black/20 text-white hover:bg-black/35'}`}
                title={swatch.locked ? 'Unlock' : 'Lock'}
              >
                {swatch.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
            <button
              onClick={() => copyToClipboard(swatch.color)}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-mono bg-transparent border-none border-t border-borderColor text-textHeader cursor-pointer hover:text-accent transition-colors"
            >
              {copied === swatch.color ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {swatch.color}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-text mt-4 mb-0 text-center">
        Tip: Click the lock icon to keep a color when generating new palettes.
      </p>
    </div>
  )
}
