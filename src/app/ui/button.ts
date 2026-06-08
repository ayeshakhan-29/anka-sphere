import { Component, input, output } from '@angular/core';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

@Component({
  selector: 'ui-button',
  template: `
    <button
      [class]="classes()"
      [disabled]="disabled()"
      [attr.type]="type()"
      [attr.aria-disabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  styles: [`
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      font-family: var(--font-sans);
      font-weight: 500;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
      white-space: nowrap;
      text-decoration: none;
    }
    button:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Sizes */
    .size-sm  { height: 32px; padding: 0 12px; font-size: 12.5px; }
    .size-md  { height: 38px; padding: 0 16px; font-size: 13.5px; }
    .size-lg  { height: 44px; padding: 0 22px; font-size: 14.5px; }
    .size-icon { width: 38px; height: 38px; padding: 0; }

    /* Variants */
    .variant-default {
      background: var(--color-primary);
      color: var(--color-text-inverse);
      border-color: var(--color-primary);
    }
    .variant-default:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    .variant-secondary {
      background: var(--color-surface-raised);
      color: var(--color-text);
      border-color: var(--color-border);
    }
    .variant-secondary:hover:not(:disabled) {
      background: var(--color-border);
    }

    .variant-outline {
      background: transparent;
      color: var(--color-text);
      border-color: var(--color-border-strong);
    }
    .variant-outline:hover:not(:disabled) {
      background: var(--color-surface-raised);
    }

    .variant-ghost {
      background: transparent;
      color: var(--color-text-secondary);
      border-color: transparent;
    }
    .variant-ghost:hover:not(:disabled) {
      background: var(--color-surface-raised);
      color: var(--color-text);
    }

    .variant-destructive {
      background: var(--color-destructive);
      color: #fff;
      border-color: var(--color-destructive);
    }
    .variant-destructive:hover:not(:disabled) {
      background: #DC2626;
    }

    .variant-link {
      background: transparent;
      color: var(--color-accent);
      border-color: transparent;
      padding-left: 0;
      padding-right: 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `]
})
export class Button {
  variant = input<Variant>('default');
  size = input<Size>('md');
  disabled = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  protected classes() {
    return `variant-${this.variant()} size-${this.size()}`;
  }
}
