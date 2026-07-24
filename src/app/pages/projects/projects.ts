import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { Project, ProjectStatus, PipelineStage } from '../../models/project.models';

const STAGE_LABELS: Record<PipelineStage, string> = {
  PROFILING:       'Project Profiling',
  WRITTEN_CONTENT: 'Written Content',
  DESIGN:          'Design',
  DEVELOPMENT:     'Development',
  MARKETING:       'Marketing',
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  PROFILING:       '#3B82F6',
  WRITTEN_CONTENT: '#8B5CF6',
  DESIGN:          '#EC4899',
  DEVELOPMENT:     '#F59E0B',
  MARKETING:       '#16A34A',
};

@Component({
  selector: 'app-projects',
  imports: [RouterLink, Badge, ReactiveFormsModule],
  template: `
    <div class="projects-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="heading">All Projects</h2>
          <p class="subheading">{{ filtered().length }} of {{ projects().length }} projects</p>
        </div>
        <button class="btn-new" (click)="showModal.set(true)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      <!-- Error banner -->
      @if (error()) {
        <div class="error-banner" role="alert">{{ error() }}</div>
      }

      <!-- Search + filters -->
      <div class="toolbar">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="search" placeholder="Search projects or clients…" aria-label="Search projects"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
        <div class="stage-filters" role="group" aria-label="Filter by stage">
          <button class="sf" [class.active]="stageFilter() === 'all'" (click)="stageFilter.set('all')">All stages</button>
          @for (s of stageOptions; track s.value) {
            <button class="sf" [class.active]="stageFilter() === s.value" (click)="stageFilter.set(s.value)"
              [style.--dot]="s.color">
              <span class="sf-dot" [style.background]="s.color" aria-hidden="true"></span>{{ s.label }}
            </button>
          }
        </div>
      </div>

      <!-- Status tabs -->
      <div class="filter-tabs" role="tablist" aria-label="Filter by status">
        @for (tab of tabs; track tab.value) {
          <button
            role="tab"
            class="tab"
            [class.active]="activeTab() === tab.value"
            [attr.aria-selected]="activeTab() === tab.value"
            (click)="activeTab.set(tab.value)"
          >
            {{ tab.label }}
            <span class="tab-count">{{ tab.count() }}</span>
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-state" role="status" aria-label="Loading projects">
          <div class="spinner" aria-hidden="true"></div>
          <span>Loading projects…</span>
        </div>
      } @else {
        <!-- Project grid -->
        <div class="project-grid" role="list">
          @for (project of filtered(); track project.id) {
            <article
              class="project-card"
              role="listitem"
              [routerLink]="['/app/projects', project.id]"
              tabindex="0"
              [attr.aria-label]="project.name + ' — ' + project.clientName"
            >
              <div class="card-top">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="client-badge">{{ project.clientName.slice(0, 2).toUpperCase() }}</div>
                  <ui-badge [variant]="statusVariant(project.status)">
                    {{ statusLabel(project.status) }}
                  </ui-badge>
                </div>
                <button
                  type="button"
                  class="card-delete-btn"
                  (click)="confirmDeleteProject($event, project)"
                  title="Delete project"
                  aria-label="Delete project"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>

              <div class="card-body">
                <h3 class="project-name">{{ project.name }}</h3>
                <p class="project-client">{{ project.clientName }}</p>
                @if (project.description) {
                  <p class="project-desc">{{ project.description }}</p>
                }
              </div>

              <!-- Pipeline mini-progress -->
              <div class="card-pipeline" aria-label="Pipeline progress" role="img">
                @for (entry of project.pipeline; track entry.stage) {
                  <div class="pip-seg"
                    [class.pip-done]="entry.status === 'APPROVED'"
                    [class.pip-active]="entry.status === 'IN_PROGRESS'"
                    [style.background]="entry.status === 'APPROVED' ? stageColor(entry.stage) : entry.status === 'IN_PROGRESS' ? stageColor(entry.stage) + '66' : ''"
                    [attr.title]="stageLabel(entry.stage) + ' — ' + entry.status">
                  </div>
                }
              </div>

              <div class="card-stage">
                <div class="stage-dot" [style.background]="stageColor(project.currentStage)"></div>
                <span class="stage-label">{{ stageLabel(project.currentStage) }}</span>
              </div>

              <div class="card-footer">
                <div class="team-avatars" aria-label="Team members">
                  @for (member of project.members.slice(0, 3); track member.id) {
                    <div class="team-avatar" [title]="member.user.name">
                      {{ member.user.name.slice(0, 2) }}
                    </div>
                  }
                  @if (project.members.length > 3) {
                    <div class="team-avatar overflow">+{{ project.members.length - 3 }}</div>
                  }
                </div>
                <span class="updated-at">{{ relativeTime(project.updatedAt) }}</span>
              </div>
            </article>
          } @empty {
            <div class="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="color: var(--color-text-muted)">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <p>No projects found</p>
            </div>
          }
        </div>
      }
    </div>

    <!-- New Project Modal -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title">New Project</h3>
            <button class="modal-close" (click)="closeModal()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form [formGroup]="newProjectForm" (ngSubmit)="createProject()" class="modal-form">
            <div class="field">
              <label for="proj-name" class="label">Project Name <span class="required" aria-hidden="true">*</span></label>
              <input id="proj-name" class="input" formControlName="name" placeholder="e.g. Brand Refresh & Website" />
              @if (newProjectForm.get('name')?.invalid && newProjectForm.get('name')?.touched) {
                <span class="field-error">Project name is required</span>
              }
            </div>

            <div class="field">
              <label for="proj-client" class="label">Client Name <span class="required" aria-hidden="true">*</span></label>
              <input id="proj-client" class="input" formControlName="clientName" placeholder="e.g. Lumina Studios" />
              @if (newProjectForm.get('clientName')?.invalid && newProjectForm.get('clientName')?.touched) {
                <span class="field-error">Client name is required</span>
              }
            </div>

            <div class="field">
              <label for="proj-desc" class="label">Description</label>
              <textarea id="proj-desc" class="input input--textarea" formControlName="description" rows="3" placeholder="Brief project overview…"></textarea>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="proj-start" class="label">Start Date</label>
                <input id="proj-start" class="input" formControlName="startDate" type="date" />
              </div>
              <div class="field">
                <label for="proj-target" class="label">Target Date</label>
                <input id="proj-target" class="input" formControlName="targetDate" type="date" />
              </div>
            </div>

            <!-- Analytics & Search (optional) -->
            <div class="section-divider">
              <span class="section-label">Analytics &amp; Search</span>
              <span class="section-hint">Optional — powers the Analytics Hub &amp; SEO dept</span>
            </div>

            <div class="field">
              <label for="proj-ga4" class="label">Google Analytics (GA4) Property ID</label>
              <input id="proj-ga4" class="input" formControlName="analyticsPropertyId" placeholder="e.g. G-XXXXXXXXXX or 123456789" />
              <a class="connect-link" [href]="GA_CREATE_URL" target="_blank" rel="noopener">
                Don't have one? Create in Google Analytics
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>

            <div class="field">
              <label for="proj-gsc" class="label">Search Console Property URL</label>
              <input id="proj-gsc" class="input" formControlName="searchConsoleUrl" placeholder="e.g. https://clientsite.com" />
              @if (newProjectForm.get('searchConsoleUrl')?.invalid && newProjectForm.get('searchConsoleUrl')?.touched) {
                <span class="field-error">Enter a full URL, e.g. https://clientsite.com</span>
              }
              <a class="connect-link" [href]="GSC_CREATE_URL" target="_blank" rel="noopener">
                Don't have one? Set up Search Console
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>

            @if (createError()) {
              <div class="field-error" role="alert">{{ createError() }}</div>
            }

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-submit" [disabled]="creating()">
                @if (creating()) { Creating… } @else { Create Project }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (projectToDelete()) {
      <div class="modal-backdrop" (click)="cancelDelete()" role="dialog" aria-modal="true">
        <div class="modal modal--danger" (click)="$event.stopPropagation()" style="max-width: 440px;">
          <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border);">
            <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 600; color: #DC2626;">Delete Project</h3>
            <button class="modal-close" (click)="cancelDelete()" aria-label="Close" style="background: transparent; border: none; cursor: pointer; color: var(--color-text-muted);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding: 18px 20px; font-size: 13.5px; color: var(--color-text); line-height: 1.5;">
            <p style="margin: 0 0 8px;">Are you sure you want to delete <strong>{{ projectToDelete()?.name }}</strong>?</p>
            <p style="margin: 0; color: var(--color-text-muted); font-size: 12.5px;">This action cannot be undone. All project data will be permanently removed.</p>
          </div>
          <div class="modal-footer" style="padding: 12px 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--color-border); background: var(--color-surface-raised);">
            <button type="button" class="btn-cancel" (click)="cancelDelete()" [disabled]="deleting()" style="height: 32px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: transparent; cursor: pointer; font-size: 12.5px; color: var(--color-text-secondary);">Cancel</button>
            <button type="button" class="btn-danger-confirm" (click)="deleteProject()" [disabled]="deleting()" style="height: 32px; padding: 0 16px; border-radius: var(--radius-md); border: none; background: #DC2626; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer;">
              {{ deleting() ? 'Deleting…' : 'Yes, Delete Project' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .projects-page { max-width: 1200px; display: flex; flex-direction: column; gap: 0; }

    /* Toolbar */
    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-wrap { position: relative; flex-shrink: 0; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 240px; }
    .search-input:focus { border-color: var(--color-accent); }
    .stage-filters { display: flex; gap: 4px; flex-wrap: wrap; }
    .sf { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .sf:hover { border-color: var(--color-border-strong); color: var(--color-text); }
    .sf.active { background: var(--color-sidebar); color: #F8FAFC; border-color: var(--color-sidebar); }
    .sf-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .heading {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 4px;
    }
    .subheading { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
    .btn-new {
      display: flex;
      align-items: center;
      gap: 7px;
      height: 40px;
      padding: 0 18px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-new:hover { background: var(--color-primary-hover); }

    .error-banner {
      padding: 10px 16px;
      margin-bottom: 16px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: #EF4444;
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
    }
    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      background: transparent;
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover { color: var(--color-text); }
    .tab.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .tab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .tab.active .tab-count { background: var(--color-accent-light); color: var(--color-accent); }

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

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .project-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      cursor: pointer;
      transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .project-card:hover { box-shadow: var(--shadow-raised); border-color: var(--color-border-strong); transform: translateY(-1px); }
    .project-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .card-top { display: flex; align-items: center; justify-content: space-between; }
    .client-badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-body { display: flex; flex-direction: column; gap: 2px; }
    .project-name { font-family: var(--font-display); font-size: 16px; font-weight: 400; color: var(--color-text); margin: 0; }
    .project-client { font-size: 12.5px; color: var(--color-text-secondary); margin: 0; }
    .project-desc { font-size: 12px; color: var(--color-text-muted); margin: 4px 0 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-pipeline { display: flex; gap: 3px; height: 5px; border-radius: 4px; overflow: hidden; }
    .pip-seg { flex: 1; border-radius: 3px; background: var(--color-surface-raised); transition: background 0.2s; }
    .card-stage { display: flex; align-items: center; gap: 7px; }
    .stage-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .stage-label { font-size: 12.5px; color: var(--color-text-secondary); }
    .card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid var(--color-border); }
    .team-avatars { display: flex; }
    .team-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 2px solid var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: -6px;
    }
    .team-avatar:first-child { margin-left: 0; }
    .team-avatar.overflow { background: var(--color-border); }
    .updated-at { font-size: 11.5px; color: var(--color-text-muted); }
    .empty-state {
      grid-column: 1 / -1;
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

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-raised);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
      flex-shrink: 0;
    }
    .modal-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0;
    }
    .modal-close {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .modal-close:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .modal-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .required { color: #EF4444; }
    .input {
      height: 38px;
      padding: 0 12px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      color: var(--color-text);
      outline: none;
      transition: border-color 0.15s;
      width: 100%;
      box-sizing: border-box;
    }
    .input:focus { border-color: var(--color-accent); }
    .input--textarea { height: auto; padding: 10px 12px; resize: vertical; }
    .field-error { font-size: 12px; color: #EF4444; }
    .section-divider { display: flex; align-items: baseline; gap: 8px; padding-top: 6px; margin-top: 2px; border-top: 1px solid var(--color-border); }
    .section-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); }
    .section-hint { font-size: 11.5px; color: var(--color-text-muted); }
    .connect-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: var(--color-accent); text-decoration: none; width: fit-content; }
    .connect-link:hover { text-decoration: underline; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
    .btn-cancel {
      height: 38px;
      padding: 0 16px;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    .btn-cancel:hover { background: var(--color-surface-raised); }
    .btn-submit {
      height: 38px;
      padding: 0 20px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    .btn-submit:hover { background: var(--color-primary-hover); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .card-delete-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.6; transition: all 0.15s ease; }
    .card-delete-btn:hover { opacity: 1; background: #FEF2F2; color: #DC2626; }
  `]
})
export class Projects implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  protected notifService = inject(NotificationService);

  protected activeTab   = signal<'all' | ProjectStatus>('all');
  protected stageFilter = signal<'all' | PipelineStage>('all');
  protected search      = signal('');
  protected projects    = signal<Project[]>([]);
  protected loading     = signal(true);
  protected error       = signal<string | null>(null);
  protected showModal   = signal(false);
  protected creating    = signal(false);
  protected createError = signal<string | null>(null);

  protected projectToDelete = signal<Project | null>(null);
  protected deleting = signal(false);

  protected confirmDeleteProject(event: Event, project: Project) {
    event.stopPropagation();
    event.preventDefault();
    this.projectToDelete.set(project);
  }

  protected cancelDelete() {
    this.projectToDelete.set(null);
  }

  protected deleteProject() {
    const p = this.projectToDelete();
    if (!p || this.deleting()) return;
    this.deleting.set(true);
    this.projectService.deleteProject(p.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.projectToDelete.set(null);
        this.projects.update(list => list.filter(item => item.id !== p.id));
        this.notifService.toast(`Project "${p.name}" deleted successfully`, 'success');
      },
      error: (err) => {
        this.deleting.set(false);
        this.notifService.toast(err?.error?.error ?? 'Failed to delete project', 'warning');
      }
    });
  }

  protected stageOptions = [
    { label: 'Profiling',       value: 'PROFILING'       as PipelineStage, color: '#3B82F6' },
    { label: 'Written Content', value: 'WRITTEN_CONTENT' as PipelineStage, color: '#8B5CF6' },
    { label: 'Design',          value: 'DESIGN'          as PipelineStage, color: '#EC4899' },
    { label: 'Development',     value: 'DEVELOPMENT'     as PipelineStage, color: '#F59E0B' },
    { label: 'Marketing',       value: 'MARKETING'       as PipelineStage, color: '#16A34A' },
  ];

  // External links for users who don't yet have a Google property set up
  protected readonly GA_CREATE_URL = 'https://analytics.google.com/analytics/web/#/provision';
  protected readonly GSC_CREATE_URL = 'https://search.google.com/search-console/welcome';

  protected newProjectForm = this.fb.group({
    name:                ['', Validators.required],
    clientName:          ['', Validators.required],
    description:         [''],
    startDate:           [''],
    targetDate:          [''],
    analyticsPropertyId: [''],
    searchConsoleUrl:    ['', Validators.pattern(/^https?:\/\/.+/)],
  });

  protected tabs = [
    { label: 'All',       value: 'all' as const,       count: computed(() => this.projects().length) },
    { label: 'Active',    value: 'ACTIVE' as const,    count: computed(() => this.projects().filter(p => p.status === 'ACTIVE').length) },
    { label: 'On Hold',   value: 'ON_HOLD' as const,   count: computed(() => this.projects().filter(p => p.status === 'ON_HOLD').length) },
    { label: 'Completed', value: 'COMPLETED' as const, count: computed(() => this.projects().filter(p => p.status === 'COMPLETED').length) },
  ];

  protected filtered = computed(() => {
    const tab   = this.activeTab();
    const stage = this.stageFilter();
    const q     = this.search().toLowerCase().trim();
    return this.projects().filter(p =>
      (tab   === 'all' || p.status       === tab)   &&
      (stage === 'all' || p.currentStage === stage) &&
      (!q || p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.loadProjects();
  }

  private loadProjects() {
    this.loading.set(true);
    this.error.set(null);
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Could not load projects. Is the backend running?');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  protected createProject() {
    if (this.newProjectForm.invalid) {
      this.newProjectForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    const v = this.newProjectForm.value;
    this.projectService.createProject({
      name:                v.name!,
      clientName:          v.clientName!,
      description:         v.description || undefined,
      startDate:           v.startDate || undefined,
      targetDate:          v.targetDate || undefined,
      analyticsPropertyId: v.analyticsPropertyId || undefined,
      searchConsoleUrl:    v.searchConsoleUrl || undefined,
    }).subscribe({
      next: (project) => {
        this.projects.update(list => [project, ...list]);
        this.closeModal();
        this.creating.set(false);
      },
      error: (err) => {
        this.createError.set(err?.error?.message || 'Failed to create project.');
        this.creating.set(false);
      },
    });
  }

  protected closeModal() {
    this.showModal.set(false);
    this.newProjectForm.reset();
    this.createError.set(null);
  }

  protected stageLabel(stage: PipelineStage) { return STAGE_LABELS[stage]; }
  protected stageColor(stage: PipelineStage) { return STAGE_COLORS[stage]; }

  protected statusLabel(status: ProjectStatus) {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'ON_HOLD') return 'On Hold';
    return 'Completed';
  }

  protected statusVariant(status: ProjectStatus): 'success' | 'warning' | 'info' {
    if (status === 'ACTIVE') return 'success';
    if (status === 'ON_HOLD') return 'warning';
    return 'info';
  }

  protected relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
  }
}
