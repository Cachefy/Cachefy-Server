import { Injectable, signal } from '@angular/core';
import { ConfirmationConfig } from '../../shared/components/confirmation-modal/confirmation-modal';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  private isOpen = signal(false);
  private config = signal<ConfirmationConfig>({
    title: 'Confirm Action',
    message: 'Are you sure?',
    type: 'danger',
  });

  private resolvePromise: ((value: boolean) => void) | null = null;

  // Public getters
  public readonly isConfirmationOpen = this.isOpen.asReadonly();
  public readonly confirmationConfig = this.config.asReadonly();

  /**
   * Show a confirmation dialog
   */
  confirm(config: Partial<ConfirmationConfig>): Promise<boolean> {
    this.config.set({
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'danger',
      ...config,
    });

    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /**
   * Show a delete confirmation dialog
   */
  confirmDelete(itemName?: string): Promise<boolean> {
    return this.confirm({
      title: 'Delete Confirmation',
      message: itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
  }

  /**
   * Show a warning confirmation dialog
   */
  confirmWarning(config: Partial<ConfirmationConfig>): Promise<boolean> {
    return this.confirm({
      type: 'warning',
      confirmText: 'Proceed',
      ...config,
    });
  }

  /**
   * Show an info confirmation dialog
   */
  confirmInfo(config: Partial<ConfirmationConfig>): Promise<boolean> {
    return this.confirm({
      type: 'info',
      confirmText: 'OK',
      ...config,
    });
  }

  /**
   * Handle confirmation
   */
  onConfirm(): void {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(true);
      this.resolvePromise = null;
    }
  }

  /**
   * Handle cancellation
   */
  onCancel(): void {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = null;
    }
  }
}
