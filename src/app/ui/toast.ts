import { Component, inject } from '@angular/core';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of notifService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" role="status">
          <span class="toast-icon" aria-hidden="true">
            @if (toast.type === 'success') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            } @else if (toast.type === 'warning') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            } @else {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button
            class="toast-close"
            (click)="notifService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 420px;
      padding: 12px 14px;
      border-radius: 10px;
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      pointer-events: all;
      animation: slide-in 0.22s ease;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .toast--success {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      color: #15803D;
    }
    .toast--warning {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
    }
    .toast--info {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1D4ED8;
    }

    .toast-icon { display: flex; align-items: center; flex-shrink: 0; }
    .toast-msg  { flex: 1; line-height: 1.4; }

    .toast-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      opacity: 0.5;
      border-radius: 4px;
      color: inherit;
      transition: opacity 0.15s, background 0.15s;
    }
    .toast-close:hover { opacity: 1; background: rgba(0,0,0,0.06); }
  `]
})
export class Toast {
  protected notifService = inject(NotificationService);
}
