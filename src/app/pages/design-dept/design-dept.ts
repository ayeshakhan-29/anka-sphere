import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';

type DesignGateStatus = 'not-started' | 'in-progress' | 'in-review' | 'pending-gate' | 'approved';

interface TaskBreakdown {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

interface DesignProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  assignedTo: string[];
  gateStatus: DesignGateStatus;
  briefDone: boolean;
  styleGuideDone: boolean;
  figmaLinked: boolean;
  tasks: TaskBreakdown;
  assetsCount: number;
  assetsApproved: number;
  daysInStage: number;
  targetDays: number;
  lastUpdated: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

const MOCK_PROJECTS: DesignProject[] = [
  {
    id: '1',
    name: 'Brand Refresh & Website',
    client: 'Lumina Studios',
    clientInitials: 'LS',
    assignedTo: ['SM', 'AK'],
    gateStatus: 'in-progress',
    briefDone: true,
    styleGuideDone: true,
    figmaLinked: true,
    tasks: { todo: 3, inProgress: 2, inReview: 1, done: 6 },
    assetsCount: 12,
    assetsApproved: 8,
    daysInStage: 14,
    targetDays: 21,
    lastUpdated: 'Today',
    priority: 'high',
  },
  {
    id: '15',
    name: 'E-Commerce UI Kit',
    client: 'Verdant Market',
    clientInitials: 'VM',
    assignedTo: ['SM'],
    gateStatus: 'in-review',
    briefDone: true,
    styleGuideDone: true,
    figmaLinked: true,
    tasks: { todo: 0, inProgress: 1, inReview: 4, done: 10 },
    assetsCount: 22,
    assetsApproved: 18,
    daysInStage: 18,
    targetDays: 21,
    lastUpdated: 'Yesterday',
    priority: 'high',
    notes: '4 assets pending client feedback.',
  },
  {
    id: '16',
    name: 'Healthcare Brand Identity',
    client: 'MedCore Solutions',
    clientInitials: 'MC',
    assignedTo: ['AK', 'SM'],
    gateStatus: 'pending-gate',
    briefDone: true,
    styleGuideDone: true,
    figmaLinked: true,
    tasks: { todo: 0, inProgress: 0, inReview: 0, done: 14 },
    assetsCount: 18,
    assetsApproved: 18,
    daysInStage: 20,
    targetDays: 21,
    lastUpdated: '2 days ago',
    priority: 'medium',
    notes: 'All tasks done — Soft Gate ready to proceed.',
  },
  {
    id: '17',
    name: 'Mobile App Screens',
    client: 'Stackflow Inc.',
    clientInitials: 'SI',
    assignedTo: ['SM'],
    gateStatus: 'not-started',
    briefDone: false,
    styleGuideDone: false,
    figmaLinked: false,
    tasks: { todo: 0, inProgress: 0, inReview: 0, done: 0 },
    assetsCount: 0,
    assetsApproved: 0,
    daysInStage: 2,
    targetDays: 21,
    lastUpdated: 'Today',
    priority: 'low',
  },
  {
    id: '18',
    name: 'Luxury Real Estate Visuals',
    client: 'Meridian Group',
    clientInitials: 'MG',
    assignedTo: ['AK'],
    gateStatus: 'approved',
    briefDone: true,
    styleGuideDone: true,
    figmaLinked: true,
    tasks: { todo: 0, inProgress: 0, inReview: 0, done: 9 },
    assetsCount: 15,
    assetsApproved: 15,
    daysInStage: 19,
    targetDays: 21,
    lastUpdated: '3 days ago',
    priority: 'medium',
  },
];

@Component({
  selector: 'app-design-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="dd-page">

      <!-- Header -->
      <div class="dd-header">
        <div class="dd-header-left">
          <div class="dept-badge">Stage 3</div>
          <div>
            <h2 class="dd-title">Design</h2>
            <p class="dd-sub">Product Modelling · Soft Gate &nbsp;·&nbsp; {{ activeProjects().length }} active</p>
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
      <div class="kpi-strip" role="list" aria-label="Design stage summary">
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
        <span><strong>Soft Gate</strong> — Design can proceed to Development in parallel. Gate warnings are advisory; incomplete tasks won't block handoff.</span>
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
            <option value="assets">Sort: Asset Progress</option>
            <option value="days">Sort: Days in Stage</option>
          </select>
        </div>
      </div>

      <!-- Project rows -->
      <div class="project-list" role="list" aria-label="Projects in design stage">
        @for (project of displayed(); track project.id) {
          <article
            class="prow"
            role="listitem"
            [class.prow--approved]="project.gateStatus === 'approved'"
            [class.prow--gate]="project.gateStatus === 'pending-gate'"
          >

            <!-- Identity -->
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

            <!-- Setup chips -->
            <div class="prow-prereqs" aria-label="Setup for {{ project.name }}">
              <div class="prereq-chip" [class.done]="project.briefDone" title="Design Brief">
                @if (project.briefDone) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Brief
              </div>
              <div class="prereq-chip" [class.done]="project.styleGuideDone" title="Style Guide">
                @if (project.styleGuideDone) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Style
              </div>
              <div class="prereq-chip" [class.done]="project.figmaLinked" title="Figma linked">
                @if (project.figmaLinked) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Figma
              </div>
            </div>

            <!-- Kanban mini -->
            <div class="prow-kanban" aria-label="Task breakdown for {{ project.name }}">
              <div class="kanban-col" title="To Do">
                <span class="kc-label">TODO</span>
                <span class="kc-val">{{ project.tasks.todo }}</span>
              </div>
              <div class="kanban-col kc--progress" title="In Progress">
                <span class="kc-label">WIP</span>
                <span class="kc-val">{{ project.tasks.inProgress }}</span>
              </div>
              <div class="kanban-col kc--review" title="In Review">
                <span class="kc-label">REVIEW</span>
                <span class="kc-val">{{ project.tasks.inReview }}</span>
              </div>
              <div class="kanban-col kc--done" title="Done">
                <span class="kc-label">DONE</span>
                <span class="kc-val">{{ project.tasks.done }}</span>
              </div>
            </div>

            <!-- Assets progress -->
            <div class="prow-assets">
              <div class="asset-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span class="asset-val">{{ project.assetsApproved }}/{{ project.assetsCount }}</span>
                <span class="asset-label">assets</span>
              </div>
              @if (project.assetsCount > 0) {
                <div class="asset-bar" role="progressbar" [attr.aria-valuenow]="assetPct(project)" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="project.name + ' assets ' + assetPct(project) + '% approved'">
                  <div class="asset-fill" [style.width.%]="assetPct(project)" [class.asset-fill--full]="assetPct(project) === 100"></div>
                </div>
              }
            </div>

            <!-- Days in stage -->
            <div class="prow-days">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ project.daysInStage }}d / {{ project.targetDays }}d</span>
            </div>

            <!-- Gate status -->
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
            </div>

            <span class="prow-updated" aria-label="Last updated {{ project.lastUpdated }}">{{ project.lastUpdated }}</span>

            <!-- Actions -->
            <div class="prow-actions">
              @if (project.gateStatus === 'pending-gate') {
                <button class="action-btn action-btn--approve" (click)="approveGate(project)" [attr.aria-label]="'Approve soft gate for ' + project.name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Proceed
                </button>
              }
              <a
                class="action-btn action-btn--open"
                [routerLink]="['/app/projects', project.id, 'design']"
                [attr.aria-label]="'Open design workspace for ' + project.name"
              >
                Open
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>

          </article>
        } @empty {
          <div class="empty-state" role="status">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>No projects match your filter.</p>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .dd-page { max-width: 1200px; }

    .dd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .dd-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      background: rgba(236,72,153,0.12);
      color: #EC4899;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .dd-title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .dd-sub {
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
    .search-input:focus { border-color: #EC4899; }
    .search-input::placeholder { color: var(--color-text-muted); }

    /* KPIs */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
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
    .kpi-label { font-size: 12px; color: var(--color-text-secondary); }

    /* Soft gate notice */
    .soft-gate-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 16px;
      margin-bottom: 18px;
      background: rgba(236,72,153,0.07);
      border: 1px solid rgba(236,72,153,0.25);
      border-radius: var(--radius-md);
      font-size: 12.5px;
      color: var(--color-text-secondary);
    }
    .soft-gate-notice svg { flex-shrink: 0; margin-top: 1px; color: #EC4899; }

    /* Filters */
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
    .ftab.active { color: var(--color-text); border-bottom-color: #EC4899; }
    .ftab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .ftab.active .ftab-count {
      background: rgba(236,72,153,0.12);
      color: #EC4899;
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
    .sort-select:focus { border-color: #EC4899; }

    /* Rows */
    .project-list { display: flex; flex-direction: column; gap: 8px; }

    .prow {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 200px 90px 160px 110px 100px 120px 70px 72px auto;
      align-items: center;
      gap: 14px;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .prow:hover { box-shadow: var(--shadow-raised); border-color: var(--color-border-strong); }
    .prow--approved { border-left: 3px solid #22C55E; }
    .prow--gate { border-left: 3px solid #EC4899; }

    .prow-identity { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
    .p-avatar {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: #EC4899;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .p-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .p-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .p-client { font-size: 11.5px; color: var(--color-text-secondary); }
    .p-note { font-size: 11px; color: #EC4899; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Prereqs */
    .prow-prereqs { display: flex; flex-direction: column; gap: 4px; }
    .prereq-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-muted);
    }
    .prereq-chip.done { color: #16A34A; }

    /* Kanban mini */
    .prow-kanban {
      display: flex;
      gap: 6px;
    }
    .kanban-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 5px 7px;
      background: var(--color-surface-raised);
      border-radius: 6px;
      min-width: 36px;
    }
    .kc-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .kc-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text);
    }
    .kc--progress { background: rgba(245,158,11,0.1); }
    .kc--progress .kc-label { color: #D97706; }
    .kc--review { background: rgba(139,92,246,0.1); }
    .kc--review .kc-label { color: #8B5CF6; }
    .kc--done { background: rgba(34,197,94,0.1); }
    .kc--done .kc-label { color: #16A34A; }

    /* Assets */
    .prow-assets { display: flex; flex-direction: column; gap: 5px; }
    .asset-row { display: flex; align-items: center; gap: 4px; color: var(--color-text-secondary); }
    .asset-val { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .asset-label { font-size: 11px; }
    .asset-bar {
      height: 4px;
      background: var(--color-surface-raised);
      border-radius: 10px;
      overflow: hidden;
    }
    .asset-fill {
      height: 100%;
      background: #EC4899;
      border-radius: 10px;
      transition: width 0.3s ease;
    }
    .asset-fill--full { background: #22C55E; }

    /* Days */
    .prow-days {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .prow-gate { display: flex; align-items: center; }

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

    .prow-updated { font-size: 11.5px; color: var(--color-text-muted); white-space: nowrap; }

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
      background: rgba(236,72,153,0.1);
      color: #EC4899;
      border-color: rgba(236,72,153,0.3);
    }
    .action-btn--approve:hover { background: rgba(236,72,153,0.2); }

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

    @media (max-width: 1024px) {
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .prow { grid-template-columns: 1fr; gap: 10px; }
    }
  `]
})
export class DesignDept {
  protected search = signal('');
  protected activeFilter = signal<'all' | DesignGateStatus>('all');
  protected sort = signal<'priority' | 'tasks' | 'assets' | 'days'>('priority');

  protected projects = signal<DesignProject[]>(MOCK_PROJECTS);

  protected activeProjects = computed(() =>
    this.projects().filter(p => p.gateStatus !== 'approved')
  );

  protected totalTasks = computed(() =>
    this.projects().reduce((sum, p) =>
      sum + p.tasks.todo + p.tasks.inProgress + p.tasks.inReview + p.tasks.done, 0)
  );

  protected doneTasks = computed(() =>
    this.projects().reduce((sum, p) => sum + p.tasks.done, 0)
  );

  protected kpis = [
    {
      label: 'Total in Design',
      value: computed(() => this.projects().length),
      bg: '#EC4899',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
    },
    {
      label: 'Pending Soft Gate',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length),
      bg: '#D946EF',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
      label: 'Tasks Done',
      value: computed(() => `${this.doneTasks()}/${this.totalTasks()}`),
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
    { label: 'All', value: 'all' as const, count: computed(() => this.projects().length) },
    { label: 'In Progress', value: 'in-progress' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-progress').length) },
    { label: 'In Review', value: 'in-review' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-review').length) },
    { label: 'Pending Gate', value: 'pending-gate' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length) },
    { label: 'Approved', value: 'approved' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'approved').length) },
  ];

  protected displayed = computed(() => {
    const q = this.search().toLowerCase();
    const filter = this.activeFilter();
    const sortBy = this.sort();

    let list = this.projects().filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
      const matchFilter = filter === 'all' || p.gateStatus === filter;
      return matchSearch && matchFilter;
    });

    if (sortBy === 'priority') {
      const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sortBy === 'tasks') {
      list = [...list].sort((a, b) =>
        (b.tasks.todo + b.tasks.inProgress + b.tasks.inReview) -
        (a.tasks.todo + a.tasks.inProgress + a.tasks.inReview)
      );
    } else if (sortBy === 'assets') {
      list = [...list].sort((a, b) => this.assetPct(a) - this.assetPct(b));
    } else if (sortBy === 'days') {
      list = [...list].sort((a, b) => b.daysInStage - a.daysInStage);
    }

    return list;
  });

  protected assetPct(project: DesignProject): number {
    if (project.assetsCount === 0) return 0;
    return Math.round((project.assetsApproved / project.assetsCount) * 100);
  }

  protected gateBadgeVariant(status: DesignGateStatus): 'success' | 'warning' | 'info' | 'default' | 'secondary' {
    switch (status) {
      case 'approved':      return 'success';
      case 'pending-gate':  return 'info';
      case 'in-review':     return 'info';
      case 'in-progress':   return 'default';
      case 'not-started':   return 'secondary';
    }
  }

  protected gateLabel(status: DesignGateStatus): string {
    switch (status) {
      case 'approved':      return 'Approved';
      case 'pending-gate':  return 'Pending Gate';
      case 'in-review':     return 'In Review';
      case 'in-progress':   return 'In Progress';
      case 'not-started':   return 'Not Started';
    }
  }

  protected approveGate(project: DesignProject) {
    this.projects.update(list =>
      list.map(p => p.id === project.id ? { ...p, gateStatus: 'approved' as DesignGateStatus } : p)
    );
  }
}
