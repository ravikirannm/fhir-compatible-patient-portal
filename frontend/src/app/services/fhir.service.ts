import { Injectable } from '@angular/core';
import { Patient, Observation, Condition } from '../interfaces/fhir';

@Injectable({
  providedIn: 'root',
})
export class FhirService {
  // Extract patient name
  getPatientName(patient: Patient): string {
    if (!patient.name || patient.name.length === 0) {
      return 'Unknown';
    }
    const name = patient.name[0];
    const given = name.given ? name.given.join(' ') : '';
    const family = name.family || '';
    return `${given} ${family}`.trim();
  }

  // Get patient age from birthDate
  getPatientAge(birthDate: string | undefined): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Format date
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Format datetime
  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Get observation value
  getObservationValue(observation: Observation): string {
    if (observation.valueQuantity) {
      return `${observation.valueQuantity.value} ${observation.valueQuantity.unit}`;
    }
    if (observation.valueCodeableConcept) {
      const coding = observation.valueCodeableConcept.coding?.[0];
      return coding?.display || coding?.code || 'Unknown';
    }
    if (observation.valueString) {
      return observation.valueString;
    }
    return 'No value';
  }

  // Get coding display
  getCodingDisplay(coding: any): string {
    if (!coding) return 'Unknown';
    if (Array.isArray(coding)) {
      const first = coding[0];
      return first?.display || first?.code || 'Unknown';
    }
    return coding.display || coding.code || 'Unknown';
  }

  // Get condition status
  getConditionStatus(condition: Condition): string {
    return condition.clinicalStatus?.coding?.[0]?.code || 'Unknown';
  }

  // Format phone number
  formatPhoneNumber(phone: string): string {
    // Simple US phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  // Extract gender label
  getGenderLabel(gender: string | undefined): string {
    const genders: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      unknown: 'Unknown',
    };
    return genders[gender || 'unknown'] || 'Unknown';
  }

  // Sort observations by date (newest first)
  sortObservationsByDate(observations: Observation[]): Observation[] {
    return observations.sort((a, b) => {
      const dateA = new Date(a.effectiveDateTime || a.issued || 0).getTime();
      const dateB = new Date(b.effectiveDateTime || b.issued || 0).getTime();
      return dateB - dateA;
    });
  }

  // Group observations by code
  groupObservationsByCode(observations: Observation[]): Record<string, Observation[]> {
    const grouped: Record<string, Observation[]> = {};
    observations.forEach(obs => {
      const code = obs.code.coding?.[0]?.code || 'unknown';
      if (!grouped[code]) {
        grouped[code] = [];
      }
      grouped[code].push(obs);
    });
    return grouped;
  }

  // Get vital signs from observations
  extractVitalSigns(observations: Observation[]): Record<string, any> {
    const vitals: Record<string, any> = {};
    observations.forEach(obs => {
      const code = obs.code.coding?.[0]?.code;
      const value = this.getObservationValue(obs);
      if (code) {
        vitals[code] = value;
      }
    });
    return vitals;
  }
}
