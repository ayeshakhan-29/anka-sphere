import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'gate_approved' | 'stage_unlocked' | 'gate_pending' | 'info';
export type ToastType = 'success' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  projectId: string;
  projectName: string;
  route: string;
  createdAt: string;
  read: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const STORAGE_KEY = 'anka_notifications';

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-1',
    type: 'stage_unlocked',
    title: 'Design approved',
    body: 'Healthcare Platform — Development is now unlocked',
    projectId: '2',
    projectName: 'Healthcare Platform',
    route: '/app/projects/2/development',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: false,
  },
  {
    id: 'seed-2',
    type: 'gate_approved',
    title: 'Written Content gate passed',
    body: 'Fashion E-Commerce — Design stage is now active',
    projectId: '4',
    projectName: 'Fashion E-Commerce',
    route: '/app/projects/4/design',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    read: false,
  },
  {
    id: 'seed-3',
    type: 'gate_pending',
    title: 'Gate review needed',
    body: 'Corporate Website — Written Content is pending gate approval',
    projectId: '1',
    projectName: 'Corporate Website',
    route: '/app/projects/1/content',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    read: true,
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>(this.load());
  readonly toasts = signal<Toast[]>([]);

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  add(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.notifications.update(list => [notification, ...list]);
    this.save();
    this.pushToast(n.title, toastTypeFor(n.type));
  }

  toast(message: string, type: ToastType = 'info'): void {
    this.pushToast(message, type);
  }

  markRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.save();
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.save();
  }

  dismiss(toastId: string): void {
    this.toasts.update(list => list.filter(t => t.id !== toastId));
  }

  private pushToast(message: string, type: ToastType): void {
    const id = `toast-${Date.now()}`;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 4000);
  }

  private load(): AppNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored: AppNotification[] = raw ? JSON.parse(raw) : [];
      if (stored.length === 0) return SEED_NOTIFICATIONS;
      return stored;
    } catch {
      return SEED_NOTIFICATIONS;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications()));
    } catch { /* storage unavailable */ }
  }
}

function toastTypeFor(type: NotificationType): ToastType {
  if (type === 'gate_approved' || type === 'stage_unlocked') return 'success';
  if (type === 'gate_pending') return 'warning';
  return 'info';
}
