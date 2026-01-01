import React, { useState, useEffect, useRef } from 'react'
import { FaPlay, FaPause } from 'react-icons/fa'

function Key({ currentTime, setCurrentTime, playing, setPlaying, keyframes }) {
  const timelineRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  // Playback loop
  useEffect(() => {
    if (!playing) return

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= 100) {
          setPlaying(false)
          return 100
        }
        return prev + 0.1 // Increment by 0.1 for smooth playback
      })
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [playing, setCurrentTime, setPlaying])

  // Get all keyframes from all assets
  const allKeyframes = Object.values(keyframes).flat()

  // Handle timeline click/drag
  function handleTimelineClick(e) {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setCurrentTime(percentage)
  }

  function handleMouseDown(e) {
    setIsDragging(true)
    handleTimelineClick(e)
  }

  useEffect(() => {
    if (!isDragging) return

    function handleMouseMove(e) {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
        setCurrentTime(percentage)
      }
    }

    function handleMouseUp() {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setCurrentTime])

  return (
    <div
      className="
        w-full
        h-[100px] sm:h-[120px]
        rounded-2xl

        bg-blue-500/20
        backdrop-blur-xl
        border border-white/20

        shadow-[0_8px_30px_rgba(0,0,0,0.35)]
        text-white
        p-3 sm:p-4
        mt-2 sm:mt-4
      "
    >
      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
        <button
          onClick={() => setPlaying(!playing)}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-400 transition"
        >
          {playing ? <FaPause /> : <FaPlay />}
        </button>

        <span className="text-xs sm:text-sm opacity-70">
          Time: {currentTime.toFixed(1)}%
        </span>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        className="relative h-2 sm:h-3 rounded-full bg-white/10 cursor-pointer"
      >
        {/* Keyframes */}
        {allKeyframes.map((kf, index) => (
          <div
            key={index}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.9)] pointer-events-none"
            style={{ left: `${kf.time}%` }}
            title={`Keyframe at ${kf.time.toFixed(1)}%`}
          />
        ))}

        {/* Playhead */}
        <div 
          className="absolute top-[-4px] sm:top-[-6px] -translate-x-1/2 w-[2px] h-4 sm:h-6 bg-white pointer-events-none"
          style={{ left: `${currentTime}%` }}
        />
      </div>
    </div>
  )
}

export default Key
