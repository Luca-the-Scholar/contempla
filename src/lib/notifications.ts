import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type TimerSound = 'none' | 'bowl-struck-1' | 'bowl-struck-2' | 'bowl-struck-3' | 'bowl-struck-4' | 'gong' | 'bell-1' | 'bell-2';

// Map timer sound IDs to actual notification sound file names
const NOTIFICATION_SOUND_MAP: Record<Exclude<TimerSound, 'none'>, string> = {
  'bowl-struck-1': 'tibetan-bowl-struck-1.wav',
  'bowl-struck-2': 'tibetan-bowl-struck-2.wav',
  'bowl-struck-3': 'tibetan-bowl-struck-3.wav',
  'bowl-struck-4': 'tibetan-bowl-struck-4.wav',
  'gong': 'gong-sweet.wav',
  'bell-1': 'small-bell-1.wav',
  'bell-2': 'small-bell-2.wav',
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web doesn't need permission for local notifications in the same way
    return true;
  }

  try {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return false;
  }
}

export async function scheduleTimerNotification(
  durationMs: number,
  sound: TimerSound = 'bowl-struck-1'
): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const notificationId = Date.now();
    const triggerTime = new Date(Date.now() + durationMs);

    // Get the notification sound file, or use default if 'none' selected
    const notificationSound = sound === 'none'
      ? 'tibetan-bowl-struck-1.wav'  // Fallback to default if user disabled sound
      : NOTIFICATION_SOUND_MAP[sound];

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: 'Meditation Complete',
          body: 'Your meditation session has ended. Take a moment to notice how you feel.',
          schedule: { at: triggerTime },
          sound: notificationSound,
          actionTypeId: 'TIMER_COMPLETE',
          extra: {
            type: 'timer_complete',
          },
        },
      ],
    });

    return notificationId;
  } catch (err) {
    console.warn('Failed to schedule notification:', err);
    return null;
  }
}

export async function cancelTimerNotification(notificationId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  } catch (err) {
    console.warn('Failed to cancel notification:', err);
  }
}

export async function cancelAllTimerNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();
    const timerNotifications = pending.notifications.filter(
      (n) => n.extra?.type === 'timer_complete'
    );
    
    if (timerNotifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: timerNotifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (err) {
    console.warn('Failed to cancel all timer notifications:', err);
  }
}
