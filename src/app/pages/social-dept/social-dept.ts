import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { IntegrationService } from '../../services/integration.service';
import { Project, SocialPost, SocialPlatform } from '../../models/project.models';

type TabId = 'projects' | 'composer' | 'calendar' | 'hashtags' | 'community' | 'performance' | 'tasks';
type Platform = 'Instagram' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'X';
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

const PLATFORM_ENUM: Record<Platform, SocialPlatform> = {
  Instagram: 'INSTAGRAM', TikTok: 'TIKTOK', Facebook: 'FACEBOOK', LinkedIn: 'LINKEDIN', X: 'X',
};
const ENUM_PLATFORM: Record<SocialPlatform, Platform> = {
  INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', X: 'X',
};

interface SocialProject {
  id: string; name: string; client: string; clientInitials: string;
  socialTasksDone: number; socialTasksTotal: number;
  channels: string; completedAt?: string;
}

interface SocialTask {
  id: string; title: string; status: string; priority: string;
  projectName: string; client: string; projectId: string;
}

interface CalPost {
  day: number; title: string; platform: Platform; status: PostStatus; projectName: string;
}

const PLATFORM_LIMIT: Record<Platform, number> = {
  Instagram: 2200, TikTok: 2200, Facebook: 63206, LinkedIn: 3000, X: 280,
};

const PLATFORM_COLOR: Record<Platform, string> = {
  Instagram: '#E1306C', TikTok: '#000000', Facebook: '#1877F2',
  LinkedIn: '#0A66C2', X: '#1DA1F2',
};

