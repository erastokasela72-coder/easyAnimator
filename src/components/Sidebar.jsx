import React from 'react'

function Sidebar({ bgColor, setBgColor, rotateEnabled, setRotateEnabled }) {
  return (
    <aside
      className="
        fixed top-1/2 left-6 -translate-y-1/2
        w-[260px] h-[85vh]
        p-5 rounded-2xl

        bg-blue-500/20
        backdrop-blur-xl
        border border-white/25

        shadow-[0_8px_30px_rgba(0,0,0,0.25)]
        text-white
        flex flex-col
      "
    >
      
      <h3 className="mb-4 text-lg font-semibold opacity-90">
        Assets
      </h3>

      {/* Color Picker */}
      <div className="mb-6">
        <p className="mb-2 text-sm opacity-80">
          Canvas Background
        </p>

        <div className="flex items-center gap-3">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
          />
          <span className="text-xs opacity-60">
            {bgColor}
          </span>
        </div>
      </div>

      {/* Rotate Toggle */}
      <div className="mb-6">
        <p className="mb-2 text-sm opacity-80">
          Rotate Asset
        </p>

        <button
          onClick={() => setRotateEnabled(!rotateEnabled)}
          className={`
            w-full py-2 rounded-lg text-sm font-semibold
            transition
            ${
              rotateEnabled
                ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                : 'bg-white/10 text-white/70'
            }
          `}
        >
          {rotateEnabled ? 'Rotation ON' : 'Rotation OFF'}
        </button>
      </div>

      {/* Drag Area */}
      <div className="mt-auto h-[220px] rounded-xl border-2 border-dashed border-white/35 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:bg-white/10 transition">
        <p className="text-sm font-medium">Drag & Drop</p>
        <span className="text-xs opacity-70">or</span>
        <button className="px-4 py-2 rounded-lg bg-white text-blue-600 font-semibold text-sm hover:bg-blue-50 transition">
          Upload
        </button>
      </div>

    </aside>
  )
}

export default Sidebar
