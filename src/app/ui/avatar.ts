import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-avatar',
  template: `
    <div class="avatar" [class]="'size-' + size()">
      <ng-content />
    </div>
  `,
  styles: [`
    .avatar {
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 2px solid var(--color-border);
      color: var(--color-text-secondary);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .size-sm  { width: 28px; height: 28px; font-size: 10px; }
    .size-md  { width: 36px; height: 36px; font-size: 12px; }
    .size-lg  { width: 44px; height: 44px; font-size: 15px; }
  `]
})
export class Avatar {
  size = input<'sm' | 'md' | 'lg'>('md');
}
