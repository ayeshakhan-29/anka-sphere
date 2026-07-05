import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectStateService } from '../../services/project-state.service';

const STAGE_ROUTES: Record<string, string> = {
  PROFILING: 'profiling', WRITTEN_CONTENT: 'content',
  DESIGN: 'design', DEVELOPMENT: 'development', MARKETING: 'analytics',
};

@Component({
  selector: 'app-project-overview',
  imports: [RouterLink],
  template: `
    @if (state.project(); as p) {
      <div class="overview">

        <!-- Hero row -->
        <div class="hero">
          <div class="hero-left">
            <div class="client-avatar" aria-hidden="true">{{ initials() }}</div>
            <div>
              <h2 class="hero-name">{{ p.name }}</h2>
              <span class="hero-client">{{ p.clientName }}</span>
              @if (p.description) {
                <p class="hero-desc">{{ p.description }}</p>
              }
            </div>
          </div>
          <div class="hero-right">
            <div class="hero-dates">
              @if (p.startDate) {
                <div class="date-item">
                  <span class="date-label">Started</span>
                  <span class="date-val">{{ fmt(p.startDate) }}</span>
                </div>
              }
              @if (p.targetDate) {
                <div class="date-item">
                  <span class="date-label">Target</span>
                  <span class="date-val" [class.overdue]="isOverdue()">{{ fmt(p.targetDate) }}</span>
                </div>
              }
              <div class="date-item">
                <span class="date-label">Days Active</span>
                <span class="date-val">{{ daysActive() }}</span>
              </div>
              @if (daysRemaining() !== null) {
                <div class="date-item">
                  <span class="date-label">Days Left</span>
                  <span class="date-val" [class.overdue]="isOverdue()">
                    {{ isOverdue() ? (daysRemaining()! * -1) + ' overdue' : daysRemaining() }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Stat strip -->
        <div class="stat-strip" role="list" aria-label="Project snapshot">
          @for (s of stats(); track s.label) {
            <div class="stat-card" role="listitem">
              <div class="stat-val">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          }
        </div>

        <!-- Two-column body -->
        <div class="body-grid">

          <!-- Pipeline -->
          <section aria-label="Pipeline stages">
            <div class="section-title">Pipeline</div>
            <ul class="checklist" aria-label="Pipeline stages">
              @for (stage of state.pipeline(); track stage.id) {
                <li class="check-item" [class.done]="stage.status === 'completed'" [class.active]="stage.status === 'active'">
                  <span class="check-icon" [attr.aria-label]="stage.status" aria-hidden="true">
                    @if (stage.status === 'completed') {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else if (stage.status === 'active') {
                      <div class="pulse-dot" aria-hidden="true"></div>
                    } @else {
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                    }
                  </span>
                  <div class="item-info">
                    <span class="item-label">{{ stage.label }}</span>
                    <span class="item-dept">{{ stage.dept }}</span>
                  </div>
                  <div class="item-right">
                    <span class="gate-pill" [class]="'gate-' + stage.gate">
                      {{ stage.gate === 'hard' ? 'Hard Gate' : stage.gate === 'soft' ? 'Soft Gate' : 'No Gate' }}
                    </span>
                    @if (stage.status !== 'locked') {
                      <a class="stage-link" [routerLink]="['..', stageRoute(stage.stage)]" [attr.aria-label]="'Open ' + stage.label">Open →</a>
                    }
                  </div>
                </li>
              }
            </ul>
          </section>

          <!-- Right column -->
          <div class="right-col">

            <!-- Milestones -->
            @if ((p.milestones?.length ?? 0) > 0) {
              <section aria-label="Milestones">
                <div class="section-title">Milestones <span class="section-count">{{ milestonesDone() }}/{{ p.milestones!.length }}</span></div>
                <ul class="milestone-list">
                  @for (m of p.milestones!; track m.id) {
                    <li class="milestone-row" [class.ms-done]="m.status === 'DONE'">
                      <span class="ms-check" aria-hidden="true">
                        @if (m.status === 'DONE') {
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        }
                      </span>
                      <span class="ms-title">{{ m.label }}</span>
                      @if (m.dueDate) {
                        <span class="ms-due">{{ fmt(m.dueDate) }}</span>
                      }
                    </li>
                  }
                </ul>
              </section>
            }

            <!-- Profiling snapshot -->
            @if (p.profiling?.companyName) {
              <section aria-label="Client brief">
                <div class="section-title">Client Brief</div>
                <div class="brief-card">
                  <div class="brief-row">
                    <span class="brief-key">Company</span>
                    <span class="brief-val">{{ p.profiling!.companyName }}</span>
                  </div>
                  @if (p.profiling!.industry) {
                    <div class="brief-row">
                      <span class="brief-key">Industry</span>
                      <span class="brief-val">{{ p.profiling!.industry }}</span>
                    </div>
                  }
                  @if (p.profiling!.primaryKeywords) {
                    <div class="brief-row">
                      <span class="brief-key">Keywords</span>
                      <span class="brief-val brief-val--kw">{{ p.profiling!.primaryKeywords }}</span>
                    </div>
                  }
                  @if (p.profiling!.objectives) {
                    <div class="brief-row brief-row--block">
                      <span class="brief-key">Objectives</span>
                      <span class="brief-val">{{ p.profiling!.objectives }}</span>
                    </div>
                  }
                </div>
              </section>
            }

          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .overview { display: flex; flex-direction: column; gap: 20px; }

    /* Hero */
    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .hero-left { display: flex; align-items: flex-start; gap: 14px; }
    .client-avatar { width: 48px; height: 48px; min-width: 48px; border-radius: 12px; background: var(--color-sidebar); color: #F8FAFC; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .hero-name { font-family: var(--font-display); font-size: 24px; font-weight: 400; color: var(--color-text); margin: 0 0 3px; }
    .hero-client { font-size: 13px; font-weight: 500; color: var(--color-text-muted); }
    .hero-desc { font-size: 13px; color: var(--color-text-secondary); margin: 6px 0 0; max-width: 420px; line-height: 1.6; }
    .hero-dates { display: flex; gap: 16px; flex-wrap: wrap; }
    .date-item { display: flex; flex-direction: column; gap: 2px; min-width: 70px; }
    .date-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .date-val { font-size: 14px; font-weight: 700; color: var(--color-text); }
    .date-val.overdue { color: #DC2626; }

    /* Stats */
    .stat-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .stat-card { padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .stat-val { font-size: 22px; font-weight: 700; color: var(--color-text); line-height: 1; margin-bottom: 4px; }
    .stat-label { font-size: 11.5px; color: var(--color-text-muted); }

    /* Body grid */
    .body-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }

    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-count { background: var(--color-surface-raised); color: var(--color-text-secondary); padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 700; }

    /* Pipeline list */
    .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .check-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: var(--radius-md); background: var(--color-surface); border: 1px solid var(--color-border); transition: box-shadow 0.12s; }
    .check-item.done   { border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.03); }
    .check-item.active { border-color: var(--color-accent); background: var(--color-accent-light); }
    .check-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--color-surface-raised); border: 1.5px solid var(--color-border); flex-shrink: 0; color: var(--color-text-muted); }
    .check-item.done   .check-icon { background: #16A34A; border-color: #16A34A; color: #fff; }
    .check-item.active .check-icon { border-color: var(--color-accent); background: #fff; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .item-label { font-size: 13.5px; font-weight: 500; color: var(--color-text-muted); }
    .check-item.done .item-label, .check-item.active .item-label { color: var(--color-text); }
    .item-dept { font-size: 11px; color: var(--color-text-muted); }
    .item-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .gate-pill { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
    .gate-hard { background: #FEE2E2; color: #DC2626; }
    .gate-soft { background: #FEF3C7; color: #D97706; }
    .gate-none { background: var(--color-accent-light); color: var(--color-accent); }
    .stage-link { font-size: 12px; font-weight: 500; color: var(--color-accent); text-decoration: none; white-space: nowrap; }
    .stage-link:hover { text-decoration: underline; }

    /* Right column */
    .right-col { display: flex; flex-direction: column; gap: 20px; }

    /* Milestones */
    .milestone-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
    .milestone-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .milestone-row.ms-done { background: rgba(34,197,94,0.04); border-color: rgba(34,197,94,0.2); }
    .ms-check { width: 18px; height: 18px; min-width: 18px; border-radius: 50%; border: 1.5px solid var(--color-border); display: flex; align-items: center; justify-content: center; }
    .ms-done .ms-check { background: #16A34A; border-color: #16A34A; color: #fff; }
    .ms-title { font-size: 13px; color: var(--color-text); flex: 1; }
    .ms-done .ms-title { color: var(--color-text-muted); text-decoration: line-through; }
    .ms-due { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }

    /* Brief card */
    .brief-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .brief-row { display: flex; gap: 12px; padding: 9px 14px; border-bottom: 1px solid var(--color-border); }
    .brief-row:last-child { border-bottom: none; }
    .brief-row--block { flex-direction: column; gap: 4px; }
    .brief-key { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); min-width: 70px; padding-top: 1px; }
    .brief-val { font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.5; }
    .brief-val--kw { color: var(--color-text-muted); font-style: italic; }

    @media (max-width: 900px) {
      .body-grid { grid-template-columns: 1fr; }
      .stat-strip { grid-template-columns: repeat(3, 1fr); }
      .hero { flex-direction: column; }
    }
  `]
})
export class ProjectOverview {
  protected state = inject(ProjectStateService);

