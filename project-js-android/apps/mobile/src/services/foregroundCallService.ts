import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'
import * as Notifications from 'expo-notifications'
import { Audio } from 'expo-av'

const FOREGROUND_SERVICE_TASK = 'GROUP_CALL_FOREGROUND_SERVICE'

TaskManager.defineTask(FOREGROUND_SERVICE_TASK, async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAudio: false,
      playThroughEarpieceAndroid: false,
    })
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (error) {
    console.error('Foreground service task error:', error)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export interface GroupCallNotificationData {
  callId: string
  channelId: number
  participantCount: number
  participantNames: string[]
}

class ForegroundCallService {
  private notificationId: string | null = null
  private isRunning = false

  async start(data: GroupCallNotificationData): Promise<void> {
    if (this.isRunning) {
      await this.update(data)
      return
    }

    this.isRunning = true

    await Notifications.setNotificationChannelAsync('group_call', {
      name: 'Групповой звонок',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    })

    await this.showNotification(data)

    await BackgroundFetch.registerTaskAsync(FOREGROUND_SERVICE_TASK, {
      minimumInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
    })

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAudio: false,
      playThroughEarpieceAndroid: false,
    })

    console.log('Foreground call service started')
  }

  async update(data: GroupCallNotificationData): Promise<void> {
    if (!this.isRunning || !this.notificationId) return
    await this.showNotification(data)
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false

    if (this.notificationId) {
      await Notifications.dismissNotificationAsync(this.notificationId)
      this.notificationId = null
    }

    await BackgroundFetch.unregisterTaskAsync(FOREGROUND_SERVICE_TASK)

    await Audio.setAudioModeAsync({
      staysActiveInBackground: false,
    })

    console.log('Foreground call service stopped')
  }

  private async showNotification(data: GroupCallNotificationData): Promise<void> {
    const title = 'Групповой звонок'
    const body = `${data.participantCount} участник${this.getPlural(data.participantCount)}: ${data.participantNames.slice(0, 3).join(', ')}${data.participantNames.length > 3 ? '...' : ''}`

    const notification = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { callId: data.callId, type: 'groupCallActive' },
        categoryIdentifier: 'group_call',
        sticky: true,
        autoDismiss: false,
        color: '#00D4AA',
      },
      trigger: null,
    })

    this.notificationId = notification
  }

  private getPlural(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return ''
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'а'
    return 'ов'
  }
}

export const foregroundCallService = new ForegroundCallService()

export async function setupGroupCallNotifications(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('group_call', [
    {
      identifier: 'leave_call',
      buttonTitle: 'Выйти',
      options: { isDestructive: true, isAuthenticationRequired: false },
    },
  ])

  Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.notification.request.content.categoryIdentifier === 'group_call') {
      if (response.actionIdentifier === 'leave_call') {
        // Handle leave call action
        console.log('User pressed Leave from notification')
      }
    }
  })
}