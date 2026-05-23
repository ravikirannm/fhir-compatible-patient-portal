import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell">
      <nav *ngIf="authService.isAuthenticated()" class="navbar">
        <div class="navbar-brand">
          <a routerLink="/patients" class="brand-link">
            <span class="brand-name serif">FHIR Portal</span>
          </a>
        </div>

        <div class="navbar-links">
          <a routerLink="/patients" routerLinkActive="active" class="nav-link">
            Patients
          </a>
          <a routerLink="/nl-query" routerLinkActive="active" class="nav-link">
            NL Query
          </a>
          <a *ngIf="isResearcher()" routerLink="/fhir-browser" routerLinkActive="active" class="nav-link">
            FHIR Browser
          </a>
        </div>

        <div class="navbar-user">
          <div class="user-info">
            <span class="username">{{ currentUser?.username }}</span>
            <span class="role-badge" [class.role-researcher]="isResearcher()">
              {{ currentUser?.role }}
            </span>
          </div>
          <button (click)="logout()" class="btn-logout">Sign out</button>
        </div>
      </nav>

      <main class="app-content" [class.no-nav]="!authService.isAuthenticated()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .navbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 2rem;
      height: 60px;
      background: white;
      border-bottom: 1px solid #eee;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .navbar-brand {
      flex-shrink: 0;
    }

    .brand-link {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: #1a1a1a;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 600;
      font-family: 'Playfair Display', serif;
    }

    .navbar-links {
      display: flex;
      flex: 1;
      padding-left: 2rem;
    }

    .nav-link {
      padding: 0 1rem;
      height: 60px;
      display: flex;
      align-items: center;
      text-decoration: none;
      color: #777;
      font-weight: 500;
      font-size: 0.95rem;
      border-bottom: 3px solid transparent;
      margin-bottom: -1px;
      transition: all 150ms ease-in-out;
    }

    .nav-link:hover {
      color: #1a1a1a;
      text-decoration: none;
    }

    .nav-link.active {
      color: #0066cc;
      border-bottom-color: #0066cc;
    }

    .navbar-user {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .username {
      font-size: 0.9rem;
      color: #1a1a1a;
      font-weight: 500;
    }

    .role-badge {
      display: inline-block;
      padding: 0.15rem 0.6rem;
      background: #0066cc;
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .role-badge.role-researcher {
      background: #17a2b8;
    }

    .btn-logout {
      padding: 0.4rem 0.875rem;
      background: none;
      border: 1px solid #eee;
      border-radius: 4px;
      color: #777;
      font-size: 0.875rem;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: all 150ms ease-in-out;
    }

    .btn-logout:hover {
      border-color: #dc3545;
      color: #dc3545;
    }

    .app-content {
      flex: 1;
    }

    @media (max-width: 768px) {
      .navbar {
        padding: 0 1rem;
        height: auto;
        flex-wrap: wrap;
        padding-top: 0.75rem;
        padding-bottom: 0.5rem;
        gap: 0.5rem;
      }

      .navbar-links {
        order: 3;
        width: 100%;
        padding-left: 0;
        border-top: 1px solid #eee;
        padding-top: 0.25rem;
      }

      .nav-link {
        height: 40px;
        padding: 0 0.75rem;
      }

      .username {
        display: none;
      }
    }
  `],
})
export class AppComponent {
  get currentUser() {
    return this.authService.getCurrentUserValue();
  }

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  isResearcher(): boolean {
    return this.authService.hasRole('researcher');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
