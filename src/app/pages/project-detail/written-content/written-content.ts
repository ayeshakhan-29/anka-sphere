import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Badge } from '../../../ui';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

type TabId = 'brief' | 'pages' | 'review';
type PageStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REVISION';

interface ContentPage {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: PageStatus;
  wordCount: number;
  seoTitle: string;
  seoDescription: string;
}

const STATUS_ORDER: PageStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REVISION'];

@Component({
  selector: 'app-written-content',
  imports: [ReactiveFormsModule, Badge],
  template: `
    <div class="wc-wrap">

      <!-- Section header -->
      <div class="section-header">
        <div class="section-title-row">
          <div>
            <h3 class="section-title">Written Content</h3>
            <p class="section-sub">Stage 2 of 5 — Product Modelling &nbsp;·&nbsp; <span class="gate-pill hard">Hard Gate</span></p>
          </div>
          <ui-badge [variant]="stageComplete() ? 'success' : 'warning'">
            {{ stageComplete() ? 'Complete' : 'In Progress' }}
          </ui-badge>
        </div>

        <div class="tab-nav" role="tablist" aria-label="Written content sections">
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
          <section aria-label="Content Brief" [formGroup]="briefForm">
            <div class="form-grid">
              <div class="field span-full">
                <label class="field-label" for="content-brief">Content Brief <span class="req" aria-hidden="true">*</span></label>
                <textarea id="content-brief" class="field-textarea" formControlName="contentBrief" rows="5"
                  placeholder="Describe the content goals, audience, key messages, and overall approach for this project."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="tov">Tone of Voice <span class="req" aria-hidden="true">*</span></label>
                <textarea id="tov" class="field-textarea" formControlName="toneOfVoice" rows="3"
                  placeholder="e.g. Professional and concise. Avoid jargon. Use second person. Active voice throughout."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="seo-guidelines">SEO Guidelines</label>
                <textarea id="seo-guidelines" class="field-textarea" formControlName="seoGuidelines" rows="3"
                  placeholder="Keyword density guidance, heading structure rules, internal linking strategy, meta description format."></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveBrief()">Save Brief</button>
            </div>
          </section>
        }

        <!-- Pages tab -->
        @if (activeTab() === 'pages') {
          <section aria-label="Content Pages">
            <div class="pages-header">
              <div class="pages-summary">
                <span class="summary-stat">
                  <strong>{{ pages().length }}</strong> pages
                </span>
                <span class="summary-divider" aria-hidden="true">·</span>
                <span class="summary-stat">
                  <strong>{{ totalWordCount() }}</strong> words
                </span>
                <span class="summary-divider" aria-hidden="true">·</span>
                <span class="summary-stat">
                  <strong>{{ approvedCount() }}</strong> approved
                </span>
              </div>
              <button class="btn-add" type="button" (click)="addPage()" [disabled]="creatingPage()" aria-label="Add page"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>@if (creatingPage()) { Adding... } @else { Add Page }</button>
            </div>

            @if (pageError()) {<p class="page-error" role="alert">{{ pageError() }}</p>}@if (selectedPage()) {<!-- Page editor -->
              <div class="page-editor">
                <div class="editor-header">
                  <button class="back-btn" type="button" (click)="selectedPage.set(null)" aria-label="Back to pages list">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
                    All Pages
                  </button>
                  <div class="editor-status-row">
                    <div class="status-steps" role="group" aria-label="Page status">
                      @for (s of statusSteps; track s.value) {
                        <button
                          class="status-step"
                          [class.active]="selectedPage()!.status === s.value"
                          [class.done]="statusIndex(selectedPage()!.status) > statusIndex(s.value)"
                          type="button"
                          (click)="setPageStatus(selectedPage()!.id, s.value)"
                          [attr.aria-pressed]="selectedPage()!.status === s.value"
                        >{{ s.label }}</button>
                      }
                    </div>
                  </div>
                </div>

                <div class="editor-body">
                  <div class="editor-main">
                    <input
                      class="title-input"
                      type="text"
                      [value]="selectedPage()!.title"
                      (input)="updatePage(selectedPage()!.id, 'title', $any($event.target).value)"
                      placeholder="Page title"
                      aria-label="Page title"
                    />
                    <div class="word-count" aria-live="polite">
                      {{ selectedPage()!.wordCount }} words
                    </div>
                    <textarea
                      class="body-editor"
                      [value]="selectedPage()!.body"
                      (input)="onBodyInput(selectedPage()!.id, $any($event.target).value)"
                      placeholder="Write your content here…"
                      aria-label="Page content"
                      rows="20"
                    ></textarea>
                  </div>

                  <div class="editor-meta">
                    <p class="meta-section-label">Page Details</p>
                    <div class="meta-field">
                      <label class="meta-label" [for]="'slug-' + selectedPage()!.id">URL Slug</label>
                      <input
                        [id]="'slug-' + selectedPage()!.id"
                        class="meta-input"
                        type="text"
                        [value]="selectedPage()!.slug"
                        (input)="updatePage(selectedPage()!.id, 'slug', $any($event.target).value)"
                        placeholder="e.g. about-us"
                      />
                    </div>
                    <div class="meta-field">
                      <label class="meta-label" [for]="'seo-title-' + selectedPage()!.id">SEO Title</label>
                      <input
                        [id]="'seo-title-' + selectedPage()!.id"
                        class="meta-input"
                        type="text"
                        [value]="selectedPage()!.seoTitle"
                        (input)="updatePage(selectedPage()!.id, 'seoTitle', $any($event.target).value)"
                        placeholder="Search engine title (50–60 chars)"
                      />
                      <span class="char-count" [class.over]="selectedPage()!.seoTitle.length > 60">
                        {{ selectedPage()!.seoTitle.length }}/60
                      </span>
                    </div>
                    <div class="meta-field">
                      <label class="meta-label" [for]="'meta-desc-' + selectedPage()!.id">Meta Description</label>
                      <textarea
                        [id]="'meta-desc-' + selectedPage()!.id"
                        class="meta-textarea"
                        [value]="selectedPage()!.seoDescription"
                        (input)="updatePage(selectedPage()!.id, 'seoDescription', $any($event.target).value)"
                        rows="3"
                        placeholder="Meta description (120–155 chars)"
                      ></textarea>
                      <span class="char-count" [class.over]="selectedPage()!.seoDescription.length > 155">
                        {{ selectedPage()!.seoDescription.length }}/155
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Page list -->
              <div class="page-list" role="list">
                @for (page of pages(); track page.id) {
                  <div class="page-row" role="listitem">
                    <button class="page-row-inner" type="button" (click)="selectedPage.set(page)" [attr.aria-label]="'Edit ' + page.title">
                      <div class="page-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div class="page-info">
                        <span class="page-title">{{ page.title || 'Untitled Page' }}</span>
                        <span class="page-meta">{{ page.wordCount }} words · {{ page.slug || 'no slug' }}</span>
                      </div>
                      <ui-badge [variant]="statusVariant(page.status)">{{ statusLabel(page.status) }}</ui-badge>
                      <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <button class="page-delete-btn" type="button" (click)="deletePage(page.id)" aria-label="Delete page">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                } @empty {
                  <div class="empty-hint">No pages yet. Click "Add Page" to create the first one.</div>
                }
              </div>
            }
          </section>
        }

        <!-- Review tab -->
        @if (activeTab() === 'review') {
          <section aria-label="Review and Gate">
            <div class="review-wrap">
              <div class="review-checklist">
                <p class="review-title">Hard Gate Checklist</p>
                <p class="review-sub">All items below must be complete before the stage can be approved and Design unlocked.</p>

                <ul class="checklist" role="list">
                  <li class="check-item" [class.ok]="briefForm.valid">
                    <span class="check-icon" [class.ok]="briefForm.valid" aria-hidden="true">
                      @if (briefForm.valid) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    Content brief and tone of voice completed
                  </li>
                  <li class="check-item" [class.ok]="pages().length > 0">
                    <span class="check-icon" [class.ok]="pages().length > 0" aria-hidden="true">
                      @if (pages().length > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    At least one content page created ({{ pages().length }} created)
                  </li>
                  <li class="check-item" [class.ok]="approvedCount() > 0">
                    <span class="check-icon" [class.ok]="approvedCount() > 0" aria-hidden="true">
                      @if (approvedCount() > 0) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    At least one page approved ({{ approvedCount() }} of {{ pages().length }} approved)
                  </li>
                </ul>
              </div>

              <div class="review-action">
                <div class="review-status-card" [class.ready]="gateReady()">
                  @if (gateReady()) {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <div>
                      <p class="gate-title">Ready to approve</p>
                      <p class="gate-desc">All requirements met. Click below to pass the Hard Gate and unlock Design.</p>
                    </div>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p class="gate-title">Not yet ready</p>
                      <p class="gate-desc">Complete all checklist items above before approving.</p>
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
                      Approve & Unlock Design Stage
                    }
                  </button>

                  @if (gateError()) {
                    <p class="gate-error" role="alert">{{ gateError() }}</p>
                  }
                  @if (gateSuccess()) {
                    <p class="gate-success" role="status">Design stage unlocked successfully.</p>
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
    .wc-wrap { display: flex; flex-direction: column; gap: 0; }

    .section-header { margin-bottom: 0; }
    .section-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 4px;
    }
    .section-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .gate-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
    }
    .gate-pill.hard { background: #FEE2E2; color: #DC2626; }

    .tab-nav {
      display: flex;
      gap: 2px;
      border-bottom: 1px solid var(--color-border);
      margin: 0 -24px;
      padding: 0 24px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
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
    .tab-btn.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .tab-badge {
      background: var(--color-accent-light);
      color: var(--color-accent);
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 10px;
    }

    .tab-panels { padding-top: 24px; }

    /* Form */
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; }
    .field-label { font-size: 12.5px; font-weight: 500; color: var(--color-text); margin-bottom: 6px; }
    .req { color: var(--color-destructive); }
    .field-textarea {
      padding: 8px 10px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      resize: vertical;
      outline: none;
      line-height: 1.6;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-textarea:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
    }
    .btn-save {
      height: 36px;
      padding: 0 20px;
      background: var(--color-accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-save:hover { background: var(--color-accent-hover); }

    /* Pages header */
    .pages-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .pages-summary { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); }
    .pages-summary strong { color: var(--color-text); font-weight: 600; }
    .summary-divider { color: var(--color-border-strong); }
    .btn-add {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-add:hover:not(:disabled) { background: var(--color-border); }
    .btn-add:disabled { opacity: 0.65; cursor: not-allowed; }
    .page-error { font-size: 12.5px; color: var(--color-destructive); margin: -6px 0 12px; }

    /* Page list */
    .page-list { display: flex; flex-direction: column; gap: 6px; }
    .page-row {
      display: flex;
      align-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      overflow: hidden;
      transition: box-shadow 0.15s;
    }
    .page-row:hover { box-shadow: var(--shadow-card); }
    .page-row-inner {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
    }
    .page-icon {
      width: 30px;
      height: 30px;
      min-width: 30px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
    }
    .page-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .page-title { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .page-meta { font-size: 11.5px; color: var(--color-text-muted); }
    .chevron { color: var(--color-text-muted); flex-shrink: 0; }
    .page-delete-btn {
      width: 36px;
      height: 36px;
      margin-right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .page-delete-btn:hover { background: var(--color-destructive-light); color: var(--color-destructive); }

    /* Page editor */
    .page-editor { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--color-surface-raised);
      border-bottom: 1px solid var(--color-border);
      gap: 16px;
    }
    .back-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: none;
      border: none;
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 0;
      white-space: nowrap;
    }
    .back-btn:hover { color: var(--color-text); }
    .editor-status-row { display: flex; align-items: center; }
    .status-steps { display: flex; gap: 4px; }
    .status-step {
      height: 26px;
      padding: 0 10px;
      border: 1px solid var(--color-border-strong);
      border-radius: 20px;
      font-family: var(--font-sans);
      font-size: 11.5px;
      font-weight: 500;
      color: var(--color-text-muted);
      background: var(--color-surface);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .status-step.done { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent-light); }
    .status-step.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }

    .editor-body { display: grid; grid-template-columns: 1fr 260px; }
    .editor-main { display: flex; flex-direction: column; padding: 20px; border-right: 1px solid var(--color-border); }
    .title-input {
      font-family: var(--font-display);
      font-size: 20px;
      color: var(--color-text);
      border: none;
      outline: none;
      background: transparent;
      margin-bottom: 6px;
      width: 100%;
    }
    .title-input::placeholder { color: var(--color-text-muted); }
    .word-count { font-size: 11.5px; color: var(--color-text-muted); margin-bottom: 12px; }
    .body-editor {
      flex: 1;
      font-family: var(--font-sans);
      font-size: 13.5px;
      line-height: 1.7;
      color: var(--color-text);
      border: none;
      outline: none;
      resize: none;
      background: transparent;
    }
    .editor-meta { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .meta-section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); margin: 0 0 4px; }
    .meta-field { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }
    .meta-input {
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12.5px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
    }
    .meta-input:focus { border-color: var(--color-accent); }
    .meta-textarea {
      padding: 6px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12.5px;
      color: var(--color-text);
      background: var(--color-surface);
      resize: none;
      outline: none;
      line-height: 1.5;
    }
    .meta-textarea:focus { border-color: var(--color-accent); }
    .char-count { font-size: 11px; color: var(--color-text-muted); text-align: right; }
    .char-count.over { color: var(--color-destructive); }

    /* Review tab */
    .review-wrap { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
    .review-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0 0 4px; }
    .review-sub { font-size: 12.5px; color: var(--color-text-secondary); margin: 0 0 20px; }
    .checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13.5px;
      color: var(--color-text-muted);
    }
    .check-item.ok { color: var(--color-text-secondary); }
    .check-icon {
      width: 22px;
      height: 22px;
      min-width: 22px;
      border-radius: 50%;
      border: 1.5px solid var(--color-border-strong);
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      margin-top: 1px;
    }
    .check-icon.ok { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

    .review-action { display: flex; flex-direction: column; gap: 12px; }
    .review-status-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
    }
    .review-status-card.ready {
      background: var(--color-accent-light);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
    .gate-title { font-size: 13.5px; font-weight: 600; margin: 0 0 3px; color: inherit; }
    .gate-desc { font-size: 12.5px; margin: 0; color: inherit; opacity: 0.85; }
    .btn-approve {
      height: 40px;
      padding: 0 20px;
      background: var(--color-accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s;
    }
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
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-hint { font-size: 13px; color: var(--color-text-muted); padding: 16px 0; }
  `]
})
export class WrittenContent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private state = inject(ProjectStateService);
  private auth  = inject(AuthService);
  private notifService = inject(NotificationService);
  protected canApprove = computed(() => this.auth.canApproveStage('WRITTEN_CONTENT'));

  private get projectId(): string {
    return this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  protected activeTab = signal<TabId>('brief');

  protected tabs = [
    { id: 'brief' as TabId,  label: 'Content Brief', badge: () => null },
    { id: 'pages' as TabId,  label: 'Pages',         badge: () => this.pages().length > 0 ? this.pages().length : null },
    { id: 'review' as TabId, label: 'Review & Gate', badge: () => null },
  ];

  protected briefForm = this.fb.group({
    contentBrief:  ['', Validators.required],
    toneOfVoice:   ['', Validators.required],
    seoGuidelines: [''],
  });

  protected pages = signal<ContentPage[]>([]);
  protected creatingPage = signal(false);
  protected pageError = signal<string | null>(null);

  protected selectedPage = signal<ContentPage | null>(null);

  protected statusSteps: { value: PageStatus; label: string }[] = [
    { value: 'DRAFT',      label: 'Draft' },
    { value: 'IN_REVIEW',  label: 'In Review' },
    { value: 'APPROVED',   label: 'Approved' },
    { value: 'REVISION',   label: 'Revision' },
  ];

  protected totalWordCount = computed(() => this.pages().reduce((sum, p) => sum + p.wordCount, 0));
  protected approvedCount = computed(() => this.pages().filter(p => p.status === 'APPROVED').length);
  protected stageComplete = computed(() => this.briefForm.valid && this.approvedCount() > 0);
  protected gateReady = computed(() => this.briefForm.valid && this.pages().length > 0 && this.approvedCount() > 0);
  protected gateSubmitting = signal(false);
  protected gateError = signal<string | null>(null);
  protected gateSuccess = signal(false);

  protected statusIndex(status: PageStatus) {
    return STATUS_ORDER.indexOf(status);
  }

  protected statusVariant(status: PageStatus): 'default' | 'warning' | 'success' | 'destructive' {
    if (status === 'DRAFT')     return 'default';
    if (status === 'IN_REVIEW') return 'warning';
    if (status === 'APPROVED')  return 'success';
    return 'destructive';
  }

  protected statusLabel(status: PageStatus): string {
    if (status === 'IN_REVIEW') return 'In Review';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  ngOnInit() {
    const content = this.state.project()?.content;
    if (content) {
      this.briefForm.patchValue({
        contentBrief: content.contentBrief ?? '',
        toneOfVoice:  content.toneOfVoice ?? '',
      });
      this.pages.set((content.pages ?? []).map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug ?? '',
        body: p.body ?? '',
        status: p.status as PageStatus,
        wordCount: p.wordCount ?? 0,
        seoTitle: p.metaTitle ?? '',
        seoDescription: p.metaDescription ?? '',
      })));
    }
  }

  protected addPage() {
    this.creatingPage.set(true);
    this.pageError.set(null);
    this.projectService.createPage(this.projectId, { title: 'Untitled Page', status: 'DRAFT', sortOrder: this.pages().length + 1 })
      .subscribe({
        next: p => {
          const page: ContentPage = { id: p.id, title: p.title, slug: p.slug ?? '', body: p.body ?? '', status: p.status as PageStatus, wordCount: p.wordCount ?? 0, seoTitle: p.metaTitle ?? '', seoDescription: p.metaDescription ?? '' };
          this.pages.update(list => [...list, page]);
          this.selectedPage.set(page);
          this.creatingPage.set(false);
        },
        error: err => {
          this.pageError.set(err?.error?.error ?? 'Failed to create page.');
          this.creatingPage.set(false);
        },
      });
  }

  protected deletePage(id: string) {
    this.projectService.deletePage(this.projectId, id).subscribe(() => {
      if (this.selectedPage()?.id === id) this.selectedPage.set(null);
      this.pages.update(list => list.filter(p => p.id !== id));
    });
  }

  protected updatePage(id: string, field: keyof ContentPage, value: string) {
    const wordCount = field === 'body' ? (value.trim() ? value.trim().split(/\s+/).length : 0) : undefined;
    this.pages.update(list => list.map(p => {
      if (p.id !== id) return p;
      return { ...p, [field]: value, ...(wordCount !== undefined ? { wordCount } : {}) };
    }));
    if (this.selectedPage()?.id === id) {
      this.selectedPage.update(p => p ? { ...p, [field]: value, ...(wordCount !== undefined ? { wordCount } : {}) } : null);
    }
    const apiField = field === 'seoTitle' ? 'metaTitle' : field === 'seoDescription' ? 'metaDescription' : field;
    this.projectService.updatePage(this.projectId, id, { [apiField]: value, ...(wordCount !== undefined ? { wordCount } : {}) }).subscribe();
  }

  protected onBodyInput(id: string, value: string) {
    this.updatePage(id, 'body', value);
  }

  protected setPageStatus(id: string, status: PageStatus) {
    this.projectService.updatePageStatus(this.projectId, id, status).subscribe(() => {
      this.pages.update(list => list.map(p => p.id === id ? { ...p, status } : p));
      this.selectedPage.update(p => p?.id === id ? { ...p, status } : p);
    });
  }

  protected saveBrief() {
    this.briefForm.markAllAsTouched();
    if (this.briefForm.invalid) return;
    const v = this.briefForm.value;
    this.projectService.upsertContent(this.projectId, { contentBrief: v.contentBrief ?? undefined, toneOfVoice: v.toneOfVoice ?? undefined }).subscribe();
  }

  protected approveGate() {
    if (!this.gateReady()) return;
    this.gateSubmitting.set(true);
    this.gateError.set(null);
    this.projectService.completeContent(this.projectId).subscribe({
      next: () => {
        this.gateSubmitting.set(false);
        this.gateSuccess.set(true);
        this.projectService.getProject(this.projectId).subscribe(p => this.state.setProject(p));
        const name = this.state.project()?.name ?? 'Project';
        this.notifService.add({
          type: 'stage_unlocked',
          title: 'Written Content gate approved',
          body: `${name} — Design is now unlocked`,
          projectId: this.projectId,
          projectName: name,
          route: `/app/projects/${this.projectId}/design`,
        });
      },
      error: (err) => {
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
        this.gateSubmitting.set(false);
      },
    });
  }
}




