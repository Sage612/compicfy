import { Wrench } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Under Maintenance · ComPicfy' }

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Wrench size={28} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">We'll be right back</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            ComPicfy is undergoing quick maintenance. This usually takes just a few minutes
            thanks for your patience.
          </p>
        </div>
      </div>
    </div>
  )
}