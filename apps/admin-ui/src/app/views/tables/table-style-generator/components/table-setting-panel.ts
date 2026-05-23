import {ChangeDetectorRef, Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {TableState, TableStyle} from '@/app/types/table';
import {FormsModule} from '@angular/forms';
import {
  ACCENT_OPTIONS, CAPTION_POSITIONS, DEFAULT_STATE,
  HEADER_ACCENTS, TABLE_SIZES, TABLE_STYLES, TABLE_THEMES
} from '@/app/views/tables/table-style-generator/data';

@Component({
  selector: 'app-table-setting-panel',
  standalone: true,
  imports: [FormsModule],
  template: `

    <div class="right-content bg-faded d-flex flex-column h-100 pt-4">
      <div class="flex-grow-1 p-3">
        <form id="tableStyleForm" autocomplete="off">

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Table Theme">
            <div class="btn-group btn-group-sm w-100" role="group">
              @for (opt of tableThemes; track $index) {
                <input type="radio" class="btn-check" name="tableTheme"
                       [(ngModel)]="state.tableTheme" [value]="opt.value" [id]="'theme' + opt.label"
                       (ngModelChange)="emitChange()"/>
                <label class="btn btn-outline-secondary" [for]="'theme' + opt.label">{{ opt.label }}</label>
              }
            </div>
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Table Styles">
            @for (opt of tableStyles; track $index) {
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" [id]="opt.id"
                       [checked]="state.tableStyles.includes(opt.value)"
                       (change)="toggleStyle(opt.value,$any($event.target!.checked))"/>
                <label class="form-check-label" [for]="opt.id">{{ opt.label }}</label>
              </div>
            }
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Size Options">
            <div class="btn-group btn-group-sm w-100">
              @for (opt of tableSizes; track $index) {
                <input type="radio" class="btn-check" name="tableSize"
                       [(ngModel)]="state.tableSize" [value]="opt.value" [id]="'size' + opt.label"
                       (ngModelChange)="emitChange()"/>
                <label class="btn btn-outline-secondary" [for]="'size' + opt.label">{{ opt.label }}</label>
              }
            </div>
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Table Accent">
            <select class="form-select" id="tableAccent"
                    [(ngModel)]="state.tableAccent" name="tableAccent"
                    [disabled]="state.tableTheme !== ''" (ngModelChange)="emitChange()">
              @for (opt of accentOptions; track $index) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <div class="form-text fs-nano">
              Table theme must be set default to use this option.
            </div>
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Header Accent">
            <select class="form-select" id="headerAccent"
                    [(ngModel)]="state.headerAccent" name="headerAccent"
                    (ngModelChange)="emitChange()">
              @for (opt of headerAccents; track $index) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Caption Position">
            <div class="btn-group btn-group-sm w-100">
              @for (opt of captionPositions; track $index) {
                <input type="radio" class="btn-check" name="captionPosition"
                       [(ngModel)]="state.captionPosition" [value]="opt.value"
                       [id]="'caption' + opt.label" (ngModelChange)="emitChange()"/>
                <label class="btn btn-outline-secondary" [for]="'caption' + opt.label">{{ opt.label }}</label>
              }
            </div>
          </div>

          <div class="mod-status primary-mod mt-1 pt-4 pb-3" data-prefix="Row Styling">
            <div class="form-text mb-2">Show example rows with contextual classes</div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="showRowClasses"
                     [(ngModel)]="state.showRowClasses" name="showRowClasses"
                     (ngModelChange)="emitChange()"/>
              <label class="form-check-label" for="showRowClasses">Show row contextual classes</label>
            </div>
          </div>


        </form>

        <div class="mt-4">
          <span class="fw-bold">Table Class:</span>
          <code class="d-block p-2 body-bg border rounded">
            {{ codeClasses }}
            <button class="btn btn-xs btn-success ms-auto" (click)="handleCopy()">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </code>
        </div>

        @if (state.headerAccent) {
          <div class="mt-4">
            <span class="fw-bold">Header Class:</span>
            <code class="d-block p-2 body-bg border rounded">
              {{ state.headerAccent }}
              <button class="btn btn-xs btn-success ms-auto" (click)="handleHeaderClassCopy()">
                {{ headerClassCopied ? 'Copied!' : 'Copy' }}
              </button>
            </code>
          </div>
        }

        <button type="button" class="btn btn-primary mt-4 w-100" (click)="handleReset()">Reset</button>
      </div>
    </div>
  `
})
export class TableSettingPanel {
  private changeDetection = inject(ChangeDetectorRef);
  @Input() state!: TableState;
  @Input() codeClasses!: string;
  @Output() stateChange = new EventEmitter<TableState>();

  tableThemes = TABLE_THEMES;
  tableStyles: { id: string; label: string; value: TableStyle }[] = TABLE_STYLES;
  tableSizes = TABLE_SIZES;
  accentOptions = ACCENT_OPTIONS;
  headerAccents = HEADER_ACCENTS;
  captionPositions = CAPTION_POSITIONS;

  copied = false;
  headerClassCopied = false;

  toggleStyle(value: TableStyle, checked: boolean) {
    if (checked) {
      this.state.tableStyles = [...this.state.tableStyles, value];

      if (value === 'table-borderless') {
        this.state.tableStyles = this.state.tableStyles.filter(v => v !== 'table-bordered');
      }
      if (value === 'table-bordered') {
        this.state.tableStyles = this.state.tableStyles.filter(v => v !== 'table-borderless');
      }
    } else {
      this.state.tableStyles = this.state.tableStyles.filter(v => v !== value);
    }
    this.emitChange();
  }


  emitChange() {
    this.stateChange.emit({...this.state});
  }

  handleReset() {
    this.stateChange.emit({...DEFAULT_STATE});
    this.copied = false;
  }

  handleCopy() {
    navigator.clipboard.writeText(this.codeClasses).then(() => {
      this.copied = true;
      this.changeDetection.markForCheck();
      setTimeout(() => {
        this.copied = false
        this.changeDetection.markForCheck();
      }, 1200);
    });
  }

  handleHeaderClassCopy() {
    navigator.clipboard.writeText(this.state.headerAccent).then(() => {
      this.headerClassCopied = true;
      this.changeDetection.markForCheck();
      setTimeout(() => {
        this.headerClassCopied = false
        this.changeDetection.markForCheck();
      }, 1200);
    });
  }
}
