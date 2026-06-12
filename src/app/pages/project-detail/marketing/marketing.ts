import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { MarketingTask, MarketingTaskCategory } from '../../../models/project.models';

type KanbanCol = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type CategoryFilter = 'ALL' | MarketingTaskCategory;

const COL_LABELS: Record<KanbanCol, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
};
const CAT_COLORS: Record<string, string> = {
  CONTENT: '#F59E0B', SOCIAL: '#EC4899', PAID: '#EF4444',
  SEO: '#10B981', ANALYTICS: '#6366F1', OTHER: '#6B7280',
};

@Component({
  selector: 'app-marketing-tab',
  imports: [ReactiveFormsModule],
  template: `
    <div class="mk-wrap">

      <!-- Tab nav -->
      <div class="tab-nav" role="tablist">
        @for (t of tabs; track t.id) {
          <button
            role="tab"
            class="tab-btn"
            [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id"
            (click)="activeTab.set(t.id)"
          >{{ t.label }}</button>
        }
      </div>

      <!-- ── Tab: Strategy Brief ── -->
      @if (activeTab() === 'brief') {
        <section class="tab-panel" aria-label="Marketing Strategy Brief">
          <form [formGroup]="briefForm" (ngSubmit)="saveBrief()" class="brief-form">
            <div class="form-grid">
              <div class="field span-2">
                <label class="field-label" for="mk-strategy">Marketing Strategy</label>
                <textarea id="mk-strategy" class="field-textarea" rows="4" formControlName="strategy" placeholder="Outline the overall marketing approach…"></textarea>
              </div>
              <div class="field span-2">
                <label class="field-label" for="mk-audience">Target Audience</label>
                <textarea id="mk-audience" class="field-textarea" rows="3" formControlName="targetAudience" placeholder="Who are we marketing to?"></textarea>
              </div>
              <div class="field">
                <label class="field-label" for="mk-budget">Budget</label>
                <input id="mk-budget" class="field-input" type="text" formControlName="budget" placeholder="e.g. £2,000 / month" />
              </div>
              <div class="field">
                <label class="field-label" for="mk-channels">Channels</label>
                <input id="mk-channels" class="field-input" type="text" formControlName="channels" placeholder="e.g. Instagram, Google Ads, Email" />
              </div>
              <div class="field span-2">
                <label class="field-label" for="mk-notes">Notes</label>
                <textarea id="mk-notes" class="field-textarea" rows="3" formControlName="notes" placeholder="Any additional notes…"></textarea>
              </div>
            </div>
            <div class="form-footer">
              @if (saveSuccess()) {
                <span class="save-ok" role="status">Saved</span>
              }
              <button class="btn-primary" type="submit" [disabled]="briefForm.invalid || saving()">
                {{ saving() ? 'Saving…' : 'Save Brief' }}
              </button>
            </div>
          </form>
        </section>
      }

      <!-- ── Tab: Kanban ── -->
      @if (activeTab() === 'kanban') {
        <section class="tab-panel" aria-label="Marketing task board">

          <!-- Category filter -->
          <div class="cat-filter" role="group" aria-label="Filter by category">
            @for (cat of categoryFilters; track cat) {
              <button
                class="cat-btn"
                [class.active]="catFilter() === cat"
                [style.--cat-color]="catFilter() === cat ? (CAT_COLORS[cat] ?? '#6366F1') : 'transparent'"
                (click)="catFilter.set(cat)"
              >{{ cat === 'ALL' ? 'All' : cat }}</button>
            }
          </div>

          <div class="kanban-board">
            @for (col of kanbanCols; track col) {
              <div class="kanban-col">
                <div class="col-header">
                  <span class="col-title">{{ COL_LABELS[col] }}</span>
                  <span class="col-count">{{ filteredTasks(col).length }}</span>
                </div>
                <div class="col-cards" [attr.aria-label]="COL_LABELS[col] + ' tasks'">
                  @for (task of filteredTasks(col); track task.id) {
                    <div class="task-card" [attr.aria-label]="task.title">
                      <div class="task-header">
                        <span class="task-cat-dot" [style.background]="CAT_COLORS[task.category ?? 'OTHER']" [attr.aria-label]="task.category ?? 'OTHER'"></span>
                        <span class="task-title">{{ task.title }}</span>
                        <button class="task-del" type="button" (click)="deleteTask(task)" aria-label="Delete task">×</button>
                      </div>
                      @if (task.description) {
                        <p class="task-desc">{{ task.description }}</p>
                      }
                      <div class="task-footer">
                        <select
                          class="task-status-sel"
                          [value]="task.status"
                          (change)="moveTask(task, $any($event.target).value)"
                          [attr.aria-label]="'Status for ' + task.title"
                        >
                          @for (c of kanbanCols; track c) {
                            <option [value]="c">{{ COL_LABELS[c] }}</option>
                          }
                        </select>
                        <span class="task-priority" [attr.data-p]="task.priority">{{ task.priority }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="col-empty">No tasks</div>
                  }
                </div>
                <button class="add-task-btn" type="button" (click)="addTask(col)">+ Add task</button>
              </div>
            }
          </div>
        </section>
      }

      <!-- ── Tab: Soft Gate ── -->
      @if (activeTab() === 'gate') {
        <section class="tab-panel gate-panel" aria-label="Marketing soft gate">
          <div class="gate-card">
            <div class="gate-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 class="gate-title">Soft Gate — Marketing Completion</h3>
            <p class="gate-desc">Marketing can be approved even with open tasks. Review the checklist below before proceeding.</p>

            <ul class="gate-checklist" aria-label="Gate checklist">
              <li class="check-item" [class.check-item--done]="briefForm.value.strategy || briefForm.value.channels">
                <span class="check-icon" aria-hidden="true">{{ (briefForm.value.strategy || briefForm.value.channels) ? '✓' : '○' }}</span>
                <span>Marketing strategy or channels defined</span>
              </li>
              <li class="check-item" [class.check-item--advisory]="openTaskCount() > 0">
                <span class="check-icon" aria-hidden="true">{{ openTaskCount() === 0 ? '✓' : '!' }}</span>
                <span>{{ openTaskCount() }} task(s) still open <em>(advisory — not blocking)</em></span>
              </li>
              <li class="check-item" [class.check-item--done]="briefForm.value.targetAudience">
                <span class="check-icon" aria-hidden="true">{{ briefForm.value.targetAudience ? '✓' : '○' }}</span>
                <span>Target audience defined</span>
              </li>
            </ul>

            @if (gateError()) {
              <div class="gate-error" role="alert">{{ gateError() }}</div>
            }
            @if (gateWarnings().length > 0) {
              <div class="gate-warnings" role="note">
                <strong>Advisory warnings:</strong>
                <ul>
                  @for (w of gateWarnings(); track w) { <li>{{ w }}</li> }
                </ul>
              </div>
            }

            @if (isCompleted()) {
              <div class="gate-approved" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Marketing stage approved. Project is complete.
              </div>
            } @else {
              <button
                class="btn-gate"
                type="button"
                [disabled]="gateLoading()"
                (click)="completeGate()"
              >
                {{ gateLoading() ? 'Approving…' : 'Approve & Complete Project' }}
              </button>
            }
          </div>
        </section>
      }

    </div>
  `,
  styles: [`
    .mk-wrap { display: flex; flex-direction: column; gap: 20px; }

    /* Tab nav */
    .tab-nav { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); padding-bottom: 0; }
    .tab-btn {
      padding: 8px 16px; border: none; background: none;
      font-family: var(--font-sans); font-size: 13.5px; font-weight: 500;
      color: var(--color-text-muted); cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #F97316; border-bottom-color: #F97316; }
    .tab-panel { padding-top: 4px; }

    /* Brief form */
    .brief-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .span-2 { grid-column: span 2; }
    .field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-secondary); }
    .field-input, .field-textarea {
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      padding: 8px 10px; font-family: var(--font-sans); font-size: 13.5px;
      color: var(--color-text); background: var(--color-surface); outline: none; resize: vertical;
    }
    .field-input:focus, .field-textarea:focus { border-color: #F97316; }
    .form-footer { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
    .save-ok { font-size: 12.5px; color: var(--color-accent); font-weight: 500; }
    .btn-primary {
      height: 36px; padding: 0 18px; background: #F97316; color: #fff;
      border: none; border-radius: var(--radius-md); font-family: var(--font-sans);
      font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-primary:hover:not(:disabled) { background: #EA6C0A; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Category filter */
    .cat-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .cat-btn {
      height: 28px; padding: 0 12px; border: 1px solid var(--color-border);
      border-radius: 14px; font-family: var(--font-sans); font-size: 12px; font-weight: 500;
      color: var(--color-text-muted); background: var(--color-surface); cursor: pointer; transition: all 0.15s;
    }
    .cat-btn.active { background: var(--cat-color, #6366F1); color: #fff; border-color: transparent; }

    /* Kanban */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
    .kanban-col { background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .col-header { display: flex; align-items: center; justify-content: space-between; padding: 2px 0 6px; }
    .col-title { font-size: 12.5px; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .col-count { font-size: 11px; font-weight: 700; background: var(--color-border); color: var(--color-text-muted); padding: 1px 7px; border-radius: 10px; }
    .col-cards { display: flex; flex-direction: column; gap: 6px; min-height: 40px; }
    .task-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; display: flex; flex-direction: column; gap: 6px; }
    .task-header { display: flex; align-items: flex-start; gap: 7px; }
    .task-cat-dot { width: 8px; height: 8px; min-width: 8px; border-radius: 50%; margin-top: 4px; }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); flex: 1; }
    .task-del { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0; margin-left: 4px; }
    .task-del:hover { color: var(--color-destructive); }
    .task-desc { font-size: 12px; color: var(--color-text-muted); margin: 0; }
    .task-footer { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .task-status-sel { font-family: var(--font-sans); font-size: 11.5px; border: 1px solid var(--color-border); border-radius: 6px; padding: 2px 6px; color: var(--color-text-secondary); background: var(--color-surface-raised); outline: none; cursor: pointer; }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEF3C7; color: #D97706; }
    .task-priority[data-p="URGENT"] { background: #FEE2E2; color: #DC2626; }
    .col-empty { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 12px 0; }
    .add-task-btn { background: none; border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); padding: 6px; font-family: var(--font-sans); font-size: 12px; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
    .add-task-btn:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }

    /* Gate */
    .gate-panel { display: flex; justify-content: center; padding-top: 24px; }
    .gate-card { max-width: 560px; width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 32px; display: flex; flex-direction: column; gap: 16px; }
    .gate-icon { width: 52px; height: 52px; border-radius: 14px; background: #FFF7ED; color: #F97316; display: flex; align-items: center; justify-content: center; }
    .gate-title { font-family: var(--font-display); font-size: 20px; font-weight: 400; color: var(--color-text); margin: 0; }
    .gate-desc { font-size: 13.5px; color: var(--color-text-muted); margin: 0; }
    .gate-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .check-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--color-text-muted); }
    .check-item--done { color: var(--color-text); }
    .check-item--advisory { color: #D97706; }
    .check-icon { font-size: 15px; width: 20px; text-align: center; color: var(--color-text-muted); }
    .check-item--done .check-icon { color: var(--color-accent); }
    .check-item--advisory .check-icon { color: #D97706; }
    .gate-error { padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); font-size: 13px; color: #DC2626; }
    .gate-warnings { padding: 10px 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); font-size: 13px; color: #92400E; }
    .gate-warnings ul { margin: 6px 0 0; padding-left: 16px; }
    .gate-approved { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); font-size: 13.5px; font-weight: 500; color: #15803D; }
    .btn-gate {
      height: 40px; padding: 0 20px; background: #F97316; color: #fff; border: none;
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 14px; font-weight: 600;
      cursor: pointer; align-self: flex-start; transition: background 0.15s;
    }
    .btn-gate:hover:not(:disabled) { background: #EA6C0A; }
    .btn-gate:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class MarketingTab implements OnInit {
  private route          = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private state          = inject(ProjectStateService);
  private fb             = inject(FormBuilder);

  private projectId = '';

  protected activeTab  = signal<'brief' | 'kanban' | 'gate'>('brief');
  protected saving     = signal(false);
  protected saveSuccess = signal(false);
  protected gateLoading = signal(false);
  protected gateError   = signal('');
  protected gateWarnings = signal<string[]>([]);
  protected tasks        = signal<MarketingTask[]>([]);
  protected catFilter    = signal<CategoryFilter>('ALL');

  readonly COL_LABELS = COL_LABELS;
  readonly CAT_COLORS = CAT_COLORS;
  readonly kanbanCols: KanbanCol[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  readonly categoryFilters: CategoryFilter[] = ['ALL', 'CONTENT', 'SOCIAL', 'PAID', 'SEO', 'ANALYTICS', 'OTHER'];

  readonly tabs = [
    { id: 'brief'  as const, label: 'Strategy Brief' },
    { id: 'kanban' as const, label: 'Task Board' },
    { id: 'gate'   as const, label: 'Soft Gate' },
  ];

  protected briefForm = this.fb.group({
    strategy:       [''],
    targetAudience: [''],
    budget:         [''],
    channels:       [''],
    notes:          [''],
  });

  protected isCompleted = computed(() => !!this.state.project()?.marketing?.completedAt);
  protected openTaskCount = computed(() => this.tasks().filter(t => t.status !== 'DONE').length);

  protected filteredTasks(col: KanbanCol): MarketingTask[] {
    const cat = this.catFilter();
    return this.tasks().filter(t =>
      t.status === col && (cat === 'ALL' || t.category === cat)
    );
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.parent?.paramMap.get('id') ?? '';
    const mkt = this.state.project()?.marketing;
    if (mkt) {
      this.briefForm.patchValue({
        strategy:       mkt.strategy       ?? '',
        targetAudience: mkt.targetAudience  ?? '',
        budget:         mkt.budget          ?? '',
        channels:       mkt.channels        ?? '',
        notes:          mkt.notes           ?? '',
      });
      this.tasks.set(mkt.tasks ?? []);
    }
  }

  protected saveBrief() {
    if (this.briefForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.projectService.upsertMarketing(this.projectId, this.briefForm.value as any).subscribe({
      next: (mkt) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.tasks.set(mkt.tasks ?? []);
        setTimeout(() => this.saveSuccess.set(false), 2500);
      },
      error: () => this.saving.set(false),
    });
  }

  protected addTask(col: KanbanCol) {
    this.projectService.createMarketingTask(this.projectId, {
      title: 'New Task', status: col, priority: 'MEDIUM',
      category: this.catFilter() === 'ALL' ? 'OTHER' : this.catFilter() as MarketingTaskCategory,
      sortOrder: this.tasks().length,
    }).subscribe(t => this.tasks.update(list => [...list, t]));
  }

  protected moveTask(task: MarketingTask, status: KanbanCol) {
    this.projectService.updateMarketingTask(this.projectId, task.id, { status }).subscribe(updated =>
      this.tasks.update(list => list.map(t => t.id === updated.id ? updated : t))
    );
  }

  protected deleteTask(task: MarketingTask) {
    this.projectService.deleteMarketingTask(this.projectId, task.id).subscribe(() =>
      this.tasks.update(list => list.filter(t => t.id !== task.id))
    );
  }

  protected completeGate() {
    this.gateLoading.set(true);
    this.gateError.set('');
    this.gateWarnings.set([]);
    this.projectService.completeMarketing(this.projectId).subscribe({
      next: (res) => {
        this.gateLoading.set(false);
        this.gateWarnings.set(res.warnings ?? []);
        this.projectService.getProject(this.projectId).subscribe(p => this.state.setProject(p));
      },
      error: (err) => {
        this.gateLoading.set(false);
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
      },
    });
  }
}
