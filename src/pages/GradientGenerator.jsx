import { useState, useCallback } from 'react'
import { Blend, Copy, Check, Plus, X, Shuffle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { randomRgb, rgbToHex } from '../lib/colorUtils'

const TYPES = ['linear', 'radial', 'conic']

let nextId = 3

export default function GradientGenerator() {
  const [type, setType] = useState('linear')
  const [angle, setAngle] = useState(90)
  const [stops, setStops] = useState([
    { id: 1, color: '#c084fc', pos: 0 },
    { id: 2, color: '#60a5fa', pos: 100 },
  ])
  const [copied, setCopied] = useState(null)

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const updateStop = (id, key, value) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s))
  }

  const addStop = () => {
    const last = stops[stops.length - 1]
    setStops(prev => [...prev, { id: nextId++, color: '#ffffff', pos: Math.min(100, last.pos + 10) }])
  }

  const removeStop = (id) => {
    if (stops.length <= 2) return
    setStops(prev => prev.filter(s => s.id !== id))
  }

  const randomize = () => {
    setStops(prev => prev.map(s => {
      const c = randomRgb()
      return { ...s, color: rgbToHex(c.r, c.g, c.b) }
    }))
    if (type !== 'radial') setAngle(Math.floor(Math.random() * 360))
  }

  const sortedStops = [...stops].sort((a, b) => a.pos - b.pos)
  const stopsCss = sortedStops.map(s => `${s.color} ${s.pos}%`).join(', ')

  const cssValue = type === 'linear'
    ? `linear-gradient(${angle}deg, ${stopsCss})`
    : type === 'radial'
      ? `radial-gradient(circle, ${stopsCss})`
      : `conic-gradient(from ${angle}deg, ${stopsCss})`

  const fullCss = `background: ${cssValue};`

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-poppins">
      <PageHeader
        icon={Blend}
        title="Gradient Generator"
        description="Create linear, radial, and conic gradients and copy the CSS."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-backgroundCard border border-borderColor rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-textHeader m-0">Settings</h2>
            <button
              onClick={randomize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accentBg text-accent border border-accentBorder cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Shuffle size={13} /> Randomize
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2 mb-4">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 capitalize py-2 rounded-xl text-sm font-medium border cursor-pointer transition-colors
                  ${type === t
                    ? 'bg-accentBg text-accent border-accentBorder'
                    : 'bg-backgroundColor text-text border-borderColor hover:border-accent hover:text-accent'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Angle */}
          {type !== 'radial' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-accent">
                  {type === 'conic' ? 'Starting Angle' : 'Angle'}
                </label>
                <span className="text-xs text-textHeader font-mono">{angle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
          )}

          {/* Stops */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-accent">Color Stops</label>
              <button
                onClick={addStop}
                className="flex items-center gap-1 text-xs text-accent bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Plus size={13} /> Add Stop
              </button>
            </div>
            {stops.map(stop => (
              <div key={stop.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-borderColor bg-transparent cursor-pointer p-0 shrink-0"
                />
                <input
                  type="text"
                  value={stop.color}
                  onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                  className="w-24 px-2.5 py-2 rounded-lg bg-backgroundColor border border-borderColor text-xs text-textHeader font-mono focus:outline-none focus:border-accent transition-colors"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stop.pos}
                  onChange={(e) => updateStop(stop.id, 'pos', Number(e.target.value))}
                  className="flex-1 accent-accent cursor-pointer"
                />
                <span className="text-xs text-text font-mono w-10 text-right shrink-0">{stop.pos}%</span>
                <button
                  onClick={() => removeStop(stop.id)}
                  disabled={stops.length <= 2}
                  className={`p-1 bg-transparent border-none shrink-0 transition-colors
                    ${stops.length <= 2 ? 'text-borderColor cursor-not-allowed' : 'text-text cursor-pointer hover:text-red-500'}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview & output */}
        <div className="flex flex-col gap-6">
          <div className="bg-backgroundCard border border-borderColor rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-textHeader m-0 mb-4">Preview</h2>
            <div
              className="w-full aspect-video rounded-xl border border-borderColor"
              style={{ background: cssValue }}
            />
          </div>

          <div className="bg-backgroundCard border border-borderColor rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-textHeader m-0">CSS</h2>
              <button
                onClick={() => copyToClipboard(fullCss)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accentBg text-accent border border-accentBorder cursor-pointer hover:opacity-80 transition-opacity"
              >
                {copied === fullCss ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                Copy
              </button>
            </div>
            <pre className="m-0 p-3.5 rounded-xl bg-backgroundColor border border-borderColor text-[13px] text-textHeader font-mono overflow-x-auto whitespace-pre-wrap break-all">
{fullCss}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
