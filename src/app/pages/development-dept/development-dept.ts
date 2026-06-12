import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

type DevGateStatus = 'not-started' | 'in-progress' | 'in-review' | 'pending-gate' | 'approved';

interface TaskBreakdown {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

interface DevProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  assignedTo: string[];
  gateStatus: DevGateStatus;
  briefDone: boolean;
  repoLinked: boolean;
  stagingUp: boolean;
  tasks: TaskBreakdown;
  daysInStage: number;
  targetDays: number;
  lastUpdated: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

@Component({
  selector: 'app-development-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="dd-page">

      <div class="dd-header">
        <div class="dd-header-left">
          <div class="dept-badge">Stage 4</div>
          <div>
            <h2 class="dd-title">Development</h2>
            <p class="dd-sub">Product Development · Soft Gate &nbsp;·&nbsp; {{ activeProjects().length }} active</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            class="search-input"
            type="search"
            placeholder="Search projects…"
            aria-label="Search projects"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
          />
        </div>
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip" role="list" aria-label="Development stage summary">
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

      <!-- Soft gate notice -->
      <div class="soft-gate-notice" role="note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span><strong>Soft Gate</strong> — Development can proceed to Marketing even with incomplete tasks. Gate warnings are advisory.</span>
      </div>

      <!-- Filters -->
      <div class="filter-row" role="tablist" aria-label="Filter by gate status">
        @for (f of filters; track f.value) {
          <button
            role="tab"
            class="ftab"
            [class.active]="activeFilter() === f.value"
            [attr.aria-selected]="activeFilter() === f.value"
            (click)="activeFilter.set(f.value)"
          >
            {{ f.label }}
            <span class="ftab-count">{{ f.count() }}</span>
          </button>
        }
        <div class="filter-sort">
          <label for="dd-sort" class="sr-only">Sort projects</label>
          <select id="dd-sort" class="sort-select" (change)="sort.set($any($event.target).value)">
            <option value="priority">Sort: Priority</option>
            <option value="tasks">Sort: Tasks Remaining</option>
            <option value="days">Sort: Days in Stage</option>
          </select>
        </div>
      </div>

      <!-- Loading state -->
      @if (loading()) {
        <div class="loading-state" role="status">
          <div class="spinner" aria-hidden="true"></div>
          Loading projects…
        </div>
      } @else {

        <!-- Project list header -->
        <div class="list-header" aria-hidden="true">
          <span class="lh-name">Project / Client</span>
          <span class="lh-setup">Setup</span>
          <span class="lh-kanban">Kanban</span>
          <span class="lh-days">Days</span>
          <span class="lh-gate">Gate Status</span>
          <span class="lh-team">Team</span>
          <span class="lh-actions"></span>
        </div>

        <!-- Rows -->
        <div class="project-list" role="list" aria-label="Projects in development stage">
          @for (project of displayed(); track project.id) {
            <article
              class="prow"
              role="listitem"
              [class.prow--approved]="project.gateStatus === 'approved'"
            >

              <!-- Identity -->
              <div class="prow-identity">
                <div class="client-avatar" aria-hidden="true">{{ project.clientInitials }}</div>
                <div class="prow-names">
                  <span class="prow-name">{{ project.name }}</span>
                  <span class="prow-client">{{ project.client }}</span>
                </div>
              </div>

              <!-- Setup chips -->
              <div class="setup-chips">
                <span class="chip" [class.chip--on]="project.briefDone" [attr.aria-label]="'Brief ' + (project.briefDone ? 'done' : 'missing')">Brief</span>
                <span class="chip" [class.chip--on]="project.repoLinked" [attr.aria-label]="'Repo ' + (project.repoLinked ? 'linked' : 'missing')">Repo</span>
                <span class="chip" [class.chip--on]="project.stagingUp" [attr.aria-label]="'Staging ' + (project.stagingUp ? 'up' : 'missing')">Staging</span>
              </div>

              <!-- Kanban mini -->
              <div class="kanban-mini" aria-label="Task breakdown">
                <span class="km-col todo"       title="To Do">{{ project.tasks.todo }}</span>
                <span class="km-sep" aria-hidden="true">/</span>
                <span class="km-col in-progress" title="In Progress">{{ project.tasks.inProgress }}</span>
                <span class="km-sep" aria-hidden="true">/</span>
                <span class="km-col in-review"  title="In Review">{{ project.tasks.inReview }}</span>
                <span class="km-sep" aria-hidden="true">/</span>
                <span class="km-col done"        title="Done">{{ project.tasks.done }}</span>
                <span class="km-legend" aria-hidden="true">T/P/R/D</span>
                @if (totalTaskCount(project) > 0) {
                  <div class="km-bar" role="progressbar" [attr.aria-valuenow]="taskPct(project)" aria-valuemin="0" aria-valuemax="100">
                    <div class="km-fill" [style.width.%]="taskPct(project)"></div>
                  </div>
                }
              </div>

              <!-- Days in stage -->
              <div class="days-cell">
                <span class="days-num" [class.days--over]="project.daysInStage > project.targetDays">{{ project.daysInStage }}</span>
                <span class="days-label">/ {{ project.targetDays }}d</span>
              </div>

              <!-- Gate status -->
              <div class="gate-cell">
                <ui-badge [variant]="gateBadgeVariant(project.gateStatus)">{{ gateLabel(project.gateStatus) }}</ui-badge>
              </div>

              <!-- Team -->
              <div class="team-cell" aria-label="Team members">
                @for (member of project.assignedTo.slice(0, 3); track member) {
                  <div class="member-chip" aria-hidden="true">{{ member }}</div>
                }
                @if (project.assignedTo.length > 3) {
                  <div class="member-chip member-chip--more">+{{ project.assignedTo.length - 3 }}</div>
                }
              </div>

              <!-- Actions -->
              <div class="actions-cell">
                @if (project.gateStatus !== 'approved') {
                  <button class="btn-proceed" type="button" (click)="approveGate(project)" aria-label="Approve gate for {{ project.name }}">
                    Proceed
                  </button>
                }
                <a class="btn-open" [routerLink]="['/app/projects', project.id, 'development']" aria-label="Open {{ project.name }}">
                  Open
                </a>
              </div>

            </article>
          } @empty {
            <div class="empty-state">
              <p>No projects currently in the Development stage.</p>
            </div>
          }
        </div>

      }

    </div>
  `,
  styles: [`
    .dd-page { display: flex; flex-direction: column; gap: 14px; }

    .dd-header { display: flex; align-items: center; justify-content: space-between; }
    .dd-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge {
      width: 44px; height: 44px; border-radius: 10px;
      background: #3B82F6; color: #fff;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .dd-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .dd-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }

    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 220px; }
    .search-input:focus { border-color: #3B82F6; }

    /* KPI strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-value { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-label { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    /* Soft gate notice */
    .soft-gate-notice { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: var(--radius-md); font-size: 13px; color: #1E40AF; }

    /* Filters */
    .filter-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .ftab { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 20px; font-family: var(--font-sans); font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .ftab:hover { border-color: #3B82F6; color: #3B82F6; }
    .ftab.active { background: #3B82F6; color: #fff; border-color: #3B82F6; }
    .ftab-count { font-size: 11px; font-weight: 700; }
    .filter-sort { margin-left: auto; }
    .sort-select { height: 32px; padding: 0 10px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; color: var(--color-text-secondary); background: var(--color-surface); outline: none; cursor: pointer; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; justify-content: center; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* List header */
    .list-header {
      display: grid;
      grid-template-columns: 175px 105px 155px 80px 108px 68px min-content;
      gap: 10px;
      padding: 0 14px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    /* Rows */
    .project-list { display: flex; flex-direction: column; gap: 6px; }
    .prow {
      display: grid;
      grid-template-columns: 175px 105px 155px 80px 108px 68px min-content;
      gap: 10px;
      align-items: center;
      padding: 10px 14px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      transition: box-shadow 0.15s;
    }
    .prow:hover { box-shadow: var(--shadow-raised); }
    .prow--approved { opacity: 0.65; }

    /* Identity */
    .prow-identity { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .client-avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .prow-names { display: flex; flex-direction: column; min-width: 0; }
    .prow-name { font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prow-client { font-size: 11.5px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Setup chips */
    .setup-chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .chip { font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); border: 1px solid var(--color-border); }
    .chip--on { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }

    /* Kanban mini */
    .kanban-mini { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
    .km-col { font-size: 12px; font-weight: 700; }
    .km-col.todo { color: var(--color-text-muted); }
    .km-col.in-progress { color: var(--color-info); }
    .km-col.in-review { color: var(--color-warning); }
    .km-col.done { color: var(--color-accent); }
    .km-sep { font-size: 11px; color: var(--color-border-strong); }
    .km-legend { font-size: 9.5px; color: var(--color-text-muted); margin-left: 4px; }
    .km-bar { width: 100%; height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; margin-top: 4px; }
    .km-fill { height: 100%; background: #3B82F6; border-radius: 4px; transition: width 0.3s ease; }

    /* Days */
    .days-cell { display: flex; align-items: baseline; gap: 3px; }
    .days-num { font-size: 16px; font-weight: 700; color: var(--color-text); }
    .days-num.days--over { color: var(--color-destructive); }
    .days-label { font-size: 11px; color: var(--color-text-muted); }

    /* Gate */
    .gate-cell { display: flex; }

    /* Team */
    .team-cell { display: flex; gap: 4px; flex-wrap: wrap; }
    .member-chip { width: 26px; height: 26px; border-radius: 50%; background: var(--color-surface-raised); border: 1px solid var(--color-border); font-size: 9.5px; font-weight: 700; color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center; }
    .member-chip--more { background: var(--color-sidebar); color: #F8FAFC; border-color: transparent; font-size: 9px; }

    /* Actions */
    .actions-cell { display: flex; gap: 6px; align-items: center; }
    .btn-proceed {
      height: 28px; padding: 0 10px;
      background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE;
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 600;
      cursor: pointer; white-space: nowrap; transition: background 0.15s;
    }
    .btn-proceed:hover { background: #DBEAFE; }
    .btn-open {
      height: 28px; padding: 0 10px;
      background: var(--color-surface-raised); border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500;
      color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center;
      transition: background 0.15s;
    }
    .btn-open:hover { background: var(--color-border); color: var(--color-text); }

    .empty-state { text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  `]
})
export class DevelopmentDept implements OnInit {
  private projectService = inject(ProjectService);

  protected search       = signal('');
  protected activeFilter = signal<'all' | DevGateStatus>('all');
  protected sort         = signal<'priority' | 'tasks' | 'days'>('priority');
  protected loading      = signal(true);
  protected projects     = signal<DevProject[]>([]);

  protected activeProjects = computed(() =>
    this.projects().filter(p => p.gateStatus !== 'approved')
  );

  protected totalDevTasks = computed(() =>
    this.projects().reduce((s, p) => s + p.tasks.todo + p.tasks.inProgress + p.tasks.inReview + p.tasks.done, 0)
  );
  protected doneDevTasks = computed(() =>
    this.projects().reduce((s, p) => s + p.tasks.done, 0)
  );

  protected kpis = [
    {
      label: 'Total in Dev',
      value: computed(() => this.projects().length),
      bg: '#3B82F6',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    },
    {
      label: 'Pending Soft Gate',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length),
      bg: '#6366F1',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
      label: 'Tasks Done',
      value: computed(() => `${this.doneDevTasks()}/${this.totalDevTasks()}`),
      bg: '#F59E0B',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    },
    {
      label: 'Approved This Month',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'approved').length),
      bg: '#22C55E',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
  ];

  protected filters = [
    { label: 'All',          value: 'all'          as const, count: computed(() => this.projects().length) },
    { label: 'In Progress',  value: 'in-progress'  as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-progress').length) },
    { label: 'In Review',    value: 'in-review'    as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-review').length) },
    { label: 'Pending Gate', value: 'pending-gate' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length) },
    { label: 'Approved',     value: 'approved'     as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'approved').length) },
  ];

  protected displayed = computed(() => {
    const q      = this.search().toLowerCase();
    const filter = this.activeFilter();
    const sortBy = this.sort();

    let list = this.projects().filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
      const matchFilter = filter === 'all' || p.gateStatus === filter;
      return matchSearch && matchFilter;
    });

    if (sortBy === 'tasks') {
      list = [...list].sort((a, b) =>
        (b.tasks.todo + b.tasks.inProgress + b.tasks.inReview) -
        (a.tasks.todo + a.tasks.inProgress + a.tasks.inReview)
      );
    } else if (sortBy === 'days') {
      list = [...list].sort((a, b) => b.daysInStage - a.daysInStage);
    }

    return list;
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(
          projects
            .filter(p => p.currentStage === 'DEVELOPMENT')
            .map(p => this.mapProject(p))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): DevProject {
    const entry = p.pipeline.find(e => e.stage === 'DEVELOPMENT');
    const daysInStage = entry?.startedAt
      ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 86400000)
      : 0;
    const targetDays = 21;
    const dev = p.development;
    const allTasks = dev?.tasks ?? [];
    const tasks: TaskBreakdown = {
      todo:       allTasks.filter(t => t.status === 'TODO').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      inReview:   allTasks.filter(t => t.status === 'IN_REVIEW').length,
      done:       allTasks.filter(t => t.status === 'DONE').length,
    };
    const briefDone  = !!(dev?.techStack);
    const repoLinked = !!(dev?.repoUrl);
    const stagingUp  = !!(dev?.stagingUrl);
    let gateStatus: DevGateStatus;
    if (entry?.status === 'APPROVED')         gateStatus = 'approved';
    else if (tasks.inReview > 0)              gateStatus = 'in-review';
    else if (briefDone && tasks.done > 0 && tasks.todo === 0 && tasks.inProgress === 0) gateStatus = 'pending-gate';
    else if (entry?.status === 'IN_PROGRESS') gateStatus = 'in-progress';
    else                                      gateStatus = 'not-started';
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      assignedTo: p.members.map(m => m.user.name.slice(0, 2).toUpperCase()),
      gateStatus, briefDone, repoLinked, stagingUp, tasks, daysInStage, targetDays,
      lastUpdated: this.relativeTime(p.updatedAt), priority: 'medium',
    };
  }

  private relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  protected totalTaskCount(p: DevProject): number {
    return p.tasks.todo + p.tasks.inProgress + p.tasks.inReview + p.tasks.done;
  }

  protected taskPct(p: DevProject): number {
    const total = this.totalTaskCount(p);
    return total === 0 ? 0 : Math.round((p.tasks.done / total) * 100);
  }

  protected gateBadgeVariant(status: DevGateStatus): 'success' | 'info' | 'default' | 'secondary' {
    switch (status) {
      case 'approved':      return 'success';
      case 'pending-gate':  return 'info';
      case 'in-review':     return 'info';
      case 'in-progress':   return 'default';
      case 'not-started':   return 'secondary';
    }
  }

  protected gateLabel(status: DevGateStatus): string {
    switch (status) {
      case 'approved':      return 'Approved';
      case 'pending-gate':  return 'Pending Gate';
      case 'in-review':     return 'In Review';
      case 'in-progress':   return 'In Progress';
      case 'not-started':   return 'Not Started';
    }
  }

  protected approveGate(project: DevProject) {
    this.projects.update(list =>
      list.map(p => p.id === project.id ? { ...p, gateStatus: 'approved' as DevGateStatus } : p)
    );
  }
}
