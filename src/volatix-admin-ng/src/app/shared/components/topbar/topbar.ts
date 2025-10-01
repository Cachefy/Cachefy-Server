import { Component, inject, HostListener } from '@angular/core';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private themeService = inject(ThemeService);
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
    // TODO: Implement logout functionality
    console.log('Log off user');
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: Event) {
    this.isUserMenuOpen = false;
  }
}
