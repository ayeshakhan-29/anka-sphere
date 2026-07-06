import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

type TabId = 'projects' | 'budget' | 'adcopy' | 'tasks';

interface PaidProject {
  id: string; name: string; client: string; clientInitials: string;
  budget?: string; strategy?: string; channels: string;
  paidTasksDone: number; paidTasksTotal: number;
  completedAt?: string;
}

interface PaidTask {
  id: string; title: string; status: string; priority: string;
  projectName: string; client: string; projectId: string;
}

@Component({
  selector: 'app-paid-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="pm-page">

      <!-- Header -->
      <div class="pm-header">
        <div class="pm-header-left">
          <div class="dept-badge" aria-hidden="true">PA</div>
          <div>
            <h2 class="pm-title">Paid Marketing</h2>
            <p class="pm-sub">Product Growth · Paid campaigns · {{ projects().length }} projects</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Paid marketing summary">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div><div class="kpi-val">{{ k.value() }}</div><div class="kpi-lbl">{{ k.label }}</div></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Paid marketing sections">
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
            <span>Project / Client</span><span>Budget</span><span>Paid Tasks</span><span>Status</span><span></span>
          </div>
          <div class="proj-list" role="list" aria-label="Paid marketing projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="prow" role="listitem">
                <div class="prow-id">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div><span class="prow-name">{{ p.name }}</span><span class="prow-client">{{ p.client }}</span></div>
                </div>
                <div class="budget-cell">{{ p.budget || '—' }}</div>
                <div class="tasks-cell">
                  <span class="tasks-num">{{ p.paidTasksDone }}/{{ p.paidTasksTotal }}</span>
                  @if (p.paidTasksTotal > 0) {
                    <div class="mini-bar" role="progressbar"
                      [attr.aria-valuenow]="pct(p.paidTasksDone, p.paidTasksTotal)"
                      aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill" [style.width.%]="pct(p.paidTasksDone, p.paidTasksTotal)"></div>
                    </div>
                  }
                </div>
                <div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="success">Active</ui-badge> }
                </div>
                <a class="btn-open" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open</a>
              </article>
            } @empty {
              <div class="empty-state">No projects in paid marketing stage.</div>
            }
          </div>
        }

        <!-- Budget & Strategy tab -->
        @if (activeTab() === 'budget') {
          <div class="budget-grid" role="list" aria-label="Project budgets">
            @for (p of displayedProjects(); track p.id) {
              <article class="budget-card" role="listitem">
                <div class="bc-header">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div class="bc-info">
                    <span class="bc-name">{{ p.name }}</span>
                    <span class="bc-client">{{ p.client }}</span>
                  </div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="success">Active</ui-badge> }
                </div>

                <div class="bc-budget">
                  <span class="bc-budget-label">Budget</span>
                  <span class="bc-budget-val">{{ p.budget || 'Not set' }}</span>
                </div>

                @if (p.channels) {
                  <div class="bc-section">
                    <span class="bc-sec-label">Channels</span>
                    <div class="bc-channels">
                      @for (ch of splitChannels(p.channels); track ch) {
                        <span class="channel-chip">{{ ch }}</span>
                      }
                    </div>
                  </div>
                }

                @if (p.strategy) {
                  <div class="bc-section">
                    <span class="bc-sec-label">Strategy</span>
                    <p class="bc-strategy">{{ p.strategy }}</p>
                  </div>
                }

                <a class="proj-link" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open project →</a>
              </article>
            } @empty {
              <div class="empty-state" style="grid-column: 1/-1">No projects in paid marketing stage.</div>
            }
          </div>
        }

        <!-- Ad Copy tab -->
        @if (activeTab() === 'adcopy') {
          <section class="adcopy-panel" aria-label="AI ad copy generator">
            <div class="adcopy-card">
              <div class="adcopy-label">✨ AI ad copy — written in the client's brand voice</div>
              <div class="adcopy-controls">
                <select class="adcopy-select" [value]="adProjectId()" (change)="adProjectId.set($any($event.target).value)"
                  aria-label="Client project" [disabled]="adWriting()">
                  <option value="">— Select project —</option>
                  @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
                </select>
                <div class="network-toggle" role="group" aria-label="Ad network">
                  <button class="net-btn" [class.active]="adNetwork() === 'GOOGLE'" (click)="adNetwork.set('GOOGLE')"
                    [attr.aria-pressed]="adNetwork() === 'GOOGLE'" [disabled]="adWriting()">Google Ads</button>
                  <button class="net-btn" [class.active]="adNetwork() === 'META'" (click)="adNetwork.set('META')"
                    [attr.aria-pressed]="adNetwork() === 'META'" [disabled]="adWriting()">Meta</button>
                </div>
              </div>
              <div class="adcopy-controls">
                <input class="adcopy-goal" type="text"
                  placeholder="Campaign goal — e.g. drive first-time subscriptions for the summer veg box"
                  [value]="adGoal()" (input)="adGoal.set($any($event.target).value)" [disabled]="adWriting()"
                  aria-label="Campaign goal" />
                <button class="btn-generate" (click)="writeAdCopy()"
                  [disabled]="adWriting() || !adProjectId() || adGoal().trim().length < 3">
                  @if (adWriting()) { Writing… } @else { Generate Copy }
                </button>
              </div>
              @if (adError()) { <div class="adcopy-error" role="alert">{{ adError() }}</div> }
            </div>

            @if (adHeadlines().length > 0) {
              <div class="adcopy-results">
                <div class="adcopy-col">
                  <div class="adcopy-col-title">Headlines <span class="col-limit">{{ adNetwork() === 'GOOGLE' ? 'max 30 chars' : 'max 40 chars' }}</span></div>
                  @for (h of adHeadlines(); track $index) {
                    <button class="copy-line" (click)="copyLine(h)" [attr.aria-label]="'Copy headline: ' + h">
                      <span class="copy-text">{{ h }}</span>
                      <span class="copy-chars" [class.over]="h.length > (adNetwork() === 'GOOGLE' ? 30 : 40)">{{ h.length }}</span>
                    </button>
                  }
                </div>
                <div class="adcopy-col">
                  <div class="adcopy-col-title">{{ adNetwork() === 'GOOGLE' ? 'Descriptions' : 'Primary Text' }} <span class="col-limit">{{ adNetwork() === 'GOOGLE' ? 'max 90 chars' : '80–125 chars' }}</span></div>
                  @for (d of adDescriptions(); track $index) {
                    <button class="copy-line" (click)="copyLine(d)" [attr.aria-label]="'Copy description: ' + d">
                      <span class="copy-text">{{ d }}</span>
                      <span class="copy-chars" [class.over]="d.length > (adNetwork() === 'GOOGLE' ? 90 : 125)">{{ d.length }}</span>
                    </button>
                  }
                </div>
              </div>
              <p class="adcopy-hint">Click any line to copy it. {{ copiedLine() ? '✓ Copied!' : '' }}</p>
            }
          </section>
        }

        <!-- Tasks tab -->
        @if (activeTab() === 'tasks') {
          <div class="filter-row" role="group" aria-label="Filter by status">
            @for (f of taskFilters; track f.value) {
              <button class="ftab" [class.active]="taskFilter() === f.value" (click)="taskFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="task-header" aria-hidden="true">
            <span>Task</span><span>Project</span><span>Priority</span><span>Status</span>
          </div>
          <div class="task-list" role="list" aria-label="Paid marketing tasks">
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
              <div class="empty-state">No paid tasks yet. Add PAID-category tasks in the Marketing workspace.</div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .pm-page { display: flex; flex-direction: column; gap: 16px; }
    .pm-header { display: flex; align-items: center; justify-content: space-between; }
    .pm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #EF4444; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .pm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .pm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #EF4444; }

    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #EF4444; border-bottom-color: #EF4444; }
    .tab-count { background: #FEE2E2; color: #B91C1C; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #EF4444; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .list-header { display: grid; grid-template-columns: 1fr 120px 150px 100px 80px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .proj-list { display: flex; flex-direction: column; gap: 6px; }
    .prow { display: grid; grid-template-columns: 1fr 120px 150px 100px 80px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .prow:hover { box-shadow: var(--shadow-raised); }
    .prow-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .prow-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prow-client { display: block; font-size: 11.5px; color: var(--color-text-muted); }
    .budget-cell { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .tasks-cell { display: flex; flex-direction: column; gap: 4px; }
    .tasks-num { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #EF4444; border-radius: 4px; }
    .btn-open { height: 28px; padding: 0 10px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center; transition: background 0.12s; }
    .btn-open:hover { background: var(--color-border); color: var(--color-text); }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    .budget-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .budget-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .budget-card:hover { box-shadow: var(--shadow-raised); }
    .bc-header { display: flex; align-items: center; gap: 10px; }
    .bc-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .bc-name { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bc-client { font-size: 12px; color: var(--color-text-muted); }
    .bc-budget { display: flex; align-items: baseline; gap: 8px; }
    .bc-budget-label { font-size: 11.5px; color: var(--color-text-muted); }
    .bc-budget-val { font-size: 18px; font-weight: 700; color: #EF4444; }
    .bc-section { display: flex; flex-direction: column; gap: 4px; }
    .bc-sec-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .bc-channels { display: flex; flex-wrap: wrap; gap: 4px; }
    .channel-chip { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #FEE2E2; color: #B91C1C; }
    .bc-strategy { font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .proj-link { font-size: 12.5px; font-weight: 500; color: #EF4444; text-decoration: none; }
    .proj-link:hover { text-decoration: underline; }

    /* Ad copy generator */
    .adcopy-panel { display: flex; flex-direction: column; gap: 16px; }
    .adcopy-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow-card); }
    .adcopy-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); }
    .adcopy-controls { display: flex; gap: 8px; flex-wrap: wrap; }
    .adcopy-select { height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); cursor: pointer; min-width: 220px; }
    .network-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
    .net-btn { height: 34px; padding: 0 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; }
    .net-btn.active { background: #EF4444; color: #fff; }
    .adcopy-goal { flex: 1; min-width: 260px; height: 34px; padding: 0 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .adcopy-goal:focus { border-color: #EF4444; }
    .btn-generate { height: 34px; padding: 0 16px; background: #EF4444; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-generate:disabled { opacity: 0.6; cursor: default; }
    .adcopy-error { font-size: 12px; color: #DC2626; font-weight: 500; }
    .adcopy-results { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 900px) { .adcopy-results { grid-template-columns: 1fr; } }
    .adcopy-col { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 14px; display: flex; flex-direction: column; gap: 6px; }
    .adcopy-col-title { font-size: 12px; font-weight: 700; color: var(--color-text); margin-bottom: 4px; }
    .col-limit { font-size: 10.5px; font-weight: 500; color: var(--color-text-muted); margin-left: 6px; }
    .copy-line { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: transparent; font-family: var(--font-sans); cursor: pointer; text-align: left; transition: border-color 0.12s, background 0.12s; }
    .copy-line:hover { border-color: #EF4444; background: #FEF2F2; }
    .copy-text { font-size: 13px; color: var(--color-text); line-height: 1.45; }
    .copy-chars { font-size: 10.5px; font-weight: 700; color: var(--color-text-muted); flex-shrink: 0; }
    .copy-chars.over { color: #DC2626; }
    .adcopy-hint { font-size: 11.5px; color: var(--color-text-muted); margin: 0; }

    .filter-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .ftab { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .ftab:hover { border-color: #EF4444; color: #B91C1C; }
    .ftab.active { background: #EF4444; color: #fff; border-color: #EF4444; }
    .ftab-count { font-size: 10.5px; font-weight: 700; }

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
export class PaidDept implements OnInit {
  private projectService = inject(ProjectService);
  protected search      = signal('');
  protected activeTab   = signal<TabId>('projects');
  protected taskFilter  = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading     = signal(true);
  protected projects    = signal<PaidProject[]>([]);
  protected allTasks    = signal<PaidTask[]>([]);

  readonly tabs = [
    { id: 'projects' as TabId, label: 'Projects',            count: computed(() => this.projects().length) },
    { id: 'budget'   as TabId, label: 'Budget & Strategy',   count: computed(() => this.projects().filter(p => !!p.budget).length) },
    { id: 'adcopy'   as TabId, label: 'Ad Copy',             count: computed(() => 0) },
    { id: 'tasks'    as TabId, label: 'Tasks',               count: computed(() => this.allTasks().length) },
  ];

  // AI ad copy
  protected adProjectId    = signal('');
  protected adNetwork      = signal<'GOOGLE' | 'META'>('GOOGLE');
  protected adGoal         = signal('');
  protected adWriting      = signal(false);
  protected adError        = signal<string | null>(null);
  protected adHeadlines    = signal<string[]>([]);
  protected adDescriptions = signal<string[]>([]);
  protected copiedLine     = signal(false);

  protected writeAdCopy(): void {
    this.adError.set(null);
    this.adWriting.set(true);
    this.projectService.generateAiAdCopy(this.adProjectId(), {
      network: this.adNetwork(),
      goal: this.adGoal().trim(),
    }).subscribe({
      next: (res) => {
        this.adHeadlines.set(res.headlines);
        this.adDescriptions.set(res.descriptions);
        this.adWriting.set(false);
      },
      error: (err) => {
        this.adError.set(err?.error?.error ?? 'Ad copy generation failed. Please try again.');
        this.adWriting.set(false);
      },
    });
  }

  protected async copyLine(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    this.copiedLine.set(true);
    setTimeout(() => this.copiedLine.set(false), 1500);
  }

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    { label: 'Active',       value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#EF4444', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 010 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>` },
    { label: 'Completed',    value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Paid Tasks',   value: computed(() => `${this.allTasks().filter(t=>t.status==='DONE').length}/${this.allTasks().length}`), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
    { label: 'Total',        value: computed(() => this.projects().length), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
  ];

  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  });

  protected displayedTasks = computed(() => {
    const f = this.taskFilter();
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
        const tasks: PaidTask[] = [];
        for (const p of active) {
          for (const t of (p.marketing?.tasks ?? []).filter(t => t.category === 'PAID')) {
            tasks.push({ id: t.id, title: t.title, status: t.status, priority: t.priority ?? 'MEDIUM', projectName: p.name, client: p.clientName, projectId: p.id });
          }
        }
        this.allTasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): PaidProject {
    const paid = (p.marketing?.tasks ?? []).filter(t => t.category === 'PAID');
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      budget:   p.marketing?.budget,
      strategy: p.marketing?.strategy,
      channels: p.marketing?.channels ?? '',
      paidTasksDone:  paid.filter(t => t.status === 'DONE').length,
      paidTasksTotal: paid.length,
      completedAt: p.marketing?.completedAt,
    };
  }

  protected splitChannels(raw: string): string[] {
    return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
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
