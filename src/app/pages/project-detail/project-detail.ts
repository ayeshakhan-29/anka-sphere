import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { ProjectStateService } from '../../services/project-state.service';

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
          <div class="header-right">
            <ui-badge [variant]="statusVariant(state.project()!.status)">
              {{ statusLabel(state.project()!.status) }}
            </ui-badge>
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
            @for (tab of deptTabs; track tab.route) {
              <a
                [routerLink]="tab.route"
                routerLinkActive="active"
                class="dept-tab"
                role="tab"
              >{{ tab.label }}</a>
            }
          </div>
          <div class="dept-content">
            <router-outlet />
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
    .dept-content { padding: 24px; }

    @media (max-width: 768px) {
      .meta-row { grid-template-columns: 1fr; }
    }
  `]
})
export class ProjectDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  protected state = inject(ProjectStateService);

  protected loadError = computed(() => this.state.loading() ? null : (this.state.project() ? null : this._error));
  private _error: string | null = null;

  protected deptTabs = [
    { label: 'Overview',          route: 'overview' },
    { label: 'Project Profiling', route: 'profiling' },
    { label: 'Written Content',   route: 'content' },
    { label: 'Design',            route: 'design' },
    { label: 'Development',       route: 'development' },
    { label: 'Analytics',         route: 'analytics' },
    { label: 'Reporting',         route: 'reporting' },
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.state.loading.set(true);
    this.projectService.getProject(id).subscribe({
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

  protected relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
  }
}
