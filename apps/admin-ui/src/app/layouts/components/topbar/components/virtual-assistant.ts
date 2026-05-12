import {Component, inject, TemplateRef} from '@angular/core';
import {NgbOffcanvas, NgbOffcanvasModule, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-virtual-assistant',
  imports: [NgbOffcanvasModule,NgbTooltipModule],
  template: `
    <button type="button" class="btn btn-system" (click)="open(content)">
      <svg class="sa-icon sa-icon-2x">
        <use href="/assets/icons/sprite.svg#aperture"></use>
      </svg>
    </button>

    <aside class="app-drawer js-app-drawer">
      <ng-template #content let-offcanvas>
        <button type="button" class="btn btn-system position-absolute top-0 end-0 z-2 overflow-hidden p-3"
                (click)="offcanvas.dismiss()">
          <svg class="sa-icon sa-icon-2x">
            <use href="/assets/icons/sprite.svg#x"></use>
          </svg>
        </button>

        <div class="custom-scrollbar h-100 p-0">
          <div class="d-flex flex-grow-1 p-0 w-100 h-100">
            <div class="d-flex flex-column flex-grow-1 flex-0 overflow-x-auto h-100">

              <div class="flex-wrap align-items-center flex-grow-1 position-relative bg-gray-50">
                <div class="position-absolute top-0 bottom-0 w-100 overflow-hidden d-flex flex-column">

                  <div class="w-100 p-4 pb-0 px-lg-3 bg-subtlelight-fade custom-scroll flex-grow-1 d-flex flex-column">

                    <div class="mb-g">
                      <h4 class="fw-600">Hi Sunny,</h4>
                      <span class="text-muted">how can I help you today?</span>
                    </div>
                    <div class="mt-auto ms-auto mb-2 btn btn-outline-default px-2 py-1 fw-500 fs-xs text-gradient">
                      Analyze my data
                    </div>
                    <p class="ms-auto mb-2 btn btn-outline-default px-2 py-1 fs-xs fw-500 text-gradient">
                      Create a new report
                    </p>
                    <p class="ms-auto mb-2 btn btn-outline-default px-2 py-1 fs-xs fw-500 text-gradient">
                      Summarize my Calendar
                    </p>

                  </div>

                  <div class="bg-faded m-3 rounded height-auto">
                    <textarea rows="2" class="form-control px-2 rounded-top" placeholder="Ask me anything"></textarea>
                    <div class="d-flex align-items-center py-2 px-2 border border-top-0 rounded-bottom">
                      <div class="d-flex gap-1 flex-row align-items-center flex-wrap flex-shrink-0">
                        <button class="btn btn-icon fs-xl flex-shrink-0 waves-effect" aria-label="Attach Files or Photos"
                                type="button"
                                ngbTooltip="Attach Files or Photos"
                                placement="top">
                          <svg class="sa-icon sa-bold sa-icon-subtlelight">
                            <use href="/assets/icons/sprite.svg#file"></use>
                          </svg>
                        </button>
                        <button class="btn btn-icon fs-xl width-1 flex-shrink-0 waves-effect" aria-label="Voice" type="button"
                                ngbTooltip="Voice" placement="top">
                          <svg class="sa-icon sa-bold sa-icon-subtlelight">
                            <use href="/assets/icons/sprite.svg#mic"></use>
                          </svg>
                        </button>
                      </div>
                      <button class="btn btn-icon fs-xl width-1 flex-shrink-0 ms-auto waves-effect" aria-label="Send" type="button"
                              ngbTooltip="Send" placement="top"
                              (click)="onAssistantSend()">
                        <svg class="sa-icon sa-bold sa-icon-subtlelight sa-icon-2x">
                          <use href="/assets/icons/sprite.svg#arrow-up-circle"></use>
                        </svg>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </aside>

  `,
  styles: ``
})
export class VirtualAssistant {
  private readonly offcanvas = inject(NgbOffcanvas);

  onAssistantSend(): void {
    console.debug('[application-intelligence] virtual assistant send (stub — connect API or LLM here).');
  }

  open(content: TemplateRef<unknown>) {
    this.offcanvas.open(content, { position: 'end' });
  }
}
