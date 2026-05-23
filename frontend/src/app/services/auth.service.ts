import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthResponse, UserResponse } from '../interfaces/fhir';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000';
  private currentUserSubject = new BehaviorSubject<UserResponse | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(this.getTokenFromStorage());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          this.setToken(response.access_token);
          this.setCurrentUser(response.user);
        })
      );
  }

  register(username: string, password: string, role: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/register`, {
      username,
      password,
      role,
    });
  }

  getCurrentUser(): Observable<UserResponse | null> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => this.setCurrentUser(user)),
      map(user => user),
    );
  }

  logout(): void {
    this.clearToken();
    this.setCurrentUser(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  getCurrentUserValue(): UserResponse | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUserValue();
    return user?.role === role;
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.tokenSubject.next(token);
  }

  private clearToken(): void {
    localStorage.removeItem('auth_token');
    this.tokenSubject.next(null);
  }

  private setCurrentUser(user: UserResponse | null): void {
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
    }
    this.currentUserSubject.next(user);
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getUserFromStorage(): UserResponse | null {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
  }
}
