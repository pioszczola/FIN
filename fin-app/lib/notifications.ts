import * as Notifications from 'expo-notifications';
import type { SnapshotSchedule } from './types';

const NOTIFICATION_IDENTIFIER = 'snapshot-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelSnapshotNotifications(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER).catch(() => {});
}

export async function scheduleSnapshotNotification(
  schedule: SnapshotSchedule,
  titleText: string,
  bodyText: string
): Promise<void> {
  await cancelSnapshotNotifications();

  if (!schedule.enabled) return;

  const { hour, minute, frequency, weekday, dayOfMonth } = schedule;

  type Trigger =
    | Notifications.DailyTriggerInput
    | Notifications.WeeklyTriggerInput
    | Notifications.MonthlyTriggerInput;

  let trigger: Trigger;

  if (frequency === 'daily') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
  } else if (frequency === 'weekly') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: weekday ?? 2, // Monday as fallback
      hour,
      minute,
    };
  } else {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: dayOfMonth ?? 1,
      hour,
      minute,
    };
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDENTIFIER,
    content: {
      title: titleText,
      body: bodyText,
    },
    trigger,
  });
}
