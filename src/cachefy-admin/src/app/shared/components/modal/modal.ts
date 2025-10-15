import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  isOpen = input<boolean>(false);
  title = input<string>('Modal');
  closeOnBackdrop = input<boolean>(true); // New input to control backdrop click behavior

  closeModal = output<void>();

  onClose() {
    this.closeModal.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget && this.closeOnBackdrop()) {
      this.onClose();
    }
  }
}
