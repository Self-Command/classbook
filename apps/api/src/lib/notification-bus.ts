import { EventEmitter } from 'node:events';
import type { NotificationDto } from '@classbook/shared';

export interface NotificationEvent {
  notification: NotificationDto;
  unreadCount: number;
}

class NotificationBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  subscribe(
    userId: string,
    listener: (event: NotificationEvent) => void,
  ): () => void {
    const channel = `user:${userId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  emit(userId: string, event: NotificationEvent): void {
    this.emitter.emit(`user:${userId}`, event);
  }
}

export const notificationBus = new NotificationBus();
