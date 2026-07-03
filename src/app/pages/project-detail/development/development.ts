import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Badge } from '../../../ui';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { NotificationService } from '../../../services/notification.service';
import { DesignAsset, ContentPage, Project, BackupEntry, ChangeLogEntry, DeploymentLog, MaintenanceRequest } from '../../../models/project.models';
import {
  WpConnection, WpConnectionUpsert, DeploymentQueueItem,
  WPPlugin, WPPluginUpsert, WPTheme, WPThemeUpsert,
  WpEnv, QueueItemStatus, QaStatus, ContentKind, DevTaskStatus,
} from '../../../models/project.models';
import { MaintenanceService } from '../../../services/maintenance.service';
import { AuthService } from '../../../services/auth.service';

type TabId = 'brief' | 'kanban' | 'assets' | 'content' | 'gate' | 'connections' | 'queue' | 'plugins' | 'themes' | 'maintenance';
type AssetType = DesignAsset['type'];
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface DevTask {
  id: string;
  title: string;
  description: string;
  status: DevTaskStatus;
  priority: TaskPriority;
  assigneeName: string;
  dueDate: string;
  pageId?: string;
}

interface QaCheckItem {
  id: string;
  label: string;
}

const COLUMNS: { id: DevTaskStatus; label: string; color: string }[] = [
  { id: 'SETUP',          label: 'Setup',          color: 'var(--color-text-muted)' },
  { id: 'IN_DEVELOPMENT', label: 'In Development', color: 'var(--color-info)' },
  { id: 'IN_QA',          label: 'In QA',          color: 'var(--color-warning)' },
  { id: 'STAGING',        label: 'Staging',        color: '#D97706' },
  { id: 'LIVE',           label: 'Live',           color: 'var(--color-accent)' },
  { id: 'MAINTENANCE',    label: 'Maintenance',    color: '#9333EA' },
];

const QUEUE_STATUS_ORDER: QueueItemStatus[] = ['QUEUED', 'IN_PROGRESS', 'IN_QA', 'STAGING_DONE', 'LIVE_DONE', 'FAILED'];

