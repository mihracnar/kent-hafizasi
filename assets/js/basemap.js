/* MapLibre altlığı: OpenFreeMap Positron. Ulaşılamazsa (ör. Claude önizlemesi gibi dış bağlantıya kapalı ortamlar)
 * yalnız kara/deniz çizen yerel bir altlığa düşer. */
(function () {
  'use strict';
  const POSITRON = 'https://tiles.openfreemap.org/styles/positron';
  const VENDOR = (document.currentScript && document.currentScript.src) ? new URL('../vendor/', document.currentScript.src).href : 'assets/vendor/';
  // Mekân etiketleri yarı kalın (Noto Sans SemiBold). OpenFreeMap'te bu ağırlık yok; glifleri depodan veriyoruz.
  // Yalnız bu yazı tipinin istekleri yönlendirilir; depoda olmayan bir aralık istenirse Regular'a düşer.
  const GLIF = new URL('../glyphs/noto-sans-semibold/', new URL(VENDOR, location.href)).href;
  const YARIKALIN = /Noto(%20|\s)Sans(%20|\s)SemiBold/;
  const YEREL_ARALIK = new Set(['0-255', '256-511', '512-767', '768-1023', '1024-1279', '7680-7935', '8192-8447', '8448-8703']);
  function istekDonustur(url, tur) {
    if (tur !== 'Glyphs' || !YARIKALIN.test(url)) return undefined;
    const m = url.match(/\/(\d+-\d+)\.pbf/);
    if (m && YEREL_ARALIK.has(m[1])) return { url: GLIF + m[1] + '.pbf' };
    return { url: url.replace(YARIKALIN, 'Noto$1Sans$2Regular') };
  }
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
      let stilGeldi = false;
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(POSITRON, { signal: ctl.signal });
        if (!r.ok) throw new Error(r.status);
        const st = await r.json(); stilGeldi = true;
        (st.layers || []).forEach(l => { if (Array.isArray(l.filter)) l.filter = sayiFiltresi(l.filter); });
        // Vektör karo kaynağının TileJSON'unu (…/planet) biz çekip stile gömüyoruz. Reklam/izleme engelleyiciler bu
        // adresi engelleyebiliyor (ERR_BLOCKED_BY_CLIENT); o zaman harita bomboş kalacağına yerel kıyı altlığına düşeriz.
        for (const src of Object.values(st.sources || {})) {
          if (src.type !== 'vector' || !src.url) continue;
          const t = await fetch(src.url, { signal: ctl.signal });
          if (!t.ok) throw new Error(t.status);
          const j = await t.json();
          if (!Array.isArray(j.tiles) || !j.tiles.length) throw new Error('tilejson');
          ['tiles', 'minzoom', 'maxzoom', 'bounds', 'attribution', 'scheme'].forEach(k => { if (j[k] != null) src[k] = j[k]; });
          delete src.url;
        }
        clearTimeout(tm);
        return { style: st, glyphs: !!st.glyphs, online: true };
      } catch (e) {
        let land = { type: 'FeatureCollection', features: [] };
        try { land = await (await fetch((dataPath || 'data/') + 'onizleme_kara.json')).json(); } catch (_) { }
        return {
          online: false, glyphs: false, engellendi: stilGeldi,
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
      attributionControl: s.online ? { compact: true } : false, dragRotate: false, pitchWithRotate: false, transformRequest: istekDonustur,
    }, opts.map || {}));
    map.touchZoomRotate && map.touchZoomRotate.disableRotation();
    map._hafiza = { glyphs: s.glyphs, online: s.online, engellendi: !!s.engellendi };
    await new Promise(res => map.loaded() ? res() : map.once('load', res));
    return map;
  }
  window.HafizaBasemap = { create, resolveStyle, istekDonustur, YARIKALIN_FONT: ['Noto Sans SemiBold'] };
})();
