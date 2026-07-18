'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
}

export function ScrollingTitle({ children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef       = useRef<HTMLDivElement>(null)
  const copyRef        = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows]     = useState(false)
  const [copyWidth, setCopyWidth]      = useState(0)

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

  useEffect(() => {
    if (!overflows) return
    function measure() {
      if (copyRef.current) setCopyWidth(copyRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [overflows, children])

  return (
    <div ref={containerRef} className={`relative overflow-hidden min-w-0 ${className}`}>
      {overflows ? (
        <div
          className="flex whitespace-nowrap"
          style={
            copyWidth > 0
              ? {
                  animation: 'scrolling-title-marquee 8s linear infinite',
                  // Custom property consumed by the keyframes below via calc()
                  ['--scrolling-title-copy-width' as any]: `${copyWidth}px`,
                }
              : undefined
          }
        >
          <div ref={copyRef} className="flex items-center shrink-0 pr-8">{children}</div>
          <div className="flex items-center shrink-0 pr-8" aria-hidden="true">{children}</div>
        </div>
      ) : (
        <div ref={textRef} className="inline-flex items-center whitespace-nowrap">
          {children}
        </div>
      )}
      <style jsx>{`
        @keyframes scrolling-title-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-1 * var(--scrolling-title-copy-width))); }
        }
      `}</style>
    </div>
  )
}