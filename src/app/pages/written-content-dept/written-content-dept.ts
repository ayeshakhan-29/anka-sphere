import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { Project } from '../../models/project.models';

type ContentGateStatus = 'not-started' | 'drafting' | 'in-review' | 'pending-gate' | 'approved' | 'overdue';

interface ContentPage {
  title: string;
  status: 'draft' | 'in-review' | 'approved' | 'revision';
  wordCount: number;
}

interface ContentProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  assignedTo: string[];
  gateStatus: ContentGateStatus;
  briefDone: boolean;
  toneOfVoiceDone: boolean;
  pages: ContentPage[];
  totalWords: number;
  daysInStage: number;
  targetDays: number;
  lastUpdated: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

const MOCK_PROJECTS: ContentProject[] = [
  {
    id: '4',
    name: 'Corporate Website',
    client: 'Nexus Holdings',
    clientInitials: 'NH',
    assignedTo: ['JD', 'AK'],
    gateStatus: 'drafting',
    briefDone: true,
    toneOfVoiceDone: true,
    pages: [
      { title: 'Home', status: 'approved', wordCount: 820 },
      { title: 'About', status: 'in-review', wordCount: 610 },
      { title: 'Services', status: 'draft', wordCount: 340 },
      { title: 'Contact', status: 'draft', wordCount: 120 },
    ],
    totalWords: 1890,
    daysInStage: 5,
    targetDays: 10,
    lastUpdated: '3 days ago',
    priority: 'high',
  },
  {
    id: '11',
    name: 'Healthcare Platform',
    client: 'MedCore Solutions',
    clientInitials: 'MC',
    assignedTo: ['SM', 'AK'],
    gateStatus: 'pending-gate',
    briefDone: true,
    toneOfVoiceDone: true,
    pages: [
      { title: 'Home', status: 'approved', wordCount: 950 },
      { title: 'Services', status: 'approved', wordCount: 1100 },
      { title: 'About', status: 'approved', wordCount: 700 },
      { title: 'Blog Post 1', status: 'approved', wordCount: 1500 },
      { title: 'Contact', status: 'approved', wordCount: 200 },
    ],
    totalWords: 4450,
    daysInStage: 9,
    targetDays: 12,
    lastUpdated: 'Yesterday',
    priority: 'high',
    notes: 'All pages approved — awaiting manager gate sign-off.',
  },
  {
    id: '12',
    name: 'Travel Agency Rebrand',
    client: 'WanderCo',
    clientInitials: 'WC',
    assignedTo: ['LT'],
    gateStatus: 'overdue',
    briefDone: true,
    toneOfVoiceDone: false,
    pages: [
      { title: 'Home', status: 'draft', wordCount: 210 },
      { title: 'Destinations', status: 'draft', wordCount: 0 },
    ],
    totalWords: 210,
    daysInStage: 16,
    targetDays: 10,
    lastUpdated: '6 days ago',
    priority: 'high',
    notes: 'Tone of Voice doc missing. No update in 6 days.',
  },
  {
    id: '13',
    name: 'Fashion E-Commerce',
    client: 'AuraWear',
    clientInitials: 'AW',
    assignedTo: ['JD'],
    gateStatus: 'in-review',
    briefDone: true,
    toneOfVoiceDone: true,
    pages: [
      { title: 'Home', status: 'approved', wordCount: 600 },
      { title: 'Shop', status: 'in-review', wordCount: 450 },
      { title: 'About', status: 'in-review', wordCount: 380 },
      { title: 'Blog Post 1', status: 'revision', wordCount: 1200 },
    ],
    totalWords: 2630,
    daysInStage: 7,
    targetDays: 12,
    lastUpdated: 'Today',
    priority: 'medium',
  },
  {
    id: '14',
    name: 'Logistics Portal',
    client: 'FastHaul',
    clientInitials: 'FH',
    assignedTo: ['AK'],
    gateStatus: 'not-started',
    briefDone: false,
    toneOfVoiceDone: false,
    pages: [],
    totalWords: 0,
    daysInStage: 1,
    targetDays: 10,
    lastUpdated: 'Today',
    priority: 'low',
  },
];

