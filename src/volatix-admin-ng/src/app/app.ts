import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Topbar } from './shared/components/topbar/topbar';
import { Sidebar } from './shared/components/sidebar/sidebar';
import { Modal } from './shared/components/modal/modal';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Topbar, Sidebar, Modal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('volatix-admin-ng');

  constructor(protected authService: AuthService) {}

  get isAuthenticated() {
    return this.authService.isAuthenticated();
  }
}
