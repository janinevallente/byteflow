import { useState } from 'react'
import { Tooltip } from 'antd'
import { 
  Layers,  
  ChevronLeft, 
  Menu, 
  X,
  Eraser, 
  ImageIcon, 
  Pipette,
  Scissors,
  CircleDashed,
  House,
  Palette,
  Contrast,
  Blend,
  Sparkles,
  Shuffle,
} from 'lucide-react'

const VERSION = __APP_VERSION__

const categories = [
  {
    label: 'Image & Assets',
    tools: [
      { id: 'bg-remover', label: 'Background Remover', icon: Eraser },
      { id: 'image-converter', label: 'Image Converter', icon: ImageIcon },
      { id: 'image-clipper', label: 'Image Clipper', icon: Scissors },
      { id: 'circle-cropper', label: 'Circle Cropper', icon: CircleDashed },
    ],
  },
  {
    label: 'Colors',
    tools: [
      { id: 'pixel-picker', label: 'Pixel Picker', icon: Pipette },
      { id: 'color-converter', label: 'Color Converter', icon: Palette },
      { id: 'contrast-checker', label: 'Contrast Checker', icon: Contrast },
      { id: 'gradient-generator', label: 'Gradient Generator', icon: Blend },
      // { id: 'harmony-generator', label: 'Harmony Generator', icon: Sparkles },
      { id: 'palette-extractor', label: 'Palette Extractor', icon: ImageIcon },
      { id: 'palette-generator', label: 'Palette Generator', icon: Shuffle },
    ],
  },
]

export default function Sidebar({ activeTool, onSelectTool }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSelect = (id) => {
    onSelectTool(id)
    setMobileOpen(false)
  }

  const NavItem = ({ id, label, icon: Icon }) => {
    const active = activeTool === id

    const btn = (
      <button
        onClick={() => handleSelect(id)}
        className={`flex items-center gap-2.5 rounded-lg border-l-2 border-t-0 border-r-0 border-b-0 cursor-pointer text-sm w-full text-left transition-colors
          ${collapsed ? 'px-[10px] py-2.5 justify-center' : 'px-3 py-2'}
          ${active
            ? 'bg-accentBg text-accent border-l-accent font-medium'
            : 'bg-transparent text-text border-l-transparent font-normal hover:bg-accentBg hover:text-accent'
          }`}
      >
        <Icon size={16} className="shrink-0" />
        {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
      </button>
    )

    if (collapsed) {
      return (
        <Tooltip title={label} placement="right">
          {btn}
        </Tooltip>
      )
    }

    return btn
  }

  return (
    <>
      {/* Mobile navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-backgroundCard border-b border-borderColor">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center gap-2 font-semibold text-base text-textHeader bg-transparent border-none cursor-pointer p-0"
          >
            <span className="bg-accent rounded-lg w-7 h-7 flex items-center justify-center shrink-0">
              <Layers size={15} color="white" />
            </span>
            DevToolkit
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="bg-transparent border-none cursor-pointer text-text p-1.5 rounded-lg hover:bg-accentBg hover:text-accent transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col px-3 pb-3 max-h-[70vh] overflow-y-auto scrollbar-hide">
            {/* Home — no category label */}
            <NavItem id={null} label="Home" icon={House} />

            {categories.map(({ label, tools }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-text uppercase px-2 pt-3 pb-1 m-0">
                  {label}
                </p>
                {tools.map(({ id, label: toolLabel, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleSelect(id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full text-left border-none cursor-pointer transition-colors
                      ${activeTool === id
                        ? 'bg-accentBg text-accent'
                        : 'bg-transparent text-text hover:bg-accentBg hover:text-accent'
                      }`}
                  >
                    <Icon size={16} />
                    {toolLabel}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-backgroundCard border-r border-borderColor h-screen sticky top-0 overflow-hidden transition-all duration-200 ${collapsed ? 'w-16' : 'w-[225px]'}`}
      >
        {/* Logo — click to toggle collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`h-[60px] w-full flex items-center border-b border-borderColor shrink-0 gap-2.5 bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer hover:bg-accentBg transition-colors group
            ${collapsed ? 'px-[17px] justify-center' : 'px-4'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="bg-accent rounded-lg w-[30px] h-[30px] flex items-center justify-center shrink-0">
            <Layers size={16} color="white" />
          </span>
          {!collapsed && (
            <div className="flex flex-col items-start leading-none">
              <span className="text-textHeader font-semibold text-[15px] whitespace-nowrap">DevToolkit</span>
            </div>
          )}
        </button>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
          {/* Home — no category label */}
          <div className="mb-2">
            <NavItem id={null} label="Home" icon={House} />
          </div>

          {categories.map(({ label, tools }) => (
            <div key={label} className="mb-2">
              {!collapsed && (
                <p className="text-[10px] font-semibold tracking-[0.08em] text-text uppercase px-2 pt-2 pb-1 m-0">
                  {label}
                </p>
              )}
              {collapsed && <div className="border-t border-borderColor my-2" />}
              {tools.map(tool => (
                <NavItem key={tool.id} {...tool} />
              ))}
            </div>
          ))}
        </nav>

        {/* Version */}
        <div className={`border-t border-borderColor flex items-center ${collapsed ? 'justify-center py-3' : 'px-4 py-3'}`}>
          <span className="text-[11px] text-text">
            {collapsed ? `v${VERSION}` : `Version ${VERSION}`}
          </span>
        </div>
      </aside>
    </>
  )
}