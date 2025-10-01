import { Injectable, signal } from '@angular/core';

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = signal<NotificationMessage[]>([]);

  getNotifications = this.notifications.asReadonly();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message: string, action?: string, autoClose = true, duration = 5000) {
    this.addNotification({
      type: 'success',
      title,
      message,
      action,
      autoClose,
      duration
    });
  }

  /**
   * Show an error notification
   */
  showError(title: string, message: string, action?: string, autoClose = false) {
    this.addNotification({
      type: 'error',
      title,
      message,
      action,
      autoClose
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message: string, action?: string, autoClose = true, duration = 7000) {
    this.addNotification({
      type: 'warning',
      title,
      message,
      action,
      autoClose,
      duration
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message: string, action?: string, autoClose = true, duration = 5000) {
    this.addNotification({
      type: 'info',
      title,
      message,
      action,
      autoClose,
      duration
    });
  }

  private addNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp'>) {
    const newNotification: NotificationMessage = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.notifications.update(notifications => [...notifications, newNotification]);

    // Auto close if enabled
    if (notification.autoClose) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }
  }

  /**
   * Remove a specific notification
   */
  removeNotification(id: string) {
    this.notifications.update(notifications => 
      notifications.filter(notification => notification.id !== id)
    );
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.set([]);
  }

  /**
   * CRUD Operation helpers
   */
  showCreateSuccess(entityName: string) {
    this.showSuccess(
      'Created Successfully',
      `${entityName} has been created successfully.`,
      'Created'
    );
  }

  showUpdateSuccess(entityName: string) {
    this.showSuccess(
      'Updated Successfully', 
      `${entityName} has been updated successfully.`,
      'Updated'
    );
  }

  showDeleteSuccess(entityName: string) {
    this.showSuccess(
      'Deleted Successfully',
      `${entityName} has been deleted successfully.`,
      'Deleted'
    );
  }

  showCreateError(entityName: string, error?: string) {
    this.showError(
      'Creation Failed',
      `Failed to create ${entityName}. ${error || 'Please try again.'}`,
      'Create Failed'
    );
  }

  showUpdateError(entityName: string, error?: string) {
    this.showError(
      'Update Failed',
      `Failed to update ${entityName}. ${error || 'Please try again.'}`,
      'Update Failed'
    );
  }

  showDeleteError(entityName: string, error?: string) {
    this.showError(
      'Delete Failed',
      `Failed to delete ${entityName}. ${error || 'Please try again.'}`,
      'Delete Failed'
    );
  }
}
