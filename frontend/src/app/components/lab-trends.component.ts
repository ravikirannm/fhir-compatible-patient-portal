import {
  Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef,
  AfterViewInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend,
} from 'chart.js';
import { Observation } from '../interfaces/fhir';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface LabDef {
  code: string;
  label: string;
  unit: string;
  color: string;
  normalLow?: number;
  normalHigh?: number;
}

const LAB_DEFS: LabDef[] = [
  { code: '4548-4', label: 'HbA1c', unit: '%', color: '#dc3545', normalLow: 4, normalHigh: 5.7 },
  { code: '2093-3', label: 'Total Cholesterol', unit: 'mg/dL', color: '#fd7e14', normalHigh: 200 },
  { code: '18262-6', label: 'LDL', unit: 'mg/dL', color: '#ffc107', normalHigh: 100 },
  { code: '2085-9', label: 'HDL', unit: 'mg/dL', color: '#28a745', normalLow: 40 },
  { code: '2571-8', label: 'Triglycerides', unit: 'mg/dL', color: '#6f42c1', normalHigh: 150 },
  { code: '2339-0', label: 'Glucose', unit: 'mg/dL', color: '#17a2b8', normalLow: 70, normalHigh: 100 },
  { code: '2160-0', label: 'Creatinine', unit: 'mg/dL', color: '#0066cc', normalHigh: 1.2 },
  { code: '33914-3', label: 'eGFR', unit: 'mL/min', color: '#20c997', normalLow: 60 },
  { code: '6690-2', label: 'WBC', unit: 'K/uL', color: '#0dcaf0', normalLow: 4.5, normalHigh: 11 },
  { code: '718-7', label: 'Hemoglobin', unit: 'g/dL', color: '#e83e8c', normalLow: 12, normalHigh: 17 },
];

@Component({
  selector: 'app-lab-trends',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lab-trends">
      <div *ngIf="availableLabs.length === 0" class="empty-state">
        No laboratory results available
      </div>

      <ng-container *ngIf="availableLabs.length > 0">
        <div class="type-selector">
          <button
            *ngFor="let lab of availableLabs"
            [class.active]="selectedCode === lab.code"
            (click)="selectLab(lab.code)"
            class="type-btn"
          >
            {{ lab.label }}
          </button>
        </div>

        <div *ngIf="latestValue" class="latest-value">
          <span class="value-num" [class.out-of-range]="isOutOfRange">{{ latestValue }}</span>
          <span class="value-unit">{{ selectedUnit }}</span>
          <span *ngIf="normalRange" class="normal-range">Normal: {{ normalRange }}</span>
          <span *ngIf="isOutOfRange" class="out-of-range-badge">Out of range</span>
        </div>

        <div class="canvas-wrapper">
          <canvas #chartCanvas></canvas>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .lab-trends {
      padding: 0.5rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #777;
      font-size: 0.95rem;
    }

    .type-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .type-btn {
      padding: 0.35rem 0.875rem;
      border: 1px solid #eee;
      border-radius: 20px;
      background: none;
      font-size: 0.85rem;
      cursor: pointer;
      color: #777;
      font-family: 'Inter', sans-serif;
      transition: all 150ms ease-in-out;
    }

    .type-btn.active {
      background: #0066cc;
      border-color: #0066cc;
      color: white;
    }

    .type-btn:hover:not(.active) {
      border-color: #0066cc;
      color: #0066cc;
    }

    .latest-value {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .value-num {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .value-num.out-of-range {
      color: #dc3545;
    }

    .value-unit {
      font-size: 1rem;
      color: #777;
    }

    .normal-range {
      font-size: 0.8rem;
      color: #777;
      padding: 0.2rem 0.6rem;
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 12px;
    }

    .out-of-range-badge {
      font-size: 0.75rem;
      color: #dc3545;
      padding: 0.2rem 0.6rem;
      background: #fff5f5;
      border: 1px solid #dc3545;
      border-radius: 12px;
    }

    .canvas-wrapper {
      position: relative;
      height: 260px;
    }
  `],
})
export class LabTrendsComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() observations: Observation[] = [];
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  availableLabs: LabDef[] = [];
  selectedCode = '';
  selectedUnit = '';
  latestValue = '';
  normalRange = '';
  isOutOfRange = false;

  private chart: Chart | null = null;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateAvailableLabs();
    if (this.selectedCode) {
      this.renderChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observations']) {
      this.updateAvailableLabs();
      if (this.viewInitialized && this.selectedCode) {
        this.renderChart();
      }
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  selectLab(code: string): void {
    this.selectedCode = code;
    const def = LAB_DEFS.find(l => l.code === code);
    this.selectedUnit = def?.unit ?? '';
    if (this.viewInitialized) {
      this.renderChart();
    }
  }

  private updateAvailableLabs(): void {
    const labObs = this.observations.filter(obs =>
      obs.category?.some(cat => cat.coding?.some(c => c.code === 'laboratory'))
    );
    const codes = new Set(labObs.map(obs => obs.code.coding?.[0]?.code ?? ''));
    this.availableLabs = LAB_DEFS.filter(l => codes.has(l.code));

    if (this.availableLabs.length > 0 && !this.availableLabs.find(l => l.code === this.selectedCode)) {
      this.selectLab(this.availableLabs[0].code);
    }
  }

  private renderChart(): void {
    if (!this.viewInitialized || !this.chartCanvas) return;

    const def = LAB_DEFS.find(l => l.code === this.selectedCode);
    if (!def) return;

    const filtered = this.observations
      .filter(obs => obs.code.coding?.[0]?.code === this.selectedCode && obs.valueQuantity != null)
      .sort((a, b) =>
        new Date(a.effectiveDateTime ?? 0).getTime() - new Date(b.effectiveDateTime ?? 0).getTime()
      );

    const labels = filtered.map(obs => {
      const d = new Date(obs.effectiveDateTime ?? '');
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const data = filtered.map(obs => obs.valueQuantity?.value ?? 0);

    if (data.length > 0) {
      const last = data[data.length - 1];
      this.latestValue = String(last);
      this.isOutOfRange =
        (def.normalLow != null && last < def.normalLow) ||
        (def.normalHigh != null && last > def.normalHigh);
    } else {
      this.latestValue = '';
      this.isOutOfRange = false;
    }

    if (def.normalLow != null && def.normalHigh != null) {
      this.normalRange = `${def.normalLow}–${def.normalHigh} ${def.unit}`;
    } else if (def.normalLow != null) {
      this.normalRange = `>${def.normalLow} ${def.unit}`;
    } else if (def.normalHigh != null) {
      this.normalRange = `<${def.normalHigh} ${def.unit}`;
    } else {
      this.normalRange = '';
    }

    this.chart?.destroy();

    if (data.length === 0) return;

    const referenceLines: any[] = [];
    if (def.normalHigh != null) {
      referenceLines.push({
        label: 'Upper limit',
        data: new Array(data.length).fill(def.normalHigh),
        borderColor: '#dc354544',
        borderWidth: 1,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
      });
    }
    if (def.normalLow != null) {
      referenceLines.push({
        label: 'Lower limit',
        data: new Array(data.length).fill(def.normalLow),
        borderColor: '#28a74544',
        borderWidth: 1,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
      });
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: def.label,
            data,
            borderColor: def.color,
            backgroundColor: def.color + '22',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: def.color,
            tension: 0.3,
            fill: true,
          },
          ...referenceLines,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.y} ${def.unit}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: def.unit,
              color: '#777',
              font: { size: 11 },
            },
            grid: { color: '#f5f5f5' },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45 },
          },
        },
      },
    });
  }
}
