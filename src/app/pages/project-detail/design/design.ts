import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Badge } from '../../../ui';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { IntegrationService } from '../../../services/integration.service';
import { AiUsage, AiImageResult, AiImageModel, AiVideoRatio, AiVideoTaskState } from '../../../models/project.models';

type TabId = 'brief' | 'kanban' | 'assets' | 'ai' | 'gate';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type AssetType = 'IMAGE' | 'VIDEO' | 'FONT' | 'DOCUMENT' | 'OTHER';

interface DesignTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string;
  dueDate: string;
}

interface DesignAsset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl: string;
  version: number;
  notes: string;
  approvedAt: string | null;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO',        label: 'To Do',      color: 'var(--color-text-muted)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--color-info)' },
  { id: 'IN_REVIEW',   label: 'In Review',   color: 'var(--color-warning)' },
  { id: 'DONE',        label: 'Done',        color: 'var(--color-accent)' },
];

@Component({
  selector: 'app-design',
  imports: [ReactiveFormsModule, Badge],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
  template: `
    <div class="design-wrap">

      <!-- Header -->
      <div class="section-header">
        <div class="section-title-row">
          <div>
            <h3 class="section-title">Design</h3>
            <p class="section-sub">Stage 3 of 5 — Product Modelling &nbsp;·&nbsp; <span class="gate-pill soft">Soft Gate</span></p>
          </div>
          <ui-badge [variant]="stageComplete() ? 'success' : 'warning'">
            {{ stageComplete() ? 'Complete' : 'In Progress' }}
          </ui-badge>
        </div>

        <div class="tab-nav" role="tablist" aria-label="Design sections">
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
          <section aria-label="Design Brief" [formGroup]="briefForm">
            <div class="form-grid">
              <div class="field span-full">
                <label class="field-label" for="design-brief">Design Brief <span class="req" aria-hidden="true">*</span></label>
                <textarea id="design-brief" class="field-textarea" formControlName="brief" rows="5"
                  placeholder="Describe the visual direction, design goals, key screens or pages, and any constraints or requirements."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="style-guide">Style Guide Notes</label>
                <textarea id="style-guide" class="field-textarea" formControlName="styleGuide" rows="3"
                  placeholder="Spacing system, component patterns, colour usage rules, icon set, grid system."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="figma-url">Figma File URL</label>
                <input id="figma-url" class="field-input" type="url" formControlName="figmaUrl"
                  placeholder="https://www.figma.com/file/…" />
                @if (briefForm.controls.figmaUrl.value) {
                  <a class="figma-link" [href]="briefForm.controls.figmaUrl.value" target="_blank" rel="noopener noreferrer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Open in Figma
                  </a>
                }
              </div>
              @if (figmaEmbed(); as embed) {
                <div class="field span-full figma-embed-wrap">
                  <iframe class="figma-embed" [src]="embed" title="Figma design preview" loading="lazy" allowfullscreen></iframe>
                </div>
              }
            </div>
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveBrief()">Save Brief</button>
            </div>
          </section>
        }

        <!-- Kanban tab -->
        @if (activeTab() === 'kanban') {
          <section aria-label="Design Kanban Board">
            <div class="kanban-toolbar">
              <div class="task-stats">
                <span class="stat"><strong>{{ tasks().length }}</strong> tasks</span>
                <span class="stat-divider" aria-hidden="true">·</span>
                <span class="stat"><strong>{{ doneTasks() }}</strong> done</span>
                @if (tasks().length > 0) {
                  <span class="stat-divider" aria-hidden="true">·</span>
                  <span class="stat"><strong>{{ progressPct() }}%</strong> complete</span>
                }
              </div>
              <button class="btn-add" type="button" (click)="addTask()" aria-label="Add task">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Task
              </button>
            </div>

            <!-- Progress bar -->
            @if (tasks().length > 0) {
              <div class="progress-row" aria-label="Overall progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="progressPct()"></div>
                </div>
              </div>
            }

            <!-- Board -->
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
                        <div class="task-card-top">
                          <span class="task-priority-dot" [class]="'p-' + task.priority.toLowerCase()" aria-label="{{ task.priority }} priority"></span>
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
                        <div class="task-card-footer">
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
                      <div class="col-empty">Drop tasks here</div>
                    }
                    <!-- Quick add at bottom of TODO column -->
                    @if (col.id === 'TODO') {
                      <button class="col-add-btn" type="button" (click)="addTask()" aria-label="Add task to To Do">
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

        <!-- Assets tab -->
        @if (activeTab() === 'assets') {
          <section aria-label="Asset Library">
            <div class="assets-toolbar">
              <div class="asset-filters">
                @for (filter of assetFilters; track filter.value) {
                  <button
                    class="filter-btn"
                    [class.active]="assetFilter() === filter.value"
                    type="button"
                    (click)="assetFilter.set(filter.value)"
                  >{{ filter.label }}</button>
                }
              </div>
              <button class="btn-add" type="button" (click)="addingAsset.set(true)" aria-label="Add asset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Asset
              </button>
            </div>

            <!-- Add asset form -->
            @if (addingAsset()) {
              <div class="asset-form-card" [formGroup]="assetForm">
                <p class="asset-form-title">New Asset</p>
                <div class="asset-form-grid">
                  <div class="field">
                    <label class="field-label" for="asset-name">Name <span class="req" aria-hidden="true">*</span></label>
                    <input id="asset-name" class="field-input" type="text" formControlName="name" placeholder="e.g. Hero Banner v2" />
                  </div>
                  <div class="field">
                    <label class="field-label" for="asset-type">Type</label>
                    <select id="asset-type" class="field-select" formControlName="type">
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="FONT">Font</option>
                      <option value="DOCUMENT">Document</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div class="field span-full">
                    <label class="field-label" for="asset-url">URL <span class="req" aria-hidden="true">*</span></label>
                    <input id="asset-url" class="field-input" type="url" formControlName="url" placeholder="https://…" />
                  </div>
                  <div class="field span-full">
                    <label class="field-label" for="asset-notes">Notes</label>
                    <input id="asset-notes" class="field-input" type="text" formControlName="notes" placeholder="Version notes, usage guidelines, etc." />
                  </div>
                </div>
                <div class="asset-form-actions">
                  <button class="btn-ghost" type="button" (click)="cancelAsset()">Cancel</button>
                  <button class="btn-save" type="button" (click)="saveAsset()">Add Asset</button>
                </div>
              </div>
            }

            <!-- Asset grid -->
            <div class="asset-grid" role="list">
              @for (asset of filteredAssets(); track asset.id) {
                <div class="asset-card" role="listitem">
                  <div class="asset-thumb" [class]="'type-' + asset.type.toLowerCase()">
                    @if (asset.thumbnailUrl) {
                      <img [src]="asset.thumbnailUrl" [alt]="asset.name" loading="lazy" />
                    } @else if (asset.type === 'IMAGE' && asset.url) {
                      <img [src]="asset.url" [alt]="asset.name" loading="lazy" />
                    } @else {
                      <span class="asset-type-icon" aria-hidden="true">{{ assetIcon(asset.type) }}</span>
                    }
                    @if (asset.approvedAt) {
                      <span class="asset-approved-badge" aria-label="Approved">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    }
                  </div>
                  <div class="asset-info">
                    <span class="asset-name">{{ asset.name }}</span>
                    <span class="asset-meta">v{{ asset.version }} · {{ asset.type.toLowerCase() }}</span>
                    @if (asset.notes) {
                      <span class="asset-notes">{{ asset.notes }}</span>
                    }
                  </div>
                  <div class="asset-actions">
                    <a class="asset-link-btn" [href]="asset.url" target="_blank" rel="noopener noreferrer"
                      (click)="openAsset(asset, $event)" aria-label="Open asset">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    @if (!asset.approvedAt) {
                      <button class="asset-approve-btn" type="button" (click)="approveAsset(asset.id)" aria-label="Approve asset">Approve</button>
                    }
                    <button class="asset-del-btn" type="button" (click)="deleteAsset(asset.id)" aria-label="Delete asset">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-hint">No assets yet. Add images, fonts, documents, or links to design files.</div>
              }
            </div>
          </section>
        }

        <!-- AI Images tab -->
        @if (activeTab() === 'ai') {
          <section aria-label="AI image and video generation" class="ai-panel">
            <div class="ai-gen-card">
              <h3 class="ai-usage-title">AI Images</h3>
              <label class="field-label" for="ai-prompt">Describe the image you need</label>
              <textarea id="ai-prompt" class="field-textarea" rows="3"
                placeholder="e.g. Minimalist hero illustration of fresh vegetables on a pastel green background, soft studio lighting"
                [value]="aiPrompt()" (input)="aiPrompt.set($any($event.target).value)"
                [disabled]="aiGenerating()"></textarea>
              <div class="ai-controls">
                <select class="ai-size-select" [value]="aiModel()" (change)="aiModel.set($any($event.target).value)"
                  aria-label="Image model" [disabled]="aiGenerating() || aiProviders().length === 0">
                  @for (p of aiProviders(); track p.value) {
                    <option [value]="p.value">{{ p.label }}</option>
                  }
                  @if (aiProviders().length === 0) {
                    <option value="" disabled selected>No model configured</option>
                  }
                </select>
                <select class="ai-size-select" [value]="aiSize()" (change)="aiSize.set($any($event.target).value)"
                  aria-label="Image size" [disabled]="aiGenerating()">
                  <option value="1024x1024">Square · 1024×1024 ({{ sizeCost('1024x1024') }})</option>
                  <option value="1536x1024">Landscape · 1536×1024 ({{ sizeCost('1536x1024') }})</option>
                  <option value="1024x1536">Portrait · 1024×1536 ({{ sizeCost('1024x1536') }})</option>
                </select>
                <button class="btn-save" type="button" (click)="generateImage()"
                  [disabled]="aiGenerating() || aiPrompt().trim().length < 3 || aiProviders().length === 0">
                  @if (aiGenerating()) { Generating… } @else { Generate Image }
                </button>
              </div>
              @if (aiProviders().length === 0) {
                <p class="ai-provider-hint">No image provider is configured. Add an OpenAI or Stability API key on the server to enable AI images.</p>
              }
              @if (aiError()) { <div class="ai-error" role="alert">{{ aiError() }}</div> }
            </div>

            @if (aiResult(); as result) {
              <div class="ai-result-card">
                <img class="ai-result-img" [src]="result.image" alt="AI-generated image for prompt: {{ aiPrompt() }}" />
                @if (result.revisedPrompt) {
                  <p class="ai-revised">DALL·E interpreted your prompt as: “{{ result.revisedPrompt }}”</p>
                }
                <div class="ai-result-actions">
                  @if (aiSaved()) {
                    <span class="ai-saved-ok" role="status">✓ Saved to asset library</span>
                  } @else {
                    <button class="btn-save" type="button" (click)="saveAiImageToAssets()" [disabled]="aiEditing()">Save to Assets</button>
                  }
                  <button class="btn-ghost" type="button" (click)="generateImage()"
                    [disabled]="aiGenerating() || aiEditing()"
                    aria-label="Regenerate with the same prompt">
                    ↻ Regenerate
                  </button>
                  <button class="btn-ghost" type="button" (click)="discardAiResult()"
                    [disabled]="aiGenerating() || aiEditing()">
                    Discard
                  </button>
                </div>

                <!-- Refine the current image (image edits go through OpenAI) -->
                @if (openaiConfigured()) {
                  <div class="ai-edit-row">
                    <input class="ai-edit-input" type="text"
                      placeholder="Describe a change — e.g. make the bowl dark green, remove the mint leaf"
                      [value]="aiEditInstruction()"
                      (input)="aiEditInstruction.set($any($event.target).value)"
                      [disabled]="aiEditing()"
                      aria-label="Edit instruction for the generated image" />
                    <button class="btn-save" type="button" (click)="editImage()"
                      [disabled]="aiEditing() || aiGenerating() || aiEditInstruction().trim().length < 3">
                      @if (aiEditing()) { Editing… } @else { Apply Edit }
                    </button>
                  </div>
                }
              </div>
            }

            <!-- AI Video (Runway gen4_turbo — async: create task, poll, preview, save) -->
            @if (runwayConfigured()) {
              <div class="ai-gen-card">
                <h3 class="ai-usage-title">AI Video</h3>
                <label class="field-label" for="ai-video-prompt">Describe the video you need</label>
                <textarea id="ai-video-prompt" class="field-textarea" rows="3"
                  placeholder="e.g. Slow cinematic pan over a rustic wooden table with fresh vegetables, morning light, shallow depth of field"
                  [value]="videoPrompt()" (input)="videoPrompt.set($any($event.target).value)"
                  [disabled]="videoBusy()"></textarea>
                <div class="ai-controls">
                  <select class="ai-size-select" [value]="videoRatio()" (change)="videoRatio.set($any($event.target).value)"
                    aria-label="Video aspect ratio" [disabled]="videoBusy()">
                    <option value="1280:720">Landscape · 1280×720</option>
                    <option value="720:1280">Portrait · 720×1280</option>
                    <option value="960:960">Square · 960×960</option>
                  </select>
                  <select class="ai-size-select" [value]="videoDuration()" (change)="setVideoDuration($any($event.target).value)"
                    aria-label="Video duration" [disabled]="videoBusy()">
                    <option [value]="5">5 seconds (~$0.25)</option>
                    <option [value]="10">10 seconds (~$0.50)</option>
                  </select>
                  <button class="btn-save" type="button" (click)="generateVideo()"
                    [disabled]="videoBusy() || videoPrompt().trim().length < 3">
                    @if (videoBusy()) { Generating… } @else { Generate Video }
                  </button>
                </div>
                @if (videoError()) { <div class="ai-error" role="alert">{{ videoError() }}</div> }

                @if (videoBusy()) {
                  <div class="video-progress" role="status" aria-label="Video generation progress">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="videoProgressPct()"></div>
                    </div>
                    <span class="video-progress-label">
                      {{ videoStatusLabel() }}@if (videoProgressPct() > 0) { · {{ videoProgressPct() }}%}
                    </span>
                  </div>
                }

                @if (videoUrl(); as url) {
                  <video class="ai-video-preview" [src]="url" controls preload="metadata"
                    aria-label="AI-generated video preview"></video>
                  <div class="ai-result-actions">
                    @if (videoSaved()) {
                      <span class="ai-saved-ok" role="status">✓ Saved to asset library</span>
                    } @else {
                      <button class="btn-save" type="button" (click)="saveAiVideoToAssets()" [disabled]="videoSaving()">
                        @if (videoSaving()) { Saving… } @else { Save to Assets }
                      </button>
                    }
                    <button class="btn-ghost" type="button" (click)="discardAiVideo()" [disabled]="videoSaving()">Discard</button>
                  </div>
                }
              </div>
            }

            <!-- API usage tracker -->
            @if (aiUsage(); as usage) {
              <div class="ai-usage-card">
                <h3 class="ai-usage-title">API Usage Tracker</h3>
                <div class="ai-usage-stats">
                  <div class="usage-stat"><span class="usage-val">{{ usage.month.count }}</span><span class="usage-lbl">images this month</span></div>
                  <div class="usage-stat"><span class="usage-val">{{ '$' + usage.month.costUsd.toFixed(2) }}</span><span class="usage-lbl">cost this month</span></div>
                  <div class="usage-stat"><span class="usage-val">{{ usage.total.count }}</span><span class="usage-lbl">images all-time</span></div>
                  <div class="usage-stat"><span class="usage-val">{{ '$' + usage.total.costUsd.toFixed(2) }}</span><span class="usage-lbl">cost all-time</span></div>
                </div>
                @if (usage.recent.length > 0) {
                  <div class="usage-list" role="list" aria-label="Recent generations for this project">
                    @for (ev of usage.recent; track ev.id) {
                      <div class="usage-row" role="listitem">
                        <span class="usage-prompt">{{ ev.prompt }}</span>
                        <span class="usage-meta">{{ ev.userName ?? '—' }} · {{ ev.success ? ('$' + ev.costUsd.toFixed(2)) : 'failed' }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
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
                    <p class="banner-desc">Unlike a Hard Gate, a Soft Gate allows you to proceed to Development even if some tasks are incomplete. Any warnings will be shown below.</p>
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
                    Design brief completed
                  </li>
                  <li class="check-item" [class.ok]="tasks().length > 0" [class.warn]="tasks().length > 0 && doneTasks() < tasks().length">
                    <span class="check-icon" [class.ok]="doneTasks() === tasks().length && tasks().length > 0" [class.warn]="tasks().length > 0 && doneTasks() < tasks().length" aria-hidden="true">
                      @if (doneTasks() === tasks().length && tasks().length > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (tasks().length > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      }
                    </span>
                    Design tasks: {{ doneTasks() }}/{{ tasks().length }} done
                    @if (tasks().length > 0 && doneTasks() < tasks().length) {
                      <span class="warn-note">(warning — can still proceed)</span>
                    }
                  </li>
                  <li class="check-item" [class.ok]="approvedAssets() > 0">
                    <span class="check-icon" [class.ok]="approvedAssets() > 0" aria-hidden="true">
                      @if (approvedAssets() > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    Assets: {{ approvedAssets() }} approved
                  </li>
                </ul>
              </div>

              <div class="gate-action">
                <div class="gate-status-card" [class.ready]="gateReady()">
                  @if (gateReady()) {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <div>
                      <p class="gate-card-title">Ready to proceed</p>
                      <p class="gate-card-desc">
                        @if (doneTasks() < tasks().length && tasks().length > 0) {
                          {{ tasks().length - doneTasks() }} task(s) still open — proceeding with warnings.
                        } @else {
                          All requirements met. Design can be approved.
                        }
                      </p>
                    </div>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p class="gate-card-title">Brief required</p>
                      <p class="gate-card-desc">Complete the design brief before approving this stage.</p>
                    </div>
                  }
                </div>

                @if (canApprove()) {
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
                      Approve Design & Unlock Development
                    }
                  </button>

                  @if (gateError()) {
                    <p class="gate-error" role="alert">{{ gateError() }}</p>
                  }
                  @if (gateSuccess()) {
                    <p class="gate-success" role="status">Development stage unlocked successfully.</p>
                  }
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

      </div>
    </div>
  `,
  styles: [`
    .design-wrap { display: flex; flex-direction: column; gap: 0; }

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
    .tab-btn.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .tab-badge { background: var(--color-accent-light); color: var(--color-accent); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    .tab-panels { padding-top: 24px; }

    /* Brief */
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; }
    .field-label { font-size: 12.5px; font-weight: 500; color: var(--color-text); margin-bottom: 6px; }
    .req { color: var(--color-destructive); }
    .field-input, .field-select {
      height: 36px; padding: 0 10px; border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px;
      color: var(--color-text); background: var(--color-surface); outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus, .field-select:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
    .field-textarea {
      padding: 8px 10px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface);
      resize: vertical; outline: none; line-height: 1.6; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-textarea:focus { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
    .figma-link {
      display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 12.5px;
      color: var(--color-info); text-decoration: none;
    }
    .figma-link:hover { text-decoration: underline; }
    .figma-embed-wrap { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-surface-raised); }
    .figma-embed { display: block; width: 100%; height: 480px; border: none; }

    /* AI Images */
    .ai-panel { display: flex; flex-direction: column; gap: 16px; }
    .ai-gen-card, .ai-result-card, .ai-usage-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .ai-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ai-provider-hint { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .ai-size-select { height: 36px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); cursor: pointer; }
    .ai-error { font-size: 12.5px; color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); padding: 8px 12px; }
    .ai-result-img { max-width: 100%; max-height: 480px; object-fit: contain; border-radius: var(--radius-md); border: 1px solid var(--color-border); align-self: flex-start; }
    .ai-revised { font-size: 12px; color: var(--color-text-muted); font-style: italic; margin: 0; }
    .ai-result-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ai-saved-ok { font-size: 12.5px; font-weight: 600; color: #16A34A; }
    .btn-ghost { height: 34px; padding: 0 14px; background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.12s; }
    .btn-ghost:hover:not(:disabled) { background: var(--color-surface-raised); }
    .btn-ghost:disabled { opacity: 0.5; cursor: default; }
    .ai-edit-row { display: flex; gap: 8px; align-items: center; }
    .ai-video-preview { max-width: 100%; max-height: 480px; border-radius: var(--radius-md); border: 1px solid var(--color-border); align-self: flex-start; background: #000; }
    .video-progress { display: flex; flex-direction: column; gap: 6px; }
    .video-progress-label { font-size: 12px; color: var(--color-text-muted); }
    .ai-edit-input { flex: 1; height: 36px; padding: 0 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .ai-edit-input:focus { border-color: var(--color-accent, #16A34A); }
    .ai-usage-title { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; }
    .ai-usage-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
    .usage-stat { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: var(--color-surface-raised); border-radius: var(--radius-md); }
    .usage-val { font-size: 17px; font-weight: 700; color: var(--color-text); }
    .usage-lbl { font-size: 11px; color: var(--color-text-muted); }
    .usage-list { display: flex; flex-direction: column; gap: 4px; }
    .usage-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .usage-prompt { font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .usage-meta { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-border); }
    .btn-save { height: 36px; padding: 0 20px; background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .btn-save:hover { background: var(--color-accent-hover); }

    /* Kanban toolbar */
    .kanban-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .task-stats { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); }
    .task-stats strong { color: var(--color-text); font-weight: 600; }
    .stat-divider { color: var(--color-border-strong); }
    .btn-add { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text); cursor: pointer; transition: background 0.15s; }
    .btn-add:hover { background: var(--color-border); }

    .progress-row { margin-bottom: 16px; }
    .progress-bar { height: 5px; background: var(--color-surface-raised); border-radius: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--color-accent); border-radius: 10px; transition: width 0.3s ease; }

    /* Board */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kanban-col { display: flex; flex-direction: column; gap: 8px; }
    .col-header { display: flex; align-items: center; gap: 7px; padding: 0 0 8px; border-bottom: 1px solid var(--color-border); }
    .col-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .col-label { font-size: 12px; font-weight: 600; color: var(--color-text); flex: 1; }
    .col-count { font-size: 11px; font-weight: 600; background: var(--color-surface-raised); color: var(--color-text-muted); padding: 1px 6px; border-radius: 10px; }
    .col-body { display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .col-empty { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 20px 0; border: 1.5px dashed var(--color-border); border-radius: var(--radius-md); }

    /* Task cards */
    .task-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
    .task-card.priority-high { border-left: 3px solid var(--color-destructive); }
    .task-card.priority-medium { border-left: 3px solid var(--color-warning); }
    .task-card.priority-low { border-left: 3px solid var(--color-border-strong); }
    .task-card-top { display: flex; align-items: center; justify-content: space-between; }
    .task-priority-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .task-priority-dot.p-high { background: var(--color-destructive); }
    .task-priority-dot.p-medium { background: var(--color-warning); }
    .task-priority-dot.p-low { background: var(--color-border-strong); }
    .task-actions { display: flex; gap: 2px; }
    .task-move-btn, .task-del-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 4px; cursor: pointer; color: var(--color-text-muted); transition: background 0.12s, color 0.12s; }
    .task-move-btn:hover { background: var(--color-accent-light); color: var(--color-accent); }
    .task-del-btn:hover { background: var(--color-destructive-light); color: var(--color-destructive); }
    .task-title-input { font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text); border: none; outline: none; background: transparent; width: 100%; padding: 0; }
    .task-title-input::placeholder { color: var(--color-text-muted); }
    .task-desc-input { font-family: var(--font-sans); font-size: 12px; color: var(--color-text-secondary); border: none; outline: none; background: transparent; width: 100%; padding: 0; resize: none; line-height: 1.5; }
    .task-desc-input::placeholder { color: var(--color-text-muted); }
    .task-add-desc { font-family: var(--font-sans); font-size: 11.5px; color: var(--color-text-muted); background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
    .task-add-desc:hover { color: var(--color-text-secondary); }
    .task-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
    .task-priority-select { font-family: var(--font-sans); font-size: 11px; color: var(--color-text-muted); background: none; border: none; outline: none; cursor: pointer; padding: 0; }
    .task-assignee { font-size: 11px; color: var(--color-text-muted); }
    .col-add-btn { display: flex; align-items: center; gap: 5px; width: 100%; padding: 7px; background: none; border: 1.5px dashed var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12px; color: var(--color-text-muted); cursor: pointer; justify-content: center; transition: border-color 0.15s, color 0.15s; }
    .col-add-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

    /* Assets */
    .assets-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .asset-filters { display: flex; gap: 4px; }
    .filter-btn { height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 20px; font-family: var(--font-sans); font-size: 12.5px; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover { border-color: var(--color-border-strong); color: var(--color-text); }
    .filter-btn.active { background: var(--color-sidebar); color: #fff; border-color: var(--color-sidebar); }

    .asset-form-card { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px 20px; margin-bottom: 16px; }
    .asset-form-title { font-size: 13.5px; font-weight: 600; color: var(--color-text); margin: 0 0 14px; }
    .asset-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .span-full { grid-column: 1 / -1; }
    .asset-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .btn-ghost { height: 34px; padding: 0 16px; background: none; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text-secondary); cursor: pointer; transition: background 0.15s; }
    .btn-ghost:hover { background: var(--color-surface-raised); }

    .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .asset-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: box-shadow 0.15s; }
    .asset-card:hover { box-shadow: var(--shadow-raised); }
    .asset-thumb {
      height: 120px; display: flex; align-items: center; justify-content: center;
      background: var(--color-surface-raised); position: relative;
    }
    .asset-thumb.type-image { background: #EFF6FF; }
    .asset-thumb.type-video { background: #FFF7ED; }
    .asset-thumb.type-font  { background: #F5F3FF; }
    .asset-thumb.type-document { background: #F0FDF4; }
    .asset-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .asset-type-icon { font-size: 32px; }
    .asset-approved-badge { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; }
    .asset-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .asset-name { font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-meta { font-size: 11.5px; color: var(--color-text-muted); }
    .asset-notes { font-size: 11.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-actions { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-top: 1px solid var(--color-border); }
    .asset-link-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-sm); color: var(--color-text-secondary); transition: background 0.15s; }
    .asset-link-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .asset-approve-btn { flex: 1; height: 26px; background: var(--color-accent-light); color: var(--color-accent); border: none; border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .asset-approve-btn:hover { background: var(--color-accent); color: #fff; }
    .asset-del-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: none; border-radius: var(--radius-sm); color: var(--color-text-muted); cursor: pointer; transition: background 0.15s, color 0.15s; }
    .asset-del-btn:hover { background: var(--color-destructive-light); color: var(--color-destructive); }

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
    .gate-status-card.ready { background: var(--color-accent-light); border-color: var(--color-accent); color: var(--color-accent); }
    .gate-card-title { font-size: 13.5px; font-weight: 600; margin: 0 0 3px; color: inherit; }
    .gate-card-desc { font-size: 12.5px; margin: 0; color: inherit; opacity: 0.85; }
    .btn-approve { height: 40px; padding: 0 20px; background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
    .btn-approve:hover:not(:disabled) { background: var(--color-accent-hover); }
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
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-hint { font-size: 13px; color: var(--color-text-muted); padding: 16px 0; }
  `]
})
export class DesignModule implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private state = inject(ProjectStateService);
  private auth  = inject(AuthService);
  private notifService = inject(NotificationService);
  private integrationService = inject(IntegrationService);
  protected canApprove = computed(() => this.auth.canApproveStage('DESIGN'));

  private get projectId(): string {
    return this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  protected activeTab = signal<TabId>('brief');

  protected tabs = [
    { id: 'brief'  as TabId, label: 'Design Brief', badge: () => null },
    { id: 'kanban' as TabId, label: 'Kanban',       badge: () => this.tasks().length > 0 ? this.tasks().length : null },
    { id: 'assets' as TabId, label: 'Assets',       badge: () => this.assets().length > 0 ? this.assets().length : null },
    { id: 'ai'     as TabId, label: 'AI Studio',    badge: () => null },
    { id: 'gate'   as TabId, label: 'Soft Gate',    badge: () => null },
  ];

  protected columns = COLUMNS;

  protected briefForm = this.fb.group({
    brief:      ['', Validators.required],
    styleGuide: [''],
    figmaUrl:   [''],
  });

  private sanitizer = inject(DomSanitizer);
  private figmaUrlValue = toSignal(this.briefForm.controls.figmaUrl.valueChanges, {
    initialValue: this.briefForm.controls.figmaUrl.value,
  });
  protected figmaEmbed = computed<SafeResourceUrl | null>(() => {
    const raw = (this.figmaUrlValue() ?? '').trim();
    if (!/^https:\/\/([\w-]+\.)?figma\.com\/(file|design|proto|board)\//.test(raw)) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.figma.com/embed?embed_host=anka-sphere&url=${encodeURIComponent(raw)}`
    );
  });

  // ── AI image generation ────────────────────────────────────────────────────
  protected aiPrompt     = signal('');
  protected aiSize       = signal<'1024x1024' | '1536x1024' | '1024x1536'>('1024x1024');
  protected aiModel      = signal<AiImageModel>('openai');
  protected aiGenerating = signal(false);
  protected aiError      = signal<string | null>(null);
  protected aiResult     = signal<AiImageResult | null>(null);
  protected aiSaved      = signal(false);
  protected aiUsage      = signal<AiUsage | null>(null);

  /** Which image providers have server-side credentials (from GET /integrations). */
  private configuredProviders = signal<Set<string>>(new Set(['OPENAI']));
  protected aiProviders = computed<{ value: AiImageModel; label: string }[]>(() => {
    const configured = this.configuredProviders();
    const list: { value: AiImageModel; label: string }[] = [];
    if (configured.has('OPENAI'))    list.push({ value: 'openai',    label: 'OpenAI' });
    if (configured.has('STABILITY')) list.push({ value: 'stability', label: 'Stability' });
    return list;
  });
  protected openaiConfigured = computed(() => this.configuredProviders().has('OPENAI'));
  protected runwayConfigured = computed(() => this.configuredProviders().has('RUNWAY'));

  // ── AI video generation (Runway — async task, polled every few seconds) ────
  protected videoPrompt   = signal('');
  protected videoRatio    = signal<AiVideoRatio>('1280:720');
  protected videoDuration = signal<5 | 10>(5);
  protected videoBusy     = signal(false);
  protected videoStatus   = signal<AiVideoTaskState | null>(null);
  protected videoProgress = signal(0);
  protected videoError    = signal<string | null>(null);
  protected videoUrl      = signal<string | null>(null);
  protected videoTaskId   = signal<string | null>(null);
  protected videoSaved    = signal(false);
  protected videoSaving   = signal(false);

  private activeVideoBlobUrl: string | null = null;

  private setVideoUrl(url: string | null): void {
    if (this.activeVideoBlobUrl) {
      URL.revokeObjectURL(this.activeVideoBlobUrl);
      this.activeVideoBlobUrl = null;
    }

    if (url && url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        this.activeVideoBlobUrl = blobUrl;
        this.videoUrl.set(blobUrl);
      } catch (e) {
        console.error('Failed to convert video data URI to Blob URL:', e);
        this.videoUrl.set(url);
      }
    } else {
      this.videoUrl.set(url);
    }
  }

  private videoPollTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyRef = inject(DestroyRef);

  protected videoProgressPct = computed(() => Math.round(this.videoProgress() * 100));

  protected setVideoDuration(value: string): void {
    this.videoDuration.set(value === '10' ? 10 : 5);
  }
  protected videoStatusLabel = computed(() => {
    switch (this.videoStatus()) {
      case 'RUNNING':   return 'Generating video';
      case 'THROTTLED': return 'Queued (provider busy)';
      default:          return 'Starting up';
    }
  });

  protected generateVideo(): void {
    if (this.hasUnsavedAiVideo() && !confirm('The current video has not been saved to Assets and will be replaced. Continue?')) return;
    this.videoError.set(null);
    this.setVideoUrl(null);
    this.videoSaved.set(false);
    this.videoProgress.set(0);
    this.videoStatus.set(null);
    this.videoBusy.set(true);
    this.projectService.generateAiVideo(this.projectId, {
      prompt: this.videoPrompt().trim(),
      duration: this.videoDuration(),
      ratio: this.videoRatio(),
    }).subscribe({
      next: ({ taskId }) => {
        this.videoTaskId.set(taskId);
        this.pollVideoTask(taskId);
      },
      error: (err) => {
        this.videoError.set(err?.error?.error ?? 'Video generation failed to start. Please try again.');
        this.videoBusy.set(false);
        this.loadAiUsage();
      },
    });
  }

  private pollVideoTask(taskId: string): void {
    this.projectService.getAiVideoTask(this.projectId, taskId).subscribe({
      next: (task) => {
        if (this.videoTaskId() !== taskId) return; // superseded by a newer generation
        this.videoStatus.set(task.status);
        this.videoProgress.set(task.progress);
        if (task.status === 'SUCCEEDED' && task.videoUrl) {
          this.setVideoUrl(task.videoUrl);
          this.videoBusy.set(false);
          this.loadAiUsage();
        } else if (task.status === 'FAILED' || task.status === 'CANCELLED') {
          this.videoError.set(task.failure ?? 'Video generation failed. Please try again.');
          this.videoBusy.set(false);
          this.loadAiUsage();
        } else {
          this.scheduleVideoPoll(taskId);
        }
      },
      error: () => {
        if (this.videoTaskId() !== taskId) return;
        // Transient poll failure — keep trying, the task is still running server-side
        this.scheduleVideoPoll(taskId);
      },
    });
  }

  private scheduleVideoPoll(taskId: string): void {
    if (this.videoPollTimer) clearTimeout(this.videoPollTimer);
    this.videoPollTimer = setTimeout(() => this.pollVideoTask(taskId), 4000);
  }

  protected saveAiVideoToAssets(): void {
    const taskId = this.videoTaskId();
    if (!taskId) return;
    this.videoSaving.set(true);
    this.projectService.saveAiVideoToAssets(this.projectId, taskId, {
      assetName: `AI Video · ${this.videoPrompt().trim().slice(0, 60)}`,
    }).subscribe({
      next: ({ asset }) => {
        this.assets.update(list => [...list, { id: asset.id, name: asset.name, type: asset.type as AssetType, url: asset.url, thumbnailUrl: '', version: asset.version, notes: asset.notes ?? '', approvedAt: asset.approvedAt ?? null }]);
        this.videoSaved.set(true);
        this.videoSaving.set(false);
      },
      error: (err) => {
        this.videoError.set(err?.error?.error ?? 'Could not save the video to Assets.');
        this.videoSaving.set(false);
      },
    });
  }

  protected discardAiVideo(): void {
    if (this.hasUnsavedAiVideo() && !confirm('This video has not been saved to Assets. Discard it anyway?')) return;
    this.setVideoUrl(null);
    this.videoTaskId.set(null);
    this.videoSaved.set(false);
    this.videoError.set(null);
    this.videoStatus.set(null);
    this.videoProgress.set(0);
  }

  private hasUnsavedAiVideo(): boolean {
    return !!this.videoUrl() && !this.videoSaved();
  }

  // gpt-image-1 charges per size; Stable Image Core is a flat ~$0.03/image
  protected sizeCost(size: string): string {
    if (this.aiModel() === 'stability') return '$0.03';
    return size === '1024x1024' ? '$0.04' : '$0.06';
  }

  private loadIntegrations(): void {
    this.integrationService.getIntegrations().subscribe({
      next: ({ integrations }) => {
        const configured = new Set(
          integrations.filter(i => i.configured).map(i => i.provider as string),
        );
        this.configuredProviders.set(configured);
        // If the current selection is unavailable, fall back to the first configured provider
        const providers = this.aiProviders();
        if (providers.length > 0 && !providers.some(p => p.value === this.aiModel())) {
          this.aiModel.set(providers[0].value);
        }
      },
      error: () => { /* picker falls back to OpenAI-only */ },
    });
  }

  protected generateImage(): void {
    if (this.hasUnsavedAiImage() && !confirm('The current image has not been saved to Assets and will be replaced. Continue?')) return;
    this.aiError.set(null);
    this.aiSaved.set(false);
    this.aiGenerating.set(true);
    this.projectService.generateAiImage(this.projectId, {
      prompt: this.aiPrompt().trim(),
      size: this.aiSize(),
      model: this.aiModel(),
    }).subscribe({
      next: (res) => {
        this.aiResult.set(res);
        this.aiGenerating.set(false);
        this.loadAiUsage();
      },
      error: (err) => {
        this.aiError.set(err?.error?.error ?? 'Image generation failed. Please try again.');
        this.aiGenerating.set(false);
        this.loadAiUsage();
      },
    });
  }

  protected saveAiImageToAssets(): void {
    const result = this.aiResult();
    if (!result) return;
    this.projectService.createDesignAsset(this.projectId, {
      name: `AI · ${this.aiPrompt().trim().slice(0, 60)}`,
      type: 'IMAGE' as AssetType,
      url: result.image,
      notes: `AI-generated. Prompt: ${this.aiPrompt().trim().slice(0, 300)}`,
      version: 1,
    }).subscribe((a) => {
      this.assets.update(list => [...list, { id: a.id, name: a.name, type: a.type as AssetType, url: a.url, thumbnailUrl: '', version: a.version, notes: a.notes ?? '', approvedAt: a.approvedAt ?? null }]);
      this.aiSaved.set(true);
    });
  }

  protected aiEditInstruction = signal('');
  protected aiEditing         = signal(false);

  protected editImage(): void {
    const result = this.aiResult();
    if (!result) return;
    this.aiError.set(null);
    this.aiSaved.set(false);
    this.aiEditing.set(true);
    this.projectService.editAiImage(this.projectId, {
      image: result.image,
      instruction: this.aiEditInstruction().trim(),
      size: this.aiSize(),
    }).subscribe({
      next: (res) => {
        this.aiResult.set(res);
        this.aiEditInstruction.set('');
        this.aiEditing.set(false);
        this.loadAiUsage();
      },
      error: (err) => {
        this.aiError.set(err?.error?.error ?? 'Image edit failed. Please try again.');
        this.aiEditing.set(false);
        this.loadAiUsage();
      },
    });
  }

  protected discardAiResult(): void {
    if (this.hasUnsavedAiImage() && !confirm('This image has not been saved to Assets. Discard it anyway?')) return;
    this.aiResult.set(null);
    this.aiSaved.set(false);
    this.aiEditInstruction.set('');
    this.aiError.set(null);
  }

  private hasUnsavedAiImage(): boolean {
    return !!this.aiResult() && !this.aiSaved();
  }

  /** Route guard hook — see canDeactivate on the design route. */
  canLeave(): boolean {
    if (this.hasUnsavedAiImage()) {
      return confirm('You have an AI image that has not been saved to Assets. It will be lost if you leave. Leave anyway?');
    }
    if (this.hasUnsavedAiVideo() || this.videoBusy()) {
      return confirm('You have an AI video that has not been saved to Assets. It will be lost if you leave. Leave anyway?');
    }
    return true;
  }

  protected onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.hasUnsavedAiImage() || this.hasUnsavedAiVideo() || this.videoBusy()) e.preventDefault();
  }

  private loadAiUsage(): void {
    this.projectService.getAiUsage(this.projectId).subscribe({
      next: (u) => this.aiUsage.set(u),
      error: () => { /* usage panel is non-critical */ },
    });
  }

  protected tasks = signal<DesignTask[]>([]);
  protected assets = signal<DesignAsset[]>([]);

  protected editingDesc = signal<string | null>(null);
  protected assetFilter = signal<string>('ALL');
  protected addingAsset = signal(false);
  protected gateSubmitting = signal(false);
  protected gateError = signal<string | null>(null);
  protected gateSuccess = signal(false);

  protected assetFilters = [
    { label: 'All',      value: 'ALL' },
    { label: 'Images',   value: 'IMAGE' },
    { label: 'Videos',   value: 'VIDEO' },
    { label: 'Fonts',    value: 'FONT' },
    { label: 'Docs',     value: 'DOCUMENT' },
  ];

  protected assetForm = this.fb.group({
    name:  ['', Validators.required],
    type:  ['IMAGE'],
    url:   ['', Validators.required],
    notes: [''],
  });

  protected tasksByStatus(status: TaskStatus) {
    return this.tasks().filter(t => t.status === status);
  }

  protected doneTasks = computed(() => this.tasks().filter(t => t.status === 'DONE').length);
  protected progressPct = computed(() => {
    const total = this.tasks().length;
    return total === 0 ? 0 : Math.round((this.doneTasks() / total) * 100);
  });
  protected approvedAssets = computed(() => this.assets().filter(a => a.approvedAt).length);
  protected filteredAssets = computed(() => {
    const f = this.assetFilter();
    return f === 'ALL' ? this.assets() : this.assets().filter(a => a.type === f);
  });
  protected stageComplete = computed(() => this.briefForm.valid && this.gateSuccess());
  protected gateReady = computed(() => this.briefForm.valid);

  ngOnInit() {
    const design = this.state.project()?.design;
    if (design) {
      this.briefForm.patchValue({
        brief:      design.brief ?? '',
        styleGuide: design.styleGuide ?? '',
        figmaUrl:   design.figmaUrl ?? '',
      });
      this.tasks.set((design.tasks ?? []).map(t => ({
        id: t.id, title: t.title, description: t.description ?? '',
        status: t.status as TaskStatus, priority: t.priority as TaskPriority,
        assigneeName: '', dueDate: t.dueDate?.slice(0, 10) ?? '',
      })));
      this.assets.set((design.assets ?? []).map(a => ({
        id: a.id, name: a.name, type: a.type as AssetType,
        url: a.url, thumbnailUrl: '', version: a.version,
        notes: a.notes ?? '', approvedAt: a.approvedAt ?? null,
      })));
    }
    this.loadAiUsage();
    this.loadIntegrations();
    this.destroyRef.onDestroy(() => {
      if (this.videoPollTimer) clearTimeout(this.videoPollTimer);
      if (this.activeVideoBlobUrl) URL.revokeObjectURL(this.activeVideoBlobUrl);
    });
  }

  protected addTask() {
    this.projectService.createDesignTask(this.projectId, { title: 'New Task', status: 'TODO', priority: 'MEDIUM', sortOrder: this.tasks().length + 1 })
      .subscribe(t => this.tasks.update(list => [...list, { id: t.id, title: t.title, description: t.description ?? '', status: t.status as TaskStatus, priority: t.priority as TaskPriority, assigneeName: '', dueDate: '' }]));
  }

  protected deleteTask(id: string) {
    console.log('[Design] deleteTask - projectId:', this.projectId, 'taskId:', id);
    this.projectService.deleteDesignTask(this.projectId, id)
      .subscribe({
        next: () => this.tasks.update(list => list.filter(t => t.id !== id)),
        error: (err) => {
          console.error('[Design] deleteTask error:', err);
          const msg = err?.error?.error ?? err?.message ?? 'Failed to delete task';
          this.notifService.toast(msg, 'warning');
        },
      });
  }

  protected updateTask(id: string, field: keyof DesignTask, value: string) {
    this.tasks.update(list => list.map(t => t.id === id ? { ...t, [field]: value } : t));
    const apiField = field === 'assigneeName' ? 'assigneeId' : field;
    this.projectService.updateDesignTask(this.projectId, id, { [apiField]: value }).subscribe();
  }

  protected cycleStatus(id: string) {
    const order: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    console.log('[Design] cycleStatus - projectId:', this.projectId, 'taskId:', id, 'next:', next);
    this.projectService.updateDesignTask(this.projectId, id, { status: next }).subscribe({
      next: () => this.tasks.update(list => list.map(t => t.id === id ? { ...t, status: next } : t)),
      error: (err) => {
        console.error('[Design] cycleStatus error:', err);
        const msg = err?.error?.error ?? err?.message ?? 'Failed to update task status';
        this.notifService.toast(msg, 'warning');
      },
    });
  }

  protected assetIcon(type: AssetType): string {
    const icons: Record<AssetType, string> = { IMAGE: '🖼️', VIDEO: '🎬', FONT: '🔤', DOCUMENT: '📄', OTHER: '📎' };
    return icons[type];
  }

  protected approveAsset(id: string) {
    this.projectService.approveDesignAsset(this.projectId, id)
      .subscribe(a => this.assets.update(list => list.map(x => x.id === id ? { ...x, approvedAt: a.approvedAt ?? new Date().toISOString() } : x)));
  }

  protected deleteAsset(id: string) {
    this.projectService.deleteDesignAsset(this.projectId, id)
      .subscribe(() => this.assets.update(list => list.filter(a => a.id !== id)));
  }

  protected openAsset(asset: { name: string; url: string }, event: MouseEvent) {
    if (asset.url.startsWith('data:')) {
      event.preventDefault();
      const newTab = window.open();
      if (newTab) {
        const safeName = asset.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${safeName}</title>
              <style>
                body { margin: 0; background: #0B0F19; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #fff; }
                img { max-width: 90%; max-height: 85vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border-radius: 12px; border: 1px solid #1E293B; }
                .container { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px; }
                .title { font-size: 14px; font-weight: 500; color: #94A3B8; letter-spacing: 0.02em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="title">${safeName}</div>
                <img src="${asset.url}" alt="${safeName}" />
              </div>
            </body>
          </html>
        `);
        newTab.document.close();
      }
    }
  }

  protected saveAsset() {
    this.assetForm.markAllAsTouched();
    if (this.assetForm.invalid) return;
    const v = this.assetForm.getRawValue();
    this.projectService.createDesignAsset(this.projectId, { name: v.name ?? '', type: (v.type ?? 'OTHER') as AssetType, url: v.url ?? '', notes: v.notes ?? undefined, version: 1 })
      .subscribe(a => {
        this.assets.update(list => [...list, { id: a.id, name: a.name, type: a.type as AssetType, url: a.url, thumbnailUrl: '', version: a.version, notes: a.notes ?? '', approvedAt: a.approvedAt ?? null }]);
        this.assetForm.reset({ type: 'IMAGE' });
        this.addingAsset.set(false);
      });
  }

  protected cancelAsset() {
    this.assetForm.reset({ type: 'IMAGE' });
    this.addingAsset.set(false);
  }

  protected saveBrief() {
    this.briefForm.markAllAsTouched();
    if (this.briefForm.invalid) return;
    const v = this.briefForm.value;
    this.projectService.upsertDesign(this.projectId, { brief: v.brief ?? undefined, styleGuide: v.styleGuide ?? undefined, figmaUrl: v.figmaUrl ?? undefined }).subscribe();
  }

  protected approveGate() {
    if (!this.gateReady()) return;
    this.gateSubmitting.set(true);
    this.gateError.set(null);
    this.projectService.completeDesign(this.projectId).subscribe({
      next: () => {
        this.gateSubmitting.set(false);
        this.gateSuccess.set(true);
        this.projectService.getProject(this.projectId).subscribe(p => this.state.setProject(p));
        const name = this.state.project()?.name ?? 'Project';
        this.notifService.add({
          type: 'stage_unlocked',
          title: 'Design gate approved',
          body: `${name} — Development is now unlocked`,
          projectId: this.projectId,
          projectName: name,
          route: `/app/projects/${this.projectId}/development`,
        });
        this.notifService.toast('7 default Development tasks have been pre-populated', 'info');
      },
      error: (err) => {
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
        this.gateSubmitting.set(false);
      },
    });
  }
}
