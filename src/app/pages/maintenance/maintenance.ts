import { Component, inject, signal, OnInit } from '@angular/core';
import { MaintenanceService } from '../../services/maintenance.service';
import { NotificationService } from '../../services/notification.service';
import { Maintenance } from '../../models/project.models';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../ui';
import { Button } from '../../ui';
import { Badge } from '../../ui';

@Component({
  selector: 'app-maintenance',
  imports: [Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge],
  template: `
    <div class="page">
      <header class="page-header">
        <h1 class="page-title">Maintenance</h1>
        <p class="page-desc">System status, backups, and performance monitoring</p>
      </header>

      <div class="grid">
        <!-- Uptime Status -->
        <ui-card>
          <ui-card-header>
            <ui-card-title>Uptime Status</ui-card-title>
            <ui-card-description>Current system availability</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="status-row">
              <span class="status-label">Status</span>
              <ui-badge [variant]="badgeVariant()">{{ record()?.uptimeStatus ?? 'OPERATIONAL' }}</ui-badge>
            </div>
          </ui-card-content>
          <ui-card-footer>
            <ui-button variant="secondary" size="sm" (click)="setUptime('OPERATIONAL')">Set Operational</ui-button>
            <ui-button variant="secondary" size="sm" (click)="setUptime('DEGRADED')">Set Degraded</ui-button>
            <ui-button variant="destructive" size="sm" (click)="setUptime('DOWN')">Set Down</ui-button>
          </ui-card-footer>
        </ui-card>

        <!-- Backup -->
        <ui-card>
          <ui-card-header>
            <ui-card-title>Backup</ui-card-title>
            <ui-card-description>Trigger a manual system backup</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <ui-button [disabled]="backuping()" (click)="triggerBackup()">
              @if (backuping()) { Running... } @else { Run Backup }
            </ui-button>
          </ui-card-content>
          @if (lastBackup()) {
            <ui-card-footer>
              <span class="log-line">{{ lastBackup() }}</span>
            </ui-card-footer>
          }
        </ui-card>

        <!-- Performance Note -->
        <ui-card>
          <ui-card-header>
            <ui-card-title>Performance Note</ui-card-title>
            <ui-card-description>Record a performance observation</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <textarea
              class="textarea"
              placeholder="e.g. Response time increased after deploy..."
              [value]="noteText()"
              (input)="noteText.set(($any($event.target)).value)"
              rows="3"
            ></textarea>
          </ui-card-content>
          <ui-card-footer>
            <ui-button [disabled]="!noteText().trim() || noting()" (click)="addNote()">
              @if (noting()) { Saving... } @else { Save Note }
            </ui-button>
          </ui-card-footer>
        </ui-card>
      </div>

      <!-- Logs -->
      <ui-card class="logs-card">
        <ui-card-header>
          <ui-card-title>Backup Log</ui-card-title>
        </ui-card-header>
        <ui-card-content>
          @if (backupLogs().length === 0) {
            <p class="empty">No backups recorded yet.</p>
          }
          @for (line of backupLogs(); track line) {
            <div class="log-line">{{ line }}</div>
          }
        </ui-card-content>
      </ui-card>

      <ui-card>
        <ui-card-header>
          <ui-card-title>Performance Notes</ui-card-title>
        </ui-card-header>
        <ui-card-content>
          @if (perfNotes().length === 0) {
            <p class="empty">No performance notes recorded yet.</p>
          }
          @for (note of perfNotes(); track note) {
            <div class="log-line">{{ note }}</div>
          }
        </ui-card-content>
      </ui-card>
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .page-header { margin-bottom: 4px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0; }
    .page-desc { font-size: 13px; color: var(--color-text-secondary); margin: 4px 0 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .status-row { display: flex; align-items: center; justify-content: space-between; }
    .status-label { font-size: 13.5px; color: var(--color-text-secondary); }
    .textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      resize: vertical;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .textarea:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
    }
    .textarea::placeholder { color: var(--color-text-muted); }
    .log-line {
      font-size: 12.5px;
      font-family: var(--font-mono, monospace);
      color: var(--color-text-secondary);
      padding: 4px 0;
      border-bottom: 1px solid var(--color-border);
      line-height: 1.5;
    }
    .log-line:last-child { border-bottom: none; }
    .logs-card { overflow: hidden; }
    .empty { font-size: 13px; color: var(--color-text-muted); margin: 8px 0; }
  `],
})
export class MaintenancePage implements OnInit {
  private svc = inject(MaintenanceService);
  private notif = inject(NotificationService);

  record = signal<Maintenance | null>(null);
  backuping = signal(false);
  noting = signal(false);
  noteText = signal('');

  badgeVariant = () => {
    const s = this.record()?.uptimeStatus;
    if (s === 'OPERATIONAL') return 'success' as const;
    if (s === 'DEGRADED') return 'warning' as const;
    return 'destructive' as const;
  };

  backupLogs = () => {
    const log = this.record()?.backupLog ?? '';
    return log ? log.split('\n').filter(Boolean) : [];
  };

  perfNotes = () => {
    const notes = this.record()?.performanceNotes ?? '';
    return notes ? notes.split('\n').filter(Boolean) : [];
  };

  lastBackup = () => {
    const logs = this.backupLogs();
    return logs.length > 0 ? logs[logs.length - 1] : null;
  };

  ngOnInit() {
    this.load();
  }

  private load() {
    this.svc.getStatus().subscribe({
      next: (r) => this.record.set(r),
      error: () => this.notif.toast('Failed to load maintenance status', 'warning'),
    });
  }

  setUptime(status: string) {
    this.svc.updateUptime(status).subscribe({
      next: (r) => {
        this.record.set(r);
        this.notif.toast(`Uptime set to ${status}`, 'success');
      },
      error: () => this.notif.toast('Failed to update uptime', 'warning'),
    });
  }

  triggerBackup() {
    this.backuping.set(true);
    this.svc.triggerBackup().subscribe({
      next: (r) => {
        this.record.update((v) => v ? { ...v, backupLog: r.backupLog } : v);
        this.backuping.set(false);
        this.notif.toast('Backup completed', 'success');
      },
      error: () => {
        this.backuping.set(false);
        this.notif.toast('Backup failed', 'warning');
      },
    });
  }

  addNote() {
    const msg = this.noteText().trim();
    if (!msg) return;
    this.noting.set(true);
    this.svc.addPerfNote(msg).subscribe({
      next: (r) => {
        this.record.update((v) => v ? { ...v, performanceNotes: r.performanceNotes } : v);
        this.noteText.set('');
        this.noting.set(false);
        this.notif.toast('Performance note saved', 'success');
      },
      error: () => {
        this.noting.set(false);
        this.notif.toast('Failed to save note', 'warning');
      },
    });
  }
}
