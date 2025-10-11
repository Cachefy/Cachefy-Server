import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Topbar } from './shared/components/topbar/topbar';
import { Sidebar } from './shared/components/sidebar/sidebar';
import { Modal } from './shared/components/modal/modal';
import { AuthService } from './core/services/auth.service';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { ConfirmationModal } from './shared/components/confirmation-modal/confirmation-modal';
import { ConfirmationService } from './core/services/confirmation.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    Topbar,
    Sidebar,
    Modal,
    NotificationComponent,
    ConfirmationModal,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('memoiq-admin');
  protected confirmationService = inject(ConfirmationService);

  constructor(protected authService: AuthService) {}

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }
}
