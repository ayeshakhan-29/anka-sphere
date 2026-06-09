import { Component, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';

type GateStatus = 'not-started' | 'in-progress' | 'pending-review' | 'approved' | 'overdue';

interface SectionStatus {
  brief: boolean;
  brand: boolean;
  personas: number;
  competitors: number;
  seo: boolean;
  timeline: number; // milestones done
}

interface ProfilingProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  assignedTo: string[];
  gateStatus: GateStatus;
  sections: SectionStatus;
  completionPct: number;
  daysInStage: number;
  targetDays: number;
  lastUpdated: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

const MOCK_PROJECTS: ProfilingProject[] = [
  {
    id: '5',
    name: 'Social Media Launch',
    client: 'Bloom Skincare',
    clientInitials: 'BS',
    assignedTo: ['SM'],
    gateStatus: 'in-progress',
    sections: { brief: true, brand: true, personas: 2, competitors: 1, seo: false, timeline: 1 },
    completionPct: 55,
    daysInStage: 4,
    targetDays: 7,
    lastUpdated: 'Today',
    priority: 'medium',
  },
  {
    id: '7',
    name: 'Fintech App Website',
    client: 'ClearLedger',
    clientInitials: 'CL',
    assignedTo: ['AK', 'LT'],
    gateStatus: 'pending-review',
    sections: { brief: true, brand: true, personas: 3, competitors: 4, seo: true, timeline: 5 },
    completionPct: 100,
    daysInStage: 8,
    targetDays: 10,
    lastUpdated: 'Yesterday',
    priority: 'high',
    notes: 'Client is waiting — please expedite gate approval.',
  },
  {
    id: '8',
    name: 'Luxury Real Estate Portal',
    client: 'Meridian Group',
    clientInitials: 'MG',
    assignedTo: ['AK'],
    gateStatus: 'overdue',
    sections: { brief: true, brand: false, personas: 0, competitors: 2, seo: false, timeline: 0 },
    completionPct: 28,
    daysInStage: 14,
    targetDays: 7,
    lastUpdated: '5 days ago',
    priority: 'high',
    notes: 'Waiting on brand guidelines from client.',
  },
  {
    id: '9',
    name: 'SaaS Dashboard Redesign',
    client: 'Stackflow Inc.',
    clientInitials: 'SI',
    assignedTo: ['SM', 'AK'],
    gateStatus: 'not-started',
    sections: { brief: false, brand: false, personas: 0, competitors: 0, seo: false, timeline: 0 },
    completionPct: 0,
    daysInStage: 1,
    targetDays: 7,
    lastUpdated: 'Today',
    priority: 'low',
  },
  {
    id: '10',
    name: 'Corporate Rebrand',
    client: 'Nexus Holdings',
    clientInitials: 'NH',
    assignedTo: ['JD', 'AK'],
    gateStatus: 'approved',
    sections: { brief: true, brand: true, personas: 2, competitors: 3, seo: true, timeline: 4 },
    completionPct: 100,
    daysInStage: 6,
    targetDays: 7,
    lastUpdated: '2 days ago',
    priority: 'medium',
  },
];

@Component({
  selector: 'app-profiling-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="pd-page">

      <!-- Page header -->
      <div class="pd-header">
        <div class="pd-header-left">
          <div class="dept-badge">Stage 1</div>
          <div>
            <h2 class="pd-title">Project Profiling</h2>
            <p class="pd-sub">Product Modelling · Hard Gate &nbsp;·&nbsp; {{ activeProjects().length }} active</p>
          </div>
        </div>
        <div class="pd-header-actions">
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
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip" role="list" aria-label="Profiling stage summary">
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
          <strong>{{ overdueProjects().length }} project{{ overdueProjects().length > 1 ? 's' : '' }} overdue</strong>
          —&nbsp;
          @for (p of overdueProjects(); track p.id; let last = $last) {
            <span>{{ p.name }}{{ !last ? ', ' : '' }}</span>
          }
          &nbsp;·&nbsp;Review immediately.
        </div>
      }

      <!-- Filter tabs -->
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
          <label for="sort-select" class="sr-only">Sort projects</label>
          <select id="sort-select" class="sort-select" (change)="sort.set($any($event.target).value)">
            <option value="priority">Sort: Priority</option>
            <option value="overdue">Sort: Most Overdue</option>
            <option value="completion">Sort: Completion</option>
            <option value="updated">Sort: Last Updated</option>
          </select>
        </div>
      </div>

      <!-- Project list -->
      <div class="project-list" role="list" aria-label="Projects in profiling stage">
        @for (project of displayed(); track project.id) {
          <article class="prow" role="listitem" [class.prow--overdue]="project.gateStatus === 'overdue'" [class.prow--approved]="project.gateStatus === 'approved'">

            <!-- Left: identity -->
            <div class="prow-identity">
              <div class="p-avatar" aria-hidden="true">{{ project.clientInitials }}</div>
              <div class="p-names">
                <span class="p-name">{{ project.name }}</span>
                <span class="p-client">{{ project.client }}</span>
                @if (project.notes) {
                  <span class="p-note">{{ project.notes }}</span>
                }
              </div>
            </div>

            <!-- Section completion icons -->
            <div class="prow-sections" aria-label="Section completion for {{ project.name }}">
              <div class="section-chip" [class.done]="project.sections.brief" [title]="project.sections.brief ? 'Brief — done' : 'Brief — missing'">
                @if (project.sections.brief) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Brief
              </div>
              <div class="section-chip" [class.done]="project.sections.brand" [title]="project.sections.brand ? 'Brand — done' : 'Brand — missing'">
                @if (project.sections.brand) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Brand
              </div>
              <div class="section-chip" [class.done]="project.sections.personas > 0" [title]="project.sections.personas + ' persona(s)'">
                @if (project.sections.personas > 0) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Personas {{ project.sections.personas > 0 ? '(' + project.sections.personas + ')' : '' }}
              </div>
              <div class="section-chip" [class.done]="project.sections.competitors > 0" [title]="project.sections.competitors + ' competitor(s)'">
                @if (project.sections.competitors > 0) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Rivals {{ project.sections.competitors > 0 ? '(' + project.sections.competitors + ')' : '' }}
              </div>
              <div class="section-chip" [class.done]="project.sections.seo" [title]="project.sections.seo ? 'SEO — done' : 'SEO — missing'">
                @if (project.sections.seo) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                SEO
              </div>
            </div>

            <!-- Progress + gate -->
            <div class="prow-progress">
              <div class="prog-row">
                <span class="prog-label">Completion</span>
                <span class="prog-val" [class.prog-val--full]="project.completionPct === 100">{{ project.completionPct }}%</span>
              </div>
              <div class="prog-bar" role="progressbar" [attr.aria-valuenow]="project.completionPct" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="project.name + ' profiling ' + project.completionPct + '% complete'">
                <div class="prog-fill" [style.width.%]="project.completionPct" [class.prog-fill--full]="project.completionPct === 100"></div>
              </div>
            </div>

            <!-- Days in stage -->
            <div class="prow-days" [class.prow-days--over]="project.daysInStage > project.targetDays">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ project.daysInStage }}d / {{ project.targetDays }}d</span>
              @if (project.daysInStage > project.targetDays) {
                <span class="overdue-tag">{{ project.daysInStage - project.targetDays }}d overdue</span>
              }
            </div>

            <!-- Gate status badge -->
            <div class="prow-gate">
              <ui-badge [variant]="gateBadgeVariant(project.gateStatus)">
                {{ gateLabel(project.gateStatus) }}
              </ui-badge>
            </div>

            <!-- Team -->
            <div class="prow-team" [attr.aria-label]="'Team: ' + project.assignedTo.join(', ')">
              @for (member of project.assignedTo.slice(0, 3); track member) {
                <div class="team-av" [title]="member">{{ member }}</div>
              }
              @if (project.assignedTo.length > 3) {
                <div class="team-av team-av--more">+{{ project.assignedTo.length - 3 }}</div>
              }
            </div>

            <!-- Updated -->
            <span class="prow-updated" aria-label="Last updated {{ project.lastUpdated }}">{{ project.lastUpdated }}</span>

            <!-- Actions -->
            <div class="prow-actions">
              @if (project.gateStatus === 'pending-review') {
                <button class="action-btn action-btn--approve" (click)="approveGate(project)" [attr.aria-label]="'Approve gate for ' + project.name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Approve
                </button>
              }
              @if (project.gateStatus === 'overdue') {
                <button class="action-btn action-btn--nudge" (click)="nudgeClient(project)" [attr.aria-label]="'Nudge client for ' + project.name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.04 2 2 2 0 012 .04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  Nudge
                </button>
              }
              <a
                class="action-btn action-btn--open"
                [routerLink]="['/app/projects', project.id, 'profiling']"
                [attr.aria-label]="'Open profiling for ' + project.name"
              >
                Open
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>

          </article>
        } @empty {
          <div class="empty-state" role="status">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>No projects match your filter.</p>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .pd-page { max-width: 1200px; }

    /* ───── Header ───── */
    .pd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .pd-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      background: var(--color-accent-light);
      color: var(--color-accent);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .pd-title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .pd-sub {
      font-size: 12.5px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--color-text-muted);
      pointer-events: none;
    }
    .search-input {
      height: 36px;
      width: 220px;
      padding: 0 12px 0 32px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus { border-color: var(--color-accent); }
    .search-input::placeholder { color: var(--color-text-muted); }

    /* ───── KPI strip ───── */
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
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fff;
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 400;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: 2px;
    }
    .kpi-label {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    /* ───── Overdue alert ───── */
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
    }
    :host-context(.dark) .overdue-alert {
      background: rgba(245,158,11,0.12);
      border-color: rgba(245,158,11,0.4);
      color: #FCD34D;
    }

    /* ───── Filter tabs ───── */
    .filter-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0;
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
    .ftab.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .ftab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .ftab.active .ftab-count {
      background: var(--color-accent-light);
      color: var(--color-accent);
    }
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
    .sort-select:focus { border-color: var(--color-accent); }

    /* ───── Project rows ───── */
    .project-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .prow {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 190px 1fr 120px 108px 108px 68px 62px min-content;
      align-items: center;
      gap: 10px;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .prow:hover { box-shadow: var(--shadow-raised); border-color: var(--color-border-strong); }
    .prow--overdue { border-left: 3px solid #F59E0B; }
    .prow--approved { border-left: 3px solid #22C55E; }

    /* Identity */
    .prow-identity { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
    .p-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .p-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .p-name {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .p-client { font-size: 11.5px; color: var(--color-text-secondary); }
    .p-note {
      font-size: 11px;
      color: #F59E0B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Sections */
    .prow-sections {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .section-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 500;
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
      transition: background 0.15s;
    }
    .section-chip.done {
      background: rgba(34,197,94,0.1);
      color: #16A34A;
    }

    /* Progress */
    .prow-progress { min-width: 0; }
    .prog-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .prog-label { font-size: 11px; color: var(--color-text-muted); }
    .prog-val {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }
    .prog-val--full { color: #16A34A; }
    .prog-bar {
      height: 4px;
      background: var(--color-surface-raised);
      border-radius: 10px;
      overflow: hidden;
    }
    .prog-fill {
      height: 100%;
      background: var(--color-accent);
      border-radius: 10px;
      transition: width 0.3s ease;
    }
    .prog-fill--full { background: #22C55E; }

    /* Days */
    .prow-days {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--color-text-secondary);
      flex-wrap: wrap;
    }
    .prow-days--over { color: #F59E0B; }
    .overdue-tag {
      background: rgba(245,158,11,0.15);
      color: #F59E0B;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* Gate badge */
    .prow-gate { display: flex; align-items: center; }

    /* Team */
    .prow-team { display: flex; }
    .team-av {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 2px solid var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 8px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: -5px;
    }
    .team-av:first-child { margin-left: 0; }
    .team-av--more { background: var(--color-border); }

    /* Updated */
    .prow-updated {
      font-size: 11.5px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

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
      background: transparent;
      color: var(--color-text-secondary);
    }
    .action-btn--open:hover {
      background: var(--color-surface-raised);
      color: var(--color-text);
      border-color: var(--color-border-strong);
    }
    .action-btn--approve {
      background: rgba(34,197,94,0.1);
      color: #16A34A;
      border-color: rgba(34,197,94,0.3);
    }
    .action-btn--approve:hover {
      background: rgba(34,197,94,0.2);
    }
    .action-btn--nudge {
      background: rgba(245,158,11,0.1);
      color: #D97706;
      border-color: rgba(245,158,11,0.3);
    }
    .action-btn--nudge:hover { background: rgba(245,158,11,0.2); }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px;
      color: var(--color-text-muted);
      font-size: 14px;
    }
    .empty-state p { margin: 0; }

    /* SR only utility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .prow {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }
  `]
})
export class ProfilingDept {
  protected search = signal('');
  protected activeFilter = signal<'all' | GateStatus>('all');
  protected sort = signal<'priority' | 'overdue' | 'completion' | 'updated'>('priority');

  protected projects = signal<ProfilingProject[]>(MOCK_PROJECTS);

  protected activeProjects = computed(() =>
    this.projects().filter(p => p.gateStatus !== 'approved')
  );

  protected overdueProjects = computed(() =>
    this.projects().filter(p => p.gateStatus === 'overdue')
  );

  protected kpis = [
    {
      label: 'Total in Profiling',
      value: computed(() => this.projects().length),
      bg: 'var(--color-accent)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      label: 'Pending Gate Review',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'pending-review').length),
      bg: '#8B5CF6',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
      label: 'Overdue',
      value: computed(() => this.overdueProjects().length),
      bg: '#F59E0B',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    },
    {
      label: 'Approved This Month',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'approved').length),
      bg: '#22C55E',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
  ];

  protected filters = [
    { label: 'All', value: 'all' as const, count: computed(() => this.projects().length) },
    { label: 'In Progress', value: 'in-progress' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-progress').length) },
    { label: 'Pending Review', value: 'pending-review' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'pending-review').length) },
    { label: 'Overdue', value: 'overdue' as const, count: computed(() => this.overdueProjects().length) },
    { label: 'Not Started', value: 'not-started' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'not-started').length) },
    { label: 'Approved', value: 'approved' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'approved').length) },
  ];

  protected displayed = computed(() => {
    const q = this.search().toLowerCase();
    const filter = this.activeFilter();
    const sortBy = this.sort();

    let list = this.projects().filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || p.gateStatus === filter;
      return matchesSearch && matchesFilter;
    });

    if (sortBy === 'priority') {
      const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sortBy === 'overdue') {
      list = [...list].sort((a, b) => (b.daysInStage - b.targetDays) - (a.daysInStage - a.targetDays));
    } else if (sortBy === 'completion') {
      list = [...list].sort((a, b) => a.completionPct - b.completionPct);
    }

    return list;
  });

  protected gateBadgeVariant(status: GateStatus): 'success' | 'warning' | 'info' | 'default' | 'secondary' {
    switch (status) {
      case 'approved':       return 'success';
      case 'pending-review': return 'info';
      case 'overdue':        return 'warning';
      case 'in-progress':    return 'default';
      case 'not-started':    return 'default';
    }
  }

  protected gateLabel(status: GateStatus): string {
    switch (status) {
      case 'approved':       return 'Approved';
      case 'pending-review': return 'Pending Review';
      case 'overdue':        return 'Overdue';
      case 'in-progress':    return 'In Progress';
      case 'not-started':    return 'Not Started';
    }
  }

  protected approveGate(project: ProfilingProject) {
    this.projects.update(list =>
      list.map(p => p.id === project.id ? { ...p, gateStatus: 'approved' as GateStatus } : p)
    );
  }

  protected nudgeClient(project: ProfilingProject) {
    // TODO: trigger email/in-app notification to client
    alert(`Reminder sent to ${project.client} for "${project.name}"`);
  }
}
