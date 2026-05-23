import { afterNextRender, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { PageBreadcrumb } from '@app/components/page-breadcrumb';
import { MigrationsInfoPanel } from '../migrations-info-panel/migrations-info-panel';
import { MigrationsListPanel } from '../migrations-list-panel/migrations-list-panel';
import { MigrationsRunnerSettingsPanel } from '../migrations-runner-settings-panel/migrations-runner-settings-panel';
import { MigrationsUiState } from '../migrations-ui.state';

@Component({
  selector: 'app-settings-page',
  imports: [
    PageBreadcrumb,
    FormsModule,
    NgbNavModule,
    NgbNavOutlet,
    MigrationsInfoPanel,
    MigrationsListPanel,
    MigrationsRunnerSettingsPanel,
  ],
  providers: [MigrationsUiState],
  templateUrl: './settings-page.html',
  styles: `
    .settings-migrations-nav .sa-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
  `,
})
export class SettingsPage {
  activeId = 'info';
  private readonly migrationsState = inject(MigrationsUiState);

  constructor() {
    afterNextRender(() => {
      void this.migrationsState.loadInitial();
    });
  }
}
