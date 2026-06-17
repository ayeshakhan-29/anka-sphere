import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

type TabId = 'projects' | 'pipeline' | 'tasks';

interface CMProject {
  id: string; name: string; client: string; clientInitials: string;
  contentTasksDone: number; contentTasksTotal: number;
  pagesApproved: number; pagesTotal: number;
  completedAt?: string;
}

interface PipelinePage {
  pageId: string; projectId: string; projectName: string; client: string;
  title: string; slug: string; wordCount: number; status: string;
}

interface CMTask {
  id: string; title: string; status: string; priority: string;
  projectName: string; client: string; projectId: string;
}

@Component({
  selector: 'app-content-marketing-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="cm-page">

      <!-- Header -->
      <div class="cm-header">
        <div class="cm-header-left">
          <div class="dept-badge" aria-hidden="true">CM</div>
          <div>
            <h2 class="cm-title">Content Marketing</h2>
            <p class="cm-sub">Product Growth · Content pipeline · {{ projects().length }} projects</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Content marketing summary">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div><div class="kpi-val">{{ k.value() }}</div><div class="kpi-lbl">{{ k.label }}</div></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Content marketing sections">
        @for (t of tabs; track t.id) {
          <button role="tab" class="tab-btn" [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id" (click)="activeTab.set(t.id)">
            {{ t.label }}
            @if (t.count() > 0) { <span class="tab-count">{{ t.count() }}</span> }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading…</div>
      } @else {

        <!-- Projects tab -->
        @if (activeTab() === 'projects') {
          <div class="list-header" aria-hidden="true">
            <span>Project / Client</span><span>Content Tasks</span><span>Pages Approved</span><span>Status</span><span></span>
          </div>
          <div class="proj-list" role="list" aria-label="Content marketing projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="prow" role="listitem">
                <div class="prow-id">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div><span class="prow-name">{{ p.name }}</span><span class="prow-client">{{ p.client }}</span></div>
                </div>
                <div class="tasks-cell">
                  <span class="tasks-num">{{ p.contentTasksDone }}/{{ p.contentTasksTotal }}</span>
                  @if (p.contentTasksTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="pct(p.contentTasksDone, p.contentTasksTotal)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill" [style.width.%]="pct(p.contentTasksDone, p.contentTasksTotal)"></div>
                    </div>
                  }
                </div>
                <div class="pages-cell">
                  <span class="tasks-num">{{ p.pagesApproved }}/{{ p.pagesTotal }}</span>
                  @if (p.pagesTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="pct(p.pagesApproved, p.pagesTotal)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill pages" [style.width.%]="pct(p.pagesApproved, p.pagesTotal)"></div>
                    </div>
                  }
                </div>
                <div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="default">Active</ui-badge> }
                </div>
                <a class="btn-open" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open</a>
              </article>
            } @empty {
              <div class="empty-state">No projects in content marketing yet.</div>
            }
          </div>
        }

        <!-- Content Pipeline tab -->
        @if (activeTab() === 'pipeline') {
          <div class="filter-row" role="group" aria-label="Filter by page status">
            @for (f of pageFilters; track f.value) {
              <button class="ftab" [class.active]="pageFilter() === f.value" (click)="pageFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="pipe-header" aria-hidden="true">
            <span>Page</span><span>Project</span><span>Word Count</span><span>Status</span>
          </div>
          <div class="pipe-list" role="list" aria-label="Content pipeline">
            @for (page of displayedPages(); track page.pageId) {
              <div class="pipe-row" role="listitem">
                <div class="pipe-page">
                  <span class="pipe-title">{{ page.title }}</span>
                  @if (page.slug) { <span class="pipe-slug">/{{ page.slug }}</span> }
                </div>
                <div class="pipe-proj">
                  <span class="pipe-proj-name">{{ page.projectName }}</span>
                  <span class="pipe-proj-client">{{ page.client }}</span>
                </div>
                <div class="pipe-words">{{ page.wordCount > 0 ? page.wordCount.toLocaleString() : '—' }}</div>
                <div>
                  @if (page.status === 'APPROVED') { <ui-badge variant="success">Approved</ui-badge> }
                  @else if (page.status === 'IN_REVIEW') { <ui-badge variant="info">In Review</ui-badge> }
                  @else { <ui-badge variant="default">Draft</ui-badge> }
                </div>
              </div>
            } @empty {
              <div class="empty-state">No content pages found. Pages appear once Written Content is underway.</div>
            }
          </div>
        }

        <!-- Tasks tab -->
        @if (activeTab() === 'tasks') {
          <div class="filter-row" role="group" aria-label="Filter by task status">
            @for (f of taskFilters; track f.value) {
              <button class="ftab" [class.active]="taskStatusFilter() === f.value" (click)="taskStatusFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="task-header" aria-hidden="true">
            <span>Task</span><span>Project</span><span>Priority</span><span>Status</span>
          </div>
          <div class="task-list" role="list" aria-label="Content marketing tasks">
            @for (t of displayedTasks(); track t.id) {
              <div class="task-row" role="listitem">
                <span class="task-title">{{ t.title }}</span>
                <div class="task-proj">
                  <span class="tp-name">{{ t.projectName }}</span>
                  <span class="tp-client">{{ t.client }}</span>
                </div>
                <span class="task-priority" [attr.data-p]="t.priority">{{ t.priority }}</span>
                <span class="task-status" [attr.data-s]="t.status">{{ statusLabel(t.status) }}</span>
              </div>
            } @empty {
              <div class="empty-state">No content tasks yet. Add CONTENT-category tasks in the Marketing workspace.</div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .cm-page { display: flex; flex-direction: column; gap: 16px; }
    .cm-header { display: flex; align-items: center; justify-content: space-between; }
    .cm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #F59E0B; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .cm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .cm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #F59E0B; }

    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #F59E0B; border-bottom-color: #F59E0B; }
    .tab-count { background: #FEF3C7; color: #D97706; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #F59E0B; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .filter-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .ftab { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .ftab:hover { border-color: #F59E0B; color: #D97706; }
    .ftab.active { background: #F59E0B; color: #fff; border-color: #F59E0B; }
    .ftab-count { font-size: 10.5px; font-weight: 700; }

    .list-header { display: grid; grid-template-columns: 1fr 140px 140px 100px 80px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .proj-list { display: flex; flex-direction: column; gap: 6px; }
    .prow { display: grid; grid-template-columns: 1fr 140px 140px 100px 80px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .prow:hover { box-shadow: var(--shadow-raised); }
    .prow-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .prow-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prow-client { display: block; font-size: 11.5px; color: var(--color-text-muted); }
    .tasks-cell, .pages-cell { display: flex; flex-direction: column; gap: 4px; }
    .tasks-num { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #F59E0B; border-radius: 4px; }
    .mini-fill.pages { background: #6366F1; }
    .btn-open { height: 28px; padding: 0 10px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center; transition: background 0.12s; }
    .btn-open:hover { background: var(--color-border); color: var(--color-text); }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    .pipe-header { display: grid; grid-template-columns: 1fr 200px 100px 110px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .pipe-list { display: flex; flex-direction: column; gap: 6px; }
    .pipe-row { display: grid; grid-template-columns: 1fr 200px 100px 110px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .pipe-page { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pipe-title { font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pipe-slug { font-size: 11.5px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .pipe-proj { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pipe-proj-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pipe-proj-client { font-size: 11px; color: var(--color-text-muted); }
    .pipe-words { font-size: 13px; font-weight: 600; color: var(--color-text); }

    .task-header { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .task-list { display: flex; flex-direction: column; gap: 6px; }
    .task-row { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .task-proj { display: flex; flex-direction: column; gap: 2px; }
    .tp-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); }
    .tp-client { font-size: 11px; color: var(--color-text-muted); }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEE2E2; color: #DC2626; }
    .task-priority[data-p="MEDIUM"] { background: #FEF3C7; color: #D97706; }
    .task-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-status[data-s="DONE"] { background: #ECFDF5; color: #059669; }
    .task-status[data-s="IN_PROGRESS"] { background: #EFF6FF; color: #2563EB; }
    .task-status[data-s="IN_REVIEW"] { background: #FEF3C7; color: #D97706; }
  `]
})
export class ContentMarketingDept implements OnInit {
  private projectService = inject(ProjectService);
  protected search            = signal('');
  protected activeTab         = signal<TabId>('projects');
  protected pageFilter        = signal<'all' | 'APPROVED' | 'IN_REVIEW' | 'DRAFT'>('all');
  protected taskStatusFilter  = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading           = signal(true);
  protected projects          = signal<CMProject[]>([]);
  protected allPages          = signal<PipelinePage[]>([]);
  protected allTasks          = signal<CMTask[]>([]);

  readonly tabs = [
    { id: 'projects'  as TabId, label: 'Projects',          count: computed(() => this.projects().length) },
    { id: 'pipeline'  as TabId, label: 'Content Pipeline',  count: computed(() => this.allPages().length) },
    { id: 'tasks'     as TabId, label: 'Tasks',             count: computed(() => this.allTasks().length) },
  ];

  readonly pageFilters = [
    { label: 'All',       value: 'all'       as const, count: computed(() => this.allPages().length) },
    { label: 'Approved',  value: 'APPROVED'  as const, count: computed(() => this.allPages().filter(p => p.status === 'APPROVED').length) },
    { label: 'In Review', value: 'IN_REVIEW' as const, count: computed(() => this.allPages().filter(p => p.status === 'IN_REVIEW').length) },
    { label: 'Draft',     value: 'DRAFT'     as const, count: computed(() => this.allPages().filter(p => p.status === 'DRAFT').length) },
  ];

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    { label: 'Active',         value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
    { label: 'Completed',      value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Content Tasks',  value: computed(() => `${this.projects().reduce((s,p)=>s+p.contentTasksDone,0)}/${this.projects().reduce((s,p)=>s+p.contentTasksTotal,0)}`), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>` },
    { label: 'Pages Approved', value: computed(() => `${this.allPages().filter(p=>p.status==='APPROVED').length}/${this.allPages().length}`), bg: '#F97316', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
  ];

  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  });

  protected displayedPages = computed(() => {
    const f = this.pageFilter();
    const q = this.search().toLowerCase();
    return this.allPages().filter(p =>
      (f === 'all' || p.status === f) &&
      (!q || p.title.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q))
    );
  });

  protected displayedTasks = computed(() => {
    const f = this.taskStatusFilter();
    const q = this.search().toLowerCase();
    return this.allTasks().filter(t =>
      (f === 'all' || t.status === f) &&
      (!q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const active = projects.filter(p => p.currentStage === 'MARKETING' || !!p.marketing);
        this.projects.set(active.map(p => this.mapProject(p)));

        const pages: PipelinePage[] = [];
        const tasks: CMTask[] = [];
        for (const p of active) {
          for (const pg of p.content?.pages ?? []) {
            pages.push({ pageId: pg.id, projectId: p.id, projectName: p.name, client: p.clientName, title: pg.title, slug: pg.slug ?? '', wordCount: pg.wordCount ?? 0, status: pg.status });
          }
          for (const t of (p.marketing?.tasks ?? []).filter(t => t.category === 'CONTENT')) {
            tasks.push({ id: t.id, title: t.title, status: t.status, priority: t.priority ?? 'MEDIUM', projectName: p.name, client: p.clientName, projectId: p.id });
          }
        }
        this.allPages.set(pages);
        this.allTasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): CMProject {
    const mktTasks = (p.marketing?.tasks ?? []).filter(t => t.category === 'CONTENT');
    const pages = p.content?.pages ?? [];
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      contentTasksDone:  mktTasks.filter(t => t.status === 'DONE').length,
      contentTasksTotal: mktTasks.length,
      pagesApproved: pages.filter(pg => pg.status === 'APPROVED').length,
      pagesTotal:    pages.length,
      completedAt: p.marketing?.completedAt,
    };
  }

  protected pct(done: number, total: number): number {
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  protected statusLabel(s: string): string {
    if (s === 'IN_PROGRESS') return 'In Progress';
    if (s === 'IN_REVIEW') return 'In Review';
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
}
