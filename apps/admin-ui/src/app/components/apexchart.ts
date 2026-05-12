import {AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit} from '@angular/core';
import {ApexOptions, NgApexchartsModule} from 'ng-apexcharts';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {LayoutService} from '@core/services/layout-store.service';
import {initializeColorMap} from '@/app/utils/color-init';
import {Subscription} from 'rxjs';
import merge from 'lodash.merge';
import {getColor} from '@/app/utils/get-color';

@Component({
  selector: 'app-apexchart',
  imports: [NgApexchartsModule, CommonModule],
  template: `
    <apx-chart
      [chart]="options.chart"
      [annotations]="options.annotations"
      [colors]="options.colors"
      [dataLabels]="options.dataLabels"
      [series]="options.series ? options.series! : series!"
      [stroke]="options.stroke"
      [labels]="options.labels"
      [legend]="options.legend"
      [fill]="options.fill"
      [tooltip]="options.tooltip"
      [plotOptions]="options.plotOptions"
      [responsive]="options.responsive"
      [xaxis]="options.xaxis"
      [yaxis]="options.yaxis"
      [grid]="options.grid"
      [states]="options.states"
      [title]="options.title"
      [subtitle]="options.subtitle"
      [theme]="options.theme"
      [markers]="options.markers"
    />
  `
})
export class Apexchart implements OnInit, OnDestroy, AfterViewInit {
  @Input() getOptions!: () => ApexOptions;
  @Input() series?: ApexOptions['series'];

  cd = inject(ChangeDetectorRef);
  layout = inject(LayoutService);

  options!: Required<ApexOptions>;
  private layoutSub!: Subscription;

  private getDefaultChartOptions(): Partial<ApexOptions> {
    return {
      chart: {
        type: 'line',
        fontFamily: 'inherit',
      },
      title: {
        style: {
          color: getColor('bootstrapVars', 'bodyColor', 'hex'),
        },
      },
      subtitle: {
        style: {
          color: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.5),
        },
      },
      grid: {
        borderColor: getColor('bootstrapVars', 'bodyColor', 'rgba', 0.2),
      },
      xaxis: {
        labels: {
          style: {
            colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
          },
        },
        title: {
          style: {
            color: getColor('bootstrapVars', 'bodyColor', 'hex'),
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
          },
        },
        title: {
          style: {
            color: getColor('bootstrapVars', 'bodyColor', 'hex'),
          },
        },
      },
      tooltip: {
        theme: 'dark',
      },
      legend: {
        labels: {
          colors: getColor('bootstrapVars', 'bodyColor', 'hex'),
        },
      },
    };
  }

  private mergeOptions() {
    this.options = merge({}, this.getDefaultChartOptions(), this.getOptions()) as Required<ApexOptions>;
  }

  ngOnInit(): void {

    this.layoutSub = this.layout.state$
      .pipe(
        map(state => ({
          theme: state.theme,
          selectedTheme: state.selectedTheme
        })),
        distinctUntilChanged((prev, curr) =>
          prev.theme === curr.theme && prev.selectedTheme === curr.selectedTheme
        )
      )
      .subscribe(() => {
        initializeColorMap();
        this.mergeOptions();
        this.cd.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
    this.mergeOptions();
      initializeColorMap();
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.layoutSub?.unsubscribe();
  }
}
