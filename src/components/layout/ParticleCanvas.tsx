'use client'

import { useEffect, useRef } from 'react'

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const isLight = () => !document.documentElement.classList.contains('dark')

    type Particle = {
      x: number; y: number; r: number
      speed: number; drift: number
      opacity: number; opacityDir: number; opacitySpeed: number
      hue: number
      type: 'ember' | 'panel'
      panelW: number; panelH: number
      rotation: number; rotSpeed: number
    }

    const PARTICLE_COUNT = 40
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x:            Math.random() * canvas.width,
      y:            Math.random() * canvas.height,
      r:            Math.random() * 2 + 0.5,
      speed:        Math.random() * 0.3 + 0.08,
      drift:        (Math.random() - 0.5) * 0.2,
      opacity:      Math.random() * 0.4 + 0.1,
      opacityDir:   Math.random() > 0.5 ? 1 : -1,
      opacitySpeed: Math.random() * 0.006 + 0.002,
      // Red hue range — 0-15 covers red/crimson
      hue:          Math.random() * 15,
      type:         i < 6 ? 'panel' : 'ember',
      panelW:       Math.random() * 9 + 5,
      panelH:       Math.random() * 7 + 4,
      rotation:     Math.random() * Math.PI * 2,
      rotSpeed:     (Math.random() - 0.5) * 0.007,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const light             = isLight()
      const opacityMultiplier = light ? 1.8 : 1
      const lightness         = light ? 35 : 60
      const coreLightness     = light ? 25 : 70

      for (const p of particles) {
        p.y -= p.speed
        p.x += p.drift
        p.opacity += p.opacityDir * p.opacitySpeed
        if (p.opacity > 0.65 || p.opacity < 0.06) p.opacityDir *= -1
        p.rotation += p.rotSpeed

        if (p.y < -20)              { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        if (p.x < -20)              p.x = canvas.width + 10
        if (p.x > canvas.width + 20) p.x = -10

        ctx.save()
        ctx.globalAlpha = Math.min(1, p.opacity * opacityMultiplier)

        if (p.type === 'panel') {
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.strokeStyle  = `hsla(${p.hue}, 85%, ${lightness}%, 1)`
          ctx.lineWidth    = light ? 0.8 : 0.6
          ctx.shadowColor  = `hsla(${p.hue}, 85%, ${lightness}%, 0.8)`
          ctx.shadowBlur   = light ? 2 : 4
          ctx.strokeRect(-p.panelW / 2, -p.panelH / 2, p.panelW, p.panelH)
          ctx.lineWidth = 0.3
          ctx.beginPath()
          ctx.moveTo(-p.panelW / 2 + 1, 0)
          ctx.lineTo(p.panelW / 2 - 1, 0)
          ctx.stroke()
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3)
          grad.addColorStop(0,   `hsla(${p.hue}, 90%, ${coreLightness + 10}%, 1)`)
          grad.addColorStop(0.5, `hsla(${p.hue}, 75%, ${lightness}%, 0.4)`)
          grad.addColorStop(1,   `hsla(${p.hue}, 65%, ${lightness - 10}%, 0)`)
          ctx.fillStyle   = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle  = `hsla(${p.hue + 10}, 95%, ${coreLightness}%, 1)`
          ctx.shadowColor = `hsla(${p.hue}, 90%, ${lightness}%, 1)`
          ctx.shadowBlur  = light ? 2 : 3
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}