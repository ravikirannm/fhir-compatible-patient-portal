import {
  Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef,
  AfterViewInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observation } from '../interfaces/fhir';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface VitalDef {
  code: string;
  altCodes?: string[];
  label: string;
  unit: string;
  color: string;
}

const VITAL_DEFS: VitalDef[] = [
  { code: '8867-4', label: 'Heart Rate', unit: 'bpm', color: '#dc3545' },
  { code: '8480-6', label: 'Systolic BP', unit: 'mmHg', color: '#0066cc' },
  { code: '8462-4', label: 'Diastolic BP', unit: 'mmHg', color: '#17a2b8' },
  { code: '29463-7', label: 'Body Weight', unit: 'kg', color: '#28a745' },
  { code: '39156-5', label: 'BMI', unit: 'kg/m²', color: '#6f42c1' },
  { code: '8310-5', label: 'Temperature', unit: '°C', color: '#fd7e14' },
  { code: '9279-1', label: 'Resp Rate', unit: '/min', color: '#20c997' },
  { code: '2708-6', altCodes: ['59408-5'], label: 'O₂ Sat', unit: '%', color: '#0dcaf0' },
];

@Component({
  selector: 'app-vital-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="vital-chart">
      <div *ngIf="availableVitals.length === 0" class="empty-state">
        No vital signs data available
      </div>

      <ng-container *ngIf="availableVitals.length > 0">
        <div class="type-selector">
          <button
            *ngFor="let vital of availableVitals"
            [class.active]="selectedCode === vital.code"
            (click)="selectVital(vital.code)"
            class="type-btn"
          >
            {{ vital.label }}
          </button>
        </div>

        <div *ngIf="latestValue" class="latest-value">
          <span class="value-num">{{ latestValue }}</span>
          <span class="value-unit">{{ selectedUnit }}</span>
          <span class="value-label">Latest</span>
        </div>

        <div class="canvas-wrapper">
          <canvas #chartCanvas></canvas>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .vital-chart {
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
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .value-num {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .value-unit {
      font-size: 1rem;
      color: #777;
    }

    .value-label {
      font-size: 0.75rem;
      color: #777;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .canvas-wrapper {
      position: relative;
      height: 260px;
    }
  `],
})
export class VitalChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() observations: Observation[] = [];
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  availableVitals: VitalDef[] = [];
  selectedCode = '';
  selectedUnit = '';
  latestValue = '';

  private chart: Chart | null = null;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.updateAvailableVitals();
    if (this.selectedCode) {
      this.renderChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observations']) {
      this.updateAvailableVitals();
      if (this.viewInitialized && this.selectedCode) {
        this.renderChart();
      }
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  selectVital(code: string): void {
    this.selectedCode = code;
    const def = VITAL_DEFS.find(v => v.code === code);
    this.selectedUnit = def?.unit ?? '';
    if (this.viewInitialized) {
      this.renderChart();
    }
  }

  private matchCodes(def: VitalDef): string[] {
    return [def.code, ...(def.altCodes ?? [])];
  }

  private getPoint(obs: Observation, codes: string[]): { date: string; value: number } | null {
    if (codes.includes(obs.code.coding?.[0]?.code ?? '') && obs.valueQuantity != null) {
      return { date: obs.effectiveDateTime ?? '', value: obs.valueQuantity.value };
    }
    const comp = obs.component?.find(
      c => codes.includes(c.code.coding?.[0]?.code ?? '') && c.valueQuantity != null
    );
    return comp ? { date: obs.effectiveDateTime ?? '', value: comp.valueQuantity!.value } : null;
  }

  private updateAvailableVitals(): void {
    const vitalObs = this.observations.filter(obs =>
      obs.category?.some(cat => cat.coding?.some(c => c.code === 'vital-signs'))
    );
    this.availableVitals = VITAL_DEFS.filter(v =>
      vitalObs.some(obs => this.getPoint(obs, this.matchCodes(v)) != null)
    );

    if (this.availableVitals.length > 0 && !this.availableVitals.find(v => v.code === this.selectedCode)) {
      this.selectVital(this.availableVitals[0].code);
    }
  }

  private renderChart(): void {
    if (!this.viewInitialized || !this.chartCanvas) return;

    const def = VITAL_DEFS.find(v => v.code === this.selectedCode);
    if (!def) return;

    const codes = this.matchCodes(def);
    const points = this.observations
      .map(obs => this.getPoint(obs, codes))
      .filter((p): p is { date: string; value: number } => p != null)
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    const labels = points.map(p => {
      const d = new Date(p.date || '');
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const data = points.map(p => p.value);

    this.latestValue = data.length > 0 ? String(data[data.length - 1]) : '';

    this.chart?.destroy();

    if (data.length === 0) return;

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: def.label,
          data,
          borderColor: def.color,
          backgroundColor: def.color + '22',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: def.color,
          tension: 0.3,
          fill: true,
        }],
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
