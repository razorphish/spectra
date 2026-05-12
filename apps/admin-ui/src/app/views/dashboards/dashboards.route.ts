import {Routes} from '@angular/router';
import {ControlCenter} from './control-center/control-center';
import {Subscription} from '@/app/views/dashboards/subscription/subscription';
import {Marketing} from '@/app/views/dashboards/marketing/marketing';
import {ProjectManagement} from '@/app/views/dashboards/project-management/project-management';


export const DASHBOARDS_ROUTES: Routes = [
  {
    path: 'dashboards/control-center',
    component: ControlCenter,
    data: {title: "Control Center"},
  },
  {
    path: 'dashboards/subscription',
    component: Subscription,
    data: {title: "Subscription"},
  },
  {
    path: 'dashboards/marketing',
    component: Marketing,
    data: {title: "Marketing"},
  },
  {
    path: 'dashboards/project-management',
    component: ProjectManagement,
    data: {title: "Project Management"},
  },

];
