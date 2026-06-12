import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Badge } from '../../../ui';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';

type TabId = 'brief' | 'kanban' | 'gate';
type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface DevTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string;
  dueDate: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO',        label: 'To Do',       color: 'var(--color-text-muted)' },
  { id: 'IN_PROGRESS', label: 'In Progress',  color: 'var(--color-info)' },
  { id: 'IN_REVIEW',   label: 'In Review',    color: 'var(--color-warning)' },
  { id: 'DONE',        label: 'Done',         color: 'var(--color-accent)' },
];

@Component({
  selector: 'app-development',
  imports: [ReactiveFormsModule, Badge],
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

            <!-- URL links -->
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
                        <input
                          class="task-title-input"
                          type="text"
                          [value]="task.title"
                          (input)="updateTask(task.id, 'title', $any($event.target).value)"
                          placeholder="Task title"
                          aria-label="Task title"
                        />
                        @if (task.description || editingDesc() === task.id) {
                          <textarea
                            class="task-desc-input"
                            [value]="task.description"
                            (input)="updateTask(task.id, 'description', $any($event.target).value)"
                            (focus)="editingDesc.set(task.id)"
                            (blur)="editingDesc.set(null)"
                            rows="2"
                            placeholder="Add description…"
                            aria-label="Task description"
                          ></textarea>
                        } @else {
                          <button class="task-add-desc" type="button" (click)="editingDesc.set(task.id)">+ description</button>
                        }
                        <div class="task-footer">
                          <select
                            class="task-priority-select"
                            [value]="task.priority"
                            (change)="updateTask(task.id, 'priority', $any($event.target).value)"
                            aria-label="Task priority"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                          @if (task.assigneeName) {
                            <span class="task-assignee">{{ task.assigneeName }}</span>
                          }
                        </div>
                      </div>
                    } @empty {
                      <div class="col-empty">No tasks</div>
                    }
                    @if (col.id === 'TODO') {
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
                      @if (briefForm.valid) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
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
                    @if (tasks().length > 0 && doneTasks() < tasks().length) {
                      <span class="warn-note">(warning — can still proceed)</span>
                    }
                  </li>
                  <li class="check-item" [class.ok]="!!briefForm.controls.repoUrl.value">
                    <span class="check-icon" [class.ok]="!!briefForm.controls.repoUrl.value" aria-hidden="true">
                      @if (briefForm.controls.repoUrl.value) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    Repository URL added
                    @if (!briefForm.controls.repoUrl.value) {
                      <span class="warn-note">(recommended)</span>
                    }
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

                <button
                  class="btn-approve"
                  type="button"
                  [disabled]="!gateReady() || gateSubmitting()"
                  (click)="approveGate()"
                >
                  @if (gateSubmitting()) {
                    <span class="spinner" aria-hidden="true"></span>
                    Approving…
                  } @else {
                    Approve Development & Unlock Marketing
                  }
                </button>

                @if (gateError()) {
                  <p class="gate-error" role="alert">{{ gateError() }}</p>
                }
                @if (gateSuccess()) {
                  <p class="gate-success" role="status">Marketing stage unlocked successfully.</p>
                }
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
    .field-label { font-size: 12.5px; font-weight: 500; color: var(--color-text); margin-bottom: 6px; }
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

    .form-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-border); }
    .btn-save {
      height: 36px; padding: 0 20px; background: #3B82F6; color: #fff; border: none;
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 7px; transition: background 0.15s;
    }
    .btn-save:hover { background: #2563EB; }
    .btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

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
    .gate-success { font-size: 12.5px; color: var(--color-accent); font-weight: 500; margin: 0; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DevelopmentTab implements OnInit {
  private fb              = inject(FormBuilder);
  private route           = inject(ActivatedRoute);
  private projectService  = inject(ProjectService);
  private state           = inject(ProjectStateService);

  private get projectId(): string {
    return this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  protected activeTab = signal<TabId>('brief');

  protected tabs = [
    { id: 'brief'  as TabId, label: 'Dev Brief',  badge: () => null },
    { id: 'kanban' as TabId, label: 'Kanban',      badge: () => this.tasks().length > 0 ? this.tasks().length : null },
    { id: 'gate'   as TabId, label: 'Soft Gate',   badge: () => null },
  ];

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

  protected doneTasks  = computed(() => this.tasks().filter(t => t.status === 'DONE').length);
  protected progressPct = computed(() => {
    const total = this.tasks().length;
    return total === 0 ? 0 : Math.round((this.doneTasks() / total) * 100);
  });
  protected stageComplete = computed(() => this.briefForm.valid && this.gateSuccess());
  protected gateReady     = computed(() => this.briefForm.valid);

  ngOnInit() {
    const dev = this.state.project()?.development;
    if (dev) {
      this.briefForm.patchValue({
        techStack:  dev.techStack  ?? '',
        repoUrl:    dev.repoUrl    ?? '',
        stagingUrl: dev.stagingUrl ?? '',
        liveUrl:    dev.liveUrl    ?? '',
        notes:      dev.notes      ?? '',
      });
      this.tasks.set((dev.tasks ?? []).map(t => ({
        id: t.id, title: t.title, description: t.description ?? '',
        status: t.status as TaskStatus, priority: t.priority as TaskPriority,
        assigneeName: t.assigneeName ?? '', dueDate: t.dueDate?.slice(0, 10) ?? '',
      })));
    }
  }

  protected tasksByStatus(status: TaskStatus) {
    return this.tasks().filter(t => t.status === status);
  }

  protected addTask() {
    this.projectService.createDevTask(this.projectId, { title: '', status: 'TODO', priority: 'MEDIUM', sortOrder: this.tasks().length + 1 })
      .subscribe(t => this.tasks.update(list => [...list, {
        id: t.id, title: t.title, description: t.description ?? '',
        status: t.status as TaskStatus, priority: t.priority as TaskPriority,
        assigneeName: t.assigneeName ?? '', dueDate: '',
      }]));
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
    const order: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
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
      },
      error: (err) => {
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
        this.gateSubmitting.set(false);
      },
    });
  }
}
