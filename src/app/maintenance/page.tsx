import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Wrench } from 'lucide-react'
import type { Metadata } from 'next'
import { MaintenancePoller } from '@/components/MaintenancePoller'

export const metadata: Metadata = {
  title: 'Under Maintenance · ComPicfy',
  robots: { index: false, follow: false },
}

export default async function MaintenancePage() {

  const supabase = await createClient()

  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .single()
  
  if (!settings?.maintenance_mode) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Wrench size={28} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">We'll be right back</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            ComPicfy is undergoing quick maintenance. This usually takes just a few minutes,
            thanks for your patience. This page will refresh automatically once we're back.
          </p>
        </div>
        <MaintenancePoller />
      </div>
    </div>
  )
}