import {Component, DOCUMENT, Inject, signal} from '@angular/core';

type FullScreenTypes = {
  requestFullscreen?: () => Promise<void>
  mozRequestFullScreen?: () => Promise<void>
  mozCancelFullScreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
  webkitExitFullscreen?: () => Promise<void>
  mozFullScreenElement?: Element
  msFullscreenElement?: Element
  webkitFullscreenElement?: Element
  msRequestFullscreen?: () => Promise<void>
  mozRequestFullscreen?: () => Promise<void>
  webkitRequestFullscreen?: () => Promise<void>
}

@Component({
  selector: 'app-toggle-fullscreen',
  imports: [],
  template: `
    <button type="button" class="btn btn-system"
            (click)="fullscreen()">
      @if (isFullscreen()) {
        <svg class="sa-icon sa-icon-2x ">
          <use href="/assets/icons/sprite.svg#minimize"></use>
        </svg>
      } @else {
        <svg class="sa-icon sa-icon-2x">
          <use href="/assets/icons/sprite.svg#maximize"></use>
        </svg>
      }
    </button>
  `,
  styles: ``
})
export class ToggleFullscreen {
  constructor(@Inject(DOCUMENT) private document: Document & FullScreenTypes) {
    this.element = this.document.documentElement as FullScreenTypes
  }

  element!: FullScreenTypes
  isFullscreen = signal(false);

  fullscreen() {
    document.body.classList.toggle('fullscreen-enable')
    if (
      !document.fullscreenElement &&
      !this.element.mozFullScreenElement &&
      !this.element.webkitFullscreenElement
    ) {
      if (this.element.requestFullscreen) {
        this.element.requestFullscreen()
      } else if (this.element.mozRequestFullScreen) {
        /* Firefox */
        this.element.mozRequestFullScreen()
      } else if (this.element.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        this.element.webkitRequestFullscreen()
      } else if (this.element.msRequestFullscreen) {
        /* IE/Edge */
        this.element.msRequestFullscreen()
      }
      this.isFullscreen.set(true);
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen()
      } else if (this.document.mozCancelFullScreen) {
        /* Firefox */
        this.document.mozCancelFullScreen()
      } else if (this.document.webkitExitFullscreen) {
        /* Chrome, Safari and Opera */
        this.document.webkitExitFullscreen()
      } else if (this.document.msExitFullscreen) {
        /* IE/Edge */
        this.document.msExitFullscreen()
      }
      this.isFullscreen.set(false);
    }
  }
}
