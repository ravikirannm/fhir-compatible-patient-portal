import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { SUPPORTED_RESOURCES } from '../constants';

@Component({
  selector: 'app-resource-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>FHIR Resource Browser</h1>
        <p class="subtitle">Search and explore FHIR R4 resources</p>
      </div>

      <div class="search-section">
        <div class="form-group">
          <label for="resource-type">Resource Type</label>
          <select id="resource-type" [(ngModel)]="selectedResourceType" class="form-control">
            <option value="">Select a resource type...</option>
            <option *ngFor="let resource of SUPPORTED_RESOURCES" [value]="resource">
              {{ resource }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="search-params">Search Parameters (JSON)</label>
          <textarea
            id="search-params"
            [(ngModel)]="searchParamsJson"
            placeholder='{"patient": "123", "status": "active"}'
            class="form-control"
          ></textarea>
        </div>

        <button (click)="search()" class="btn btn-primary" [disabled]="!selectedResourceType || searching">
          <span *ngIf="!searching">Search</span>
          <span *ngIf="searching" class="spinner"></span>
        </button>
      </div>

      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <div *ngIf="results.length > 0" class="results-section">
        <h2>Results ({{ results.length }} found)</h2>

        <div *ngFor="let result of results" class="result-card">
          <div class="result-header">
            <h3>{{ result.resourceType }}/{{ result.id }}</h3>
            <button (click)="toggleDetails(result.id!)" class="btn btn-sm btn-secondary">
              {{ expandedIds.has(result.id!) ? 'Hide' : 'Show' }} JSON
            </button>
          </div>

          <div *ngIf="expandedIds.has(result.id!)" class="result-json">
            <pre>{{ formatJson(result) }}</pre>
          </div>
        </div>
      </div>

      <div *ngIf="!searching && results.length === 0 && selectedResourceType" class="empty-state">
        No results found. Try different search parameters.
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

    .search-section {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #1a1a1a;
      font-size: 0.9rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #eee;
      border-radius: 4px;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
    }

    .form-control:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    textarea {
      min-height: 150px;
      resize: vertical;
    }

    .results-section {
      margin-top: 2rem;
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

    .result-json {
      padding: 1.5rem;
      background: #1a1a1a;
      color: #4ec9b0;
      overflow-x: auto;
    }

    pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #777;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }
  `],
})
export class ResourceBrowserComponent {
  SUPPORTED_RESOURCES = SUPPORTED_RESOURCES;
  selectedResourceType = '';
  searchParamsJson = '{}';
  results: any[] = [];
  searching = false;
  error = '';
  expandedIds = new Set<string>();

  constructor(private apiService: ApiService,private cdr: ChangeDetectorRef) {}

  search(): void {
    if (!this.selectedResourceType) {
      this.error = 'Please select a resource type';
      return;
    }

    let params: Record<string, string> = {};
    try {
      const parsed = JSON.parse(this.searchParamsJson || '{}');
      params = parsed;
    } catch (e) {
      this.error = 'Invalid JSON in search parameters';
      return;
    }

    this.searching = true;
    this.error = '';
    this.results = [];
    this.expandedIds.clear();

    this.apiService.searchFHIRResource(this.selectedResourceType, params).subscribe({
      next: (bundle) => {
        this.results = bundle.entry?.map(e => e.resource) || [];
        this.searching = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.searching = false;
        this.error = err.error?.message || 'Search failed';
        this.cdr.markForCheck();
      },
    });
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
