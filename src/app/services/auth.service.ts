import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

const DEV_USERS: Record<string, AuthUser & { password: string }> = {
  'admin@anka.agency':  { id: 'dev-1', email: 'admin@anka.agency',  name: 'Ayesha K.', role: 'ADMIN',     password: 'password' },
  'james@anka.agency':  { id: 'dev-2', email: 'james@anka.agency',  name: 'James D.',  role: 'DEVELOPER', password: 'password' },
  'sara@anka.agency':   { id: 'dev-3', email: 'sara@anka.agency',   name: 'Sara M.',   role: 'DESIGNER',  password: 'password' },
  'liam@anka.agency':   { id: 'dev-4', email: 'liam@anka.agency',   name: 'Liam T.',   role: 'SEO',       password: 'password' },
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadUser());
  private _token = signal<string | null>(localStorage.getItem('token'));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  login(email: string, password: string) {
    return this.api.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((res) => this.persist(res)),
      catchError((err) => {
        // Backend unreachable — fall back to dev credentials in non-production
        if (!environment.production && err.status === 0) {
          const match = DEV_USERS[email];
          if (match && match.password === password) {
            const res: LoginResponse = { token: 'dev-token', user: match };
            this.persist(res);
            return of(res);
          }
          return throwError(() => ({ status: 401 }));
        }
        return throwError(() => err);
      }),
    );
  }

  private persist(res: LoginResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }


  fetchMe() {
    return this.api.get<AuthUser>('/auth/me').pipe(
      tap((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        this._user.set(user);
      }),
    );
  }

  canApproveStage(stage: string): boolean {
    const role = this._user()?.role;
    if (!role) return false;
    if (role === 'ADMIN') return true;
    switch (stage) {
      case 'PROFILING':
      case 'WRITTEN_CONTENT':
      case 'DESIGN':
        return role === 'MANAGER_PRODUCT_MODELLING';
      case 'DEVELOPMENT':
        return role === 'MANAGER_PRODUCT_DEVELOPMENT';
      case 'MARKETING':
        return role === 'MANAGER_PRODUCT_GROWTH';
      default:
        return false;
    }
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
