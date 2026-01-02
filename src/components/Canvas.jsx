import React, { useState, useRef, useEffect, forwardRef } from 'react'

function lerp(a, b, t) {
  return a + (b - a) * t
}

const Canvas = forwardRef(function Canvas({ bgColor, currentTime, playing, keyframes, setKeyframes, onAssetsChange, assets, setAssets, saveToHistory, textProperties }, ref) {
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  // Expose assets to parent for download
  useEffect(() => {
    if (onAssetsChange) {
      onAssetsChange(assets)
    }
  }, [assets, onAssetsChange])

  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const rotateRef = useRef(null)
  const currentTimeRef = useRef(currentTime)
  
  // Keep ref in sync with currentTime
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleCanvasClick(e) {
    if (!isTyping) {
      setSelectedId(null)
    }
  }

  function handleTextChange(assetId, newText) {
    setAssets(prev => 
      prev.map(asset => 
        asset.id === assetId ? { ...asset, text: newText } : asset
      )
    )
  }

  function handleTextBlur(assetId) {
    setAssets(prev => 
      prev.map(asset => 
        asset.id === assetId ? { ...asset, isEditing: false } : asset
      )
    )
    setIsTyping(false)
    setIsEditing(false)
    if (saveToHistory) saveToHistory()
  }

  function handleTextFocus(assetId) {
    setAssets(prev => 
      prev.map(asset => 
        asset.id === assetId ? { ...asset, isEditing: true } : asset
      )
    )
    setIsTyping(true)
    setIsEditing(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return

    const url = URL.createObjectURL(file)
    
    // Get current screen size for responsive positioning
    const screenWidth = window.innerWidth
    let canvasWidth, canvasHeight
    
    if (screenWidth < 640) { // mobile
      canvasWidth = 320
      canvasHeight = 200
    } else if (screenWidth < 768) { // tablet
      canvasWidth = 600
      canvasHeight = 350
    } else if (screenWidth < 1024) { // medium
      canvasWidth = 800
      canvasHeight = 450
    } else { // desktop
      canvasWidth = 1000
      canvasHeight = 580
    }

    const newAsset = {
      id: crypto.randomUUID(),
      type: 'image',
      src: url,
      x: canvasWidth / 2 - 80, // Center horizontally (subtract half width)
      y: canvasHeight / 2 - 80, // Center vertically (subtract half height)
      width: 160,
      height: 160,
      rotation: 0
    }

    setAssets((prev) => [...prev, newAsset])
    if (saveToHistory) saveToHistory()
  }

  /* ---------- MOVE ---------- */
  function handleMoveStart(e, asset) {
    e.stopPropagation()
    setSelectedId(asset.id)
    setIsEditing(true)

    dragRef.current = {
      id: asset.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: asset.x,
      origY: asset.y
    }
  }

  /* ---------- RESIZE ---------- */
  function handleResizeStart(e, asset) {
    e.stopPropagation()
    setIsEditing(true)

    resizeRef.current = {
      id: asset.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: asset.width,
      origH: asset.height
    }
  }

  /* ---------- ROTATE ---------- */
  function handleRotateStart(e, asset) {
    e.stopPropagation()
    setIsEditing(true)

    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = asset.x + asset.width / 2
    const centerY = asset.y + asset.height / 2
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate initial angle
    const initialAngle = (Math.atan2(mouseY - centerY, mouseX - centerX) * 180) / Math.PI

    rotateRef.current = {
      id: asset.id,
      centerX,
      centerY,
      initialAngle,
      initialRotation: asset.rotation
    }
  }

  /* ---------- GLOBAL MOVE ---------- */
  function handleMouseMove(e) {
    if (dragRef.current) {
      const { id, startX, startY, origX, origY } = dragRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      setAssets((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, x: origX + dx, y: origY + dy } : a
        )
      )
    }

    if (resizeRef.current) {
      const { id, startX, startY, origW, origH } = resizeRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      setAssets((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                width: Math.max(40, origW + dx),
                height: Math.max(40, origH + dy)
              }
            : a
        )
      )
    }

    if (rotateRef.current) {
      if (!ref.current) return
      
      const rect = ref.current.getBoundingClientRect()
      const { id, centerX, centerY, initialAngle, initialRotation } = rotateRef.current
      
      // Get mouse position relative to canvas
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Calculate current angle
      const currentAngle = (Math.atan2(mouseY - centerY, mouseX - centerX) * 180) / Math.PI
      
      // Calculate angle difference and add to initial rotation
      let angleDiff = currentAngle - initialAngle
      
      // Normalize to -180 to 180 range
      if (angleDiff > 180) angleDiff -= 360
      if (angleDiff < -180) angleDiff += 360
      
      const newRotation = initialRotation + angleDiff

      setAssets((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, rotation: newRotation } : a
        )
      )
    }
  }

  function handleMouseUp() {
    if (dragRef.current || resizeRef.current || rotateRef.current) {
      if (saveToHistory) saveToHistory()
    }
    dragRef.current = null
    resizeRef.current = null
    rotateRef.current = null
    setIsEditing(false)
  }

  /* ---------- KEYFRAME ---------- */
  function addKeyframe(asset) {
    setKeyframes((prev) => {
      const existing = prev[asset.id] || []
      // Check if keyframe already exists at this time
      const exists = existing.some(kf => Math.abs(kf.time - currentTime) < 1)
      if (exists) {
        // Update existing keyframe
        return {
          ...prev,
          [asset.id]: existing.map(kf => 
            Math.abs(kf.time - currentTime) < 1 
              ? { time: currentTime, x: asset.x, y: asset.y, width: asset.width, height: asset.height, rotation: asset.rotation }
              : kf
          )
        }
      }
      // Add new keyframe
      return {
        ...prev,
        [asset.id]: [
          ...existing,
          { time: currentTime, x: asset.x, y: asset.y, width: asset.width, height: asset.height, rotation: asset.rotation }
        ].sort((a, b) => a.time - b.time)
      }
    })
  }

  // Helper function to interpolate assets based on time
  function interpolateAssets(time, assetsToInterpolate, keyframesData) {
    return assetsToInterpolate.map((asset) => {
      const frames = keyframesData[asset.id]
      if (!frames || frames.length === 0) return asset

      // Sort keyframes by time
      const sorted = [...frames].sort((a, b) => a.time - b.time)
      
      // Find keyframes before and after current time
      const before = sorted.filter(f => f.time <= time).pop()
      const after = sorted.find(f => f.time > time)

      // If before first keyframe, use first keyframe
      if (!before && after) {
        return {
          ...asset,
          x: after.x,
          y: after.y,
          width: after.width,
          height: after.height,
          rotation: after.rotation
        }
      }

      // If after last keyframe, use last keyframe
      if (before && !after) {
        return {
          ...asset,
          x: before.x,
          y: before.y,
          width: before.width,
          height: before.height,
          rotation: before.rotation
        }
      }

      // Interpolate between keyframes
      if (before && after) {
        const t = (time - before.time) / (after.time - before.time)
        return {
          ...asset,
          x: lerp(before.x, after.x, t),
          y: lerp(before.y, after.y, t),
          width: lerp(before.width, after.width, t),
          height: lerp(before.height, after.height, t),
          rotation: lerp(before.rotation, after.rotation, t)
        }
      }

      return asset
    })
  }

  /* ---------- PLAYBACK INTERPOLATION ---------- */
  // Update assets when currentTime changes during playback
  useEffect(() => {
    if (!playing) return
    if (isEditing) return // Don't interpolate while editing
    
    setAssets((prevAssets) => interpolateAssets(currentTime, prevAssets, keyframes))
  }, [currentTime, playing, keyframes, isEditing])

  /* ---------- LOAD KEYFRAME ON TIME CHANGE (when not playing and not editing) ---------- */
  useEffect(() => {
    if (playing) return
    if (isEditing) return

    setAssets((prev) =>
      prev.map((asset) => {
        const frames = keyframes[asset.id]
        if (!frames || frames.length === 0) return asset

        const sorted = [...frames].sort((a, b) => a.time - b.time)
        
        // Find exact keyframe match (within 0.5% threshold)
        const exactMatch = sorted.find(f => Math.abs(f.time - currentTime) < 0.5)
        if (exactMatch) {
          return {
            ...asset,
            x: exactMatch.x,
            y: exactMatch.y,
            width: exactMatch.width,
            height: exactMatch.height,
            rotation: exactMatch.rotation
          }
        }

        // If no exact match, don't change the asset position
        // This allows the user to position assets at new times without snapping back
        return asset
      })
    )
  }, [currentTime, playing, keyframes, isEditing])

  return (
    <div
      ref={ref}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      className="
        relative
        w-[320px] sm:w-[600px] md:w-[800px] lg:w-[1000px] 
        h-[200px] sm:h-[350px] md:h-[450px] lg:h-[580px]
        max-w-[calc(100vw-2rem)] max-h-[calc(100vh-200px)]
        rounded-xl
        border border-white/10
        shadow-[0_0_30px_rgba(0,0,0,0.6)]
        overflow-hidden
        transition-colors duration-300
      "
      style={{ backgroundColor: bgColor }}
    >
      {assets.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span className="text-xs sm:text-sm text-white/40 text-center px-4">
            Drop PNG or JPG here or use the Text tool to add text
          </span>
          <label className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg cursor-pointer transition-colors text-xs sm:text-sm font-medium">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file && file.type.startsWith('image/')) {
                  const url = URL.createObjectURL(file)
                  
                  // Get current screen size for responsive positioning
                  const screenWidth = window.innerWidth
                  let canvasWidth, canvasHeight
                  
                  if (screenWidth < 640) { // mobile
                    canvasWidth = 320
                    canvasHeight = 200
                  } else if (screenWidth < 768) { // tablet
                    canvasWidth = 600
                    canvasHeight = 350
                  } else if (screenWidth < 1024) { // medium
                    canvasWidth = 800
                    canvasHeight = 450
                  } else { // desktop
                    canvasWidth = 1000
                    canvasHeight = 580
                  }
                  
                  const newAsset = {
                    id: crypto.randomUUID(),
                    type: 'image',
                    src: url,
                    x: canvasWidth / 2 - 80, // Center horizontally (subtract half width)
                    y: canvasHeight / 2 - 80, // Center vertically (subtract half height)
                    width: 160,
                    height: 160,
                    rotation: 0
                  }
                  setAssets((prev) => [...prev, newAsset])
                  if (saveToHistory) saveToHistory()
                }
                // Reset input value so that same file can be selected again
                e.target.value = ''
              }}
              className="hidden"
            />
          </label>
        </div>
      )}

      {assets.map((asset) => {
        const selected = asset.id === selectedId

        return (
          <div
            key={asset.id}
            className="absolute"
            style={{
              left: asset.x,
              top: asset.y,
              width: asset.width,
              height: asset.height,
              transform: `rotate(${asset.rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            {/* SELECTION BOX */}
            {selected && (
              <div className="absolute inset-0 ring-2 ring-blue-400 pointer-events-none" />
            )}

            {/* IMAGE BODY (MOVE) */}
            <div
              onMouseDown={(e) => {
                // Always allow moving, textarea will handle its own events
                handleMoveStart(e, asset)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(asset.id)
              }}
              className="w-full h-full cursor-move"
            >
              {asset.type === 'image' ? (
                <img
                  src={asset.src}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              ) : (
                <textarea
                  value={asset.text}
                  onChange={(e) => handleTextChange(asset.id, e.target.value)}
                  onFocus={() => handleTextFocus(asset.id)}
                  onBlur={() => handleTextBlur(asset.id)}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking on textarea
                  className="w-full h-full resize-none outline-none bg-transparent text-center pointer-events-none"
                  style={{
                    color: asset.color || '#ffffff',
                    fontFamily: asset.font || 'Arial',
                    fontWeight: asset.bold ? 'bold' : 'normal',
                    fontSize: `${Math.max(12, Math.min(48, asset.height * 0.4))}px`, // Dynamic font size based on height
                    textAlign: 'center',
                    border: asset.isEditing ? '1px dashed rgba(255,255,255,0.5)' : 'none',
                    cursor: 'text',
                    pointerEvents: asset.isEditing ? 'auto' : 'none' // Only allow interaction when editing
                  }}
                  placeholder="Type here..."
                />
              )}
            </div>

            {/* RESIZE HANDLE */}
            {selected && (
              <div
                onMouseDown={(e) => handleResizeStart(e, asset)}
                className="
                  absolute -bottom-2 -right-2
                  w-4 h-4
                  bg-white border border-blue-400
                  cursor-se-resize
                  z-10
                "
              />
            )}

            {/* ROTATE HANDLE */}
            {selected && (
              <>
                {/* connector line */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-blue-400 z-10" />

                {/* rotate knob */}
                <div
                  onMouseDown={(e) => handleRotateStart(e, asset)}
                  title="Rotate"
                  className="
                    absolute -top-14 left-1/2 -translate-x-1/2
                    w-6 h-6
                    rounded-full
                    bg-blue-500
                    border-2 border-blue-300
                    shadow-[0_0_12px_rgba(59,130,246,0.9)]
                    cursor-grab
                    active:cursor-grabbing
                    hover:scale-110
                    transition-transform
                    z-10
                  "
                />
              </>
            )}

            {/* ADD KEYFRAME BUTTON */}
            {selected && !playing && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addKeyframe(asset)
                }}
                className="
                  absolute -top-8 left-0
                  bg-blue-500 hover:bg-blue-400
                  text-white text-xs font-semibold
                  px-3 py-1.5 rounded-md
                  shadow-lg
                  transition-colors
                  z-10
                "
              >
                + Keyframe
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default Canvas
