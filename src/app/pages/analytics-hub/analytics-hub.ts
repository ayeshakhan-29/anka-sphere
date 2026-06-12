import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

interface AnalyticsProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  stage: string;
  daysInMarketing: number;
  tasksDone: number;
  tasksTotal: number;
  hasStrategy: boolean;
  hasChannels: boolean;
  completedAt?: string;
  lastUpdated: string;
}

@Component({
  selector: 'app-analytics-hub',
  imports: [RouterLink, Badge],
  template: `
    <div class="ah-page">

      <div class="ah-header">
        <div class="ah-header-left">
          <div class="dept-badge" aria-hidden="true">AH</div>
          <div>
            <h2 class="ah-title">Analytics Hub</h2>
            <p class="ah-sub">Product Growth · Stage 5 · {{ projects().length }} projects in marketing</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="search-input" type="search" placeholder="Search projects…" aria-label="Search projects"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Analytics summary">
        @for (kpi of kpis; track kpi.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="kpi.bg" aria-hidden="true" [innerHTML]="kpi.icon"></div>
            <div>
              <div class="kpi-value">{{ kpi.value() }}</div>
              <div class="kpi-label">{{ kpi.label }}</div>
            </div>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading…</div>
      } @else {
        <div class="project-grid" role="list" aria-label="Marketing stage projects">
          @for (p of displayed(); track p.id) {
            <article class="proj-card" role="listitem">
              <div class="proj-top">
                <div class="client-avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                <div class="proj-info">
                  <span class="proj-name">{{ p.name }}</span>
                  <span class="proj-client">{{ p.client }}</span>
                </div>
                @if (p.completedAt) {
                  <ui-badge variant="success">Complete</ui-badge>
                } @else {
                  <ui-badge variant="info">In Marketing</ui-badge>
                }
              </div>

              <div class="proj-metrics">
                <div class="metric">
                  <span class="metric-val">{{ p.daysInMarketing }}</span>
                  <span class="metric-lbl">Days active</span>
                </div>
                <div class="metric">
                  <span class="metric-val">{{ p.tasksDone }}/{{ p.tasksTotal }}</span>
                  <span class="metric-lbl">Tasks done</span>
                </div>
                <div class="metric">
                  <span class="metric-val" [class.yes]="p.hasStrategy">{{ p.hasStrategy ? 'Yes' : 'No' }}</span>
                  <span class="metric-lbl">Strategy set</span>
                </div>
              </div>

              @if (p.tasksTotal > 0) {
                <div class="progress-bar" role="progressbar" [attr.aria-valuenow]="taskPct(p)" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-fill" [style.width.%]="taskPct(p)"></div>
                </div>
                <span class="progress-label">{{ taskPct(p) }}% tasks complete</span>
              }

              <a class="proj-link" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">
                Open project →
              </a>
            </article>
          } @empty {
            <div class="empty-state">
              <p>No projects currently in the Marketing stage.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ah-page { display: flex; flex-direction: column; gap: 16px; }
    .ah-header { display: flex; align-items: center; justify-content: space-between; }
    .ah-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #6366F1; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .ah-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .ah-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 220px; }
    .search-input:focus { border-color: #6366F1; }
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-value { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-label { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; justify-content: center; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .proj-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-card); }
    .proj-top { display: flex; align-items: center; gap: 10px; }
    .client-avatar { width: 34px; height: 34px; min-width: 34px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .proj-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .proj-name { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .proj-client { font-size: 12px; color: var(--color-text-muted); }
    .proj-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; background: var(--color-surface-raised); border-radius: var(--radius-md); }
    .metric-val { font-size: 15px; font-weight: 700; color: var(--color-text); }
    .metric-val.yes { color: #10B981; }
    .metric-lbl { font-size: 10.5px; color: var(--color-text-muted); text-align: center; }
    .progress-bar { width: 100%; height: 5px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #6366F1; border-radius: 4px; transition: width 0.3s; }
    .progress-label { font-size: 11px; color: var(--color-text-muted); }
    .proj-link { font-size: 13px; font-weight: 500; color: #6366F1; text-decoration: none; margin-top: auto; }
    .proj-link:hover { text-decoration: underline; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; }
  `]
})
export class AnalyticsHub implements OnInit {
  private projectService = inject(ProjectService);
  protected search   = signal('');
  protected loading  = signal(true);
  protected projects = signal<AnalyticsProject[]>([]);

  protected kpis = [
    { label: 'In Marketing', value: computed(() => this.projects().length), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` },
    { label: 'Completed',    value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Strategy Set', value: computed(() => this.projects().filter(p => p.hasStrategy).length), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
    { label: 'Tasks Done',   value: computed(() => `${this.projects().reduce((s,p)=>s+p.tasksDone,0)}/${this.projects().reduce((s,p)=>s+p.tasksTotal,0)}`), bg: '#F97316', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
  ];

  protected displayed = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects.filter(p => p.currentStage === 'MARKETING' || p.marketing).map(p => this.map(p)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private map(p: Project): AnalyticsProject {
    const entry = p.pipeline.find(e => e.stage === 'MARKETING');
    const daysInMarketing = entry?.startedAt ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 86400000) : 0;
    const tasks = p.marketing?.tasks ?? [];
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      stage: p.currentStage,
      daysInMarketing,
      tasksDone:  tasks.filter(t => t.status === 'DONE').length,
      tasksTotal: tasks.length,
      hasStrategy: !!(p.marketing?.strategy || p.marketing?.channels),
      hasChannels: !!(p.marketing?.channels),
      completedAt: p.marketing?.completedAt,
      lastUpdated: p.updatedAt,
    };
  }

  protected taskPct(p: AnalyticsProject): number {
    return p.tasksTotal === 0 ? 0 : Math.round((p.tasksDone / p.tasksTotal) * 100);
  }
}
