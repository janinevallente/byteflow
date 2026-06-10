import { useState } from 'react'
import { Layers, Eraser, ImageIcon, ChevronLeft, Menu, X } from 'lucide-react'

const tools = [
  { id: 'bg-remover', label: 'Background Remover', icon: Eraser },
  { id: 'image-converter', label: 'Image Converter', icon: ImageIcon },
]

export default function Sidebar({ activeTool, onSelectTool }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-backgroundCard border-b border-borderColor font-poppins">
        <button
          onClick={() => onSelectTool(null)}
          className="flex items-center gap-2 font-semibold text-base text-textHeader bg-transparent border-none cursor-pointer p-0"
        >
          <span className="bg-accent rounded-lg w-7 h-7 flex items-center justify-center shrink-0">
            <Layers size={15} color="white" />
          </span>
          DevToolkit
        </button>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-transparent border-none cursor-pointer text-text p-1.5"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden flex flex-col gap-1 px-3 py-3 bg-backgroundCard border-b border-borderColor">
          {tools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onSelectTool(id); setMobileOpen(false) }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full text-left border-none cursor-pointer transition-colors
                ${activeTool === id
                  ? 'bg-accentBg text-accent'
                  : 'bg-transparent text-text hover:bg-accentBg hover:text-accent'
                }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-backgroundCard border-r border-borderColor h-screen sticky top-0 overflow-hidden transition-all duration-200 ${collapsed ? 'w-16' : 'w-[220px]'}`}
      >
        {/* Logo */}
        <div className={`h-[60px] flex items-center border-b border-borderColor shrink-0 gap-2.5 ${collapsed ? 'px-[17px]' : 'px-4'}`}>
          <button
            onClick={() => onSelectTool(null)}
            className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0 shrink-0"
          >
            <span className="bg-accent rounded-lg w-[30px] h-[30px] flex items-center justify-center shrink-0">
              <Layers size={16} color="white" />
            </span>
            {!collapsed && (
              <span className="text-textHeader font-semibold text-[15px] whitespace-nowrap">DevToolkit</span>
            )}
          </button>
        </div>

        {/* Section label */}
        {!collapsed && (
          <p className="text-[10px] font-semibold tracking-[0.08em] text-text uppercase px-4 pt-4 pb-1.5 m-0">
            Tools
          </p>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 py-1 flex flex-col gap-0.5">
          {tools.map(({ id, label, icon: Icon }) => {
            const active = activeTool === id
            return (
              <button
                key={id}
                onClick={() => onSelectTool(id)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 rounded-lg border-none cursor-pointer text-sm w-full text-left transition-colors
                  border-l-2
                  ${collapsed ? 'px-[10px] py-2.5 justify-center' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-accentBg text-accent border-l-accent font-medium'
                    : 'bg-transparent text-text border-l-transparent font-normal hover:bg-accentBg hover:text-accent'
                  }`}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-borderColor">
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border-none bg-transparent cursor-pointer text-xs text-text hover:bg-accentBg hover:text-accent transition-colors ${collapsed ? 'justify-center' : 'justify-start'}`}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}