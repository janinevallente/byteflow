import { useState, Suspense, lazy } from 'react'
import { SyncLoader } from 'react-spinners'
import Sidebar from './components/Sidebar'
import AntThemeProvider from './components/AntThemeProvider'
import Home from './pages/Home'
import './index.css'

const BackgroundRemover = lazy(() => import('./pages/BackgroundRemover'))
const ImageClipper = lazy(() => import('./pages/ImageClipper'))
const CircleCropper = lazy(() => import('./pages/CircleCropper'))
const ImageConverter = lazy(() => import('./pages/ImageConverter'))
const PixelPicker = lazy(() => import('./pages/PixelPicker'))
const ColorWheel = lazy(() => import('./pages/ColorWheel'))
const ColorConverter = lazy(() => import('./pages/ColorConverter'))
const ContrastChecker = lazy(() => import('./pages/ContrastChecker'))
const GradientGenerator = lazy(() => import('./pages/GradientGenerator'))
const PaletteExtractor = lazy(() => import('./pages/PaletteExtractor'))
const TailwindCssConverter = lazy(() => import('./pages/TailwindCssConverter'))
const TailwindGridGenerator = lazy(() => import('./pages/TailwindGridGenerator'))
const TailwindFlexboxGenerator = lazy(() => import('./pages/TailwindFlexboxGenerator'))
const TailwindShadowGenerator = lazy(() => import('./pages/TailwindShadowGenerator'))
const TailwindCheatSheet = lazy(() => import('./pages/TailwindCheatSheet'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <SyncLoader color="#9459d0" size={13} />
    </div>
  )
}

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
      case 'tailwind-css-converter': return <TailwindCssConverter />
      case 'tailwind-grid-generator': return <TailwindGridGenerator />
      case 'tailwind-flexbox-generator': return <TailwindFlexboxGenerator />
      case 'tailwind-shadow-generator': return <TailwindShadowGenerator />
      case 'tailwind-cheat-sheet': return <TailwindCheatSheet />
      default: return <Home onSelectTool={setActiveTool} />
    }
  }

  return (
    <AntThemeProvider>
      <div className="flex min-h-screen bg-backgroundColor">
        <Sidebar activeTool={activeTool} onSelectTool={setActiveTool} />
        <div className="flex flex-col flex-1 min-w-0 pt-14 md:pt-0">
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </main>
        </div>
      </div>
    </AntThemeProvider>
  )
}

export default App