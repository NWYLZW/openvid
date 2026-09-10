/** Soft surface shadow layers shared by the raw-video preview and canvas export. */
export function surfaceShadowLayers(blur: number) {
  if (blur <= 0) return [];
  return [
    { y: blur * .12, blur: blur * 1.5, opacity: .14 },
    { y: blur * .48, blur: blur * .8, opacity: .18 },
    { y: blur * .08, blur: blur * .18, opacity: .10 },
  ];
}

export function surfaceShadowCss(strength: number) {
  const layers = surfaceShadowLayers(strength * .8);
  return layers.length ? layers.map(layer =>
    `0 ${layer.y / 8.96}cqmax ${layer.blur / 8.96}cqmax rgba(0,0,0,${layer.opacity})`
  ).join(', ') : 'none';
}
