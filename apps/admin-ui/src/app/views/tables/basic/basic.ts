import { Component } from '@angular/core';
import {PageBreadcrumb} from '@app/components/page-breadcrumb';
import {PanelCard} from '@app/components/panel-card';
type TableType = {
  id: number;
  firstName: string;
  lastName?: string;
  username: string;
};

type Tables2Type = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  rowClass: string;
};


@Component({
  selector: 'app-basic',
  imports: [
    PageBreadcrumb,
    PanelCard
  ],
  templateUrl: './basic.html',
  styles: ``
})
export class Basic {
  TablesData: TableType[] = [
    { id: 1, firstName: 'Mark', lastName: 'Otto', username: '@mdo' },
    { id: 2, firstName: 'Jacob', lastName: 'Thornton', username: '@fat' },
    { id: 3, firstName: 'Larry', lastName: 'the Bird', username: '@twitter' },
    { id: 4, firstName: 'Larry the Bird', username: '@twitter' },
  ];

  Tables2Data: Tables2Type[] = [
    { id: 1, firstName: 'Lisa', lastName: 'Nilson', username: '@lisa', rowClass: 'table-active' },
    { id: 2, firstName: 'Lisa', lastName: 'Nilson', username: '@lisa', rowClass: 'table-primary' },
    { id: 3, firstName: 'Nick', lastName: 'looper', username: '@king', rowClass: 'table-success' },
    { id: 4, firstName: 'Joan', lastName: 'thestar', username: '@joan', rowClass: 'table-info' },
    { id: 5, firstName: 'Sean', lastName: 'coder', username: '@coder', rowClass: 'table-warning' },
    { id: 6, firstName: 'Sean', lastName: 'coder', username: '@coder', rowClass: 'table-danger' },
  ];
}
