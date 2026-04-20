'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  target:    number
  suffix?:   string
  duration?: number
}

export function AnimatedCounter({ target, suffix = '', duration = 1200 }: Props) {
  // Start at target immediately if zero — nothing to animate
  const [count,    setCount]    = useState(target === 0 ? 0 : 0)
  const ref         = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    // Nothing to animate
    if (target === 0) { setCount(0); return }

    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        obs.disconnect()

        const startTime = performance.now()
        const tick = (now: number) => {
          const elapsed  = now - startTime
          const progress = Math.min(elapsed / duration, 1)
          // ease-out cubic
          const eased    = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * target))
          if (progress < 1) requestAnimationFrame(tick)
          else setCount(target)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.3 }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}