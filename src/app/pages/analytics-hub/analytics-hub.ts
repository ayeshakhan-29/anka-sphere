import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

type TabId = 'projects' | 'pipeline' | 'tasks';

const STAGES = ['PROFILING', 'WRITTEN_CONTENT', 'DESIGN', 'DEVELOPMENT', 'MARKETING'] as const;
const STAGE_LABELS: Record<string, string> = {
  PROFILING: 'Profiling', WRITTEN_CONTENT: 'Written Content',
  DESIGN: 'Design', DEVELOPMENT: 'Development', MARKETING: 'Marketing',
};
const TASK_CATEGORIES = ['SEO', 'CONTENT', 'SOCIAL', 'PAID', 'ANALYTICS', 'OTHER'] as const;
const CAT_COLORS: Record<string, string> = {
  SEO: '#10B981', CONTENT: '#F59E0B', SOCIAL: '#EC4899',
  PAID: '#EF4444', ANALYTICS: '#6366F1', OTHER: '#94A3B8',
};

const GA_CREATE_URL = 'https://analytics.google.com/analytics/web/#/provision';
const GSC_CREATE_URL = 'https://search.google.com/search-console/welcome';

interface AHProject {
  id: string; name: string; client: string; clientInitials: string;
  stage: string; daysInMarketing: number;
  tasksDone: number; tasksTotal: number;
  hasStrategy: boolean; completedAt?: string;
  analyticsPropertyId?: string; searchConsoleUrl?: string;
}

interface StageRow {
  stage: string; label: string; count: number; projects: { id: string; name: string; client: string }[];
}

interface CatRow {
  category: string; done: number; total: number; tasks: TaskRow[];
}

interface TaskRow {
  id: string; title: string; status: string; priority: string;
  category: string; projectName: string; client: string; projectId: string;
}

