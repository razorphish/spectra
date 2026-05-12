import { Component } from '@angular/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {statistics} from '@/app/views/dashboards/subscription/data';
import {StatisticWidget} from '@/app/views/dashboards/subscription/components/statistic-widget';
import {SubscriptionFeed} from '@/app/views/dashboards/subscription/components/subscription-feed';
import {UserActivity} from '@/app/views/dashboards/subscription/components/user-activity';
import {DataStream} from '@/app/views/dashboards/subscription/components/data-stream';
import {DemographicMarketing} from '@/app/views/dashboards/subscription/components/demographic-marketing';
import {BuildCampaign} from '@/app/views/dashboards/subscription/components/build-campaign';

@Component({
  selector: 'app-subscription',
  imports: [
    PageBreadcrumb,
    StatisticWidget,
    SubscriptionFeed,
    UserActivity,
    DataStream,
    DemographicMarketing,
    BuildCampaign
  ],
  templateUrl: './subscription.html',
  styles: ``
})
export class Subscription {

  protected readonly statistics = statistics;
}
