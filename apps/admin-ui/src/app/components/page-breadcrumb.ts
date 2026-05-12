import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-page-breadcrumb',
  imports: [],
  template: `
    <div>
      <h1 class="subheader-title mb-2">{{ title }}</h1>

      <nav class="app-breadcrumb" aria-label="breadcrumb">
        <ol class="breadcrumb ms-0 text-muted mb-0">
          <li class="breadcrumb-item">{{ subTitle1 }}</li>
          @if (subTitle2) {
            <li class="breadcrumb-item">{{ subTitle2 }}</li>
          }
          <li class="breadcrumb-item active" aria-current="page">
            {{ title }}
          </li>
        </ol>
      </nav>

      @if (subText) {
        <h6 class="mt-3 mb-4 fst-italic">{{ subText }}</h6>
      }
    </div>

  `,
  styles: ``
})
export class PageBreadcrumb {
  @Input({required: true}) title!: string;
  @Input() subTitle1!: string;
  @Input() subTitle2?: string;
  @Input() subText?: string;

}
