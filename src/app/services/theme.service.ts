import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  // true = dark, false = light
  private darkMode = signal<boolean>(false);

  constructor() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === 'dark') {
      this.darkMode.set(true);
      this.applyClass(true);
    }
  }

  isDark() {
    return this.darkMode;
  }

  toggle() {
    const newVal = !this.darkMode();
    this.darkMode.set(newVal);
    const theme = newVal ? 'dark' : 'light';
    localStorage.setItem(this.storageKey, theme);
    this.applyClass(newVal);
  }

  private applyClass(dark: boolean) {
    if (dark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}
