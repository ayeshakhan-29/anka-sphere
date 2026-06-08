import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-input',
  imports: [FormsModule],
  template: `
    <input
      class="input"
      [class.has-error]="error()"
      [type]="type()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [attr.id]="inputId()"
      [attr.autocomplete]="autocomplete()"
      [(ngModel)]="value"
    />
  `,
  styles: [`
    .input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input::placeholder { color: var(--color-text-muted); }
    .input:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
    }
    .input:disabled { opacity: 0.5; cursor: not-allowed; background: var(--color-surface-raised); }
    .input.has-error { border-color: var(--color-destructive); }
    .input.has-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
  `]
})
export class Input {
  type = input<string>('text');
  placeholder = input('');
  disabled = input(false);
  error = input(false);
  inputId = input<string | null>(null);
  autocomplete = input<string | null>(null);
  value = model('');
}

@Component({
  selector: 'ui-label',
  template: `<label [attr.for]="forId()" class="label"><ng-content /></label>`,
  styles: [`.label { font-size: 13px; font-weight: 500; color: var(--color-text); display: block; margin-bottom: 6px; }`]
})
export class Label {
  forId = input<string | null>(null);
}

@Component({
  selector: 'ui-separator',
  template: `<hr class="sep" [class.vertical]="orientation() === 'vertical'" />`,
  styles: [`
    .sep { border: none; border-top: 1px solid var(--color-border); margin: 0; }
    .sep.vertical { border-top: none; border-left: 1px solid var(--color-border); height: 100%; }
  `]
})
export class Separator {
  orientation = input<'horizontal' | 'vertical'>('horizontal');
}
