import {
  Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef,
  AfterViewInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { Encounter, Condition, Procedure } from '../interfaces/fhir';

interface TimelineEvent {
  date: Date;
  label: string;
  type: 'encounter' | 'condition' | 'procedure';
}

const TRACK_CONFIG = {
  encounter: { label: 'Encounters', color: '#0066cc', y: 0 },
  condition: { label: 'Conditions', color: '#dc3545', y: 1 },
  procedure: { label: 'Procedures', color: '#28a745', y: 2 },
};

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      <div *ngIf="isEmpty" class="empty-state">
        No timeline events available
      </div>

      <div *ngIf="!isEmpty">
        <div class="legend">
          <span *ngFor="let item of legendItems" class="legend-item">
            <span class="legend-dot" [style.background]="item.color"></span>
            {{ item.label }}
          </span>
        </div>
        <div #svgHost class="svg-host"></div>
        <p class="timeline-hint">Hover over events for details</p>
      </div>
    </div>

    <div #tooltip class="d3-tooltip" style="display:none"></div>
  `,
  styles: [`
    .timeline-container {
      padding: 0.5rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #777;
      font-size: 0.95rem;
    }

    .legend {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #777;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .svg-host :global(svg) {
      overflow: visible;
    }

    .svg-host :global(.tick text) {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      fill: #777;
    }

    .svg-host :global(.domain),
    .svg-host :global(.tick line) {
      stroke: #eee;
    }

    .timeline-hint {
      font-size: 0.8rem;
      color: #aaa;
      margin-top: 0.5rem;
      text-align: right;
    }
  `],
})
export class TimelineComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() encounters: Encounter[] = [];
  @Input() conditions: Condition[] = [];
  @Input() procedures: Procedure[] = [];

  @ViewChild('svgHost') svgHost!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip') tooltipEl!: ElementRef<HTMLDivElement>;

  isEmpty = false;
  legendItems = Object.values(TRACK_CONFIG).map(c => ({ label: c.label, color: c.color }));

  private viewInitialized = false;
  private tooltipDiv: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.tooltipDiv = d3.select<HTMLDivElement, unknown>(this.tooltipEl.nativeElement)
      .style('position', 'fixed')
      .style('background', 'white')
      .style('border', '1px solid #eee')
      .style('border-radius', '4px')
      .style('padding', '0.5rem 0.75rem')
      .style('font-size', '0.85rem')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
      .style('z-index', '9999')
      .style('max-width', '250px');

    this.buildTimeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewInitialized) {
      this.buildTimeline();
    }
  }

  ngOnDestroy(): void {
    if (this.tooltipDiv) {
      this.tooltipDiv.style('display', 'none');
    }
  }

  private collectEvents(): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const enc of this.encounters) {
      const dateStr = enc.period?.start;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          events.push({
            date: d,
            label: enc.type?.[0]?.coding?.[0]?.display ?? 'Encounter',
            type: 'encounter',
          });
        }
      }
    }

    for (const cond of this.conditions) {
      const dateStr = cond.onsetDateTime ?? cond.recordedDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          events.push({
            date: d,
            label: cond.code.coding?.[0]?.display ?? 'Condition',
            type: 'condition',
          });
        }
      }
    }

    for (const proc of this.procedures) {
      const dateStr = proc.performedDateTime ?? proc.performedPeriod?.start;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          events.push({
            date: d,
            label: proc.code.coding?.[0]?.display ?? 'Procedure',
            type: 'procedure',
          });
        }
      }
    }

    return events;
  }

  private buildTimeline(): void {
    const host = this.svgHost?.nativeElement;
    if (!host) return;

    d3.select(host).selectAll('*').remove();

    const events = this.collectEvents();
    this.isEmpty = events.length === 0;
    if (this.isEmpty) return;

    const VW = 800;
    const TRACK_HEIGHT = 80;
    const LABEL_WIDTH = 90;
    const margin = { top: 20, right: 20, bottom: 50, left: LABEL_WIDTH };
    const innerWidth = VW - margin.left - margin.right;
    const innerHeight = Object.keys(TRACK_CONFIG).length * TRACK_HEIGHT;
    const totalHeight = innerHeight + margin.top + margin.bottom;

    const dates = events.map(e => e.date);
    const minDate = d3.min(dates) as Date;
    const maxDate = d3.max(dates) as Date;
    const pad = (maxDate.getTime() - minDate.getTime()) * 0.05 || 86400000 * 30;

    const xScale = d3.scaleTime()
      .domain([new Date(minDate.getTime() - pad), new Date(maxDate.getTime() + pad)])
      .range([0, innerWidth]);

    const svg = d3.select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${VW} ${totalHeight}`)
      .attr('width', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tracks = Object.keys(TRACK_CONFIG) as Array<keyof typeof TRACK_CONFIG>;
    const tooltip = this.tooltipDiv;

    tracks.forEach((trackKey, i) => {
      const config = TRACK_CONFIG[trackKey];
      const cy = i * TRACK_HEIGHT + TRACK_HEIGHT / 2;

      g.append('text')
        .attr('x', -8)
        .attr('y', cy)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('fill', '#777')
        .style('font-family', "'Inter', sans-serif")
        .text(config.label);

      g.append('line')
        .attr('x1', 0).attr('x2', innerWidth)
        .attr('y1', cy).attr('y2', cy)
        .style('stroke', '#eee')
        .style('stroke-width', 2);

      const trackEvents = events.filter(e => e.type === trackKey);

      g.selectAll(`.evt-${trackKey}`)
        .data(trackEvents)
        .enter()
        .append('circle')
        .attr('class', `evt-${trackKey}`)
        .attr('cx', d => xScale(d.date))
        .attr('cy', cy)
        .attr('r', 7)
        .style('fill', config.color)
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('opacity', 0.85)
        .on('mouseover', function(event: MouseEvent, d: TimelineEvent) {
          d3.select(this).style('opacity', 1).attr('r', 9);
          if (tooltip) {
            tooltip
              .style('display', 'block')
              .html(`<strong>${d.label}</strong><br><span style="color:#777">${d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>`);
          }
        })
        .on('mousemove', function(event: MouseEvent) {
          if (tooltip) {
            tooltip
              .style('left', `${event.clientX + 12}px`)
              .style('top', `${event.clientY - 28}px`);
          }
        })
        .on('mouseout', function() {
          d3.select(this).style('opacity', 0.85).attr('r', 7);
          if (tooltip) {
            tooltip.style('display', 'none');
          }
        });
    });

    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => d3.timeFormat('%b %Y')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight + 10})`)
      .call(xAxis);
  }
}
