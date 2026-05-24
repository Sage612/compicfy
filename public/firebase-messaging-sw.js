importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            "AIzaSyDui8tqFWIYbugch4kgoUrHgCTBpF1g-Rk",
  projectId:         "compicfy-ce716",
  messagingSenderId: "57411783505",
  appId:             "1:57411783505:web:6a7a2343c23950de1f2170",
})

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging()

// Handle incoming background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)

  const title = payload.notification?.title || 'Compicfy'
  const options = {
    body: payload.notification?.body || '',
    icon: payload.notification?.image || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'compicfy-notification',
    data: {
      // Pass the URL so clicking the notification opens the right page
      url: payload?.data?.url || payload?.fcmOptions?.link || '/',
    },
  }

  self.registration.showNotification(title, options)
})

// Handle notification click so it opens the app/focuses the tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close() // Close the notification popup

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate to the URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // If no window is open, open a new one
      return clients.openWindow(targetUrl)
    })
  )
})