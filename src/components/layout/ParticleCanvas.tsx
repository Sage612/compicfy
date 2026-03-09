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
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type Particle = {
      x: number; y: number; r: number
      speed: number; drift: number
      opacity: number; opacityDir: number; opacitySpeed: number
      hue: number
      type: 'ember' | 'panel'
      panelW: number; panelH: number
      rotation: number; rotSpeed: number
    }

    const PARTICLE_COUNT = 45
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.5,
      speed: Math.random() * 0.35 + 0.08,
      drift: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.15,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      opacitySpeed: Math.random() * 0.007 + 0.002,
      hue: Math.random() * 30 + 22,
      type: i < 7 ? 'panel' : 'ember',
      panelW: Math.random() * 9 + 5,
      panelH: Math.random() * 7 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.y -= p.speed
        p.x += p.drift
        p.opacity += p.opacityDir * p.opacitySpeed
        if (p.opacity > 0.75 || p.opacity < 0.08) p.opacityDir *= -1
        p.rotation += p.rotSpeed

        if (p.y < -20) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        if (p.x < -20) p.x = canvas.width + 10
        if (p.x > canvas.width + 20) p.x = -10

        ctx.save()
        ctx.globalAlpha = p.opacity

        if (p.type === 'panel') {
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.strokeStyle = `hsla(${p.hue}, 80%, 68%, 1)`
          ctx.lineWidth = 0.7
          ctx.shadowColor = `hsla(${p.hue}, 80%, 60%, 0.9)`
          ctx.shadowBlur = 5
          ctx.strokeRect(-p.panelW / 2, -p.panelH / 2, p.panelW, p.panelH)
          ctx.lineWidth = 0.35
          ctx.beginPath()
          ctx.moveTo(-p.panelW / 2 + 1, 0)
          ctx.lineTo(p.panelW / 2 - 1, 0)
          ctx.stroke()
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5)
          grad.addColorStop(0, `hsla(${p.hue}, 90%, 82%, 1)`)
          grad.addColorStop(0.5, `hsla(${p.hue}, 75%, 60%, 0.5)`)
          grad.addColorStop(1, `hsla(${p.hue}, 65%, 48%, 0)`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `hsla(${p.hue + 20}, 95%, 92%, 1)`
          ctx.shadowColor = `hsla(${p.hue}, 90%, 80%, 1)`
          ctx.shadowBlur = 4
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