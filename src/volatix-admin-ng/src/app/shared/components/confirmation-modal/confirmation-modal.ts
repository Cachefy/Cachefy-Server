import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.css',
})
export class ConfirmationModal {
  // Inputs
  isOpen = input<boolean>(false);
  config = input<ConfirmationConfig>({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
  });

  // Outputs
  confirm = output<void>();
  cancel = output<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  getIconColor(): string {
    const type = this.config().type || 'danger';
    switch (type) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      default:
        return '#ef4444';
    }
  }

  getConfirmButtonClass(): string {
    const type = this.config().type || 'danger';
    switch (type) {
      case 'danger':
        return 'btn danger btn-ripple';
      case 'warning':
        return 'btn warning btn-ripple';
      case 'info':
        return 'btn primary btn-ripple';
      case 'success':
        return 'btn success btn-ripple';
      default:
        return 'btn danger btn-ripple';
    }
  }
}
