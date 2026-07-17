'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
}

export function ScrollingTitle({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    function checkOverflow() {
      if (window.innerWidth >= 640) {
        setOverflows(false)
        return
      }
      const container = containerRef.current
      const text       = textRef.current
      if (!container || !text) return
      setOverflows(text.scrollWidth > container.clientWidth)
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [children])

  return (
    <div ref={containerRef} className={`relative overflow-hidden min-w-0 ${className}`}>
      {overflows ? (
        <div className="flex whitespace-nowrap animate-marquee">
          <div className="flex items-center shrink-0 pr-8">{children}</div>
          <div className="flex items-center shrink-0 pr-8" aria-hidden="true">{children}</div>
        </div>
      ) : (
        <div ref={textRef} className="inline-flex items-center whitespace-nowrap">
          {children}
        </div>
      )}
    </div>
  )
}