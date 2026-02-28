import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <BookOpen size={32} className="text-primary" />
      </div>
      <div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground">
          This page is still being written...
        </p>
      </div>
      <Link href="/">
        <Button className="gap-2">
          <Home size={16} />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}