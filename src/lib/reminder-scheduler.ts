import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Notification IDs for daily reminders
const MORNING_REMINDER_ID = 100;
const EVENING_REMINDER_ID = 101;

export interface ReminderSettings {
  morningEnabled: boolean;
  morningTime: string; // "HH:MM" format (24-hour)
  eveningEnabled: boolean;
  eveningTime: string; // "HH:MM" format (24-hour)
}

/**
 * Check if notification permissions are granted
 */
export async function checkReminderPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true; // Web doesn't need permissions
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.warn('Failed to check notification permissions:', err);
    return false;
  }
}

/**
 * Request notification permissions
 */
export async function requestReminderPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.warn('Failed to request notification permissions:', err);
    return false;
  }
}

/**
 * Schedule daily meditation reminder notifications
 */
export async function scheduleReminders(settings: ReminderSettings): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Reminders not supported on web');
    return;
  }

  try {
    // First, cancel any existing reminders
    await cancelAllReminders();

    const notifications = [];

    // Schedule morning reminder
    if (settings.morningEnabled && settings.morningTime) {
      const [hours, minutes] = settings.morningTime.split(':').map(Number);

      notifications.push({
        id: MORNING_REMINDER_ID,
        title: 'Time to meditate 🌅',
        body: 'Good morning! Take a moment to center yourself.',
        schedule: {
          on: {
            hour: hours,
            minute: minutes,
          },
          // Repeat daily
          every: 'day' as const,
        },
        // Use default system sound (not custom meditation sounds)
        sound: undefined,
        actionTypeId: 'OPEN_TIMER',
        extra: {
          type: 'daily_reminder',
          reminderType: 'morning',
          route: '/timer',
        },
      });
    }

    // Schedule evening reminder
    if (settings.eveningEnabled && settings.eveningTime) {
      const [hours, minutes] = settings.eveningTime.split(':').map(Number);

      notifications.push({
        id: EVENING_REMINDER_ID,
        title: 'Evening meditation 🌙',
        body: 'Wind down your day with a few moments of reflection.',
        schedule: {
          on: {
            hour: hours,
            minute: minutes,
          },
          // Repeat daily
          every: 'day' as const,
        },
        // Use default system sound
        sound: undefined,
        actionTypeId: 'OPEN_TIMER',
        extra: {
          type: 'daily_reminder',
          reminderType: 'evening',
          route: '/timer',
        },
      });
    }

    // Schedule all enabled notifications
    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} daily reminder(s)`);
    }
  } catch (err) {
    console.error('Failed to schedule reminders:', err);
    throw err;
  }
}

/**
 * Cancel a specific reminder
 */
export async function cancelReminder(type: 'morning' | 'evening'): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const id = type === 'morning' ? MORNING_REMINDER_ID : EVENING_REMINDER_ID;
    await LocalNotifications.cancel({
      notifications: [{ id }],
    });
    console.log(`Cancelled ${type} reminder`);
  } catch (err) {
    console.warn(`Failed to cancel ${type} reminder:`, err);
  }
}

/**
 * Cancel all daily reminders
 */
export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: MORNING_REMINDER_ID },
        { id: EVENING_REMINDER_ID },
      ],
    });
    console.log('Cancelled all daily reminders');
  } catch (err) {
    console.warn('Failed to cancel all reminders:', err);
  }
}

/**
 * Get pending reminder notifications
 */
export async function getPendingReminders(): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.filter(
      (n) => n.extra?.type === 'daily_reminder'
    );
  } catch (err) {
    console.warn('Failed to get pending reminders:', err);
    return [];
  }
}
