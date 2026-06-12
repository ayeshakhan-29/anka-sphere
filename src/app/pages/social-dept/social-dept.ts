import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

interface SocialProject {
  id: string; name: string; client: string; clientInitials: string;
  socialTasksDone: number; socialTasksTotal: number;
  completedAt?: string;
}

@Component({
  selector: 'app-social-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="sm-page">
      <div class="sm-header">
        <div class="sm-header-left">
          <div class="dept-badge">SM</div>
          <div>
            <h2 class="sm-title">Social Media</h2>
            <p class="sm-sub">Product Growth · Organic Social · {{ projects().length }} projects</p>
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
        <div class="project-grid" role="list">
          @for (p of displayed(); track p.id) {
            <article class="proj-card" role="listitem">
              <div class="proj-top">
                <div class="avatar">{{ p.clientInitials }}</div>
                <div class="proj-info">
                  <span class="proj-name">{{ p.name }}</span>
                  <span class="proj-client">{{ p.client }}</span>
                </div>
                @if (p.completedAt) {
                  <ui-badge variant="success">Complete</ui-badge>
                } @else {
                  <ui-badge variant="default">Active</ui-badge>
                }
              </div>
              <div class="proj-stat">
                <span class="stat-label">Social Tasks</span>
                <span class="stat-val">{{ p.socialTasksDone }}/{{ p.socialTasksTotal }}</span>
                @if (p.socialTasksTotal > 0) {
                  <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="pct(p)" aria-valuemin="0" aria-valuemax="100">
                    <div class="mini-fill" [style.width.%]="pct(p)"></div>
                  </div>
                }
              </div>
              <a class="proj-link" [routerLink]="['/app/projects', p.id, 'analytics']">Open →</a>
            </article>
          } @empty {
            <div class="empty">No projects in marketing stage.</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .sm-page { display: flex; flex-direction: column; gap: 14px; }
    .sm-header { display: flex; align-items: center; justify-content: space-between; }
    .sm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #EC4899; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .sm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .sm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-input { height: 34px; padding: 0 10px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #EC4899; }
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); }
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #EC4899; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .proj-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-card); }
    .proj-top { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .proj-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .proj-name { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .proj-client { font-size: 12px; color: var(--color-text-muted); }
    .proj-stat { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 11.5px; color: var(--color-text-muted); }
    .stat-val { font-size: 14px; font-weight: 700; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #EC4899; border-radius: 4px; }
    .proj-link { font-size: 13px; font-weight: 500; color: #EC4899; text-decoration: none; }
    .proj-link:hover { text-decoration: underline; }
    .empty { grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; }
  `]
})
export class SocialDept implements OnInit {
  private projectService = inject(ProjectService);
  protected search   = signal('');
  protected loading  = signal(true);
  protected projects = signal<SocialProject[]>([]);

  protected kpis = [
    { label: 'Active',        value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#EC4899', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2H3v16h5v4l4-4h9V2z"/></svg>` },
    { label: 'Completed',     value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Social Tasks',  value: computed(() => `${this.projects().reduce((s,p)=>s+p.socialTasksDone,0)}/${this.projects().reduce((s,p)=>s+p.socialTasksTotal,0)}`), bg: '#8B5CF6', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
    { label: 'Total Projects', value: computed(() => this.projects().length), bg: '#F97316', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
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

  private map(p: Project): SocialProject {
    const social = (p.marketing?.tasks ?? []).filter(t => t.category === 'SOCIAL');
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      socialTasksDone:  social.filter(t => t.status === 'DONE').length,
      socialTasksTotal: social.length,
      completedAt: p.marketing?.completedAt,
    };
  }

  protected pct(p: SocialProject) {
    return p.socialTasksTotal === 0 ? 0 : Math.round((p.socialTasksDone / p.socialTasksTotal) * 100);
  }
}