  protected initials = computed(() => {
    const name = this.state.project()?.clientName ?? '';
    return name.slice(0, 2).toUpperCase();
  });

  protected daysActive = computed(() => {
    const d = this.state.project()?.startDate;
    return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;
  });

  protected daysRemaining = computed((): number | null => {
    const d = this.state.project()?.targetDate;
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  });

  protected isOverdue = computed(() => {
    const r = this.daysRemaining();
    return r !== null && r < 0;
  });

  protected milestonesDone = computed(() =>
    (this.state.project()?.milestones ?? []).filter(m => m.status === 'DONE').length
  );

  protected stats = computed(() => {
    const p = this.state.project();
    if (!p) return [];
    const allTasks = [
      ...(p.design?.tasks ?? []),
      ...(p.development?.tasks ?? []),
      ...(p.marketing?.tasks ?? []),
    ];
    const doneTasks = allTasks.filter(t => t.status === 'DONE').length;
    const completedStages = p.pipeline.filter(e => e.status === 'APPROVED').length;
    const pages = p.content?.pages ?? [];
    const assets = (p.design?.assets ?? []).filter(a => !!a.approvedAt);
    const milestones = p.milestones ?? [];
    return [
      { label: 'Stages Done',     value: `${completedStages}/5` },
      { label: 'Tasks Done',      value: `${doneTasks}/${allTasks.length}` },
      { label: 'Content Pages',   value: `${pages.filter(pg => pg.status === 'APPROVED').length}/${pages.length}` },
      { label: 'Assets Approved', value: String(assets.length) },
      { label: 'Milestones',      value: `${this.milestonesDone()}/${milestones.length}` },
    ];
  });

  protected fmt(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected stageRoute(stage: string): string {
    return STAGE_ROUTES[stage] ?? 'overview';
  }
}
