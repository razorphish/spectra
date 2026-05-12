import {initializeColorMap} from '@/app/utils/color-init';

let initialized = false;
let colorMap: any;

export function getColor(category: string, shadeOrVar: number | string, format: 'hex' | 'rgb' | 'rgba' = 'hex', opacity = 1): string {
  if (typeof window === 'undefined') return '';

  if (!initialized) {
    colorMap = initializeColorMap();
    initialized = true;
  }

  if (category === 'bootstrapVars') {
    const entry = colorMap?.bootstrapVars?.[shadeOrVar];
    return entry ? (format === 'rgba' ? entry.rgba(opacity) : entry[format]) : '';
  }

  const entry = colorMap?.[category]?.[shadeOrVar];
  return entry ? (format === 'rgba' ? entry.rgba(opacity) : entry[format]) : '';
}
