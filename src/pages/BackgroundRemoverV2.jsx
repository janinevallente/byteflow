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

  // Fast color difference calculation (RGB space)
  const getColorDistance = (r1, g1, b1, r2, g2, b2) => {
    const dr = r1 - r2
    const dg = g1 - g2
    const db = b1 - b2
    return Math.sqrt(dr * dr + dg * dg + db * db)
  }

  // Get dominant background color from edges
  const getBackgroundColor = (data, width, height) => {
    const samples = []
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 50))
    
    // Sample from all four edges
    for (let i = 0; i < width; i += sampleStep) {
      // Top edge
      const topIdx = (0 * width + i) * 4
      samples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]])
      
      // Bottom edge
      const bottomIdx = ((height - 1) * width + i) * 4
      samples.push([data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]])
    }
    
    for (let i = 0; i < height; i += sampleStep) {
      // Left edge
      const leftIdx = (i * width + 0) * 4
      samples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]])
      
      // Right edge
      const rightIdx = (i * width + (width - 1)) * 4
      samples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]])
    }
    
    // Find average background color
    let sumR = 0, sumG = 0, sumB = 0
    samples.forEach(sample => {
      sumR += sample[0]
      sumG += sample[1]
      sumB += sample[2]
    })
    
    return {
      r: Math.round(sumR / samples.length),
      g: Math.round(sumG / samples.length),
      b: Math.round(sumB / samples.length)
    }
  }

  // Detect edges using simple gradient
  const detectEdges = (data, width, height) => {
    const edges = new Uint8Array(width * height)
    const gray = new Uint8Array(width * height)
    
    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4
      gray[idx] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
    }
    
    // Simple edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx = Math.abs(gray[idx + 1] - gray[idx - 1])
        const gy = Math.abs(gray[idx + width] - gray[idx - width])
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[idx] = magnitude > 40 ? 1 : 0
      }
    }
    
    return edges
  }

  // Create initial binary mask
  const createMask = (data, width, height, bgColor, edgeMap) => {
    const mask = new Uint8Array(width * height)
    const tolerance = 45
    
    // First pass: identify background pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const distance = getColorDistance(
          data[idx], data[idx + 1], data[idx + 2],
          bgColor.r, bgColor.g, bgColor.b
        )
        
        // Edge pixels get special treatment
        const isEdge = edgeMap[y * width + x]
        const adaptiveTolerance = isEdge ? tolerance * 1.3 : tolerance
        
        if (distance < adaptiveTolerance) {
          mask[y * width + x] = 0 // Background
        } else {
          mask[y * width + x] = 1 // Foreground
        }
      }
    }
    
    return mask
  }

  // Clean up mask using morphological operations
  const cleanMask = (mask, width, height) => {
    const cleaned = new Uint8Array(mask)
    
    // Remove small background holes in foreground
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (mask[idx] === 1) {
          let bgNeighbors = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (mask[(y + dy) * width + (x + dx)] === 0) {
                bgNeighbors++
              }
            }
          }
          // If surrounded by background, it's likely a hole
          if (bgNeighbors > 7) {
            cleaned[idx] = 0
          }
        }
      }
    }
    
    // Remove small foreground islands in background
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (mask[idx] === 0) {
          let fgNeighbors = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (mask[(y + dy) * width + (x + dx)] === 1) {
                fgNeighbors++
              }
            }
          }
          if (fgNeighbors > 7) {
            cleaned[idx] = 1
          }
        }
      }
    }
    
    return cleaned
  }

  // Apply feathering only at edges
  const applyEdgeFeathering = (data, mask, edgeMap, width, height) => {
    const result = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const pixelIdx = idx * 4
        
        // If it's clearly foreground, keep full opacity
        if (mask[idx] === 1) {
          // Check if it's near an edge
          let nearEdge = false
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (edgeMap[ny * width + nx] === 1) {
                  nearEdge = true
                  break
                }
              }
            }
            if (nearEdge) break
          }
          
          if (nearEdge) {
            // Calculate edge strength for feathering
            let edgeStrength = 0
            let edgeCount = 0
            
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx
                const ny = y + dy
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  edgeStrength += edgeMap[ny * width + nx]
                  edgeCount++
                }
              }
            }
            
            const avgEdge = edgeStrength / edgeCount
            // Only slightly feather, preserve original opacity mostly
            const featherAmount = Math.min(0.15, avgEdge * 0.1)
            result[pixelIdx + 3] = Math.floor(255 * (1 - featherAmount))
          } else {
            // Solid foreground - fully opaque
            result[pixelIdx + 3] = 255
          }
        } else if (mask[idx] === 0) {
          // Background - completely transparent
          result[pixelIdx + 3] = 0
        }
      }
    }
    
    return result
  }

  const removeBackground = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const img = new Image()
      img.src = preview
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      // Work at original size for best quality
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let data = imageData.data
      
      // Detect background color
      const bgColor = getBackgroundColor(data, img.width, img.height)
      
      // Detect edges
      const edgeMap = detectEdges(data, img.width, img.height)
      
      // Create initial mask
      let mask = createMask(data, img.width, img.height, bgColor, edgeMap)
      
      // Clean up mask
      mask = cleanMask(mask, img.width, img.height)
      
      // Apply feathering only at edges, preserve foreground
      const finalData = applyEdgeFeathering(data, mask, edgeMap, img.width, img.height)
      
      // Create new ImageData with processed alpha
      const processedImageData = new ImageData(finalData, img.width, img.height)
      ctx.putImageData(processedImageData, 0, 0)
      
      // Convert to PNG and set result
      setResult(canvas.toDataURL('image/png'))
      
    } catch (err) {
      console.error(err)
      setError('Failed to process image. Please try another image with a clear subject.')
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

  const checkerboard = { 
    backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%)',
    backgroundSize: '20px 20px',
    backgroundColor: '#f5f5f5'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 rounded-xl p-2">
            <Eraser size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Background Remover</h1>
        </div>
        <p className="text-gray-600 text-sm">
          Remove image backgrounds while preserving original colors and details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Upload Image</h2>
            {image && (
              <button 
                onClick={reset} 
                className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1 transition-colors"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg px-6 py-12 text-center cursor-pointer transition-all
                ${dragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
            >
              <Upload size={40} className="text-blue-600 mx-auto mb-3" />
              <p className="font-medium text-sm text-gray-900 mb-1">Drop image here or click to upload</p>
              <p className="text-gray-500 text-xs">PNG, JPG, WebP, GIF supported</p>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div>
              <div 
                className="rounded-lg overflow-hidden border border-gray-200 min-h-[200px] flex items-center justify-center bg-gray-50"
                style={checkerboard}
              >
                <img src={preview} alt="Preview" className="max-w-full max-h-80 object-contain" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {image?.name} · {(image?.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={removeBackground}
            disabled={!image || loading}
            className={`w-full mt-4 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${image && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Processing...
              </span>
            ) : (
              'Remove Background'
            )}
          </button>
        </div>

        {/* Result Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Result</h2>
            {result && (
              <button
                onClick={download}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Download size={13} /> Download PNG
              </button>
            )}
          </div>

          <div 
            className="rounded-lg overflow-hidden border border-gray-200 min-h-80 flex items-center justify-center bg-gray-50"
            style={checkerboard}
          >
            {result ? (
              <img src={result} alt="Result" className="max-w-full max-h-80 object-contain" />
            ) : (
              <div className="text-center text-gray-500 text-sm p-8">
                <ImageIcon size={36} className="mx-auto mb-2.5 opacity-40" />
                <p>Processed image will appear here</p>
                <p className="text-xs mt-1">Original colors preserved</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-gray-700">
            <span className="font-semibold text-blue-700">✓ Improved:</span> No fading - foreground colors and details are fully preserved while background is removed cleanly
          </div>
        </div>
      </div>
    </div>
  )
}