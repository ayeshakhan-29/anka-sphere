import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">

        <div class="login-brand">
          <div class="brand-mark">A</div>
          <h1 class="brand-name">Anka Sphere</h1>
          <p class="brand-sub">Agency Operations Dashboard</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="field">
            <label for="email" class="label">Email</label>
            <input
              id="email"
              type="email"
              class="input"
              formControlName="email"
              placeholder="you@anka.agency"
              autocomplete="email"
              [class.error]="emailError()"
              [attr.aria-describedby]="emailError() ? 'email-error' : null"
              [attr.aria-invalid]="emailError()"
            />
            @if (emailError()) {
              <span id="email-error" class="field-error" role="alert">Enter a valid email address</span>
            }
          </div>

          <div class="field">
            <label for="password" class="label">Password</label>
            <input
              id="password"
              type="password"
              class="input"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
              [class.error]="passwordError()"
              [attr.aria-describedby]="passwordError() ? 'password-error' : null"
              [attr.aria-invalid]="passwordError()"
            />
            @if (passwordError()) {
              <span id="password-error" class="field-error" role="alert">Password is required</span>
            }
          </div>

          @if (loginError()) {
            <div class="alert-error" role="alert">
              Invalid email or password. Please try again.
            </div>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner" aria-hidden="true"></span>
              Signing in…
            } @else {
              Sign in
            }
          </button>
        </form>

      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 40px 36px;
      box-shadow: var(--shadow-raised);
    }

    .login-brand {
      text-align: center;
      margin-bottom: 32px;
    }
    .brand-mark {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--color-sidebar);
      color: #fff;
      font-family: var(--font-display);
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
    }
    .brand-name {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0 0 4px;
    }
    .brand-sub {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
    }
    .input {
      height: 42px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .input:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
    }
    .input.error {
      border-color: var(--color-destructive);
    }
    .input.error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
    .field-error {
      font-size: 12px;
      color: var(--color-destructive);
    }

    .alert-error {
      background: var(--color-destructive-light);
      color: var(--color-destructive);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .btn-primary {
      width: 100%;
      height: 44px;
      background: var(--color-sidebar);
      color: #F8FAFC;
      border: none;
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
      transition: background 0.15s;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  protected loading = signal(false);
  protected loginError = signal(false);

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected emailError() {
    const c = this.form.controls.email;
    return c.invalid && c.touched;
  }

  protected passwordError() {
    const c = this.form.controls.password;
    return c.invalid && c.touched;
  }

  protected onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.loginError.set(false);

    // Mock auth — replace with real service later
    setTimeout(() => {
      const { email, password } = this.form.getRawValue();
      if (email === 'admin@anka.agency' && password === 'password') {
        this.router.navigate(['/app/projects']);
      } else {
        this.loginError.set(true);
        this.loading.set(false);
      }
    }, 800);
  }
}
