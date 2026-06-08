import { Component } from '@angular/core';

@Component({
  selector: 'ui-card',
  template: `<div class="card"><ng-content /></div>`,
  styles: [`
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
    }
  `]
})
export class Card {}

@Component({
  selector: 'ui-card-header',
  template: `<div class="card-header"><ng-content /></div>`,
  styles: [`.card-header { padding: 20px 24px 0; display: flex; flex-direction: column; gap: 4px; }`]
})
export class CardHeader {}

@Component({
  selector: 'ui-card-title',
  template: `<h3 class="card-title"><ng-content /></h3>`,
  styles: [`.card-title { font-family: var(--font-display); font-size: 16px; font-weight: 400; color: var(--color-text); margin: 0; }`]
})
export class CardTitle {}

@Component({
  selector: 'ui-card-description',
  template: `<p class="card-desc"><ng-content /></p>`,
  styles: [`.card-desc { font-size: 13px; color: var(--color-text-secondary); margin: 0; }`]
})
export class CardDescription {}

@Component({
  selector: 'ui-card-content',
  template: `<div class="card-content"><ng-content /></div>`,
  styles: [`.card-content { padding: 20px 24px; }`]
})
export class CardContent {}

@Component({
  selector: 'ui-card-footer',
  template: `<div class="card-footer"><ng-content /></div>`,
  styles: [`.card-footer { padding: 0 24px 20px; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--color-border); padding-top: 16px; margin-top: 4px; }`]
})
export class CardFooter {}