const PLATFORM_ICON: Record<Platform, string> = {
  Instagram: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  TikTok:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.91a8.19 8.19 0 004.79 1.53V7.01a4.85 4.85 0 01-1.02-.32z"/></svg>`,
  Facebook:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.029 4.388 11.027 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.67 4.533-4.67 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.1 24 18.102 24 12.073z"/></svg>`,
  LinkedIn:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  X:         `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.264 5.633 5.9-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
};

const HASHTAG_SETS: { name: string; tags: string[] }[] = [
  { name: 'General Business',   tags: ['#marketing', '#business', '#entrepreneur', '#socialmedia', '#branding', '#digital', '#growth', '#strategy', '#success', '#startup', '#smallbusiness', '#content', '#innovation', '#leadership', '#productivity'] },
  { name: 'Fashion & Lifestyle', tags: ['#fashion', '#style', '#ootd', '#lifestyle', '#beauty', '#luxury', '#trends', '#instafashion', '#fashionblogger', '#outfitoftheday', '#aesthetics', '#design', '#minimal', '#chic', '#editorial'] },
  { name: 'Tech & SaaS',        tags: ['#tech', '#technology', '#saas', '#software', '#ai', '#machinelearning', '#startup', '#developer', '#coding', '#cloud', '#automation', '#productdesign', '#ux', '#innovation', '#digitaltransformation'] },
  { name: 'Healthcare',         tags: ['#health', '#wellness', '#healthcare', '#medical', '#mentalhealth', '#fitness', '#nutrition', '#wellbeing', '#selfcare', '#healthylifestyle', '#medicine', '#patientcare', '#healthtech', '#prevention', '#mindfulness'] },
  { name: 'Food & Hospitality', tags: ['#food', '#foodie', '#restaurant', '#chef', '#cuisine', '#hospitality', '#foodphotography', '#yummy', '#instafood', '#dining', '#gastronomy', '#eatout', '#localfood', '#culinary', '#foodlover'] },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'X'];

@Component({
  selector: 'app-social-dept',
  imports: [RouterLink, Badge, DatePipe],
  template: `
    <div class="sm-page">

      <!-- Header -->
      <div class="sm-header">
        <div class="sm-header-left">
          <div class="dept-badge" aria-hidden="true">SM</div>
          <div>
            <h2 class="sm-title">Social Media</h2>
            <p class="sm-sub">Product Growth · Organic Social · {{ projects().length }} projects</p>
          </div>
        </div>
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
            [value]="search()" (input)="search.set($any($event.target).value)" />
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-strip" role="list" aria-label="Social media summary">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div><div class="kpi-val">{{ k.value() }}</div><div class="kpi-lbl">{{ k.label }}</div></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Social media sections">
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

        <!-- ── Projects tab ── -->
        @if (activeTab() === 'projects') {
          <div class="project-grid" role="list" aria-label="Social media projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="proj-card" role="listitem">
                <div class="proj-top">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div class="proj-info">
                    <span class="proj-name">{{ p.name }}</span>
                    <span class="proj-client">{{ p.client }}</span>
                  </div>
                  @if (p.completedAt) { <ui-badge variant="success">Complete</ui-badge> }
                  @else { <ui-badge variant="success">Active</ui-badge> }
                </div>
                @if (p.channels) {
                  <div class="channels-row">
                    @for (ch of splitChannels(p.channels); track ch) {
                      <span class="channel-chip">{{ ch }}</span>
                    }
                  </div>
                }
                <div class="proj-stat">
                  <div class="stat-top">
                    <span class="stat-label">Social Tasks</span>
                    <span class="stat-val">{{ p.socialTasksDone }}/{{ p.socialTasksTotal }}</span>
                  </div>
                  @if (p.socialTasksTotal > 0) {
                    <div class="mini-bar" role="progressbar"
                      [attr.aria-valuenow]="pct(p.socialTasksDone, p.socialTasksTotal)"
                      aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill" [style.width.%]="pct(p.socialTasksDone, p.socialTasksTotal)"></div>
                    </div>
                  }
                </div>
                <a class="proj-link" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open project →</a>
              </article>
            } @empty {
              <div class="empty">No projects in social media stage yet.</div>
            }
          </div>
        }

        <!-- ── Composer tab ── -->
        @if (activeTab() === 'composer') {
          <section class="tab-panel" aria-label="Post composer">
            <div class="composer-card">

              <!-- Platform selector -->
              <div class="composer-section-label">Platform</div>
              <div class="platform-tabs" role="group" aria-label="Select platform">
                @for (p of allPlatforms; track p) {
                  <button class="plat-btn" [class.active]="composerPlatform() === p"
                    [style.--plat-color]="platformColor(p)"
                    (click)="composerPlatform.set(p)"
                    [attr.aria-pressed]="composerPlatform() === p">
                    <span [innerHTML]="platformIcon(p)" aria-hidden="true"></span>
                    {{ p }}
                  </button>
                }
              </div>

              <!-- AI caption writer -->
              <div class="ai-writer">
                <div class="composer-section-label">✨ AI caption writer</div>
                <div class="ai-writer-row">
                  <input class="ai-topic-input" type="text"
                    placeholder="What is this post about? e.g. announcing our summer veg box"
                    [value]="aiTopic()" (input)="aiTopic.set($any($event.target).value)"
                    [disabled]="aiWriting()"
                    aria-label="Post topic for AI caption writer" />
                  <button class="btn-primary" (click)="writeAiCaptions()"
                    [disabled]="aiWriting() || aiTopic().trim().length < 3 || !composerProjectId()">
                    @if (aiWriting()) { Writing… } @else { Write captions }
                  </button>
                </div>
                @if (!composerProjectId()) {
                  <div class="ai-writer-hint">Select a project below first — captions are written in that client's brand voice.</div>
                }
                @if (aiCaptionError()) { <div class="ai-writer-error" role="alert">{{ aiCaptionError() }}</div> }
                @if (aiHashtags().length > 0) {
                  <div class="ai-ht-row" aria-label="Suggested hashtags">
                    @for (tag of aiHashtags(); track tag) {
                      <span class="ai-ht-chip">{{ tag }}</span>
                    }
                    <button class="ai-ht-insert" (click)="insertAiHashtags()">Insert into caption</button>
                  </div>
                }
              </div>

              <!-- Variant + char counter -->
              <div class="variant-row">
                <span class="composer-section-label" style="margin-bottom:0">Caption variant</span>
                <div class="variant-toggle" role="group" aria-label="Caption variant">
                  <button class="var-btn" [class.active]="composerVariant() === 'A'"
                    (click)="composerVariant.set('A')" [attr.aria-pressed]="composerVariant() === 'A'">A</button>
                  <button class="var-btn" [class.active]="composerVariant() === 'B'"
                    (click)="composerVariant.set('B')" [attr.aria-pressed]="composerVariant() === 'B'">B</button>
                </div>
                <span class="char-meter" [class.char-warn]="charWarn()" [class.char-over]="charOver()"
                  [attr.aria-label]="charCount() + ' of ' + charLimit() + ' characters'">
                  {{ charCount() }} / {{ charLimit() }}
                </span>
              </div>

              <!-- Caption textarea -->
              <div class="caption-wrap">
                <textarea class="caption-input"
                  rows="7"
                  [placeholder]="'Write your ' + composerPlatform() + ' caption…'"
                  [value]="activeCaption()"
                  (input)="updateCaption($any($event.target).value)"
                  [attr.aria-label]="composerPlatform() + ' caption — variant ' + composerVariant()">
                </textarea>
                @if (charOver()) {
                  <div class="char-over-msg" role="alert">
                    {{ charCount() - charLimit() }} characters over the {{ composerPlatform() }} limit
                  </div>
                }
                <!-- char bar -->
                <div class="char-bar" aria-hidden="true">
                  <div class="char-bar-fill"
                    [style.width.%]="charPct()"
                    [class.char-bar-warn]="charWarn()"
                    [class.char-bar-over]="charOver()"></div>
                </div>
              </div>

              <!-- Project + schedule + save -->
              <div class="composer-footer">
                <select class="proj-select" [value]="composerProjectId()"
                  (change)="selectComposerProject($any($event.target).value)"
                  aria-label="Assign to project">
                  <option value="">— Assign to project —</option>
                  @for (p of projects(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
                <input class="schedule-input" type="datetime-local" [value]="scheduleAt()"
                  (input)="scheduleAt.set($any($event.target).value)" aria-label="Schedule time (optional)" />
                <div class="composer-actions">
                  @if (draftSaved()) {
                    <span class="save-ok" role="status">{{ savedMsg() }}</span>
                  }
                  @if (composerError()) { <span class="ai-writer-error" role="alert">{{ composerError() }}</span> }
                  <button class="btn-secondary" (click)="clearComposer()">Clear</button>
                  <button class="btn-primary" (click)="saveDraft()" [disabled]="composerSaving() || !composerProjectId() || !activeCaption().trim()">
                    @if (composerSaving()) { Saving… } @else if (scheduleAt()) { Schedule } @else { Save Draft }
                  </button>
                </div>
              </div>
            </div>

            <!-- Saved posts for the selected project -->
            @if (composerProjectId()) {
              <div class="posts-card">
                <div class="ht-quick-title">Posts — {{ projectName(composerProjectId()) }}</div>
                @if (postsLoading()) {
                  <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading posts…</div>
                } @else {
                  <div class="posts-list" role="list">
                    @for (post of posts(); track post.id) {
                      <div class="post-row" role="listitem">
                        <span class="post-plat" [style.color]="platformColor(enumPlatform(post.platform))" [innerHTML]="platformIcon(enumPlatform(post.platform))" aria-hidden="true"></span>
                        <span class="post-caption">{{ post.caption }}</span>
                        <span class="post-when">
                          @if (post.publishedAt) { {{ post.publishedAt | date:'MMM d, HH:mm' }} }
                          @else if (post.scheduledAt) { {{ post.scheduledAt | date:'MMM d, HH:mm' }} }
                          @else { — }
                        </span>
                        <span class="post-status" [attr.data-s]="post.status">{{ post.status }}</span>
                        <div class="post-actions">
                          @if (post.status === 'DRAFT' || post.status === 'SCHEDULED' || post.status === 'FAILED') {
                            @if (canPublish(post.platform)) {
                              <button class="btn-mini" (click)="publishNow(post)" [disabled]="publishingId() === post.id">
                                @if (publishingId() === post.id) { Publishing… } @else { Publish now }
                              </button>
                            }
                            <button class="btn-mini danger" (click)="deletePost(post)">Delete</button>
                          }
                          @if (post.externalUrl) { <a class="btn-mini" [href]="post.externalUrl" target="_blank" rel="noopener">View</a> }
                        </div>
                        @if (post.errorMessage) { <span class="post-error">{{ post.errorMessage }}</span> }
                      </div>
                    } @empty {
                      <div class="empty-state">No posts yet for this project.</div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Quick hashtag insert -->
            <div class="ht-quick-card">
              <div class="ht-quick-title">Quick-insert hashtags into caption</div>
              <div class="ht-quick-sets">
                @for (set of hashtagSets; track set.name) {
                  <button class="hq-btn" (click)="appendHashtags(set)"
                    [attr.aria-label]="'Insert ' + set.name + ' hashtags into caption'">
                    {{ set.name }}
                    <span class="hq-count">{{ set.tags.length }}</span>
                  </button>
                }
              </div>
            </div>
          </section>
        }

        <!-- ── Calendar tab ── -->
        @if (activeTab() === 'calendar') {
          <section class="tab-panel" aria-label="Content calendar">
            <div class="cal-header">
              <span class="cal-month-name">{{ calMonthName }}</span>
              <div class="plat-legend" aria-label="Platform legend">
                @for (p of allPlatforms; track p) {
                  <span class="legend-item">
                    <span class="legend-dot" [style.background]="platformColor(p)" aria-hidden="true"></span>
                    <span>{{ p }}</span>
                  </span>
                }
              </div>
            </div>

            <div class="cal-grid" role="grid" [attr.aria-label]="calMonthName + ' content calendar'">
              <!-- Weekday headers -->
              @for (d of weekdays; track d) {
                <div class="cal-weekday" role="columnheader">{{ d }}</div>
              }
              <!-- Day cells -->
              @for (cell of calDays(); track $index) {
                <div class="cal-cell"
                  [class.cal-today]="cell.isToday"
                  [class.cal-empty]="!cell.day"
                  role="gridcell"
                  [attr.aria-label]="cell.day ? (calMonthName + ' ' + cell.day) : null">
                  @if (cell.day) {
                    <span class="cal-day-num" [class.today-num]="cell.isToday">{{ cell.day }}</span>
                    <div class="cal-posts-stack">
                      @for (post of cell.posts.slice(0, 3); track post.title) {
                        <div class="cal-pill"
                          [style.background]="platformColor(post.platform) + '1A'"
                          [style.color]="platformColor(post.platform)"
                          [title]="post.title + ' · ' + post.projectName">
                          <span class="pill-abbr">{{ post.platform.slice(0, 2) }}</span>
                          <span class="pill-text">{{ post.title }}</span>
                        </div>
                      }
                      @if (cell.posts.length > 3) {
                        <div class="cal-more">+{{ cell.posts.length - 3 }}</div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            @if (calPosts().length === 0) {
              <div class="empty-state">No scheduled posts yet. Save drafts in the Composer or add SOCIAL tasks in a project's Marketing workspace.</div>
            } @else if (!hasRealPosts()) {
              <p class="ht-intro">Showing a task-derived view — save real posts in the Composer to populate the calendar from actual scheduled content.</p>
            }
          </section>
        }

        <!-- ── Hashtags tab ── -->
        @if (activeTab() === 'hashtags') {
          <section class="tab-panel" aria-label="Hashtag sets">
            <p class="ht-intro">Click any tag to copy it, or copy an entire set. Use "Insert" to add a set directly into the Composer.</p>
            <div class="ht-grid">
              @for (set of hashtagSets; track set.name) {
                <div class="ht-card">
                  <div class="ht-card-header">
                    <span class="ht-name">{{ set.name }}</span>
                    <div class="ht-card-actions">
                      <button class="ht-insert-btn" (click)="appendHashtagsAndGoComposer(set)"
                        [attr.aria-label]="'Insert ' + set.name + ' into composer'">
                        Insert
                      </button>
                      <button class="ht-copy-btn"
                        [class.copied]="copiedSet() === set.name"
                        (click)="copyHashtagSet(set)"
                        [attr.aria-label]="'Copy all ' + set.name + ' hashtags'">
                        @if (copiedSet() === set.name) { ✓ Copied }
                        @else { Copy all }
                      </button>
                    </div>
                  </div>
                  <div class="ht-tags" role="list" [attr.aria-label]="set.name + ' hashtags'">
                    @for (tag of set.tags; track tag) {
                      <button class="ht-tag" role="listitem" (click)="copyTag(tag)"
                        [attr.aria-label]="'Copy ' + tag">{{ tag }}</button>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- ── Community Queue tab ── -->
        @if (activeTab() === 'community') {
          <section aria-label="Community Management Queue" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0;">Community Management Queue</h3>
                <p style="font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0;">Log & assign incoming comments, DMs, and engagement inquiries requiring response.</p>
              </div>
              <ui-badge variant="info">2 Needs Response</ui-badge>
            </div>

            <div style="display: grid; grid-template-columns: 120px 140px 1fr 140px 120px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--color-text-muted);">
              <span>Platform</span><span>User Handle</span><span>Comment / Message</span><span>Assigned To</span><span>Status</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: grid; grid-template-columns: 120px 140px 1fr 140px 120px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px;">
                <span style="font-size: 12px; font-weight: 600; color: #E1306C;">Instagram</span>
                <span style="font-size: 12.5px; font-weight: 500;">&#64;fashion_lover</span>
                <span style="font-size: 12.5px; color: var(--color-text);">"When will the summer collection restock be available?"</span>
                <span style="font-size: 12px; color: var(--color-text-muted);">Support Team</span>
                <ui-badge variant="warning">Needs Response</ui-badge>
              </div>
              <div style="display: grid; grid-template-columns: 120px 140px 1fr 140px 120px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px;">
                <span style="font-size: 12px; font-weight: 600; color: #0A66C2;">LinkedIn</span>
                <span style="font-size: 12.5px; font-weight: 500;">John Smith</span>
                <span style="font-size: 12.5px; color: var(--color-text);">"Great insights! Are you open to enterprise partnerships?"</span>
                <span style="font-size: 12px; color: var(--color-text-muted);">Sales Lead</span>
                <ui-badge variant="info">In Progress</ui-badge>
              </div>
            </div>
          </section>
        }

        <!-- ── Social Performance Tracker tab ── -->
        @if (activeTab() === 'performance') {
          <section aria-label="Social Performance Tracker" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 14px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0;">Social Performance Tracker</h3>
              <p style="font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0;">Reach, impressions, engagement rates, and follower growth trends by channel.</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
              <div style="padding: 12px; background: #FDF2F8; border: 1px solid #FBCFE8; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #E1306C;">Instagram</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-top: 4px;">45.2K</div>
                <div style="font-size: 11px; color: #059669;">+12.4% Reach (30d)</div>
              </div>
              <div style="padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #000;">TikTok</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-top: 4px;">128.5K</div>
                <div style="font-size: 11px; color: #059669;">+28.1% Views (30d)</div>
              </div>
              <div style="padding: 12px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #1877F2;">Facebook</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-top: 4px;">18.9K</div>
                <div style="font-size: 11px; color: #059669;">+4.2% Likes (30d)</div>
              </div>
              <div style="padding: 12px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #0A66C2;">LinkedIn</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-top: 4px;">8.4K</div>
                <div style="font-size: 11px; color: #059669;">+15.8% Clicks (30d)</div>
              </div>
              <div style="padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #1DA1F2;">X / Twitter</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-top: 4px;">14.1K</div>
                <div style="font-size: 11px; color: #059669;">+8.7% Retweets (30d)</div>
              </div>
            </div>
          </section>
        }

        <!-- ── Tasks tab ── -->
        @if (activeTab() === 'tasks') {
          <div class="filter-row" role="group" aria-label="Filter by status">
            @for (f of taskFilters; track f.value) {
              <button class="ftab" [class.active]="taskFilter() === f.value" (click)="taskFilter.set(f.value)">
                {{ f.label }} <span class="ftab-count">{{ f.count() }}</span>
              </button>
            }
          </div>

          <div class="task-header" aria-hidden="true">
            <span>Task</span><span>Project</span><span>Priority</span><span>Status</span>
          </div>
          <div class="task-list" role="list" aria-label="Social media tasks">
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
              <div class="empty-state">No social tasks yet. Add SOCIAL-category tasks in the Marketing workspace.</div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .sm-page { display: flex; flex-direction: column; gap: 16px; }

    /* Header */
    .sm-header { display: flex; align-items: center; justify-content: space-between; }
    .sm-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #EC4899; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .sm-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .sm-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #EC4899; }

    /* KPIs */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    /* Tabs */
    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #EC4899; border-bottom-color: #EC4899; }
    .tab-count { background: #FCE7F3; color: #BE185D; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #EC4899; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Tab panels */
    .tab-panel { display: flex; flex-direction: column; gap: 16px; }

    /* Projects */
    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .proj-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .proj-card:hover { box-shadow: var(--shadow-raised); }
    .proj-top { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .proj-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .proj-name { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .proj-client { font-size: 12px; color: var(--color-text-muted); }
    .channels-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .channel-chip { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #FCE7F3; color: #BE185D; }
    .proj-stat { display: flex; flex-direction: column; gap: 4px; }
    .stat-top { display: flex; justify-content: space-between; align-items: center; }
    .stat-label { font-size: 11.5px; color: var(--color-text-muted); }
    .stat-val { font-size: 13px; font-weight: 700; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #EC4899; border-radius: 4px; }
    .proj-link { font-size: 12.5px; font-weight: 500; color: #EC4899; text-decoration: none; }
    .proj-link:hover { text-decoration: underline; }
    .empty { grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 13.5px; }

    /* Composer */
    .composer-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: var(--shadow-card); }
    .composer-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); margin-bottom: 6px; }
    .platform-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .plat-btn { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .plat-btn:hover { border-color: var(--plat-color, #EC4899); color: var(--plat-color, #EC4899); }
    .plat-btn.active { border-color: var(--plat-color, #EC4899); color: var(--plat-color, #EC4899); background: color-mix(in srgb, var(--plat-color, #EC4899) 10%, transparent); font-weight: 600; }
    /* AI caption writer */
    .ai-writer { display: flex; flex-direction: column; gap: 8px; padding: 14px; background: #FDF2F8; border: 1px solid #FBCFE8; border-radius: var(--radius-md); }
    .ai-writer-row { display: flex; gap: 8px; }
    .ai-topic-input { flex: 1; height: 34px; padding: 0 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .ai-topic-input:focus { border-color: #EC4899; }
    .ai-writer-hint { font-size: 11.5px; color: var(--color-text-muted); }
    .ai-writer-error { font-size: 12px; color: #DC2626; font-weight: 500; }
    .ai-ht-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .ai-ht-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 10px; background: #FCE7F3; color: #BE185D; }
    .ai-ht-insert { height: 26px; padding: 0 10px; border: 1px solid #EC4899; border-radius: 13px; background: transparent; color: #BE185D; font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .ai-ht-insert:hover { background: #EC4899; color: #fff; }

    .variant-row { display: flex; align-items: center; gap: 10px; }
    .variant-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; }
    .var-btn { width: 34px; height: 28px; border: none; background: transparent; font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; transition: background 0.12s, color 0.12s; }
    .var-btn.active { background: #EC4899; color: #fff; }
    .char-meter { margin-left: auto; font-size: 11.5px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .char-meter.char-warn { color: #D97706; }
    .char-meter.char-over { color: #DC2626; font-weight: 600; }
    .caption-wrap { display: flex; flex-direction: column; gap: 6px; }
    .caption-input { width: 100%; padding: 12px 14px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13.5px; color: var(--color-text); background: var(--color-surface); resize: vertical; outline: none; line-height: 1.6; box-sizing: border-box; }
    .caption-input:focus { border-color: #EC4899; }
    .char-over-msg { font-size: 11.5px; color: #DC2626; font-weight: 500; }
    .char-bar { height: 3px; background: var(--color-surface-raised); border-radius: 3px; overflow: hidden; }
    .char-bar-fill { height: 100%; background: #EC4899; border-radius: 3px; transition: width 0.2s; }
    .char-bar-fill.char-bar-warn { background: #D97706; }
    .char-bar-fill.char-bar-over { background: #DC2626; }
    .composer-footer { display: flex; align-items: center; gap: 10px; }
    .proj-select { flex: 1; height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; cursor: pointer; }
    .proj-select:focus { border-color: #EC4899; }
    .composer-actions { display: flex; align-items: center; gap: 8px; }
    .save-ok { font-size: 12px; font-weight: 600; color: #16A34A; }
    .btn-primary { height: 34px; padding: 0 16px; background: #EC4899; color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-primary:hover { opacity: 0.88; }
    .btn-secondary { height: 34px; padding: 0 14px; background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.12s; }
    .btn-secondary:hover { background: var(--color-surface-raised); }
    .ht-quick-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; }
    .ht-quick-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); margin-bottom: 10px; }
    .ht-quick-sets { display: flex; flex-wrap: wrap; gap: 6px; }
    .hq-btn { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .hq-btn:hover { border-color: #EC4899; color: #BE185D; background: #FDF2F8; }
    .hq-count { font-size: 10.5px; font-weight: 700; color: var(--color-text-muted); }
    .schedule-input { height: 34px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .schedule-input:focus { border-color: #EC4899; }
    .posts-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .posts-list { display: flex; flex-direction: column; gap: 6px; }
    .post-row { display: grid; grid-template-columns: 24px 1fr 110px 90px auto; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .post-plat { display: flex; align-items: center; }
    .post-caption { font-size: 12.5px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .post-when { font-size: 11.5px; color: var(--color-text-muted); }
    .post-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); text-align: center; }
    .post-status[data-s="PUBLISHED"] { background: #ECFDF5; color: #059669; }
    .post-status[data-s="SCHEDULED"] { background: #EFF6FF; color: #2563EB; }
    .post-status[data-s="PUBLISHING"] { background: #FEF3C7; color: #D97706; }
    .post-status[data-s="FAILED"] { background: #FEE2E2; color: #DC2626; }
    .post-actions { display: flex; gap: 6px; }
    .btn-mini { height: 26px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: transparent; font-family: var(--font-sans); font-size: 11px; font-weight: 600; color: var(--color-text-secondary); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
    .btn-mini:hover { border-color: #EC4899; color: #BE185D; }
    .btn-mini.danger:hover { border-color: #DC2626; color: #DC2626; }
    .post-error { grid-column: 1 / -1; font-size: 11px; color: #DC2626; }

    /* Calendar */
    .cal-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .cal-month-name { font-size: 15px; font-weight: 600; color: var(--color-text); }
    .plat-legend { display: flex; gap: 12px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--color-text-secondary); }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--color-border); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .cal-weekday { background: var(--color-surface-raised); padding: 8px 0; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .cal-cell { background: var(--color-surface); min-height: 88px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
    .cal-cell.cal-empty { background: var(--color-surface-raised); }
    .cal-cell.cal-today { background: #FDF2F8; }
    .cal-day-num { font-size: 12px; font-weight: 600; color: var(--color-text-muted); align-self: flex-start; }
    .cal-day-num.today-num { width: 22px; height: 22px; background: #EC4899; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11.5px; }
    .cal-posts-stack { display: flex; flex-direction: column; gap: 2px; }
    .cal-pill { display: flex; align-items: center; gap: 3px; padding: 2px 5px; border-radius: 4px; font-size: 10px; overflow: hidden; cursor: default; }
    .pill-abbr { font-weight: 700; flex-shrink: 0; }
    .pill-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cal-more { font-size: 10px; color: var(--color-text-muted); padding-left: 2px; }

    /* Hashtags */
    .ht-intro { font-size: 13px; color: var(--color-text-muted); }
    .ht-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .ht-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-card); }
    .ht-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); }
    .ht-name { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .ht-card-actions { display: flex; gap: 6px; }
    .ht-insert-btn { height: 26px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); background: transparent; cursor: pointer; transition: all 0.12s; }
    .ht-insert-btn:hover { border-color: #EC4899; color: #BE185D; }
    .ht-copy-btn { height: 26px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); background: transparent; cursor: pointer; transition: all 0.12s; }
    .ht-copy-btn:hover { border-color: #EC4899; color: #BE185D; }
    .ht-copy-btn.copied { background: #ECFDF5; border-color: #16A34A; color: #16A34A; }
    .ht-tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 16px; }
    .ht-tag { font-size: 11.5px; font-weight: 500; padding: 3px 9px; border-radius: 12px; background: #FCE7F3; color: #BE185D; border: none; cursor: pointer; transition: background 0.12s; font-family: var(--font-sans); }
    .ht-tag:hover { background: #EC4899; color: #fff; }

    /* Tasks */
    .filter-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .ftab { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .ftab:hover { border-color: #EC4899; color: #BE185D; }
    .ftab.active { background: #EC4899; color: #fff; border-color: #EC4899; }
    .ftab-count { font-size: 10.5px; font-weight: 700; }
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
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }
  `]
})
export class SocialDept implements OnInit {
  private projectService = inject(ProjectService);

  protected search        = signal('');
  protected activeTab     = signal<TabId>('projects');
  protected taskFilter    = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading       = signal(true);
  protected projects      = signal<SocialProject[]>([]);
  protected allTasks      = signal<SocialTask[]>([]);

  // Composer
  protected composerPlatform  = signal<Platform>('Instagram');
  protected composerVariant   = signal<'A' | 'B'>('A');
  protected captionA          = signal('');
  protected captionB          = signal('');
  protected composerProjectId = signal('');
  protected draftSaved        = signal(false);
  protected savedMsg          = signal('Draft saved');
  protected scheduleAt        = signal('');
  protected composerSaving    = signal(false);
  protected composerError     = signal<string | null>(null);

  // Real posts
  private integrationService  = inject(IntegrationService);
  protected posts             = signal<SocialPost[]>([]);
  protected allProjectPosts   = signal<SocialPost[]>([]); // across all projects, for the calendar
  protected postsLoading      = signal(false);
  protected publishingId      = signal('');
  protected metaConnected     = signal(false);
  protected tiktokConnected   = signal(false);

  // Hashtags
  protected copiedSet = signal<string | null>(null);

  // AI caption writer
  protected aiTopic        = signal('');
  protected aiWriting      = signal(false);
  protected aiCaptionError = signal<string | null>(null);
  protected aiHashtags     = signal<string[]>([]);

  // Date context — derived once, not reactive
  private readonly _now = new Date();
  protected readonly calYear      = this._now.getFullYear();
  protected readonly calMonth     = this._now.getMonth();
  protected readonly calToday     = this._now.getDate();
  protected readonly calMonthName = this._now.toLocaleString('default', { month: 'long', year: 'numeric' });
  protected readonly weekdays     = WEEKDAYS;
  protected readonly allPlatforms = ALL_PLATFORMS;
  protected readonly hashtagSets  = HASHTAG_SETS;

  readonly tabs = [
    { id: 'projects'    as TabId, label: 'Projects',        count: computed(() => this.projects().length) },
    { id: 'composer'    as TabId, label: 'Composer',        count: computed(() => 0) },
    { id: 'calendar'    as TabId, label: 'Calendar',        count: computed(() => this.calPosts().length) },
    { id: 'community'   as TabId, label: 'Community Queue', count: computed(() => 2) },
    { id: 'performance' as TabId, label: 'Performance',     count: computed(() => 5) },
    { id: 'hashtags'    as TabId, label: 'Hashtags',        count: computed(() => 0) },
    { id: 'tasks'       as TabId, label: 'Tasks',           count: computed(() => this.allTasks().length) },
  ];

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    { label: 'Active',         value: computed(() => this.projects().filter(p => !p.completedAt).length), bg: '#EC4899', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2H3v16h5v4l4-4h9V2z"/></svg>` },
    { label: 'Completed',      value: computed(() => this.projects().filter(p => !!p.completedAt).length), bg: '#22C55E', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` },
    { label: 'Social Tasks',   value: computed(() => `${this.allTasks().filter(t => t.status === 'DONE').length}/${this.allTasks().length}`), bg: '#8B5CF6', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
    { label: 'Total Projects',  value: computed(() => this.projects().length), bg: '#F97316', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
  ];

  // Composer computed
  protected activeCaption = computed(() =>
    this.composerVariant() === 'A' ? this.captionA() : this.captionB()
  );
  protected charLimit = computed(() => PLATFORM_LIMIT[this.composerPlatform()]);
  protected charCount = computed(() => this.activeCaption().length);
  protected charPct   = computed(() => Math.min(100, Math.round((this.charCount() / this.charLimit()) * 100)));
  protected charWarn  = computed(() => this.charPct() >= 80 && this.charCount() <= this.charLimit());
  protected charOver  = computed(() => this.charCount() > this.charLimit());

  // Calendar computed — real posts win, task-derived view is the fallback
  protected hasRealPosts = computed(() =>
    this.allProjectPosts().some(p => p.scheduledAt || p.publishedAt),
  );

  protected calPosts = computed((): CalPost[] => {
    if (this.hasRealPosts()) {
      return this.allProjectPosts()
        .filter(p => p.scheduledAt || p.publishedAt)
        .map(p => {
          const when = new Date(p.publishedAt ?? p.scheduledAt!);
          return {
            day: when.getFullYear() === this.calYear && when.getMonth() === this.calMonth ? when.getDate() : -1,
            title: p.caption.slice(0, 60),
            platform: ENUM_PLATFORM[p.platform],
            status: (p.status === 'PUBLISHED' ? 'PUBLISHED' : p.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT') as PostStatus,
            projectName: this.projectName(p.projectId),
          };
        })
        .filter(p => p.day > 0);
    }
    const tasks = this.allTasks();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const plats: Platform[] = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'X'];
    return tasks.slice(0, 18).map((t, i) => ({
      day: ((i * 4 + 3) % daysInMonth) + 1,
      title: t.title,
      platform: plats[i % plats.length],
      status: t.status === 'DONE' ? 'PUBLISHED' : t.status === 'IN_PROGRESS' ? 'SCHEDULED' : 'DRAFT',
      projectName: t.projectName,
    }));
  });

  protected calDays = computed(() => {
    const firstDay   = new Date(this.calYear, this.calMonth, 1).getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const posts = this.calPosts();
    const days: { day: number | null; posts: CalPost[]; isToday: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, posts: [], isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isToday: d === this.calToday, posts: posts.filter(p => p.day === d) });
    }
    return days;
  });

  // Filtered lists
  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p => !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  });

  protected displayedTasks = computed(() => {
    const f = this.taskFilter();
    const q = this.search().toLowerCase();
    return this.allTasks().filter(t =>
      (f === 'all' || t.status === f) &&
      (!q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.integrationService.getIntegrations().subscribe({
      next: (res) => {
        this.metaConnected.set(res.integrations.some(i => i.provider === 'META' && i.status === 'CONNECTED'));
        this.tiktokConnected.set(res.integrations.some(i => i.provider === 'TIKTOK' && i.status === 'CONNECTED'));
      },
      error: () => {},
    });
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const active = projects.filter(p => p.currentStage === 'MARKETING' || !!p.marketing);
        this.projects.set(active.map(p => this.mapProject(p)));
        const tasks: SocialTask[] = [];
        for (const p of active) {
          for (const t of (p.marketing?.tasks ?? []).filter(t => t.category === 'SOCIAL')) {
            tasks.push({ id: t.id, title: t.title, status: t.status, priority: t.priority ?? 'MEDIUM', projectName: p.name, client: p.clientName, projectId: p.id });
          }
        }
        this.allTasks.set(tasks);
        this.loading.set(false);
        // Load real posts across projects for the calendar
        for (const p of active) {
          this.projectService.getSocialPosts(p.id).subscribe({
            next: (res) => this.allProjectPosts.update(all => [...all.filter(x => x.projectId !== p.id), ...res.posts]),
            error: () => {},
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected projectName(id: string): string {
    return this.projects().find(p => p.id === id)?.name ?? '';
  }

  protected enumPlatform(p: SocialPlatform): Platform { return ENUM_PLATFORM[p]; }

  /** Publish-now available only for platforms with a connected integration. */
  protected canPublish(platform: SocialPlatform): boolean {
    if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') return this.metaConnected();
    if (platform === 'TIKTOK') return this.tiktokConnected();
    return false;
  }

  protected selectComposerProject(id: string) {
    this.composerProjectId.set(id);
    this.posts.set([]);
    if (!id) return;
    this.postsLoading.set(true);
    this.projectService.getSocialPosts(id).subscribe({
      next: (res) => { this.posts.set(res.posts); this.postsLoading.set(false); },
      error: () => this.postsLoading.set(false),
    });
  }

  protected publishNow(post: SocialPost) {
    this.publishingId.set(post.id);
    this.projectService.publishSocialPost(post.projectId, post.id).subscribe({
      next: (res) => {
        this.posts.update(list => list.map(p => (p.id === res.post.id ? res.post : p)));
        this.allProjectPosts.update(list => list.map(p => (p.id === res.post.id ? res.post : p)));
        this.publishingId.set('');
      },
      error: (err) => {
        this.composerError.set(err?.error?.error ?? 'Publishing failed.');
        this.publishingId.set('');
        this.selectComposerProject(post.projectId); // refresh — post may be FAILED with a message
      },
    });
  }

  protected deletePost(post: SocialPost) {
    this.projectService.deleteSocialPost(post.projectId, post.id).subscribe({
      next: () => {
        this.posts.update(list => list.filter(p => p.id !== post.id));
        this.allProjectPosts.update(list => list.filter(p => p.id !== post.id));
      },
      error: () => {},
    });
  }

  private mapProject(p: Project): SocialProject {
    const social = (p.marketing?.tasks ?? []).filter(t => t.category === 'SOCIAL');
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      socialTasksDone:  social.filter(t => t.status === 'DONE').length,
      socialTasksTotal: social.length,
      channels: p.marketing?.channels ?? '',
      completedAt: p.marketing?.completedAt,
    };
  }

  protected platformColor(p: Platform): string { return PLATFORM_COLOR[p]; }
  protected platformIcon(p: Platform): string  { return PLATFORM_ICON[p]; }

  protected updateCaption(value: string): void {
    if (this.composerVariant() === 'A') this.captionA.set(value);
    else this.captionB.set(value);
  }

  protected writeAiCaptions(): void {
    const projectId = this.composerProjectId();
    if (!projectId) return;
    this.aiCaptionError.set(null);
    this.aiWriting.set(true);
    this.projectService.generateAiCaptions(projectId, {
      platform: this.composerPlatform(),
      topic: this.aiTopic().trim(),
    }).subscribe({
      next: (res) => {
        this.captionA.set(res.variantA);
        this.captionB.set(res.variantB);
        this.aiHashtags.set(res.hashtags);
        this.aiWriting.set(false);
      },
      error: (err) => {
        this.aiCaptionError.set(err?.error?.error ?? 'Caption writing failed. Please try again.');
        this.aiWriting.set(false);
      },
    });
  }

  protected insertAiHashtags(): void {
    const toAppend = (this.activeCaption().length > 0 ? '\n\n' : '') + this.aiHashtags().join(' ');
    if (this.composerVariant() === 'A') this.captionA.update(v => v + toAppend);
    else this.captionB.update(v => v + toAppend);
  }

  protected saveDraft(): void {
    const projectId = this.composerProjectId();
    const caption = this.activeCaption().trim();
    if (!projectId || !caption) return;

    const scheduledAt = this.scheduleAt() ? new Date(this.scheduleAt()).toISOString() : null;
    this.composerError.set(null);
    this.composerSaving.set(true);
    this.projectService.createSocialPost(projectId, {
      platform: PLATFORM_ENUM[this.composerPlatform()],
      caption,
      scheduledAt,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
    }).subscribe({
      next: (res) => {
        this.posts.update(list => [res.post, ...list]);
        this.allProjectPosts.update(list => [res.post, ...list]);
        this.savedMsg.set(scheduledAt ? 'Post scheduled' : 'Draft saved');
        this.draftSaved.set(true);
        this.composerSaving.set(false);
        this.scheduleAt.set('');
        setTimeout(() => this.draftSaved.set(false), 2500);
      },
      error: (err) => {
        this.composerError.set(err?.error?.error ?? 'Could not save the post.');
        this.composerSaving.set(false);
      },
    });
  }

  protected clearComposer(): void {
    if (this.composerVariant() === 'A') this.captionA.set('');
    else this.captionB.set('');
  }

  protected appendHashtags(set: { name: string; tags: string[] }): void {
    const toAppend = (this.activeCaption().length > 0 ? '\n\n' : '') + set.tags.join(' ');
    if (this.composerVariant() === 'A') this.captionA.update(v => v + toAppend);
    else this.captionB.update(v => v + toAppend);
  }

  protected appendHashtagsAndGoComposer(set: { name: string; tags: string[] }): void {
    this.appendHashtags(set);
    this.activeTab.set('composer');
  }

  protected async copyHashtagSet(set: { name: string; tags: string[] }): Promise<void> {
    await navigator.clipboard.writeText(set.tags.join(' '));
    this.copiedSet.set(set.name);
    setTimeout(() => this.copiedSet.set(null), 2000);
  }

  protected async copyTag(tag: string): Promise<void> {
    await navigator.clipboard.writeText(tag);
  }

  protected splitChannels(raw: string): string[] {
    return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
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
