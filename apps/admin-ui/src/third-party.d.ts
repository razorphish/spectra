declare module 'vanta/dist/vanta.halo.min' {
  const HALO: (opts: Record<string, unknown>) => { destroy: () => void };
  export default HALO;
}

declare module 'jsvectormap' {
  export default class JsVectorMap {
    constructor(options: Record<string, unknown>);
    updateSize(): void;
    destroy(): void;
  }
}
