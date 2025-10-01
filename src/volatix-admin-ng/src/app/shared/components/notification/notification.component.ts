import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationMessage } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      @for (notification of notificationService.getNotifications(); track notification.id) {
        <div 
          class="notification"
          [class]="'notification-' + notification.type"
          [attr.role]="notification.type === 'error' ? 'alert' : 'status'"
        >
          <div class="notification-content">
            <div class="notification-header">
              <div class="notification-icon">
                @switch (notification.type) {
                  @case ('success') { ✓ }
                  @case ('error') { ✕ }
                  @case ('warning') { ⚠ }
                  @case ('info') { ℹ }
                }
              </div>
              <div class="notification-title">{{ notification.title }}</div>
              @if (notification.action) {
                <div class="notification-action">{{ notification.action }}</div>
              }
            </div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">
              {{ notification.timestamp | date:'short' }}
            </div>
          </div>
          <button 
            class="notification-close"
            (click)="notificationService.removeNotification(notification.id)"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      min-width: 300px;
    }

    .notification {
      display: flex;
      background: var(--panel);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      animation: slideInRight 0.3s ease-out;
      position: relative;
      overflow: hidden;
    }

    .notification::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    .notification-success::before {
      background: #10b981;
    }

    .notification-error::before {
      background: #ef4444;
    }

    .notification-warning::before {
      background: #f59e0b;
    }

    .notification-info::before {
      background: #3b82f6;
    }

    .notification-content {
      flex: 1;
      margin-left: 8px;
    }

    .notification-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .notification-icon {
      font-weight: bold;
      font-size: 16px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .notification-success .notification-icon {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .notification-error .notification-icon {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .notification-warning .notification-icon {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .notification-info .notification-icon {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .notification-title {
      font-weight: 600;
      color: var(--vol-appname-text);
      font-size: 14px;
      flex: 1;
    }

    .notification-action {
      font-size: 12px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .notification-message {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
      margin: 4px 0;
    }

    .notification-time {
      font-size: 11px;
      color: var(--muted);
      opacity: 0.7;
    }

    .notification-close {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      margin-left: 8px;
      align-self: flex-start;
    }

    .notification-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--vol-appname-text);
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
        min-width: auto;
      }

      .notification {
        margin-bottom: 8px;
        padding: 12px;
      }
    }
  `]
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
}
