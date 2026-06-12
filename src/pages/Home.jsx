import { tools } from "../data/toolsData"

export default function Home({ onSelectTool }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-14">
      <div className="text-left mb-10">
        <h1 className="text-4xl font-bold mb-4 text-textHeader tracking-tight leading-tight">
          Byteflow
        </h1>
        <p className="text-text text-[15px] leading-relaxed">
            A growing collection of fast, privacy-first tech utilities that run entirely in your browser.
            No installs. No server uploads. Just tools that work instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {tools.map(({ id, icon: Icon, label, description, tags }) => (
          <button
            key={id}
            onClick={() => onSelectTool(id)}
            className="bg-backgroundCard border border-borderColor rounded-2xl p-4 text-left cursor-pointer transition-all duration-150 hover:border-accentBorder hover:-translate-y-0.5"
          >
            <div className="flex flex-row items-center gap-3 mb-2 w-full">
              <div className="text-accent bg-accentBg border border-accentBorder rounded-xl flex items-center justify-center p-2 shrink-0">
                <Icon size={18} />
              </div>
              <h2 className="text-sm font-semibold text-textHeader m-0 flex-1 min-w-0">{label}</h2>
            </div>
            <p className="text-[12px] text-text mb-1 leading-relaxed">{description}</p>
          </button>
        ))}
      </div>

      {/* About */}
      <div className="max-w-6xl mx-auto mt-20 pt-10 border-t border-borderColor">
        <h2 className="text-xl font-bold text-textHeader mb-4">About</h2>

        {/* <p className="text-text text-[14px] leading-relaxed mb-4 max-w-3xl">
          Byteflow is a growing collection of developer utilities built for the modern web — from frontend
          helpers and backend tools to domain diagnostics and support-focused workflows.
        </p> */}
        <p className="text-text text-[14px] leading-relaxed mb-4 max-w-3xl">
          Byteflow is a growing collection of developer utilities built for the modern web.
        </p>

        <p className="text-text text-[14px] leading-relaxed mb-4 max-w-3xl">
          Everything runs entirely in your browser. No uploads, no accounts, no unnecessary tracking.
          Your data stays on your machine, exactly where it should be.
        </p>

        <p className="text-text text-[14px] leading-relaxed mb-8 max-w-3xl">
          Built from a love for the real web: open, experimental, a little messy, and endlessly creative.
          Byteflow exists to make every tech enthusiast work a little faster, clearer, and more enjoyable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 max-w-3xl">
          <div>
            <h3 className="text-sm font-semibold text-textHeader mb-2">Made by</h3>
            <a
              href="https://janinevallente.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent text-sm hover:opacity-80 transition-opacity"
            >
              Janine Vallente
            </a>
          </div>

          {/* <div>
            <h3 className="text-sm font-semibold text-textHeader mb-2">Source</h3>
            <p className="text-text text-[14px] m-0">""</p>
          </div> */}
        </div>

        {/* <a
          href="#"
          className="text-accent text-sm underline hover:opacity-80 transition-opacity"
        >
          Read the story behind Byteflow
        </a> */}

        <div className="border-t border-borderColor mt-8 pt-6">
          <p className="text-text text-xs leading-relaxed m-0">
            Built with React, Vite & Tailwind CSS. Designed with a privacy-first,
            local-first philosophy where all processing happens directly in your browser.
          </p>
        </div>
      </div>
    </div>
  )
}