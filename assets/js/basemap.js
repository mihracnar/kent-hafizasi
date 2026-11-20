/* MapLibre altlığı: OpenFreeMap Positron. Ulaşılamazsa (ör. Claude önizlemesi gibi dış bağlantıya kapalı ortamlar)
 * yalnız kara/deniz çizen yerel bir altlığa düşer. */
(function () {
  'use strict';
  const POSITRON = 'https://tiles.openfreemap.org/styles/positron';
  const VENDOR = (document.currentScript && document.currentScript.src) ? new URL('../vendor/', document.currentScript.src).href : 'assets/vendor/';
  if (window.maplibregl && maplibregl.setWorkerUrl) maplibregl.setWorkerUrl(VENDOR + 'maplibre-gl-csp-worker.js');

  // Positron'daki bazı filtreler karolarda boş (null) gelen bir özelliği sayıyla karşılaştırıyor; MapLibre her seferinde
  // "Expected value to be of type number, but found null" uyarısı yazıyor. Bu karşılaştırmaları, değer sayı değilse
  // false dönecek biçimde sarıyoruz (eski filtre sözdiziminin davranışıyla aynı: özelliği olmayan nesne eşleşmez).
  const KARSILASTIR = new Set(['<', '<=', '>', '>=']);
  const ifadeMi = x => Array.isArray(x) && typeof x[0] === 'string';
  function sayiFiltresi(f) {
    if (!ifadeMi(f)) return f;
    const yeni = f.map((x, i) => (i > 0 && ifadeMi(x)) ? sayiFiltresi(x) : x);
    if (KARSILASTIR.has(yeni[0]) && yeni.length >= 3) {
      const getler = yeni.slice(1, 3).filter(x => ifadeMi(x) && x[0] !== 'literal' && x[0] !== 'zoom');
      if (getler.length) {
        return ['case', ['all', ...getler.map(g => ['==', ['typeof', g], 'number'])], yeni, false];
      }
    }
    return yeni;
  }
  let stylePromise = null;
  function resolveStyle(dataPath) {
    if (stylePromise) return stylePromise;
    stylePromise = (async () => {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(POSITRON, { signal: ctl.signal }); clearTimeout(tm);
        if (!r.ok) throw new Error(r.status);
        const st = await r.json();
        (st.layers || []).forEach(l => { if (Array.isArray(l.filter)) l.filter = sayiFiltresi(l.filter); });
        return { style: st, glyphs: !!st.glyphs, online: true };
      } catch (e) {
        let land = { type: 'FeatureCollection', features: [] };
        try { land = await (await fetch((dataPath || 'data/') + 'onizleme_kara.json')).json(); } catch (_) { }
        return {
          online: false, glyphs: false,
          style: {
            version: 8, sources: { kara: { type: 'geojson', data: land } },
            layers: [
              { id: 'deniz', type: 'background', paint: { 'background-color': '#D5DCE0' } },
              { id: 'kara', type: 'fill', source: 'kara', paint: { 'fill-color': '#F2F0EB' } },
              { id: 'kiyi', type: 'line', source: 'kara', paint: { 'line-color': '#B9B5AC', 'line-width': 0.8 } },
            ],
          },
        };
      }
    })();
    return stylePromise;
  }

  async function create(container, opts) {
    opts = opts || {};
    const s = await resolveStyle(opts.dataPath);
    const map = new maplibregl.Map(Object.assign({
      container, style: s.style, center: [28.985, 41.03], zoom: 11.2, minZoom: 8, maxZoom: 19,
      attributionControl: s.online ? { compact: true } : false, dragRotate: false, pitchWithRotate: false,
    }, opts.map || {}));
    map.touchZoomRotate && map.touchZoomRotate.disableRotation();
    map._hafiza = { glyphs: s.glyphs, online: s.online };
    await new Promise(res => map.loaded() ? res() : map.once('load', res));
    return map;
  }
  window.HafizaBasemap = { create, resolveStyle };
})();
