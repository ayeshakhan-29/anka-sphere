import { Component, input } from '@angular/core';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

@Component({
  selector: 'ui-badge',
  template: `<span [class]="'badge variant-' + variant()"><ng-content /></span>`,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 20px;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .variant-default    { background: var(--color-primary);          color: var(--color-text-inverse); }
    .variant-secondary  { background: var(--color-surface-raised);   color: var(--color-text-secondary); border-color: var(--color-border); }
    /* Tinted variants: text darkened past the token for AA contrast at 11.5px */
    .variant-success    { background: var(--color-accent-light);     color: #065F46; }
    .variant-warning    { background: var(--color-warning-light);    color: #92400E; }
    .variant-destructive{ background: var(--color-destructive-light);color: #B91C1C; }
    .variant-info       { background: var(--color-info-light);       color: #1D4ED8; }
    .variant-outline    { background: transparent; color: var(--color-text-secondary); border-color: var(--color-border-strong); }

    :host-context(.dark) .variant-success    { background: rgb(16 185 129 / 0.16);  color: #6EE7B7; }
    :host-context(.dark) .variant-warning    { background: rgb(245 158 11 / 0.16);  color: #FCD34D; }
    :host-context(.dark) .variant-destructive{ background: rgb(239 68 68 / 0.16);   color: #FCA5A5; }
    :host-context(.dark) .variant-info       { background: rgb(59 130 246 / 0.16);  color: #93C5FD; }
  `]
})
export class Badge {
  variant = input<Variant>('default');
}
