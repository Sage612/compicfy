// public/sw.js
// Service worker for ComPicfy push notifications
// Handles incoming push events and notification clicks

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'ComPicfy', body: event.data.text() }
  }

  const options = {
    body:    payload.body   ?? 'You have a new notification',
    icon:    payload.icon   ?? '/icons/icon-192.png',
    badge:   payload.badge  ?? '/icons/badge-72.png',
    image:   payload.image  ?? undefined,
    data:    payload.data   ?? {},
    tag:     payload.tag    ?? 'ComPicfy-notification',
    renotify: true,
    actions: payload.actions ?? [],
    vibrate: [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'ComPicfy', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

self.addEventListener('notificationclose', (_event) => {
  // Could track dismissals here if needed
})