import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { FhirService } from '../services/fhir.service';
import { Patient, Bundle } from '../interfaces/fhir';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Patients</h1>
        <p class="subtitle">Select a patient to view clinical details</p>
      </div>

      <div class="search-section">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (keyup.enter)="onSearch()"
          placeholder="Search by name or identifier..."
          class="search-input"
        />
        <button (click)="onSearch()" class="btn btn-primary">Search</button>
        <button *ngIf="searchTerm" (click)="clearSearch()" class="btn btn-secondary">Clear</button>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading patients...</p>
      </div>

      <div *ngIf="!loading && error" class="alert alert-danger">{{ error }}</div>

      <div *ngIf="!loading && patients.length === 0" class="alert alert-info">
        No patients found. Try a different search.
      </div>

      <div *ngIf="!loading && patients.length > 0" class="patients-grid">
        <div *ngFor="let patient of patients" class="patient-card" [routerLink]="['/patient', patient.id]">
          <h3>{{ getPatientName(patient) }}</h3>
          <div class="patient-info">
            <p><strong>Age:</strong> {{ getPatientAge(patient) }}</p>
            <p><strong>Gender:</strong> {{ getGenderLabel(patient) }}</p>
            <p><strong>DOB:</strong> {{ formatDate(patient.birthDate) }}</p>
          </div>
          <div class="card-footer">
            <span class="badge">View Details →</span>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && patients.length > 0" class="pagination">
        <button (click)="previousPage()" [disabled]="page === 1" class="btn btn-secondary btn-sm">
          Previous
        </button>
        <span class="page-info">Page {{ page }}</span>
        <button (click)="nextPage()" class="btn btn-secondary btn-sm">Next</button>
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
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      padding: 0.75rem 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
    }

    .search-input:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
    }

    .patients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .patient-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 300ms ease-in-out;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
    }

    .patient-card:hover {
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
      border-color: #0066cc;
    }

    .patient-card h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #1a1a1a;
    }

    .patient-info {
      flex: 1;
      margin-bottom: 1rem;
    }

    .patient-info p {
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
      color: #777;
    }

    .patient-info p strong {
      color: #1a1a1a;
    }

    .card-footer {
      padding-top: 1rem;
      border-top: 1px solid #eee;
      text-align: right;
    }

    .pagination {
      display: flex;
      justify-content: center;
      gap: 1rem;
      align-items: center;
    }

    .page-info {
      color: #777;
      font-size: 0.95rem;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }
  `],
})
export class PatientListComponent implements OnInit {
  patients: Patient[] = [];
  searchTerm = '';
  page = 1;
  loading = false;
  error = '';
  private searching = false;

  constructor(
    private apiService: ApiService,
    private fhirService: FhirService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const pageParam = Number(params.get('page'));
      this.page = pageParam > 0 ? pageParam : 1;
      if (!this.searching) {
        this.loadPatients();
      }
    });
  }

  private setPage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  loadPatients(): void {
    this.loading = true;
    this.error = '';

    this.apiService.listPatients(this.page).subscribe({
      next: (bundle) => {
        this.patients = bundle.entry?.map(e => e.resource as Patient) || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load patients';
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.clearSearch();
      return;
    }

    this.searching = true;
    this.loading = true;
    this.error = '';

    this.apiService.searchPatients(this.searchTerm).subscribe({
      next: (bundle) => {
        this.patients = bundle.entry?.map(e => e.resource as Patient) || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Search failed';
        this.cdr.detectChanges();
      },
    });

    this.setPage(1);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searching = false;
    this.setPage(1);
    this.loadPatients();
  }

  nextPage(): void {
    this.searching = false;
    this.setPage(this.page + 1);
  }

  previousPage(): void {
    if (this.page > 1) {
      this.searching = false;
      this.setPage(this.page - 1);
    }
  }

  getPatientName(patient: Patient): string {
    return this.fhirService.getPatientName(patient);
  }

  getPatientAge(patient: Patient): string {
    const age = this.fhirService.getPatientAge(patient.birthDate);
    return age ? `${age} years` : 'Unknown';
  }

  formatDate(date: string | undefined): string {
    return this.fhirService.formatDate(date);
  }

  getGenderLabel(patient: Patient): string {
    return this.fhirService.getGenderLabel(patient.gender);
  }
}
