import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  isUserMenuOpen = false;

  get isLight() {
    return this.themeService.isLight();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  viewUserDetails() {
    this.isUserMenuOpen = false;
    // TODO: Implement user details view
    console.log('View user details');
  }

  logOff() {
    this.isUserMenuOpen = false;
    this.authService.logout();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: Event) {
    this.isUserMenuOpen = false;
  }
}
