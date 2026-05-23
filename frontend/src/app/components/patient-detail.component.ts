import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { FhirService } from '../services/fhir.service';
import {
  Patient,
  PatientSummary,
  Bundle,
  Encounter,
  Observation,
  Condition,
  Procedure,
  AllergyIntolerance,
  MedicationRequest,
  Immunization,
  DiagnosticReport,
} from '../interfaces/fhir';
import { VitalChartComponent } from './vital-chart.component';
import { LabTrendsComponent } from './lab-trends.component';
import { TimelineComponent } from './timeline.component';
import { MedTimelineComponent } from './med-timeline.component';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    VitalChartComponent,
    LabTrendsComponent,
    TimelineComponent,
    MedTimelineComponent,
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/patients" class="back-link">← Back to Patients</a>
        <h1 *ngIf="patient">{{ getPatientName() }}</h1>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading patient data...</p>
      </div>

      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <div *ngIf="!loading && patient">
        <!-- Demographics summary -->
        <div class="summary-grid">
          <div class="summary-card">
            <span class="label">Age</span>
            <span class="value">{{ getPatientAge() }}</span>
          </div>
          <div class="summary-card">
            <span class="label">Gender</span>
            <span class="value">{{ getGenderLabel() }}</span>
          </div>
          <div class="summary-card">
            <span class="label">Date of Birth</span>
            <span class="value">{{ formatDate(patient.birthDate) }}</span>
          </div>
          <div class="summary-card">
            <span class="label">Active Conditions</span>
            <span class="value">{{ summary?.active_conditions || 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="label">Current Medications</span>
            <span class="value">{{ summary?.current_medications || 0 }}</span>
          </div>
          <div class="summary-card">
            <span class="label">Allergies</span>
            <span class="value">{{ summary?.allergies || 0 }}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            *ngFor="let tab of tabs"
            [class.active]="activeTab === tab.id"
            (click)="selectTab(tab.id)"
            class="tab-button"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Conditions -->
        <div *ngIf="activeTab === 'conditions'" class="tab-content">
          <h2>Conditions</h2>
          <div *ngIf="conditions.length === 0" class="empty-state">No conditions found</div>
          <div *ngFor="let condition of conditions" class="resource-card">
            <div class="resource-header">
              <h3>{{ getConditionCode(condition) }}</h3>
              <span class="badge" [class.badge-success]="getConditionStatus(condition) === 'active'">
                {{ getConditionStatus(condition) }}
              </span>
            </div>
            <p *ngIf="condition.onsetDateTime"><strong>Onset:</strong> {{ formatDate(condition.onsetDateTime) }}</p>
            <p *ngIf="condition.abatementDateTime"><strong>Resolved:</strong> {{ formatDate(condition.abatementDateTime) }}</p>
          </div>
        </div>

        <!-- Vitals -->
        <div *ngIf="activeTab === 'vitals'" class="tab-content">
          <h2>Vital Signs</h2>
          <div class="chart-panel">
            <app-vital-chart [observations]="observations" />
          </div>
        </div>

        <!-- Lab Results -->
        <div *ngIf="activeTab === 'labs'" class="tab-content">
          <h2>Lab Results</h2>
          <div class="chart-panel">
            <app-lab-trends [observations]="observations" />
          </div>
        </div>

        <!-- Medications -->
        <div *ngIf="activeTab === 'medications'" class="tab-content">
          <h2>Medications</h2>
          <div *ngIf="medications.length === 0" class="empty-state">No medications found</div>
          <ng-container *ngIf="medications.length > 0">
            <div class="chart-panel" style="margin-bottom: 2rem">
              <app-med-timeline [medications]="medications" />
            </div>
            <div *ngFor="let med of medications" class="resource-card">
              <h3>{{ getMedicationName(med) }}</h3>
              <p *ngIf="med.status"><strong>Status:</strong> <span class="badge">{{ med.status }}</span></p>
              <p *ngIf="med.authoredOn"><strong>Prescribed:</strong> {{ formatDate(med.authoredOn) }}</p>
              <p *ngIf="med.dosageInstruction">
                <strong>Dosage:</strong> {{ getDosageText(med) }}
              </p>
            </div>
          </ng-container>
        </div>

        <!-- Encounters -->
        <div *ngIf="activeTab === 'encounters'" class="tab-content">
          <h2>Encounters</h2>
          <div *ngIf="encounters.length === 0" class="empty-state">No encounters found</div>
          <div *ngFor="let encounter of encounters" class="resource-card">
            <div class="resource-header">
              <h3>{{ getEncounterType(encounter) }}</h3>
              <span class="badge">{{ encounter.status }}</span>
            </div>
            <p><strong>Date:</strong> {{ formatDate(encounter.period?.start) }}</p>
            <p *ngIf="encounter.period?.end"><strong>End:</strong> {{ formatDate(encounter.period!.end) }}</p>
          </div>
        </div>

        <!-- Procedures -->
        <div *ngIf="activeTab === 'procedures'" class="tab-content">
          <h2>Procedures</h2>
          <div *ngIf="procedures.length === 0" class="empty-state">No procedures found</div>
          <div *ngFor="let proc of procedures" class="resource-card">
            <div class="resource-header">
              <h3>{{ getProcedureCode(proc) }}</h3>
              <span class="badge">{{ proc.status }}</span>
            </div>
            <p *ngIf="proc.performedDateTime">
              <strong>Date:</strong> {{ formatDate(proc.performedDateTime) }}
            </p>
            <p *ngIf="proc.performedPeriod?.start">
              <strong>Start:</strong> {{ formatDate(proc.performedPeriod!.start) }}
            </p>
          </div>
        </div>

        <!-- Allergies -->
        <div *ngIf="activeTab === 'allergies'" class="tab-content">
          <h2>Allergies</h2>
          <div *ngIf="allergies.length === 0" class="empty-state">No allergies found</div>
          <div *ngFor="let allergy of allergies" class="resource-card allergy-card">
            <div class="resource-header">
              <h3>{{ getAllergyCode(allergy) }}</h3>
              <span class="badge badge-danger">Allergy</span>
            </div>
            <p><strong>Status:</strong> {{ allergy.clinicalStatus?.coding?.[0]?.code || 'Unknown' }}</p>
            <div *ngIf="allergy.reaction && allergy.reaction.length > 0">
              <p><strong>Reactions:</strong></p>
              <ul>
                <li *ngFor="let r of allergy.reaction">
                  {{ r.manifestation[0]?.coding?.[0]?.display || 'Unknown' }}
                  <span *ngIf="r.severity"> ({{ r.severity }})</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Immunizations -->
        <div *ngIf="activeTab === 'immunizations'" class="tab-content">
          <h2>Immunization History</h2>
          <div *ngIf="immunizations.length === 0" class="empty-state">No immunizations found</div>
          <div *ngFor="let imm of immunizations" class="resource-card">
            <div class="resource-header">
              <h3>{{ getVaccineCode(imm) }}</h3>
              <span class="badge badge-success">{{ imm.status }}</span>
            </div>
            <p><strong>Date:</strong> {{ formatDate(imm.occurrenceDateTime) }}</p>
          </div>
        </div>

        <!-- Diagnostic Reports -->
        <div *ngIf="activeTab === 'diagnostics'" class="tab-content">
          <h2>Diagnostic Reports</h2>
          <div *ngIf="diagnosticReports.length === 0" class="empty-state">No reports found</div>
          <div *ngFor="let report of diagnosticReports" class="resource-card">
            <h3>{{ getReportCode(report) }}</h3>
            <p><strong>Status:</strong> <span class="badge">{{ report.status }}</span></p>
            <p *ngIf="report.issued"><strong>Issued:</strong> {{ formatDateTime(report.issued) }}</p>
            <p *ngIf="report.conclusion"><strong>Conclusion:</strong> {{ report.conclusion }}</p>
          </div>
        </div>

        <!-- Timeline -->
        <div *ngIf="activeTab === 'timeline'" class="tab-content">
          <h2>Patient Timeline</h2>
          <div class="chart-panel">
            <app-timeline
              [encounters]="encounters"
              [conditions]="conditions"
              [procedures]="procedures"
            />
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

    .back-link {
      color: #0066cc;
      text-decoration: none;
      font-size: 0.95rem;
      display: inline-block;
      margin-bottom: 1rem;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1rem;
      text-align: center;
    }

    .summary-card .label {
      display: block;
      color: #777;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    .summary-card .value {
      display: block;
      font-size: 1.4rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #eee;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .tab-button {
      background: none;
      border: none;
      padding: 0.875rem 1.25rem;
      cursor: pointer;
      color: #777;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      transition: all 150ms ease-in-out;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
    }

    .tab-button:hover {
      color: #1a1a1a;
    }

    .tab-button.active {
      color: #0066cc;
      border-bottom-color: #0066cc;
    }

    .tab-content {
      animation: fadeIn 200ms ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tab-content h2 {
      margin-bottom: 1.5rem;
      font-size: 1.25rem;
    }

    .chart-panel {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
    }

    .resource-card {
      background: white;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .resource-card h3 {
      margin-top: 0;
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }

    .resource-card p {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #555;
    }

    .resource-card p:last-child {
      margin-bottom: 0;
    }

    .resource-card p strong {
      color: #1a1a1a;
    }

    .resource-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .resource-header h3 {
      margin: 0;
      flex: 1;
    }

    .allergy-card {
      border-left: 4px solid #dc3545;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #777;
      background: #fafafa;
      border-radius: 4px;
      font-size: 0.95rem;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.65rem;
      background: #0066cc;
      color: white;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-success {
      background: #28a745;
    }

    .badge-danger {
      background: #dc3545;
    }

    ul {
      margin: 0.25rem 0 0 1.25rem;
      padding: 0;
    }

    ul li {
      font-size: 0.9rem;
      color: #555;
      margin-bottom: 0.25rem;
    }
  `],
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  summary: PatientSummary | null = null;
  encounters: Encounter[] = [];
  conditions: Condition[] = [];
  observations: Observation[] = [];
  procedures: Procedure[] = [];
  allergies: AllergyIntolerance[] = [];
  medications: MedicationRequest[] = [];
  immunizations: Immunization[] = [];
  diagnosticReports: DiagnosticReport[] = [];

  loading = false;
  error = '';
  activeTab = 'conditions';

  tabs = [
    { id: 'conditions', label: 'Conditions' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'labs', label: 'Lab Results' },
    { id: 'medications', label: 'Medications' },
    { id: 'encounters', label: 'Encounters' },
    { id: 'procedures', label: 'Procedures' },
    { id: 'allergies', label: 'Allergies' },
    { id: 'immunizations', label: 'Immunizations' },
    { id: 'diagnostics', label: 'Reports' },
    { id: 'timeline', label: 'Timeline' },
  ];

  private patientId = '';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private fhirService: FhirService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.patientId = params['id'];
      this.loadPatientData();
    });
  }

  loadPatientData(): void {
    this.loading = true;
    this.error = '';

    this.apiService.getPatient(this.patientId).subscribe({
      next: (patient) => { this.patient = patient; },
      error: () => {
        this.error = 'Failed to load patient';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });

    this.apiService.getPatientSummary(this.patientId).subscribe({
      next: (summary) => { this.summary = summary; },
    });

    this.apiService.getPatientEncounters(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.encounters = bundle.entry?.map(e => e.resource as Encounter) ?? [];
      },
    });

    this.apiService.getPatientConditions(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.conditions = bundle.entry?.map(e => e.resource as Condition) ?? [];
      },
    });

    this.apiService.getPatientObservations(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.observations = bundle.entry?.map(e => e.resource as Observation) ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });

    this.apiService.getPatientProcedures(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.procedures = bundle.entry?.map(e => e.resource as Procedure) ?? [];
      },
    });

    this.apiService.getPatientMedications(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.medications = bundle.entry?.map(e => e.resource as MedicationRequest) ?? [];
      },
    });

    this.apiService.getPatientAllergies(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.allergies = bundle.entry?.map(e => e.resource as AllergyIntolerance) ?? [];
      },
    });

    this.apiService.getPatientImmunizations(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.immunizations = bundle.entry?.map(e => e.resource as Immunization) ?? [];
      },
    });

    this.apiService.getPatientDiagnosticReports(this.patientId).subscribe({
      next: (bundle: Bundle) => {
        this.diagnosticReports = bundle.entry?.map(e => e.resource as DiagnosticReport) ?? [];
      },
    });
  }

  selectTab(tabId: string): void {
    this.activeTab = tabId;
  }

  getPatientName(): string {
    return this.fhirService.getPatientName(this.patient!);
  }

  getPatientAge(): string {
    const age = this.fhirService.getPatientAge(this.patient?.birthDate);
    return age != null ? `${age} years` : 'Unknown';
  }

  getGenderLabel(): string {
    return this.fhirService.getGenderLabel(this.patient?.gender);
  }

  formatDate(date: string | undefined): string {
    return this.fhirService.formatDate(date);
  }

  formatDateTime(date: string | undefined): string {
    return this.fhirService.formatDateTime(date);
  }

  getEncounterType(encounter: Encounter): string {
    return encounter.type?.[0]?.coding?.[0]?.display ?? 'Encounter';
  }

  getConditionCode(condition: Condition): string {
    return condition.code.coding?.[0]?.display ?? condition.code.coding?.[0]?.code ?? 'Condition';
  }

  getConditionStatus(condition: Condition): string {
    return this.fhirService.getConditionStatus(condition);
  }

  getProcedureCode(proc: Procedure): string {
    return proc.code.coding?.[0]?.display ?? proc.code.coding?.[0]?.code ?? 'Procedure';
  }

  getMedicationName(med: MedicationRequest): string {
    return (
      med.medicationCodeableConcept?.coding?.[0]?.display ??
      med.medicationCodeableConcept?.coding?.[0]?.code ??
      'Medication'
    );
  }

  getDosageText(med: MedicationRequest): string {
    return med.dosageInstruction?.[0]?.text ?? 'See details';
  }

  getAllergyCode(allergy: AllergyIntolerance): string {
    return allergy.code.coding?.[0]?.display ?? allergy.code.coding?.[0]?.code ?? 'Allergy';
  }

  getVaccineCode(imm: Immunization): string {
    return imm.vaccineCode.coding?.[0]?.display ?? imm.vaccineCode.coding?.[0]?.code ?? 'Vaccine';
  }

  getReportCode(report: DiagnosticReport): string {
    return report.code.coding?.[0]?.display ?? report.code.coding?.[0]?.code ?? 'Report';
  }
}
