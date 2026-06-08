import { Component } from '@angular/core';

@Component({
  selector: 'app-project-overview',
  template: `
    <div class="overview-placeholder">
      <p class="lead">Select a department tab above to review that module's work.</p>
      <ul class="checklist">
        <li class="check-item done">
          <span class="check-icon" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          Project Profiling — completed
        </li>
        <li class="check-item done">
          <span class="check-icon" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          Written Content — completed
        </li>
        <li class="check-item active">
          <span class="check-icon active" aria-hidden="true">
            <div class="dot"></div>
          </span>
          Design — in progress
        </li>
        <li class="check-item">
          <span class="check-icon" aria-hidden="true">
            <div class="lock"></div>
          </span>
          Development — locked
        </li>
        <li class="check-item">
          <span class="check-icon" aria-hidden="true">
            <div class="lock"></div>
          </span>
          Marketing — locked
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .overview-placeholder { max-width: 520px; }
    .lead { font-size: 13.5px; color: var(--color-text-secondary); margin: 0 0 20px; }
    .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .check-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: var(--color-text-muted);
    }
    .check-item.done { color: var(--color-text-secondary); }
    .check-item.active { color: var(--color-text); font-weight: 500; }
    .check-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface-raised);
      border: 1.5px solid var(--color-border);
      flex-shrink: 0;
      color: var(--color-text-muted);
    }
    .check-item.done .check-icon {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: #fff;
    }
    .check-item.active .check-icon {
      border-color: var(--color-accent);
      background: var(--color-accent-light);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); }
    .lock { width: 8px; height: 8px; border-radius: 1px; background: var(--color-border-strong); }
  `]
})
export class ProjectOverview {}
