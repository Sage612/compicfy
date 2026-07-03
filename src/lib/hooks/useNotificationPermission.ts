'use client'

import { useCallback, useEffect, useState } from 'react'
import { getFirebaseMessaging } from '@/lib/firebase/client'
import { getToken, onMessage } from 'firebase/messaging'

type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function useNotificationPermission() {
  const [permission, setPermission] = useState<PushPermissionState>('default')
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine current state on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PushPermissionState)
  }, [])

  // Registers the service worker, gets an FCM token, saves it to Supabase
  const subscribe = useCallback(async () => {
    setError(null)
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return false
    }

    setSubscribing(true)
    try {
      // 1. Ask the browser for permission (this is the native prompt —
      //    only call this from a user gesture, e.g. a button click)
      const result = await Notification.requestPermission()
      setPermission(result as PushPermissionState)
      if (result !== 'granted') {
        setSubscribing(false)
        return false
      }

      // 2. Register the FCM background service worker explicitly.
      //    Must be registered at the root scope so it can receive push events
      //    even when no tab is open.
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      )
      await navigator.serviceWorker.ready

      // 3. Get the messaging instance (returns null if unsupported, e.g. Safari <16.4 iOS PWA rules)
      const messaging = await getFirebaseMessaging()
      if (!messaging) {
        setError('Push notifications are not supported in this browser.')
        setSubscribing(false)
        return false
      }

      // 4. Generate the FCM registration token for this device/browser
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        setError('Could not generate a notification token. Try again.')
        setSubscribing(false)
        return false
      }

      // 5. Save the token to Supabase so the server can send to it later
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save subscription')
      }

      setSubscribing(false)
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubscribing(false)
      return false
    }
  }, [])

  return { permission, subscribing, error, subscribe }
}