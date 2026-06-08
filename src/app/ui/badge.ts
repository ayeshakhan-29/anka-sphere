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
    .variant-success    { background: var(--color-accent-light);     color: var(--color-accent); }
    .variant-warning    { background: var(--color-warning-light);    color: var(--color-warning); }
    .variant-destructive{ background: var(--color-destructive-light);color: var(--color-destructive); }
    .variant-info       { background: var(--color-info-light);       color: var(--color-info); }
    .variant-outline    { background: transparent; color: var(--color-text-secondary); border-color: var(--color-border-strong); }
  `]
})
export class Badge {
  variant = input<Variant>('default');
}
