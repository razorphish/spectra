import { Component } from '@angular/core';

@Component({
  selector: 'app-error-404',
  imports: [],
  template: `
    <div class="main-content hide-page-header d-flex justify-content-center align-items-center position-relative">

      <div
        class="logo-backdrop position-absolute translate-middle top-50 start-50 d-flex align-items-center justify-content-center"
        style="width: 45rem; height: 45rem;  --blob-1: var(--danger-500); --blob-2: var(--warning-500);">
        <div class="blobs">
          <svg viewBox="0 0 1200 1200">
            <g class="blob blob-1">
              <path></path>
            </g>
            <g class="blob blob-2">
              <path></path>
            </g>
            <g class="blob blob-3">
              <path></path>
            </g>
            <g class="blob blob-4">
              <path></path>
            </g>
            <g class="blob blob-1 alt">
              <path></path>
            </g>
            <g class="blob blob-2 alt">
              <path></path>
            </g>
            <g class="blob blob-3 alt">
              <path></path>
            </g>
            <g class="blob blob-4 alt">
              <path></path>
            </g>
          </svg>
        </div>
      </div>

      <div class="h-alt-hf d-flex flex-column align-items-center justify-content-center text-center"
           style="z-index: 2;">
        <h1 class="page-error color-fusion-500" style="font-size: 750%; font-weight: 700;">
          ERROR <span class="text-gradient">404</span>

          <small class="fw-500" style="font-size: 40%;">
            Our AI servers are overloaded!
          </small>
        </h1>
        <h3 class="fw-500 mb-5 text-muted">
          We are sorry, but the page you are looking for does not exist.
        </h3>
      </div>

    </div>
  `,
  styles: ``
})
export class Error404 {

}
