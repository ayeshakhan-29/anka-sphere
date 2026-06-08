import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';

type PipelineStage = 'profiling' | 'content' | 'design' | 'development' | 'marketing';
type ProjectStatus = 'active' | 'on-hold' | 'completed';

interface Project {
  id: string;
  name: string;
  client: string;
  stage: PipelineStage;
  status: ProjectStatus;
  progress: number;
  updatedAt: string;
  team: string[];
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  profiling: 'Project Profiling',
  content: 'Written Content',
  design: 'Design',
  development: 'Development',
  marketing: 'Marketing',
};

const STAGE_COLORS: Record<PipelineStage, string> = {
  profiling: '#3B82F6',
  content: '#8B5CF6',
  design: '#EC4899',
  development: '#F59E0B',
  marketing: '#16A34A',
};

@Component({
  selector: 'app-projects',
  imports: [RouterLink, Badge],
  template: `
    <div class="projects-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="heading">All Projects</h2>
          <p class="subheading">{{ projects().length }} active client projects</p>
        </div>
        <button class="btn-new" (click)="newProject()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs" role="tablist" aria-label="Filter projects">
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

      <!-- Project grid -->
      <div class="project-grid" role="list">
        @for (project of filtered(); track project.id) {
          <article
            class="project-card"
            role="listitem"
            [routerLink]="['/app/projects', project.id]"
            tabindex="0"
            [attr.aria-label]="project.name + ' — ' + project.client"
          >
            <div class="card-top">
              <div class="client-badge">{{ project.client.slice(0, 2).toUpperCase() }}</div>
              <ui-badge [variant]="statusVariant(project.status)">
                {{ project.status === 'on-hold' ? 'On Hold' : project.status === 'completed' ? 'Completed' : 'Active' }}
              </ui-badge>
            </div>

            <div class="card-body">
              <h3 class="project-name">{{ project.name }}</h3>
              <p class="project-client">{{ project.client }}</p>
            </div>

            <div class="card-stage">
              <div class="stage-dot" [style.background]="stageColor(project.stage)"></div>
              <span class="stage-label">{{ stageLabel(project.stage) }}</span>
            </div>

            <div class="card-progress">
              <div class="progress-row">
                <span class="progress-label">Progress</span>
                <span class="progress-value">{{ project.progress }}%</span>
              </div>
              <div class="progress-bar" role="progressbar" [attr.aria-valuenow]="project.progress" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-fill" [style.width.%]="project.progress" [style.background]="stageColor(project.stage)"></div>
              </div>
            </div>

            <div class="card-footer">
              <div class="team-avatars" aria-label="Team members">
                @for (member of project.team.slice(0, 3); track member) {
                  <div class="team-avatar" [title]="member">{{ member.slice(0, 2) }}</div>
                }
                @if (project.team.length > 3) {
                  <div class="team-avatar overflow">+{{ project.team.length - 3 }}</div>
                }
              </div>
              <span class="updated-at">{{ project.updatedAt }}</span>
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

    </div>
  `,
  styles: [`
    .projects-page { max-width: 1200px; }

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
    .subheading {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 0;
    }
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

    /* Filter tabs */
    .filter-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0;
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
    .tab.active {
      color: var(--color-text);
      border-bottom-color: var(--color-accent);
    }
    .tab-count {
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .tab.active .tab-count {
      background: var(--color-accent-light);
      color: var(--color-accent);
    }

    /* Grid */
    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    /* Card */
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
    .project-card:hover {
      box-shadow: var(--shadow-raised);
      border-color: var(--color-border-strong);
      transform: translateY(-1px);
    }
    .project-card:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
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
    .project-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0;
    }
    .project-client {
      font-size: 12.5px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .card-stage {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .stage-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .stage-label {
      font-size: 12.5px;
      color: var(--color-text-secondary);
    }

    .progress-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .progress-label, .progress-value {
      font-size: 11.5px;
      color: var(--color-text-secondary);
    }
    .progress-value { font-weight: 600; }
    .progress-bar {
      height: 5px;
      background: var(--color-surface-raised);
      border-radius: 10px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s ease;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 4px;
      border-top: 1px solid var(--color-border);
    }
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

    /* Empty state */
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
  `]
})
export class Projects {
  protected activeTab = signal<'all' | ProjectStatus>('all');

  protected projects = signal<Project[]>([
    { id: '1', name: 'Brand Refresh & Website', client: 'Lumina Studios', stage: 'design', status: 'active', progress: 62, updatedAt: 'Today', team: ['AK', 'JD', 'SM', 'LT'] },
    { id: '2', name: 'E-Commerce Platform', client: 'Verdant Market', stage: 'development', status: 'active', progress: 45, updatedAt: 'Yesterday', team: ['AK', 'JD'] },
    { id: '3', name: 'SEO & Content Strategy', client: 'Peak Advisory', stage: 'marketing', status: 'active', progress: 80, updatedAt: '2 days ago', team: ['SM', 'LT', 'AK'] },
    { id: '4', name: 'Corporate Website', client: 'Nexus Holdings', stage: 'content', status: 'active', progress: 30, updatedAt: '3 days ago', team: ['JD', 'AK'] },
    { id: '5', name: 'Social Media Launch', client: 'Bloom Skincare', stage: 'profiling', status: 'active', progress: 10, updatedAt: '1 week ago', team: ['SM'] },
    { id: '6', name: 'Annual Report Site', client: 'Atlas Finance', stage: 'development', status: 'on-hold', progress: 55, updatedAt: '2 weeks ago', team: ['JD', 'LT'] },
  ]);

  protected tabs = [
    { label: 'All', value: 'all' as const, count: computed(() => this.projects().length) },
    { label: 'Active', value: 'active' as const, count: computed(() => this.projects().filter(p => p.status === 'active').length) },
    { label: 'On Hold', value: 'on-hold' as const, count: computed(() => this.projects().filter(p => p.status === 'on-hold').length) },
    { label: 'Completed', value: 'completed' as const, count: computed(() => this.projects().filter(p => p.status === 'completed').length) },
  ];

  protected filtered = computed(() => {
    const tab = this.activeTab();
    if (tab === 'all') return this.projects();
    return this.projects().filter(p => p.status === tab);
  });

  protected stageLabel(stage: PipelineStage) { return STAGE_LABELS[stage]; }
  protected stageColor(stage: PipelineStage) { return STAGE_COLORS[stage]; }
  protected statusVariant(status: ProjectStatus): 'success' | 'warning' | 'info' {
    if (status === 'active') return 'success';
    if (status === 'on-hold') return 'warning';
    return 'info';
  }

  protected newProject() {
    // TODO: open new project modal
  }
}
