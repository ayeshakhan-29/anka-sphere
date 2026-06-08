import { Component, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Badge } from '../../ui';

interface PipelineStage {
  id: number;
  label: string;
  dept: string;
  gate: 'hard' | 'soft' | 'none';
  status: 'completed' | 'active' | 'locked';
}

interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'on-hold' | 'completed';
  currentStage: number;
  startDate: string;
  targetDate: string;
  description: string;
  team: { initials: string; name: string; role: string }[];
}

const MOCK_PROJECTS: Record<string, Project> = {
  '1': { id: '1', name: 'Brand Refresh & Website', client: 'Lumina Studios', status: 'active', currentStage: 3, startDate: '1 Apr 2026', targetDate: '30 Jun 2026', description: 'Full brand identity refresh including new logo, colour palette, and a 6-page WordPress website.', team: [{ initials: 'AK', name: 'Ayesha K.', role: 'Admin' }, { initials: 'JD', name: 'James D.', role: 'Developer' }, { initials: 'SM', name: 'Sara M.', role: 'Designer' }, { initials: 'LT', name: 'Liam T.', role: 'SEO' }] },
  '2': { id: '2', name: 'E-Commerce Platform', client: 'Verdant Market', status: 'active', currentStage: 4, startDate: '15 Mar 2026', targetDate: '15 Jul 2026', description: 'WooCommerce build with custom product pages, checkout flow, and inventory integration.', team: [{ initials: 'AK', name: 'Ayesha K.', role: 'Admin' }, { initials: 'JD', name: 'James D.', role: 'Developer' }] },
  '3': { id: '3', name: 'SEO & Content Strategy', client: 'Peak Advisory', status: 'active', currentStage: 5, startDate: '1 Feb 2026', targetDate: '1 Aug 2026', description: 'Ongoing SEO and content marketing retainer covering blog, social, and search growth.', team: [{ initials: 'SM', name: 'Sara M.', role: 'Social Media' }, { initials: 'LT', name: 'Liam T.', role: 'SEO' }, { initials: 'AK', name: 'Ayesha K.', role: 'Admin' }] },
  '4': { id: '4', name: 'Corporate Website', client: 'Nexus Holdings', status: 'active', currentStage: 2, startDate: '10 May 2026', targetDate: '30 Jul 2026', description: '5-page corporate website with team pages, case studies, and contact forms.', team: [{ initials: 'JD', name: 'James D.', role: 'Developer' }, { initials: 'AK', name: 'Ayesha K.', role: 'Admin' }] },
  '5': { id: '5', name: 'Social Media Launch', client: 'Bloom Skincare', status: 'active', currentStage: 1, startDate: '1 Jun 2026', targetDate: '1 Sep 2026', description: 'Brand launch across Instagram, TikTok, and Facebook with full content strategy.', team: [{ initials: 'SM', name: 'Sara M.', role: 'Social Media' }] },
  '6': { id: '6', name: 'Annual Report Site', client: 'Atlas Finance', status: 'on-hold', currentStage: 4, startDate: '1 Mar 2026', targetDate: '30 Sep 2026', description: 'Microsite for annual report with interactive data visualisations and PDF download.', team: [{ initials: 'JD', name: 'James D.', role: 'Developer' }, { initials: 'LT', name: 'Liam T.', role: 'SEO' }] },
};