@Component({
  selector: 'app-analytics-hub',
  imports: [RouterLink, Badge],
  template: `
    <div class="ah-page">

      <!-- Header -->
      <div class="ah-header">
        <div class="ah-header-left">
          <div class="dept-badge" aria-hidden="true">AH</div>
          <div>
            <h2 class="ah-title">Analytics Hub</h2>
            <p class="ah-sub">Product Growth · Cross-project overview · {{ allProjects().length }} total projects</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Analytics summary">
        @for (kpi of kpis; track kpi.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="kpi.bg" aria-hidden="true" [innerHTML]="kpi.icon"></div>
            <div><div class="kpi-value">{{ kpi.value() }}</div><div class="kpi-label">{{ kpi.label }}</div></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Analytics Hub sections">
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

        <!-- Marketing Projects tab -->
        @if (activeTab() === 'projects') {
          <div class="project-grid" role="list" aria-label="Marketing stage projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="proj-card" role="listitem">
                <div class="proj-top">
                  <div class="client-avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div class="proj-info">
                    <span class="proj-name">{{ p.name }}</span>
                    <span class="proj-client">{{ p.client }}</span>
                  </div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="info">In Marketing</ui-badge> }
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

                <!-- Data connections -->
                <div class="conn-row" aria-label="Data connections">
                  @if (p.analyticsPropertyId) {
                    <a class="conn conn--on" [href]="GA_CREATE_URL" target="_blank" rel="noopener" [title]="'GA4: ' + p.analyticsPropertyId">
                      <span class="conn-dot" aria-hidden="true"></span>GA4 · {{ p.analyticsPropertyId }}
                    </a>
                  } @else {
                    <a class="conn conn--off" [href]="GA_CREATE_URL" target="_blank" rel="noopener">+ Connect GA4</a>
                  }
                  @if (p.searchConsoleUrl) {
                    <a class="conn conn--on" [href]="gscLink(p.searchConsoleUrl)" target="_blank" rel="noopener" [title]="'Search Console: ' + p.searchConsoleUrl">
                      <span class="conn-dot" aria-hidden="true"></span>Search Console
                    </a>
                  } @else {
                    <a class="conn conn--off" [href]="GSC_CREATE_URL" target="_blank" rel="noopener">+ Connect Search Console</a>
                  }
                </div>

                <a class="proj-link" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open project →</a>
              </article>
            } @empty {
              <div class="empty-state">No projects in Marketing stage yet.</div>
            }
          </div>
        }

        <!-- Pipeline Funnel tab -->
        @if (activeTab() === 'pipeline') {
          <div class="funnel-summary">
            <span class="funnel-total">{{ allProjects().length }} total projects</span>
            <span class="funnel-note">All pipeline stages</span>
          </div>

          <div class="funnel" role="list" aria-label="Pipeline funnel">
            @for (row of pipelineRows(); track row.stage) {
              <div class="funnel-row" role="listitem">
                <div class="funnel-meta">
                  <span class="funnel-label">{{ row.label }}</span>
                  <span class="funnel-count">{{ row.count }}</span>
                </div>
                <div class="funnel-track" role="presentation">
                  <div class="funnel-bar" [style.width.%]="funnelPct(row.count)"
                    [style.background]="funnelColor(row.stage)"></div>
                </div>
                @if (row.projects.length > 0) {
                  <div class="funnel-projects">
                    @for (p of row.projects; track p.id) {
                      <a class="fp-chip" [routerLink]="['/app/projects', p.id]" [attr.aria-label]="p.name + ' — ' + p.client">
                        {{ p.name }}
                      </a>
                    }
                  </div>
                }
              </div>
            }

            <!-- Completed row -->
            <div class="funnel-row funnel-row--done" role="listitem">
              <div class="funnel-meta">
                <span class="funnel-label">Completed</span>
                <span class="funnel-count">{{ completedCount() }}</span>
              </div>
              <div class="funnel-track" role="presentation">
                <div class="funnel-bar" [style.width.%]="funnelPct(completedCount())" style="background: #22C55E;"></div>
              </div>
            </div>
          </div>
        }

        <!-- Task Breakdown tab -->
        @if (activeTab() === 'tasks') {
          <div class="filter-row" role="group" aria-label="Filter by task status">
            @for (f of taskFilters; track f.value) {
              <button class="ftab" [class.active]="taskStatusFilter() === f.value" (click)="taskStatusFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <!-- Category breakdown bars -->
          <div class="cat-grid" role="list" aria-label="Tasks by category">
            @for (cat of categoryRows(); track cat.category) {
              <div class="cat-card" role="listitem">
                <div class="cat-header">
                  <span class="cat-dot" [style.background]="catColor(cat.category)" aria-hidden="true"></span>
                  <span class="cat-name">{{ cat.category }}</span>
                  <span class="cat-fraction">{{ cat.done }}/{{ cat.total }}</span>
                </div>
                @if (cat.total > 0) {
                  <div class="cat-bar" role="progressbar" [attr.aria-valuenow]="catPct(cat)" aria-valuemin="0" aria-valuemax="100">
                    <div class="cat-fill" [style.width.%]="catPct(cat)" [style.background]="catColor(cat.category)"></div>
                  </div>
                  <span class="cat-pct">{{ catPct(cat) }}% done</span>
                } @else {
                  <span class="cat-pct">No tasks yet</span>
                }
              </div>
            }
          </div>

          <!-- Task list -->
          <div class="task-header" aria-hidden="true">
            <span>Task</span><span>Project</span><span>Category</span><span>Priority</span><span>Status</span>
          </div>
          <div class="task-list" role="list" aria-label="All marketing tasks">
            @for (t of displayedTasks(); track t.id) {
              <div class="task-row" role="listitem">
                <span class="task-title">{{ t.title }}</span>
                <div class="task-proj">
                  <span class="tp-name">{{ t.projectName }}</span>
                  <span class="tp-client">{{ t.client }}</span>
                </div>
                <span class="task-cat" [style.background]="catBg(t.category)" [style.color]="catColor(t.category)">{{ t.category }}</span>
                <span class="task-priority" [attr.data-p]="t.priority">{{ t.priority }}</span>
                <span class="task-status" [attr.data-s]="t.status">{{ statusLabel(t.status) }}</span>
              </div>
            } @empty {
              <div class="empty-state">No marketing tasks yet.</div>
            }
          </div>
        }

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

    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #6366F1; border-bottom-color: #6366F1; }
    .tab-count { background: #EEF2FF; color: #4338CA; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; justify-content: center; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Projects tab */
    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .proj-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .proj-card:hover { box-shadow: var(--shadow-raised); }
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
    .progress-fill { height: 100%; background: #6366F1; border-radius: 4px; }
    .progress-label { font-size: 11px; color: var(--color-text-muted); }
    .conn-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .conn { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; text-decoration: none; border: 1px solid transparent; }
    .conn--on { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
    .conn--off { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); border-style: dashed; }
    .conn--off:hover { color: #6366F1; border-color: #6366F1; }
    .conn-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
    .proj-link { font-size: 13px; font-weight: 500; color: #6366F1; text-decoration: none; margin-top: auto; }
    .proj-link:hover { text-decoration: underline; }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    /* Pipeline Funnel tab */
    .funnel-summary { display: flex; align-items: center; gap: 10px; }
    .funnel-total { font-size: 14px; font-weight: 700; color: var(--color-text); }
    .funnel-note { font-size: 12px; color: var(--color-text-muted); }
    .funnel { display: flex; flex-direction: column; gap: 12px; }
    .funnel-row { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .funnel-row--done { border-style: dashed; }
    .funnel-meta { display: flex; align-items: center; justify-content: space-between; }
    .funnel-label { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .funnel-count { font-size: 18px; font-weight: 700; color: var(--color-text); }
    .funnel-track { height: 8px; background: var(--color-surface-raised); border-radius: 8px; overflow: hidden; }
    .funnel-bar { height: 100%; border-radius: 8px; transition: width 0.4s ease; }
    .funnel-projects { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
    .fp-chip { font-size: 11.5px; font-weight: 500; padding: 3px 10px; border-radius: 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border); color: var(--color-text-secondary); text-decoration: none; transition: background 0.12s; }
    .fp-chip:hover { background: var(--color-border); color: var(--color-text); }

    /* Task Breakdown tab */
    .filter-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .ftab { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .ftab:hover { border-color: #6366F1; color: #4338CA; }
    .ftab.active { background: #6366F1; color: #fff; border-color: #6366F1; }
    .ftab-count { font-size: 10.5px; font-weight: 700; }
    .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .cat-card { padding: 12px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 6px; }
    .cat-header { display: flex; align-items: center; gap: 7px; }
    .cat-dot { width: 8px; height: 8px; min-width: 8px; border-radius: 50%; }
    .cat-name { font-size: 12px; font-weight: 600; color: var(--color-text); flex: 1; }
    .cat-fraction { font-size: 12px; font-weight: 700; color: var(--color-text); }
    .cat-bar { height: 5px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .cat-fill { height: 100%; border-radius: 4px; }
    .cat-pct { font-size: 10.5px; color: var(--color-text-muted); }
    .task-header { display: grid; grid-template-columns: 1fr 180px 90px 80px 100px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-top: 4px; }
    .task-list { display: flex; flex-direction: column; gap: 6px; }
    .task-row { display: grid; grid-template-columns: 1fr 180px 90px 80px 100px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .task-proj { display: flex; flex-direction: column; gap: 2px; }
    .tp-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); }
    .tp-client { font-size: 11px; color: var(--color-text-muted); }
    .task-cat { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEE2E2; color: #DC2626; }
    .task-priority[data-p="MEDIUM"] { background: #FEF3C7; color: #D97706; }
    .task-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-status[data-s="DONE"] { background: #ECFDF5; color: #059669; }
    .task-status[data-s="IN_PROGRESS"] { background: #EFF6FF; color: #2563EB; }
    .task-status[data-s="IN_REVIEW"] { background: #FEF3C7; color: #D97706; }
  `]
})
export class AnalyticsHub implements OnInit {
  private projectService = inject(ProjectService);
  protected search            = signal('');
  protected activeTab         = signal<TabId>('projects');
  protected taskStatusFilter  = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading           = signal(true);
  protected allProjects       = signal<Project[]>([]);

