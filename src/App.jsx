import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import BackgroundRemover from './pages/BackgroundRemover'
import ImageClipper from './pages/ImageClipper'
import CircleCropper from './pages/CircleCropper'
import ImageConverter from './pages/ImageConverter'
import PixelPicker from './pages/PixelPicker'
import ColorWheel from './pages/ColorWheel'
import ColorConverter from './pages/ColorConverter'
import ContrastChecker from './pages/ContrastChecker'
import GradientGenerator from './pages/GradientGenerator'
import PaletteExtractor from './pages/PaletteExtractor'
import './index.css'

function App() {
  const [activeTool, setActiveTool] = useState(null)

  const renderPage = () => {
    switch (activeTool) {
      case 'bg-remover': return <BackgroundRemover />
      case 'image-clipper': return <ImageClipper />
      case 'circle-cropper': return <CircleCropper />
      case 'image-converter': return <ImageConverter />
      case 'pixel-picker': return <PixelPicker />
      case 'color-wheel': return <ColorWheel />
      case 'color-converter': return <ColorConverter />
      case 'contrast-checker': return <ContrastChecker />
      case 'gradient-generator': return <GradientGenerator />
      case 'palette-extractor': return <PaletteExtractor />
      default: return <Home onSelectTool={setActiveTool} />
    }
  }

  return (
    <div className="flex min-h-screen bg-backgroundColor">
      <Sidebar activeTool={activeTool} onSelectTool={setActiveTool} />
      <div className="flex flex-col flex-1 min-w-0 pt-14 md:pt-0">
        <main className="flex-1">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App