const PIPELINE: PipelineStage[] = [
  { id: 1, label: 'Project Profiling', dept: 'Product Modelling', gate: 'hard', status: 'completed' },
  { id: 2, label: 'Written Content',   dept: 'Product Modelling', gate: 'hard', status: 'completed' },
  { id: 3, label: 'Design',            dept: 'Product Modelling', gate: 'soft', status: 'active' },
  { id: 4, label: 'Development',       dept: 'Product Development', gate: 'soft', status: 'locked' },
  { id: 5, label: 'Marketing',         dept: 'Product Growth', gate: 'none', status: 'locked' },
];

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Badge],
  template: `
    @if (project()) {
      <div class="detail-page">

        <!-- Back + header -->
        <div class="page-top">
          <a routerLink="/app/projects" class="back-link" aria-label="Back to projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            All Projects
          </a>
        </div>

        <div class="project-header">
          <div class="header-left">
            <div class="client-badge">{{ project()!.client.slice(0, 2).toUpperCase() }}</div>
            <div>
              <h2 class="project-name">{{ project()!.name }}</h2>
              <p class="project-client">{{ project()!.client }}</p>
            </div>
          </div>
          <div class="header-right">
            <ui-badge [variant]="project()!.status === 'active' ? 'success' : project()!.status === 'on-hold' ? 'warning' : 'info'">
              {{ project()!.status === 'on-hold' ? 'On Hold' : project()!.status }}
            </ui-badge>
          </div>
        </div>

        <!-- Pipeline -->
        <div class="pipeline-card">
          <p class="pipeline-label">Delivery Pipeline</p>
          <div class="pipeline-track" role="list">
            @for (stage of pipeline(); track stage.id) {
              <div class="pipeline-stage" [class]="stage.status" role="listitem">
                <div class="stage-node">
                  @if (stage.status === 'completed') {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  } @else if (stage.status === 'active') {
                    <div class="active-dot"></div>
                  } @else {
                    <span>{{ stage.id }}</span>
                  }
                </div>
                @if (stage.id < 5) {
                  <div class="stage-connector" [class.filled]="stage.status === 'completed'"></div>
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

        <!-- Info + Team row -->
        <div class="meta-row">

          <div class="info-card">
            <p class="card-section-label">Project Details</p>
            <p class="project-desc">{{ project()!.description }}</p>
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-key">Start Date</span>
                <span class="meta-val">{{ project()!.startDate }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Target Date</span>
                <span class="meta-val">{{ project()!.targetDate }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Current Stage</span>
                <span class="meta-val">Stage {{ project()!.currentStage }} — {{ pipeline()[project()!.currentStage - 1].label }}</span>
              </div>
            </div>
          </div>

          <div class="team-card">
            <p class="card-section-label">Team</p>
            <ul class="team-list" aria-label="Project team">
              @for (member of project()!.team; track member.initials) {
                <li class="team-member">
                  <div class="member-avatar">{{ member.initials }}</div>
                  <div class="member-info">
                    <span class="member-name">{{ member.name }}</span>
                    <span class="member-role">{{ member.role }}</span>
                  </div>
                </li>
              }
            </ul>
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
                [attr.aria-selected]="false"
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
    .detail-page { max-width: 1100px; display: flex; flex-direction: column; gap: 20px; }

    /* Header */
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

    .project-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-right { display: flex; align-items: center; gap: 10px; }
    .client-badge {
      width: 48px;
      height: 48px;
      min-width: 48px;
      border-radius: 12px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .project-name {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .project-client { font-size: 13px; color: var(--color-text-secondary); margin: 0; }

    /* Pipeline */
    .pipeline-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-card);
    }
    .pipeline-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 0 0 16px;
    }
    .pipeline-track {
      display: flex;
      align-items: flex-start;
      gap: 0;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .pipeline-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      min-width: 0;
      position: relative;
    }
    .stage-node {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      border: 2px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
      z-index: 1;
      flex-shrink: 0;
    }
    .pipeline-stage.completed .stage-node {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: #fff;
    }
    .pipeline-stage.active .stage-node {
      background: var(--color-surface);
      border-color: var(--color-accent);
      color: var(--color-accent);
      box-shadow: 0 0 0 4px var(--color-accent-light);
    }
    .active-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-accent);
    }
    .stage-connector {
      position: absolute;
      top: 15px;
      left: calc(50% + 16px);
      right: calc(-50% + 16px);
      height: 2px;
      background: var(--color-border);
    }
    .stage-connector.filled { background: var(--color-accent); }
    .stage-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      margin-top: 10px;
      padding: 0 4px;
      text-align: center;
    }
    .stage-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
      white-space: nowrap;
    }
    .pipeline-stage.locked .stage-name { color: var(--color-text-muted); }
    .stage-dept { font-size: 10.5px; color: var(--color-text-muted); white-space: nowrap; }
    .gate-tag {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
    }
    .gate-hard { background: #FEE2E2; color: #DC2626; }
    .gate-soft { background: #FEF3C7; color: #D97706; }
    .gate-none { background: var(--color-accent-light); color: var(--color-accent); }

    /* Meta row */
    .meta-row { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }

    .info-card, .team-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-card);
    }
    .card-section-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 0 0 12px;
    }
    .project-desc {
      font-size: 13.5px;
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .meta-grid { display: flex; flex-direction: column; gap: 10px; }
    .meta-item { display: flex; justify-content: space-between; align-items: center; }
    .meta-key { font-size: 13px; color: var(--color-text-secondary); }
    .meta-val { font-size: 13px; font-weight: 500; color: var(--color-text); }

    .team-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .team-member { display: flex; align-items: center; gap: 10px; }
    .member-avatar {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .member-info { display: flex; flex-direction: column; }
    .member-name { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .member-role { font-size: 11.5px; color: var(--color-text-muted); }

    /* Dept tabs */
    .dept-tabs-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }
    .dept-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border);
      padding: 0 8px;
      overflow-x: auto;
    }
    .dept-tab {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
    }
    .dept-tab:hover { color: var(--color-text); }
    .dept-tab.active {
      color: var(--color-text);
      border-bottom-color: var(--color-accent);
    }
    .dept-content { padding: 24px; }
  `]
})
export class ProjectDetail {
  private route = inject(ActivatedRoute);

  protected project = computed(() => {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    return MOCK_PROJECTS[id] ?? null;
  });

  protected pipeline = computed(() => {
    const p = this.project();
    if (!p) return PIPELINE;
    return PIPELINE.map(s => ({
      ...s,
      status: s.id < p.currentStage ? 'completed' : s.id === p.currentStage ? 'active' : 'locked'
    })) as PipelineStage[];
  });

  protected deptTabs = [
    { label: 'Overview', route: 'overview' },
    { label: 'Project Profiling', route: 'profiling' },
    { label: 'Written Content', route: 'content' },
    { label: 'Design', route: 'design' },
    { label: 'Development', route: 'development' },
    { label: 'Analytics', route: 'analytics' },
    { label: 'Reporting', route: 'reporting' },
  ];
}
