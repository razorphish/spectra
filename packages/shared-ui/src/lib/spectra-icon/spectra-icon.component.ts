import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Spectra icon set — outline glyphs on a 24×24 grid, drawn with `stroke: currentColor`
 * (Heroicons-outline geometry, matching the SVGs already used across the apps).
 * Each entry is the list of SVG `<path d>` strings that make up the glyph.
 *
 * To add an icon: drop its path `d` value(s) here under a kebab-case name. Keep the
 * viewBox 24×24 and outline style so every icon reads consistently at any size.
 */
export const SPECTRA_ICONS = {
  /** `</>` — view code / raw JSON. */
  code: ['M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5'],
  eye: [
    'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  pencil: [
    'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
  ],
  trash: [
    'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  ],
  document: [
    'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  ],
  copy: [
    'M15.75 9h-7.5A2.25 2.25 0 006 11.25v7.5A2.25 2.25 0 008.25 21h7.5a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0015.75 9z',
    'M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184',
  ],
  refresh: [
    'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  ],
  plus: ['M12 4.5v15m7.5-7.5h-15'],
  'x-mark': ['M6 18 18 6M6 6l12 12'],
} as const;

export type SpectraIconName = keyof typeof SPECTRA_ICONS;

/**
 * Inline SVG icon: `<spectra-icon name="code" />`. Inherits `currentColor` from its
 * container, so button/link color styles apply automatically. Size via the `size`
 * input (any CSS length) or by setting `font-size`/width on the host.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'spectra-icon',
  standalone: true,
  template: `
    <svg
      class="spectra-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      [style.width]="size()"
      [style.height]="size()"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of paths(); track d) {
        <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="d" />
      }
    </svg>
  `,
  styles: [
    `
      .spectra-icon {
        display: inline-block;
        vertical-align: -0.125em;
        flex-shrink: 0;
      }
    `,
  ],
})
export class SpectraIconComponent {
  /** Icon name from the {@link SPECTRA_ICONS} registry. */
  readonly name = input.required<SpectraIconName>();
  /** CSS length for width/height. Defaults to 1.125rem (matches existing icon buttons). */
  readonly size = input('1.125rem');
  readonly strokeWidth = input(1.5);

  protected readonly paths = computed<readonly string[]>(() => SPECTRA_ICONS[this.name()]);
}
