import { Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  template: `
    <div class="placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M9 12h6M12 9v6"/>
      </svg>
      <p class="title">Coming Soon</p>
      <p class="sub">This module is being built.</p>
    </div>
  `,
  styles: [`
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 12px;
      color: var(--color-text-muted);
    }
    .title { font-size: 16px; font-weight: 600; margin: 0; color: var(--color-text-secondary); }
    .sub { font-size: 13px; margin: 0; }
  `]
})
export class Placeholder {}
