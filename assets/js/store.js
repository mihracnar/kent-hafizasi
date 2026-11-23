/* Hafıza İstanbul — ortak veri katmanı.
 *
 * Tablolar: mekanlar, hikayeler, kisiler, gorseller, hikaye_mekan, hikaye_kisi, mekan_kisi
 * ve kategori listeleri: mekan_gruplari (renkler), mekan_turleri (tür → grup), listeler (hikâye konuları, meslekler).
 * Taban veri data/*.json dosyalarından okunur. Üzerine iki katman biner:
 *   yayin  : yayınlanmış değişiklikler (site bunları görür)
 *   taslak : panelde kaydedilmiş ama yayınlanmamış değişiklikler (yalnız panel görür)
 * Katmanların nerede tutulacağı arka uca bağlıdır:
 *   - Google Sheets (config.sheetsUrl doluysa): panel tabloları doğrudan Apps Script'ten okur/yazar.
 *   - Claude önizlemesi: sayfanın paylaşılan veritabanı (claude.use('db')).
 *   - Hiçbiri yoksa: bu tarayıcının localStorage'ı.
 */
(function () {
  'use strict';
  const TABLES = ['mekanlar', 'hikayeler', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi', 'mekan_gruplari', 'mekan_turleri', 'listeler'];
  const CFG = Object.assign({ sheetsUrl: '', dataPath: 'data/', siteUrl: '' }, window.HAFIZA_CONFIG || {});

  // ---------- yardımcılar ----------
  const TRMAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'Â': 'a' };
  function slugify(s) {
    return String(s || '').replace(/[çğıİöşüâîûÇĞÖŞÜÂ]/g, c => TRMAP[c] || c).normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '') || 'kayit';
  }
  function fold(s) { return String(s || '').toLocaleLowerCase('tr').replace(/[âàá]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function dist(a, b) { // metre
    if (a.enlem == null || b.enlem == null) return Infinity;
    const dx = (a.boylam - b.boylam) * 111320 * Math.cos(a.enlem * Math.PI / 180), dy = (a.enlem - b.enlem) * 110570;
    return Math.hypot(dx, dy);
  }
  function rowKey(table, r) {
    if (table === 'hikaye_mekan') return r.hikaye_id + '__' + r.mekan_id;
    if (table === 'hikaye_kisi') return r.hikaye_id + '__' + r.kisi_id;
    if (table === 'mekan_kisi') return r.mekan_id + '__' + r.kisi_id;
    if (table === 'mekan_gruplari' || table === 'mekan_turleri') return slugify(r.ad);
    if (table === 'listeler') return r.liste + '__' + slugify(r.deger);
    return r.id;
  }
  function imgUrl(g, w) {
    if (!g) return '';
    if (g.site_url) return g.site_url;
    return g.drive_id ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(g.drive_id)}` : ''; // eski sitenin çalışan biçimi; boyut eki eklenmez
  }
  function driveLink(g) { return g && g.drive_id ? `https://drive.google.com/file/d/${g.drive_id}/view` : ''; }

  // ---------- katman arka uçları ----------
  function lsBackend() {
    const K = 'hafiza-katman-';
    const read = n => { try { return JSON.parse(localStorage.getItem(K + n) || '{}'); } catch (e) { return {}; } };
    const write = (n, v) => { try { localStorage.setItem(K + n, JSON.stringify(v)); return true; } catch (e) { return false; } };
    return {
      kind: 'local', label: 'Önizleme · taslaklar yalnız bu tarayıcıda',
      async all(layer) { return read(layer); },
      async put(layer, id, val) { const o = read(layer); o[id] = val; write(layer, o); },
      async del(layer, id) { const o = read(layer); delete o[id]; write(layer, o); },
    };
  }
  async function dbBackend() {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    let db = null;
    try { db = await Promise.race([window.claude.use('db'), new Promise(r => setTimeout(() => r(null), 8000))]); } catch (e) { db = null; }
    if (!db) return null;
    const toList = res => {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.docs)) return res.docs;
      if (typeof res.forEach === 'function') { const a = []; res.forEach(d => a.push(d)); return a; }
      return Object.keys(res).map(k => ({ id: k, data: res[k] }));
    };
    const dataOf = d => (d && typeof d.data === 'function') ? d.data() : (d && d.data !== undefined ? d.data : d);
    const idOf = d => d.id || (d.ref && d.ref.id) || (d.path ? String(d.path).split('/').pop() : '');
    const b = {
      kind: 'db', label: 'Önizleme · taslaklar sayfanın veritabanında',
      async all(layer) {
        const out = {};
        for (const d of toList(await db.collection(layer).get())) {
          const v = dataOf(d); const id = idOf(d) || (v && v.key);
          if (v && id) out[id] = v;
        }
        return out;
      },
      async put(layer, id, val) { await db.doc(layer + '/' + id).set(val); },
      async del(layer, id) { await db.doc(layer + '/' + id).delete(); },
    };
    try { await b.all('yayin'); } catch (e) { console.warn('db okunamadı, localStorage kullanılacak', e); return null; }
    return b;
  }

  // ---------- Google Sheets (Apps Script) ----------
  async function sheetsCall(action, payload) {
    const key = (() => { try { return localStorage.getItem('hafiza-panel-anahtar') || ''; } catch (e) { return ''; } })();
    if (action === 'all') {
      const r = await fetch(CFG.sheetsUrl + '?action=all&key=' + encodeURIComponent(key));
      if (!r.ok) throw new Error('Sheets okunamadı: ' + r.status);
      return r.json();
    }
    const r = await fetch(CFG.sheetsUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, key }, payload)) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Sheets yazılamadı');
    return j;
  }

  // ---------- ana nesne ----------
  const Store = {
    cfg: CFG, TABLES, slugify, fold, esc, dist, rowKey, imgUrl, driveLink,
    base: {}, layers: { yayin: {}, taslak: {} }, backend: null, mode: 'site', t: {}, ix: {},

    async load(mode) {
      this.mode = mode || 'site';
      if (this.mode === 'panel' && CFG.sheetsUrl) {
        const all = await sheetsCall('all');
        TABLES.forEach(n => { this.base[n] = all[n] || []; });
        this.backend = { kind: 'sheets', label: "Google Sheets'e bağlı" };
      } else {
        const res = await Promise.all(TABLES.map(n => fetch(CFG.dataPath + n + '.json').then(r => r.ok ? r.json() : [])));
        TABLES.forEach((n, i) => { this.base[n] = res[i]; });
        if (this.mode === 'panel') await this.ozelKat();
        this.backend = (await dbBackend()) || lsBackend();
        try { this.layers.yayin = await this.backend.all('yayin'); } catch (e) { this.layers.yayin = {}; }
        if (this.backend.kind === 'db') { // aynı tarayıcıda localStorage'a yazılmış yayınları da kat (panel db'ye ulaşamadıysa)
          const yerel = await lsBackend().all('yayin');
          Object.entries(yerel).forEach(([k, v]) => { const d = this.layers.yayin[k]; if (!d || (v.zaman || '') > (d.zaman || '')) this.layers.yayin[k] = v; });
        }
        if (this.mode === 'panel') { try { this.layers.taslak = await this.backend.all('taslak'); } catch (e) { this.layers.taslak = {}; } }
      }
      this.rebuild();
      return this;
    },

    // Panel: depoya girmeyen iç alanlar (veri giren, not, konu notu…) data_ozel/ altında durur; varsa tabana eklenir.
    async ozelKat() {
      const al = async f => { try { const r = await fetch((CFG.ozelPath || 'data_ozel/') + f); return r.ok ? await r.json() : null; } catch (e) { return null; } };
      const tum = await al('gorseller_tum.json'); if (Array.isArray(tum)) this.base.gorseller = tum;
      for (const n of ['mekanlar', 'hikayeler', 'gorseller', 'kisiler']) {
        const oz = await al(n + '.json'); if (!Array.isArray(oz)) continue;
        const m = new Map(oz.map(x => [x.id, x]));
        // iç alanlar eklenir; herkese açık veride boşaltılmış alanlar (onaylanmamış Vikipedi önerisi gibi) iç kopyadan doldurulur
        this.base[n] = this.base[n].map(r => { if (!m.has(r.id)) return r; const o = Object.assign({}, r); Object.entries(m.get(r.id)).forEach(([k, v]) => { if (o[k] == null || o[k] === '') o[k] = v; }); return o; });
      }
      this.ozelVar = true;
    },
    // taban + yayin (+ taslak) birleştir, dizinleri kur
    rebuild() {
      const order = this.mode === 'panel' ? ['yayin', 'taslak'] : ['yayin'];
      TABLES.forEach(n => {
        const m = new Map(this.base[n].map(r => [rowKey(n, r), r]));
        order.forEach(L => Object.values(this.layers[L] || {}).forEach(e => {
          if (!e || e.table !== n) return;
          if (e.silindi) m.delete(e.key); else m.set(e.key, e.row);
        }));
        this.t[n] = [...m.values()];
      });
      const t = this.t, ix = this.ix = {};
      const byId = n => new Map(t[n].map(r => [r.id, r]));
      ix.mekan = byId('mekanlar'); ix.hikaye = byId('hikayeler'); ix.kisi = byId('kisiler'); ix.gorsel = byId('gorseller');
      ix.mekanSlug = new Map(t.mekanlar.map(r => [r.slug, r])); ix.hikayeSlug = new Map(t.hikayeler.map(r => [r.slug, r])); ix.kisiSlug = new Map(t.kisiler.map(r => [r.slug, r]));
      const group = (rows, k) => { const g = new Map(); rows.forEach(r => { if (!g.has(r[k])) g.set(r[k], []); g.get(r[k]).push(r); }); return g; };
      const site = this.mode === 'site';
      const yayinda = r => !site || (r && r.durum !== 'taslak' && r.durum !== 'arsiv');
      const hm = t.hikaye_mekan.filter(x => ix.hikaye.has(x.hikaye_id) && ix.mekan.has(x.mekan_id) && yayinda(ix.hikaye.get(x.hikaye_id)) && yayinda(ix.mekan.get(x.mekan_id)));
      ix.hmByHikaye = group(hm, 'hikaye_id'); ix.hmByMekan = group(hm, 'mekan_id');
      ix.hmByHikaye.forEach(a => a.sort((p, q) => (+p.sira || 0) - (+q.sira || 0)));
      const hk = t.hikaye_kisi.filter(x => ix.hikaye.has(x.hikaye_id) && ix.kisi.has(x.kisi_id) && (!site || x.onay === 'onaylı'));
      ix.hkByHikaye = group(hk, 'hikaye_id'); ix.hkByKisi = group(hk, 'kisi_id');
      const mk = (t.mekan_kisi || []).filter(x => ix.mekan.has(x.mekan_id) && ix.kisi.has(x.kisi_id) && yayinda(ix.mekan.get(x.mekan_id)) && (!site || x.onay === 'onaylı'));
      ix.mkByMekan = group(mk, 'mekan_id'); ix.mkByKisi = group(mk, 'kisi_id');
      const gor = site ? t.gorseller.filter(g => g.drive_id || g.site_url) : t.gorseller;
      ix.gByMekan = group(gor, 'mekan_id'); ix.gByHikaye = group(gor, 'hikaye_id');
      // fotoğraf konusu: mekân (yerin kendisi) önce, sonra hikâye (an/olay), en son kişi fotoğrafları
      const KONU = { 'mekân': 0, 'hikâye': 1 };
      ix.gByMekan.forEach(a => a.sort((p, q) => (KONU[p.konu] || 0) - (KONU[q.konu] || 0) || (p.hikaye_id || '').localeCompare(q.hikaye_id || '') || (+p.sira || 0) - (+q.sira || 0)));
      ix.gByKisi = new Map();
      gor.forEach(g => String(g.kisi_id || '').split(',').map(x => x.trim()).filter(Boolean).forEach(k => { if (!ix.gByKisi.has(k)) ix.gByKisi.set(k, []); ix.gByKisi.get(k).push(g); }));
      ix.gByKisi.forEach(a => a.sort((p, q) => String(p.kisi_id).split(',').length - String(q.kisi_id).split(',').length)); // önce kişinin tek başına göründüğü kareler
      const sira = (a, b) => (+a.sira || 0) - (+b.sira || 0);
      t.mekan_gruplari.sort(sira); t.mekan_turleri.sort(sira); t.listeler.sort(sira);
      ix.grup = new Map(t.mekan_gruplari.map(r => [r.ad, r]));
      ix.tur = new Map(t.mekan_turleri.map(r => [r.ad, r]));
    },

    // ---------- sorgular ----------
    mekanHikayeleri(mid) { return (this.ix.hmByMekan.get(mid) || []).map(x => this.ix.hikaye.get(x.hikaye_id)).filter(Boolean); },
    hikayeMekanlari(hid) { return (this.ix.hmByHikaye.get(hid) || []).map(x => Object.assign({ _sira: x.sira, _rol: x.rol }, this.ix.mekan.get(x.mekan_id))).filter(m => m.id); },
    anaMekan(hid) { const a = this.ix.hmByHikaye.get(hid) || []; const x = a.find(y => y.rol === 'ana') || a[0]; return x ? this.ix.mekan.get(x.mekan_id) : null; },
    hikayeKisileri(hid, all) { return (this.ix.hkByHikaye.get(hid) || []).filter(x => all || x.onay === 'onaylı').map(x => Object.assign({ _onay: x.onay }, this.ix.kisi.get(x.kisi_id))); },
    kisiHikayeleri(kid) { return (this.ix.hkByKisi.get(kid) || []).filter(x => x.onay === 'onaylı').map(x => this.ix.hikaye.get(x.hikaye_id)).filter(Boolean); },
    // mekânın doğrudan kişi bağları (mekan_kisi: "burada yaşadı", "evi" gibi mekân bilgisinden gelen bağlar)
    mekanKisiBaglari(mid, all) { return (this.ix.mkByMekan.get(mid) || []).filter(x => all || x.onay === 'onaylı').map(x => Object.assign({ _onay: x.onay, _iliski: x.iliski }, this.ix.kisi.get(x.kisi_id))); },
    kisiMekanlari(kid) { // kişi → doğrudan bağlı mekânlar + hikâyeler üzerinden mekânlar
      const seen = new Map(), ekle = m => { if (!seen.has(m.id)) seen.set(m.id, { mekan: m, hikayeler: [], dogrudan: false }); return seen.get(m.id); };
      (this.ix.mkByKisi.get(kid) || []).filter(x => x.onay === 'onaylı').forEach(x => { const m = this.ix.mekan.get(x.mekan_id); if (m) { const e = ekle(m); e.dogrudan = true; e.iliski = x.iliski; } });
      this.kisiHikayeleri(kid).forEach(h => this.hikayeMekanlari(h.id).forEach(m => ekle(m).hikayeler.push(h)));
      return [...seen.values()];
    },
    mekanKisileri(mid) {
      const m = new Map();
      this.mekanKisiBaglari(mid).forEach(k => m.set(k.id, k));
      this.mekanHikayeleri(mid).forEach(h => this.hikayeKisileri(h.id).forEach(k => m.set(k.id, k)));
      return [...m.values()];
    },
    // haritada görünür mi: genel bilgisi ya da hikâyesi olan mekân
    mekanIcerikli(m) { return !!((m.aciklama || '').trim() || this.vikipedi(m) || this.mekanHikayeleri(m.id).length || this.mekanKisiBaglari(m.id).length); },
    // onaylı Vikipedi özeti (yoksa null); site yalnız onaylıyı gösterir
    vikipedi(r) { return r && r.vikipedi_onay === 'onaylı' && (r.vikipedi_ozet || '').trim() ? { ozet: r.vikipedi_ozet, url: r.vikipedi_url, baslik: r.vikipedi_baslik } : null; },
    // mekân türü → grup → haritadaki renk
    mekanGrup(mid) { const m = typeof mid === 'object' ? mid : this.ix.mekan.get(mid); const t = m && this.ix.tur.get(m.tur); return t ? t.grup : ''; },
    grupRenk(grup) { const g = this.ix.grup.get(grup); return g ? g.renk : '#8A8A84'; },
    mekanRenk(mid) { return this.grupRenk(this.mekanGrup(mid)); },
    turlerOf(grup) { return this.t.mekan_turleri.filter(t => t.grup === grup).map(t => t.ad); },
    liste(ad) { return this.t.listeler.filter(l => l.liste === ad).map(l => l.deger); },   // 'hikaye_konu' | 'meslek'
    coklu(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); },   // virgüllü alanlar (konular, meslekler)
    mekanGorselleri(mid, donem, konu) { return (this.ix.gByMekan.get(mid) || []).filter(g => (!donem || g.donem === donem) && (!konu || (g.konu || 'mekân') === konu)); },
    // mekânın kendi fotoğrafı olmayan, bir hikâyeye de bağlı olmayan kareler: o yerde yaşanmış anlar ve kişiler
    mekanAnGorselleri(mid) { return (this.ix.gByMekan.get(mid) || []).filter(g => (g.konu || 'mekân') !== 'mekân' && !(g.hikaye_id && this.ix.hikaye.has(g.hikaye_id) && this.mekanHikayeleri(mid).some(h => h.id === g.hikaye_id))); },
    hikayeGorselleri(hid) { return (this.ix.gByHikaye.get(hid) || []).filter(g => g.donem !== 'bugün'); }, // hikâyede güncel fotoğraf olmaz
    // kişinin göründüğü fotoğraflar (gorseller.kisi_id); önce kişinin kendi fotoğrafları
    kisiGorselleri(kid) { return (this.ix.gByKisi.get(kid) || []).filter(g => this.mode !== 'site' || (this.ix.mekan.get(g.mekan_id) || {}).durum !== 'arsiv'); },
    fotoKisileri(g) { return String(g.kisi_id || '').split(',').map(x => this.ix.kisi.get(x.trim())).filter(Boolean); },
    // kişinin kısa bilgisi: önce ekibin metni, yoksa onaylı Vikipedi özeti
    kisiBilgi(k) { if (!k) return null; if ((k.kisa_bilgi || '').trim()) return { metin: k.kisa_bilgi, viki: false }; const v = this.vikipedi(k); return v ? { metin: v.ozet, viki: true, url: v.url, baslik: v.baslik } : null; },
    birlikteAnilanlar(kid) {
      const c = new Map();
      this.kisiHikayeleri(kid).forEach(h => this.hikayeKisileri(h.id).forEach(k => { if (k.id !== kid) c.set(k.id, (c.get(k.id) || 0) + 1); }));
      // aynı mekâna doğrudan bağlı kişiler de birlikte anılmış sayılır
      (this.ix.mkByKisi.get(kid) || []).filter(x => x.onay === 'onaylı').forEach(x => this.mekanKisiBaglari(x.mekan_id).forEach(k => { if (k.id !== kid) c.set(k.id, (c.get(k.id) || 0) + 1); }));
      return [...c.entries()].map(([id, n]) => ({ kisi: this.ix.kisi.get(id), n })).sort((a, b) => b.n - a.n);
    },
    yakindakiler(m, n) {
      return this.t.mekanlar.filter(x => x.id !== m.id && x.enlem != null && x.durum !== 'arsiv' && this.mekanIcerikli(x))
        .map(x => ({ mekan: x, d: dist(m, x) })).sort((a, b) => a.d - b.d).slice(0, n || 3);
    },
    mekanUrl(m) { return (CFG.siteUrl || '') + '#mekan-' + m.slug; },
    hikayeUrl(h) { return (CFG.siteUrl || '') + '#hikaye-' + h.slug; },

    // ---------- yazma ----------
    unpublished() { return Object.keys(this.layers.taslak || {}).length; },
    async save(table, row, opts) {
      opts = opts || {};
      const key = rowKey(table, row);
      const entry = { table, key, row: opts.silindi ? null : row, silindi: !!opts.silindi, zaman: new Date().toISOString() };
      if (this.backend.kind === 'sheets') {
        await sheetsCall(opts.silindi ? 'delete' : 'upsert', { table, key, row });
        const arr = this.base[table]; const i = arr.findIndex(r => rowKey(table, r) === key);
        if (opts.silindi) { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = row; else arr.push(row);
        this._sheetsDirty = (this._sheetsDirty || 0) + 1;
      } else {
        const id = (table + '__' + key).replace(/[^A-Za-z0-9_-]/g, '_');
        this.layers.taslak[id] = entry;
        try { await this.backend.put('taslak', id, entry); }
        catch (e) { console.warn(e); if (this.backend.kind === 'db') { this.backend = lsBackend(); await this.backend.put('taslak', id, entry); } }
      }
      this.rebuild();
    },
    async uploadImage(dataUrl, name, mekan) { // yalnız Sheets modunda: Apps Script görseli Drive klasörüne kaydeder
      const j = await sheetsCall('upload', { name, data: dataUrl, mekan_id: mekan.id });
      return { drive_id: j.drive_id };
    },
    async remove(table, row) { return this.save(table, row, { silindi: true }); },
    async publish() {
      if (this.backend.kind === 'sheets') { const j = await sheetsCall('publish', {}); this._sheetsDirty = 0; return j; }
      const tas = Object.entries(this.layers.taslak || {});
      for (const [id, e] of tas) {
        this.layers.yayin[id] = e; delete this.layers.taslak[id];
        try { await this.backend.put('yayin', id, e); await this.backend.del('taslak', id); } catch (err) { console.warn(err); }
      }
      this.rebuild();
      return { ok: true, n: tas.length };
    },
    async discardDrafts() {
      for (const id of Object.keys(this.layers.taslak || {})) { delete this.layers.taslak[id]; try { await this.backend.del('taslak', id); } catch (e) { } }
      this.rebuild();
    },
    nextId(table, prefix, pad) {
      const nums = this.t[table].map(r => parseInt(String(r.id || '').split('-')[1], 10)).filter(n => !isNaN(n));
      return prefix + '-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(pad || 4, '0');
    },
    uniqueSlug(table, base, selfId) {
      let s = slugify(base), x = s, n = 2;
      while (this.t[table].some(r => r.slug === x && r.id !== selfId)) { x = s + '-' + n; n++; }
      return x;
    },
  };
  window.HafizaStore = Store;
})();
