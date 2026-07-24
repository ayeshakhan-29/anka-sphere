import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project, ContentPillar, MonthlyContentReport } from '../../models/project.models';

type TabId = 'projects' | 'pipeline' | 'tasks' | 'calendar' | 'emails' | 'repurposing' | 'pillars' | 'report';

interface CMProject {
  id: string; name: string; client: string; clientInitials: string;
  contentTasksDone: number; contentTasksTotal: number;
  pagesApproved: number; pagesTotal: number;
  completedAt?: string;
}

interface PipelinePage {
  pageId: string; projectId: string; projectName: string; client: string;
  title: string; slug: string; wordCount: number; status: string;
  pillarId?: string;
}

interface CMTask {
  id: string; title: string; status: string; priority: string;
  projectName: string; client: string; projectId: string;
}

@Component({
  selector: 'app-content-marketing-dept',
  imports: [RouterLink, Badge, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="cm-page">

      <!-- Header -->
      <div class="cm-header">
        <div class="cm-header-left">
          <div class="dept-badge" aria-hidden="true">CM</div>
          <div>
            <h2 class="cm-title">Content Marketing</h2>
            <p class="cm-sub">Product Growth · Content pipeline · {{ projects().length }} projects</p>
          </div>
        </div>
        <div class="header-actions" style="display: flex; gap: 12px; align-items: center;">
          <div class="proj-select-wrap">
            <select class="search-input" style="width: 180px; padding-left: 10px; cursor: pointer;"
              [value]="selectedProjectId()" (change)="onProjectChange($any($event.target).value)" aria-label="Select Project">
              <option value="">All Projects</option>
              @for (p of projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
              [value]="search()" (input)="search.set($any($event.target).value)" />
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Content marketing summary">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div><div class="kpi-val">{{ k.value() }}</div><div class="kpi-lbl">{{ k.label }}</div></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Content marketing sections">
        @for (t of tabs; track t.id) {
          <button role="tab" class="tab-btn" [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id" (click)="activeTab.set(t.id)">
            {{ t.label }}
            @if (t.count() > 0) { <span class="tab-count">{{ t.count() }}</span> }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading…</div>
      } @else {

        <!-- Projects tab -->
        @if (activeTab() === 'projects') {
          <div class="list-header" aria-hidden="true">
            <span>Project / Client</span><span>Content Tasks</span><span>Pages Approved</span><span>Status</span><span></span>
          </div>
          <div class="proj-list" role="list" aria-label="Content marketing projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="prow" role="listitem">
                <div class="prow-id">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div><span class="prow-name">{{ p.name }}</span><span class="prow-client">{{ p.client }}</span></div>
                </div>
                <div class="tasks-cell">
                  <span class="tasks-num">{{ p.contentTasksDone }}/{{ p.contentTasksTotal }}</span>
                  @if (p.contentTasksTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="pct(p.contentTasksDone, p.contentTasksTotal)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill" [style.width.%]="pct(p.contentTasksDone, p.contentTasksTotal)"></div>
                    </div>
                  }
                </div>
                <div class="pages-cell">
                  <span class="tasks-num">{{ p.pagesApproved }}/{{ p.pagesTotal }}</span>
                  @if (p.pagesTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="pct(p.pagesApproved, p.pagesTotal)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill pages" [style.width.%]="pct(p.pagesApproved, p.pagesTotal)"></div>
                    </div>
                  }
                </div>
                <div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="success">Active</ui-badge> }
                </div>
                <a class="btn-open" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open</a>
              </article>
            } @empty {
              <div class="empty-state">No projects in content marketing yet.</div>
            }
          </div>
        }

        <!-- Content Pipeline tab -->
        @if (activeTab() === 'pipeline') {
          <div class="filter-row" role="group" aria-label="Filter by page status">
            @for (f of pageFilters; track f.value) {
              <button class="ftab" [class.active]="pageFilter() === f.value" (click)="pageFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="pipe-header" aria-hidden="true">
            <span>Page</span><span>Project</span><span>Word Count</span><span>Status</span>
          </div>
          <div class="pipe-list" role="list" aria-label="Content pipeline">
            @for (page of displayedPages(); track page.pageId) {
              <div class="pipe-row" role="listitem">
                <div class="pipe-page">
                  <span class="pipe-title">{{ page.title }}</span>
                  @if (page.slug) { <span class="pipe-slug">/{{ page.slug }}</span> }
                </div>
                <div class="pipe-proj">
                  <span class="pipe-proj-name">{{ page.projectName }}</span>
                  <span class="pipe-proj-client">{{ page.client }}</span>
                </div>
                <div class="pipe-words">{{ page.wordCount > 0 ? page.wordCount.toLocaleString() : '—' }}</div>
                <div>
                  @if (page.status === 'APPROVED') { <ui-badge variant="success">Approved</ui-badge> }
                  @else if (page.status === 'IN_REVIEW') { <ui-badge variant="info">In Review</ui-badge> }
                  @else { <ui-badge variant="default">Draft</ui-badge> }
                </div>
              </div>
            } @empty {
              <div class="empty-state">No content pages found. Pages appear once Written Content is underway.</div>
            }
          </div>
        }

        <!-- Master Content Calendar tab -->
        @if (activeTab() === 'calendar') {
          <div class="master-cal-wrap">
            <div class="cal-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h3 class="cal-title">Master Content Calendar</h3>
                <p class="cal-sub">Unified multi-channel calendar across Blogs, Social Posts, and Email Newsletters.</p>
              </div>
            </div>

            <!-- Content Pillar Filters -->
            @if (selectedProjectId() && pillars().length > 0) {
              <div class="filter-row" style="margin-bottom: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <span style="font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-right: 4px;">Pillar Filter:</span>
                <button class="ftab" [class.active]="selectedPillarFilter() === 'all'" (click)="selectedPillarFilter.set('all')">
                  All
                </button>
                @for (p of pillars(); track p.id) {
                  <button class="ftab" [class.active]="selectedPillarFilter() === p.id" (click)="selectedPillarFilter.set(p.id)">
                    <span class="col-dot" [style.background]="p.color" style="width: 8px; height: 8px; margin-right: 4px; display: inline-block; border-radius: 50%;"></span>
                    {{ p.name }}
                  </button>
                }
              </div>
            }

            <div class="calendar-grid">
              @for (ev of displayedCalendarEvents(); track ev.id) {
                <div class="cal-card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span class="cal-type-badge" [class.blog]="ev.type === 'BLOG'" [class.social]="ev.type === 'SOCIAL'" [class.email]="ev.type === 'EMAIL'">{{ ev.type }}</span>
                    @if (ev.pillar) {
                      <span style="font-size: 11px; font-weight: 500; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; display: inline-block;" [style.background]="ev.pillar.color"></span>
                        {{ ev.pillar.name }}
                      </span>
                    }
                  </div>
                  <h4 class="cal-item-title">{{ ev.title }}</h4>
                  <p class="cal-item-meta">{{ ev.channel }} · {{ ev.date | date:'mediumDate' }}</p>
                  <ui-badge [variant]="ev.status === 'APPROVED' || ev.status === 'PUBLISHED' ? 'success' : 'info'">{{ ev.status }}</ui-badge>
                </div>
              } @empty {
                <div class="empty-state" style="grid-column: span 3;">No calendar events found matching the filters. Select another project or clear filters.</div>
              }
            </div>
          </div>
        }

        <!-- Email Campaigns tab -->
        @if (activeTab() === 'emails') {
          <div class="emails-wrap">
            <div class="cal-header">
              <h3 class="cal-title">Email Marketing Workflows</h3>
              <p class="cal-sub">Draft and manage email newsletters, campaign briefs, and subscriber segment copy.</p>
            </div>
            
            <!-- Content Pillar Filters -->
            @if (selectedProjectId() && pillars().length > 0) {
              <div class="filter-row" style="margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: var(--color-text-muted);">Pillar:</span>
                <button class="ftab" [class.active]="selectedPillarFilter() === 'all'" (click)="selectedPillarFilter.set('all')">
                  All
                </button>
                @for (p of pillars(); track p.id) {
                  <button class="ftab" [class.active]="selectedPillarFilter() === p.id" (click)="selectedPillarFilter.set(p.id)">
                    <span class="col-dot" [style.background]="p.color" style="width: 8px; height: 8px; margin-right: 4px; display: inline-block; border-radius: 50%;"></span>
                    {{ p.name }}
                  </button>
                }
              </div>
            }

            <div class="pipe-header" aria-hidden="true">
              <span>Campaign Name</span><span>Audience Segment</span><span>CTA</span><span>Status</span>
            </div>
            <div class="pipe-list">
              @for (email of displayedEmails(); track email.id) {
                <div class="pipe-row">
                  <div>
                    <strong>{{ email.name }}</strong>
                    @if (email.subjectLines && email.subjectLines[0]) {
                      <br/><small style="color: var(--color-text-muted)">Subject: {{ email.subjectLines[0] }}</small>
                    }
                  </div>
                  <span>{{ email.audienceSegment || 'All Subscribers' }}</span>
                  <span>{{ email.cta || '—' }}</span>
                  <div>
                    <ui-badge [variant]="email.status === 'SENT' ? 'success' : (email.status === 'SCHEDULED' ? 'info' : 'default')">{{ email.status }}</ui-badge>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">No email campaigns found. Choose another project or create one.</div>
              }
            </div>
          </div>
        }

        <!-- Repurposing Tracker tab -->
        @if (activeTab() === 'repurposing') {
          <div class="repurpose-wrap">
            <div class="cal-header">
              <h3 class="cal-title">Content Repurposing Tracker</h3>
              <p class="cal-sub">Track how core articles are transformed into social carousels, LinkedIn posts, and email snippets.</p>
            </div>
            <div class="pipe-header" aria-hidden="true">
              <span>Source Article</span><span>Target Format</span><span>Repurposed Output</span><span>Status</span>
            </div>
            <div class="pipe-list">
              @for (item of displayedRepurposing(); track item.id) {
                <div class="pipe-row">
                  <div>
                    <strong>{{ item.sourcePage?.title || 'External Source' }}</strong>
                    <br/><small style="color: var(--color-text-muted)">Original Page</small>
                  </div>
                  <span>{{ item.targetFormat }}</span>
                  <span>{{ item.title }}</span>
                  <ui-badge [variant]="item.status === 'COMPLETED' ? 'success' : 'info'">{{ item.status }}</ui-badge>
                </div>
              } @empty {
                <div class="empty-state">No repurposing items found. Select another project or add repurposing links.</div>
              }
            </div>
          </div>
        }

        <!-- Content Pillars tab -->
        @if (activeTab() === 'pillars') {
          <div class="repurpose-wrap">
            <div class="cal-header" style="margin-bottom: 12px;">
              <h3 class="cal-title">Content Pillars Manager</h3>
              <p class="cal-sub">Define 3-5 core branding content pillars for the project and tag pages or email campaigns to them.</p>
            </div>

            @if (!selectedProjectId()) {
              <div class="empty-state">Please select a project in the dropdown above to manage content pillars.</div>
            } @else {
              <!-- Add Pillar Form -->
              <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text);">Create Content Pillar</h4>
                <div style="display: flex; gap: 12px; align-items: center;">
                  <div style="flex: 1;">
                    <input class="search-input" style="width: 100%;" type="text" placeholder="Pillar Theme Name..."
                      [value]="newPillarName()" (input)="newPillarName.set($any($event.target).value)" />
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 12px; color: var(--color-text-muted);">Color:</label>
                    <input type="color" [value]="newPillarColor()" (input)="newPillarColor.set($any($event.target).value)" style="width: 32px; height: 32px; border: 1px solid var(--color-border); border-radius: 4px; padding: 0; cursor: pointer; background: transparent;" />
                  </div>
                  <button class="btn-save" style="margin: 0; padding: 8px 16px;" type="button" (click)="createPillar()" [disabled]="savingPillar() || !newPillarName().trim()">
                    {{ savingPillar() ? 'Saving...' : 'Add Pillar' }}
                  </button>
                </div>
              </div>

              <!-- List of Pillars -->
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text);">Active Pillars ({{ pillars().length }})</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  @for (p of pillars(); track p.id) {
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 12px; height: 12px; border-radius: 50%; display: inline-block;" [style.background]="p.color"></span>
                        <strong style="font-size: 13px; color: var(--color-text);">{{ p.name }}</strong>
                      </div>
                      <button class="btn-ghost" style="color: #DC2626; padding: 4px 8px; font-size: 12px;" type="button" (click)="deletePillar(p.id)">Delete</button>
                    </div>
                  } @empty {
                    <div style="text-align: center; padding: 16px; color: var(--color-text-muted); font-size: 12.5px;">No content pillars defined yet. Use the form above to add one.</div>
                  }
                </div>
              </div>

              <!-- Tagging section -->
              <div>
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text);">Assign Pillars to Content Pieces</h4>
                
                <!-- Pages -->
                <div style="margin-bottom: 16px;">
                  <h5 style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--color-text-muted);">Pages / Blog Articles</h5>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    @for (pg of projectPages(); track pg.id) {
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-md);">
                        <span style="font-size: 12.5px; color: var(--color-text-secondary);">{{ pg.title }}</span>
                        <select [value]="pg.pillarId || 'none'" (change)="tagPageToPillar(pg.id, $any($event.target).value)" style="height: 28px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--color-border-strong); background: var(--color-surface); font-size: 12px;">
                          <option value="none">Unassigned</option>
                          @for (p of pillars(); track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>
                    } @empty {
                      <div style="font-size: 12px; color: var(--color-text-muted); padding: 8px;">No pages found for this project. Create some in Written Content stage.</div>
                    }
                  </div>
                </div>

                <!-- Emails -->
                <div>
                  <h5 style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--color-text-muted);">Email Campaigns</h5>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    @for (em of projectEmails(); track em.id) {
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-md);">
                        <span style="font-size: 12.5px; color: var(--color-text-secondary);">{{ em.name }}</span>
                        <select [value]="em.pillarId || 'none'" (change)="tagEmailToPillar(em.id, $any($event.target).value)" style="height: 28px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--color-border-strong); background: var(--color-surface); font-size: 12px;">
                          <option value="none">Unassigned</option>
                          @for (p of pillars(); track p.id) {
                            <option [value]="p.id">{{ p.name }}</option>
                          }
                        </select>
                      </div>
                    } @empty {
                      <div style="font-size: 12px; color: var(--color-text-muted); padding: 8px;">No email campaigns found for this project. Create some in Email Campaigns tab.</div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Monthly Content Report tab -->
        @if (activeTab() === 'report') {
          <div class="repurpose-wrap">
            <div class="cal-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 class="cal-title">Monthly Content Report</h3>
                <p class="cal-sub">Unified monthly analysis of published content, organic GA4 metrics, and channel statistics.</p>
              </div>
              @if (selectedProjectId() && report()) {
                <button class="btn-save" type="button" (click)="downloadReportPdf()" style="margin: 0; display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export PDF Report
                </button>
              }
            </div>

            @if (!selectedProjectId()) {
              <div class="empty-state">Please select a project in the dropdown above to view the performance report.</div>
            } @else if (loadingReport()) {
              <div class="loading-state"><div class="spinner"></div>Generating report dashboard data...</div>
            } @else if (report(); as r) {
              <!-- Stats summary strip -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--color-text);">{{ r.stats.totalProduced }}</div>
                  <div style="font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px;">Total Produced</div>
                </div>
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: #F59E0B;">{{ r.stats.blogsProduced }}</div>
                  <div style="font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px;">Blog Posts</div>
                </div>
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: #10B981;">{{ r.stats.socialsProduced }}</div>
                  <div style="font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px;">Social Posts</div>
                </div>
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px; text-align: center;">
                  <div style="font-size: 20px; font-weight: 700; color: #3B82F6;">{{ r.stats.emailsProduced }}</div>
                  <div style="font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px;">Email Campaigns</div>
                </div>
              </div>

              <!-- Top Performing Articles Table -->
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text);">Organic Traffic (GA4 pageviews & engagement)</h4>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-muted); font-weight: 600;">
                      <th style="padding: 8px;">Article Title</th>
                      <th style="padding: 8px;">Slug</th>
                      <th style="padding: 8px;">Organic Views</th>
                      <th style="padding: 8px;">Avg. Engagement Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (art of r.topArticles; track art.title) {
                      <tr style="border-bottom: 1px solid var(--color-border);">
                        <td style="padding: 8px; font-weight: 500;">{{ art.title }}</td>
                        <td style="padding: 8px; color: var(--color-text-muted); font-family: monospace;">/{{ art.slug }}</td>
                        <td style="padding: 8px; font-weight: 600;">{{ art.views | number }}</td>
                        <td style="padding: 8px;">{{ art.engagementTime }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--color-text-muted);">No organic traffic details found.</td></tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Channel stats grids -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px;">
                  <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text); border-bottom: 1px solid var(--color-border); padding-bottom: 6px;">Email Campaigns Nurture Stats</h4>
                  <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
                    <div style="display: flex; justify-content: space-between;"><span>Campaigns Sent:</span><strong>{{ r.emailMetrics.campaignsSent }}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Audience Reached:</span><strong>{{ r.emailMetrics.audienceReached | number }} users</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Average Open Rate:</span><strong>{{ r.emailMetrics.openRate }}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Average Click Rate:</span><strong>{{ r.emailMetrics.clickRate }}</strong></div>
                  </div>
                </div>
                <div style="background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px;">
                  <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text); border-bottom: 1px solid var(--color-border); padding-bottom: 6px;">Site Traffic Growth Contribution</h4>
                  <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
                    <div style="display: flex; justify-content: space-between;"><span>Content Referral Sessions:</span><strong>{{ r.trafficContribution.contentSessions | number }}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Total Overall Sessions:</span><strong>{{ r.trafficContribution.totalSessions | number }}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Contribution Share:</span><span style="font-weight: 700; color: #10B981;">{{ r.trafficContribution.percentage }}</span></div>
                  </div>
                </div>
              </div>

              <!-- Pillars balance distribution -->
              <div>
                <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--color-text);">Content Pillars Balance Distribution</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  @for (pil of r.pillars; track pil.name) {
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                        <span style="display: flex; align-items: center; gap: 6px;">
                          <span style="width: 8px; height: 8px; border-radius: 50%; display: inline-block;" [style.background]="pil.color"></span>
                          <strong>{{ pil.name }}</strong>
                        </span>
                        <span>{{ pil.count }} piece{{ pil.count !== 1 ? 's' : '' }}</span>
                      </div>
                      <div style="height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden;">
                        <!-- Safe math to prevent divide by zero -->
                        <div style="height: 100%; border-radius: 3px;" [style.background]="pil.color" [style.width.%]="r.stats.totalProduced > 0 ? (pil.count / r.stats.totalProduced * 100) : 0"></div>
                      </div>
                    </div>
                  } @empty {
                    <div style="text-align: center; padding: 16px; color: var(--color-text-muted); font-size: 12.5px;">No content pillars balance data available. Tag pieces in Content Pillars tab first.</div>
                  }
                </div>
              </div>
            } @else {
              <div class="empty-state">Unable to load report data.</div>
            }
          </div>
        }

        <!-- Tasks tab -->
        @if (activeTab() === 'tasks') {
          <div class="filter-row" role="group" aria-label="Filter by task status">
            @for (f of taskFilters; track f.value) {
              <button class="ftab" [class.active]="taskStatusFilter() === f.value" (click)="taskStatusFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="task-header" aria-hidden="true">
            <span>Task</span><span>Project</span><span>Priority</span><span>Status</span>
          </div>
          <div class="task-list" role="list" aria-label="Content marketing tasks">
            @for (t of displayedTasks(); track t.id) {
              <div class="task-row" role="listitem">
                <span class="task-title">{{ t.title }}</span>
                <div class="task-proj">
                  <span class="tp-name">{{ t.projectName }}</span>
                  <span class="tp-client">{{ t.client }}</span>
                </div>
                <span class="task-priority" [attr.data-p]="t.priority">{{ t.priority }}</span>
                <span class="task-status" [attr.data-s]="t.status">{{ statusLabel(t.status) }}</span>
              </div>
            } @empty {
              <div class="empty-state">No content tasks yet. Add CONTENT-category tasks in the Marketing workspace.</div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .cm-page { display: flex; flex-direction: column; gap: 16px; }
    .cm-header { display: flex; align-items: center; justify-content: space-between; }
    .cm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #F59E0B; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .cm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .cm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #F59E0B; }

    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    .tab-nav { display: flex; gap: 6px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px; }
    .tab-btn { height: 32px; padding: 0 14px; background: transparent; border: 1px solid transparent; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.12s; }
    .tab-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .tab-btn.active { background: var(--color-surface); border-color: var(--color-border-strong); color: var(--color-text); font-weight: 600; box-shadow: var(--shadow-card); }
    .tab-count { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }

    .loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 48px; color: var(--color-text-muted); font-size: 14px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #F59E0B; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .filter-row { display: flex; gap: 6px; margin-bottom: 8px; }
    .ftab { height: 26px; padding: 0 10px; background: transparent; border: 1px solid var(--color-border); border-radius: 13px; font-family: var(--font-sans); font-size: 12px; color: var(--color-text-muted); cursor: pointer; display: flex; align-items: center; gap: 5px; }
    .ftab.active { background: var(--color-text); color: var(--color-surface); border-color: var(--color-text); font-weight: 600; }
    .ftab-count { font-size: 10.5px; opacity: 0.8; }

    .list-header { display: grid; grid-template-columns: 1fr 140px 140px 100px 80px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .proj-list { display: flex; flex-direction: column; gap: 6px; }
    .prow { display: grid; grid-template-columns: 1fr 140px 140px 100px 80px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .prow:hover { box-shadow: var(--shadow-raised); }
    .prow-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .prow-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prow-client { display: block; font-size: 11.5px; color: var(--color-text-muted); }
    .tasks-cell, .pages-cell { display: flex; flex-direction: column; gap: 4px; }
    .tasks-num { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #F59E0B; border-radius: 4px; }
    .mini-fill.pages { background: #6366F1; }
    .btn-open { height: 28px; padding: 0 10px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center; transition: background 0.12s; }
    .btn-open:hover { background: var(--color-border); color: var(--color-text); }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    .pipe-header { display: grid; grid-template-columns: 1fr 200px 100px 110px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .pipe-list { display: flex; flex-direction: column; gap: 6px; }
    .pipe-row { display: grid; grid-template-columns: 1fr 200px 100px 110px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .pipe-page { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pipe-title { font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pipe-slug { font-size: 11.5px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .pipe-proj { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pipe-proj-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pipe-proj-client { font-size: 11px; color: var(--color-text-muted); }
    .pipe-words { font-size: 13px; font-weight: 600; color: var(--color-text); }

    .task-header { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .task-list { display: flex; flex-direction: column; gap: 6px; }
    .task-row { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .task-proj { display: flex; flex-direction: column; gap: 2px; }
    .tp-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); }
    .tp-client { font-size: 11px; color: var(--color-text-muted); }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEE2E2; color: #DC2626; }
    .task-priority[data-p="MEDIUM"] { background: #FEF3C7; color: #D97706; }
    .task-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-status[data-s="DONE"] { background: #ECFDF5; color: #059669; }
    .task-status[data-s="IN_PROGRESS"] { background: #EFF6FF; color: #2563EB; }
    .task-status[data-s="IN_REVIEW"] { background: #FEF3C7; color: #D97706; }

    .master-cal-wrap, .emails-wrap, .repurpose-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .cal-header { display: flex; flex-direction: column; gap: 2px; }
    .cal-title { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0; }
    .cal-sub { font-size: 12px; color: var(--color-text-muted); margin: 0; }
    .calendar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 6px; }
    .cal-card { padding: 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 6px; }
    .cal-type-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; width: fit-content; }
    .cal-type-badge.blog { background: #E0E7FF; color: #4338CA; }
    .cal-type-badge.social { background: #FCE7F3; color: #BE185D; }
    .cal-type-badge.email { background: #FEF3C7; color: #B45309; }
    .cal-item-title { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; }
    .cal-item-meta { font-size: 11.5px; color: var(--color-text-muted); margin: 0; }

    @media (max-width: 768px) {
      .cm-header { flex-direction: column; align-items: stretch; gap: 12px; }
      .header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
      .proj-select-wrap, .proj-select-wrap select, .search-wrap, .search-input { width: 100% !important; }
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .tab-nav { overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
      .tab-btn { flex-shrink: 0; }
      .list-header, .pipe-header, .task-header { display: none; }
      
      .prow, .pipe-row, .task-row {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 12px;
      }
      .prow > *, .pipe-row > *, .task-row > * {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        text-align: right;
      }
      .prow-id, .pipe-page, .task-title, .task-proj {
        flex-direction: row;
        justify-content: space-between;
      }
      
      .calendar-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .kpi-strip { grid-template-columns: 1fr; }
    }
  `]
})
export class ContentMarketingDept implements OnInit {
  private projectService = inject(ProjectService);
  protected search            = signal('');
  protected activeTab         = signal<TabId>('projects');
  protected pageFilter        = signal<'all' | 'APPROVED' | 'IN_REVIEW' | 'DRAFT'>('all');
  protected taskStatusFilter  = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading           = signal(true);
  protected projects          = signal<CMProject[]>([]);
  protected allPages          = signal<PipelinePage[]>([]);
  protected allTasks          = signal<CMTask[]>([]);

  // Project-specific features signals
  protected selectedProjectId = signal<string>('');
  protected pillars          = signal<ContentPillar[]>([]);
  protected report           = signal<MonthlyContentReport | null>(null);
  protected projectPages     = signal<any[]>([]);
  protected projectEmails    = signal<any[]>([]);
  protected projectRepurposing = signal<any[]>([]);
  protected selectedPillarFilter = signal<string>('all');
  protected calendarEvents    = signal<any[]>([]);

  // Pillars CRUD form
  protected newPillarName     = signal('');
  protected newPillarColor    = signal('#3B82F6');
  protected savingPillar      = signal(false);
  protected loadingReport     = signal(false);

  readonly tabs = [
    { id: 'projects'  as TabId, label: 'Projects',          count: computed(() => this.projects().length) },
    { id: 'pipeline'  as TabId, label: 'Content Pipeline',  count: computed(() => this.displayedPages().length) },
    { id: 'calendar'  as TabId, label: 'Master Calendar',   count: computed(() => this.displayedCalendarEvents().length) },
    { id: 'emails'    as TabId, label: 'Email Workflows',   count: computed(() => this.displayedEmails().length) },
    { id: 'repurposing' as TabId, label: 'Repurposing',      count: computed(() => this.displayedRepurposing().length) },
    { id: 'pillars'   as TabId, label: 'Content Pillars',   count: computed(() => this.selectedProjectId() ? this.pillars().length : 0) },
    { id: 'report'    as TabId, label: 'Monthly Report',    count: computed(() => 0) },
    { id: 'tasks'     as TabId, label: 'Tasks',             count: computed(() => this.displayedTasks().length) },
  ];

  readonly pageFilters = [
    { label: 'All',       value: 'all'       as const, count: computed(() => this.allPages().length) },
    { label: 'Approved',  value: 'APPROVED'  as const, count: computed(() => this.allPages().filter(p => p.status === 'APPROVED').length) },
    { label: 'In Review', value: 'IN_REVIEW' as const, count: computed(() => this.allPages().filter(p => p.status === 'IN_REVIEW').length) },
    { label: 'Draft',     value: 'DRAFT'     as const, count: computed(() => this.allPages().filter(p => p.status === 'DRAFT').length) },
  ];

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    { label: 'Active',         value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#F59E0B', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
    { label: 'Completed',      value: computed(() => this.projects().filter(p => p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Content Tasks',  value: computed(() => `${this.projects().reduce((s,p)=>s+p.contentTasksDone,0)}/${this.projects().reduce((s,p)=>s+p.contentTasksTotal,0)}`), bg: '#6366F1', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>` },
    { label: 'Pages Approved', value: computed(() => `${this.allPages().filter(p=>p.status==='APPROVED').length}/${this.allPages().length}`), bg: '#F97316', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
  ];

  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  });

  protected displayedPages = computed(() => {
    const f = this.pageFilter();
    const pFilter = this.selectedPillarFilter();
    const q = this.search().toLowerCase();
    const projId = this.selectedProjectId();

    return this.allPages().filter(p =>
      (f === 'all' || p.status === f) &&
      (!projId || p.projectId === projId) &&
      (pFilter === 'all' || p.pillarId === pFilter) &&
      (!q || p.title.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q))
    );
  });

  protected displayedTasks = computed(() => {
    const f = this.taskStatusFilter();
    const q = this.search().toLowerCase();
    const projId = this.selectedProjectId();

    return this.allTasks().filter(t =>
      (f === 'all' || t.status === f) &&
      (!projId || t.projectId === projId) &&
      (!q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q))
    );
  });

  protected displayedCalendarEvents = computed(() => {
    const pFilter = this.selectedPillarFilter();
    const q = this.search().toLowerCase();
    return this.calendarEvents().filter(ev =>
      (pFilter === 'all' || ev.pillarId === pFilter) &&
      (!q || ev.title.toLowerCase().includes(q))
    );
  });

  protected displayedEmails = computed(() => {
    const pFilter = this.selectedPillarFilter();
    const q = this.search().toLowerCase();
    return this.projectEmails().filter(e =>
      (pFilter === 'all' || e.pillarId === pFilter) &&
      (!q || e.name.toLowerCase().includes(q) || (e.audienceSegment && e.audienceSegment.toLowerCase().includes(q)))
    );
  });

  protected displayedRepurposing = computed(() => {
    const q = this.search().toLowerCase();
    return this.projectRepurposing().filter(r =>
      (!q || r.title.toLowerCase().includes(q) || (r.notes && r.notes.toLowerCase().includes(q)))
    );
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const active = projects.filter(p => p.currentStage === 'MARKETING' || !!p.marketing);
        this.projects.set(active.map(p => this.mapProject(p)));

        const pages: PipelinePage[] = [];
        const tasks: CMTask[] = [];
        for (const p of active) {
          for (const pg of p.content?.pages ?? []) {
            pages.push({ pageId: pg.id, projectId: p.id, projectName: p.name, client: p.clientName, title: pg.title, slug: pg.slug ?? '', wordCount: pg.wordCount ?? 0, status: pg.status, pillarId: pg.pillarId });
          }
          for (const t of (p.marketing?.tasks ?? []).filter(t => t.category === 'CONTENT')) {
            tasks.push({ id: t.id, title: t.title, status: t.status, priority: t.priority ?? 'MEDIUM', projectName: p.name, client: p.clientName, projectId: p.id });
          }
        }
        this.allPages.set(pages);
        this.allTasks.set(tasks);
        
        // Auto-select first project to bootstrap the view
        if (active.length > 0) {
          this.onProjectChange(active[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  onProjectChange(projectId: string) {
    this.selectedProjectId.set(projectId);
    this.selectedPillarFilter.set('all');
    this.loadProjectDetails(projectId);
  }

  loadProjectDetails(projectId: string) {
    if (!projectId) {
      this.pillars.set([]);
      this.report.set(null);
      this.projectPages.set([]);
      this.projectEmails.set([]);
      this.projectRepurposing.set([]);
      this.calendarEvents.set([]);
      return;
    }

    this.loading.set(true);
    
    // Fetch pillars
    this.projectService.getPillars(projectId).subscribe({
      next: (res) => this.pillars.set(res)
    });

    // Fetch monthly report
    this.loadingReport.set(true);
    this.projectService.getMonthlyContentReport(projectId).subscribe({
      next: (res) => {
        this.report.set(res);
        this.loadingReport.set(false);
      },
      error: () => this.loadingReport.set(false)
    });

    // Fetch pages
    this.projectService.getContent(projectId).subscribe({
      next: (res) => {
        this.projectPages.set(res?.pages || []);
      }
    });

    // Fetch emails
    this.projectService.getEmailCampaigns(projectId).subscribe({
      next: (res) => this.projectEmails.set(res || [])
    });

    // Fetch repurposing
    this.projectService.getContentRepurposes(projectId).subscribe({
      next: (res) => this.projectRepurposing.set(res || [])
    });

    // Fetch calendar events
    this.projectService.getMasterCalendar(projectId).subscribe({
      next: (res) => {
        this.calendarEvents.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  createPillar() {
    const name = this.newPillarName().trim();
    const color = this.newPillarColor();
    const projId = this.selectedProjectId();
    if (!name || !projId) return;

    this.savingPillar.set(true);
    this.projectService.createPillar(projId, { name, color }).subscribe({
      next: (pillar) => {
        this.pillars.set([...this.pillars(), pillar]);
        this.newPillarName.set('');
        this.savingPillar.set(false);
        this.loadProjectDetails(projId);
      },
      error: () => this.savingPillar.set(false)
    });
  }

  deletePillar(pillarId: string) {
    const projId = this.selectedProjectId();
    if (!projId) return;

    if (confirm('Are you sure you want to delete this content pillar? Tagged pages and emails will be untagged.')) {
      this.projectService.deletePillar(projId, pillarId).subscribe({
        next: () => {
          this.pillars.set(this.pillars().filter(p => p.id !== pillarId));
          this.loadProjectDetails(projId);
        }
      });
    }
  }

  tagPageToPillar(pageId: string, pillarId: string) {
    const projId = this.selectedProjectId();
    if (!projId) return;

    const actualPillarId = pillarId === 'none' ? null : pillarId;

    this.projectService.updatePage(projId, pageId, { pillarId: actualPillarId } as any).subscribe({
      next: () => {
        this.projectPages.set(
          this.projectPages().map(pg => pg.id === pageId ? { ...pg, pillarId: actualPillarId || undefined } : pg)
        );
        // Refresh master report data
        this.projectService.getMonthlyContentReport(projId).subscribe(r => this.report.set(r));
      }
    });
  }

  tagEmailToPillar(campaignId: string, pillarId: string) {
    const projId = this.selectedProjectId();
    if (!projId) return;

    const actualPillarId = pillarId === 'none' ? null : pillarId;

    this.projectService.updateEmailCampaign(projId, campaignId, { pillarId: actualPillarId }).subscribe({
      next: () => {
        this.projectEmails.set(
          this.projectEmails().map(em => em.id === campaignId ? { ...em, pillarId: actualPillarId || undefined } : em)
        );
        // Refresh master report data
        this.projectService.getMonthlyContentReport(projId).subscribe(r => this.report.set(r));
      }
    });
  }

  downloadReportPdf() {
    const projId = this.selectedProjectId();
    const project = this.projects().find(p => p.id === projId);
    if (!projId) return;

    this.projectService.getMonthlyContentReportPdf(projId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly_Content_Report_${project ? project.name.replace(/\s+/g, '_') : projId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download report PDF:', err);
        alert('Failed to generate and download PDF report. Make sure ReportLab is configured on the backend.');
      }
    });
  }

  private mapProject(p: Project): CMProject {
    const mktTasks = (p.marketing?.tasks ?? []).filter(t => t.category === 'CONTENT');
    const pages = p.content?.pages ?? [];
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      contentTasksDone:  mktTasks.filter(t => t.status === 'DONE').length,
      contentTasksTotal: mktTasks.length,
      pagesApproved: pages.filter(pg => pg.status === 'APPROVED').length,
      pagesTotal:    pages.length,
      completedAt: p.marketing?.completedAt,
    };
  }

  protected pct(done: number, total: number): number {
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  protected statusLabel(s: string): string {
    if (s === 'IN_PROGRESS') return 'In Progress';
    if (s === 'IN_REVIEW') return 'In Review';
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
}
