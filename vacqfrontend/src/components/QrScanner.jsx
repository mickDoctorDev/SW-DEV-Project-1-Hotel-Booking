import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

const MAX_WIDTH = 640 // decode a downscaled frame: fast enough on phones, still reads a screen or printout

// Opens the camera and calls onScan(text) once with the first QR code it reads, then stops the camera.
function QrScanner({ onScan }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onScanRef = useRef(onScan)
  const noCamera = !navigator.mediaDevices?.getUserMedia // plain http (not localhost) hides the camera API
  const [error, setError] = useState(noCamera ? 'The camera needs a secure (https) page. Paste the code below instead.' : '')

  useEffect(() => { onScanRef.current = onScan })

  useEffect(() => {
    let stream
    let raf = 0
    let stopped = false

    const tick = () => {
      const video = videoRef.current
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const hit = jsQR(img.data, img.width, img.height)
        if (hit?.data) return onScanRef.current(hit.data)
      }
      raf = requestAnimationFrame(tick)
    }

    if (noCamera) return
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        videoRef.current.srcObject = s
        videoRef.current.play()
        tick()
      })
      .catch(() => setError('Could not open the camera. Allow camera access, or paste the code below.'))

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [noCamera])

  if (error) return <p className='error-text' role='alert'>{error}</p>
  return (
    <div className='scanner'>
      <video ref={videoRef} muted playsInline aria-label='Camera view for scanning the QR code' />
      <canvas ref={canvasRef} hidden />
      <span className='scanner-frame' aria-hidden />
    </div>
  )
}

export default QrScanner