@Component({
  selector: 'app-written-content-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="wcd-page">

      <!-- Header -->
      <div class="wcd-header">
        <div class="wcd-header-left">
          <div class="dept-badge">Stage 2</div>
          <div>
            <h2 class="wcd-title">Written Content</h2>
            <p class="wcd-sub">Product Modelling · Hard Gate &nbsp;·&nbsp; {{ activeProjects().length }} active</p>
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
      <div class="kpi-strip" role="list" aria-label="Written content stage summary">
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
          &nbsp;·&nbsp;Immediate attention required.
        </div>
      }

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
          <label for="wc-sort" class="sr-only">Sort projects</label>
          <select id="wc-sort" class="sort-select" (change)="sort.set($any($event.target).value)">
            <option value="priority">Sort: Priority</option>
            <option value="overdue">Sort: Most Overdue</option>
            <option value="pages">Sort: Page Count</option>
            <option value="words">Sort: Word Count</option>
          </select>
        </div>
      </div>

      <!-- Project rows -->
      <div class="project-list" role="list" aria-label="Projects in written content stage">
        @for (project of displayed(); track project.id) {
          <article
            class="prow"
            role="listitem"
            [class.prow--overdue]="project.gateStatus === 'overdue'"
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

            <!-- Brief status chips -->
            <div class="prow-prereqs" aria-label="Prerequisites for {{ project.name }}">
              <div class="prereq-chip" [class.done]="project.briefDone" [title]="project.briefDone ? 'Content Brief done' : 'Content Brief missing'">
                @if (project.briefDone) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                Brief
              </div>
              <div class="prereq-chip" [class.done]="project.toneOfVoiceDone" [title]="project.toneOfVoiceDone ? 'Tone of Voice done' : 'Tone of Voice missing'">
                @if (project.toneOfVoiceDone) {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                }
                ToV
              </div>
            </div>

            <!-- Pages breakdown -->
            <div class="prow-pages" aria-label="Pages for {{ project.name }}">
              @if (project.pages.length === 0) {
                <span class="no-pages">No pages yet</span>
              } @else {
                <div class="page-dots" aria-label="{{ project.pages.length }} pages">
                  @for (page of project.pages; track page.title) {
                    <div
                      class="page-dot"
                      [class.page-dot--approved]="page.status === 'approved'"
                      [class.page-dot--review]="page.status === 'in-review'"
                      [class.page-dot--revision]="page.status === 'revision'"
                      [title]="page.title + ' — ' + page.status + ' (' + page.wordCount + ' words)'"
                      role="img"
                      [attr.aria-label]="page.title + ' ' + page.status"
                    ></div>
                  }
                </div>
                <span class="pages-summary">
                  {{ approvedCount(project) }}/{{ project.pages.length }} approved
                </span>
              }
            </div>

            <!-- Word count -->
            <div class="prow-words">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span class="words-val">{{ project.totalWords.toLocaleString() }}</span>
              <span class="words-label">words</span>
            </div>

            <!-- Days in stage -->
            <div class="prow-days" [class.prow-days--over]="project.daysInStage > project.targetDays">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ project.daysInStage }}d / {{ project.targetDays }}d</span>
              @if (project.daysInStage > project.targetDays) {
                <span class="overdue-tag">{{ project.daysInStage - project.targetDays }}d over</span>
              }
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
                <button class="action-btn action-btn--approve" (click)="approveGate(project)" [attr.aria-label]="'Approve gate for ' + project.name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Approve
                </button>
              }
              @if (project.gateStatus === 'overdue') {
                <button class="action-btn action-btn--nudge" (click)="nudge(project)" [attr.aria-label]="'Nudge team for ' + project.name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.04 2 2 2 0 012 .04h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  Nudge
                </button>
              }
              <a
                class="action-btn action-btn--open"
                [routerLink]="['/app/projects', project.id, 'content']"
                [attr.aria-label]="'Open written content for ' + project.name"
              >
                Open
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>

          </article>
        } @empty {
          <div class="empty-state" role="status">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No projects match your filter.</p>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .wcd-page { width: 100%; }

    .wcd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .wcd-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      background: rgba(139,92,246,0.12);
      color: #8B5CF6;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .wcd-title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .wcd-sub {
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
    .search-input:focus { border-color: #8B5CF6; }
    .search-input::placeholder { color: var(--color-text-muted); }

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
    }

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
    .ftab.active { color: var(--color-text); border-bottom-color: #8B5CF6; }
    .ftab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .ftab.active .ftab-count {
      background: rgba(139,92,246,0.12);
      color: #8B5CF6;
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
    .sort-select:focus { border-color: #8B5CF6; }

    /* Rows */
    .project-list { display: flex; flex-direction: column; gap: 8px; }

    .prow {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 170px 70px 145px 88px 105px 108px 58px 62px min-content;
      align-items: center;
      gap: 10px;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .prow:hover { box-shadow: var(--shadow-raised); border-color: var(--color-border-strong); }
    .prow--overdue { border-left: 3px solid #F59E0B; }
    .prow--approved { border-left: 3px solid #22C55E; }
    .prow--gate { border-left: 3px solid #8B5CF6; }

    .prow-identity { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
    .p-avatar {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: #8B5CF6;
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
    .p-note { font-size: 11px; color: #F59E0B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

    /* Pages */
    .prow-pages { display: flex; flex-direction: column; gap: 5px; }
    .page-dots { display: flex; flex-wrap: wrap; gap: 4px; }
    .page-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      cursor: default;
    }
    .page-dot--approved { background: #22C55E; border-color: #22C55E; }
    .page-dot--review   { background: #8B5CF6; border-color: #8B5CF6; }
    .page-dot--revision { background: #F59E0B; border-color: #F59E0B; }
    .pages-summary { font-size: 11px; color: var(--color-text-secondary); }
    .no-pages { font-size: 11px; color: var(--color-text-muted); font-style: italic; }

    /* Words */
    .prow-words {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-secondary);
    }
    .words-val { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .words-label { font-size: 11px; }

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
      background: rgba(34,197,94,0.1);
      color: #16A34A;
      border-color: rgba(34,197,94,0.3);
    }
    .action-btn--approve:hover { background: rgba(34,197,94,0.2); }
    .action-btn--nudge {
      background: rgba(245,158,11,0.1);
      color: #D97706;
      border-color: rgba(245,158,11,0.3);
    }
    .action-btn--nudge:hover { background: rgba(245,158,11,0.2); }

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
export class WrittenContentDept implements OnInit {
  private projectService = inject(ProjectService);
  private notifService = inject(NotificationService);

  protected search = signal('');
  protected activeFilter = signal<'all' | ContentGateStatus>('all');
  protected sort = signal<'priority' | 'overdue' | 'pages' | 'words'>('priority');
  protected loading = signal(true);

  protected projects = signal<ContentProject[]>([]);

  protected activeProjects = computed(() =>
    this.projects().filter(p => p.gateStatus !== 'approved')
  );

  protected overdueProjects = computed(() =>
    this.projects().filter(p => p.gateStatus === 'overdue')
  );

  protected kpis = [
    {
      label: 'Total in Content',
      value: computed(() => this.projects().length),
      bg: '#8B5CF6',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    },
    {
      label: 'Pending Gate Review',
      value: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length),
      bg: '#6D28D9',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
      label: 'Overdue',
      value: computed(() => this.overdueProjects().length),
      bg: '#F59E0B',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    },
    {
      label: 'Total Words Written',
      value: computed(() => {
        const total = this.projects().reduce((sum, p) => sum + p.totalWords, 0);
        return total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toString();
      }),
      bg: '#22C55E',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="14" y2="14"/></svg>`,
    },
  ];

  protected filters = [
    { label: 'All', value: 'all' as const, count: computed(() => this.projects().length) },
    { label: 'Drafting', value: 'drafting' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'drafting').length) },
    { label: 'In Review', value: 'in-review' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'in-review').length) },
    { label: 'Pending Gate', value: 'pending-gate' as const, count: computed(() => this.projects().filter(p => p.gateStatus === 'pending-gate').length) },
    { label: 'Overdue', value: 'overdue' as const, count: computed(() => this.overdueProjects().length) },
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
    } else if (sortBy === 'overdue') {
      list = [...list].sort((a, b) => (b.daysInStage - b.targetDays) - (a.daysInStage - a.targetDays));
    } else if (sortBy === 'pages') {
      list = [...list].sort((a, b) => b.pages.length - a.pages.length);
    } else if (sortBy === 'words') {
      list = [...list].sort((a, b) => b.totalWords - a.totalWords);
    }

    return list;
  });

  protected approvedCount(project: ContentProject): number {
    return project.pages.filter(p => p.status === 'approved').length;
  }

  protected gateBadgeVariant(status: ContentGateStatus): 'success' | 'warning' | 'info' | 'default' | 'secondary' {
    switch (status) {
      case 'approved':      return 'success';
      case 'pending-gate':  return 'info';
      case 'overdue':       return 'warning';
      case 'in-review':     return 'info';
      case 'drafting':      return 'default';
      case 'not-started':   return 'secondary';
    }
  }

  protected gateLabel(status: ContentGateStatus): string {
    switch (status) {
      case 'approved':      return 'Approved';
      case 'pending-gate':  return 'Pending Gate';
      case 'overdue':       return 'Overdue';
      case 'in-review':     return 'In Review';
      case 'drafting':      return 'Drafting';
      case 'not-started':   return 'Not Started';
    }
  }

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(
          projects
            .filter(p => p.currentStage === 'WRITTEN_CONTENT')
            .map(p => this.mapProject(p))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): ContentProject {
    const entry = p.pipeline.find(e => e.stage === 'WRITTEN_CONTENT');
    const daysInStage = entry?.startedAt
      ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 86400000)
      : 0;
    const targetDays = 10;
    const content = p.content;
    const pages: ContentPage[] = (content?.pages ?? []).map(pg => ({
      title: pg.title,
      status: (pg.status.toLowerCase() === 'in_review' ? 'in-review' : pg.status.toLowerCase()) as ContentPage['status'],
      wordCount: pg.wordCount ?? 0,
    }));
    const totalWords = pages.reduce((s, pg) => s + pg.wordCount, 0);
    const briefDone = !!(content?.contentBrief);
    const toneOfVoiceDone = !!(content?.toneOfVoice);
    const approvedPages = pages.filter(pg => pg.status === 'approved').length;
    let gateStatus: ContentGateStatus;
    if (entry?.status === 'APPROVED')         gateStatus = 'approved';
    else if (daysInStage > targetDays)        gateStatus = 'overdue';
    else if (approvedPages === pages.length && pages.length > 0) gateStatus = 'pending-gate';
    else if (pages.some(pg => pg.status === 'in-review'))        gateStatus = 'in-review';
    else if (entry?.status === 'IN_PROGRESS') gateStatus = 'drafting';
    else                                      gateStatus = 'not-started';
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      assignedTo: p.members.map(m => m.user.name.slice(0, 2).toUpperCase()),
      gateStatus, briefDone, toneOfVoiceDone, pages, totalWords,
      daysInStage, targetDays,
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

  protected approveGate(project: ContentProject) {
    this.projects.update(list =>
      list.map(p => p.id === project.id ? { ...p, gateStatus: 'approved' as ContentGateStatus } : p)
    );
  }

  protected nudge(project: ContentProject) {
    this.notifService.toast(`Reminder sent to team for "${project.name}"`, 'info');
  }
}