@Component({
  selector: 'app-development',
  imports: [ReactiveFormsModule, FormsModule, Badge],
  template: `
    <div class="dev-wrap">

      <div class="section-header">
        <div class="section-title-row">
          <div>
            <h3 class="section-title">Development</h3>
            <p class="section-sub">Stage 4 of 5 — Product Development &nbsp;·&nbsp; <span class="gate-pill soft">Soft Gate</span></p>
          </div>
          <ui-badge [variant]="stageComplete() ? 'success' : 'warning'">
            {{ stageComplete() ? 'Complete' : 'In Progress' }}
          </ui-badge>
        </div>

        <div class="tab-nav" role="tablist" aria-label="Development sections">
          @for (tab of tabs; track tab.id) {
            <button
              role="tab"
              class="tab-btn"
              [class.active]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
              @if (tab.badge()) {
                <span class="tab-badge">{{ tab.badge() }}</span>
              }
            </button>
          }
        </div>
      </div>

      <div class="tab-panels">

        <!-- Brief tab -->
        @if (activeTab() === 'brief') {
          <section aria-label="Development Brief" [formGroup]="briefForm">
            <div class="form-grid">
              <div class="field span-full">
                <label class="field-label" for="tech-stack">Tech Stack <span class="req" aria-hidden="true">*</span></label>
                <textarea id="tech-stack" class="field-textarea" formControlName="techStack" rows="3"
                  placeholder="e.g. Angular 21, Node.js, Fastify, PostgreSQL, Railway"></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="repo-url">Repository URL</label>
                <input id="repo-url" class="field-input" type="url" formControlName="repoUrl" placeholder="https://github.com/…" />
              </div>
              <div class="field">
                <label class="field-label" for="staging-url">Staging URL</label>
                <input id="staging-url" class="field-input" type="url" formControlName="stagingUrl" placeholder="https://staging.…" />
              </div>
              <div class="field">
                <label class="field-label" for="live-url">Live URL</label>
                <input id="live-url" class="field-input" type="url" formControlName="liveUrl" placeholder="https://…" />
              </div>
              <div class="field span-full">
                <label class="field-label" for="dev-notes">Notes</label>
                <textarea id="dev-notes" class="field-textarea" formControlName="notes" rows="3"
                  placeholder="Hosting provider, deployment pipeline, special setup notes, credentials location, etc."></textarea>
              </div>
            </div>
            @if (briefForm.controls.repoUrl.value || briefForm.controls.stagingUrl.value || briefForm.controls.liveUrl.value) {
              <div class="url-links">
                @if (briefForm.controls.repoUrl.value) {
                  <a class="url-link" [href]="briefForm.controls.repoUrl.value" target="_blank" rel="noopener noreferrer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
                    Repository
                  </a>
                }
                @if (briefForm.controls.stagingUrl.value) {
                  <a class="url-link" [href]="briefForm.controls.stagingUrl.value" target="_blank" rel="noopener noreferrer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Staging
                  </a>
                }
                @if (briefForm.controls.liveUrl.value) {
                  <a class="url-link accent" [href]="briefForm.controls.liveUrl.value" target="_blank" rel="noopener noreferrer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    Live Site
                  </a>
                }
              </div>
            }
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveBrief()">
                @if (saving()) { <span class="btn-spinner" aria-hidden="true"></span> Saving… }
                @else if (saveSuccess()) { Saved ✓ }
                @else { Save Brief }
              </button>
            </div>
          </section>
        }

        <!-- Kanban tab -->
        @if (activeTab() === 'kanban') {
          <section aria-label="Development Kanban">
            <!-- Handoff Summary -->
            @if (figmaUrl() || approvedDesignAssets().length > 0 || approvedPages().length > 0) {
              <div class="handoff-banner">
                <span class="handoff-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </span>
                <div class="handoff-body">
                  <strong class="handoff-title">Handoff Received</strong>
                  <span class="handoff-details">
                    @if (figmaUrl()) { Figma: <a class="handoff-link" [href]="figmaUrl()" target="_blank" rel="noopener">Open Design</a> }
                    @if (approvedDesignAssets().length > 0) { · {{ approvedDesignAssets().length }} design asset(s) }
                    @if (approvedPages().length > 0) { · {{ approvedPages().length }} content page(s) }
                  </span>
                </div>
                <button class="handoff-copy-btn" type="button" (click)="copyDesignToBrief()" title="Copy Figma URL to Dev Brief notes">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Copy to Brief
                </button>
              </div>
            }
            <div class="kanban-toolbar">
              <div class="task-stats">
                <span class="stat"><strong>{{ tasks().length }}</strong> tasks</span>
                <span class="stat-div" aria-hidden="true">·</span>
                <span class="stat"><strong>{{ doneTasks() }}</strong> done</span>
                @if (tasks().length > 0) {
                  <span class="stat-div" aria-hidden="true">·</span>
                  <span class="stat"><strong>{{ progressPct() }}%</strong></span>
                }
              </div>
              <button class="btn-add" type="button" (click)="addTask()" aria-label="Add task">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
              </button>
            </div>
            @if (tasks().length > 0) {
              <div class="progress-row" aria-label="Task progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="progressPct()"></div>
                </div>
              </div>
            }
            <div class="kanban-board" role="region" aria-label="Kanban board">
              @for (col of columns; track col.id) {
                <div class="kanban-col">
                  <div class="col-header">
                    <div class="col-dot" [style.background]="col.color"></div>
                    <span class="col-label">{{ col.label }}</span>
                    <span class="col-count">{{ tasksByStatus(col.id).length }}</span>
                  </div>
                  <div class="col-body">
                    @for (task of tasksByStatus(col.id); track task.id) {
                      <div class="task-card" [class]="'priority-' + task.priority.toLowerCase()">
                        <div class="task-top">
                          <span class="priority-dot" [class]="'p-' + task.priority.toLowerCase()" aria-label="{{ task.priority }} priority"></span>
                          <div class="task-actions">
                            <button class="task-move-btn" type="button" (click)="cycleStatus(task.id)" aria-label="Advance status">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                            <button class="task-del-btn" type="button" (click)="deleteTask(task.id)" aria-label="Delete task">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        </div>
                        <input class="task-title-input" type="text" [value]="task.title" (input)="updateTask(task.id, 'title', $any($event.target).value)" placeholder="Task title" aria-label="Task title" />
                        @if (task.description || editingDesc() === task.id) {
                          <textarea class="task-desc-input" [value]="task.description" (input)="updateTask(task.id, 'description', $any($event.target).value)" (focus)="editingDesc.set(task.id)" (blur)="editingDesc.set(null)" rows="2" placeholder="Add description…" aria-label="Task description"></textarea>
                        } @else {
                          <button class="task-add-desc" type="button" (click)="editingDesc.set(task.id)">+ description</button>
                        }
                        <div class="task-footer">
                          <select class="task-priority-select" [value]="task.priority" (change)="updateTask(task.id, 'priority', $any($event.target).value)" aria-label="Task priority">
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                          @if (task.assigneeName) {
                            <span class="task-assignee">{{ task.assigneeName }}</span>
                          }
                        </div>
                        <div class="task-page-link" style="margin-top: 4px;">
                          <select class="task-page-select" [value]="task.pageId || ''" (change)="updateTask(task.id, 'pageId', $any($event.target).value)" aria-label="Link Page" style="font-size: 11px; border: 1px solid var(--color-border); border-radius: 4px; padding: 2px; width: 100%; color: var(--color-text-secondary); background: transparent; cursor: pointer;">
                            <option value="">-- Link Page --</option>
                            @for (p of approvedPages(); track p.id) {
                              <option [value]="p.id">{{ p.title }}</option>
                            }
                          </select>
                        </div>
                      </div>
                    } @empty {
                      <div class="col-empty">No tasks</div>
                    }
                    @if (col.id === 'SETUP') {
                      <button class="col-add-btn" type="button" (click)="addTask()">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add task
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Design Assets tab -->
        @if (activeTab() === 'assets') {
          <section aria-label="Shared Design Assets">
            <div class="shared-header">
              <div>
                <h4 class="shared-title">Design Assets</h4>
                <p class="shared-sub">Approved assets from the Design stage — read-only</p>
              </div>
              <span class="shared-badge">{{ approvedAssets().length }} approved</span>
            </div>
            @if (approvedAssets().length === 0) {
              <div class="shared-empty" role="status">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>No approved assets yet. Assets become available once the Design gate is approved.</p>
              </div>
            } @else {
              <div class="asset-grid" role="list">
                @for (asset of approvedAssets(); track asset.id) {
                  <div class="asset-card" role="listitem">
                    <div class="asset-icon" [class]="'asset-icon--' + asset.type.toLowerCase()" [innerHTML]="assetIcon(asset.type)" aria-hidden="true"></div>
                    <div class="asset-info">
                      <span class="asset-name">{{ asset.name }}</span>
                      <div class="asset-meta">
                        <span class="asset-type-badge">{{ asset.type }}</span>
                        <span class="asset-version">v{{ asset.version }}</span>
                      </div>
                      @if (asset.notes) { <span class="asset-notes">{{ asset.notes }}</span> }
                      @if (asset.approvedAt) { <span class="asset-approved">Approved {{ formatDate(asset.approvedAt) }}</span> }
                    </div>
                    <a [href]="asset.url" target="_blank" rel="noopener noreferrer" class="asset-link" [attr.aria-label]="'Open ' + asset.name">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- Approved Content tab -->
        @if (activeTab() === 'content') {
          <section aria-label="Shared Content">
            <div class="shared-header">
              <div>
                <h4 class="shared-title">Approved Content</h4>
                <p class="shared-sub">Approved pages from the Written Content stage — read-only</p>
              </div>
              <span class="shared-badge">{{ approvedPages().length }} approved</span>
            </div>
            @if (approvedPages().length === 0) {
              <div class="shared-empty" role="status">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>No approved pages yet. Pages appear here once the Written Content gate is approved.</p>
              </div>
            } @else {
              <div class="content-list" role="list">
                @for (page of approvedPages(); track page.id) {
                  <div class="content-row" role="listitem">
                    <div class="content-row-left">
                      <span class="content-title">{{ page.title }}</span>
                      @if (page.slug) { <span class="content-slug">/{{ page.slug }}</span> }
                      @if (page.metaTitle) { <span class="content-meta-title">Meta: {{ page.metaTitle }}</span> }
                    </div>
                    <div class="content-row-right">
                      @if (page.wordCount) { <span class="content-words">{{ page.wordCount.toLocaleString() }} words</span> }
                      <span class="content-status-badge">Approved</span>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- WP Connections tab -->
        @if (activeTab() === 'connections') {
          <section aria-label="WordPress Connections">
            <div class="section-header-inline">
              <h4 class="section-subtitle">WordPress Connections</h4>
              <p class="section-sub-desc">Configure WP site credentials per environment. Passwords are encrypted at rest and never displayed.</p>
            </div>
            <div class="conn-grid">
              @for (env of envs; track env) {
                <div class="conn-card" [class.conn-card--active]="connectionOk(env)" [class.conn-card--lost]="connectionLost(env)">
                  <div class="conn-env-header">
                    <span class="conn-env-badge" [class]="'env-' + env.toLowerCase()">{{ env }}</span>
                    @if (connectionsByEnv()[env]) {
                      <span class="conn-health" [class.conn-health--ok]="connectionOk(env)" [class.conn-health--lost]="connectionLost(env)">
                        <span class="conn-status-dot" [class.active]="connectionOk(env)" [class.lost]="connectionLost(env)" [attr.aria-label]="connectionMessage(env)"></span>
                        <span class="conn-status-text">{{ connectionMessage(env) }}</span>
                      </span>
                    }
                  </div>
                  <div class="conn-form">
                    <div class="conn-field">
                      <label class="field-label-sm" [attr.for]="'siteUrl-' + env">Site URL</label>
                      <input class="field-input" [id]="'siteUrl-' + env" type="url" [value]="connForms()[env]?.siteUrl ?? ''" (input)="setConnField(env, 'siteUrl', $any($event.target).value)" placeholder="https://example.com" />
                    </div>
                    <div class="conn-field">
                      <label class="field-label-sm" [attr.for]="'wpUsername-' + env">WP Username</label>
                      <input class="field-input" [id]="'wpUsername-' + env" type="text" [value]="connForms()[env]?.wpUsername ?? ''" (input)="setConnField(env, 'wpUsername', $any($event.target).value)" placeholder="admin" />
                    </div>
                    <div class="conn-field">
                      <label class="field-label-sm" [attr.for]="'wpAppPassword-' + env">App Password</label>
                      <div class="conn-pw-row">
                        <input class="field-input conn-pw-input" [id]="'wpAppPassword-' + env" [type]="pwVisible()[env] ? 'text' : 'password'" [value]="connForms()[env]?.wpAppPassword ?? ''" (input)="setConnField(env, 'wpAppPassword', $any($event.target).value)" placeholder="xxxx xxxx xxxx xxxx" autocomplete="new-password" />
                        <button class="conn-pw-toggle" type="button" (click)="togglePw(env)" [attr.aria-label]="pwVisible()[env] ? 'Hide password' : 'Show password'">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            @if (pwVisible()[env]) {
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                            } @else {
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            }
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div class="conn-field">
                      <label class="field-label-sm" [attr.for]="'connNotes-' + env">Notes</label>
                      <input class="field-input" [id]="'connNotes-' + env" type="text" [value]="connForms()[env]?.notes ?? ''" (input)="setConnField(env, 'notes', $any($event.target).value)" placeholder="Optional notes" />
                    </div>
                    <button class="btn-save btn-save--sm" type="button" (click)="saveConnection(env)" [disabled]="connSaving()[env]">
                      @if (connSaving()[env]) { Saving… }
                      @else { Save {{ env }} }
                    </button>
                    @if (connSuccess()[env]) {
                      <span class="conn-saved">Saved ✓</span>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Deployment Queue tab -->
        @if (activeTab() === 'queue') {
          <section aria-label="Deployment Queue">
            <div class="section-header-inline">
              <h4 class="section-subtitle">Deployment Queue</h4>
              <div class="queue-toolbar">
                <button class="btn-add" type="button" (click)="showAddQueueItem.set(true)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add to Queue
                </button>
                @if (approvedPagesNotInQueue().length > 0) {
                  <button class="btn-save btn-save--sm" type="button" (click)="syncApprovedPages()" [disabled]="isSyncingApproved()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    @if (isSyncingApproved()) { Syncing… }
                    @else { Sync Approved Pages ({{ approvedPagesNotInQueue().length }}) }
                  </button>
                }
              </div>
            </div>

            @if (showAddQueueItem()) {
              <div class="add-queue-form">
                <div class="form-row">
                  <div class="field">
                    <label class="field-label-sm">Content Kind</label>
                    <select class="field-input" [value]="newQueueItem().contentKind" (change)="newQueueItem.update(v => ({...v, contentKind: $any($event.target).value}))">
                      <option value="PAGE">Page</option>
                      <option value="POST">Post</option>
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Title</label>
                    <input class="field-input" type="text" [value]="newQueueItem().title" (input)="newQueueItem.update(v => ({...v, title: $any($event.target).value}))" placeholder="Page title" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Slug</label>
                    <input class="field-input" type="text" [value]="newQueueItem().slug" (input)="newQueueItem.update(v => ({...v, slug: $any($event.target).value}))" placeholder="page-slug" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Target Env</label>
                    <select class="field-input" [value]="newQueueItem().targetEnv" (change)="newQueueItem.update(v => ({...v, targetEnv: $any($event.target).value}))">
                      <option value="DEV">DEV</option>
                      <option value="STAGING">STAGING</option>
                      <option value="PRODUCTION">PRODUCTION</option>
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Content Page ID (optional)</label>
                    <input class="field-input" type="text" [value]="newQueueItem().pageId ?? ''" (input)="newQueueItem.update(v => ({...v, pageId: $any($event.target).value || undefined}))" placeholder="ContentPage ID" />
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-save" type="button" (click)="createQueueItem()" [disabled]="!newQueueItem().title">
                    Add to Queue
                  </button>
                  <button class="btn-cancel" type="button" (click)="showAddQueueItem.set(false)">Cancel</button>
                </div>
              </div>
            }

            @if (queueItems().length === 0) {
              <div class="shared-empty" role="status">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p>No items in deployment queue. Add content pages to deploy to WordPress.</p>
              </div>
            } @else {
              <div class="queue-list" role="list">
                @for (item of queueItems(); track item.id) {
                  <div class="queue-card" [class]="'queue-' + item.status.toLowerCase()">
                    <div class="queue-card-top">
                      <div class="queue-card-info">
                        <span class="queue-title">{{ item.title }}</span>
                        <div class="queue-meta">
                          <span class="queue-badge kind-{{ item.contentKind.toLowerCase() }}">{{ item.contentKind }}</span>
                          @if (item.slug) { <span class="queue-slug">/{{ item.slug }}</span> }
                          <span class="queue-badge" [class]="'env-' + item.targetEnv.toLowerCase()">{{ item.targetEnv }}</span>
                        </div>
                      </div>
                      <div class="queue-card-actions">
                        @if (item.status === 'QUEUED' || item.status === 'IN_QA') {
                          <button class="btn-sm btn-primary" type="button" (click)="deployItem(item, 'STAGING')">
                            Deploy to Staging
                          </button>
                        }
                        @if (item.status === 'STAGING_DONE' || item.status === 'QUEUED') {
                          <button class="btn-sm btn-danger" type="button" [disabled]="item.qaStatus !== 'PASS'" [title]="item.qaStatus !== 'PASS' ? 'QA must be PASS first' : ''" (click)="openProdConfirm(item)">
                            Deploy to Production
                          </button>
                        }
                        <button class="btn-sm btn-ghost" type="button" (click)="openQaDrawer(item)">QA</button>
                        <button class="btn-sm btn-ghost" type="button" (click)="toggleLogs(item.id)">Logs</button>
                        <button class="btn-sm btn-ghost btn-danger-text" type="button" (click)="deleteQueueItem(item.id)">Delete</button>
                      </div>
                    </div>
                    <div class="queue-status-row">
                      <span class="queue-status" [class]="'qstatus-' + item.status.toLowerCase()">{{ statusLabel(item.status) }}</span>
                      <span class="qa-status" [class]="'qa-' + item.qaStatus.toLowerCase()">QA: {{ item.qaStatus === 'NOT_STARTED' ? 'Not Started' : item.qaStatus === 'PASS' ? 'PASS' : 'FAIL' }}</span>
                      @if (item.deployedAt) {
                        <span class="queue-deployed-at">{{ formatDate(item.deployedAt) }}</span>
                      }
                    </div>

                    @if (linkedPage(item)) {
                      <div class="queue-content-preview">
                        <div class="preview-row">
                          <span class="preview-label">Copy</span>
                          <p class="preview-text">{{ queueCopyPreview(item) || 'No approved body copy added yet.' }}</p>
                        </div>
                        <div class="preview-grid">
                          <div><span class="preview-label">SEO Title</span><span class="preview-value">{{ queueSeoTitle(item) || 'Missing' }}</span></div>
                          <div><span class="preview-label">SEO Description</span><span class="preview-value">{{ queueSeoDescription(item) || 'Missing' }}</span></div>
                        </div>
                      </div>
                    }

                    <!-- QA Drawer -->
                    @if (qaDrawerItemId() === item.id) {
                      <div class="qa-drawer">
                        <div class="qa-drawer-header">
                          <h5 class="qa-drawer-title">QA Checklist — {{ item.title }}</h5>
                          <button class="btn-sm btn-ghost" type="button" (click)="qaDrawerItemId.set(null)">Close</button>
                        </div>
                        <div class="qa-checklist">
                          @for (qi of qaItems(); track qi.id) {
                            <label class="qa-check-item">
                              <input type="checkbox" [checked]="qaChecklistVal(item, qi.id)" (change)="toggleQaCheck(item, qi.id)" />
                              <span>{{ qi.label }}</span>
                            </label>
                          }
                        </div>
                        <div class="qa-custom-row">
                          <input class="field-input qa-custom-input" type="text" [value]="newCustomQaLabel()" (input)="newCustomQaLabel.set($any($event.target).value)" placeholder="Custom QA item…" />
                          <button class="btn-sm btn-ghost" type="button" (click)="addCustomQaItem()" [disabled]="!newCustomQaLabel().trim()">Add</button>
                        </div>
                        <div class="qa-field">
                          <label class="field-label-sm">QA Notes</label>
                          <textarea class="field-textarea" rows="2" [value]="qaNotesVal(item)" (input)="setQaNotes(item, $any($event.target).value)" placeholder="Additional notes…"></textarea>
                        </div>
                        <div class="qa-actions">
                          <button class="btn-sm btn-success" type="button" (click)="saveQa(item, 'PASS')" [disabled]="!allQaChecked(item)">
                            Mark PASS
                          </button>
                          <button class="btn-sm btn-danger" type="button" (click)="saveQa(item, 'FAIL')">
                            Mark FAIL
                          </button>
                        </div>
                      </div>
                    }

                    <!-- Logs -->
                    @if (expandedLogs() === item.id && item.logs && item.logs.length > 0) {
                      <div class="logs-table-wrap">
                        <table class="logs-table">
                          <thead>
                            <tr>
                              <th>Env</th>
                              <th>Status</th>
                              <th>Pushed By</th>
                              <th>Duration</th>
                              <th>Error</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (log of item.logs; track log.id) {
                              <tr>
                                <td><span class="env-tag" [class]="'env-' + log.env.toLowerCase()">{{ log.env }}</span></td>
                                <td><span class="status-tag" [class]="'status-' + log.status.toLowerCase()">{{ log.status }}</span></td>
                                <td>{{ log.pushedBy ?? 'System' }}</td>
                                <td>{{ log.durationMs ? log.durationMs + 'ms' : '-' }}</td>
                                <td class="log-error">{{ log.errorMessage ?? '-' }}</td>
                                <td>{{ formatDate(log.createdAt) }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- Prod Confirm Modal -->
        @if (prodConfirmItem()) {
          <div class="modal-overlay" (click)="prodConfirmItem.set(null)">
            <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Confirm Production Deployment">
              <h4 class="modal-title">Deploy to Production</h4>
              <p class="modal-desc">You are about to deploy <strong>{{ prodConfirmItem()!.title }}</strong> to PRODUCTION. This action will publish content live.</p>
              @if (prodConfirmItem()!.qaStatus !== 'PASS') {
                <div class="modal-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>QA is not PASS. Production deployment will be blocked by the server.</span>
                </div>
              }
              <div class="modal-actions">
                <button class="btn-save" type="button" (click)="deployItem(prodConfirmItem()!, 'PRODUCTION')" [disabled]="prodDeploying()">
                  @if (prodDeploying()) { Deploying… }
                  @else { Confirm Deploy to Production }
                </button>
                <button class="btn-cancel" type="button" (click)="prodConfirmItem.set(null)">Cancel</button>
              </div>
            </div>
          </div>
        }

        <!-- Gate tab -->
        @if (activeTab() === 'gate') {
          <section aria-label="Soft Gate">
            <div class="gate-wrap">
              <div class="gate-info">
                <div class="soft-gate-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <p class="banner-title">Soft Gate</p>
                    <p class="banner-desc">Development can proceed to Marketing even if some tasks are incomplete. Warnings are advisory and won't block handoff.</p>
                  </div>
                </div>
                <p class="checklist-title">Gate Checklist</p>
                <ul class="checklist" role="list">
                  <li class="check-item" [class.ok]="briefForm.valid">
                    <span class="check-icon" [class.ok]="briefForm.valid" aria-hidden="true">
                      @if (briefForm.valid) { <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> }
                    </span>
                    Tech stack / brief completed
                  </li>
                  <li class="check-item" [class.ok]="tasks().length > 0" [class.warn]="tasks().length > 0 && doneTasks() < tasks().length">
                    <span class="check-icon" [class.ok]="doneTasks() === tasks().length && tasks().length > 0" [class.warn]="tasks().length > 0 && doneTasks() < tasks().length" aria-hidden="true">
                      @if (doneTasks() === tasks().length && tasks().length > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (tasks().length > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      }
                    </span>
                    Dev tasks: {{ doneTasks() }}/{{ tasks().length }} done
                    @if (tasks().length > 0 && doneTasks() < tasks().length) { <span class="warn-note">(warning — can still proceed)</span> }
                  </li>
                  <li class="check-item" [class.ok]="!!briefForm.controls.repoUrl.value">
                    <span class="check-icon" [class.ok]="!!briefForm.controls.repoUrl.value" aria-hidden="true">
                      @if (briefForm.controls.repoUrl.value) { <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> }
                    </span>
                    Repository URL added
                    @if (!briefForm.controls.repoUrl.value) { <span class="warn-note">(recommended)</span> }
                  </li>
                </ul>
              </div>
              <div class="gate-action">
                <div class="gate-status-card" [class.ready]="gateReady()">
                  @if (gateReady()) {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <div>
                      <p class="gate-card-title">Ready to proceed</p>
                      <p class="gate-card-desc">
                        @if (doneTasks() < tasks().length && tasks().length > 0) {
                          {{ tasks().length - doneTasks() }} task(s) still open — proceeding with warnings.
                        } @else {
                          All requirements met. Development can be approved.
                        }
                      </p>
                    </div>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p class="gate-card-title">Brief required</p>
                      <p class="gate-card-desc">Complete the tech stack / brief before approving this stage.</p>
                    </div>
                  }
                </div>
                @if (canApprove()) {
                  <button class="btn-approve" type="button" [disabled]="!gateReady() || gateSubmitting()" (click)="approveGate()">
                    @if (gateSubmitting()) { <span class="spinner" aria-hidden="true"></span> Approving… }
                    @else { Approve Development & Unlock Marketing }
                  </button>
                  @if (gateError()) { <p class="gate-error" role="alert">{{ gateError() }}</p> }
                  @if (gateSuccess()) { <p class="gate-success" role="status">Marketing stage unlocked successfully.</p> }
                } @else {
                  <div class="gate-no-permission" role="status">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    You don't have permission to approve this gate.
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Plugins tab -->
        @if (activeTab() === 'plugins') {
          <section aria-label="WP Plugins">
            <div class="section-header-inline">
              <h4 class="section-subtitle">WordPress Plugins</h4>
              <button class="btn-add" type="button" (click)="showAddPlugin.set(true)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Plugin
              </button>
            </div>

            @if (showAddPlugin()) {
              <div class="add-queue-form">
                <div class="form-row">
                  <div class="field">
                    <label class="field-label-sm">Name</label>
                    <input class="field-input" type="text" [value]="newPlugin().name" (input)="newPlugin.update(v => ({...v, name: $any($event.target).value}))" placeholder="Plugin name" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Slug</label>
                    <input class="field-input" type="text" [value]="newPlugin().slug" (input)="newPlugin.update(v => ({...v, slug: $any($event.target).value}))" placeholder="plugin-slug" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Version</label>
                    <input class="field-input" type="text" [value]="newPlugin().version" (input)="newPlugin.update(v => ({...v, version: $any($event.target).value}))" placeholder="1.0.0" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Status</label>
                    <select class="field-input" [value]="newPlugin().status" (change)="newPlugin.update(v => ({...v, status: $any($event.target).value}))">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="field span-full">
                    <label class="field-label-sm">Description</label>
                    <textarea class="field-textarea" rows="2" [value]="newPlugin().description" (input)="newPlugin.update(v => ({...v, description: $any($event.target).value}))" placeholder="Plugin description"></textarea>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-save" type="button" (click)="savePlugin()" [disabled]="!newPlugin().name || !newPlugin().slug">Save Plugin</button>
                  <button class="btn-cancel" type="button" (click)="showAddPlugin.set(false)">Cancel</button>
                </div>
              </div>
            }

            @if (plugins().length === 0) {
              <div class="shared-empty" role="status">
                <p>No plugins registered.</p>
              </div>
            } @else {
              <table class="wptable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of plugins(); track p.id) {
                    <tr>
                      <td class="cell-name">
                        <span class="cell-editable" [contentEditable]="true" (blur)="updatePluginField(p, 'name', $any($event.target).innerText)">{{ p.name }}</span>
                      </td>
                      <td>{{ p.slug }}</td>
                      <td>
                        <span class="cell-editable" [contentEditable]="true" (blur)="updatePluginField(p, 'version', $any($event.target).innerText)">{{ p.version ?? '-' }}</span>
                      </td>
                      <td>
                        <select [value]="p.status" (change)="updatePluginStatus(p, $any($event.target).value)">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      <td>{{ p.lastUpdatedAt ? formatDate(p.lastUpdatedAt) : '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>
        }

        <!-- Themes tab -->
        @if (activeTab() === 'themes') {
          <section aria-label="WP Themes">
            <div class="section-header-inline">
              <h4 class="section-subtitle">WordPress Themes</h4>
              <button class="btn-add" type="button" (click)="showAddTheme.set(true)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Theme
              </button>
            </div>

            @if (showAddTheme()) {
              <div class="add-queue-form">
                <div class="form-row">
                  <div class="field">
                    <label class="field-label-sm">Name</label>
                    <input class="field-input" type="text" [value]="newTheme().name" (input)="newTheme.update(v => ({...v, name: $any($event.target).value}))" placeholder="Theme name" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Slug</label>
                    <input class="field-input" type="text" [value]="newTheme().slug" (input)="newTheme.update(v => ({...v, slug: $any($event.target).value}))" placeholder="theme-slug" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Version</label>
                    <input class="field-input" type="text" [value]="newTheme().version" (input)="newTheme.update(v => ({...v, version: $any($event.target).value}))" placeholder="1.0.0" />
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Status</label>
                    <select class="field-input" [value]="newTheme().status" (change)="newTheme.update(v => ({...v, status: $any($event.target).value}))">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="field span-full">
                    <label class="field-label-sm">Description</label>
                    <textarea class="field-textarea" rows="2" [value]="newTheme().description" (input)="newTheme.update(v => ({...v, description: $any($event.target).value}))" placeholder="Theme description"></textarea>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-save" type="button" (click)="saveTheme()" [disabled]="!newTheme().name || !newTheme().slug">Save Theme</button>
                  <button class="btn-cancel" type="button" (click)="showAddTheme.set(false)">Cancel</button>
                </div>
              </div>
            }

            @if (themes().length === 0) {
              <div class="shared-empty" role="status">
                <p>No themes registered.</p>
              </div>
            } @else {
              <table class="wptable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of themes(); track t.id) {
                    <tr>
                      <td class="cell-name">
                        <span class="cell-editable" [contentEditable]="true" (blur)="updateThemeField(t, 'name', $any($event.target).innerText)">{{ t.name }}</span>
                      </td>
                      <td>{{ t.slug }}</td>
                      <td>
                        <span class="cell-editable" [contentEditable]="true" (blur)="updateThemeField(t, 'version', $any($event.target).innerText)">{{ t.version ?? '-' }}</span>
                      </td>
                      <td>
                        <select [value]="t.status" (change)="updateThemeStatus(t, $any($event.target).value)">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      <td>{{ t.lastUpdatedAt ? formatDate(t.lastUpdatedAt) : '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>
        }

        <!-- Maintenance Mode tab -->
        @if (activeTab() === 'maintenance') {
          <section aria-label="Maintenance Mode">
            <div class="maintenance-grid">
              
              <!-- Left Column: Tasks Queue & Uptime -->
              <div class="maintenance-left">
                <!-- Project Status Banner -->
                <div class="maintenance-banner" [class.active]="stageComplete()">
                  @if (stageComplete()) {
                    <div class="banner-icon status-active">✓</div>
                    <div style="margin-left: 8px;">
                      <h4 class="banner-title" style="margin: 0; font-size: 13.5px; font-weight: 600;">Maintenance Mode Active</h4>
                      <p class="banner-desc" style="margin: 2px 0 0; font-size: 12px; opacity: 0.9;">Project launched! Dashboard is operating in Maintenance upkeep mode.</p>
                    </div>
                  } @else {
                    <div class="banner-icon status-inactive">!</div>
                    <div style="margin-left: 8px;">
                      <h4 class="banner-title" style="margin: 0; font-size: 13.5px; font-weight: 600;">Maintenance Mode Pending</h4>
                      <p class="banner-desc" style="margin: 2px 0 0; font-size: 12px; opacity: 0.9;">This site is still in initial development. Maintenance mode will fully activate post-launch.</p>
                    </div>
                  }
                </div>

                <!-- Uptime & Health Monitoring -->
                <div class="m-card">
                  <div class="m-card-header-row">
                    <h4 class="m-card-title">Uptime & Health Monitoring</h4>
                    <button class="btn-save btn-save--sm" type="button" (click)="checkUptime()" [disabled]="uptimeChecking() || !briefForm.controls.liveUrl.value">
                      @if (uptimeChecking()) { Checking... }
                      @else { Check Now }
                    </button>
                  </div>
                  <div class="uptime-widget">
                    @if (briefForm.controls.liveUrl.value) {
                      <div class="uptime-row">
                        <span class="uptime-badge" [class.up]="uptimeStatus() === 'UP'" [class.down]="uptimeStatus() === 'DOWN'">{{ uptimeBadgeLabel() }}</span>
                        <span class="uptime-url">{{ briefForm.controls.liveUrl.value }}</span>
                      </div>
                      <div class="uptime-stats">
                        <div class="stat-box"><span class="stat-val">{{ uptimeBadgeLabel() }}</span><span class="stat-lbl">Status</span></div>
                        <div class="stat-box"><span class="stat-val">{{ uptimeResponseTime() ? uptimeResponseTime() + 'ms' : '-' }}</span><span class="stat-lbl">Response Time</span></div>
                        <div class="stat-box"><span class="stat-val">{{ uptimeLastChecked() ? formatDate(uptimeLastChecked()!) : '-' }}</span><span class="stat-lbl">Last Checked</span></div>
                      </div>
                    } @else {
                      <p class="m-empty-text">Add a Live URL in the Dev Brief to enable uptime monitoring.</p>
                    }
                  </div>
                </div>

                <!-- Maintenance Tasks Queue -->
                <div class="m-card">
                  <div class="m-card-header-row">
                    <h4 class="m-card-title">Maintenance Task Queue</h4>
                    <button class="btn-add btn-add--sm" type="button" (click)="showAddMaintenanceRequest.set(true)">Add Request</button>
                  </div>
                  @if (showAddMaintenanceRequest()) {
                    <div class="cl-add-form">
                      <div class="cl-field-row">
                        <input class="field-input cl-field" type="text" [value]="newMaintenanceRequest().title" (input)="newMaintenanceRequest.update(v => ({...v, title: $any($event.target).value}))" placeholder="Request title" />
                        <select class="field-input cl-field" [value]="newMaintenanceRequest().priority" (change)="newMaintenanceRequest.update(v => ({...v, priority: $any($event.target).value}))">
                          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                        </select>
                      </div>
                      <input class="field-input" type="text" [value]="newMaintenanceRequest().target" (input)="newMaintenanceRequest.update(v => ({...v, target: $any($event.target).value}))" placeholder="Target page or feature" />
                      <textarea class="field-textarea" rows="2" [value]="newMaintenanceRequest().description" (input)="newMaintenanceRequest.update(v => ({...v, description: $any($event.target).value}))" placeholder="Request description"></textarea>
                      <div class="cl-add-actions">
                        <button class="btn-save btn-save--sm" type="button" (click)="createMaintenanceRequest()" [disabled]="!newMaintenanceRequest().title || !newMaintenanceRequest().description">Save</button>
                        <button class="btn-cancel btn-cancel--sm" type="button" (click)="showAddMaintenanceRequest.set(false)">Cancel</button>
                      </div>
                    </div>
                  }
                  @if (maintenanceRequests().length === 0 && tasksByStatus('MAINTENANCE').length === 0) {
                    <p class="m-empty-text">No active maintenance requests in queue.</p>
                  } @else {
                    <div class="m-task-list">
                      @for (request of maintenanceRequests(); track request.id) {
                        <div class="m-task-row">
                          <div><span class="m-task-title">{{ request.title }}</span><span class="m-task-target">{{ request.target || 'General' }}</span></div>
                          <select class="m-status-select" [value]="request.status" (change)="updateMaintenanceRequestStatus(request.id, $any($event.target).value)">
                            <option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
                          </select>
                          <span class="m-task-priority" [class]="'p-' + request.priority.toLowerCase()">{{ request.priority }}</span>
                          <button class="cl-delete" type="button" (click)="deleteMaintenanceRequest(request.id)" aria-label="Delete maintenance request">&times;</button>
                        </div>
                      }
                      @for (task of tasksByStatus('MAINTENANCE'); track task.id) {
                        <div class="m-task-row"><span class="m-task-title">{{ task.title }}</span><span class="m-task-priority" [class]="'p-' + task.priority.toLowerCase()">{{ task.priority }}</span></div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Right Column: Backups, Performance, and Change Log -->
              <div class="maintenance-right">
                
                <!-- Backup Status & Manual Trigger -->
                <div class="m-card">
                  <h4 class="m-card-title">Backup Status</h4>
                  <div class="backup-widget">
                    <div class="backup-info">
                      <span class="backup-label">Last Backup:</span>
                      <span class="backup-val">{{ lastBackupDate() || 'None' }}</span>
                    </div>
                    <div class="backup-info">
                      <span class="backup-label">Provider:</span>
                      <span class="backup-val">{{ lastBackupProvider() || 'N/A' }}</span>
                    </div>
                    <div class="backup-info">
                      <span class="backup-label">Size:</span>
                      <span class="backup-val">{{ lastBackupSize() || '—' }}</span>
                    </div>
                    <button class="btn-save btn-save--sm" type="button" (click)="triggerBackup()" [disabled]="backingUp()">
                      @if (backingUp()) { Backing up… }
                      @else { Trigger Manual Backup }
                    </button>
                  </div>
                </div>

                <!-- Performance Notes -->
                <div class="m-card">
                  <h4 class="m-card-title">Performance Notes</h4>
                  <textarea class="field-textarea" rows="4" [value]="perfNotes()" (input)="savePerfNotes($any($event.target).value)" placeholder="Document optimization steps, speed test results..."></textarea>
                  <p class="perf-status-text">Saved automatically ✓</p>
                </div>

                <!-- Change Log -->
                <div class="m-card">
                  <div class="m-card-header-row">
                    <h4 class="m-card-title">Live Site Change Log</h4>
                    <button class="btn-add btn-add--sm" type="button" (click)="showAddChangelog.set(true)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Entry
                    </button>
                  </div>

                  @if (showAddChangelog()) {
                    <div class="cl-add-form">
                      <div class="cl-field-row">
                        <input class="field-input cl-field" type="text" [value]="newChangelogEntry().pageName" (input)="newChangelogEntry.update(v => ({...v, pageName: $any($event.target).value}))" placeholder="Page name" />
                        <input class="field-input cl-field" type="text" [value]="newChangelogEntry().changedBy" (input)="newChangelogEntry.update(v => ({...v, changedBy: $any($event.target).value}))" placeholder="Changed by" />
                      </div>
                      <textarea class="field-textarea" rows="2" [value]="newChangelogEntry().description" (input)="newChangelogEntry.update(v => ({...v, description: $any($event.target).value}))" placeholder="What changed?"></textarea>
                      <div class="cl-add-actions">
                        <button class="btn-save btn-save--sm" type="button" (click)="addChangelogEntry()" [disabled]="!newChangelogEntry().pageName || !newChangelogEntry().description">Save</button>
                        <button class="btn-cancel btn-cancel--sm" type="button" (click)="showAddChangelog.set(false)">Cancel</button>
                      </div>
                    </div>
                  }

                  <div class="change-log-list">
                    @if (changeLog().length === 0) {
                      <p class="m-empty-text">No changes recorded yet.</p>
                    } @else {
                      @for (entry of changeLog(); track entry.id) {
                        <div class="change-log-row">
                          <div class="cl-top">
                            <span class="cl-page">{{ entry.pageName }}</span>
                            <span class="cl-date">{{ formatDate(entry.changedAt) }}</span>
                            <button class="cl-delete" type="button" (click)="deleteChangelogEntry(entry.id)" aria-label="Delete entry">&times;</button>
                          </div>
                          <p class="cl-desc">{{ entry.description }}</p>
                          <span class="cl-user">By: {{ entry.changedBy }}</span>
                        </div>
                      }
                    }
                  </div>
                </div>

              </div>

            </div>
          </section>
        }

      </div>
    </div>
  `,
  styles: [`
    .dev-wrap { display: flex; flex-direction: column; gap: 0; }
    .section-header { margin-bottom: 0; }
    .section-title-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .section-title { font-family: var(--font-display); font-size: 18px; font-weight: 400; color: var(--color-text); margin: 0 0 4px; }
    .section-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .gate-pill { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 10px; }
    .gate-pill.soft { background: #FEF3C7; color: #D97706; }

    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); margin: 0 -24px; padding: 0 24px; }
    .tab-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none;
      background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500;
      color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; white-space: nowrap;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: var(--color-text); border-bottom-color: #3B82F6; }
    .tab-badge { background: #EFF6FF; color: #3B82F6; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    .tab-panels { padding-top: 24px; }

    /* Brief */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { display: flex; flex-direction: column; }
    .span-full { grid-column: 1 / -1; }
    .field-label, .field-label-sm { font-size: 12.5px; font-weight: 500; color: var(--color-text); margin-bottom: 6px; }
    .req { color: var(--color-destructive); }
    .field-input {
      height: 36px; padding: 0 10px;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      font-family: var(--font-sans); font-size: 13px; color: var(--color-text);
      background: var(--color-surface); outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .field-textarea {
      padding: 8px 10px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      font-family: var(--font-sans); font-size: 13px; color: var(--color-text);
      background: var(--color-surface); resize: vertical; outline: none; line-height: 1.6;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-textarea:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .url-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .url-link {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12.5px; color: var(--color-text-secondary);
      text-decoration: none; padding: 4px 10px;
      border: 1px solid var(--color-border); border-radius: 20px;
      transition: background 0.15s, color 0.15s;
    }
    .url-link:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .url-link.accent { color: #3B82F6; border-color: #BFDBFE; background: #EFF6FF; }
    .url-link.accent:hover { background: #DBEAFE; }

    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-border); }
    .btn-save {
      height: 36px; padding: 0 20px; background: #3B82F6; color: #fff; border: none;
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 7px; transition: background 0.15s;
    }
    .btn-save:hover { background: #2563EB; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save--sm { height: 32px; padding: 0 14px; font-size: 12px; }
    .btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .btn-cancel { height: 36px; padding: 0 16px; background: none; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; }
    .btn-cancel:hover { background: var(--color-surface-raised); }

    /* Kanban */
    .kanban-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .task-stats { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); }
    .task-stats strong { color: var(--color-text); font-weight: 600; }
    .stat-div { color: var(--color-border-strong); }
    .btn-add { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text); cursor: pointer; transition: background 0.15s; }
    .btn-add:hover { background: var(--color-border); }
    .progress-row { margin-bottom: 16px; }
    .progress-bar { height: 5px; background: var(--color-surface-raised); border-radius: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: #3B82F6; border-radius: 10px; transition: width 0.3s ease; }
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kanban-col { display: flex; flex-direction: column; gap: 8px; }
    .col-header { display: flex; align-items: center; gap: 7px; padding: 0 0 8px; border-bottom: 1px solid var(--color-border); }
    .col-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .col-label { font-size: 12px; font-weight: 600; color: var(--color-text); flex: 1; }
    .col-count { font-size: 11px; font-weight: 600; background: var(--color-surface-raised); color: var(--color-text-muted); padding: 1px 6px; border-radius: 10px; }
    .col-body { display: flex; flex-direction: column; gap: 8px; }
    .col-empty { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 20px 0; border: 1.5px dashed var(--color-border); border-radius: var(--radius-md); }
    .task-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
    .task-card.priority-high { border-left: 3px solid var(--color-destructive); }
    .task-card.priority-medium { border-left: 3px solid var(--color-warning); }
    .task-card.priority-low { border-left: 3px solid var(--color-border-strong); }
    .task-top { display: flex; align-items: center; justify-content: space-between; }
    .priority-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .priority-dot.p-high { background: var(--color-destructive); }
    .priority-dot.p-medium { background: var(--color-warning); }
    .priority-dot.p-low { background: var(--color-border-strong); }
    .task-actions { display: flex; gap: 2px; }
    .task-move-btn, .task-del-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 4px; cursor: pointer; color: var(--color-text-muted); transition: background 0.12s, color 0.12s; }
    .task-move-btn:hover { background: #EFF6FF; color: #3B82F6; }
    .task-del-btn:hover { background: var(--color-destructive-light); color: var(--color-destructive); }
    .task-title-input { font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text); border: none; outline: none; background: transparent; width: 100%; padding: 0; }
    .task-title-input::placeholder { color: var(--color-text-muted); }
    .task-desc-input { font-family: var(--font-sans); font-size: 12px; color: var(--color-text-secondary); border: none; outline: none; background: transparent; width: 100%; padding: 0; resize: none; line-height: 1.5; }
    .task-desc-input::placeholder { color: var(--color-text-muted); }
    .task-add-desc { font-family: var(--font-sans); font-size: 11.5px; color: var(--color-text-muted); background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
    .task-add-desc:hover { color: var(--color-text-secondary); }
    .task-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
    .task-priority-select { font-family: var(--font-sans); font-size: 11px; color: var(--color-text-muted); background: none; border: none; outline: none; cursor: pointer; padding: 0; }
    .task-assignee { font-size: 11px; color: var(--color-text-muted); }
    .col-add-btn { display: flex; align-items: center; gap: 5px; width: 100%; padding: 7px; background: none; border: 1.5px dashed var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12px; color: var(--color-text-muted); cursor: pointer; justify-content: center; transition: border-color 0.15s, color 0.15s; }
    .col-add-btn:hover { border-color: #3B82F6; color: #3B82F6; }

    /* Gate */
    .gate-wrap { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
    .soft-gate-banner { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: var(--radius-lg); margin-bottom: 20px; color: #92400E; }
    .banner-title { font-size: 13.5px; font-weight: 600; margin: 0 0 3px; }
    .banner-desc { font-size: 12.5px; margin: 0; }
    .checklist-title { font-size: 13.5px; font-weight: 600; color: var(--color-text); margin: 0 0 14px; }
    .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .check-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: var(--color-text-muted); }
    .check-item.ok { color: var(--color-text-secondary); }
    .check-icon { width: 22px; height: 22px; min-width: 22px; border-radius: 50%; border: 1.5px solid var(--color-border-strong); background: var(--color-surface); display: flex; align-items: center; justify-content: center; color: transparent; margin-top: 1px; }
    .check-icon.ok { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .check-icon.warn { background: #FEF3C7; border-color: var(--color-warning); color: var(--color-warning); }
    .warn-note { font-size: 11.5px; color: var(--color-warning); margin-left: 4px; }
    .gate-action { display: flex; flex-direction: column; gap: 12px; }
    .gate-status-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface-raised); color: var(--color-text-muted); }
    .gate-status-card.ready { background: #EFF6FF; border-color: #3B82F6; color: #3B82F6; }
    .gate-card-title { font-size: 13.5px; font-weight: 600; margin: 0 0 3px; color: inherit; }
    .gate-card-desc { font-size: 12.5px; margin: 0; color: inherit; opacity: 0.85; }
    .btn-approve { height: 40px; padding: 0 20px; background: #3B82F6; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
    .btn-approve:hover:not(:disabled) { background: #2563EB; }
    .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
    .gate-error { font-size: 12.5px; color: var(--color-destructive); margin: 0; }
    .gate-no-permission {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: var(--radius-md);
      background: var(--color-surface-raised); border: 1px solid var(--color-border);
      font-size: 13px; color: var(--color-text-muted);
    }
    .gate-success { font-size: 12.5px; color: var(--color-accent); font-weight: 500; margin: 0; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

    /* Shared tabs */
    .shared-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    .shared-title { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0 0 4px; }
    .shared-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .shared-badge { height: 22px; padding: 0 10px; background: #EFF6FF; color: #3B82F6; font-size: 11px; font-weight: 700; border-radius: 11px; display: flex; align-items: center; white-space: nowrap; }
    .shared-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--color-text-muted); text-align: center; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }
    .shared-empty p { font-size: 13.5px; max-width: 340px; margin: 0; line-height: 1.6; }
    .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .asset-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: border-color 0.15s; }
    .asset-card:hover { border-color: var(--color-border-strong); }
    .asset-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; background: var(--color-surface-raised); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); }
    .asset-icon--image { background: #EFF6FF; color: #3B82F6; }
    .asset-icon--video { background: #FEF3C7; color: #D97706; }
    .asset-icon--font  { background: #F3E8FF; color: #9333EA; }
    .asset-icon--document { background: #ECFDF5; color: #059669; }
    .asset-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .asset-name { font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-meta { display: flex; align-items: center; gap: 6px; }
    .asset-type-badge { font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .asset-version { font-size: 11px; color: var(--color-text-muted); }
    .asset-notes { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-approved { font-size: 11.5px; color: var(--color-accent); font-weight: 500; }
    .asset-link { width: 30px; height: 30px; min-width: 30px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--color-text-muted); text-decoration: none; transition: background 0.12s, color 0.12s; }
    .asset-link:hover { background: #EFF6FF; color: #3B82F6; }
    .content-list { display: flex; flex-direction: column; gap: 8px; }
    .content-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: border-color 0.15s; }
    .content-row:hover { border-color: var(--color-border-strong); }
    .content-row-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .content-title { font-size: 13.5px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .content-slug { font-size: 11.5px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .content-meta-title { font-size: 11.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .content-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .content-words { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; }
    .content-status-badge { font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 10px; background: #ECFDF5; color: #059669; letter-spacing: 0.04em; text-transform: uppercase; }

    /* WP Connections */
    .section-header-inline { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .section-subtitle { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0; }
    .section-sub-desc { font-size: 12.5px; color: var(--color-text-muted); margin: 4px 0 0; }
    .conn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .conn-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; background: var(--color-surface); }
    .conn-card--active { border-color: var(--color-accent); }
    .conn-card--lost { border-color: var(--color-destructive); }
    .conn-env-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .conn-env-badge { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 10px; letter-spacing: 0.04em; }
    .env-dev { background: #EFF6FF; color: #3B82F6; }
    .env-staging { background: #FEF3C7; color: #D97706; }
    .env-production { background: #FEE2E2; color: #DC2626; }
    .conn-health { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--color-text-muted); }
    .conn-health--ok { color: var(--color-accent); }
    .conn-health--lost { color: var(--color-destructive); }
    .conn-status-dot { width: 8px; height: 8px; min-width: 8px; border-radius: 50%; background: var(--color-border-strong); }
    .conn-status-dot.active { background: var(--color-accent); }
    .conn-status-dot.lost { background: var(--color-destructive); }
    .conn-status-text { max-width: 145px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .conn-form { display: flex; flex-direction: column; gap: 10px; }
    .conn-field { display: flex; flex-direction: column; gap: 4px; }
    .conn-pw-row { display: flex; gap: 4px; }
    .conn-pw-input { flex: 1; }
    .conn-pw-toggle { width: 36px; height: 36px; min-width: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface-raised); cursor: pointer; color: var(--color-text-muted); }
    .conn-pw-toggle:hover { background: var(--color-border); }
    .conn-saved { font-size: 12px; color: var(--color-accent); font-weight: 500; }

    /* Deployment Queue */
    .queue-toolbar { display: flex; align-items: center; gap: 8px; }
    .add-queue-form { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px; }
    .queue-list { display: flex; flex-direction: column; gap: 8px; }
    .queue-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 14px 16px; background: var(--color-surface); }
    .queue-card.queue-queued { border-left: 3px solid var(--color-text-muted); }
    .queue-card.queue-in_progress { border-left: 3px solid #3B82F6; }
    .queue-card.queue-in_qa { border-left: 3px solid var(--color-warning); }
    .queue-card.queue-staging_done { border-left: 3px solid var(--color-accent); }
    .queue-card.queue-live_done { border-left: 3px solid #059669; }
    .queue-card.queue-failed { border-left: 3px solid var(--color-destructive); }
    .queue-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .queue-card-info { flex: 1; min-width: 0; }
    .queue-title { font-size: 14px; font-weight: 600; color: var(--color-text); display: block; margin-bottom: 4px; }
    .queue-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .queue-badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .queue-badge.kind-page { background: #EFF6FF; color: #3B82F6; }
    .queue-badge.kind-post { background: #F3E8FF; color: #9333EA; }
    .queue-slug { font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .queue-card-actions { display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; }
    .btn-sm { height: 28px; padding: 0 10px; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; cursor: pointer; border: 1px solid transparent; display: flex; align-items: center; gap: 4px; transition: background 0.15s, color 0.15s; white-space: nowrap; }
    .btn-primary { background: #3B82F6; color: #fff; border-color: #3B82F6; }
    .btn-primary:hover { background: #2563EB; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: #EF4444; color: #fff; border-color: #EF4444; }
    .btn-danger:hover { background: #DC2626; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-success { background: #10B981; color: #fff; border-color: #10B981; }
    .btn-success:hover { background: #059669; }
    .btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: none; color: var(--color-text-secondary); border-color: var(--color-border); }
    .btn-ghost:hover { background: var(--color-surface-raised); }
    .btn-danger-text { color: var(--color-destructive); }
    .btn-danger-text:hover { background: var(--color-destructive-light); }
    .queue-status-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 11.5px; }
    .queue-status { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 10px; }
    .qstatus-queued { background: var(--color-surface-raised); color: var(--color-text-muted); }
    .qstatus-in_progress { background: #EFF6FF; color: #3B82F6; }
    .qstatus-in_qa { background: #FEF3C7; color: #D97706; }
    .qstatus-staging_done { background: #ECFDF5; color: #059669; }
    .qstatus-live_done { background: #D1FAE5; color: #065F46; }
    .qstatus-failed { background: #FEE2E2; color: #DC2626; }
    .qa-status { font-size: 11px; font-weight: 600; }
    .qa-not_started { color: var(--color-text-muted); }
    .qa-pass { color: var(--color-accent); }
    .qa-fail { color: var(--color-destructive); }
    .queue-deployed-at { color: var(--color-text-muted); font-size: 11px; }

    .queue-content-preview { margin-top: 10px; padding: 10px 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px; }
    .preview-row { display: flex; flex-direction: column; gap: 3px; }
    .preview-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .preview-text { font-size: 12.5px; color: var(--color-text-secondary); margin: 0; line-height: 1.5; }
    .preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .preview-grid > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .preview-value { font-size: 12px; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qa-header-actions { display: flex; align-items: center; gap: 6px; }
    .deployment-history { margin-top: 14px; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
    .deployment-history-title { font-size: 13px; font-weight: 600; margin: 0 0 10px; color: var(--color-text); }
    /* QA Drawer */
    .qa-drawer { margin-top: 12px; padding: 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .qa-drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .qa-drawer-title { font-size: 13px; font-weight: 600; margin: 0; color: var(--color-text); }
    .qa-checklist { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .qa-check-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
    .qa-check-item input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
    .qa-custom-row { display: flex; gap: 6px; margin-bottom: 12px; align-items: center; }
    .qa-custom-input { flex: 1; height: 32px; font-size: 12px; }
    .qa-field { margin-bottom: 10px; }
    .qa-actions { display: flex; gap: 8px; }

    /* Logs */
    .logs-table-wrap { margin-top: 10px; overflow-x: auto; }
    .logs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .logs-table th { text-align: left; padding: 6px 10px; font-weight: 600; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .logs-table td { padding: 6px 10px; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); vertical-align: top; }
    .env-tag { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; }
    .status-tag { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; }
    .status-success { background: #ECFDF5; color: #059669; }
    .status-error { background: #FEE2E2; color: #DC2626; }
    .log-error { font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-destructive); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--color-surface); border-radius: var(--radius-lg); padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 8px 40px rgba(0,0,0,0.2); }
    .modal-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: var(--color-text); }
    .modal-desc { font-size: 13.5px; color: var(--color-text-secondary); margin: 0 0 16px; line-height: 1.6; }
    .modal-warning { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: var(--radius-md); margin-bottom: 16px; color: #92400E; font-size: 13px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

    /* WP Table (Plugins/Themes) */
    .wptable { width: 100%; border-collapse: collapse; font-size: 13px; }
    .wptable th { text-align: left; padding: 8px 12px; font-weight: 600; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .wptable td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); color: var(--color-text); vertical-align: middle; }
    .wptable tr:hover td { background: var(--color-surface-raised); }
    .cell-name { font-weight: 500; }
    .cell-editable { cursor: text; padding: 2px 4px; border-radius: 4px; transition: background 0.12s; min-width: 60px; display: inline-block; }
    .cell-editable:focus { outline: 1px solid #3B82F6; background: #EFF6FF; }
    .wptable select { font-family: var(--font-sans); font-size: 12px; padding: 2px 6px; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-surface); color: var(--color-text); cursor: pointer; }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Maintenance Mode styles */
    .maintenance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .maintenance-left, .maintenance-right { display: flex; flex-direction: column; gap: 20px; }
    .maintenance-banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: var(--radius-lg); background: #F3F4F6; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
    .maintenance-banner.active { background: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
    .banner-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    .banner-icon.status-active { background: #10B981; color: #fff; }
    .banner-icon.status-inactive { background: var(--color-text-muted); color: #fff; }
    .m-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .m-card-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0; }
    .m-empty-text { font-size: 12.5px; color: var(--color-text-muted); margin: 0; line-height: 1.5; }
    
    .uptime-widget { display: flex; flex-direction: column; gap: 10px; }
    .uptime-row { display: flex; align-items: center; gap: 8px; }
    .uptime-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #EF4444; color: #fff; }
    .uptime-badge.up { background: #10B981; }
    .uptime-badge.down { background: #EF4444; }
    .uptime-url { font-size: 13px; color: var(--color-text-secondary); font-family: var(--font-mono, monospace); }
    .uptime-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 5px; }
    .stat-box { display: flex; flex-direction: column; align-items: center; padding: 8px; background: var(--color-surface-raised); border-radius: var(--radius-md); text-align: center; }
    .stat-val { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .stat-lbl { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
    
    .m-task-list { display: flex; flex-direction: column; gap: 8px; }
    .m-task-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--color-surface-raised); border-radius: var(--radius-md); border-left: 3px solid #9333EA; }
    .m-task-title { font-size: 12.5px; font-weight: 500; color: var(--color-text); display: block; }
    .m-task-target { font-size: 11px; color: var(--color-text-muted); display: block; margin-top: 2px; }
    .m-status-select { height: 28px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: 11.5px; }
    .m-task-priority { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; text-transform: uppercase; }
    
    .backup-widget { display: flex; flex-direction: column; gap: 8px; }
    .backup-info { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-text-secondary); }
    .backup-label { font-weight: 500; }
    .backup-val { color: var(--color-text); font-family: var(--font-mono, monospace); }
    
    .perf-status-text { font-size: 11px; color: var(--color-text-muted); text-align: right; margin: 0; }
    
    .change-log-list { display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; }
    .change-log-row { padding: 10px; background: var(--color-surface-raised); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 4px; }
    .cl-top { display: flex; align-items: center; justify-content: space-between; }
    .cl-status { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
    .cl-status.success { background: #D1FAE5; color: #065F46; }
    .cl-date { font-size: 11px; color: var(--color-text-muted); }
    .cl-desc { font-size: 12.5px; color: var(--color-text); margin: 0; }
    .cl-user { font-size: 11px; color: var(--color-text-muted); }
    .cl-page { font-size: 12px; font-weight: 600; color: var(--color-text); }
    .cl-delete { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px; }
    .cl-delete:hover { color: var(--color-destructive); }
    .cl-add-form { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--color-surface-raised); border-radius: var(--radius-md); }
    .cl-field-row { display: flex; gap: 8px; }
    .cl-field { flex: 1; }
    .cl-add-actions { display: flex; gap: 8px; }
    .m-card-header-row { display: flex; align-items: center; justify-content: space-between; }
    .btn-add--sm { padding: 4px 10px; font-size: 12px; }
    .btn-cancel--sm { padding: 4px 10px; font-size: 12px; }

    .handoff-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-lg); margin-bottom: 16px; }
    .handoff-icon { display: flex; align-items: center; color: var(--color-accent); flex-shrink: 0; }
    .handoff-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .handoff-title { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .handoff-details { font-size: 12px; color: var(--color-text-secondary); }
    .handoff-link { color: var(--color-accent); text-decoration: underline; }
    .handoff-copy-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; font-size: 12px; font-weight: 500; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap; }
    .handoff-copy-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }

    @media (max-width: 900px) {
      .conn-grid { grid-template-columns: 1fr; }
      .gate-wrap { grid-template-columns: 1fr; }
      .kanban-board { grid-template-columns: repeat(2, 1fr); }
      .maintenance-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DevelopmentTab implements OnInit, OnDestroy {
  private fb              = inject(FormBuilder);
  private route           = inject(ActivatedRoute);
  private projectService  = inject(ProjectService);
  private state           = inject(ProjectStateService);
  private maintenanceService = inject(MaintenanceService);
  protected notifService    = inject(NotificationService);
  private auth            = inject(AuthService);

  private routeSub?: Subscription;
  private syncTimer?: ReturnType<typeof setTimeout>;
  private currentProjectId = '';

  private get projectId(): string {
    return this.currentProjectId || (this.route.parent?.snapshot.paramMap.get('id') ?? '');
  }

  protected activeTab = signal<TabId>('brief');
  protected envs: WpEnv[] = ['DEV', 'STAGING', 'PRODUCTION'];

  protected tabs = [
    { id: 'brief'       as TabId, label: 'Dev Brief',      badge: () => null as number | null },
    { id: 'kanban'      as TabId, label: 'Kanban',          badge: () => this.tasks().length > 0 ? this.tasks().length : null },
    { id: 'assets'      as TabId, label: 'Design Assets',   badge: () => this.approvedAssets().length > 0 ? this.approvedAssets().length : null },
    { id: 'content'     as TabId, label: 'Content',         badge: () => this.approvedPages().length > 0 ? this.approvedPages().length : null },
    { id: 'connections' as TabId, label: 'WP Connections',  badge: () => this.connectionsCount() },
    { id: 'queue'       as TabId, label: 'Queue',           badge: () => this.queueItems().length > 0 ? this.queueItems().length : null },
    { id: 'plugins'     as TabId, label: 'Plugins',         badge: () => this.plugins().length > 0 ? this.plugins().length : null },
    { id: 'themes'      as TabId, label: 'Themes',          badge: () => this.themes().length > 0 ? this.themes().length : null },
    { id: 'maintenance' as TabId, label: 'Maintenance Mode', badge: () => null as number | null },
    { id: 'gate'        as TabId, label: 'Soft Gate',       badge: () => null as number | null },
  ];

  protected approvedAssets = computed(() =>
    (this.state.project()?.design?.assets ?? []).filter((a): a is DesignAsset => !!a.approvedAt)
  );

  protected approvedPages = computed(() =>
    (this.state.project()?.content?.pages ?? []).filter((p): p is ContentPage => p.status === 'APPROVED')
  );

  protected approvedPagesNotInQueue = computed(() => {
    const queue = this.queueItems();
    const queuePageIds = new Set(
      queue.map(q => q.pageId).filter((id): id is string => !!id),
    );
    return this.approvedPages().filter(p => !queuePageIds.has(p.id));
  });

  protected figmaUrl = computed(() =>
    this.state.project()?.design?.figmaUrl ?? ''
  );

  protected approvedDesignAssets = computed(() =>
    (this.state.project()?.design?.assets ?? []).filter(a => !!a.approvedAt)
  );

  protected columns = COLUMNS;

  protected briefForm = this.fb.group({
    techStack:  ['', Validators.required],
    repoUrl:    [''],
    stagingUrl: [''],
    liveUrl:    [''],
    notes:      [''],
  });

  protected tasks        = signal<DevTask[]>([]);
  protected editingDesc  = signal<string | null>(null);
  protected saving       = signal(false);
  protected saveSuccess  = signal(false);
  protected gateSubmitting = signal(false);
  protected gateError    = signal<string | null>(null);
  protected gateSuccess  = signal(false);
  protected canApprove   = computed(() => this.auth.canApproveStage('DEVELOPMENT'));

  // WP Connections
  protected connections = signal<WpConnection[]>([]);
  protected connForms = signal<Record<string, Partial<WpConnectionUpsert>>>({});
  protected pwVisible = signal<Record<string, boolean>>({});
  protected connSaving = signal<Record<string, boolean>>({});
  protected connSuccess = signal<Record<string, boolean>>({});
  protected connectionsCount = computed(() => this.connections().length > 0 ? this.connections().length : null);
  protected connectionsByEnv = computed(() => {
    const map: Record<string, WpConnection> = {};
    for (const c of this.connections()) {
      map[c.env] = c;
    }
    return map;
  });

  protected connectionOk(env: WpEnv): boolean {
    const conn = this.connectionsByEnv()[env];
    return !!conn && conn.status === 'ACTIVE' && conn.connectionOk !== false;
  }

  protected connectionLost(env: WpEnv): boolean {
    const conn = this.connectionsByEnv()[env];
    return !!conn && !this.connectionOk(env);
  }

  protected connectionMessage(env: WpEnv): string {
    const conn = this.connectionsByEnv()[env];
    if (!conn) return 'Not connected';
    if (conn.connectionMessage) return conn.connectionMessage;
    return this.connectionOk(env) ? 'Connected' : 'Connection lost';
  }

  // Deployment Queue
  protected queueItems = signal<DeploymentQueueItem[]>([]);
  protected showAddQueueItem = signal(false);
  protected isSyncingApproved = signal(false);
  protected newQueueItem = signal<{ contentKind: ContentKind; title: string; slug: string; targetEnv: WpEnv; pageId?: string }>({
    contentKind: 'PAGE',
    title: '',
    slug: '',
    targetEnv: 'STAGING',
  });
  protected qaDrawerItemId = signal<string | null>(null);
  protected qaNotes = signal<string>('');
  protected newCustomQaLabel = signal('');

  protected readonly defaultQaItems: QaCheckItem[] = [
    { id: 'spelling_ok', label: 'Spelling checked' },
    { id: 'responsiveness_ok', label: 'Responsive layout verified' },
    { id: 'speed_ok', label: 'Loading speed optimized' },
    { id: 'links_ok', label: 'Links verified' },
    { id: 'forms_ok', label: 'Forms functioning' },
    { id: 'seo_ok', label: 'SEO fields populated' },
    { id: 'tracking_ok', label: 'Tracking codes verified' },
  ];

  protected qaItems = signal<QaCheckItem[]>([...this.defaultQaItems]);
  protected qaTemplateSaving = signal(false);
  protected deploymentLogs = signal<DeploymentLog[]>([]);
  protected selectedDeployEnv = signal<WpEnv>('STAGING');
  protected expandedLogs = signal<string | null>(null);
  protected prodConfirmItem = signal<DeploymentQueueItem | null>(null);
  protected prodDeploying = signal(false);

  // Plugins & Themes
  protected plugins = signal<WPPlugin[]>([]);
  protected themes = signal<WPTheme[]>([]);
  protected showAddPlugin = signal(false);
  protected showAddTheme = signal(false);
  protected newPlugin = signal<WPPluginUpsert>({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });
  protected newTheme = signal<WPThemeUpsert>({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });

  protected doneTasks  = computed(() => this.tasks().filter(t => t.status === 'LIVE' || t.status === 'MAINTENANCE').length);
  protected progressPct = computed(() => {
    const total = this.tasks().length;
    return total === 0 ? 0 : Math.round((this.doneTasks() / total) * 100);
  });
  protected stageComplete = computed(() => {
    const current = this.state.project()?.currentStage;
    return this.briefForm.valid && (this.gateSuccess() || current === 'MARKETING' || this.state.project()?.development?.completedAt !== null);
  });
  protected gateReady     = computed(() => this.briefForm.valid);

  // Maintenance fields
  protected backingUp = signal(false);
  protected perfNotes = signal('');
  protected backupHistory = signal<BackupEntry[]>([]);

  protected changeLog = signal<ChangeLogEntry[]>([]);
  protected showAddChangelog = signal(false);
  protected newChangelogEntry = signal<{ pageName: string; description: string; changedBy: string }>({ pageName: '', description: '', changedBy: '' });
  protected maintenanceRequests = signal<MaintenanceRequest[]>([]);
  protected showAddMaintenanceRequest = signal(false);
  protected newMaintenanceRequest = signal<{ title: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; target: string; requestedBy: string }>({ title: '', description: '', priority: 'MEDIUM', target: '', requestedBy: '' });
  protected uptimeChecking = signal(false);
  protected uptimeStatus = signal<string>('UNKNOWN');
  protected uptimeResponseTime = signal<number | null>(null);
  protected uptimeLastChecked = signal<string | null>(null);

  protected lastBackupDate = computed(() => {
    const list = this.backupHistory();
    return list.length > 0 ? list[0].date : null;
  });
  protected lastBackupProvider = computed(() => {
    const list = this.backupHistory();
    return list.length > 0 ? list[0].provider : null;
  });
  protected lastBackupSize = computed(() => {
    const list = this.backupHistory();
    return list.length > 0 ? list[0].size : null;
  });

  protected loadChangeLog(projectId = this.projectId) {
    this.projectService.getChangeLog(projectId).subscribe({
      next: entries => {
        if (this.isCurrentProject(projectId)) this.changeLog.set(entries);
      },
      error: () => {
        if (this.isCurrentProject(projectId)) this.changeLog.set([]);
      },
    });
  }

  protected loadDeploymentLogs(projectId = this.projectId) {
    this.projectService.getAllDeploymentLogs(projectId).subscribe({
      next: logs => {
        if (this.isCurrentProject(projectId)) this.deploymentLogs.set(logs);
      },
      error: () => {
        if (this.isCurrentProject(projectId)) this.deploymentLogs.set([]);
      },
    });
  }

  protected linkedPage(item: DeploymentQueueItem): ContentPage | undefined {
    return item.page ?? this.approvedPages().find(page => page.id === item.pageId);
  }

  protected queueSeoTitle(item: DeploymentQueueItem): string {
    const page = this.linkedPage(item);
    return page?.seoTitle ?? page?.metaTitle ?? '';
  }

  protected queueSeoDescription(item: DeploymentQueueItem): string {
    const page = this.linkedPage(item);
    return page?.seoDescription ?? page?.metaDescription ?? '';
  }

  protected queueCopyPreview(item: DeploymentQueueItem): string {
    const body = this.linkedPage(item)?.body ?? '';
    return body.length > 220 ? `${body.slice(0, 220).trim()}...` : body;
  }

  protected saveQaTemplate() {
    this.qaTemplateSaving.set(true);
    this.projectService.saveQaTemplate(this.projectId, this.qaItems()).subscribe({
      next: () => {
        this.qaTemplateSaving.set(false);
        this.notifService.toast('QA template saved for this project', 'success');
      },
      error: () => {
        this.qaTemplateSaving.set(false);
        this.notifService.toast('Failed to save QA template', 'warning');
      },
    });
  }

  protected createMaintenanceRequest() {
    const req = this.newMaintenanceRequest();
    if (!req.title.trim() || !req.description.trim()) return;
    this.projectService.createMaintenanceRequest(this.projectId, req).subscribe({
      next: created => {
        this.maintenanceRequests.update(items => [created, ...items]);
        this.showAddMaintenanceRequest.set(false);
        this.newMaintenanceRequest.set({ title: '', description: '', priority: 'MEDIUM', target: '', requestedBy: '' });
      },
      error: () => this.notifService.toast('Failed to add maintenance request', 'warning'),
    });
  }

  protected updateMaintenanceRequestStatus(requestId: string, status: 'OPEN' | 'IN_PROGRESS' | 'DONE') {
    this.projectService.updateMaintenanceRequest(this.projectId, requestId, { status }).subscribe({
      next: updated => this.maintenanceRequests.update(items => items.map(item => item.id === requestId ? { ...item, status: updated?.status ?? status } : item)),
      error: () => this.notifService.toast('Failed to update maintenance request', 'warning'),
    });
  }

  protected deleteMaintenanceRequest(requestId: string) {
    this.projectService.deleteMaintenanceRequest(this.projectId, requestId).subscribe(() => {
      this.maintenanceRequests.update(items => items.filter(item => item.id !== requestId));
    });
  }

  protected checkUptime() {
    this.uptimeChecking.set(true);
    this.projectService.checkUptime(this.projectId).subscribe({
      next: result => {
        this.uptimeStatus.set(result.status ?? 'UNKNOWN');
        this.uptimeResponseTime.set(result.responseTime ?? null);
        this.uptimeLastChecked.set(result.lastChecked ?? null);
        this.uptimeChecking.set(false);
      },
      error: () => {
        this.uptimeStatus.set('DOWN');
        this.uptimeChecking.set(false);
        this.notifService.toast('Uptime check failed', 'warning');
      },
    });
  }

  protected uptimeBadgeLabel(): string {
    return this.uptimeStatus() === 'UP' ? 'UP' : this.uptimeStatus() === 'DEGRADED' ? 'DEGRADED' : this.uptimeStatus() === 'DOWN' ? 'DOWN' : 'UNKNOWN';
  }
  protected addChangelogEntry() {
    const entry = this.newChangelogEntry();
    if (!entry.pageName || !entry.description) return;
    this.projectService.createChangeLogEntry(this.projectId, {
      ...entry,
      changedAt: new Date().toISOString(),
    }).subscribe(() => {
      this.loadChangeLog();
      this.showAddChangelog.set(false);
      this.newChangelogEntry.set({ pageName: '', description: '', changedBy: '' });
    });
  }

  protected deleteChangelogEntry(entryId: string) {
    this.projectService.deleteChangeLogEntry(this.projectId, entryId).subscribe(() => {
      this.loadChangeLog();
    });
  }

  protected triggerBackup() {
    this.backingUp.set(true);
    this.projectService.triggerProjectBackup(this.projectId).subscribe({
      next: (res) => {
        this.notifService.toast('Backup triggered successfully', 'success');
        if (res.backupHistory) {
          this.backupHistory.set(res.backupHistory);
        }
        this.backingUp.set(false);
      },
      error: () => {
        this.notifService.toast('Backup failed', 'warning');
        this.backingUp.set(false);
      },
    });
  }

  protected savePerfNotes(value: string) {
    this.perfNotes.set(value);
    this.maintenanceService.addPerfNote(value).subscribe({
      error: () => this.notifService.toast('Failed to save performance notes', 'warning'),
    });
  }

  ngOnInit() {
    this.routeSub = this.route.parent?.paramMap.pipe(
      distinctUntilChanged((prev, curr) => prev.get('id') === curr.get('id')),
    ).subscribe(params => {
      const projectId = params.get('id') ?? '';
      this.currentProjectId = projectId;
      this.resetProjectLocalState();
      this.loadProjectDevelopment(projectId);
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    if (this.syncTimer) clearTimeout(this.syncTimer);
  }

  private loadProjectDevelopment(projectId: string) {
    this.loadDevelopment(projectId);
    this.loadConnections(projectId);
    this.loadQueue(projectId);
    this.loadPlugins(projectId);
    this.loadThemes(projectId);
    this.loadChangeLog(projectId);
    this.loadDeploymentLogs(projectId);
    this.syncTimer = setTimeout(() => this.syncApprovedPages(projectId), 500);
  }

  private resetProjectLocalState() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.briefForm.reset({ techStack: '', repoUrl: '', stagingUrl: '', liveUrl: '', notes: '' });
    this.tasks.set([]);
    this.editingDesc.set(null);
    this.saving.set(false);
    this.saveSuccess.set(false);
    this.gateSubmitting.set(false);
    this.gateError.set(null);
    this.gateSuccess.set(false);
    this.connections.set([]);
    this.connForms.set({});
    this.pwVisible.set({});
    this.connSaving.set({});
    this.connSuccess.set({});
    this.queueItems.set([]);
    this.showAddQueueItem.set(false);
    this.isSyncingApproved.set(false);
    this.newQueueItem.set({ contentKind: 'PAGE', title: '', slug: '', targetEnv: 'STAGING' });
    this.qaDrawerItemId.set(null);
    this.qaNotes.set('');
    this.newCustomQaLabel.set('');
    this.qaItems.set([...this.defaultQaItems]);
    this.qaTemplateSaving.set(false);
    this.deploymentLogs.set([]);
    this.selectedDeployEnv.set('STAGING');
    this.expandedLogs.set(null);
    this.prodConfirmItem.set(null);
    this.prodDeploying.set(false);
    this.plugins.set([]);
    this.themes.set([]);
    this.showAddPlugin.set(false);
    this.showAddTheme.set(false);
    this.newPlugin.set({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });
    this.newTheme.set({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });
    this.backingUp.set(false);
    this.perfNotes.set('');
    this.backupHistory.set([]);
    this.changeLog.set([]);
    this.showAddChangelog.set(false);
    this.newChangelogEntry.set({ pageName: '', description: '', changedBy: '' });
    this.maintenanceRequests.set([]);
    this.showAddMaintenanceRequest.set(false);
    this.newMaintenanceRequest.set({ title: '', description: '', priority: 'MEDIUM', target: '', requestedBy: '' });
    this.uptimeChecking.set(false);
    this.uptimeStatus.set('UNKNOWN');
    this.uptimeResponseTime.set(null);
    this.uptimeLastChecked.set(null);
  }

  private isCurrentProject(projectId: string): boolean {
    return projectId === this.projectId;
  }

  private loadDevelopment(projectId = this.projectId) {
    const project = this.state.project();
    const dev = project?.id === projectId ? project.development : undefined;
    if (!dev) {
      this.projectService.upsertDevelopment(projectId, {}).subscribe({
        next: () => {
          if (!this.isCurrentProject(projectId)) return;
          this.projectService.getProject(projectId).subscribe(p => {
            if (!this.isCurrentProject(projectId)) return;
            this.state.setProject(p);
            if (p.development) this.loadDevelopmentData(p.development);
          });
        },
        error: () => {
          if (this.isCurrentProject(projectId)) this.notifService.toast('Failed to initialize development', 'warning');
        },
      });
      return;
    }
    this.loadDevelopmentData(dev);
  }

  private loadDevelopmentData(dev: NonNullable<Project['development']>) {
    this.briefForm.patchValue({
      techStack:  dev.techStack  ?? '',
      repoUrl:    dev.repoUrl    ?? '',
      stagingUrl: dev.stagingUrl ?? '',
      liveUrl:    dev.liveUrl    ?? '',
      notes:      dev.notes      ?? '',
    });
    this.tasks.set((dev.tasks ?? []).map(t => ({
      id: t.id, title: t.title, description: t.description ?? '',
      status: t.status as DevTaskStatus, priority: t.priority as TaskPriority,
      assigneeName: t.assigneeName ?? '', dueDate: t.dueDate?.slice(0, 10) ?? '',
      pageId: t.pageId ?? '',
    })));
    this.perfNotes.set(dev.performanceNotes ?? '');
    this.backupHistory.set(dev.backupLog ?? []);
    this.changeLog.set(dev.changeLog ?? []);
    this.qaItems.set(dev.qaTemplate?.length ? dev.qaTemplate : [...this.defaultQaItems]);
    this.maintenanceRequests.set(dev.maintenanceRequests ?? []);
    this.uptimeStatus.set(dev.uptimeStatus ?? 'UNKNOWN');
    this.uptimeResponseTime.set(dev.uptimeResponseTime ?? null);
    this.uptimeLastChecked.set(dev.uptimeLastChecked ?? null);
  }

  // ── Connections ─────────────────────────────────────────────────────────

  protected loadConnections(projectId = this.projectId) {
    this.projectService.getWpConnections(projectId).subscribe({
      next: conns => {
        if (!this.isCurrentProject(projectId)) return;
        this.connections.set(conns);
        const forms: Record<string, Partial<WpConnectionUpsert>> = {};
        for (const c of conns) {
          forms[c.env] = { siteUrl: c.siteUrl, wpUsername: c.wpUsername, notes: c.notes };
        }
        this.connForms.set(forms);
      },
      error: () => {
        if (this.isCurrentProject(projectId)) this.connections.set([]);
      },
    });
  }

  protected setConnField(env: string, field: string, value: string) {
    this.connForms.update(forms => ({
      ...forms,
      [env]: { ...(forms[env] ?? {}), [field]: value },
    }));
  }

  protected togglePw(env: string) {
    this.pwVisible.update(v => ({ ...v, [env]: !v[env] }));
  }

  protected saveConnection(env: string) {
    const form = this.connForms()[env];
    if (!form?.siteUrl) return;
    this.connSaving.update(v => ({ ...v, [env]: true }));
    this.projectService.upsertWpConnection(this.projectId, env, form).subscribe({
      next: () => {
        this.connSaving.update(v => ({ ...v, [env]: false }));
        this.connSuccess.update(v => ({ ...v, [env]: true }));
        setTimeout(() => this.connSuccess.update(v => ({ ...v, [env]: false })), 2000);
        this.loadConnections();
        this.loadPlugins();
        this.loadThemes();
      },
      error: (err) => {
        this.connSaving.update(v => ({ ...v, [env]: false }));
        this.notifService.toast(err?.error?.error ?? 'Failed to save WordPress connection', 'warning');
      },
    });
  }

  // ── Queue ───────────────────────────────────────────────────────────────

  protected loadQueue(projectId = this.projectId) {
    this.projectService.getDeploymentQueue(projectId).subscribe({
      next: items => {
        if (this.isCurrentProject(projectId)) this.queueItems.set(items);
      },
      error: () => {
        if (this.isCurrentProject(projectId)) this.queueItems.set([]);
      },
    });
  }

  protected syncApprovedPages(projectId = this.projectId) {
    this.isSyncingApproved.set(true);
    this.projectService.syncApprovedPagesToQueue(projectId).subscribe({
      next: (result) => {
        if (!this.isCurrentProject(projectId)) return;
        this.loadQueue(projectId);
        this.isSyncingApproved.set(false);
        if (result.count > 0) {
          this.notifService.toast(`Synced ${result.count} approved page(s) to queue`, 'success');
        }
      },
      error: () => {
        if (!this.isCurrentProject(projectId)) return;
        this.isSyncingApproved.set(false);
        this.notifService.toast('Failed to sync approved pages', 'warning');
      },
    });
  }

  protected createQueueItem() {
    const item = this.newQueueItem();
    if (!item.title) return;
    this.projectService.createDeploymentQueueItem(this.projectId, item).subscribe(() => {
      this.loadQueue();
      this.showAddQueueItem.set(false);
      this.newQueueItem.set({ contentKind: 'PAGE', title: '', slug: '', targetEnv: 'STAGING' });
    });
  }

  protected deleteQueueItem(id: string) {
    this.projectService.deleteDeploymentQueueItem(this.projectId, id).subscribe(() => this.loadQueue());
  }

  protected deployItem(item: DeploymentQueueItem, targetEnv: 'STAGING' | 'PRODUCTION') {
    if (targetEnv === 'PRODUCTION') {
      this.prodDeploying.set(true);
    }
    this.projectService.deploy(this.projectId, {
      queueItemId: item.id,
      targetEnv,
      confirmProduction: targetEnv === 'PRODUCTION',
    }).subscribe({
      next: () => {
        this.prodConfirmItem.set(null);
        this.prodDeploying.set(false);
        this.notifService.toast(`Deployed to ${targetEnv}: ${item.title}`, 'success');
        this.loadQueue();
      },
      error: (err) => {
        this.prodDeploying.set(false);
        this.notifService.toast(err?.error?.error ?? 'Deploy failed', 'warning');
        this.loadQueue();
      },
    });
  }

  protected openProdConfirm(item: DeploymentQueueItem) {
    this.prodConfirmItem.set(item);
  }

  // ── QA ──────────────────────────────────────────────────────────────────

  protected openQaDrawer(item: DeploymentQueueItem) {
    this.qaDrawerItemId.set(item.id);
    this.qaNotes.set(item.qaNotes ?? '');
  }

  protected qaChecklistVal(item: DeploymentQueueItem, key: string): boolean {
    return item.qaChecklist?.[key] ?? false;
  }

  protected toggleQaCheck(item: DeploymentQueueItem, key: string) {
    const checklist = { ...(item.qaChecklist ?? {}), [key]: !this.qaChecklistVal(item, key) };
    this.queueItems.update(items => items.map(i => i.id === item.id ? { ...i, qaChecklist: checklist } : i));
  }

  protected qaNotesVal(item: DeploymentQueueItem): string {
    return item.qaNotes ?? '';
  }

  protected setQaNotes(item: DeploymentQueueItem, notes: string) {
    this.queueItems.update(items => items.map(i => i.id === item.id ? { ...i, qaNotes: notes } : i));
  }

  protected addCustomQaItem() {
    const label = this.newCustomQaLabel().trim();
    if (!label) return;
    const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.qaItems.update(items => [...items, { id, label }]);
    this.newCustomQaLabel.set('');
  }

  protected allQaChecked(item: DeploymentQueueItem): boolean {
    const checklist = item.qaChecklist ?? {};
    return this.qaItems().every(qi => checklist[qi.id] === true);
  }

  protected saveQa(item: DeploymentQueueItem, qaStatus: 'PASS' | 'FAIL') {
    const data: any = { qaStatus, qaNotes: item.qaNotes ?? '' };
    if (item.qaChecklist) {
      data.qaChecklist = item.qaChecklist;
    }
    this.projectService.updateQa(this.projectId, item.id, data).subscribe(() => {
      this.notifService.toast(`QA ${qaStatus} for ${item.title}`, qaStatus === 'PASS' ? 'success' : 'warning');
      if (qaStatus === 'PASS') {
        this.qaDrawerItemId.set(null);
      }
      this.loadQueue();
    });
  }

  protected toggleLogs(itemId: string) {
    this.expandedLogs.update(v => v === itemId ? null : itemId);
  }

  // ── Plugins ─────────────────────────────────────────────────────────────

  protected loadPlugins(projectId = this.projectId) {
    this.projectService.getWpPlugins(projectId).subscribe({
      next: p => {
        if (this.isCurrentProject(projectId)) this.plugins.set(p);
      },
      error: (err) => {
        if (!this.isCurrentProject(projectId)) return;
        this.plugins.set([]);
        this.notifService.toast(err?.error?.error ?? 'Failed to load WordPress plugins', 'warning');
      },
    });
  }

  protected savePlugin() {
    const data = this.newPlugin();
    this.projectService.upsertWpPlugin(this.projectId, data.slug, { ...data, lastUpdatedAt: new Date().toISOString() }).subscribe(() => {
      this.loadPlugins();
      this.showAddPlugin.set(false);
      this.newPlugin.set({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });
    });
  }

  protected updatePluginField(p: WPPlugin, field: string, value: string) {
    this.projectService.upsertWpPlugin(this.projectId, p.slug, { ...p, [field]: value, lastUpdatedAt: new Date().toISOString() }).subscribe(() => this.loadPlugins());
  }

  protected updatePluginStatus(p: WPPlugin, status: string) {
    this.projectService.upsertWpPlugin(this.projectId, p.slug, { ...p, status: status as 'ACTIVE' | 'INACTIVE', lastUpdatedAt: new Date().toISOString() }).subscribe(() => this.loadPlugins());
  }

  // ── Themes ──────────────────────────────────────────────────────────────

  protected loadThemes(projectId = this.projectId) {
    this.projectService.getWpThemes(projectId).subscribe({
      next: t => {
        if (this.isCurrentProject(projectId)) this.themes.set(t);
      },
      error: (err) => {
        if (!this.isCurrentProject(projectId)) return;
        this.themes.set([]);
        this.notifService.toast(err?.error?.error ?? 'Failed to load WordPress themes', 'warning');
      },
    });
  }

  protected saveTheme() {
    const data = this.newTheme();
    this.projectService.upsertWpTheme(this.projectId, data.slug, { ...data, lastUpdatedAt: new Date().toISOString() }).subscribe(() => {
      this.loadThemes();
      this.showAddTheme.set(false);
      this.newTheme.set({ name: '', slug: '', version: '', status: 'INACTIVE', description: '' });
    });
  }

  protected updateThemeField(t: WPTheme, field: string, value: string) {
    this.projectService.upsertWpTheme(this.projectId, t.slug, { ...t, [field]: value, lastUpdatedAt: new Date().toISOString() }).subscribe(() => this.loadThemes());
  }

  protected updateThemeStatus(t: WPTheme, status: string) {
    this.projectService.upsertWpTheme(this.projectId, t.slug, { ...t, status: status as 'ACTIVE' | 'INACTIVE', lastUpdatedAt: new Date().toISOString() }).subscribe(() => this.loadThemes());
  }

  // ── Shared ──────────────────────────────────────────────────────────────

  protected assetIcon(type: AssetType): string {
    const icons: Record<AssetType, string> = {
      IMAGE:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      VIDEO:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      FONT:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
      DOCUMENT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      OTHER:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    };
    return icons[type] ?? icons.OTHER;
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected tasksByStatus(status: DevTaskStatus) {
    return this.tasks().filter(t => t.status === status);
  }

  protected statusLabel(status: QueueItemStatus): string {
    const labels: Record<QueueItemStatus, string> = {
      QUEUED: 'Queued',
      IN_PROGRESS: 'In Progress',
      IN_QA: 'In QA',
      STAGING_DONE: 'Staging Done',
      LIVE_DONE: 'Live',
      FAILED: 'Failed',
    };
    return labels[status] ?? status;
  }

  protected addTask() {
    this.projectService.createDevTask(this.projectId, { title: 'New Task', status: 'SETUP', priority: 'MEDIUM', sortOrder: this.tasks().length + 1 })
      .subscribe({
        next: t => this.tasks.update(list => [...list, {
          id: t.id, title: t.title, description: t.description ?? '',
          status: t.status as DevTaskStatus, priority: t.priority as TaskPriority,
          assigneeName: t.assigneeName ?? '', dueDate: '',
        }]),
        error: err => {
          const msg = err?.error?.error ?? err?.statusText ?? 'Failed to create task';
          this.notifService.toast(msg, 'warning');
        },
      });
  }

  protected deleteTask(id: string) {
    this.projectService.deleteDevTask(this.projectId, id)
      .subscribe(() => this.tasks.update(list => list.filter(t => t.id !== id)));
  }

  protected updateTask(id: string, field: keyof DevTask, value: string) {
    this.tasks.update(list => list.map(t => t.id === id ? { ...t, [field]: value } : t));
    this.projectService.updateDevTask(this.projectId, id, { [field]: value }).subscribe();
  }

  protected cycleStatus(id: string) {
    const order: DevTaskStatus[] = ['SETUP', 'IN_DEVELOPMENT', 'IN_QA', 'STAGING', 'LIVE', 'MAINTENANCE'];
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    this.projectService.updateDevTask(this.projectId, id, { status: next })
      .subscribe(() => this.tasks.update(list => list.map(t => t.id === id ? { ...t, status: next } : t)));
  }

  protected saveBrief() {
    this.briefForm.markAllAsTouched();
    if (this.briefForm.invalid) return;
    this.saving.set(true);
    const v = this.briefForm.value;
    this.projectService.upsertDevelopment(this.projectId, {
      techStack:  v.techStack  ?? undefined,
      repoUrl:    v.repoUrl    ?? undefined,
      stagingUrl: v.stagingUrl ?? undefined,
      liveUrl:    v.liveUrl    ?? undefined,
      notes:      v.notes      ?? undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 2000);
      },
      error: () => this.saving.set(false),
    });
  }

  protected copyDesignToBrief() {
    const figma = this.figmaUrl();
    if (figma) {
      const current = this.briefForm.controls.notes.value ?? '';
      this.briefForm.controls.notes.setValue(current ? `${current}\nFigma: ${figma}` : `Figma: ${figma}`);
    }
    const assets = this.approvedDesignAssets();
    if (assets.length > 0) {
      const names = assets.map(a => `- ${a.name}`).join('\n');
      const current = this.briefForm.controls.notes.value ?? '';
      this.briefForm.controls.notes.setValue(current ? `${current}\nDesign Assets:\n${names}` : `Design Assets:\n${names}`);
    }
    this.saveBrief();
  }

  protected approveGate() {
    if (!this.gateReady()) return;
    this.gateSubmitting.set(true);
    this.gateError.set(null);
    this.projectService.completeDevelopment(this.projectId).subscribe({
      next: () => {
        this.gateSubmitting.set(false);
        this.gateSuccess.set(true);
        this.projectService.getProject(this.projectId)
          .subscribe(p => this.state.setProject(p));
        const name = this.state.project()?.name ?? 'Project';
        this.notifService.add({
          type: 'stage_unlocked',
          title: 'Development gate approved',
          body: `${name} — Marketing is now unlocked`,
          projectId: this.projectId,
          projectName: name,
          route: `/app/projects/${this.projectId}/analytics`,
        });
      },
      error: (err) => {
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
        this.gateSubmitting.set(false);
      },
    });
  }
}
