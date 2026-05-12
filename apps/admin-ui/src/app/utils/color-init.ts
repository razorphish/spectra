export function initializeColorMap() {
  if (typeof window === 'undefined') return;

  if (!(window as any).colorMap) {
    (window as any).colorMap = {};
  }

  const existingContainer = document.getElementById('color-init-container');
  if (existingContainer) existingContainer.remove();

  const categories = ['primary', 'danger', 'success', 'warning', 'info'];
  const shades = Array.from({ length: 17 }, (_, i) => (i + 1) * 50).filter(s => s <= 900);
  const bootstrapVars = [
    { name: 'bodyBg', style: 'background-color: var(--bs-body-bg)' },
    { name: 'bodyColor', style: 'color: var(--bs-body-color)' },
  ];

  const ul = document.createElement('ul');
  ul.style.display = 'none';

  categories.forEach(cat => {
    shades.forEach(shade => {
      const li = document.createElement('li');
      li.className = `bg-${cat}-${shade}`;
      ul.appendChild(li);
    });
  });

  bootstrapVars.forEach(v => {
    const li = document.createElement('li');
    li.style.cssText = v.style;
    li.dataset['varName'] = v.name;
    ul.appendChild(li);
  });

  const container = document.createElement('div');
  container.id = 'color-init-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.appendChild(ul);
  document.head.appendChild(container);

  const parseRgb = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
    return { r, g, b, formatted: rgb, values: `${r}, ${g}, ${b}` };
  };

  const rgbToHex = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Fill dynamic colorMap
  categories.forEach(cat => {
    if (!(window as any).colorMap[cat]) (window as any).colorMap[cat] = {};
    shades.forEach(shade => {
      const el = ul.querySelector(`.bg-${cat}-${shade}`)!;
      const color = getComputedStyle(el).backgroundColor;
      const rgbData = parseRgb(color);
      (window as any).colorMap[cat][shade] = {
        hex: rgbToHex(color),
        rgb: rgbData.formatted,
        rgba: (opacity = 1) => `rgba(${rgbData.values}, ${opacity})`,
        values: rgbData.values,
      };
    });
  });

  (window as any).colorMap.bootstrapVars = {};
  bootstrapVars.forEach(v => {
    const el = ul.querySelector(`[data-var-name="${v.name}"]`)!;
    const color = getComputedStyle(el).color || getComputedStyle(el).backgroundColor;
    const rgbData = parseRgb(color);
    (window as any).colorMap.bootstrapVars[v.name] = {
      hex: rgbToHex(color),
      rgb: rgbData.formatted,
      rgba: (opacity = 1) => `rgba(${rgbData.values}, ${opacity})`,
      values: rgbData.values,
    };
  });

  return (window as any).colorMap;
}
