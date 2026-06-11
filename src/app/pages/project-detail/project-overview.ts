import { Component, inject } from '@angular/core';
import { ProjectStateService } from '../../services/project-state.service';

@Component({
  selector: 'app-project-overview',
  template: `
    <div class="overview">
      <p class="lead">Select a department tab above to open that workspace.</p>

      <ul class="checklist" aria-label="Pipeline stages">
        @for (stage of state.pipeline(); track stage.id) {
          <li class="check-item" [class.done]="stage.status === 'completed'" [class.active]="stage.status === 'active'">
            <span class="check-icon" [attr.aria-label]="stage.status" aria-hidden="true">
              @if (stage.status === 'completed') {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              } @else if (stage.status === 'active') {
                <div class="dot"></div>
              } @else {
                <div class="lock"></div>
              }
            </span>
            <div class="item-info">
              <span class="item-label">{{ stage.label }}</span>
              <span class="item-status">{{ stageStatusLabel(stage.status) }}</span>
            </div>
            <span class="gate-pill" [class]="'gate-' + stage.gate">
              {{ stage.gate === 'hard' ? 'Hard Gate' : stage.gate === 'soft' ? 'Soft Gate' : 'No Gate' }}
            </span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .overview { max-width: 560px; }
    .lead { font-size: 13.5px; color: var(--color-text-secondary); margin: 0 0 20px; }

    .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .check-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
    }
    .check-item.done { border-color: rgba(34,197,94,0.2); background: rgba(34,197,94,0.04); }
    .check-item.active { border-color: var(--color-accent); background: var(--color-accent-light); }

    .check-icon {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      flex-shrink: 0;
      color: var(--color-text-muted);
    }
    .check-item.done .check-icon { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .check-item.active .check-icon { border-color: var(--color-accent); background: #fff; color: var(--color-accent); }

    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); }
    .lock { width: 8px; height: 8px; border-radius: 1px; background: var(--color-border-strong); }

    .item-info { display: flex; flex-direction: column; gap: 1px; flex: 1; }
    .item-label {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--color-text-muted);
    }
    .check-item.done .item-label,
    .check-item.active .item-label { color: var(--color-text); }
    .item-status { font-size: 11.5px; color: var(--color-text-muted); }
    .check-item.done .item-status { color: #16A34A; }
    .check-item.active .item-status { color: var(--color-accent); }

    .gate-pill {
      font-size: 10px; font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }
    .gate-hard { background: #FEE2E2; color: #DC2626; }
    .gate-soft { background: #FEF3C7; color: #D97706; }
    .gate-none { background: var(--color-accent-light); color: var(--color-accent); }
  `]
})
export class ProjectOverview {
  protected state = inject(ProjectStateService);

  protected stageStatusLabel(status: string): string {
    if (status === 'completed') return 'Approved ✓';
    if (status === 'active') return 'In Progress';
    return 'Locked';
  }
}