  protected marketingProjects = computed(() =>
    this.allProjects().filter(p => p.currentStage === 'MARKETING' || !!p.marketing).map(p => this.mapProject(p))
  );

  protected allTasks = computed<TaskRow[]>(() => {
    const rows: TaskRow[] = [];
    for (const p of this.allProjects()) {
      for (const t of p.marketing?.tasks ?? []) {
        rows.push({ id: t.id, title: t.title, status: t.status, priority: t.priority ?? 'MEDIUM', category: t.category ?? 'OTHER', projectName: p.name, client: p.clientName, projectId: p.id });
      }
    }
    return rows;
  });

  protected completedCount = computed(() => this.allProjects().filter(p => !!p.marketing?.completedAt).length);

  readonly tabs = [
    { id: 'projects'  as TabId, label: 'Marketing Projects', count: computed(() => this.marketingProjects().length) },
    { id: 'pipeline'  as TabId, label: 'Pipeline Funnel',    count: computed(() => this.allProjects().length) },
    { id: 'tasks'     as TabId, label: 'Task Breakdown',     count: computed(() => this.allTasks().length) },
  ];

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    { label: 'Total Projects',  value: computed(() => this.allProjects().length), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` },
    { label: 'In Marketing',    value: computed(() => this.marketingProjects().length), bg: '#EC4899', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
    { label: 'Completed',       value: computed(() => this.completedCount()), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Tasks Done',      value: computed(() => `${this.allTasks().filter(t=>t.status==='DONE').length}/${this.allTasks().length}`), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
  ];

  protected pipelineRows = computed<StageRow[]>(() => {
    const projects = this.allProjects();
    return STAGES.map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      count: projects.filter(p => p.currentStage === stage).length,
      projects: projects.filter(p => p.currentStage === stage).map(p => ({ id: p.id, name: p.name, client: p.clientName })),
    }));
  });

  protected categoryRows = computed<CatRow[]>(() => {
    const all = this.allTasks();
    return TASK_CATEGORIES.map(cat => {
      const tasks = all.filter(t => t.category === cat);
      return { category: cat, done: tasks.filter(t => t.status === 'DONE').length, total: tasks.length, tasks };
    });
  });

  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.marketingProjects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
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
      next: (projects) => { this.allProjects.set(projects); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): AHProject {
    const entry = p.pipeline.find(e => e.stage === 'MARKETING');
    const daysInMarketing = entry?.startedAt ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 86400000) : 0;
    const tasks = p.marketing?.tasks ?? [];
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      stage: p.currentStage, daysInMarketing,
      tasksDone:  tasks.filter(t => t.status === 'DONE').length,
      tasksTotal: tasks.length,
      hasStrategy: !!(p.marketing?.strategy || p.marketing?.channels),
      completedAt: p.marketing?.completedAt,
      analyticsPropertyId: p.analyticsPropertyId,
      searchConsoleUrl: p.searchConsoleUrl,
    };
  }

  protected readonly GA_CREATE_URL = GA_CREATE_URL;
  protected readonly GSC_CREATE_URL = GSC_CREATE_URL;

  /** Deep-link to the live Search Console property (falls back to setup when absent). */
  protected gscLink(url?: string): string {
    return url ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(url)}` : GSC_CREATE_URL;
  }

