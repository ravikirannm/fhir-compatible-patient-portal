// FHIR R4 Interface Definitions

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    lastUpdated?: string;
    versionId?: string;
  };
}

export interface Patient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Array<{ value: string }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
  }>;
  telecom?: Array<{ system: string; value: string }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    use?: string;
    type?: string;
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  maritalStatus?: { text: string };
}

export interface Encounter extends FHIRResource {
  resourceType: 'Encounter';
  identifier?: Array<{ value: string }>;
  status?: string;
  class?: { code: string; display: string };
  type?: Array<{ coding: Array<{ code: string; display: string }> }>;
  subject: Reference;
  period?: { start?: string; end?: string };
  length?: { value: number; unit: string };
  reasonCode?: Array<{ coding: Array<{ code: string; display: string }> }>;
  participant?: Array<{ individual: Reference }>;
}

export interface Observation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: Array<{ value: string }>;
  status?: string;
  category?: Array<{ coding: Array<{ code: string; display: string }> }>;
  code: { coding: Array<{ code: string; display: string }>; text?: string };
  subject?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  issued?: string;
  valueQuantity?: { value: number; unit: string; code: string };
  valueCodeableConcept?: { coding: Array<{ code: string; display: string }> };
  valueString?: string;
  referenceRange?: Array<{ low?: { value: number }; high?: { value: number } }>;
  interpretation?: Array<{ coding: Array<{ code: string; display: string }> }>;
}

export interface Condition extends FHIRResource {
  resourceType: 'Condition';
  identifier?: Array<{ value: string }>;
  clinicalStatus?: { coding: Array<{ code: string }> };
  verificationStatus?: { coding: Array<{ code: string }> };
  code: { coding: Array<{ code: string; display: string }>; text?: string };
  subject: Reference;
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
  recorder?: Reference;
  note?: Array<{ text: string }>;
}

export interface Procedure extends FHIRResource {
  resourceType: 'Procedure';
  identifier?: Array<{ value: string }>;
  status?: string;
  code: { coding: Array<{ code: string; display: string }>; text?: string };
  subject: Reference;
  performedDateTime?: string;
  performedPeriod?: { start?: string; end?: string };
  performer?: Array<{ actor: Reference }>;
  reasonCode?: Array<{ coding: Array<{ code: string; display: string }> }>;
  outcome?: { coding: Array<{ code: string; display: string }> };
  report?: Reference[];
}

export interface AllergyIntolerance extends FHIRResource {
  resourceType: 'AllergyIntolerance';
  identifier?: Array<{ value: string }>;
  clinicalStatus?: { coding: Array<{ code: string }> };
  verificationStatus?: { coding: Array<{ code: string }> };
  code: { coding: Array<{ code: string; display: string }>; text?: string };
  patient: Reference;
  recordedDate?: string;
  reaction?: Array<{
    substance?: { coding: Array<{ code: string; display: string }> };
    manifestation: Array<{ coding: Array<{ code: string; display: string }> }>;
    severity?: string;
  }>;
}

export interface Immunization extends FHIRResource {
  resourceType: 'Immunization';
  identifier?: Array<{ value: string }>;
  status?: string;
  vaccineCode: { coding: Array<{ code: string; display: string }>; text?: string };
  patient: Reference;
  occurrenceDateTime?: string;
  occurrenceString?: string;
  primarySource?: boolean;
  performer?: Array<{ actor: Reference }>;
  note?: Array<{ text: string }>;
  reaction?: Array<{ date?: string; detail?: Reference; reported?: boolean }>;
}

export interface MedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest';
  identifier?: Array<{ value: string }>;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: { coding: Array<{ code: string; display: string }> };
  medicationReference?: Reference;
  subject: Reference;
  authoredOn?: string;
  requester?: Reference;
  dosageInstruction?: Array<{
    text?: string;
    timing?: { repeat?: { frequency: number; period: number; periodUnit: string } };
    route?: { coding: Array<{ code: string; display: string }> };
    doseAndRate?: Array<{ doseQuantity?: { value: number; unit: string } }>;
  }>;
  reasonCode?: Array<{ coding: Array<{ code: string; display: string }> }>;
}

export interface MedicationAdministration extends FHIRResource {
  resourceType: 'MedicationAdministration';
  identifier?: Array<{ value: string }>;
  status?: string;
  medicationCodeableConcept?: { coding: Array<{ code: string; display: string }> };
  medicationReference?: Reference;
  subject: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  performer?: Array<{ actor: Reference }>;
  reasonCode?: Array<{ coding: Array<{ code: string; display: string }> }>;
  dosage?: {
    text?: string;
    route?: { coding: Array<{ code: string; display: string }> };
    dose?: { value: number; unit: string };
    rateQuantity?: { value: number; unit: string };
  };
}

export interface DiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  identifier?: Array<{ value: string }>;
  status?: string;
  code: { coding: Array<{ code: string; display: string }>; text?: string };
  subject?: Reference;
  issued?: string;
  performer?: Reference[];
  result?: Reference[];
  conclusion?: string;
  conclusionCode?: Array<{ coding: Array<{ code: string; display: string }> }>;
}

export interface DocumentReference extends FHIRResource {
  resourceType: 'DocumentReference';
  identifier?: Array<{ value: string }>;
  status?: string;
  type?: { coding: Array<{ code: string; display: string }> };
  subject?: Reference;
  date?: string;
  author?: Reference[];
  title?: string;
  description?: string;
  content?: Array<{
    attachment: {
      contentType?: string;
      data?: string;
      url?: string;
      title?: string;
    };
  }>;
}

export interface Bundle extends FHIRResource {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  entry?: Array<{
    resource?: FHIRResource;
    search?: { mode: string; score: number };
    response?: { status: string };
  }>;
}

export interface Reference {
  reference?: string;
  type?: string;
  identifier?: { value: string };
  display?: string;
}

export interface PatientSummary {
  patient_id: string;
  name: string;
  birthDate: string;
  gender: string;
  active_conditions: number;
  current_medications: number;
  recent_observations: number;
  allergies: number;
  immunizations: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  username: string;
  role: 'clinician' | 'researcher';
  created_at: string;
}

export interface NLQueryRequest {
  query: string;
  execute: boolean;
}

export interface NLQueryResponse {
  translated_query: {
    resource_type: string;
    search_params: Record<string, string>;
    human_summary: string;
  };
  results: Array<{
    fullUrl?: string;
    resource: FHIRResource;
    search?: { mode: string };
  }>;
  error: string | null;
  total_count: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}
