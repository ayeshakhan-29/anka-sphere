import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project, PipelineStage } from '../../models/project.models';

type ReportFilter = 'all' | 'weekly-due' | 'monthly-due' | 'on-track' | 'overdue';

type WeeklyReportStatus = 'sent' | 'due-today' | 'overdue' | 'upcoming';
type MonthlyReportStatus = 'sent' | 'due-this-month' | 'overdue' | 'upcoming';

interface ReportProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  currentStage: PipelineStage;
  currentStageLabel: string;
  completedStages: number;
  daysActive: number;
  weeklyStatus: WeeklyReportStatus;
  weeklyLastSent?: string;
  monthlyStatus: MonthlyReportStatus;
  monthlyLastSent?: string;
  members: string[];
  overallStatus: 'active' | 'on-hold' | 'completed';
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  PROFILING:       'Project Profiling',
  WRITTEN_CONTENT: 'Written Content',
  DESIGN:          'Design',
  DEVELOPMENT:     'Development',
  MARKETING:       'Marketing',
};

const STAGE_ORDER: PipelineStage[] = ['PROFILING', 'WRITTEN_CONTENT', 'DESIGN', 'DEVELOPMENT', 'MARKETING'];

@Component({
  selector: 'app-reporting-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="rdept-page">

      <!-- Header -->
      <div class="rdept-header">
        <div class="rdept-header-left">
          <div class="dept-badge">Reports</div>
          <div>
            <h2 class="rdept-title">Reporting</h2>
            <p class="rdept-sub">Cross-department &nbsp;·&nbsp; {{ projects().length }} projects tracked</p>
          </div>
        </div>
        <div class="header-right">
          <div class="schedule-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Weekly: every Monday &nbsp;·&nbsp; Monthly: 1st of month</span>
          </div>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip" role="list" aria-label="Reporting summary">
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

      <!-- Overdue alert -->
      @if (overdueProjects().length > 0) {
        <div class="overdue-alert" role="alert" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <strong>{{ overdueProjects().length }} project{{ overdueProjects().length > 1 ? 's' : '' }} have overdue reports</strong>
          &nbsp;—&nbsp;
          @for (p of overdueProjects(); track p.id; let last = $last) {
            <span>{{ p.name }}{{ !last ? ', ' : '' }}</span>
          }
        </div>
      }

      <!-- Filter tabs -->
      <div class="filter-row" role="tablist" aria-label="Filter projects by report status">
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
          <label for="rdept-sort" class="sr-only">Sort projects</label>
          <select id="rdept-sort" class="sort-select" (change)="sort.set($any($event.target).value)">
            <option value="name">Sort: Name</option>
            <option value="stage">Sort: Stage</option>
            <option value="days">Sort: Days Active</option>
            <option value="overdue">Sort: Overdue First</option>
          </select>
        </div>
      </div>

      <!-- Project list -->
      <div class="project-list" role="list" aria-label="Project reporting status">
        @for (project of displayed(); track project.id) {
          <article
            class="prow"
            role="listitem"
            [class.prow--overdue]="project.weeklyStatus === 'overdue' || project.monthlyStatus === 'overdue'"
            [class.prow--on-hold]="project.overallStatus === 'on-hold'"
          >

            <!-- Identity -->
            <div class="prow-identity">
              <div class="p-avatar" [class]="'p-avatar--' + stageColor(project.currentStage)" aria-hidden="true">
                {{ project.clientInitials }}
              </div>
              <div class="p-names">
                <a class="p-name" [routerLink]="['/app/projects', project.id, 'reporting']">
                  {{ project.name }}
                </a>
                <span class="p-client">{{ project.client }}</span>
              </div>
            </div>

            <!-- Current stage -->
            <div class="prow-stage">
              <div class="stage-num">Stage {{ completedStagesNum(project) + 1 }}</div>
              <div class="stage-name">{{ project.currentStageLabel }}</div>
              <div class="stage-bar" role="img" [attr.aria-label]="completedStagesNum(project) + ' of 5 stages complete'">
                <div class="stage-bar-fill" [style.width.%]="(completedStagesNum(project) / 5) * 100"></div>
              </div>
            </div>

            <!-- Days active -->
            <div class="prow-days">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ project.daysActive }}d active</span>
            </div>

            <!-- Weekly report status -->
            <div class="prow-report" [attr.aria-label]="'Weekly report: ' + weeklyLabel(project.weeklyStatus)">
              <span class="report-type-label">Weekly</span>
              <ui-badge [variant]="weeklyBadge(project.weeklyStatus)">
                {{ weeklyLabel(project.weeklyStatus) }}
              </ui-badge>
              @if (project.weeklyLastSent) {
                <span class="last-sent">Sent {{ project.weeklyLastSent }}</span>
              }
            </div>

            <!-- Monthly report status -->
            <div class="prow-report" [attr.aria-label]="'Monthly report: ' + monthlyLabel(project.monthlyStatus)">
              <span class="report-type-label">Monthly</span>
              <ui-badge [variant]="monthlyBadge(project.monthlyStatus)">
                {{ monthlyLabel(project.monthlyStatus) }}
              </ui-badge>
              @if (project.monthlyLastSent) {
                <span class="last-sent">Sent {{ project.monthlyLastSent }}</span>
              }
            </div>

            <!-- Team -->
            <div class="prow-team" [attr.aria-label]="'Team: ' + project.members.join(', ')">
              @for (m of project.members.slice(0, 3); track m) {
                <div class="team-av" [title]="m" aria-hidden="true">{{ m }}</div>
              }
              @if (project.members.length > 3) {
                <div class="team-av team-av--more" aria-hidden="true">+{{ project.members.length - 3 }}</div>
              }
            </div>

            <!-- Actions -->
            <div class="prow-actions">
              <a
                class="action-btn action-btn--open"
                [routerLink]="['/app/projects', project.id, 'reporting']"
                [attr.aria-label]="'Open reporting for ' + project.name"
              >
                View Reports
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>

          </article>
        } @empty {
          <div class="empty-state" role="status">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
            <p>No projects match your filter.</p>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .rdept-page { width: 100%; }

    .rdept-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .rdept-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      background: rgba(99,102,241,0.12);
      color: #6366F1;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .rdept-title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .rdept-sub { font-size: 12.5px; color: var(--color-text-secondary); margin: 0; }
    .header-right { display: flex; align-items: center; }
    .schedule-info {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 7px 12px;
    }

    /* KPI strip */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .kpi-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: #fff;
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 400;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: 2px;
    }
    .kpi-label { font-size: 12px; color: var(--color-text-secondary); }

    /* Alert */
    .overdue-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      margin-bottom: 18px;
      background: #FFF3CD;
      border: 1px solid #F59E0B;
      border-radius: var(--radius-md);
      font-size: 13px;
      color: #92400E;
      flex-wrap: wrap;
    }

    /* Filters */
    .filter-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0;
      flex-wrap: wrap;
    }
    .ftab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      background: transparent;
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .ftab:hover { color: var(--color-text); }
    .ftab.active { color: var(--color-text); border-bottom-color: #6366F1; }
    .ftab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .ftab.active .ftab-count { background: rgba(99,102,241,0.12); color: #6366F1; }
    .filter-sort { margin-left: auto; }
    .sort-select {
      height: 30px;
      padding: 0 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12.5px;
      color: var(--color-text-secondary);
      cursor: pointer;
      outline: none;
    }
    .sort-select:focus { border-color: #6366F1; }

    /* Project rows */
    .project-list { display: flex; flex-direction: column; gap: 8px; }

    .prow {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 170px 150px 80px 140px 140px 70px min-content;
      align-items: center;
      gap: 14px;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .prow:hover { box-shadow: var(--shadow-raised); border-color: var(--color-border-strong); }
    .prow--overdue  { border-left: 3px solid #F59E0B; }
    .prow--on-hold  { opacity: 0.7; }

    /* Identity */
    .prow-identity { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
    .p-avatar {
      width: 34px; height: 34px;
      border-radius: 9px;
      color: #fff;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .p-avatar--indigo  { background: #6366F1; }
    .p-avatar--purple  { background: #8B5CF6; }
    .p-avatar--pink    { background: #EC4899; }
    .p-avatar--cyan    { background: #0EA5E9; }
    .p-avatar--orange  { background: #F97316; }

    .p-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .p-name {
      font-size: 13px; font-weight: 600; color: var(--color-text);
      text-decoration: none;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      transition: color 0.15s;
    }
    .p-name:hover { color: #6366F1; }
    .p-client { font-size: 11.5px; color: var(--color-text-secondary); }

    /* Stage */
    .prow-stage { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .stage-num { font-size: 10.5px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stage-name {
      font-size: 12px; font-weight: 500; color: var(--color-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .stage-bar {
      height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden;
    }
    .stage-bar-fill { height: 100%; background: #6366F1; border-radius: 2px; transition: width 0.3s; }

    /* Days */
    .prow-days {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: var(--color-text-secondary);
    }

    /* Report columns */
    .prow-report {
      display: flex; flex-direction: column; gap: 3px;
    }
    .report-type-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--color-text-muted);
    }
    .last-sent { font-size: 10.5px; color: var(--color-text-muted); }

    /* Team */
    .prow-team { display: flex; }
    .team-av {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 2px solid var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 8px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      margin-left: -5px;
    }
    .team-av:first-child { margin-left: 0; }
    .team-av--more { background: var(--color-border); font-size: 7px; }

    /* Actions */
    .prow-actions { display: flex; gap: 6px; align-items: center; }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 10px;
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid var(--color-border);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .action-btn--open {
      background: transparent; color: var(--color-text-secondary);
    }
    .action-btn--open:hover {
      background: var(--color-surface-raised);
      color: var(--color-text);
      border-color: var(--color-border-strong);
    }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; padding: 60px;
      color: var(--color-text-muted); font-size: 14px;
    }
    .empty-state p { margin: 0; }

    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
    }

    @media (max-width: 1100px) {
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .prow { grid-template-columns: 1fr; gap: 10px; }
    }
  `]
})
export class ReportingDept implements OnInit {
  private projectService = inject(ProjectService);

  protected projects = signal<ReportProject[]>([]);
  protected loading = signal(true);
  protected activeFilter = signal<ReportFilter>('all');
  protected sort = signal<'name' | 'stage' | 'days' | 'overdue'>('name');

  protected overdueProjects = computed(() =>
    this.projects().filter(p =>
      p.weeklyStatus === 'overdue' || p.monthlyStatus === 'overdue'
    )
  );

  protected weeklyDueCount = computed(() =>
    this.projects().filter(p => p.weeklyStatus === 'due-today' || p.weeklyStatus === 'overdue').length
  );

  protected monthlyDueCount = computed(() =>
    this.projects().filter(p => p.monthlyStatus === 'due-this-month' || p.monthlyStatus === 'overdue').length
  );

  protected kpis = [
    {
      label: 'Projects Tracked',
      value: computed(() => this.projects().length),
      bg: '#6366F1',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    },
    {
      label: 'Weekly Due / Overdue',
      value: computed(() => this.weeklyDueCount()),
      bg: '#F59E0B',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    },
    {
      label: 'Monthly Due This Month',
      value: computed(() => this.monthlyDueCount()),
      bg: '#8B5CF6',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      label: 'On Track',
      value: computed(() =>
        this.projects().filter(p =>
          p.weeklyStatus !== 'overdue' && p.monthlyStatus !== 'overdue'
        ).length
      ),
      bg: '#22C55E',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
  ];

  protected filters = [
    { label: 'All',          value: 'all'          as ReportFilter, count: computed(() => this.projects().length) },
    { label: 'Weekly Due',   value: 'weekly-due'   as ReportFilter, count: computed(() => this.weeklyDueCount()) },
    { label: 'Monthly Due',  value: 'monthly-due'  as ReportFilter, count: computed(() => this.monthlyDueCount()) },
    { label: 'On Track',     value: 'on-track'     as ReportFilter, count: computed(() => this.projects().filter(p => p.weeklyStatus !== 'overdue' && p.monthlyStatus !== 'overdue').length) },
    { label: 'Overdue',      value: 'overdue'      as ReportFilter, count: computed(() => this.overdueProjects().length) },
  ];

  protected displayed = computed(() => {
    const filter = this.activeFilter();
    const sortBy = this.sort();

    let list = this.projects().filter(p => {
      if (filter === 'weekly-due')  return p.weeklyStatus === 'due-today' || p.weeklyStatus === 'overdue';
      if (filter === 'monthly-due') return p.monthlyStatus === 'due-this-month' || p.monthlyStatus === 'overdue';
      if (filter === 'on-track')    return p.weeklyStatus !== 'overdue' && p.monthlyStatus !== 'overdue';
      if (filter === 'overdue')     return p.weeklyStatus === 'overdue' || p.monthlyStatus === 'overdue';
      return true;
    });

    if (sortBy === 'name')    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'stage')   list = [...list].sort((a, b) => STAGE_ORDER.indexOf(a.currentStage) - STAGE_ORDER.indexOf(b.currentStage));
    if (sortBy === 'days')    list = [...list].sort((a, b) => b.daysActive - a.daysActive);
    if (sortBy === 'overdue') {
      const rank = (p: ReportProject) =>
        (p.weeklyStatus === 'overdue' ? 2 : 0) + (p.monthlyStatus === 'overdue' ? 1 : 0);
      list = [...list].sort((a, b) => rank(b) - rank(a));
    }

    return list;
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects.map(p => this.mapProject(p)));
        this.loading.set(false);
      },
      error: () => {
        this.projects.set(MOCK_REPORT_PROJECTS);
        this.loading.set(false);
      },
    });
  }

  private mapProject(p: Project): ReportProject {
    const completedStages = p.pipeline.filter(e => e.status === 'APPROVED').length;
    const daysActive = p.startDate
      ? Math.floor((Date.now() - new Date(p.startDate).getTime()) / 86400000)
      : 0;

    const weeklyStatus = this.deriveWeeklyStatus(daysActive);
    const monthlyStatus = this.deriveMonthlyStatus(daysActive);

    return {
      id: p.id,
      name: p.name,
      client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      currentStage: p.currentStage,
      currentStageLabel: STAGE_LABELS[p.currentStage],
      completedStages,
      daysActive,
      weeklyStatus,
      weeklyLastSent: weeklyStatus === 'sent' ? this.relativeTime(p.updatedAt) : undefined,
      monthlyStatus,
      monthlyLastSent: monthlyStatus === 'sent' ? undefined : undefined,
      members: p.members.map(m => m.user.name.slice(0, 2).toUpperCase()),
      overallStatus: p.status === 'ACTIVE' ? 'active' : p.status === 'ON_HOLD' ? 'on-hold' : 'completed',
    };
  }

  private deriveWeeklyStatus(daysActive: number): WeeklyReportStatus {
    if (daysActive < 7) return 'upcoming';
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1) return 'due-today';
    if (dayOfWeek === 0 || dayOfWeek > 4) return 'overdue';
    return 'sent';
  }

  private deriveMonthlyStatus(daysActive: number): MonthlyReportStatus {
    if (daysActive < 30) return 'upcoming';
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth === 1) return 'due-this-month';
    if (dayOfMonth > 5) return 'sent';
    return 'due-this-month';
  }

  protected completedStagesNum(p: ReportProject): number {
    return p.completedStages;
  }

  protected stageColor(stage: PipelineStage): string {
    const map: Record<PipelineStage, string> = {
      PROFILING:       'indigo',
      WRITTEN_CONTENT: 'purple',
      DESIGN:          'pink',
      DEVELOPMENT:     'cyan',
      MARKETING:       'orange',
    };
    return map[stage];
  }

  protected weeklyLabel(s: WeeklyReportStatus): string {
    if (s === 'sent')      return 'Sent';
    if (s === 'due-today') return 'Due Today';
    if (s === 'overdue')   return 'Overdue';
    return 'Upcoming';
  }

  protected weeklyBadge(s: WeeklyReportStatus): 'success' | 'warning' | 'default' | 'secondary' {
    if (s === 'sent')      return 'success';
    if (s === 'due-today') return 'warning';
    if (s === 'overdue')   return 'warning';
    return 'secondary';
  }

  protected monthlyLabel(s: MonthlyReportStatus): string {
    if (s === 'sent')           return 'Sent';
    if (s === 'due-this-month') return 'Due This Month';
    if (s === 'overdue')        return 'Overdue';
    return 'Upcoming';
  }

  protected monthlyBadge(s: MonthlyReportStatus): 'success' | 'warning' | 'default' | 'secondary' {
    if (s === 'sent')           return 'success';
    if (s === 'due-this-month') return 'warning';
    if (s === 'overdue')        return 'warning';
    return 'secondary';
  }

  private relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }
}

const MOCK_REPORT_PROJECTS: ReportProject[] = [
  {
    id: '1', name: 'Corporate Website', client: 'Nexus Holdings', clientInitials: 'NH',
    currentStage: 'DESIGN', currentStageLabel: 'Design', completedStages: 2, daysActive: 28,
    weeklyStatus: 'due-today', monthlyStatus: 'due-this-month',
    members: ['JD', 'AK', 'SM'], overallStatus: 'active',
  },
  {
    id: '2', name: 'Healthcare Platform', client: 'MedCore Solutions', clientInitials: 'MC',
    currentStage: 'DEVELOPMENT', currentStageLabel: 'Development', completedStages: 3, daysActive: 45,
    weeklyStatus: 'sent', weeklyLastSent: '3 days ago',
    monthlyStatus: 'sent', monthlyLastSent: '12 days ago',
    members: ['SM', 'AK'], overallStatus: 'active',
  },
  {
    id: '3', name: 'Travel Agency Rebrand', client: 'WanderCo', clientInitials: 'WC',
    currentStage: 'WRITTEN_CONTENT', currentStageLabel: 'Written Content', completedStages: 1, daysActive: 16,
    weeklyStatus: 'overdue', monthlyStatus: 'upcoming',
    members: ['LT'], overallStatus: 'active',
  },
  {
    id: '4', name: 'Fashion E-Commerce', client: 'AuraWear', clientInitials: 'AW',
    currentStage: 'MARKETING', currentStageLabel: 'Marketing', completedStages: 4, daysActive: 62,
    weeklyStatus: 'sent', weeklyLastSent: '2 days ago',
    monthlyStatus: 'due-this-month',
    members: ['JD', 'RT'], overallStatus: 'active',
  },
  {
    id: '5', name: 'Logistics Portal', client: 'FastHaul', clientInitials: 'FH',
    currentStage: 'PROFILING', currentStageLabel: 'Project Profiling', completedStages: 0, daysActive: 3,
    weeklyStatus: 'upcoming', monthlyStatus: 'upcoming',
    members: ['AK'], overallStatus: 'active',
  },
];