  protected taskPct(p: AHProject): number {
    return p.tasksTotal === 0 ? 0 : Math.round((p.tasksDone / p.tasksTotal) * 100);
  }

  protected funnelPct(count: number): number {
    const max = Math.max(...this.pipelineRows().map(r => r.count), this.completedCount(), 1);
    return Math.round((count / max) * 100);
  }

  protected funnelColor(stage: string): string {
    const map: Record<string, string> = {
      PROFILING: '#8B5CF6', WRITTEN_CONTENT: '#F59E0B',
      DESIGN: '#EC4899', DEVELOPMENT: '#3B82F6', MARKETING: '#10B981',
    };
    return map[stage] ?? '#94A3B8';
  }

  protected catColor(cat: string): string { return CAT_COLORS[cat] ?? '#94A3B8'; }

  protected catBg(cat: string): string {
    const bg: Record<string, string> = {
      SEO: '#ECFDF5', CONTENT: '#FEF3C7', SOCIAL: '#FCE7F3',
      PAID: '#FEE2E2', ANALYTICS: '#EEF2FF', OTHER: '#F1F5F9',
    };
    return bg[cat] ?? '#F1F5F9';
  }

  protected catPct(cat: CatRow): number {
    return cat.total === 0 ? 0 : Math.round((cat.done / cat.total) * 100);
  }

  protected statusLabel(s: string): string {
    if (s === 'IN_PROGRESS') return 'In Progress';
    if (s === 'IN_REVIEW') return 'In Review';
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
}
