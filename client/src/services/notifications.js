
import * as notificationsApi from './api/notificationsApi'

export async function getNotifications(options = {}) {
  return await notificationsApi.getNotifications(options)
}

export async function getUnreadCount() {
  return await notificationsApi.getUnreadCount()
}

export async function markAsRead(notificationId) {
  return await notificationsApi.markAsRead(notificationId)
}

export async function toggleRead(notificationId) {
  return await notificationsApi.toggleRead(notificationId)
}

export async function markAllAsRead() {
  return await notificationsApi.markAllAsRead()
}

export async function deleteNotification(notificationId) {
  return await notificationsApi.deleteNotification(notificationId)
}

export function subscribeToNotifications(callback, options = {}) {
  return notificationsApi.subscribeToNotifications(callback, options)
}

