importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyDui8tqFWIYbugch4kgoUrHgCTBpF1g-Rk',
  projectId:         'compicfy-ce716',
  messagingSenderId: '57411783505',
  appId:             '1:57411783505:web:6a7a2343c23950de1f2170',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification ?? {}

  self.registration.showNotification(title ?? 'Compicfy', {
    body:    body    ?? '',
    icon:    icon    ?? '/icons/icon-192.png',
    badge:             '/icons/badge-72.png',
    data:    payload.data ?? {},
    tag:               'compicfy-notification',
    renotify: true,
    vibrate: [100, 50, 100],
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})