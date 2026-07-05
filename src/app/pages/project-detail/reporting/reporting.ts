import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ProjectStateService } from '../../../services/project-state.service';
import { ProjectService } from '../../../services/project.service';
import { ProjectReport } from '../../../models/project.models';
import { Badge } from '../../../ui';

type ReportTab = 'weekly' | 'monthly' | 'history';
type ReportStatus = 'draft' | 'ready' | 'sent';

interface PastReport {
  id: string;
  type: 'weekly' | 'monthly';
  period: string;
  status: ReportStatus;
  sentAt: string;
  sentBy: string;
}


@Component({
  selector: 'app-reporting-tab',
  imports: [ReactiveFormsModule, Badge],
  template: `
    <div class="rpt-wrap">

      <!-- Inner tab nav -->
      <div class="tab-nav" role="tablist" aria-label="Report type">
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

      <!-- ── Weekly Report ── -->
      @if (activeTab() === 'weekly') {
        <section class="tab-panel" aria-label="Weekly report">
          <!-- Period header -->
          <div class="report-header">
            <div class="report-header-left">
              <div class="period-badge">Weekly</div>
              <div>
                <h3 class="period-label">{{ weekLabel }}</h3>
                <p class="period-sub">Next report due: Monday, {{ nextMonday }}</p>
              </div>
            </div>
            <div class="report-actions-top">
              <span class="status-badge" [class]="'status-' + weeklyStatus()">
                {{ statusLabel(weeklyStatus()) }}
              </span>
            </div>
          </div>

          <!-- KPI strip from project data -->
          <div class="stats-strip" role="list" aria-label="Project stats snapshot">
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ activeStageNum() }}</div>
              <div class="stat-label">Current Stage</div>
              <div class="stat-sub">{{ activeStageName() }}</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ completedStages() }}<span class="stat-denom">/5</span></div>
              <div class="stat-label">Stages Complete</div>
              <div class="stat-sub">Pipeline progress</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ doneTasks() }}<span class="stat-denom">/{{ totalTasks() }}</span></div>
              <div class="stat-label">Tasks Done</div>
              <div class="stat-sub">Across all stages</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ daysActive() }}</div>
              <div class="stat-label">Days Active</div>
              <div class="stat-sub">Since project start</div>
            </div>
          </div>

          <!-- Pipeline snapshot -->
          <div class="section-card">
            <div class="section-card-header">
              <span class="section-card-title">Pipeline Status</span>
              <span class="section-card-meta">Auto-generated</span>
            </div>
            <div class="pipeline-row" role="list">
              @for (stage of state.pipeline(); track stage.stage) {
                <div class="ps-stage" [class]="'ps-' + stage.status" role="listitem" [attr.aria-label]="stage.label + ' — ' + stage.status">
                  <div class="ps-dot">
                    @if (stage.status === 'completed') {
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else if (stage.status === 'active') {
                      <div class="ps-active-dot" aria-hidden="true"></div>
                    }
                  </div>
                  <span class="ps-label">{{ stage.label }}</span>
                </div>
                @if (stage.id < 5) {
                  <div class="ps-connector" [class.ps-connector--filled]="stage.status === 'completed'" aria-hidden="true"></div>
                }
              }
            </div>
          </div>

          <!-- Editable report sections -->
          <form [formGroup]="weeklyForm" class="report-form" aria-label="Weekly report content">

            <div class="report-field">
              <div class="field-header">
                <label class="field-label" for="wk-summary">Executive Summary</label>
                <button type="button" class="auto-fill-btn" (click)="autoFillWeekly()" aria-label="Auto-fill summary from project data">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Auto-fill
                </button>
              </div>
              <textarea
                id="wk-summary"
                class="report-textarea"
                rows="4"
                formControlName="summary"
                placeholder="Summarise progress this week across all departments…"
              ></textarea>
            </div>

            <div class="form-row-2">
              <div class="report-field">
                <label class="field-label" for="wk-blockers">Blockers & Risks</label>
                <textarea
                  id="wk-blockers"
                  class="report-textarea"
                  rows="3"
                  formControlName="blockers"
                  placeholder="Any blockers, risks, or issues flagged this week…"
                ></textarea>
              </div>
              <div class="report-field">
                <label class="field-label" for="wk-next">Plan for Next Week</label>
                <textarea
                  id="wk-next"
                  class="report-textarea"
                  rows="3"
                  formControlName="nextPlan"
                  placeholder="Key objectives and tasks planned for next week…"
                ></textarea>
              </div>
            </div>

          </form>

          <!-- Report footer actions -->
          <div class="report-footer">
            <div class="footer-left">
              @if (weeklyStatus() === 'draft') {
                <button class="btn-ready" (click)="markWeeklyReady()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark Ready
                </button>
              }
              @if (weeklyStatus() === 'ready') {
                <input class="send-input" type="text" placeholder="client@example.com, manager@example.com"
                  [value]="weeklyRecipients()" (input)="weeklyRecipients.set($any($event.target).value)"
                  aria-label="Recipient email addresses, comma separated" />
                <button class="btn-send" (click)="sendWeekly()" [disabled]="sendingWeekly()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  @if (sendingWeekly()) { Sending… } @else { Send by Email }
                </button>
              }
              @if (weeklyStatus() === 'sent') {
                <span class="sent-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Sent — added to history
                </span>
                @if (weeklyPreviewUrl(); as url) {
                  <a class="preview-link" [href]="url" target="_blank" rel="noopener noreferrer">View sent email</a>
                }
              }
              @if (sendError()) { <span class="send-error" role="alert">{{ sendError() }}</span> }
            </div>
            <div class="footer-right">
              <button class="btn-outline" (click)="copyLink()" [attr.aria-label]="copying() ? 'Link copied' : 'Copy link to report'">
                @if (copying()) {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                } @else {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copy Link
                }
              </button>
              <button class="btn-outline" (click)="exportWeeklyCSV()" aria-label="Export weekly report as CSV">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                Export CSV
              </button>
              <button class="btn-primary-sm" (click)="exportWeeklyPDF()" aria-label="Export weekly report as PDF">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export PDF
              </button>
            </div>
          </div>
        </section>
      }

      <!-- ── Monthly Report ── -->
      @if (activeTab() === 'monthly') {
        <section class="tab-panel" aria-label="Monthly report">
          <!-- Period header -->
          <div class="report-header">
            <div class="report-header-left">
              <div class="period-badge period-badge--monthly">Monthly</div>
              <div>
                <h3 class="period-label">{{ monthLabel }}</h3>
                <p class="period-sub">Next report due: 1st of next month</p>
              </div>
            </div>
            <div class="report-actions-top">
              <span class="status-badge" [class]="'status-' + monthlyStatus()">
                {{ statusLabel(monthlyStatus()) }}
              </span>
            </div>
          </div>

          <!-- KPI strip -->
          <div class="stats-strip" role="list" aria-label="Monthly project stats">
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ daysActive() }}</div>
              <div class="stat-label">Days Active</div>
              <div class="stat-sub">Since project start</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ completedStages() }}<span class="stat-denom">/5</span></div>
              <div class="stat-label">Stages Complete</div>
              <div class="stat-sub">Pipeline progress</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ doneTasks() }}<span class="stat-denom">/{{ totalTasks() }}</span></div>
              <div class="stat-label">Tasks Done</div>
              <div class="stat-sub">All departments</div>
            </div>
            <div class="stat-card" role="listitem">
              <div class="stat-value">{{ milestonesDone() }}<span class="stat-denom">/{{ milestonesTotal() }}</span></div>
              <div class="stat-label">Milestones</div>
              <div class="stat-sub">Completed</div>
            </div>
          </div>

          <!-- Stage progress table -->
          <div class="section-card">
            <div class="section-card-header">
              <span class="section-card-title">Pipeline Progress</span>
              <span class="section-card-meta">Auto-generated</span>
            </div>
            <div class="stage-table" role="table" aria-label="Stage progress table">
              <div class="stage-table-head" role="row">
                <span role="columnheader">Stage</span>
                <span role="columnheader">Department</span>
                <span role="columnheader">Gate</span>
                <span role="columnheader">Status</span>
              </div>
              @for (stage of state.pipeline(); track stage.stage) {
                <div class="stage-table-row" role="row" [class.stage-table-row--active]="stage.status === 'active'">
                  <span class="st-name" role="cell">{{ stage.id }}. {{ stage.label }}</span>
                  <span class="st-dept" role="cell">{{ stage.dept }}</span>
                  <span class="st-gate" role="cell">
                    <span class="gate-chip" [class]="'gate-' + stage.gate">{{ gateLabel(stage.gate) }}</span>
                  </span>
                  <span class="st-status" role="cell">
                    <span class="stage-status-dot" [class]="'dot-' + stage.status" aria-hidden="true"></span>
                    {{ stageStatusLabel(stage.status) }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Editable sections -->
          <form [formGroup]="monthlyForm" class="report-form" aria-label="Monthly report content">

            <div class="report-field">
              <div class="field-header">
                <label class="field-label" for="mo-summary">Monthly Summary</label>
                <button type="button" class="auto-fill-btn" (click)="autoFillMonthly()" aria-label="Auto-fill summary from project data">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Auto-fill
                </button>
              </div>
              <textarea
                id="mo-summary"
                class="report-textarea"
                rows="4"
                formControlName="summary"
                placeholder="Summarise the month's progress, decisions, and outcomes…"
              ></textarea>
            </div>

            <div class="form-row-2">
              <div class="report-field">
                <label class="field-label" for="mo-highlights">Key Highlights</label>
                <textarea
                  id="mo-highlights"
                  class="report-textarea"
                  rows="3"
                  formControlName="highlights"
                  placeholder="Major wins, milestones reached, or notable achievements…"
                ></textarea>
              </div>
              <div class="report-field">
                <label class="field-label" for="mo-next">Next Month Goals</label>
                <textarea
                  id="mo-next"
                  class="report-textarea"
                  rows="3"
                  formControlName="nextGoals"
                  placeholder="Targets and objectives for the coming month…"
                ></textarea>
              </div>
            </div>

          </form>

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-left">
              @if (monthlyStatus() === 'draft') {
                <button class="btn-ready" (click)="markMonthlyReady()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark Ready
                </button>
              }
              @if (monthlyStatus() === 'ready') {
                <input class="send-input" type="text" placeholder="client@example.com, manager@example.com"
                  [value]="monthlyRecipients()" (input)="monthlyRecipients.set($any($event.target).value)"
                  aria-label="Recipient email addresses, comma separated" />
                <button class="btn-send" (click)="sendMonthly()" [disabled]="sendingMonthly()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  @if (sendingMonthly()) { Sending… } @else { Send by Email }
                </button>
              }
              @if (monthlyStatus() === 'sent') {
                <span class="sent-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Sent — added to history
                </span>
                @if (monthlyPreviewUrl(); as url) {
                  <a class="preview-link" [href]="url" target="_blank" rel="noopener noreferrer">View sent email</a>
                }
              }
              @if (sendError()) { <span class="send-error" role="alert">{{ sendError() }}</span> }
            </div>
            <div class="footer-right">
              <button class="btn-outline" (click)="copyLink()" [attr.aria-label]="copying() ? 'Link copied' : 'Copy link to report'">
                @if (copying()) {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                } @else {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copy Link
                }
              </button>
              <button class="btn-outline" (click)="exportMonthlyCSV()" aria-label="Export monthly report as CSV">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                Export CSV
              </button>
              <button class="btn-primary-sm" (click)="exportMonthlyPDF()" aria-label="Export monthly report as PDF">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export PDF
              </button>
            </div>
          </div>
        </section>
      }

      <!-- ── History ── -->
      @if (activeTab() === 'history') {
        <section class="tab-panel" aria-label="Report history">
          <div class="history-header">
            <h3 class="history-title">Sent Reports</h3>
            <p class="history-sub">{{ history().length }} reports on record for this project</p>
          </div>

          @if (history().length === 0) {
            <div class="empty-history" role="status">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>No reports sent yet.</p>
            </div>
          } @else {
            <div class="history-table" role="table" aria-label="Report history">
              <div class="history-head" role="row">
                <span role="columnheader">Period</span>
                <span role="columnheader">Type</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Sent</span>
                <span role="columnheader">By</span>
                <span role="columnheader" aria-label="Actions"></span>
              </div>
              @for (report of history(); track report.id) {
                <div class="history-row" role="row">
                  <span class="hr-period" role="cell">{{ report.period }}</span>
                  <span class="hr-type" role="cell">
                    <span class="type-chip" [class]="'type-' + report.type">{{ report.type === 'weekly' ? 'Weekly' : 'Monthly' }}</span>
                  </span>
                  <span role="cell">
                    <ui-badge variant="success">Sent</ui-badge>
                  </span>
                  <span class="hr-date" role="cell">{{ report.sentAt }}</span>
                  <span class="hr-by" role="cell">{{ report.sentBy }}</span>
                  <span class="hr-actions" role="cell">
                    <button class="hist-btn" [attr.aria-label]="'Download ' + report.period + ' report'" (click)="downloadHistoryReport(report)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
                      Download
                    </button>
                  </span>
                </div>
              }
            </div>
          }
        </section>
      }

    </div>
  `,
  styles: [`
    .rpt-wrap { width: 100%; }

    /* ── Inner tab nav ── */
    .tab-nav {
      display: flex;
      gap: 2px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 24px;
    }
    .tab-btn {
      padding: 8px 16px;
      border: none;
      background: transparent;
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: var(--color-text); border-bottom-color: #6366F1; }

    .tab-panel { display: flex; flex-direction: column; gap: 20px; }

    /* ── Report header ── */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .report-header-left { display: flex; align-items: center; gap: 12px; }
    .period-badge {
      height: 30px;
      padding: 0 12px;
      border-radius: 8px;
      background: rgba(99,102,241,0.12);
      color: #6366F1;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .period-badge--monthly {
      background: rgba(139,92,246,0.12);
      color: #8B5CF6;
    }
    .period-label {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 2px;
    }
    .period-sub { font-size: 12px; color: var(--color-text-muted); margin: 0; }

    /* Status badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      height: 26px;
      padding: 0 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .status-draft   { background: var(--color-surface-raised); color: var(--color-text-secondary); border: 1px solid var(--color-border); }
    .status-ready   { background: rgba(234,179,8,0.12); color: #CA8A04; border: 1px solid rgba(234,179,8,0.3); }
    .status-sent    { background: rgba(34,197,94,0.1); color: #16A34A; border: 1px solid rgba(34,197,94,0.3); }

    /* ── Stats strip ── */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
    }
    .stat-value {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 400;
      color: var(--color-text);
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-denom { font-size: 16px; color: var(--color-text-muted); }
    .stat-label { font-size: 12.5px; font-weight: 600; color: var(--color-text); margin-bottom: 2px; }
    .stat-sub   { font-size: 11.5px; color: var(--color-text-muted); }

    /* ── Section card ── */
    .section-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .section-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface-raised);
    }
    .section-card-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: 0.02em;
    }
    .section-card-meta { font-size: 11px; color: var(--color-text-muted); }

    /* Pipeline row */
    .pipeline-row {
      display: flex;
      align-items: center;
      padding: 16px 18px;
      gap: 0;
      flex-wrap: wrap;
    }
    .ps-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 80px;
    }
    .ps-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-border);
      background: var(--color-surface-raised);
      flex-shrink: 0;
    }
    .ps-completed .ps-dot { background: #16A34A; border-color: #16A34A; color: #fff; }
    .ps-active .ps-dot    { background: var(--color-surface); border-color: #6366F1; }
    .ps-active-dot { width: 10px; height: 10px; border-radius: 50%; background: #6366F1; animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .ps-label {
      font-size: 10.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-align: center;
      white-space: nowrap;
    }
    .ps-completed .ps-label { color: var(--color-text); }
    .ps-active .ps-label    { color: #6366F1; font-weight: 600; }
    .ps-connector {
      flex: 1;
      height: 2px;
      background: var(--color-border);
      margin-top: -18px;
      align-self: flex-start;
    }
    .ps-connector--filled { background: #16A34A; }

    /* Stage table (monthly) */
    .stage-table { display: flex; flex-direction: column; }
    .stage-table-head {
      display: grid;
      grid-template-columns: 1fr 1fr 100px 100px;
      gap: 12px;
      padding: 10px 18px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      background: var(--color-surface-raised);
    }
    .stage-table-row {
      display: grid;
      grid-template-columns: 1fr 1fr 100px 100px;
      gap: 12px;
      padding: 11px 18px;
      border-top: 1px solid var(--color-border);
      font-size: 13px;
      color: var(--color-text-secondary);
    }
    .stage-table-row--active {
      background: rgba(99,102,241,0.03);
    }
    .st-name { font-weight: 500; color: var(--color-text); }
    .st-dept { color: var(--color-text-muted); }
    .gate-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 600;
    }
    .gate-hard { background: rgba(220,38,38,0.1); color: #DC2626; }
    .gate-soft { background: rgba(245,158,11,0.1); color: #D97706; }
    .gate-none { background: rgba(22,163,74,0.1); color: #16A34A; }
    .st-status { display: flex; align-items: center; gap: 6px; }
    .stage-status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .dot-completed { background: #16A34A; }
    .dot-active    { background: #6366F1; }
    .dot-locked    { background: var(--color-border); }

    /* ── Report form ── */
    .report-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .report-field { display: flex; flex-direction: column; gap: 6px; }
    .field-header { display: flex; align-items: center; justify-content: space-between; }
    .field-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-text);
    }
    .auto-fill-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 8px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: transparent;
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .auto-fill-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .report-textarea {
      width: 100%;
      padding: 10px 12px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      line-height: 1.6;
      resize: vertical;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .report-textarea:focus { border-color: #6366F1; }
    .report-textarea::placeholder { color: var(--color-text-muted); }

    /* ── Footer ── */
    .report-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
      flex-wrap: wrap;
    }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-right { display: flex; align-items: center; gap: 8px; }

    .btn-ready {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(234,179,8,0.4);
      background: rgba(234,179,8,0.1);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      color: #CA8A04;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-ready:hover { background: rgba(234,179,8,0.2); }

    .btn-send {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(99,102,241,0.3);
      background: rgba(99,102,241,0.1);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      color: #6366F1;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-send:hover { background: rgba(99,102,241,0.2); }

    .sent-note {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #16A34A;
      font-weight: 500;
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .btn-outline:hover { background: var(--color-surface-raised); color: var(--color-text); border-color: var(--color-border-strong); }

    .btn-primary-sm {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 14px;
      border-radius: var(--radius-sm);
      border: none;
      background: #6366F1;
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-primary-sm:hover { background: #4F46E5; }

    /* ── History ── */
    .history-header { margin-bottom: 4px; }
    .history-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 4px;
    }
    .history-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }

    .empty-history {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px;
      color: var(--color-text-muted);
      font-size: 13px;
    }
    .empty-history p { margin: 0; }

    .history-table {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .history-head {
      display: grid;
      grid-template-columns: 1fr 90px 80px 110px 80px 100px;
      gap: 12px;
      padding: 10px 18px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      background: var(--color-surface-raised);
    }
    .history-row {
      display: grid;
      grid-template-columns: 1fr 90px 80px 110px 80px 100px;
      gap: 12px;
      padding: 12px 18px;
      border-top: 1px solid var(--color-border);
      align-items: center;
      transition: background 0.15s;
    }
    .history-row:hover { background: var(--color-surface-raised); }
    .hr-period { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .hr-date   { font-size: 12.5px; color: var(--color-text-secondary); }
    .hr-by     { font-size: 12.5px; color: var(--color-text-muted); }
    .hr-actions { display: flex; justify-content: flex-end; }
    .type-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
    }
    .type-weekly  { background: rgba(99,102,241,0.1); color: #6366F1; }
    .type-monthly { background: rgba(139,92,246,0.1); color: #8B5CF6; }
    .hist-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: transparent;
      font-family: var(--font-sans);
      font-size: 11.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .hist-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }

    .send-input {
      height: 34px; min-width: 260px; padding: 0 12px;
      border: 1px solid var(--color-border); border-radius: 8px;
      font-family: var(--font-sans); font-size: 12.5px; color: var(--color-text);
      background: var(--color-surface); outline: none;
    }
    .send-input:focus { border-color: #6366F1; }
    .preview-link { font-size: 12px; font-weight: 500; color: #6366F1; text-decoration: none; }
    .preview-link:hover { text-decoration: underline; }
    .send-error { font-size: 12px; color: #DC2626; font-weight: 500; }

    @media (max-width: 900px) {
      .stats-strip { grid-template-columns: repeat(2, 1fr); }
      .form-row-2  { grid-template-columns: 1fr; }
      .stage-table-head, .stage-table-row { grid-template-columns: 1fr 1fr; }
      .stage-table-head span:nth-child(n+3),
      .stage-table-row span:nth-child(n+3) { display: none; }
      .history-head, .history-row { grid-template-columns: 1fr 90px 80px auto; }
      .history-head span:nth-child(n+4),
      .history-row span:nth-child(n+4) { display: none; }
      .history-row span:nth-child(6) { display: flex; }
    }
  `]
})
export class ReportingTab implements OnInit {
  protected state = inject(ProjectStateService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  private get projectId(): string {
    return this.state.project()?.id ?? '';
  }

  protected weekLabel = this.computeWeekLabel();
  protected monthLabel = this.computeMonthLabel();
  protected nextMonday = this.computeNextMonday();

  protected activeTab = signal<ReportTab>('weekly');
  protected weeklyStatus = signal<ReportStatus>('draft');
  protected monthlyStatus = signal<ReportStatus>('draft');
  protected copying = signal(false);
  protected history = signal<PastReport[]>([]);

  protected weeklyRecipients  = signal('');
  protected monthlyRecipients = signal('');
  protected sendingWeekly     = signal(false);
  protected sendingMonthly    = signal(false);
  protected weeklyPreviewUrl  = signal<string | null>(null);
  protected monthlyPreviewUrl = signal<string | null>(null);
  protected sendError         = signal<string | null>(null);
  private weeklyReportId: string | null = null;
  private monthlyReportId: string | null = null;

  protected weeklyForm = this.fb.nonNullable.group({
    summary:  [''],
    blockers: [''],
    nextPlan: [''],
  });

  protected monthlyForm = this.fb.nonNullable.group({
    summary:    [''],
    highlights: [''],
    nextGoals:  [''],
  });

  protected readonly tabs = [
    { id: 'weekly'  as ReportTab, label: 'Weekly Report' },
    { id: 'monthly' as ReportTab, label: 'Monthly Report' },
    { id: 'history' as ReportTab, label: 'History' },
  ];

  protected activeStageName = computed(() =>
    this.state.pipeline().find(s => s.status === 'active')?.label ?? '—'
  );

  protected activeStageNum = computed(() =>
    this.state.pipeline().find(s => s.status === 'active')?.id ?? 0
  );

  protected completedStages = computed(() =>
    this.state.pipeline().filter(s => s.status === 'completed').length
  );

  protected totalTasks = computed(() => {
    const p = this.state.project();
    if (!p) return 0;
    return (p.design?.tasks.length ?? 0)
         + (p.development?.tasks.length ?? 0)
         + (p.marketing?.tasks.length ?? 0);
  });

  protected doneTasks = computed(() => {
    const p = this.state.project();
    if (!p) return 0;
    return [
      ...(p.design?.tasks ?? []),
      ...(p.development?.tasks ?? []),
      ...(p.marketing?.tasks ?? []),
    ].filter(t => t.status === 'DONE').length;
  });

  protected daysActive = computed(() => {
    const p = this.state.project();
    if (!p?.startDate) return 0;
    return Math.floor((Date.now() - new Date(p.startDate).getTime()) / 86400000);
  });

  protected milestonesDone = computed(() =>
    (this.state.project()?.milestones ?? []).filter(m => m.status === 'DONE').length
  );

  protected milestonesTotal = computed(() =>
    this.state.project()?.milestones?.length ?? 0
  );

  private autoWeeklySummary = computed(() => {
    const p = this.state.project();
    if (!p) return '';
    return `${p.name} for ${p.clientName} continues progress in Stage ${this.activeStageNum()} — ${this.activeStageName()}. ${this.completedStages()} of 5 pipeline stages have been completed. ${this.doneTasks()} of ${this.totalTasks()} tasks are marked done. The project remains on track with no critical blockers at this time.`;
  });

  private autoMonthlySummary = computed(() => {
    const p = this.state.project();
    if (!p) return '';
    return `${p.name} has been active for ${this.daysActive()} days. This month, the team progressed through the ${this.activeStageName()} stage. ${this.milestonesDone()} of ${this.milestonesTotal()} milestones have been completed. Overall delivery remains on schedule.`;
  });

  ngOnInit() {
    this.weeklyForm.patchValue({ summary: this.autoWeeklySummary() });
    this.monthlyForm.patchValue({ summary: this.autoMonthlySummary() });
    this.loadReports();
  }

  private mondayDate(): Date {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private firstOfMonthDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private sameLocalDay(iso: string, d: Date): boolean {
    const a = new Date(iso);
    return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
  }

  private loadReports() {
    const pid = this.projectId;
    if (!pid) return;
    this.projectService.getReports(pid).subscribe({
      next: (reports) => {
        this.history.set(reports.filter(r => r.status === 'SENT').map(r => ({
          id: r.id,
          type: (r.type === 'WEEKLY' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
          period: r.period,
          status: 'sent' as ReportStatus,
          sentAt: r.sentAt ? new Date(r.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
          sentBy: r.sentByName ?? '—',
        })));

        const wk = reports.find(r => r.type === 'WEEKLY' && this.sameLocalDay(r.periodStart, this.mondayDate()));
        if (wk) {
          this.weeklyReportId = wk.id;
          this.weeklyStatus.set(wk.status.toLowerCase() as ReportStatus);
          this.weeklyForm.patchValue({
            summary:  wk.summary   ?? this.autoWeeklySummary(),
            blockers: wk.blockers  ?? '',
            nextPlan: wk.nextSteps ?? '',
          });
        }
        const mo = reports.find(r => r.type === 'MONTHLY' && this.sameLocalDay(r.periodStart, this.firstOfMonthDate()));
        if (mo) {
          this.monthlyReportId = mo.id;
          this.monthlyStatus.set(mo.status.toLowerCase() as ReportStatus);
          this.monthlyForm.patchValue({
            summary:    mo.summary    ?? this.autoMonthlySummary(),
            highlights: mo.highlights ?? '',
            nextGoals:  mo.nextSteps  ?? '',
          });
        }
      },
      error: () => { /* reports are supplementary; page still works without them */ },
    });
  }

  private saveReport(type: 'weekly' | 'monthly', status: 'DRAFT' | 'READY') {
    if (type === 'weekly') {
      const v = this.weeklyForm.getRawValue();
      return this.projectService.upsertReport(this.projectId, {
        type: 'WEEKLY', period: this.weekLabel, periodStart: this.mondayDate().toISOString(),
        status, summary: v.summary, blockers: v.blockers, nextSteps: v.nextPlan,
      });
    }
    const v = this.monthlyForm.getRawValue();
    return this.projectService.upsertReport(this.projectId, {
      type: 'MONTHLY', period: this.monthLabel, periodStart: this.firstOfMonthDate().toISOString(),
      status, summary: v.summary, highlights: v.highlights, nextSteps: v.nextGoals,
    });
  }

  private parseRecipients(raw: string): string[] {
    return raw.split(/[,;\s]+/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  }

  protected autoFillWeekly() {
    this.weeklyForm.patchValue({ summary: this.autoWeeklySummary() });
  }

  protected autoFillMonthly() {
    this.monthlyForm.patchValue({ summary: this.autoMonthlySummary() });
  }

  protected markWeeklyReady() {
    this.saveReport('weekly', 'READY').subscribe(r => {
      this.weeklyReportId = r.id;
      this.weeklyStatus.set('ready');
    });
  }

  protected markMonthlyReady() {
    this.saveReport('monthly', 'READY').subscribe(r => {
      this.monthlyReportId = r.id;
      this.monthlyStatus.set('ready');
    });
  }

  protected sendWeekly() {
    const to = this.parseRecipients(this.weeklyRecipients());
    if (to.length === 0) {
      this.sendError.set('Enter at least one valid email address.');
      return;
    }
    this.sendError.set(null);
    this.sendingWeekly.set(true);
    this.saveReport('weekly', 'READY').subscribe({
      next: (r) => {
        this.weeklyReportId = r.id;
        this.projectService.sendReport(this.projectId, r.id, to).subscribe({
          next: (res) => {
            this.sendingWeekly.set(false);
            this.weeklyStatus.set('sent');
            this.weeklyPreviewUrl.set(res.previewUrl ?? null);
            this.loadReports();
          },
          error: () => {
            this.sendingWeekly.set(false);
            this.sendError.set('Sending failed. Please try again.');
          },
        });
      },
      error: () => {
        this.sendingWeekly.set(false);
        this.sendError.set('Could not save the report before sending.');
      },
    });
  }

  protected sendMonthly() {
    const to = this.parseRecipients(this.monthlyRecipients());
    if (to.length === 0) {
      this.sendError.set('Enter at least one valid email address.');
      return;
    }
    this.sendError.set(null);
    this.sendingMonthly.set(true);
    this.saveReport('monthly', 'READY').subscribe({
      next: (r) => {
        this.monthlyReportId = r.id;
        this.projectService.sendReport(this.projectId, r.id, to).subscribe({
          next: (res) => {
            this.sendingMonthly.set(false);
            this.monthlyStatus.set('sent');
            this.monthlyPreviewUrl.set(res.previewUrl ?? null);
            this.loadReports();
          },
          error: () => {
            this.sendingMonthly.set(false);
            this.sendError.set('Sending failed. Please try again.');
          },
        });
      },
      error: () => {
        this.sendingMonthly.set(false);
        this.sendError.set('Could not save the report before sending.');
      },
    });
  }

  protected async copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copying.set(true);
      setTimeout(() => this.copying.set(false), 2000);
    } catch { /* clipboard API unavailable */ }
  }

  protected exportWeeklyCSV() {
    const p = this.state.project();
    if (!p) return;
    const v = this.weeklyForm.value;
    this.downloadCSV([
      ['Report Type',        'Weekly'],
      ['Period',             this.weekLabel],
      ['Project',            p.name],
      ['Client',             p.clientName],
      ['Current Stage',      `${this.activeStageNum()} — ${this.activeStageName()}`],
      ['Completed Stages',   `${this.completedStages()} / 5`],
      ['Tasks Done',         `${this.doneTasks()} / ${this.totalTasks()}`],
      ['Days Active',        String(this.daysActive())],
      ['Executive Summary',  v.summary ?? ''],
      ['Blockers & Risks',   v.blockers ?? ''],
      ['Plan for Next Week', v.nextPlan ?? ''],
    ], `${p.name}-weekly.csv`);
  }

  protected exportMonthlyCSV() {
    const p = this.state.project();
    if (!p) return;
    const v = this.monthlyForm.value;
    this.downloadCSV([
      ['Report Type',      'Monthly'],
      ['Period',           this.monthLabel],
      ['Project',          p.name],
      ['Client',           p.clientName],
      ['Current Stage',    `${this.activeStageNum()} — ${this.activeStageName()}`],
      ['Completed Stages', `${this.completedStages()} / 5`],
      ['Tasks Done',       `${this.doneTasks()} / ${this.totalTasks()}`],
      ['Milestones Done',  `${this.milestonesDone()} / ${this.milestonesTotal()}`],
      ['Days Active',      String(this.daysActive())],
      ['Monthly Summary',  v.summary ?? ''],
      ['Key Highlights',   v.highlights ?? ''],
      ['Next Month Goals', v.nextGoals ?? ''],
    ], `${p.name}-monthly.csv`);
  }

  private downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r =>
      r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  protected exportWeeklyPDF() {
    const p = this.state.project();
    if (!p) return;
    const v = this.weeklyForm.value;
    this.openPrintWindow(
      `Weekly Report — ${p.name}`,
      this.weekLabel,
      p.name,
      p.clientName,
      { stage: `Stage ${this.activeStageNum()} — ${this.activeStageName()}`,
        pipeline: `${this.completedStages()} / 5 stages completed`,
        tasks:    `${this.doneTasks()} / ${this.totalTasks()} tasks done`,
        days:     `${this.daysActive()} days active` },
      [
        { title: 'Executive Summary',  body: v.summary  ?? '' },
        { title: 'Blockers & Risks',   body: v.blockers ?? '' },
        { title: 'Plan for Next Week', body: v.nextPlan ?? '' },
      ]
    );
  }

  protected exportMonthlyPDF() {
    const p = this.state.project();
    if (!p) return;
    const v = this.monthlyForm.value;
    this.openPrintWindow(
      `Monthly Report — ${p.name}`,
      this.monthLabel,
      p.name,
      p.clientName,
      { stage: `Stage ${this.activeStageNum()} — ${this.activeStageName()}`,
        pipeline: `${this.completedStages()} / 5 stages completed`,
        tasks:    `${this.doneTasks()} / ${this.totalTasks()} tasks done`,
        days:     `${this.daysActive()} days active` },
      [
        { title: 'Monthly Summary',  body: v.summary    ?? '' },
        { title: 'Key Highlights',   body: v.highlights ?? '' },
        { title: 'Next Month Goals', body: v.nextGoals  ?? '' },
      ]
    );
  }

  protected downloadHistoryReport(report: PastReport) {
    const p = this.state.project();
    const projectName = p?.name ?? 'Project';
    this.downloadCSV([
      ['Report Type', report.type === 'weekly' ? 'Weekly' : 'Monthly'],
      ['Period',      report.period],
      ['Sent',        report.sentAt],
      ['Sent By',     report.sentBy],
      ['Project',     projectName],
    ], `${projectName}-${report.type}-${report.period.replace(/[^a-z0-9]/gi, '-')}.csv`);
  }

  private openPrintWindow(
    title: string,
    period: string,
    project: string,
    client: string,
    kpis: Record<string, string>,
    sections: { title: string; body: string }[]
  ) {
    const kpiHtml = Object.entries(kpis).map(([k, v]) =>
      `<div class="kpi"><div class="kv">${v}</div><div class="kl">${k}</div></div>`
    ).join('');
    const sectionHtml = sections
      .filter(s => s.body.trim())
      .map(s => `<div class="section"><div class="st">${s.title}</div><div class="sb">${s.body}</div></div>`)
      .join('');
    const now = new Date();
    const generated = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title><style>
      *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:820px;margin:40px auto;padding:0 28px;color:#111}
      h1{font-size:22px;margin:0 0 4px;font-weight:700}
      .meta{font-size:13px;color:#666;margin-bottom:28px;border-bottom:2px solid #e5e7eb;padding-bottom:16px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
      .kv{font-size:15px;font-weight:700;margin-bottom:2px;color:#111}
      .kl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.04em}
      .section{margin-bottom:20px}
      .st{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px}
      .sb{font-size:13.5px;line-height:1.7;color:#222;white-space:pre-wrap}
      .footer{margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#aaa}
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">${period} &nbsp;·&nbsp; ${project} for ${client} &nbsp;·&nbsp; Anka Sphere</div>
    <div class="kpis">${kpiHtml}</div>
    ${sectionHtml}
    <div class="footer">Generated by Anka Sphere &nbsp;·&nbsp; ${generated}</div>
    </body></html>`;
    const win = window.open('', '_blank', 'width=920,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  protected statusLabel(s: ReportStatus): string {
    if (s === 'draft') return 'Draft';
    if (s === 'ready') return 'Ready to Send';
    return 'Sent';
  }

  protected gateLabel(gate: string): string {
    if (gate === 'hard') return 'Hard Gate';
    if (gate === 'soft') return 'Soft Gate';
    return 'No Gate';
  }

  protected stageStatusLabel(s: string): string {
    if (s === 'completed') return 'Completed';
    if (s === 'active')    return 'In Progress';
    return 'Locked';
  }

  private computeWeekLabel(): string {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(monday)} – ${fmt(sunday)} ${now.getFullYear()}`;
  }

  private computeMonthLabel(): string {
    return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  private computeNextMonday(): string {
    const now = new Date();
    const day = now.getDay();
    const next = new Date(now);
    next.setDate(now.getDate() + (day === 0 ? 1 : 8 - day));
    return next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
