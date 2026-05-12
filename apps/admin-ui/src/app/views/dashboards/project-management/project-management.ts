import { Component } from '@angular/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {projectStatisticsData} from '@/app/views/dashboards/project-management/data';
import {ProjectStatisticWidget} from '@/app/views/dashboards/project-management/components/project-statistic-widget';
import {DevelopmentPhases} from '@/app/views/dashboards/project-management/components/development-phases';
import {ProjectProgress} from '@/app/views/dashboards/project-management/components/project-progress';
import {TaskStatus} from '@/app/views/dashboards/project-management/components/task-status';
import {TeamPerformance} from '@/app/views/dashboards/project-management/components/team-performance';
import {WeeklyActivity} from '@/app/views/dashboards/project-management/components/weekly-activity';
import {TeamWorkload} from '@/app/views/dashboards/project-management/components/team-workload';
import {ProjectTimeline} from '@/app/views/dashboards/project-management/components/project-timeline';

@Component({
  selector: 'app-project-management',
  imports: [
    PageBreadcrumb,
    ProjectStatisticWidget,
    DevelopmentPhases,
    ProjectProgress,
    TaskStatus,
    TeamPerformance,
    WeeklyActivity,
    TeamWorkload,
    ProjectTimeline
  ],
  templateUrl: './project-management.html',
  styles: ``
})
export class ProjectManagement {

  protected readonly projectStatisticsData = projectStatisticsData;
}
