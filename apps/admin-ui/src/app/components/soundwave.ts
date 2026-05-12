import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soundwave',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #canvasRef style="display: block;"></canvas>`
})
export class SoundwaveComponent implements OnInit {
  @Input() minWidth = 100;
  @Input() maxWidth = 300;
  @Input() height = 35;
  @Input() barWidth = 2;
  @Input() barGap = 1;
  @Input() barColor = '#aaaaaa';

  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private maxBarHeight!: number;

  ngOnInit(): void {
    this.maxBarHeight = this.height * 0.4;
    this.drawRandomWave();
  }

  private generateRandomWaveform(samples: number): number[] {
    const frequency = 0.05 + Math.random() * 0.1;
    const amplitude = this.maxBarHeight * 0.7;
    const noiseLevel = 0.3 + Math.random() * 0.4;

    const waveform: number[] = [];
    for (let i = 0; i < samples; i++) {
      const sineValue =
        Math.sin(i * frequency) * amplitude +
        Math.sin(i * frequency * 2) * (amplitude / 3);
      const noise = (Math.random() - 0.5) * amplitude * noiseLevel;
      const value = Math.abs(sineValue + noise);
      waveform.push(Math.min(value, this.maxBarHeight));
    }
    return waveform;
  }

  private drawWaveform(waveform: number[], width: number, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, width, this.height);
    ctx.fillStyle = this.barColor;

    waveform.forEach((barHeight, i) => {
      const x = i * (this.barWidth + this.barGap);
      const y = this.height / 2 - barHeight / 2;
      ctx.fillRect(x, y, this.barWidth, barHeight);
    });
  }

  private drawRandomWave() {
    const canvas = this.canvasRef.nativeElement;
    const width = Math.floor(this.minWidth + Math.random() * (this.maxWidth - this.minWidth + 1));
    canvas.width = width;
    canvas.height = this.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const samples = Math.floor(width / (this.barWidth + this.barGap));
    const waveform = this.generateRandomWaveform(samples);

    this.drawWaveform(waveform, width, ctx);
  }
}
