import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Patient,
  Encounter,
  Observation,
  Condition,
  Procedure,
  AllergyIntolerance,
  Immunization,
  MedicationRequest,
  MedicationAdministration,
  DiagnosticReport,
  DocumentReference,
  Bundle,
  PatientSummary,
  NLQueryRequest,
  NLQueryResponse,
  FHIRResource,
} from '../interfaces/fhir';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(private http: HttpClient) {}

  // Patient endpoints
  listPatients(page: number = 1, pageSize: number = 20): Observable<Bundle> {
    const params = new HttpParams().set('page', page).set('page_size', pageSize);
    return this.http.get<Bundle>(`${this.apiUrl}/patients`, { params });
  }

  searchPatients(searchTerm: string, page: number = 1): Observable<Bundle> {
    const params = new HttpParams()
      .set('search', searchTerm)
      .set('page', page);
    return this.http.get<Bundle>(`${this.apiUrl}/patients`, { params });
  }

  getPatient(patientId: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/patients/${patientId}`);
  }

  getPatientSummary(patientId: string): Observable<PatientSummary> {
    return this.http.get<PatientSummary>(`${this.apiUrl}/patients/${patientId}/summary`);
  }

  getPatientBundle(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/bundle`);
  }

  // Clinical resources
  getPatientEncounters(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/encounters`);
  }

  getPatientObservations(patientId: string, category?: string): Observable<Bundle> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/observations`, { params });
  }

  getPatientConditions(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/conditions`);
  }

  getPatientProcedures(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/procedures`);
  }

  getPatientAllergies(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/allergies`);
  }

  getPatientImmunizations(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/immunizations`);
  }

  // Medications
  getPatientMedications(patientId: string, status?: string): Observable<Bundle> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/medications`, { params });
  }

  getPatientMedicationAdmin(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/medication-admin`);
  }

  // Documentation
  getPatientDiagnosticReports(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/diagnostic-reports`);
  }

  getPatientDocuments(patientId: string): Observable<Bundle> {
    return this.http.get<Bundle>(`${this.apiUrl}/patients/${patientId}/documents`);
  }

  // FHIR Resource Browser
  searchFHIRResource(resourceType: string, params: Record<string, string>): Observable<Bundle> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<Bundle>(`http://localhost:5000/api/v1/fhir/${resourceType}`, {
      params: httpParams,
    });
  }

  getFHIRResource(resourceType: string, resourceId: string): Observable<FHIRResource> {
    return this.http.get<FHIRResource>(
      `http://localhost:5000/api/v1/fhir/${resourceType}/${resourceId}`
    );
  }

  // Natural Language Query
  naturalLanguageQuery(query: string, execute: boolean = true): Observable<NLQueryResponse> {
    return this.http.post<NLQueryResponse>(`http://localhost:5000/api/v1/nl-query`, {
      query,
      execute,
    } as NLQueryRequest);
  }

  // Integration stubs
  analyzeSymptoms(patientId: string, data: any): Observable<any> {
    return this.http.post(`http://localhost:5000/api/v1/analyze`, {
      patient_id: patientId,
      data,
    });
  }

  checkInteractions(medications: any[]): Observable<any> {
    return this.http.post(`http://localhost:5000/api/v1/check-interactions`, {
      medications,
    });
  }
}
