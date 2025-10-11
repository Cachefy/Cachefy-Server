import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'memoiq-theme';

  isLight = signal<boolean>(false);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // Set default theme for SSR
      this.isLight.set(false);
      return;
    }

    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) {
      this.setTheme(saved === 'light');
    } else {
      // Check system preference
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(!prefersDark);
    }
  }

  setTheme(isLight: boolean): void {
    this.isLight.set(isLight);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (isLight) {
      this.document.documentElement.classList.add('light');
      localStorage.setItem(this.THEME_KEY, 'light');
    } else {
      this.document.documentElement.classList.remove('light');
      localStorage.setItem(this.THEME_KEY, 'dark');
    }
  }

  toggleTheme(): void {
    this.setTheme(!this.isLight());
  }
}
