import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import * as THREE from 'three';
import HALO from 'vanta/dist/vanta.halo.min';

@Component({
  selector: 'app-background-animation',
  standalone: true,
  template: `<div #vantaContainer id="net" class="w-100 h-100"></div>`,
  styles: [`
    #net {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  `]
})
export class BackgroundAnimationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vantaContainer', { static: true }) vantaRef!: ElementRef<HTMLDivElement>;

  private vantaEffect: any;

  ngAfterViewInit(): void {
    if (!this.vantaEffect) {
      this.vantaEffect = HALO({
        el: this.vantaRef.nativeElement,
        THREE: THREE,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        color: 0xfd3995,
        backgroundColor: '#515a99',
        size: 1.6,
        scale: 0.75,
        xOffset: 0.22,
        scaleMobile: 0.5,
      });
    }
  }

  ngOnDestroy(): void {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }
  }
}
