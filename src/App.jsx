import { useState } from 'react'
import Sidebar from './components/Sidebar'
import BackgroundRemover from './pages/BackgroundRemover'
import ImageConverter from './pages/ImageConverter'
import './index.css'

function App() {
  const [activeTool, setActiveTool] = useState('bg-remover'); // default active tool

  const renderPage = () => {
    switch (activeTool) {
      case 'bg-remover': return <BackgroundRemover />
      case 'image-converter': return <ImageConverter />
      default: return <BackgroundRemover onSelectTool={setActiveTool} />
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