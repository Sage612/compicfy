'use client'

import { useState } from 'react'

export default function PreviewAccessPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/preview-access/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      window.location.href = '/'
    } else {
      setError('Invalid code')
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '260px' }}>
        <label htmlFor="code">Preview access code</label>
        <input
          id="code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </div>
  )
}
