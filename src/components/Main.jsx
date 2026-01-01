import React, { useState, useRef, useEffect } from 'react'
import { MdOutlineAnimation, MdDownload } from 'react-icons/md'
import { Undo, Type } from 'lucide-react'
import Canvas from './Canvas'
import Key from './Key'
import html2canvas from 'html2canvas'

function Main() {
  const [bgColor, setBgColor] = useState('#0f172a')
  
  // Animation state
  const [currentTime, setCurrentTime] = useState(0) // 0-100
  const [playing, setPlaying] = useState(false)
  const [keyframes, setKeyframes] = useState({}) // { assetId: [{ time, x, y, width, height, rotation }] }
  const [isExporting, setIsExporting] = useState(false)
  const [assets, setAssets] = useState([])
  
  // Tool state
  const [currentTool, setCurrentTool] = useState('select') // 'select', 'text'
  const [history, setHistory] = useState([]) // For undo functionality
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Text properties
  const [textColor, setTextColor] = useState('#ffffff')
  const [textFont, setTextFont] = useState('Arial')
  const [textBold, setTextBold] = useState(false)
  
  // Convert hex to rgb for better compatibility
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  const canvasRef = useRef(null)

  // Initialize history with empty state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory()
    }
  }, [])

  // Save state to history for undo
  const saveToHistory = () => {
    const newState = {
      assets: JSON.parse(JSON.stringify(assets)),
      keyframes: JSON.parse(JSON.stringify(keyframes))
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setAssets(JSON.parse(JSON.stringify(prevState.assets)))
      setKeyframes(JSON.parse(JSON.stringify(prevState.keyframes)))
      setHistoryIndex(historyIndex - 1)
    }
  }

  // Add text asset
  const handleAddText = () => {
    // Create text asset immediately in center of canvas
    const rgbColor = hexToRgb(textColor)
    const newTextAsset = {
      id: crypto.randomUUID(),
      type: 'text',
      text: 'Type here...',
      x: 400, // Center of canvas
      y: 200,
      width: 200,
      height: 50,
      rotation: 0,
      color: rgbColor ? `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})` : textColor,
      font: textFont,
      bold: textBold,
      isEditing: true
    }
    
    setAssets(prev => [...prev, newTextAsset])
    saveToHistory()
  }

  async function handleDownload() {
    if (Object.keys(keyframes).length === 0) {
      alert('No animation to download. Please add keyframes first.')
      return
    }

    setIsExporting(true)
    
    try {
      // Create a hidden canvas for recording
      const recordingCanvas = document.createElement('canvas')
      recordingCanvas.width = 1000
      recordingCanvas.height = 580
      const ctx = recordingCanvas.getContext('2d')
      
      // Try to use MediaRecorder
      let mediaRecorder
      let stream
      
      try {
        stream = recordingCanvas.captureStream(30) // 30 fps
        const options = { mimeType: 'video/webm;codecs=vp9' }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm;codecs=vp8'
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm'
        }
        
        mediaRecorder = new MediaRecorder(stream, options)
      } catch (err) {
        throw new Error('MediaRecorder not supported')
      }

      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const originalTime = currentTime
      const originalPlaying = playing
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `animation-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
        setIsExporting(false)
        setCurrentTime(originalTime)
        setPlaying(originalPlaying)
        stream.getTracks().forEach(track => track.stop())
      }

      // Start recording
      mediaRecorder.start()
      setCurrentTime(0)
      setPlaying(false) // We'll manually control the time
      
      // Preload all images first
      const imagePromises = assets
        .filter(asset => asset.type === 'image')
        .map(asset => {
          return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve({ asset, img })
            img.onerror = () => resolve({ asset, img: null })
            img.src = asset.src
          })
        })
      
      const loadedImages = await Promise.all(imagePromises)
      
      // Find the last keyframe time
      let lastKeyframeTime = 0
      Object.values(keyframes).forEach(frames => {
        frames.forEach(frame => {
          if (frame.time > lastKeyframeTime) {
            lastKeyframeTime = frame.time
          }
        })
      })
      
      // If no keyframes, use 100 as default
      if (lastKeyframeTime === 0) {
        lastKeyframeTime = 100
      }
      
      // Render frames up to last keyframe
      for (let time = 0; time <= lastKeyframeTime; time += 0.5) {
        setCurrentTime(time)
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // Clear canvas with background
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, 1000, 580)
        
        // Get interpolated assets for this time
        const interpolatedAssets = interpolateAssets(time, assets, keyframes)
        
        // Draw all assets
        interpolatedAssets.forEach(asset => {
          ctx.save()
          
          if (asset.type === 'image') {
            const imageResult = loadedImages.find(r => r.asset.id === asset.id)
            if (imageResult && imageResult.img) {
              ctx.translate(asset.x + asset.width/2, asset.y + asset.height/2)
              ctx.rotate(asset.rotation * Math.PI / 180)
              ctx.drawImage(imageResult.img, -asset.width/2, -asset.height/2, asset.width, asset.height)
            }
          } else if (asset.type === 'text') {
            ctx.translate(asset.x + asset.width/2, asset.y + asset.height/2)
            ctx.rotate(asset.rotation * Math.PI / 180)
            ctx.fillStyle = asset.color || '#ffffff'
            ctx.font = `${asset.bold ? 'bold' : 'normal'} ${Math.max(12, Math.min(48, asset.height * 0.4))}px ${asset.font || 'Arial'}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(asset.text || '', 0, 0)
          }
          
          ctx.restore()
        })
      }
      
      setTimeout(() => {
        mediaRecorder.stop()
      }, 100)
      
    } catch (error) {
      console.error('Error exporting animation:', error)
      alert('Error exporting animation. Please try again.')
      setIsExporting(false)
      setPlaying(false)
    }
  }

  // Helper function to interpolate assets based on time (copied from Canvas)
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
          x: before.x + (after.x - before.x) * t,
          y: before.y + (after.y - before.y) * t,
          width: before.width + (after.width - before.width) * t,
          height: before.height + (after.height - before.height) * t,
          rotation: before.rotation + (after.rotation - before.rotation) * t
        }
      }

      return asset
    })
  }

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden flex flex-col">

      {/* Top bar */}
      <header className="h-[72px] flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.9)]">
          <MdOutlineAnimation className="text-3xl" />
          easyAnimator
        </div>

        {/* Middle toolbar with undo and text tools */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={`p-2 rounded-lg transition ${
              historyIndex <= 0
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>

          <button
            onClick={handleAddText}
            className="p-2 rounded-lg transition bg-gray-600 hover:bg-gray-500"
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Text properties */}
          <div className="flex items-center gap-2 border-l border-gray-600 pl-4">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
              title="Text Color"
            />
            <select
              value={textFont}
              onChange={(e) => setTextFont(e.target.value)}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              title="Font"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times</option>
              <option value="Courier New">Courier</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Comic Sans MS">Comic Sans</option>
            </select>
            <button
              onClick={() => setTextBold(!textBold)}
              className={`px-3 py-1 rounded text-sm font-bold transition ${
                textBold
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Bold"
            >
              B
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Canvas</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-9 h-9 rounded-md cursor-pointer bg-transparent"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              isExporting
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]'
            }`}
          >
            <MdDownload className="text-lg" />
            {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-10 pt-4 pb-4 min-h-0 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center min-h-0 w-full">
          <Canvas 
            ref={canvasRef}
            bgColor={bgColor} 
            currentTime={currentTime}
            playing={playing}
            keyframes={keyframes}
            setKeyframes={setKeyframes}
            onAssetsChange={setAssets}
            assets={assets}
            setAssets={setAssets}
            saveToHistory={saveToHistory}
            textProperties={{ color: textColor, font: textFont, bold: textBold }}
          />
        </div>

        {/* Timeline */}
        <div className="shrink-0 w-full max-w-[1000px]">
          <Key 
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            playing={playing}
            setPlaying={setPlaying}
            keyframes={keyframes}
          />
        </div>

      </main>

    </div>
  )
}

export default Main
