import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationRequest } from '../interfaces/fhir';

interface MedEntry {
  name: string;
  status: string;
  authoredOn: Date | null;
  dosage: string;
  barOffset: number;
  barWidth: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#28a745',
  completed: '#0066cc',
  cancelled: '#dc3545',
  stopped: '#6c757d',
  'on-hold': '#ffc107',
  draft: '#adb5bd',
};

@Component({
  selector: 'app-med-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="med-timeline">
      <div *ngIf="entries.length === 0" class="empty-state">
        No medications found
      </div>

      <ng-container *ngIf="entries.length > 0">
        <div class="timeline-header">
          <div class="col-name">Medication</div>
          <div class="col-bar">Timeline</div>
          <div class="col-meta">Dosage</div>
        </div>

        <div class="timeline-body">
          <div *ngFor="let entry of entries" class="med-row">
            <div class="col-name">
              <div class="med-name">{{ entry.name }}</div>
              <span class="status-badge" [style.background]="getStatusColor(entry.status)">
                {{ entry.status }}
              </span>
            </div>
            <div class="col-bar">
              <div class="bar-track">
                <div
                  class="bar-fill"
                  [style.left.%]="entry.barOffset"
                  [style.width.%]="entry.barWidth"
                  [style.background]="getStatusColor(entry.status)"
                ></div>
              </div>
              <div class="bar-date">
                {{ entry.authoredOn ? formatDate(entry.authoredOn) : 'Unknown date' }}
              </div>
            </div>
            <div class="col-meta">
              <span *ngIf="entry.dosage" class="dosage-text">{{ entry.dosage }}</span>
              <span *ngIf="!entry.dosage" class="text-muted">—</span>
            </div>
          </div>
        </div>

        <div class="date-axis">
          <span *ngFor="let label of axisLabels" class="axis-label">{{ label }}</span>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .med-timeline {
      padding: 0.5rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #777;
      font-size: 0.95rem;
    }

    .timeline-header {
      display: grid;
      grid-template-columns: 200px 1fr 160px;
      gap: 1rem;
      padding: 0 0 0.75rem;
      border-bottom: 2px solid #eee;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #777;
    }

    .timeline-body {
      margin-bottom: 0.5rem;
    }

    .med-row {
      display: grid;
      grid-template-columns: 200px 1fr 160px;
      gap: 1rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid #f5f5f5;
      align-items: center;
    }

    .med-row:last-child {
      border-bottom: none;
    }

    .col-name {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 0;
    }

    .med-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-badge {
      display: inline-block;
      padding: 0.1rem 0.5rem;
      color: white;
      border-radius: 10px;
      font-size: 0.72rem;
      font-weight: 500;
      text-transform: capitalize;
      width: fit-content;
    }

    .col-bar {
      min-width: 0;
    }

    .bar-track {
      position: relative;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .bar-fill {
      position: absolute;
      height: 100%;
      border-radius: 4px;
      min-width: 4px;
      opacity: 0.8;
    }

    .bar-date {
      font-size: 0.75rem;
      color: #aaa;
    }

    .col-meta {
      min-width: 0;
    }

    .dosage-text {
      font-size: 0.82rem;
      color: #555;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .text-muted {
      color: #aaa;
    }

    .date-axis {
      display: flex;
      justify-content: space-between;
      padding-left: 216px;
      padding-right: 176px;
      margin-top: 0.25rem;
    }

    .axis-label {
      font-size: 0.75rem;
      color: #aaa;
    }

    @media (max-width: 768px) {
      .timeline-header,
      .med-row {
        grid-template-columns: 1fr;
      }

      .col-bar,
      .col-meta {
        padding-left: 0;
      }

      .date-axis {
        padding-left: 0;
        padding-right: 0;
      }
    }
  `],
})
export class MedTimelineComponent implements OnChanges {
  @Input() medications: MedicationRequest[] = [];

  entries: MedEntry[] = [];
  axisLabels: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medications']) {
      this.buildEntries();
    }
  }

  getStatusColor(status: string): string {
    return STATUS_COLORS[status] ?? '#adb5bd';
  }

  formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private buildEntries(): void {
    const sorted = [...this.medications]
      .filter(m => m.authoredOn)
      .sort((a, b) => new Date(a.authoredOn!).getTime() - new Date(b.authoredOn!).getTime());

    if (sorted.length === 0) {
      this.entries = this.medications.map(m => this.toEntry(m, 0, 100, null, null));
      return;
    }

    const minMs = new Date(sorted[0].authoredOn!).getTime();
    const maxMs = new Date(sorted[sorted.length - 1].authoredOn!).getTime();
    const rangeMs = maxMs - minMs || 1;

    this.entries = sorted.map(m => {
      const t = new Date(m.authoredOn!).getTime();
      const offset = ((t - minMs) / rangeMs) * 90;
      return this.toEntry(m, offset, 10, new Date(m.authoredOn!), null);
    });

    this.axisLabels = [
      this.formatDate(new Date(minMs)),
      this.formatDate(new Date((minMs + maxMs) / 2)),
      this.formatDate(new Date(maxMs)),
    ];
  }

  private toEntry(
    m: MedicationRequest,
    offset: number,
    width: number,
    authoredOn: Date | null,
    _end: Date | null,
  ): MedEntry {
    return {
      name:
        m.medicationCodeableConcept?.coding?.[0]?.display ??
        m.medicationCodeableConcept?.coding?.[0]?.code ??
        'Unknown medication',
      status: m.status ?? 'unknown',
      authoredOn,
      dosage: m.dosageInstruction?.[0]?.text ?? '',
      barOffset: Math.min(offset, 90),
      barWidth: Math.max(width, 2),
    };
  }
}
