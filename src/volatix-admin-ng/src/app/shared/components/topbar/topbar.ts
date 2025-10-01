import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private themeService = inject(ThemeService);

  get isLight() {
    return this.themeService.isLight();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
