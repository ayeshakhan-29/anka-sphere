import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Badge } from '../../../ui';
import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { NotificationService } from '../../../services/notification.service';

type TabId = 'brief' | 'brand' | 'personas' | 'competitors' | 'seo' | 'timeline';

interface Persona {
  id: string;
  name: string;
  age: string;
  role: string;
  pain: string;
  goal: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  strength: string;
  weakness: string;
}

interface Milestone {
  id: string;
  label: string;
  date: string;
  done: boolean;
}

@Component({
  selector: 'app-profiling',
  imports: [ReactiveFormsModule, Badge],
  template: `
    <div class="profiling-wrap">

      <!-- Section header -->
      <div class="section-header">
        <div class="section-title-row">
          <div>
            <h3 class="section-title">Project Profiling</h3>
            <p class="section-sub">Stage 1 of 5 — Product Modelling &nbsp;·&nbsp; <span class="gate-pill">Hard Gate</span></p>
          </div>
          <ui-badge [variant]="profilingComplete() ? 'success' : 'warning'">
            {{ profilingComplete() ? 'Complete' : 'In Progress' }}
          </ui-badge>
        </div>

        <!-- Tab nav -->
        <div class="tab-nav" role="tablist" aria-label="Profiling sections">
          @for (tab of tabs; track tab.id) {
            <button
              role="tab"
              class="tab-btn"
              [class.active]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
              @if (tab.required && !tabFilled(tab.id)) {
                <span class="tab-dot" aria-label="Incomplete"></span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Tab panels -->
      <div class="tab-panels">

        <!-- Brief -->
        @if (activeTab() === 'brief') {
          <section aria-label="Client Brief" [formGroup]="briefForm">
            <div class="form-grid">
              <div class="field span-2">
                <label class="field-label" for="company-name">Company / Brand Name <span class="req" aria-hidden="true">*</span></label>
                <input id="company-name" class="field-input" type="text" formControlName="companyName" placeholder="e.g. Lumina Studios" />
              </div>
              <div class="field span-2">
                <label class="field-label" for="industry">Industry / Niche</label>
                <input id="industry" class="field-input" type="text" formControlName="industry" placeholder="e.g. Creative Agency, E-Commerce" />
              </div>
              <div class="field span-full">
                <label class="field-label" for="about">About the Business</label>
                <textarea id="about" class="field-textarea" formControlName="about" rows="4" placeholder="Briefly describe what the client does, who they serve, and their business model."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="objectives">Project Objectives</label>
                <textarea id="objectives" class="field-textarea" formControlName="objectives" rows="4" placeholder="What does the client want to achieve? e.g. launch a new website, grow organic traffic, refresh branding."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="scope">Scope of Work</label>
                <textarea id="scope" class="field-textarea" formControlName="scope" rows="3" placeholder="List deliverables: pages, features, integrations, etc."></textarea>
              </div>
              <div class="field">
                <label class="field-label" for="budget">Estimated Budget</label>
                <input id="budget" class="field-input" type="text" formControlName="budget" placeholder="e.g. £5,000–£10,000" />
              </div>
              <div class="field">
                <label class="field-label" for="priority">Priority Level</label>
                <select id="priority" class="field-select" formControlName="priority">
                  <option value="">Select…</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveBrief()" [disabled]="saving()">@if (saving()) { Saving... } @else if (saveSuccess()) { Saved } @else { Save Brief }</button>
            </div>
          </section>
        }

        <!-- Brand -->
        @if (activeTab() === 'brand') {
          <section aria-label="Brand Inputs" [formGroup]="brandForm">
            <div class="form-grid">
              <div class="field span-full">
                <label class="field-label" for="brand-voice">Brand Voice & Tone</label>
                <textarea id="brand-voice" class="field-textarea" formControlName="brandVoice" rows="3" placeholder="e.g. Professional but approachable, authoritative, friendly, minimal jargon."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="tagline">Tagline / Slogan</label>
                <input id="tagline" class="field-input" type="text" formControlName="tagline" placeholder="e.g. Elevate Your Brand." />
              </div>
              <div class="field span-full">
                <label class="field-label" for="brand-colours">Brand Colours</label>
                <input id="brand-colours" class="field-input" type="text" formControlName="brandColours" placeholder="Hex codes or descriptions: #1E293B, #16A34A, White" />
              </div>
              <div class="field span-full">
                <label class="field-label" for="typography">Typography Preferences</label>
                <input id="typography" class="field-input" type="text" formControlName="typography" placeholder="e.g. Sans-serif for body, serif for headings. Font name if known." />
              </div>
              <div class="field span-full">
                <label class="field-label" for="brand-refs">Visual References / Inspiration</label>
                <textarea id="brand-refs" class="field-textarea" formControlName="brandRefs" rows="3" placeholder="URLs or descriptions of brands / websites the client likes."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="brand-dislikes">What to Avoid</label>
                <textarea id="brand-dislikes" class="field-textarea" formControlName="brandDislikes" rows="2" placeholder="Styles, colours, or approaches the client explicitly dislikes."></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveBrand()" [disabled]="saving()">@if (saving()) { Saving... } @else if (saveSuccess()) { Saved } @else { Save Brand Inputs }</button>
            </div>
          </section>
        }

        <!-- Personas -->
        @if (activeTab() === 'personas') {
          <section aria-label="Target Personas">
            <div class="list-header">
              <p class="list-hint">Define 2–4 target customer personas for this project.</p>
              <button class="btn-add" type="button" (click)="addPersona()" aria-label="Add persona">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Persona
              </button>
            </div>

            @for (persona of personas(); track persona.id) {
              <div class="persona-card">
                <div class="persona-header">
                  <div class="persona-avatar">{{ persona.name.slice(0, 2).toUpperCase() }}</div>
                  <div class="persona-title">
                    <input class="inline-input" [(value)]="persona.name" (input)="updatePersona(persona.id, 'name', $any($event.target).value)" placeholder="Persona name (e.g. Marketing Manager)" />
                    <input class="inline-input small" [(value)]="persona.age" (input)="updatePersona(persona.id, 'age', $any($event.target).value)" placeholder="Age range (e.g. 30–45)" />
                    <input class="inline-input small" [(value)]="persona.role" (input)="updatePersona(persona.id, 'role', $any($event.target).value)" placeholder="Job role / lifestyle" />
                  </div>
                  <button class="btn-remove" type="button" (click)="removePersona(persona.id)" aria-label="Remove persona">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="persona-body">
                  <div class="field">
                    <label class="field-label-sm">Pain Points</label>
                    <textarea class="field-textarea sm" rows="2" [value]="persona.pain" (input)="updatePersona(persona.id, 'pain', $any($event.target).value)" placeholder="What frustrates or challenges this person?"></textarea>
                  </div>
                  <div class="field">
                    <label class="field-label-sm">Goals & Motivations</label>
                    <textarea class="field-textarea sm" rows="2" [value]="persona.goal" (input)="updatePersona(persona.id, 'goal', $any($event.target).value)" placeholder="What are they trying to achieve?"></textarea>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-hint">No personas yet. Click "Add Persona" to get started.</div>
            }
          </section>
        }

        <!-- Competitors -->
        @if (activeTab() === 'competitors') {
          <section aria-label="Competitor Analysis">
            <div class="list-header">
              <p class="list-hint">Add 3–6 key competitors for benchmarking and differentiation.</p>
              <button class="btn-add" type="button" (click)="addCompetitor()" aria-label="Add competitor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Competitor
              </button>
            </div>

            <div class="competitor-table" role="table" aria-label="Competitors">
              <div class="comp-row comp-head" role="row">
                <span role="columnheader">Competitor</span>
                <span role="columnheader">Website</span>
                <span role="columnheader">Strength</span>
                <span role="columnheader">Weakness</span>
                <span role="columnheader"></span>
              </div>
              @for (comp of competitors(); track comp.id) {
                <div class="comp-row" role="row">
                  <input class="comp-input" [value]="comp.name" (input)="updateComp(comp.id, 'name', $any($event.target).value)" placeholder="Brand name" aria-label="Competitor name" />
                  <input class="comp-input" [value]="comp.url" (input)="updateComp(comp.id, 'url', $any($event.target).value)" placeholder="https://…" aria-label="Website URL" />
                  <input class="comp-input" [value]="comp.strength" (input)="updateComp(comp.id, 'strength', $any($event.target).value)" placeholder="Key strength" aria-label="Strength" />
                  <input class="comp-input" [value]="comp.weakness" (input)="updateComp(comp.id, 'weakness', $any($event.target).value)" placeholder="Key weakness" aria-label="Weakness" />
                  <button class="btn-remove" type="button" (click)="removeComp(comp.id)" aria-label="Remove competitor">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              } @empty {
                <div class="empty-hint" style="padding: 20px 0;">No competitors added yet.</div>
              }
            </div>
          </section>
        }

        <!-- SEO -->
        @if (activeTab() === 'seo') {
          <section aria-label="SEO Foundation" [formGroup]="seoForm">
            <div class="form-grid">
              <div class="field span-full">
                <label class="field-label" for="primary-kw">Primary Keywords</label>
                <textarea id="primary-kw" class="field-textarea" formControlName="primaryKeywords" rows="3" placeholder="List main target keywords, one per line or comma-separated.&#10;e.g. brand design agency london, logo designer uk"></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="secondary-kw">Secondary / Long-tail Keywords</label>
                <textarea id="secondary-kw" class="field-textarea" formControlName="secondaryKeywords" rows="3" placeholder="Supporting keyword clusters."></textarea>
              </div>
              <div class="field span-full">
                <label class="field-label" for="existing-domain">Existing Domain</label>
                <input id="existing-domain" class="field-input" type="text" formControlName="existingDomain" placeholder="https://client.com" />
              </div>
              <div class="field span-full">
                <label class="field-label" for="local-seo">Local SEO Focus</label>
                <input id="local-seo" class="field-input" type="text" formControlName="localSeo" placeholder="City/region if applicable, e.g. London, Manchester, UK-wide" />
              </div>
              <div class="field span-full">
                <label class="field-label" for="seo-notes">Additional SEO Notes</label>
                <textarea id="seo-notes" class="field-textarea" formControlName="seoNotes" rows="3" placeholder="Any existing rankings to protect, penalties to recover from, or specific SEO goals."></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" type="button" (click)="saveSeo()" [disabled]="saving()">@if (saving()) { Saving... } @else if (saveSuccess()) { Saved } @else { Save SEO Foundation }</button>
            </div>
          </section>
        }

        <!-- Timeline -->
        @if (activeTab() === 'timeline') {
          <section aria-label="Project Timeline">
            <div class="list-header">
              <p class="list-hint">Add key milestones and deadlines for the project.</p>
              <button class="btn-add" type="button" (click)="addMilestone()" aria-label="Add milestone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Milestone
              </button>
            </div>

            <div class="timeline-list">
              @for (ms of milestones(); track ms.id) {
                <div class="milestone-row">
                  <button
                    class="ms-check"
                    type="button"
                    [class.checked]="ms.done"
                    (click)="toggleMilestone(ms.id)"
                    [attr.aria-label]="ms.done ? 'Mark as incomplete' : 'Mark as complete'"
                    [attr.aria-pressed]="ms.done"
                  >
                    @if (ms.done) {
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    }
                  </button>
                  <input class="ms-label-input" [class.done]="ms.done" [value]="ms.label" (input)="updateMilestone(ms.id, 'label', $any($event.target).value)" placeholder="Milestone description" aria-label="Milestone label" />
                  <input class="ms-date-input" type="date" [value]="ms.date" (input)="updateMilestone(ms.id, 'date', $any($event.target).value)" aria-label="Milestone date" />
                  <button class="btn-remove" type="button" (click)="removeMilestone(ms.id)" aria-label="Remove milestone">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              } @empty {
                <div class="empty-hint">No milestones yet. Click "Add Milestone" to start planning.</div>
              }
            </div>

            @if (milestones().length > 0) {
              <div class="timeline-progress">
                <span class="tl-label">{{ doneCount() }} / {{ milestones().length }} milestones complete</span>
                <div class="tl-bar">
                  <div class="tl-fill" [style.width.%]="milestoneProgress()"></div>
                </div>
              </div>
            }
          </section>
        }
        <section class="gate-card" aria-label="Profiling gate approval">
          <div>
            <h4 class="gate-title">Profiling Gate</h4>
            <p class="gate-copy">Complete this stage when the company / brand name is saved.</p>
            @if (gateError()) {
              <p class="gate-error" role="alert">{{ gateError() }}</p>
            }
          </div>
          <button class="btn-gate" type="button" (click)="completeGate()" [disabled]="!profilingComplete() || gateLoading()">
            @if (gateLoading()) { Completing... }
            @else { Complete Profiling Gate }
          </button>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .profiling-wrap { display: flex; flex-direction: column; gap: 0; }

    /* Section header */
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
    .section-sub {
      font-size: 12.5px;
      color: var(--color-text-muted);
      margin: 0;
    }
    .gate-pill {
      background: #FEE2E2;
      color: #DC2626;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
    }

    /* Tab nav */
    .tab-nav {
      display: flex;
      gap: 2px;
      border-bottom: 1px solid var(--color-border);
      margin: 0 -24px;
      padding: 0 24px;
      overflow-x: auto;
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
      white-space: nowrap;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .tab-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-warning);
      flex-shrink: 0;
    }

    /* Tab panels */
    .tab-panels { padding-top: 24px; }

    /* Form grid */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .field { display: flex; flex-direction: column; }
    .span-2 { grid-column: span 2; }
    .span-full { grid-column: 1 / -1; }

    .field-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: 6px;
    }
    .field-label-sm {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
      display: block;
    }
    .req { color: var(--color-destructive); }

    .field-input, .field-select {
      height: 36px;
      padding: 0 10px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus, .field-select:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
    }
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
    .field-textarea.sm { font-size: 12.5px; }

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

    /* List-style header */
    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .list-hint { font-size: 13px; color: var(--color-text-muted); margin: 0; }
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
    .btn-add:hover { background: var(--color-border); }

    /* Persona cards */
    .persona-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .persona-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--color-surface-raised);
      border-bottom: 1px solid var(--color-border);
    }
    .persona-avatar {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      background: var(--color-sidebar);
      color: #F8FAFC;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .persona-title { display: flex; flex: 1; gap: 8px; align-items: center; flex-wrap: wrap; }
    .persona-body { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 16px; }
    .inline-input {
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      flex: 1;
      min-width: 0;
    }
    .inline-input.small { max-width: 130px; flex: 0 0 130px; }
    .inline-input:focus { border-color: var(--color-accent); }

    /* Competitor table */
    .competitor-table { display: flex; flex-direction: column; gap: 6px; }
    .comp-row {
      display: grid;
      grid-template-columns: 1.5fr 1.5fr 2fr 2fr 32px;
      gap: 8px;
      align-items: center;
    }
    .comp-head {
      padding: 0 0 8px;
      border-bottom: 1px solid var(--color-border);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }
    .comp-input {
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12.5px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      width: 100%;
    }
    .comp-input:focus { border-color: var(--color-accent); }

    /* Remove button */
    .btn-remove {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .btn-remove:hover { background: var(--color-destructive-light); color: var(--color-destructive); }

    /* Timeline */
    .timeline-list { display: flex; flex-direction: column; gap: 8px; }
    .milestone-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .ms-check {
      width: 22px;
      height: 22px;
      min-width: 22px;
      border-radius: 50%;
      border: 2px solid var(--color-border-strong);
      background: var(--color-surface);
      color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }
    .ms-check.checked {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: #fff;
    }
    .ms-label-input {
      flex: 1;
      height: 30px;
      padding: 0 6px;
      border: none;
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--color-text);
      background: transparent;
      outline: none;
    }
    .ms-label-input.done { text-decoration: line-through; color: var(--color-text-muted); }
    .ms-label-input:focus { background: var(--color-surface-raised); }
    .ms-date-input {
      height: 30px;
      padding: 0 6px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 12px;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      outline: none;
    }
    .ms-date-input:focus { border-color: var(--color-accent); }

    .timeline-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }
    .tl-label { font-size: 12.5px; color: var(--color-text-secondary); white-space: nowrap; }
    .tl-bar { flex: 1; height: 6px; background: var(--color-surface-raised); border-radius: 10px; overflow: hidden; }
    .tl-fill { height: 100%; background: var(--color-accent); border-radius: 10px; transition: width 0.3s ease; }


    .btn-save:disabled, .btn-gate:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .gate-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: 24px;
      padding: 16px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
    }
    .gate-title {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }
    .gate-copy {
      margin: 0;
      font-size: 12.5px;
      color: var(--color-text-secondary);
    }
    .gate-error {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--color-destructive);
    }
    .btn-gate {
      height: 38px;
      padding: 0 18px;
      background: var(--color-sidebar);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .empty-hint { font-size: 13px; color: var(--color-text-muted); padding: 12px 0; }
  `]
})
export class Profiling implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private state = inject(ProjectStateService);
  private notifService = inject(NotificationService);

  private get projectId(): string {
    return this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  protected saving = signal(false);
  protected saveSuccess = signal(false);
  protected gateLoading = signal(false);
  protected gateError = signal<string | null>(null);

  protected activeTab = signal<TabId>('brief');

  protected tabs: { id: TabId; label: string; required: boolean }[] = [
    { id: 'brief',       label: 'Client Brief',       required: true },
    { id: 'brand',       label: 'Brand Inputs',       required: false },
    { id: 'personas',    label: 'Target Personas',    required: false },
    { id: 'competitors', label: 'Competitors',        required: false },
    { id: 'seo',         label: 'SEO Foundation',     required: false },
    { id: 'timeline',    label: 'Timeline',           required: false },
  ];

  protected briefForm = this.fb.group({
    companyName:  ['', Validators.required],
    industry:     [''],
    about:        [''],
    objectives:   [''],
    scope:        [''],
    budget:       [''],
    priority:     [''],
  });

  protected brandForm = this.fb.group({
    brandVoice:   [''],
    tagline:      [''],
    brandColours: [''],
    typography:   [''],
    brandRefs:    [''],
    brandDislikes:[''],
  });

  protected seoForm = this.fb.group({
    primaryKeywords:   [''],
    secondaryKeywords: [''],
    existingDomain:    [''],
    localSeo:          [''],
    seoNotes:          [''],
  });

  protected personas = signal<Persona[]>([]);
  protected competitors = signal<Competitor[]>([]);
  protected milestones = signal<Milestone[]>([]);

  protected profilingComplete = computed(() => this.briefForm.controls.companyName.valid);

  protected tabFilled(id: TabId): boolean {
    if (id === 'brief')   return this.briefForm.valid;
    if (id === 'brand')   return true;
    if (id === 'seo')     return true;
    return true;
  }

  protected doneCount = computed(() => this.milestones().filter(m => m.done).length);
  protected milestoneProgress = computed(() => {
    const total = this.milestones().length;
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  ngOnInit() {
    const profiling = this.state.project()?.profiling;
    if (profiling) {
      this.briefForm.patchValue({
        companyName: profiling.companyName ?? '',
        industry:    profiling.industry ?? '',
        about:       profiling.about ?? '',
        objectives:  profiling.objectives ?? '',
        scope:       profiling.scope ?? '',
        budget:      profiling.budget ?? '',
        priority:    profiling.priority ?? '',
      });
      this.brandForm.patchValue({
        brandVoice:    profiling.brandVoice ?? '',
        tagline:       profiling.tagline ?? '',
        brandColours:  profiling.brandColours ?? '',
        typography:    profiling.typography ?? '',
        brandRefs:     profiling.brandRefs ?? '',
        brandDislikes: profiling.brandDislikes ?? '',
      });
      this.seoForm.patchValue({
        primaryKeywords:   profiling.primaryKeywords ?? '',
        secondaryKeywords: profiling.secondaryKeywords ?? '',
        existingDomain:    profiling.existingDomain ?? '',
        localSeo:          profiling.localSeo ?? '',
        seoNotes:          profiling.seoNotes ?? '',
      });
      this.personas.set((profiling.personas ?? []).map(p => ({
        id: p.id, name: p.name ?? '', age: p.age ?? '', role: p.role ?? '',
        pain: p.painPoints ?? '', goal: p.goals ?? '',
      })));
      this.competitors.set((profiling.competitors ?? []).map(c => ({
        id: c.id, name: c.name ?? '', url: c.url ?? '',
        strength: c.strengths ?? '', weakness: c.weaknesses ?? '',
      })));
    }
    const milestones = this.state.project()?.milestones ?? [];
    this.milestones.set(milestones.map(m => ({
      id: m.id, label: m.label, date: m.dueDate?.slice(0, 10) ?? '',
      done: m.status === 'DONE',
    })));
  }

  private upsertAll() {
    const b = this.briefForm.value;
    const br = this.brandForm.value;
    const s = this.seoForm.value;
    return this.projectService.upsertProfiling(this.projectId, {
      companyName:       b.companyName ?? undefined,
      industry:          b.industry ?? undefined,
      about:             b.about ?? undefined,
      objectives:        b.objectives ?? undefined,
      scope:             b.scope ?? undefined,
      budget:            b.budget ?? undefined,
      priority:          b.priority ?? undefined,
      brandVoice:        br.brandVoice ?? undefined,
      tagline:           br.tagline ?? undefined,
      brandColours:      br.brandColours ?? undefined,
      typography:        br.typography ?? undefined,
      brandRefs:         br.brandRefs ?? undefined,
      brandDislikes:     br.brandDislikes ?? undefined,
      primaryKeywords:   s.primaryKeywords ?? undefined,
      secondaryKeywords: s.secondaryKeywords ?? undefined,
      existingDomain:    s.existingDomain ?? undefined,
      localSeo:          s.localSeo ?? undefined,
      seoNotes:          s.seoNotes ?? undefined,
    });
  }

  protected addPersona() {
    this.projectService.createPersona(this.projectId, { name: 'New Persona', age: '', role: '', painPoints: '', goals: '' })
      .subscribe(p => this.personas.update(list => [...list, { id: p.id, name: p.name ?? '', age: p.age ?? '', role: p.role ?? '', pain: p.painPoints ?? '', goal: p.goals ?? '' }]));
  }

  protected removePersona(id: string) {
    this.projectService.deletePersona(this.projectId, id)
      .subscribe(() => this.personas.update(list => list.filter(p => p.id !== id)));
  }

  protected updatePersona(id: string, field: keyof Persona, value: string) {
    this.personas.update(list => list.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  protected addCompetitor() {
    this.projectService.createCompetitor(this.projectId, { name: '', url: '', strengths: '', weaknesses: '' })
      .subscribe(c => this.competitors.update(list => [...list, { id: c.id, name: c.name ?? '', url: c.url ?? '', strength: c.strengths ?? '', weakness: c.weaknesses ?? '' }]));
  }

  protected removeComp(id: string) {
    this.projectService.deleteCompetitor(this.projectId, id)
      .subscribe(() => this.competitors.update(list => list.filter(c => c.id !== id)));
  }

  protected updateComp(id: string, field: keyof Competitor, value: string) {
    this.competitors.update(list => list.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  protected addMilestone() {
    this.projectService.createMilestone(this.projectId, { label: '', status: 'PENDING', sortOrder: this.milestones().length + 1 })
      .subscribe(m => this.milestones.update(list => [...list, { id: m.id, label: m.label, date: m.dueDate?.slice(0, 10) ?? '', done: false }]));
  }

  protected removeMilestone(id: string) {
    this.projectService.deleteMilestone(this.projectId, id)
      .subscribe(() => this.milestones.update(list => list.filter(m => m.id !== id)));
  }

  protected updateMilestone(id: string, field: keyof Milestone, value: string | boolean) {
    this.milestones.update(list => list.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  protected toggleMilestone(id: string) {
    const ms = this.milestones().find(m => m.id === id);
    if (!ms) return;
    const newStatus = ms.done ? 'PENDING' : 'DONE';
    this.projectService.updateMilestone(this.projectId, id, { status: newStatus })
      .subscribe(() => this.milestones.update(list => list.map(m => m.id === id ? { ...m, done: !m.done } : m)));
  }

  private doSave() {
    this.saving.set(true);
    this.upsertAll().subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 2000);
      },
      error: () => this.saving.set(false),
    });
  }

  protected saveBrief()  { this.briefForm.markAllAsTouched(); if (this.briefForm.valid) this.doSave(); }
  protected saveBrand()  { this.brandForm.markAllAsTouched(); if (this.brandForm.valid) this.doSave(); }
  protected saveSeo()    { this.seoForm.markAllAsTouched();   if (this.seoForm.valid)   this.doSave(); }

  protected completeGate() {
    this.gateLoading.set(true);
    this.gateError.set(null);
    this.projectService.completeProfiling(this.projectId).subscribe({
      next: () => {
        this.gateLoading.set(false);
        this.projectService.getProject(this.projectId)
          .subscribe(p => this.state.setProject(p));
        const name = this.state.project()?.name ?? 'Project';
        this.notifService.add({
          type: 'stage_unlocked',
          title: 'Profiling gate approved',
          body: `${name} — Written Content is now unlocked`,
          projectId: this.projectId,
          projectName: name,
          route: `/app/projects/${this.projectId}/content`,
        });
      },
      error: (err) => {
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
        this.gateLoading.set(false);
      },
    });
  }
}



