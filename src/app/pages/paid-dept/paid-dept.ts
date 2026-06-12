import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

interface PaidProject {
  id: string; name: string; client: string; clientInitials: string;
  budget?: string; paidTasksDone: number; paidTasksTotal: number;
  completedAt?: string;
}

@Component({
  selector: 'app-paid-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="pm-page">
      <div class="pm-header">
        <div class="pm-header-left">
          <div class="dept-badge">PM</div>
          <div>
            <h2 class="pm-title">Paid Marketing</h2>
            <p class="pm-sub">Product Growth · Paid campaigns · {{ projects().length }} projects</p>
          </div>
        </div>
        <input class="search-input" type="search" placeholder="Search…" aria-label="Search" [value]="search()" (input)="search.set($any($event.target).value)" />
      </div>

      <div class="kpi-strip" role="list">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div><div class="kpi-val">{{ k.value() }}</div><div class="kpi-lbl">{{ k.label }}</div></div>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="loading-state" role="status"><div class="spinner"></div>Loading…</div>
      } @else {
        <div class="list-header" aria-hidden="true">
          <span>Project / Client</span><span>Budget</span><span>Paid Tasks</span><span>Status</span><span></span>
        </div>
        <div class="proj-list" role="list">
          @for (p of displayed(); track p.id) {
            <article class="prow" role="listitem">
              <div class="prow-id">
                <div class="avatar">{{ p.clientInitials }}</div>
                <div><span class="prow-name">{{ p.name }}</span><span class="prow-client">{{ p.client }}</span></div>
              </div>
              <div class="budget-cell">{{ p.budget || '—' }}</div>
              <div class="tasks-cell">
                <span>{{ p.paidTasksDone }}/{{ p.paidTasksTotal }}</span>
                @if (p.paidTasksTotal > 0) {
                  <div class="mini-bar"><div class="mini-fill" [style.width.%]="pct(p)"></div></div>
                }
              </div>
              <div>
                @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                @else { <ui-badge variant="default">Active</ui-badge> }
              </div>
              <a class="btn-open" [routerLink]="['/app/projects', p.id, 'analytics']">Open</a>
            </article>
          } @empty {
            <div class="empty">No projects in marketing.</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pm-page { display: flex; flex-direction: column; gap: 14px; }
    .pm-header { display: flex; align-items: center; justify-content: space-between; }
    .pm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #EF4444; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .pm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .pm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-input { height: 34px; padding: 0 10px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #EF4444; }
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); }
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #EF4444; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .list-header { display: grid; grid-template-columns: 1fr 120px 140px 100px 80px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .proj-list { display: flex; flex-direction: column; gap: 6px; }
    .prow { display: grid; grid-template-columns: 1fr 120px 140px 100px 80px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .prow-id { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .prow-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-text); }
    .prow-client { display: block; font-size: 11.5px; color: var(--color-text-muted); }
    .budget-cell { font-size: 13px; color: var(--color-text-secondary); }
    .tasks-cell { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #EF4444; border-radius: 4px; }
    .btn-open { height: 28px; padding: 0 10px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center; }
    .btn-open:hover { color: var(--color-text); }
    .empty { text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; }
  `]
})
export class PaidDept implements OnInit {
  private projectService = inject(ProjectService);
  protected search   = signal('');
  protected loading  = signal(true);
  protected projects = signal<PaidProject[]>([]);

  protected kpis = [
    { label: 'Active',       value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#EF4444', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 010 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>` },
    { label: 'Completed',    value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Paid Tasks',   value: computed(() => `${this.projects().reduce((s,p)=>s+p.paidTasksDone,0)}/${this.projects().reduce((s,p)=>s+p.paidTasksTotal,0)}`), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
    { label: 'Total',        value: computed(() => this.projects().length), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
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

  private map(p: Project): PaidProject {
    const paid = (p.marketing?.tasks ?? []).filter(t => t.category === 'PAID');
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      budget: p.marketing?.budget,
      paidTasksDone:  paid.filter(t => t.status === 'DONE').length,
      paidTasksTotal: paid.length,
      completedAt: p.marketing?.completedAt,
    };
  }

  protected pct(p: PaidProject) {
    return p.paidTasksTotal === 0 ? 0 : Math.round((p.paidTasksDone / p.paidTasksTotal) * 100);
  }
}
