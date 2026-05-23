import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MigrationsUiState } from '../migrations-ui.state';

@Component({
  selector: 'app-migrations-info-panel',
  templateUrl: './migrations-info-panel.html',
  imports: [DatePipe],
  styles: `
    .migrations-panel .sa-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
    .letter-spacing-1 {
      letter-spacing: 0.05em;
    }
  `,
})
export class MigrationsInfoPanel {
  readonly state = inject(MigrationsUiState);
}
