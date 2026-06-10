import { useState, useRef, useCallback } from 'react'
import { Eraser, Upload, Download, Loader2, Image as ImageIcon, X } from 'lucide-react'

export default function BackgroundRemover() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }
    setError(null)
    setResult(null)
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleFileChange = (e) => loadFile(e.target.files[0])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0])
  }, [])
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)

  const removeBackground = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const img = new Image()
      img.src = preview
      await new Promise(r => { img.onload = r })
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const samplePixels = [
        [0, 0], [img.width - 1, 0],
        [0, img.height - 1], [img.width - 1, img.height - 1],
        [Math.floor(img.width / 2), 0],
      ]
      let bgR = 0, bgG = 0, bgB = 0
      samplePixels.forEach(([x, y]) => {
        const idx = (y * img.width + x) * 4
        bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]
      })
      bgR = Math.round(bgR / samplePixels.length)
      bgG = Math.round(bgG / samplePixels.length)
      bgB = Math.round(bgB / samplePixels.length)
      const threshold = 60
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB) < threshold * 3) {
          data[i + 3] = 0
        }
      }
      ctx.putImageData(imageData, 0, 0)
      setResult(canvas.toDataURL('image/png'))
    } catch {
      setError('Failed to process image. Please try another file.')
    }
    setLoading(false)
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = result
    a.download = `bg-removed-${image.name.replace(/\.[^/.]+$/, '')}.png`
    a.click()
  }

  const reset = () => {
    setImage(null); setPreview(null); setResult(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const checkerboard = { background: 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 0 0 / 16px 16px' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-poppins">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-accentBg border border-accentBorder rounded-[10px] p-2 text-accent">
            <Eraser size={20} />
          </span>
          <h1 className="text-2xl font-semibold text-textHeader m-0">Background Remover</h1>
        </div>
        <p className="text-text text-sm m-0">
          Remove the background from any image instantly, right in your browser. Output is a transparent PNG.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="bg-backgroundCard border border-borderColor rounded-2xl p-6 shadow-shadowColor">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-textHeader m-0">Upload Image</h2>
            {image && (
              <button onClick={reset} className="bg-transparent border-none cursor-pointer text-text text-xs flex items-center gap-1 hover:text-accent transition-colors">
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl px-6 py-12 text-center cursor-pointer transition-all
                ${dragOver ? 'border-accent bg-accentBg' : 'border-borderColor bg-transparent hover:border-accent hover:bg-accentBg'}`}
            >
              <Upload size={40} className="text-accent mx-auto mb-3" />
              <p className="font-medium text-sm text-textHeader mb-1">Drop image here or click to upload</p>
              <p className="text-text text-xs">PNG, JPG, WebP, GIF supported</p>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div>
              <div className="rounded-[10px] overflow-hidden border border-borderColor min-h-[200px] flex items-center justify-center" style={checkerboard}>
                <img src={preview} alt="Preview" className="max-w-full max-h-80 object-contain block" />
              </div>
              <p className="text-xs text-text mt-2 mb-0">
                {image?.name} · {(image?.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg px-3.5 py-2.5 mt-3 text-[13px] text-red-500">
              {error}
            </div>
          )}

          <button
            onClick={removeBackground}
            disabled={!image || loading}
            className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-none
              ${image && !loading
                ? 'bg-accent text-white cursor-pointer hover:opacity-90'
                : 'bg-borderColor text-text cursor-not-allowed'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Processing…
              </span>
            ) : 'Remove Background'}
          </button>
        </div>

        {/* Result Panel */}
        <div className="bg-backgroundCard border border-borderColor rounded-2xl p-6 shadow-shadowColor">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-textHeader m-0">Result</h2>
            {result && (
              <button
                onClick={download}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accentBg text-accent border border-accentBorder cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Download size={13} /> Download PNG
              </button>
            )}
          </div>

          <div className="rounded-[10px] overflow-hidden border border-borderColor min-h-80 flex items-center justify-center" style={checkerboard}>
            {result ? (
              <img src={result} alt="Result" className="max-w-full max-h-80 object-contain block" />
            ) : (
              <div className="text-center text-text text-[13px] p-8">
                <ImageIcon size={36} className="mx-auto mb-2.5 opacity-40" />
                Processed image will appear here
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-accentBg rounded-[10px] text-xs text-text">
            <span className="text-accent font-semibold">Note:</span> This tool uses edge detection on sampled corner pixels. For best results, use images with a plain or uniform background.
          </div>
        </div>
      </div>
    </div>
  )
}