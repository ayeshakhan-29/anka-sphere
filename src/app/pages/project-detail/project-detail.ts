import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { ProjectStateService } from '../../services/project-state.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Badge],
  template: `
    @if (state.loading()) {
      <div class="loading-state" role="status">
        <div class="spinner" aria-hidden="true"></div>
        Loading project…
      </div>
    } @else if (loadError()) {
      <div class="error-state" role="alert">
        <p>{{ loadError() }}</p>
        <a routerLink="/app/projects" class="back-link">← Back to Projects</a>
      </div>
    } @else if (state.project()) {
      <div class="detail-page">

        <!-- Back -->
        <div class="page-top">
          <a routerLink="/app/projects" class="back-link" aria-label="Back to all projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            All Projects
          </a>
        </div>

        <!-- Project header -->
        <div class="project-header">
          <div class="header-left">
            <div class="client-badge" aria-hidden="true">{{ state.project()!.clientName.slice(0, 2).toUpperCase() }}</div>
            <div>
              <h2 class="project-name">{{ state.project()!.name }}</h2>
              <p class="project-client">{{ state.project()!.clientName }}</p>
            </div>
          </div>
          <div class="header-right" style="display: flex; align-items: center; gap: 10px;">
            <ui-badge [variant]="statusVariant(state.project()!.status)">
              {{ statusLabel(state.project()!.status) }}
            </ui-badge>
            <button type="button" class="btn-delete-proj" (click)="confirmDelete()" title="Delete Project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete Project
            </button>
          </div>
        </div>

        <!-- Pipeline -->
        <div class="pipeline-card">
          <p class="pipeline-label">Delivery Pipeline</p>
          <div class="pipeline-track" role="list">
            @for (stage of state.pipeline(); track stage.id) {
              <div class="pipeline-stage" [class]="stage.status" role="listitem">
                <div class="stage-node" [attr.aria-label]="stage.label + ' — ' + stage.status">
                  @if (stage.status === 'completed') {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  } @else if (stage.status === 'active') {
                    <div class="active-dot" aria-hidden="true"></div>
                  } @else {
                    <span aria-hidden="true">{{ stage.id }}</span>
                  }
                </div>
                @if (stage.id < 5) {
                  <div class="stage-connector" [class.filled]="stage.status === 'completed'" aria-hidden="true"></div>
                }
                <div class="stage-info">
                  <span class="stage-name">{{ stage.label }}</span>
                  <span class="stage-dept">{{ stage.dept }}</span>
                  <span class="gate-tag" [class]="'gate-' + stage.gate">
                    {{ stage.gate === 'hard' ? 'Hard Gate' : stage.gate === 'soft' ? 'Soft Gate' : 'No Gate' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Project Context (collapsible) -->
        @if (profilingData()) {
          <div class="ctx-panel" [class.ctx-panel--open]="contextOpen()">
            <button
              class="ctx-toggle"
              type="button"
              (click)="contextOpen.set(!contextOpen())"
              [attr.aria-expanded]="contextOpen()"
              aria-controls="project-context-body"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 16v-4M12 8h.01"/></svg>
              Project Context
              <span class="ctx-hint">{{ contextOpen() ? 'Collapse' : 'Expand — company brief, brand voice, personas' }}</span>
              <svg class="ctx-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            @if (contextOpen()) {
              <div class="ctx-body" id="project-context-body">
                @let p = profilingData()!;

                <!-- Company header -->
                @if (p.companyName || p.industry) {
                  <div class="ctx-company">
                    @if (p.companyName) { <span class="ctx-company-name">{{ p.companyName }}</span> }
                    @if (p.industry) { <span class="ctx-tag">{{ p.industry }}</span> }
                  </div>
                }

                <!-- About -->
                @if (p.about) {
                  <div class="ctx-section">
                    <p class="ctx-section-label">About the Company</p>
                    <p class="ctx-text">{{ p.about }}</p>
                  </div>
                }

                <!-- Objectives + Brand Voice side by side -->
                @if (p.objectives || p.brandVoice || p.toneOfVoice) {
                  <div class="ctx-cols">
                    @if (p.objectives) {
                      <div class="ctx-section">
                        <p class="ctx-section-label">Objectives</p>
                        <p class="ctx-text">{{ p.objectives }}</p>
                      </div>
                    }
                    @if (p.brandVoice || p.toneOfVoice) {
                      <div class="ctx-section">
                        <p class="ctx-section-label">Brand Voice &amp; Tone</p>
                        @if (p.brandVoice) { <p class="ctx-text">{{ p.brandVoice }}</p> }
                        @if (p.toneOfVoice) { <p class="ctx-text">{{ p.toneOfVoice }}</p> }
                      </div>
                    }
                  </div>
                }

                <!-- Keywords -->
                @if (p.primaryKeywords || p.secondaryKeywords) {
                  <div class="ctx-section">
                    <p class="ctx-section-label">Keywords</p>
                    <div class="ctx-tags">
                      @for (kw of splitKeywords(p.primaryKeywords ?? ''); track kw) {
                        <span class="ctx-tag ctx-tag--primary">{{ kw }}</span>
                      }
                      @for (kw of splitKeywords(p.secondaryKeywords ?? ''); track kw) {
                        <span class="ctx-tag">{{ kw }}</span>
                      }
                    </div>
                  </div>
                }

                <!-- Personas -->
                @if (p.personas && p.personas.length > 0) {
                  <div class="ctx-section">
                    <p class="ctx-section-label">Personas ({{ p.personas.length }})</p>
                    <div class="ctx-personas">
                      @for (persona of p.personas; track persona.id) {
                        <div class="persona-card">
                          <div class="persona-avatar" aria-hidden="true">{{ persona.name.slice(0, 1) }}</div>
                          <div class="persona-info">
                            <span class="persona-name">{{ persona.name }}</span>
                            @if (persona.age || persona.role) {
                              <span class="persona-meta">
                                @if (persona.age) { {{ persona.age }} · }
                                @if (persona.role) { {{ persona.role }} }
                              </span>
                            }
                            @if (persona.goals) {
                              <span class="persona-detail"><strong>Goals:</strong> {{ persona.goals }}</span>
                            }
                            @if (persona.painPoints) {
                              <span class="persona-detail"><strong>Pain points:</strong> {{ persona.painPoints }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Competitors -->
                @if (p.competitors && p.competitors.length > 0) {
                  <div class="ctx-section">
                    <p class="ctx-section-label">Competitors ({{ p.competitors.length }})</p>
                    <div class="ctx-competitors">
                      @for (comp of p.competitors; track comp.id) {
                        <div class="comp-card">
                          <div class="comp-top">
                            <span class="comp-name">{{ comp.name }}</span>
                            @if (comp.url) {
                              <a [href]="comp.url" target="_blank" rel="noopener noreferrer" class="comp-link" [attr.aria-label]="'Visit ' + comp.name">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                            }
                          </div>
                          @if (comp.strengths) { <p class="comp-detail"><strong>Strengths:</strong> {{ comp.strengths }}</p> }
                          @if (comp.weaknesses) { <p class="comp-detail"><strong>Weaknesses:</strong> {{ comp.weaknesses }}</p> }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Info + Team -->
        <div class="meta-row">
          <div class="info-card">
            <p class="card-section-label">Project Details</p>
            @if (state.project()!.description) {
              <p class="project-desc">{{ state.project()!.description }}</p>
            }
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-key">Start Date</span>
                <span class="meta-val">{{ formatDate(state.project()!.startDate) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Target Date</span>
                <span class="meta-val">{{ formatDate(state.project()!.targetDate) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Current Stage</span>
                <span class="meta-val">{{ currentStageLabel() }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Last Updated</span>
                <span class="meta-val">{{ relativeTime(state.project()!.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="team-card">
            <p class="card-section-label">Team ({{ state.project()!.members.length }})</p>
            @if (state.project()!.members.length === 0) {
              <p class="no-team">No team members assigned yet.</p>
            } @else {
              <ul class="team-list" aria-label="Project team">
                @for (member of state.project()!.members; track member.id) {
                  <li class="team-member">
                    <div class="member-avatar" aria-hidden="true">{{ member.user.name.slice(0, 2) }}</div>
                    <div class="member-info">
                      <span class="member-name">{{ member.user.name }}</span>
                      <span class="member-role">{{ member.user.role ?? member.role }}</span>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </div>

        <!-- Department tabs -->
        <div class="dept-tabs-section">
          <div class="dept-tabs" role="tablist" aria-label="Department workspaces">
            @for (tab of deptTabs(); track tab.route) {
              @if (tab.locked) {
                <span
                  class="dept-tab dept-tab--locked"
                  role="tab"
                  [attr.aria-disabled]="true"
                  [attr.aria-label]="tab.label + ' — locked'"
                  [title]="tab.lockedReason"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  {{ tab.label }}
                </span>
              } @else {
                <a
                  [routerLink]="tab.route"
                  routerLinkActive="active"
                  class="dept-tab"
                  [class.dept-tab--current]="tab.current"
                  role="tab"
                >
                  {{ tab.label }}
                  @if (tab.current) {
                    <span class="current-dot" aria-label="Current stage" aria-hidden="true"></span>
                  }
                </a>
              }
            }
          </div>
          <div class="dept-content">
            <router-outlet />
          </div>
        </div>

      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (showDeleteModal()) {
      <div class="modal-backdrop" (click)="cancelDelete()" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
        <div class="modal modal--danger" (click)="$event.stopPropagation()" style="max-width: 440px;">
          <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border);">
            <h3 id="del-modal-title" class="modal-title" style="margin: 0; font-size: 16px; font-weight: 600; color: #DC2626;">Delete Project</h3>
            <button class="modal-close" (click)="cancelDelete()" aria-label="Close" style="background: transparent; border: none; cursor: pointer; color: var(--color-text-muted);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding: 18px 20px; font-size: 13.5px; color: var(--color-text); line-height: 1.5;">
            <p style="margin: 0 0 8px;">Are you sure you want to delete <strong>{{ state.project()?.name }}</strong>?</p>
            <p style="margin: 0; color: var(--color-text-muted); font-size: 12.5px;">This action is permanent and will remove all profiling, written content, design assets, and task data for this project.</p>
          </div>
          <div class="modal-footer" style="padding: 12px 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--color-border); background: var(--color-surface-raised);">
            <button type="button" class="btn-cancel" (click)="cancelDelete()" [disabled]="deleting()" style="height: 32px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: transparent; cursor: pointer; font-size: 12.5px; color: var(--color-text-secondary);">Cancel</button>
            <button type="button" class="btn-danger-confirm" (click)="deleteProject()" [disabled]="deleting()">
              {{ deleting() ? 'Deleting…' : 'Yes, Delete Project' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 80px;
      color: var(--color-text-secondary);
      font-size: 14px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state {
      padding: 40px;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: 14px;
    }

    .detail-page { max-width: 1100px; display: flex; flex-direction: column; gap: 20px; }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: color 0.15s;
    }
    .back-link:hover { color: var(--color-text); }

    .project-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .client-badge {
      width: 48px; height: 48px; min-width: 48px;
      border-radius: 12px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      font-size: 16px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .project-name { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .project-client { font-size: 13px; color: var(--color-text-secondary); margin: 0; }

    .pipeline-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-card);
    }
    .pipeline-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
      color: var(--color-text-muted); margin: 0 0 16px;
    }
    .pipeline-track { display: flex; align-items: flex-start; overflow-x: auto; padding-bottom: 4px; }
    .pipeline-stage { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; position: relative; }
    .stage-node {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600;
      border: 2px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
      z-index: 1; flex-shrink: 0;
    }
    .pipeline-stage.completed .stage-node { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .pipeline-stage.active .stage-node { background: var(--color-surface); border-color: var(--color-accent); color: var(--color-accent); box-shadow: 0 0 0 4px var(--color-accent-light); }
    .active-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); }
    .stage-connector { position: absolute; top: 15px; left: calc(50% + 16px); right: calc(-50% + 16px); height: 2px; background: var(--color-border); }
    .stage-connector.filled { background: var(--color-accent); }
    .stage-info { display: flex; flex-direction: column; align-items: center; gap: 3px; margin-top: 10px; padding: 0 4px; text-align: center; }
    .stage-name { font-size: 12px; font-weight: 600; color: var(--color-text); white-space: nowrap; }
    .pipeline-stage.locked .stage-name { color: var(--color-text-muted); }
    .stage-dept { font-size: 10.5px; color: var(--color-text-muted); white-space: nowrap; }
    .gate-tag { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 10px; }
    .gate-hard { background: #FEE2E2; color: #DC2626; }
    .gate-soft { background: #FEF3C7; color: #D97706; }
    .gate-none { background: var(--color-accent-light); color: var(--color-accent); }

    .meta-row { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
    .info-card, .team-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-card);
    }
    .card-section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 12px; }
    .project-desc { font-size: 13.5px; color: var(--color-text-secondary); line-height: 1.6; margin: 0 0 16px; }
    .meta-grid { display: flex; flex-direction: column; gap: 10px; }
    .meta-item { display: flex; justify-content: space-between; align-items: center; }
    .meta-key { font-size: 13px; color: var(--color-text-secondary); }
    .meta-val { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .no-team { font-size: 13px; color: var(--color-text-muted); margin: 0; }
    .team-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .team-member { display: flex; align-items: center; gap: 10px; }
    .member-avatar {
      width: 34px; height: 34px; min-width: 34px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .member-info { display: flex; flex-direction: column; }
    .member-name { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .member-role { font-size: 11.5px; color: var(--color-text-muted); }

    .dept-tabs-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }
    .dept-tabs { display: flex; border-bottom: 1px solid var(--color-border); padding: 0 8px; overflow-x: auto; }
    .dept-tab {
      padding: 12px 16px;
      font-size: 13px; font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
    }
    .dept-tab:hover { color: var(--color-text); }
    .dept-tab.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .dept-tab--locked {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 12px 16px; font-size: 13px; font-weight: 500;
      color: var(--color-text-muted); opacity: 0.5;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      white-space: nowrap; cursor: not-allowed; user-select: none;
    }
    .dept-tab--current {
      color: var(--color-text);
      font-weight: 600;
    }
    .current-dot {
      display: inline-block; width: 6px; height: 6px;
      border-radius: 50%; background: var(--color-accent);
      margin-left: 4px; vertical-align: middle;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .dept-content { padding: 24px; }

    /* Project Context panel */
    .ctx-panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); overflow: hidden; }
    .ctx-toggle {
      width: 100%; display: flex; align-items: center; gap: 8px;
      padding: 12px 20px; background: none; border: none; cursor: pointer;
      font-family: var(--font-sans); font-size: 13px; font-weight: 600;
      color: var(--color-text-secondary); text-align: left; transition: background 0.12s;
    }
    .ctx-toggle:hover { background: var(--color-surface-raised); }
    .ctx-hint { flex: 1; font-size: 12px; font-weight: 400; color: var(--color-text-muted); }
    .ctx-chevron { color: var(--color-text-muted); transition: transform 0.2s; }
    .ctx-panel--open .ctx-chevron { transform: rotate(180deg); }
    .ctx-body { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 18px; border-top: 1px solid var(--color-border); padding-top: 18px; }
    .ctx-section { display: flex; flex-direction: column; gap: 6px; }
    .ctx-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .ctx-section-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); margin: 0; }
    .ctx-text { font-size: 13.5px; color: var(--color-text-secondary); line-height: 1.65; margin: 0; }
    .ctx-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .ctx-tag { font-size: 12px; padding: 3px 10px; border-radius: 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border); color: var(--color-text-secondary); }
    .ctx-tag--primary { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; font-weight: 500; }
    .ctx-company { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
    .ctx-company-name { font-size: 15px; font-weight: 700; color: var(--color-text); }
    .ctx-personas { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .persona-card { display: flex; gap: 10px; padding: 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .persona-avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 50%; background: #EDE9FE; color: #7C3AED; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .persona-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .persona-name { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .persona-meta { font-size: 11.5px; color: var(--color-text-muted); }
    .persona-detail { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }
    .ctx-competitors { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .comp-card { padding: 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 6px; }
    .comp-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .comp-name { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .comp-link { color: var(--color-text-muted); text-decoration: none; display: flex; align-items: center; transition: color 0.12s; }
    .comp-link:hover { color: var(--color-accent); }
    .btn-delete-proj { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: var(--radius-md, 6px); border: 1px solid var(--color-border, #E2E8F0); background: transparent; color: var(--color-text-secondary); font-family: var(--font-sans); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
    .btn-delete-proj:hover { border-color: #EF4444; color: #DC2626; background: #FEF2F2; }
    .btn-danger-confirm { height: 32px; padding: 0 16px; border-radius: var(--radius-md, 6px); border: none; background: #DC2626; color: #fff; font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; cursor: pointer; transition: opacity 0.15s ease; }
    .btn-danger-confirm:hover { opacity: 0.9; }
    .btn-danger-confirm:disabled { opacity: 0.6; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); width: 100%; box-shadow: var(--shadow-card); overflow: hidden; }

    @media (max-width: 768px) {
      .meta-row { grid-template-columns: 1fr; }
      .ctx-cols { grid-template-columns: 1fr; }
    }
  `]
})
export class ProjectDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  protected state = inject(ProjectStateService);
  private notifService = inject(NotificationService);
  private routeSub?: Subscription;

  protected showDeleteModal = signal(false);
  protected deleting = signal(false);

  protected confirmDelete() {
    this.showDeleteModal.set(true);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
  }

  protected deleteProject() {
    const project = this.state.project();
    if (!project || this.deleting()) return;
    this.deleting.set(true);
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.showDeleteModal.set(false);
        this.notifService.toast(`Project "${project.name}" deleted successfully`, 'success');
        this.router.navigateByUrl('/app/projects');
      },
      error: (err) => {
        this.deleting.set(false);
        this.notifService.toast(err?.error?.error ?? 'Failed to delete project', 'warning');
      }
    });
  }

  protected loadError = computed(() => this.state.loading() ? null : (this.state.project() ? null : this._error));
  private _error: string | null = null;

  protected contextOpen  = signal(false);
  protected profilingData = computed(() => {
    const p = this.state.project()?.profiling;
    if (!p) return null;
    const hasContent = p.about || p.objectives || p.brandVoice || p.toneOfVoice ||
      p.primaryKeywords || p.secondaryKeywords ||
      (p.personas?.length ?? 0) > 0 || (p.competitors?.length ?? 0) > 0;
    return hasContent ? p : null;
  });

  private stageStatus(stageKey: string): string {
    return this.state.project()?.pipeline.find(e => e.stage === stageKey)?.status ?? 'LOCKED';
  }

  protected deptTabs = computed(() => {
    const project = this.state.project();
    const current = project?.currentStage;
    const s = (key: string) => this.stageStatus(key);

    const locked = (key: string, reason: string) => ({
      locked: s(key) === 'LOCKED',
      current: current === key,
      lockedReason: reason,
    });

    return [
      { label: 'Overview',          route: 'overview',     locked: false, current: false, lockedReason: '' },
      { label: 'Project Profiling', route: 'profiling',    ...locked('PROFILING',       'Stage not yet started') },
      { label: 'Written Content',   route: 'content',      ...locked('WRITTEN_CONTENT', 'Requires Profiling gate approval') },
      { label: 'Design',            route: 'design',       ...locked('DESIGN',          'Requires Written Content gate approval') },
      { label: 'Development',       route: 'development',  ...locked('DEVELOPMENT',     'Requires Design gate approval') },
      { label: 'Analytics',         route: 'analytics',    ...locked('MARKETING',       'Requires Development gate approval') },
      { label: 'Reporting',         route: 'reporting',    locked: false, current: false, lockedReason: '' },
    ];
  });

  ngOnInit() {
    this.routeSub = this.route.paramMap.pipe(
      distinctUntilChanged((prev, curr) => prev.get('id') === curr.get('id')),
      tap(() => {
        this._error = null;
        this.state.clear();
        this.state.loading.set(true);
      }),
      switchMap(params => this.projectService.getProject(params.get('id') ?? '')),
    ).subscribe({
      next: (project) => {
        this.state.setProject(project);
        this.state.loading.set(false);
      },
      error: () => {
        this._error = 'Project not found or server unavailable.';
        this.state.loading.set(false);
      },
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.state.clear();
  }

  protected currentStageLabel(): string {
    const active = this.state.pipeline().find(s => s.status === 'active');
    return active ? `Stage ${active.id} — ${active.label}` : '—';
  }

  protected statusVariant(status: string): 'success' | 'warning' | 'info' {
    if (status === 'ACTIVE') return 'success';
    if (status === 'ON_HOLD') return 'warning';
    return 'info';
  }

  protected statusLabel(status: string): string {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'ON_HOLD') return 'On Hold';
    return 'Completed';
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected splitKeywords(raw: string): string[] {
    return raw.split(/[,\n]+/).map(k => k.trim()).filter(Boolean);
  }

  protected relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
  }
}
