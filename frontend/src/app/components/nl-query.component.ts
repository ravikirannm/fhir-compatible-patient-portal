import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { NLQueryResponse, FHIRResource } from '../interfaces/fhir';

@Component({
  selector: 'app-nl-query',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Natural Language Query</h1>
        <p class="subtitle">Ask questions in plain English to find patient data</p>
      </div>

      <div class="query-section">
        <div class="form-group">
          <label for="query">Enter your query</label>
          <textarea
            id="query"
            [(ngModel)]="query"
            placeholder="e.g., Show me patients with diabetes over 60 years old"
            class="query-input"
            (keyup.ctrl.enter)="executeQuery()"
          ></textarea>
        </div>

        <button (click)="executeQuery()" class="btn btn-primary btn-lg" [disabled]="!query || executing">
          <span *ngIf="!executing">Execute Query</span>
          <span *ngIf="executing" class="spinner"></span>
        </button>
      </div>

      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <!-- Translated Query Display -->
      <div *ngIf="lastResponse && lastResponse.translated_query" class="translation-section">
        <h2>Translated Query</h2>
        <div class="translation-card">
          <div class="translation-info">
            <p><strong>Resource Type:</strong> {{ lastResponse.translated_query.resource_type }}</p>
            <p><strong>Summary:</strong> {{ lastResponse.translated_query.human_summary }}</p>
          </div>
          <div class="translation-params">
            <strong>Search Parameters:</strong>
            <pre>{{ formatJson(lastResponse.translated_query.search_params) }}</pre>
          </div>
        </div>
      </div>

      <!-- Results Display -->
      <div *ngIf="lastResponse && lastResponse.results.length > 0" class="results-section">
        <h2>Results ({{ lastResponse.total_count }} found)</h2>

        <div *ngFor="let result of lastResponse.results" class="result-card">
          <div class="result-header">
            <h3>{{ result.resource.resourceType }}/{{ result.resource.id }}</h3>
            <button (click)="toggleDetails(result.resource.id!)" class="btn btn-sm btn-secondary">
              {{ expandedIds.has(result.resource.id!) ? 'Hide' : 'Show' }} Details
            </button>
          </div>

          <div *ngIf="expandedIds.has(result.resource.id!)" class="result-details">
            <pre>{{ formatJson(result) }}</pre>
          </div>
        </div>
      </div>

      <div *ngIf="lastResponse && lastResponse.results.length === 0" class="empty-state">
        <p>No results found for your query.</p>
        <p *ngIf="lastResponse.error" class="text-danger">{{ lastResponse.error }}</p>
      </div>

      <!-- Example Queries -->
      <div *ngIf="!lastResponse" class="examples-section">
        <h2>Example Queries</h2>
        <div class="examples-grid">
          <div
            *ngFor="let example of exampleQueries"
            class="example-card"
            (click)="setQuery(example)"
          >
            <p>{{ example }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #777;
      margin: 0;
    }

    .query-section {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 500;
      color: #1a1a1a;
      font-size: 1rem;
    }

    .query-input {
      width: 100%;
      min-height: 120px;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      resize: vertical;
    }

    .query-input:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    .translation-section {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .translation-card {
      background: lighten(#f9f9f9, 2%);
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      margin-top: 1rem;
    }

    .translation-info p {
      margin-bottom: 0.75rem;
      color: #1a1a1a;
    }

    .translation-params {
      margin-top: 1rem;
    }

    .translation-params strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }

    pre {
      background: #1a1a1a;
      color: #4ec9b0;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      margin: 0;
    }

    .results-section {
      margin-bottom: 2rem;
    }

    .result-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border-bottom: 1px solid #eee;
      background: lighten(#f9f9f9, 2%);
    }

    .result-header h3 {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
    }

    .result-details {
      padding: 1.5rem;
      background: #1a1a1a;
      overflow-x: auto;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      color: #777;
    }

    .examples-section {
      margin-top: 3rem;
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .example-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 300ms ease-in-out;
    }

    .example-card:hover {
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
      border-color: #0066cc;
    }

    .example-card p {
      margin: 0;
      color: #1a1a1a;
      font-size: 0.95rem;
    }

    .btn-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      width: auto;
    }

    .text-danger {
      color: #dc3545;
    }
  `],
})
export class NLQueryComponent {
  query = '';
  executing = false;
  error = '';
  lastResponse: NLQueryResponse | null = null;
  expandedIds = new Set<string>();

  exampleQueries = [
    'Show me all patients with type 2 diabetes',
    'Find patients over 60 with hypertension',
    'What are the recent vital signs for this patient?',
    'Show me patients with penicillin allergies',
    'List active medications for patients over 65',
    'Show patients with no documented allergies',
  ];

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  executeQuery(): void {
    if (!this.query.trim()) {
      this.error = 'Please enter a query';
      return;
    }

    this.executing = true;
    this.error = '';
    this.lastResponse = null;
    this.expandedIds.clear();

    this.apiService.naturalLanguageQuery(this.query, true).subscribe({
      next: (response) => {
        this.executing = false;
        this.lastResponse = response;
        this.cdr.markForCheck();
        if (response.error) {
          this.error = response.error;
        }
      },
      error: (err) => {
        this.executing = false;
        this.cdr.markForCheck();
        this.error = err.error?.message || 'Query execution failed';
      },
    });
  }

  setQuery(example: string): void {
    this.query = example;
  }

  toggleDetails(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}
