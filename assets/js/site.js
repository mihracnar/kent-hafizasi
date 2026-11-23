/* Hafıza İstanbul — site. Harita her şeyin toplandığı yer; mekân, kişi ve hikâye sayfaları kalıcı adreslerle açılır.
 * Adresler: #harita, #mekan-<slug>, #kisi-<slug>, #hikaye-<slug>, #hikayeler, #kisiler, #mekanlar, #album, #hakkinda */
(function () {
  'use strict';
  const S = window.HafizaStore, esc = S.esc, fold = S.fold;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const IK = {
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    asagi: '<path d="M6 9l6 6 6-6"/>', sol: '<path d="M19 12H5M11 6l-6 6 6 6"/>', izgara: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>', saat: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>', katman: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>', cerceve: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
    kapat: '<path d="M6 6l12 12M18 6L6 18"/>', sag: '<path d="M5 12h14M13 6l6 6-6 6"/>', ok: '<path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/>',
    ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    disari: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', buyut: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', solok: '<path d="M15 5l-7 7 7 7"/>', sagok: '<path d="M9 5l7 7-7 7"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', indir: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  };
  const ik = (n, s) => `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true" style="${s ? `width:${s}px;height:${s}px` : ''}">${IK[n]}</svg>`;
  // mekânın genel bilgisi: paragraflar korunur, doğrudan bağlı kişiler bağlantı olur
  function aciklamaHtml(m, opts) {
    opts = opts || {};
    const ham = opts.kisa ? ilkCumle(m.aciklama, opts.kisa) : String(m.aciklama || '');
    let t = esc(ham);
    const ks = S.mekanKisiBaglari(m.id).sort((a, b) => b.ad.length - a.ad.length);
    const tut = [];
    ks.forEach(k => { const a = esc(k.ad); const i = t.indexOf(a); if (i < 0) return; const tok = '\u0001' + tut.length + '\u0001'; tut.push(`<a class="kisi" href="#kisi-${k.slug}" data-kisi="${k.id}">${a}</a>`); t = t.slice(0, i) + tok + t.slice(i + a.length); });
    t = t.replace(/\u0001(\d+)\u0001/g, (_, i) => tut[+i]);
    return paragraflar(t, opts.kaynak ? `Kaynak: ${linkle(opts.kaynak)}` : '');
  }
  // paragraflara böl; kaynak, son paragrafın sonunda küçük yazıyla
  function paragraflar(html, kaynakHtml) {
    const ps = html.split(/\n{2,}/).filter(p => p.trim());
    return ps.map((p, i) => `<p>${p.replace(/\n/g, '<br>')}${kaynakHtml && i === ps.length - 1 ? ` <span class="satir-kaynak">${kaynakHtml}</span>` : ''}</p>`).join('');
  }
  // Vikipedi özeti, paragraf sonunda kaynağı ve lisansıyla (ayrı başlık ya da çizgi yok)
  function vikiParagraf(r) {
    const v = S.vikipedi(r); if (!v) return '';
    return paragraflar(esc(v.ozet).replace(/\n+/g, '\n\n'), `Kaynak: <a href="${esc(v.url)}" target="_blank" rel="noopener">Vikipedi, “${esc(v.baslik)}”</a> · metin ${VIKI_LISANS} lisanslıdır.`);
  }
  // Vikipedi özeti: yalnız onaylı olanlar, kaynak ve lisans atfıyla
  const VIKI_LISANS = '<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr" rel="noopener license">CC BY-SA 4.0</a>';
  function vikiBlok(r, opts) {
    const v = S.vikipedi(r); if (!v) return '';
    opts = opts || {};
    const metin = opts.kisa ? ilkCumle(v.ozet, opts.kisa) : v.ozet;
    return `<div class="vikipedi">${opts.baslik ? `<div class="bolum-baslik" style="margin-top:28px">${opts.baslik} <span>${/Vikipedi/.test(opts.baslik) ? '' : "Vikipedi'den"}</span></div>` : ''}
      <div class="metin"${opts.buyuk ? ' style="font-size:18px;max-width:720px"' : ''}>${esc(metin).split(/\n+/).map(p => `<p>${p}</p>`).join('')}</div>
      <div class="kaynak viki-kaynak">Kaynak: <a href="${esc(v.url)}" target="_blank" rel="noopener">Vikipedi, “${esc(v.baslik)}”</a> · metin ${VIKI_LISANS} lisanslıdır.</div></div>`;
  }
  // kişi listelerinde mekânın altındaki kısa satır: önce hikâye, yoksa genel bilgi
  const mekanOzet = (x, n) => ilkCumle(x.hikayeler && x.hikayeler[0] ? x.hikayeler[0].metin : x.mekan.aciklama, n);
  // grup renginin yazıda okunur koyu tonu (harita etiketleri)
  const koyuRenk = (hex, k = .38) => { const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return '#3A3A3A'; const f = x => Math.round(x * (1 - k)).toString(16).padStart(2, '0'); return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); };
  // mekânın türü, grup rengiyle; yapının bugünkü durumu biliniyorsa yanında
  const DURUM_AD = { 'ayakta': 'bugün ayakta', 'yıkıldı': 'yıkıldı' };
  const turEtiket = m => `<span class="tur-etiket"><i style="background:${S.mekanRenk(m)}"></i>${esc(m.tur)}${m.yapi_durumu ? ' · ' + esc(DURUM_AD[m.yapi_durumu] || m.yapi_durumu) : ''}</span>`;
  const ilkCumle = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= (n || 180)) return t; const k = t.slice(0, n || 180); return k.slice(0, k.lastIndexOf(' ')) + '…'; };
  const metreYaz = d => d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km';
  function bildir(t) { const b = document.createElement('div'); b.className = 'bildirim'; b.setAttribute('role', 'status'); b.textContent = t; document.body.appendChild(b); setTimeout(() => b.remove(), 2600); }
  async function kopyala(t) { try { await navigator.clipboard.writeText(t); bildir('Bağlantı kopyalandı'); } catch (e) { bildir(t); } }

  // ---------- görseller ----------
  function img(g, w, alt) {
    if (!g) return `<div class="yer-tutucu">${ik('kamera', 22)}</div>`;
    return `<img src="${esc(S.imgUrl(g, w))}" alt="${esc(alt || g.altyazi || '')}" loading="lazy" referrerpolicy="no-referrer" data-yedek="eski">`;
  }
  document.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName === 'IMG' && el.dataset.yedek) {
      const d = document.createElement('div'); d.className = 'yer-tutucu eski';
      d.innerHTML = `${ik('kamera', 20)}<span>Arşiv fotoğrafı</span>`; el.replaceWith(d);
    }
  }, true);

  function ayrik(mekan, secili, opts) {
    opts = opts || {};
    // o zaman: önce mekânın kendi arşiv fotoğrafları, sonra hikâyelerinin fotoğrafları; bugün: yalnız mekânın güncel fotoğrafı
    const eski = [...S.mekanGorselleri(mekan.id, 'o zaman', 'mekân'), ...S.mekanGorselleri(mekan.id, 'o zaman', 'hikâye')], yeni = S.mekanGorselleri(mekan.id, 'bugün', 'mekân');
    const g = eski[secili || 0];
    const bugun = yeni[0] ? img(yeni[0], 1200, mekan.ad + ' bugün') :
      `<div class="yer-tutucu">${ik('kamera', 22)}<span>Bu karenin bugünkü hâli henüz eklenmedi.</span><a href="#hakkinda">Bugünkü fotoğrafı gönder</a></div>`;
    return `<div class="ayrik${opts.buyuk ? ' buyuk' : ''}" style="--x:55%">
      <div class="katman bugun">${bugun}</div>
      <div class="katman ozaman">${g ? img(g, 1200, mekan.ad + ' arşiv fotoğrafı') : '<div class="yer-tutucu eski">Arşiv fotoğrafı yok</div>'}</div>
      <span class="etiket sol">O ZAMAN${g && g.yil ? ' · ' + esc(g.yil) : ''}</span><span class="etiket sag">BUGÜN</span>
      <div class="tutamac"><span>${ik('ok', 16)}</span></div>
      <input type="range" min="0" max="100" value="55" aria-label="O zaman ve bugün arasındaki ayırıcı">
      ${!opts.buyuk ? `<button type="button" class="buyut" data-karsilastir="${mekan.id}" data-secili="${secili || 0}" aria-label="O zaman ve bugün karşılaştırmasını büyük aç">${ik('buyut', 16)}<span>Büyüt</span></button>`
        : (g ? `<button type="button" class="buyut" data-medya-liste="${[...eski, ...yeni].map(x => x.id).join(',')}" data-medya-i="${secili || 0}" aria-label="Fotoğrafı tek başına tam ekran aç">${ik('buyut', 16)}<span>Tek fotoğraf</span></button>` : '')}
    </div>
    ${g ? fotoAlt(g) : ''}
    ${eski.length > 1 ? `<div class="kucukler" role="group" aria-label="Arşiv fotoğrafları">${eski.map((x, i) => `<button type="button" data-kucuk="${i}" aria-pressed="${i === (secili || 0)}" aria-label="Fotoğraf ${i + 1}">${img(x, 200)}</button>`).join('')}</div>` : ''}`;
  }
  // fotoğraf altı: konu etiketi, fotoğraftaki kişiler, altyazı
  const KONU_AD = { 'mekân': 'Mekân', 'hikâye': 'Hikâye' };
  // fotoğraf altı: (hikâyeyse) hikâyenin adı, altyazı, ayrı satırda "Fotoğrafta:" kişiler, istenirse mekân
  function fotoAlt(g, opts) {
    opts = opts || {};
    const ks = S.fotoKisileri(g).filter(k => k.id !== opts.haric);
    const h = !opts.hikayesiz && g.hikaye_id ? S.ix.hikaye.get(g.hikaye_id) : null, hk = h && h.durum !== 'taslak' && h.durum !== 'arsiv' ? h : null;
    const m = opts.mekan ? S.ix.mekan.get(g.mekan_id) : null;
    if (!g.altyazi && !ks.length && !m && !hk) return '';
    return `<div class="foto-altyazi">${hk ? `<span class="foto-konu">Hikâye</span><a href="#hikaye-${hk.slug}">${esc(hk.baslik)}</a>${g.altyazi ? ' · ' : ''}` : ''}${g.altyazi ? esc(g.altyazi) : ''}
      ${ks.length ? `<span class="foto-kisiler">Fotoğrafta: ${ks.map(k => `<a href="#kisi-${k.slug}" class="kisi">${esc(k.ad)}</a>`).join(', ')}</span>` : ''}
      ${m ? `<span class="foto-mekan">${ik('pin', 12)} <a href="#mekan-${m.slug}">${esc(m.ad)}</a></span>` : ''}</div>`;
  }
  // fotoğraf şeridi: hikâyenin ya da anların küçük kareleri, tam ekran açılır
  function seritHtml(gs, n, etiket) {
    if (!gs.length) return '';
    const ids = gs.map(x => x.id).join(',');
    return `<div class="foto-serit" role="group" aria-label="${esc(etiket || 'Fotoğraflar')}">${gs.slice(0, n || 4).map((g, i) => `<button type="button" class="kucuk-medya" data-medya-liste="${ids}" data-medya-i="${i}" aria-label="Fotoğraf ${i + 1} / ${gs.length}, tam ekran aç">${img(g, 300)}</button>`).join('')}${gs.length > (n || 4) ? `<button type="button" class="kucuk-medya daha" data-medya-liste="${ids}" data-medya-i="${n || 4}">+${gs.length - (n || 4)}</button>` : ''}</div>`;
  }
  // kişi kartı: ad, yaşam, kısa bilgi (ekip metni ya da Vikipedi)
  // kişi rozeti: yuvarlak fotoğraf (yoksa baş harfler), altında ad ve yaşam yılları; biyografi kişi sayfasında
  const basHarf = ad => ad.replace(/\(.*?\)/g, '').split(/\s+/).filter(w => /^[A-ZÇĞİÖŞÜÂÎÛ]/.test(w)).slice(0, 2).map(w => w[0]).join('') || ad[0];
  // yuvarlak kırpmada yalnız kişinin tek başına göründüğü fotoğraf kullanılır; toplu fotoğraflarda baş harfler
  const portre = k => S.kisiGorselleri(k.id).find(g => S.fotoKisileri(g).length === 1);
  // mekânın "burada çekilmiş" fotoğrafları: rozette portre olarak zaten görünenler tekrar gösterilmez
  function kisilerBolumu(dk, ks, opts) {
    const n = dk.length + ks.length; if (!n) return '';
    return `<div class="bolum-baslik"${opts.ust ? ' style="margin-top:28px"' : ''}>Kişiler <span>${n}</span></div><div class="kisi-rozetler${opts.buyuk ? ' buyuk' : ''}">${dk.map(k => kisiKart(k, opts.harita)).join('')}${ks.map(k => kisiKart(k, opts.harita, 'hikâyede')).join('')}</div>`;
  }
  function kisiKart(k, harita, not) {
    const f = portre(k);
    const ic = `<span class="kisi-rozet-foto">${f ? img(f, 240, k.ad) : `<span class="bas-harf" aria-hidden="true">${esc(basHarf(k.ad))}</span>`}</span>
      <span class="kisi-rozet-ad">${esc(k.ad)}</span>${k.yasam ? `<span class="kisi-rozet-yil">${esc(k.yasam)}</span>` : ''}${not ? `<span class="kisi-rozet-not">${esc(not)}</span>` : ''}`;
    return harita ? `<button type="button" class="kisi-rozet" data-kisi="${k.id}" aria-pressed="${!!(window.HafizaSite && HafizaSite.Harita && HafizaSite.Harita.kisi === k.id)}" title="Kişinin mekânlarını haritada göster">${ic}</button>`
      : `<a class="kisi-rozet" href="#kisi-${k.slug}">${ic}</a>`;
  }
  document.addEventListener('input', e => { if (e.target.matches('.ayrik input[type=range]')) e.target.closest('.ayrik').style.setProperty('--x', e.target.value + '%'); });

  // ---------- tam ekran görüntüleyici ----------
  let albumListe = [];
  const Goruntuleyici = {
    el: null, liste: [], i: 0, donus: null,
    ac(liste, i, donus) {
      this.liste = liste.map(id => S.ix.gorsel.get(id)).filter(Boolean); if (!this.liste.length) return;
      this.i = Math.max(0, Math.min(i, this.liste.length - 1)); this.donus = donus || document.activeElement;
      if (!this.el) {
        this.el = document.createElement('div'); this.el.className = 'goruntuleyici'; this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-label', 'Fotoğraf görüntüleyici');
        document.body.appendChild(this.el);
        this.el.addEventListener('click', e => {
          if (e.target.closest('[data-gv="kapat"]') || e.target === this.el || e.target.classList.contains('gv-sahne')) this.kapat();
          else if (e.target.closest('[data-gv="once"]')) this.git(-1);
          else if (e.target.closest('[data-gv="sonra"]')) this.git(1);
          else if (e.target.closest('a[href^="#"]')) this.kapat(true);
        });
        let x0 = null;
        this.el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
        this.el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) this.git(dx < 0 ? 1 : -1); x0 = null; });
      }
      document.body.style.overflow = 'hidden'; this.el.hidden = false; this.ciz();
      $('[data-gv="kapat"]', this.el).focus();
    },
    git(d) { if (this.liste.length < 2) return; this.i = (this.i + d + this.liste.length) % this.liste.length; this.ciz(); },
    ciz() {
      const g = this.liste[this.i], m = S.ix.mekan.get(g.mekan_id), h = g.hikaye_id && S.ix.hikaye.get(g.hikaye_id), n = this.liste.length;
      this.el.innerHTML = `<div class="gv-ust"><span>${n > 1 ? `${this.i + 1} / ${n}` : ''}</span><button type="button" class="gv-dugme" data-gv="kapat" aria-label="Kapat">${ik('kapat', 22)}</button></div>
        <div class="gv-sahne">${n > 1 ? `<button type="button" class="gv-ok sol" data-gv="once" aria-label="Önceki fotoğraf">${ik('solok', 28)}</button>` : ''}
          <img src="${esc(S.imgUrl(g, 2000))}" alt="${esc(g.altyazi || (m ? m.ad : ''))}" referrerpolicy="no-referrer" data-gv-img>
          ${n > 1 ? `<button type="button" class="gv-ok sag" data-gv="sonra" aria-label="Sonraki fotoğraf">${ik('sagok', 28)}</button>` : ''}</div>
        <div class="gv-alt"><div><span class="gv-donem">${g.donem === 'bugün' ? 'BUGÜN' : 'O ZAMAN'}${g.yil ? ' · ' + esc(g.yil) : ''}</span>
          ${m ? `<a href="#mekan-${m.slug}" class="gv-mekan">${esc(m.ad)}</a>` : ''}${S.fotoKisileri(g).length ? `<div class="gv-kisiler">${S.fotoKisileri(g).map(k => `<a href="#kisi-${k.slug}">${esc(k.ad)}</a>`).join(' · ')}</div>` : ''}${g.altyazi ? `<p>${esc(g.altyazi)}</p>` : ''}</div>
          <div class="gv-meta">${h && h.baslik !== (m && m.ad) ? `<a href="#hikaye-${h.slug}">${esc(h.baslik)}</a>` : ''}${g.kaynak ? `<span>Kaynak: ${esc(g.kaynak)}</span>` : ''}</div></div>`;
      const im = $('[data-gv-img]', this.el);
      im.onerror = () => { const d = document.createElement('div'); d.className = 'yer-tutucu eski gv-yer'; d.innerHTML = `${ik('kamera', 28)}<span>Fotoğraf yüklenemedi</span>`; im.replaceWith(d); };
      [this.i - 1, this.i + 1].forEach(k => { const x = this.liste[(k + n) % n]; if (x && n > 1) { const p = new Image(); p.referrerPolicy = 'no-referrer'; p.src = S.imgUrl(x, 2000); } });
    },
    kapat(gezinti) {
      if (!this.el || this.el.hidden) return;
      this.el.hidden = true; this.el.innerHTML = ''; if (!Karsilastir.acik()) document.body.style.overflow = '';
      if (!gezinti && this.donus && document.body.contains(this.donus)) this.donus.focus();
    },
  };
  const Karsilastir = {
    el: null, donus: null,
    ac(mid, secili, donus) {
      const m = S.ix.mekan.get(mid); if (!m) return;
      this.donus = donus || document.activeElement;
      if (!this.el) {
        this.el = document.createElement('div'); this.el.className = 'karsilastirma'; this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true');
        document.body.appendChild(this.el);
        this.el.addEventListener('click', e => { if (e.target.closest('[data-kv="kapat"]') || e.target === this.el) this.kapat(); else if (e.target.closest('a[href^="#"]')) this.kapat(true); });
      }
      this.el.setAttribute('aria-label', m.ad + ': o zaman ve bugün');
      const n = S.mekanGorselleri(m.id).length;
      this.el.innerHTML = `<div class="kv-ust"><div><span class="ust-etiket" style="color:#E8A39D">Mekân${m.ilce ? ' · ' + esc(m.ilce) : ''}${n ? ' · ' + n + ' fotoğraf' : ''}</span><h2>${esc(m.ad)}</h2>${m.bugunku_ad ? `<span class="kv-bugun">Bugün: ${esc(m.bugunku_ad)}</span>` : ''}</div>
        <div class="kv-sag"><a class="kv-baglanti" href="#mekan-${m.slug}">Mekân sayfası ${ik('sag', 14)}</a><button type="button" class="gv-dugme" data-kv="kapat" aria-label="Kapat">${ik('kapat', 22)}</button></div></div>
        <div class="kv-sahne"><div class="kv-cerceve" data-ayrik="${m.id}" data-buyuk="1">${ayrik(m, secili, { buyuk: true })}</div></div>`;
      document.body.style.overflow = 'hidden'; this.el.hidden = false;
      $('[data-kv="kapat"]', this.el).focus();
    },
    acik() { return this.el && !this.el.hidden; },
    kapat(gezinti) {
      if (!this.acik()) return;
      this.el.hidden = true; this.el.innerHTML = ''; document.body.style.overflow = '';
      if (!gezinti && this.donus && document.body.contains(this.donus)) this.donus.focus();
    },
  };
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-karsilastir]'); if (!k) return;
    e.preventDefault(); e.stopPropagation(); Karsilastir.ac(k.dataset.karsilastir, +k.dataset.secili || 0, k);
  }, true);
  document.addEventListener('keydown', e => {
    if (!Karsilastir.acik() || (Goruntuleyici.el && !Goruntuleyici.el.hidden)) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); Karsilastir.kapat(); }
    else if (e.key === 'Tab') { const f = $$('button, a[href], input', Karsilastir.el); if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
  }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-medya-liste]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const v = b.dataset.medyaListe, l = v === 'album' ? albumListe : v.startsWith('album:') ? (albumListeleri[v.slice(6)] || []) : v.split(',');
    Goruntuleyici.ac(l, +b.dataset.medyaI || 0, b);
  }, true);
  document.addEventListener('keydown', e => {
    if (!Goruntuleyici.el || Goruntuleyici.el.hidden) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); Goruntuleyici.kapat(); }
    else if (e.key === 'ArrowLeft') Goruntuleyici.git(-1);
    else if (e.key === 'ArrowRight') Goruntuleyici.git(1);
    else if (e.key === 'Tab') { const f = $$('button, a[href]', Goruntuleyici.el); if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
  }, true);

  // ---------- metin: kişi adlarını ve mekânları işaretle ----------
  function metinHtml(h, opts) {
    opts = opts || {};
    let t = esc(opts.metin != null ? opts.metin : (h.metin || ''));
    const reps = [];
    S.hikayeKisileri(h.id).forEach(k => reps.push({ s: k.ad, r: `<a class="kisi" href="#kisi-${k.slug}" data-kisi="${k.id}">${esc(k.ad)}</a>` }));
    const mek = S.hikayeMekanlari(h.id);
    if (mek.length > 1) mek.forEach((m, i) => {
      const ad = m.ad.split(' / ')[0];
      reps.push({ s: ad, r: `<span class="durak" data-durak="${i + 1}"><span class="rozet">${i + 1}</span><mark class="yer${opts.bu === m.id ? ' bu' : ''}">${esc(ad)}</mark></span>` });
    });
    reps.sort((a, b) => b.s.length - a.s.length).forEach((x, i) => {
      const e = esc(x.s); const at = t.indexOf(e);
      if (at >= 0 && e.length > 2) { t = t.slice(0, at) + `\u0000${i}\u0000` + t.slice(at + e.length); x.i = i; }
    });
    reps.forEach((x, i) => { t = t.replace(`\u0000${i}\u0000`, x.r); });
    return t.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  // ---------- üst çubuk ----------
  const SEKMELER = [['harita', 'Harita'], ['hikayeler', 'Hikâyeler'], ['kisiler', 'Kişiler'], ['mekanlar', 'Mekânlar'], ['album', 'Albüm'], ['hakkinda', 'Hakkında']];
  function ustCubuk() {
    $('#ust').innerHTML = `<button class="ikon-dugme menu-dugme" type="button" aria-label="Menü" aria-expanded="false">${ik('menu')}</button>
      <a class="marka" href="#harita">Hafıza İstanbul</a>
      <nav class="sekmeler" aria-label="Ana menü">${SEKMELER.map(([k, l]) => `<a href="#${k}" data-sekme="${k}">${l}</a>`).join('')}</nav>
      <div class="arama" role="search"><div class="arama-kutu">${ik('ara')}<label class="sr" for="ara">Mekân, kişi, hikâye ara</label>
      <input id="ara" type="search" placeholder="Mekân, kişi, hikâye ara" autocomplete="off" aria-controls="ara-sonuc" aria-expanded="false"></div>
      <div class="arama-sonuc" id="ara-sonuc" role="listbox" hidden></div></div>`;
    $('.menu-dugme').onclick = e => { const u = $('#ust'); const a = u.classList.toggle('acik'); e.currentTarget.setAttribute('aria-expanded', a); };
    const inp = $('#ara'), box = $('#ara-sonuc');
    let items = [], sel = -1;
    const kapat = () => { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); sel = -1; };
    inp.addEventListener('input', () => {
      const q = fold(inp.value.trim());
      if (q.length < 2) return kapat();
      const m = S.t.mekanlar.filter(x => S.mekanIcerikli(x) && (fold(x.ad).includes(q) || fold(x.bugunku_ad).includes(q))).slice(0, 6);
      const k = S.t.kisiler.filter(x => fold(x.ad).includes(q) && S.kisiMekanlari(x.id).length).slice(0, 5);
      const h = S.t.hikayeler.filter(x => x.durum !== 'taslak' && fold(x.baslik).includes(q) && !m.some(y => y.ad === x.baslik)).slice(0, 4);
      items = [...m.map(x => ({ t: 'm', x })), ...k.map(x => ({ t: 'k', x })), ...h.map(x => ({ t: 'h', x }))];
      if (!items.length) { box.innerHTML = '<div class="grup">Sonuç yok</div>'; box.hidden = false; return; }
      let html = '', last = '';
      items.forEach((it, i) => {
        const g = { m: 'MEKÂNLAR', k: 'KİŞİLER', h: 'HİKÂYELER' }[it.t];
        if (g !== last) { html += `<div class="grup">${g}</div>`; last = g; }
        const alt = it.t === 'm' ? (it.x.ilce || '') : it.t === 'k' ? S.kisiMekanlari(it.x.id).length + ' mekân' : (S.anaMekan(it.x.id) || {}).ad || '';
        html += `<button type="button" role="option" data-i="${i}">${esc(it.t === 'h' ? it.x.baslik : it.x.ad)}<small>${esc(alt)}</small></button>`;
      });
      box.innerHTML = html; box.hidden = false; inp.setAttribute('aria-expanded', 'true');
    });
    const sec = i => {
      const it = items[i]; if (!it) return; kapat(); inp.value = '';
      if (it.t === 'm') { go('harita'); Harita.kur().then(() => Harita.mekanSec(it.x.id, true)); }
      if (it.t === 'k') { go('harita'); Harita.kur().then(() => Harita.kisiSec(it.x.id)); }
      if (it.t === 'h') go('hikaye-' + it.x.slug);
    };
    box.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) sec(+b.dataset.i); });
    inp.addEventListener('keydown', e => {
      const bs = $$('button[data-i]', box);
      if (e.key === 'ArrowDown') { sel = Math.min(bs.length - 1, sel + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { sec(sel >= 0 ? sel : 0); return; }
      else if (e.key === 'Escape') return kapat();
      bs.forEach((b, i) => b.setAttribute('aria-selected', i === sel));
    });
    document.addEventListener('click', e => { if (!e.target.closest('.arama')) kapat(); });
  }
  function go(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }

  // ================= HARİTA =================
  const Harita = {
    map: null, secili: null, kisi: null, turler: new Set(), acikGrup: '', isaretler: [],
    kur() { if (!this._p) this._p = this._kur(); return this._p; },
    async _kur() {
      $('#harita-gorunum').innerHTML = `<div id="harita" aria-label="Mekânların haritası"></div>
        <aside class="panel panel-sol" id="panel-mekan" aria-label="Mekân" hidden></aside>
        <aside class="panel panel-sag" id="panel-kisi" aria-label="Kişi" hidden></aside>
        <div class="harita-ust" id="harita-ust"></div>
        <div class="lejant" id="lejant" role="region" aria-label="Mekân türleri"></div>`;
      S.t.mekan_turleri.forEach(t => this.turler.add(t.ad));
      this.map = await HafizaBasemap.create('harita', { dataPath: S.cfg.dataPath });
      const map = this.map;
      if (!map._hafiza.online) [['Beyoğlu', 28.977, 41.036], ['Fatih', 28.947, 41.015], ['Üsküdar', 29.03, 41.026], ['Kadıköy', 29.04, 40.99], ['Beşiktaş', 29.005, 41.048], ['Şişli', 28.987, 41.062],
        ['Sarıyer', 29.05, 41.16], ['Bakırköy', 28.875, 40.98], ['Eyüpsultan', 28.93, 41.06], ['Adalar', 29.09, 40.875], ['Haliç', 28.955, 41.03, 1], ['İstanbul Boğazı', 29.06, 41.1, 1], ['Marmara Denizi', 28.95, 40.93, 1]]
        .forEach(([n, x, y, su]) => { const d = document.createElement('div'); d.className = 'semt-etiket' + (su ? ' su' : ''); d.textContent = n; new maplibregl.Marker({ element: d }).setLngLat([x, y]).addTo(map); });
      if (!map._hafiza.online) $('#harita-gorunum').insertAdjacentHTML('beforeend', '<div class="onizleme-notu">Önizleme: harita altlığı yalnız kıyı çizgisini gösteriyor. Sitede OpenFreeMap Positron altlığı açılır.</div>');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      try { map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right'); } catch (e) { }
      map.addSource('mekanlar', { type: 'geojson', data: this.veri() });
      map.addSource('secili', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'nokta', type: 'circle', source: 'mekanlar',
        paint: { 'circle-color': ['get', 'renk'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 12, 4.5, 15, 7, 18, 10], 'circle-stroke-color': '#fff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, .6, 13, 1.5],
          'circle-opacity': ['case', ['boolean', ['get', 'soluk'], false], .25, 1], 'circle-stroke-opacity': ['case', ['boolean', ['get', 'soluk'], false], .25, 1] } });
      // Mekân adları: altlığın kendi yazı tipiyle; MapLibre çakışan adları kendiliğinden gizler, önemli mekânlar önce yerleşir.
      if (map._hafiza.glyphs) {
        // yarı kalın: glifleri depodan gelir (basemap.js → transformRequest); eksik aralık Regular'a düşer
        const yaz = (window.HafizaBasemap && HafizaBasemap.YARIKALIN_FONT) || ['Noto Sans Regular'];
        map.addLayer({ id: 'ad', type: 'symbol', source: 'mekanlar', minzoom: 13,
          layout: { 'text-field': ['get', 'ad'], 'text-font': yaz, 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 13, 14, 14, 16, 15.5, 18, 17],
            'text-variable-anchor': ['left', 'right', 'top', 'bottom', 'top-left', 'bottom-left'], 'text-radial-offset': .8, 'text-justify': 'auto',
            'text-max-width': 10, 'text-padding': 3, 'symbol-sort-key': ['get', 'sira'] },
          paint: { 'text-color': ['get', 'yazi'], 'text-halo-color': 'rgba(255,255,255,.97)', 'text-halo-width': 2, 'text-halo-blur': .2,
            'text-opacity': ['case', ['boolean', ['get', 'soluk'], false], .3, 1] } });
      }
      map.addLayer({ id: 'secili-halka', type: 'circle', source: 'secili', paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#B3261E', 'circle-stroke-width': 3 } });
      // Kümeleme yok: her mekân kendi noktası. Tıklanan yerde birden çok mekân üst üste ise panel önce listeyi gösterir.
      map.on('click', 'nokta', e => {
        const ids = [...new Set(e.features.map(f => f.properties.id))];
        if (ids.length === 1) this.mekanSec(ids[0], false); else this.cokluSec(ids);
      });
      ['nokta'].forEach(l => { map.on('mouseenter', l, () => map.getCanvas().style.cursor = 'pointer'); map.on('mouseleave', l, () => map.getCanvas().style.cursor = ''); });
      this.lejant();
    },
    veri() {
      const kisiMek = this.kisi ? new Set(S.kisiMekanlari(this.kisi).map(x => x.mekan.id)) : null;
      const f = S.t.mekanlar.filter(m => m.enlem != null && m.durum !== 'arsiv' && m.durum !== 'taslak').map(m => {
        if (!S.mekanIcerikli(m)) return null;
        if (m.tur && S.ix.tur.has(m.tur) && !this.turler.has(m.tur)) return null;
        const renk = S.mekanRenk(m), hs = S.mekanHikayeleri(m.id).length;
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [+m.boylam, +m.enlem] },
          properties: { id: m.id, ad: m.ad.split(' / ')[0], renk, yazi: koyuRenk(renk), sira: -(hs * 10 + ((m.aciklama || '').trim() ? 2 : 0) + (S.mekanKisiBaglari(m.id).length ? 1 : 0)), soluk: kisiMek ? !kisiMek.has(m.id) : false } };
      }).filter(Boolean);
      return { type: 'FeatureCollection', features: f };
    },
    yenile() {
      if (this.map && this.map.getSource('mekanlar')) this.map.getSource('mekanlar').setData(this.veri());
      // seçili mekân süzgeçle haritadan kalktıysa seçim de kalkar, paneli kapanır
      const m = this.secili && S.ix.mekan.get(this.secili);
      if (m && m.tur && S.ix.tur.has(m.tur) && !this.turler.has(m.tur) && this.map) this.kapat('mekan');
    },
    // Lejant aynı zamanda süzgeçtir: altta ortada yatay çubuk. Gruba basmak onu açar/kapatır; yanındaki ok
    // grubun türlerini çubuğun üstünde açar. Çubuk açık panellerin arasındaki boşluğa yerleşir (CSS).
    lejant() {
      const L = $('#lejant'); if (!L) return;
      const gorunur = S.t.mekanlar.filter(m => m.enlem != null && m.durum !== 'arsiv' && m.durum !== 'taslak' && S.mekanIcerikli(m));
      const turSay = new Map(); gorunur.forEach(m => turSay.set(m.tur, (turSay.get(m.tur) || 0) + 1));
      const gruplar = S.t.mekan_gruplari.map(g => { const t = S.turlerOf(g.ad).filter(x => turSay.get(x)); return { g, t, n: t.reduce((a, x) => a + turSay.get(x), 0), sec: t.filter(x => this.turler.has(x)) }; }).filter(x => x.n);
      const hepsi = gruplar.every(x => x.sec.length === x.t.length);
      const ac = gruplar.find(x => x.g.ad === this.acikGrup);
      L.innerHTML = `<div class="lj-cubuk"><button type="button" class="lj-ek tumu" data-lj="tumu" ${hepsi ? 'disabled aria-disabled="true"' : ''}>Tümü</button><span class="lj-ayrac"></span>
        <div class="lj-kaydir">${gruplar.map(({ g, t, n, sec }) => { const durum = !sec.length ? ' kapali' : sec.length < t.length ? ' yarim' : '';
          return `<span class="lj-grup${durum}${this.acikGrup === g.ad ? ' acik' : ''}" style="--r:${g.renk}">
            <button type="button" class="lj-ana" data-lj-grup="${esc(g.ad)}" aria-pressed="${sec.length === t.length}" title="${esc(g.ad)}: ${esc(t.join(', '))}"><i></i>${esc(g.ad)}<small>${n}</small></button>
            <button type="button" class="lj-tur-ac" data-lj-turler="${esc(g.ad)}" aria-expanded="${this.acikGrup === g.ad}" aria-label="${esc(g.ad)} türleri">${ik('asagi', 13)}</button></span>`; }).join('')}</div>
        ${ac ? `<div class="lj-turler" style="--r:${ac.g.renk}" role="group" aria-label="${esc(ac.g.ad)} türleri"><h3><i></i>${esc(ac.g.ad)}<button type="button" data-lj-yalniz="${esc(ac.g.ad)}">yalnız bu grup</button></h3>
          ${ac.t.map(x => `<label><input type="checkbox" data-lj-tur="${esc(x)}" ${this.turler.has(x) ? 'checked' : ''}>${esc(x)}<small>${turSay.get(x)}</small></label>`).join('')}</div>` : ''}</div>`;
      const kutu = $('.lj-turler', L), dugme = ac && $(`[data-lj-turler="${CSS.escape(ac.g.ad)}"]`, L);
      if (kutu && dugme) { const c = L.querySelector('.lj-cubuk').getBoundingClientRect(), b = dugme.closest('.lj-grup').getBoundingClientRect();
        kutu.style.left = Math.max(0, Math.min(b.left - c.left, c.width - kutu.offsetWidth)) + 'px'; }
      if (L._bagli) return; L._bagli = true;
      L.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.lj === 'tumu') S.t.mekan_turleri.forEach(t => this.turler.add(t.ad));
        else if (b.dataset.ljGrup) { const ts = S.turlerOf(b.dataset.ljGrup), acik = ts.every(t => this.turler.has(t)); ts.forEach(t => acik ? this.turler.delete(t) : this.turler.add(t)); }
        else if (b.dataset.ljTurler) { this.acikGrup = this.acikGrup === b.dataset.ljTurler ? '' : b.dataset.ljTurler; this.lejant(); return; }
        else if (b.dataset.ljYalniz) { this.turler.clear(); S.turlerOf(b.dataset.ljYalniz).forEach(t => this.turler.add(t)); }
        else return;
        this.lejant(); this.yenile();
      });
      L.addEventListener('change', e => { const i = e.target; if (!i.dataset.ljTur) return; i.checked ? this.turler.add(i.dataset.ljTur) : this.turler.delete(i.dataset.ljTur); this.lejant(); this.yenile(); });
      // dışarı tıklayınca türler kutusu kapanır (yeniden çizimde koparılan düğmeler "dışarı" sayılmaz)
      document.addEventListener('click', e => { if (this.acikGrup && e.target.isConnected && !e.target.closest('#lejant')) { this.acikGrup = ''; this.lejant(); } });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.acikGrup) { this.acikGrup = ''; this.lejant(); } });
    },
    cokluSec(ids) {
      const ms = ids.map(id => S.ix.mekan.get(id)).filter(Boolean);
      const p = $('#panel-mekan'); p.hidden = false; p.scrollTop = 0;
      p.innerHTML = `<div class="panel-ic"><div class="panel-baslik"><div><span class="ust-etiket">Bu noktada ${ms.length} mekân</span><h2>Hangisi?</h2></div>
        <button class="ikon-dugme" type="button" data-kapat="mekan" aria-label="Paneli kapat">${ik('kapat', 16)}</button></div>
        <ul class="kisi-liste">${ms.map(m => `<li><button type="button" data-mekan="${m.id}"><span style="width:10px;height:10px;border-radius:50%;background:${S.mekanRenk(m)};margin-top:5px;flex:none"></span><span>${esc(m.ad)}<span class="alt">${S.mekanHikayeleri(m.id).length ? S.mekanHikayeleri(m.id).length + ' hikâye' : esc(ilkCumle(m.aciklama, 60))}${m.bugunku_ad ? ' · ' + esc(m.bugunku_ad) : ''}</span></span></button></li>`).join('')}</ul></div>`;
      const m = ms[0]; if (m && this.map) this.map.getSource('secili').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [+m.boylam, +m.enlem] }, properties: {} }] });
    },
    mekanSec(id, uc) {
      const m = S.ix.mekan.get(id); if (!m) return;
      this.secili = id;
      if (this.map) this.map.getSource('secili').setData({ type: 'FeatureCollection', features: m.enlem != null ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [+m.boylam, +m.enlem] }, properties: {} }] : [] });
      this.isaretler.forEach(mk => mk.getElement().classList.toggle('secili', mk._mekanId === id));
      const p = $('#panel-mekan'); p.hidden = false; p.innerHTML = this.mekanPanel(m); p.scrollTop = 0;
      if (m.enlem != null && this.map) {
        const sol = window.innerWidth > 760 ? 440 : 0, alt = window.innerWidth > 760 ? 0 : window.innerHeight * .55;
        const sag = this.kisi && window.innerWidth > 760 ? 400 : 60;
        this.map[uc ? 'flyTo' : 'easeTo']({ center: [+m.boylam, +m.enlem], zoom: Math.max(this.map.getZoom(), uc ? 15.5 : this.map.getZoom()), padding: { left: sol, right: sag, top: 40, bottom: alt + 40 }, essential: true, duration: uc ? 1600 : 600 });
      }
      $('.ikon-dugme[data-kapat]', p).focus({ preventScroll: true });
    },
    mekanPanel(m) {
      const hs = S.mekanHikayeleri(m.id), dk = S.mekanKisiBaglari(m.id), dkSet = new Set(dk.map(k => k.id)), ks = S.mekanKisileri(m.id).filter(k => !dkSet.has(k.id));
      const uzun = (m.aciklama || '').replace(/\s+/g, ' ').trim().length > 420;
      return `<div class="panel-ic">
        <div class="panel-baslik"><div><span class="ust-etiket">Mekân${m.ilce ? ' · ' + esc(m.ilce) : ''}</span><h2><a class="baslik-link" href="#mekan-${m.slug}" title="Mekân sayfası ve karekod">${esc(m.ad)}</a></h2></div>
          <div class="dugmeler"><button class="ikon-dugme" type="button" data-kopyala="${esc(S.mekanUrl(m))}" aria-label="Kalıcı bağlantıyı kopyala">${ik('link', 16)}</button>
          <button class="ikon-dugme" type="button" data-kapat="mekan" aria-label="Paneli kapat">${ik('kapat', 16)}</button></div></div>
        <div data-ayrik="${m.id}">${ayrik(m)}</div>
        <dl class="bilgi">${m.tur ? `<dt>TÜR</dt><dd>${turEtiket(m)}</dd>` : ''}${m.bugunku_ad ? `<dt>BUGÜN</dt><dd>${esc(m.bugunku_ad)}</dd>` : ''}</dl>
        ${m.aciklama ? `<div class="genel-bilgi metin">${aciklamaHtml(m, { kisa: uzun ? 420 : 0 })}${uzun ? `<div class="kisa-baglanti"><a href="#mekan-${m.slug}">Devamı mekân sayfasında ${ik('disari', 13)}</a></div>` : ''}</div>` : ''}
        ${!m.aciklama && S.vikipedi(m) ? `<div class="genel-bilgi">${vikiBlok(m, { kisa: 380 })}</div>` : ''}
        ${kisilerBolumu(dk, ks, { harita: true })}
        ${hs.length ? `<div class="bolum-baslik">Bu mekânla ilgili hikâyeler <span>${hs.length}</span></div>
        <div>${hs.map(h => this.hikayeOgesi(h, m)).join('')}</div>` : ''}</div>`;
    },
    hikayeOgesi(h, m) {
      const mek = S.hikayeMekanlari(h.id), yeni = 'target="_blank" rel="noopener"';
      const uzun = (h.metin || '').replace(/\s+/g, ' ').trim().length > 240;
      return `<article class="hikaye-oge"><span class="ust-etiket" style="color:var(--gri)">${[S.coklu(h.konular).join(', '), zaman(h), mek.length > 1 ? mek.length + ' mekân' : ''].filter(Boolean).map(esc).join(' · ')}</span>
        ${h.baslik !== m.ad ? `<h3><a href="#hikaye-${h.slug}" ${yeni}>${esc(h.baslik)}</a></h3>` : ''}
        ${seritHtml(S.hikayeGorselleri(h.id), 4, 'Hikâyenin fotoğrafları')}
        <div class="metin">${metinHtml(h, { bu: m.id, metin: ilkCumle(h.metin, 240) })}</div>
        <div class="kisa-baglanti"><a href="#hikaye-${h.slug}" ${yeni}>${uzun ? 'Devamı hikâye sayfasında' : 'Hikâye sayfası'} ${ik('disari', 13)}<span class="sr">(yeni sekmede açılır)</span></a></div></article>`;
    },
    // soldaki mekân yeni kişinin mekânları arasında değilse (ör. "birlikte anıldığı" kişiye geçince) mekân paneli kapanır;
    // aradaysa seçili kalır. Kişi soldaki mekân panelinin içinden seçildiyse panel her durumda kalır.
    kisiSec(id, mekandan) {
      const k = S.ix.kisi.get(id); if (!k) return;
      this.kisi = id; this.yenile(); this.isaretTemizle();
      const tum = S.kisiMekanlari(id);
      if (this.secili && !mekandan && !tum.some(x => x.mekan.id === this.secili)) this.kapat('mekan');
      const mek = tum.filter(x => x.mekan.enlem != null);
      mek.forEach((x, i) => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'isaret-kisi'; el.textContent = i + 1; el.setAttribute('aria-label', (i + 1) + '. ' + x.mekan.ad);
        if (x.mekan.id === this.secili) el.classList.add('secili');
        el.onclick = ev => { ev.stopPropagation(); this.mekanSec(x.mekan.id, false); };
        const mk = new maplibregl.Marker({ element: el }).setLngLat([+x.mekan.boylam, +x.mekan.enlem]).addTo(this.map); mk._mekanId = x.mekan.id; this.isaretler.push(mk);
      });
      const p = $('#panel-kisi'); p.hidden = false; p.innerHTML = this.kisiPanel(k, mek); p.scrollTop = 0;
      $('#harita-ust').innerHTML = `<div class="kisi-bandi">${esc(k.ad)} · ${mek.length} mekân<button type="button" data-kapat="kisi" aria-label="Kişi seçimini kaldır">${ik('kapat', 14)}</button></div>`;
      if (mek.length) {
        const b = new maplibregl.LngLatBounds(); mek.forEach(x => b.extend([+x.mekan.boylam, +x.mekan.enlem]));
        const w = window.innerWidth > 760;
        this.map.fitBounds(b, { padding: { left: w && this.secili ? 460 : 60, right: w ? 420 : 40, top: 80, bottom: w ? 80 : window.innerHeight * .6 }, maxZoom: 15, essential: true, duration: 1400 });
      }
      $$('#panel-mekan [data-kisi]').forEach(c => c.setAttribute('aria-pressed', c.dataset.kisi === id));
    },
    kisiPanel(k, mek) {
      const ilceler = new Map(); mek.forEach((x, i) => { const il = x.mekan.ilce || 'Diğer'; if (!ilceler.has(il)) ilceler.set(il, []); ilceler.get(il).push([x, i]); });
      const ba = S.birlikteAnilanlar(k.id).slice(0, 6);
      return `<div class="panel-ic">
        <div class="panel-baslik"><div><span class="ust-etiket" style="color:var(--mavi)">Kişi${k.meslekler ? ' · ' + esc(S.coklu(k.meslekler).join(', ')) : ''}</span><h2><a class="baslik-link" href="#kisi-${k.slug}" title="Kişi sayfası">${esc(k.ad)}</a></h2>
          <span style="font-size:13px;color:var(--gri)">${mek.length} mekânla ilişkili${k.yasam ? ' · ' + esc(k.yasam) : ''}</span></div>
          <button class="ikon-dugme" type="button" data-kapat="kisi" aria-label="Kişi panelini kapat">${ik('kapat', 16)}</button></div>
        ${(() => { const gs = S.kisiGorselleri(k.id), f = gs.find(g => S.fotoKisileri(g).length === 1) || gs[0];
          return f ? `<button type="button" class="kisi-panel-foto" data-medya-liste="${gs.map(x => x.id).join(',')}" data-medya-i="${gs.indexOf(f)}" aria-label="${esc(k.ad)} fotoğrafını tam ekran aç">${img(f, 600, k.ad)}</button>` : ''; })()}
        ${k.kisa_bilgi ? `<div class="kisi-bilgi"><p class="metin" style="font-size:15px">${esc(ilkCumle(k.kisa_bilgi, 320))}</p>${k.kisa_bilgi.length > 320 ? `<div class="kisa-baglanti"><a href="#kisi-${k.slug}">Devamı kişi sayfasında ${ik('disari', 13)}</a></div>` : ''}</div>` : `<div class="kisi-bilgi">${vikiBlok(k, { kisa: 320 })}</div>`}
        ${[...ilceler.entries()].map(([il, a]) => `<div class="ilce-baslik">${esc(il)}<span>${a.length}</span></div><ul class="kisi-liste">${a.map(([x, i]) => `<li><button type="button" data-mekan="${x.mekan.id}"><span class="rozet kare">${i + 1}</span><span>${esc(x.mekan.ad)}<span class="alt">${esc(mekanOzet(x, 70))}</span></span></button></li>`).join('')}</ul>`).join('')}
        ${ba.length ? `<div class="bolum-baslik">En çok birlikte anıldığı <span></span></div><div class="cipler">${ba.map(x => `<button type="button" class="cip" data-kisi="${x.kisi.id}">${esc(x.kisi.ad)} <small>${x.n}</small></button>`).join('')}</div>` : ''}
      </div>`;
    },
    isaretTemizle() { this.isaretler.forEach(m => m.remove()); this.isaretler = []; },
    kapat(ne) {
      if (ne === 'kisi') { this.kisi = null; this.isaretTemizle(); $('#panel-kisi').hidden = true; $('#harita-ust').innerHTML = ''; this.yenile(); $$('#panel-mekan [data-kisi]').forEach(c => c.setAttribute('aria-pressed', 'false')); }
      if (ne === 'mekan') { this.secili = null; this.isaretler.forEach(mk => mk.getElement().classList.remove('secili')); $('#panel-mekan').hidden = true; this.map.getSource('secili').setData({ type: 'FeatureCollection', features: [] }); }
    },
    goster() { $('#harita-gorunum').hidden = false; if (this.map) setTimeout(() => this.map.resize(), 0); },
  };

  // çok mekânlı hikâye: metindeki, listedeki ve haritadaki aynı durak birlikte vurgulanır
  function durakVurgu(n) {
    document.querySelectorAll('.durak-vurgu').forEach(e => e.classList.remove('durak-vurgu'));
    if (!n || !document.querySelector('#sayfa .rota')) return; // yalnız rota bölümü olan hikâye sayfasında
    document.querySelectorAll(`#sayfa [data-durak="${n}"], #sayfa .isaret-yol[data-n="${n}"]`).forEach(e => e.classList.add('durak-vurgu'));
  }
  ['mouseover', 'focusin'].forEach(ev => document.addEventListener(ev, e => {
    const t = e.target.closest && e.target.closest('#sayfa [data-durak], #sayfa .isaret-yol[data-n]');
    durakVurgu(t ? (t.dataset.durak || t.dataset.n) : null);
  }));

  // panel içi tıklamalar
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-kapat],[data-kisi],[data-mekan],[data-kopyala],[data-kucuk]');
    if (!t) return;
    if (t.dataset.kopyala) { kopyala(t.dataset.kopyala); return; }
    if (t.dataset.kucuk !== undefined) {
      const box = t.closest('[data-ayrik]'); if (box) { box.innerHTML = ayrik(S.ix.mekan.get(box.dataset.ayrik), +t.dataset.kucuk, { buyuk: box.dataset.buyuk === '1' }); }
      return;
    }
    if (!t.closest('#harita-gorunum')) return; // sayfalarda normal bağlantılar
    e.preventDefault();
    if (t.dataset.kapat) Harita.kapat(t.dataset.kapat);
    else if (t.dataset.kisi) Harita.kisiSec(t.dataset.kisi, !!t.closest('#panel-mekan'));
    else if (t.dataset.mekan) Harita.mekanSec(t.dataset.mekan, false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#harita-gorunum').hidden) { if (!$('#panel-kisi').hidden) Harita.kapat('kisi'); else if (!$('#panel-mekan').hidden) Harita.kapat('mekan'); } });

  // ---------- küçük haritalar (sayfalarda) ----------
  const miniler = [];
  async function miniHarita(el, noktalar, opts) {
    opts = opts || {};
    const map = await HafizaBasemap.create(el, { dataPath: S.cfg.dataPath, map: { interactive: true, scrollZoom: false } });
    miniler.push(map);
    const p = noktalar.filter(x => x.m.enlem != null);
    if (opts.cizgi && p.length > 1) {
      map.addSource('yol', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: p.map(x => [+x.m.boylam, +x.m.enlem]) } } });
      map.addLayer({ id: 'yol', type: 'line', source: 'yol', paint: { 'line-color': '#B3261E', 'line-width': 2.5, 'line-dasharray': [1, 2.5] }, layout: { 'line-cap': 'round' } });
    }
    p.forEach(x => {
      const d = document.createElement('a'); d.href = '#mekan-' + x.m.slug; d.className = opts.kare ? 'isaret-kisi' : 'isaret-yol' + (x.bu ? ' bu' : ''); d.textContent = x.n; d.dataset.n = x.n; d.setAttribute('aria-label', x.n + '. ' + x.m.ad); d.style.textDecoration = 'none';
      new maplibregl.Marker({ element: d }).setLngLat([+x.m.boylam, +x.m.enlem]).addTo(map);
    });
    if (p.length === 1) map.jumpTo({ center: [+p[0].m.boylam, +p[0].m.enlem], zoom: 14 });
    else if (p.length) { const b = new maplibregl.LngLatBounds(); p.forEach(x => b.extend([+x.m.boylam, +x.m.enlem])); map.fitBounds(b, { padding: 36, maxZoom: 15, duration: 0 }); }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  }
  function miniTemizle() { miniler.splice(0).forEach(m => { try { m.remove(); } catch (e) { } }); }
  function karekod(url, px) {
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace('<svg ', `<svg role="img" aria-label="Kalıcı adresin karekodu" style="width:${px}px;height:${px}px" `); } catch (e) { return ''; }
  }
  function karekodIndir(url, ad) {
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createDataURL(10, 4); } catch (e) { return '#'; }
  }

  // yan sütun: mini harita + büyük haritaya geçiş; paylaşım kutusu
  // kid verilirse (kişi sayfası) büyük harita kişinin bütün mekânlarıyla açılır
  function konumKart(mid, kid) {
    const hedef = kid ? `data-kisi-harita="${kid}"` : mid ? `data-haritada="${mid}"` : '';
    return `<div class="konum-kart"><div class="mini-harita" id="mini"></div>${hedef ? `
          <a class="konum-ac" href="#harita" ${hedef}>${ik('pin', 16)}<span>${kid ? 'Büyük haritada mekânlarını gör' : 'Büyük haritada aç'}</span><span class="ok">${ik('sag', 16)}</span></a>` : ''}</div>`;
  }
  function paylasKutusu(baslik, url, kare) {
    return `<div class="kutu paylas"><h2>${baslik}</h2>
          <div class="adres-satir"><label class="sr" for="kalici-adres">Kalıcı adres</label><input id="kalici-adres" class="adres" type="text" readonly value="${esc(url)}" title="${esc(url)}" onfocus="this.select()"><button class="dugme" type="button" data-kopyala="${esc(url)}">${ik('link', 15)} Kopyala</button></div>${kare ? `
          <div class="paylas-ic">${karekod(url, 104)}<div class="paylas-sag"><p>Basılı malzemede ya da mekânın önünde okutulmak için karekod.</p>
            <a class="dugme" href="${karekodIndir(url)}" download="karekod-${kare}.gif">${ik('indir', 15)} Karekodu indir</a></div></div>` : ''}</div>`;
  }

  // ================= SAYFALAR =================
  function mekanSayfasi(m) {
    const hs = S.mekanHikayeleri(m.id), dk = S.mekanKisiBaglari(m.id), dkSet = new Set(dk.map(k => k.id)), ks = S.mekanKisileri(m.id).filter(k => !dkSet.has(k.id)), url = S.mekanUrl(m);
    const yak = m.enlem != null ? S.yakindakiler(m, 4) : [];
    return `<div class="sayfa detay">
      <div class="yol-izi"><a href="#mekanlar">Mekânlar</a> / ${m.ilce ? `${esc(m.ilce)} / ` : ''}${esc(m.ad)}</div>
      <div class="sayfa-ust"><div><span class="ust-etiket">${m.tur ? turEtiket(m) : 'Mekân'}${m.ilce ? ' · ' + esc(m.ilce) : ''}${hs.length ? ' · ' + hs.length + ' hikâye' : ''}</span><h1>${esc(m.ad)}</h1>${m.bugunku_ad ? `<div class="alt-baslik">Bugün: ${esc(m.bugunku_ad)}</div>` : ''}</div>
        ${m.enlem != null ? `<div class="dugmeler yalniz-dar"><a class="dugme koyu" href="#harita" data-haritada="${m.id}">${ik('pin', 16)} Haritada göster</a></div>` : ''}</div>
      <div class="iki-kolon"><div>
        <div class="buyuk-ayrik" data-ayrik="${m.id}">${ayrik(m)}</div>
        <div class="ikili">${m.aciklama || S.vikipedi(m) ? `<div><div class="bolum-baslik" style="margin-top:28px">Mekân hakkında <span></span></div>
        <div class="genel-bilgi metin" style="font-size:18px">${vikiParagraf(m)}${m.aciklama ? aciklamaHtml(m, { kaynak: m.aciklama_kaynak }) : ''}</div></div>` : ''}
        ${dk.length || ks.length ? `<div>${kisilerBolumu(dk, ks, { buyuk: true, ust: true })}</div>` : ''}</div>
        ${hs.length ? `<div class="bolum-baslik" style="margin-top:28px">Bu mekânla ilgili hikâyeler <span>${hs.length} hikâye</span></div>` : ''}
        <div class="hikaye-bloklar">${hs.map(h => {
          const mek = S.hikayeMekanlari(h.id), ksh = S.hikayeKisileri(h.id);
          return `<article class="hikaye-blok${mek.length > 1 ? ' vurgu' : ''}"><div class="yil">${esc(h.yil || (h.tarih && h.tarih.length <= 9 ? h.tarih : ''))}</div><div>
            <h3><a href="#hikaye-${h.slug}">${esc(h.baslik)}</a></h3>${seritHtml(S.hikayeGorselleri(h.id), 6, 'Hikâyenin fotoğrafları')}<div class="metin">${metinHtml(h, { bu: m.id })}</div>
            <div class="meta">${[esc(S.coklu(h.konular).join(', ')), mek.length > 1 ? `<a href="#hikaye-${h.slug}">bu hikâyenin ${mek.length} mekânı</a>` : ''].filter(Boolean).join(' · ')}</div>
            ${h.kaynak ? `<div class="kaynak">Kaynak: ${linkle(h.kaynak)}</div>` : '<div class="kaynak eksik">Kaynak eksik</div>'}
          </div></article>`; }).join('')}</div>
      </div>
      <aside class="yan">
        ${m.enlem != null ? konumKart(m.id) : ''}
        ${paylasKutusu('Bu mekânı paylaş', url, m.slug)}
        ${yak.length ? `<div><div class="bolum-baslik">Yakındaki mekânlar <span></span></div><ul class="yakinda">${yak.map(y => `<li><a href="#mekan-${y.mekan.slug}">${esc(y.mekan.ad)}</a><span>${metreYaz(y.d)}</span></li>`).join('')}</ul></div>` : ''}
      </aside></div></div>`;
  }
  function linkle(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" rel="noopener">${u.length > 60 ? u.slice(0, 57) + '…' : u}</a>`); }

  function hikayeSayfasi(h) {
    const mek = S.hikayeMekanlari(h.id), ks = S.hikayeKisileri(h.id), gs = S.hikayeGorselleri(h.id), ana = S.anaMekan(h.id);
    const hm = ana && ana.enlem != null ? ana : mek.find(m => m.enlem != null); // haritada açılacak mekân
    const cok = mek.length > 2; // çok mekânlı hikâyede rota, metnin altında geniş bir bölüm olur
    return `<div class="sayfa detay">
      <div class="yol-izi"><a href="#hikayeler">Hikâyeler</a> / ${esc(h.baslik)}</div>
      <div class="sayfa-ust"><div><span class="ust-etiket">${[S.coklu(h.konular).join(', ') || 'Hikâye', h.tarih || h.yil, h.donem].filter(Boolean).map(esc).join(' · ')}</span><h1>${esc(h.baslik)}</h1>
        ${ana && ana.ad !== h.baslik ? `<div class="alt-baslik">${esc(ana.ad)}${mek.length > 1 ? ` ve ${mek.length - 1} mekân daha` : ''}</div>` : ''}</div>
        ${hm ? `<div class="dugmeler yalniz-dar"><a class="dugme koyu" href="#harita" data-haritada="${hm.id}">${ik('pin', 16)} Haritada göster</a></div>` : ''}</div>
      <div class="iki-kolon"><div>
        <div class="ikili hikaye-ikili"><div>
        <div class="metin" style="font-size:19px">${metinHtml(h)}</div>
        ${h.kaynak ? `<div class="kaynak">Kaynak: ${linkle(h.kaynak)}</div>` : '<div class="kaynak eksik">Kaynak eksik</div>'}
        ${ks.length ? `<div class="bolum-baslik" style="margin-top:24px">Kişiler <span>${ks.length}</span></div><div class="kisi-rozetler buyuk">${ks.map(k => kisiKart(k)).join('')}</div>` : ''}
        </div><div>
        ${gs.length ? `<div class="hikaye-fotolar${gs.length === 1 ? ' tek' : gs.length === 2 ? ' iki' : ''}">${gs.map((g, i) => `<figure><button type="button" class="buyuk-medya" data-medya-liste="${gs.map(x => x.id).join(',')}" data-medya-i="${i}" aria-label="Fotoğraf ${i + 1} / ${gs.length}, tam ekran aç">${img(g, 900)}</button>${g.altyazi || S.fotoKisileri(g).length || g.yil ? `<figcaption>${g.yil ? `<span class="foto-yil">${esc(g.yil)}</span> ` : ''}${fotoAlt(g, { hikayesiz: true })}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
        </div></div>
      </div><aside class="yan">
        ${cok ? '' : konumKart(hm && hm.id)}
        ${paylasKutusu('Bu hikâyeyi paylaş', S.hikayeUrl(h))}
        ${cok ? '' : `<div><div class="bolum-baslik">Mekânlar <span>${mek.length}</span></div><ul class="kisi-liste">${mek.map((m, i) => `<li><a href="#mekan-${m.slug}">${mek.length > 1 ? `<span class="rozet">${i + 1}</span>` : ''}<span>${esc(m.ad)}<span class="alt">${esc(m.ilce || '')}${m.enlem == null ? ' · haritada yok' : ''}</span></span></a></li>`).join('')}</ul></div>`}
      </aside></div>
      ${cok ? `<section class="rota" aria-labelledby="rota-b">
        <div class="bolum-baslik" id="rota-b">Hikâyenin mekânları <span>${mek.length} durak</span></div>
        <div class="rota-ic">
          <ol class="rota-liste">${mek.map((m, i) => `<li data-durak="${i + 1}"><span class="rozet">${i + 1}</span><a href="#mekan-${m.slug}">${esc(m.ad)}</a><span class="alt">${esc(m.ilce || '')}${m.enlem == null ? ' · <em>haritada konumu yok</em>' : ''}</span></li>`).join('')}</ol>
          ${konumKart(hm && hm.id)}
        </div></section>` : ''}
      </div>`;
  }

  function kisiSayfasi(k) {
    const mek = S.kisiMekanlari(k.id), ba = S.birlikteAnilanlar(k.id).slice(0, 8), max = ba[0] ? ba[0].n : 1;
    const khs = S.kisiHikayeleri(k.id).filter(h => h.durum !== 'taslak' && h.durum !== 'arsiv');
    // kişinin geçtiği bir hikâyenin fotoğrafı "Fotoğrafları"nda değil, o hikâyenin kartında görünür
    const khSet = new Set(khs.map(h => h.id)), kgs = S.kisiGorselleri(k.id).filter(g => !(g.hikaye_id && khSet.has(g.hikaye_id)));
    const ilceler = new Map(); mek.forEach((x, i) => { const il = x.mekan.ilce || 'Diğer'; if (!ilceler.has(il)) ilceler.set(il, []); ilceler.get(il).push([x, i]); });
    return `<div class="sayfa detay">
      <div class="yol-izi"><a href="#kisiler">Kişiler</a>${k.meslekler ? ' / ' + esc(S.coklu(k.meslekler)[0]) : ''}</div>
      <div class="sayfa-ust"><div><span class="ust-etiket" style="color:var(--mavi)">Kişi${k.meslekler ? ' · ' + esc(S.coklu(k.meslekler).join(', ')) : ''}</span><h1>${esc(k.ad)}</h1>
        <div class="alt-baslik">${[mek.length ? `${mek.length} mekânla ilişkili` : '', ilceler.size ? `${ilceler.size} ilçe` : '', khs.length ? `${khs.length} hikâye` : '',
          S.kisiGorselleri(k.id).length ? `${S.kisiGorselleri(k.id).length} fotoğrafta` : '', k.yasam ? esc(k.yasam) : ''].filter(Boolean).join(' · ')}</div></div>
        ${mek.some(x => x.mekan.enlem != null) ? `<div class="dugmeler yalniz-dar"><a class="dugme koyu" href="#harita" data-kisi-harita="${k.id}">${ik('pin', 16)} Haritada gör</a></div>` : ''}</div>
      <div class="ikili kisi-ikili">
  <div>${k.kisa_bilgi || S.vikipedi(k) ? `<section class="biyografi"><div class="bolum-baslik">Biyografi <span></span></div>
        <div class="metin" style="font-size:18px">${vikiParagraf(k)}${k.kisa_bilgi ? paragraflar(esc(k.kisa_bilgi), k.bilgi_kaynak ? `Kaynak: ${linkle(k.bilgi_kaynak)}` : '') : ''}</div></section>` : ''}</div>
  <div>${kgs.length ? `<div class="bolum-baslik">Fotoğrafları <span>${kgs.length}</span></div><div class="foto-izgara">${kgs.map((g, i) => `<figure><button type="button" class="kucuk-medya" data-medya-liste="${kgs.map(x => x.id).join(',')}" data-medya-i="${i}" aria-label="Fotoğraf ${i + 1} / ${kgs.length}, tam ekran aç">${img(g, 500)}</button><figcaption>${fotoAlt(g, { haric: k.id, mekan: true })}</figcaption></figure>`).join('')}</div>` : ''}</div>
      </div>
      ${khs.length ? `<div class="bolum-baslik" style="margin-top:28px">İlgili hikâyeler <span>${khs.length}</span></div><div class="kartlar" style="margin:12px 0 28px">${khs.map(h => kart(h, k.id)).join('')}</div>` : ''}
      ${mek.length ? `<div class="bolum-baslik" style="margin:28px 0 12px">Mekânları <span>${mek.length}</span></div>
      <div class="iki-kolon kisi-mekanlar"><div>
        ${[...ilceler.entries()].map(([il, a]) => `<div class="ilce-baslik">${esc(il)}<span>${a.length}</span></div><ul class="kisi-liste">${a.map(([x, i]) => `<li><a href="#mekan-${x.mekan.slug}"><span class="rozet kare">${i + 1}</span><span>${esc(x.mekan.ad)}<span class="alt">${esc(mekanOzet(x, 90))}</span></span></a></li>`).join('')}</ul>`).join('')}
      </div><div>
        ${konumKart(null, mek.some(x => x.mekan.enlem != null) && k.id)}
        ${ba.length ? `<div class="bolum-baslik" style="margin-top:24px">Birlikte anıldığı kişiler <span>ortak kayıt</span></div>${ba.map(x => `<div class="cubuk"><a href="#kisi-${x.kisi.slug}">${esc(x.kisi.ad)}</a><i style="width:${Math.max(8, x.n / max * 100)}%"></i><span>${x.n}</span></div>`).join('')}` : ''}
      </div></div>` : ''}</div>`;
  }

  const listeDurum = { konu: new Set(), donem: new Set(), ilce: '', foto: false, q: '', n: 24 };
  const DONEMLER = ['1900 Öncesi', '1901 - 1950', '1951 - 1990', '1991 Sonrası'];
  const zaman = h => h.yil || (h.tarih && h.tarih.length <= 16 ? h.tarih : '') || h.donem || '';
  function hikayelerSayfasi() {
    const d = listeDurum;
    const tum = S.t.hikayeler.filter(h => h.durum !== 'taslak' && h.durum !== 'arsiv');
    const ilceOf = h => (S.anaMekan(h.id) || {}).ilce || '';
    const uyan = tum.filter(h => (!d.konu.size || S.coklu(h.konular).some(x => d.konu.has(x))) && (!d.donem.size || d.donem.has(h.donem)) && (!d.ilce || ilceOf(h) === d.ilce) && (!d.foto || S.hikayeGorselleri(h.id).length) &&
      (!d.q || fold(h.baslik + ' ' + h.metin).includes(fold(d.q))));
    const ilceler = [...new Set(tum.map(ilceOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    const konuSay = k => tum.filter(h => S.coklu(h.konular).includes(k)).length;
    return `<div class="sayfa detay liste"><div class="sayfa-ust"><div><h1>Hikâyeler</h1></div><div class="meta" style="font-size:13px">${uyan.length} / ${tum.length} hikâye</div></div>
      <div class="liste-duzen"><form class="suzgec" id="suzgec" onsubmit="return false">
        <label class="sr" for="s-q">Hikâyelerde ara</label><input type="search" id="s-q" placeholder="Metinde ara" value="${esc(d.q)}">
        <fieldset><legend>Konu</legend>${S.liste('hikaye_konu').filter(konuSay).map(k => `<label><input type="checkbox" name="konu" value="${esc(k)}" ${d.konu.has(k) ? 'checked' : ''}>${esc(k)}<small>${konuSay(k)}</small></label>`).join('')}</fieldset>
        <fieldset><legend>Dönem</legend>${DONEMLER.map(x => `<label><input type="checkbox" name="donem" value="${esc(x)}" ${d.donem.has(x) ? 'checked' : ''}>${esc(x)}<small>${tum.filter(h => h.donem === x).length}</small></label>`).join('')}</fieldset>
        <fieldset><legend>İlçe</legend><label class="sr" for="s-ilce">İlçe</label><select id="s-ilce"><option value="">Tüm ilçeler</option>${ilceler.map(i => `<option ${d.ilce === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}</select></fieldset>
        <label><input type="checkbox" id="s-foto" ${d.foto ? 'checked' : ''}> Yalnızca fotoğraflı</label>
      </form>
      <div><div class="kartlar">${uyan.slice(0, d.n).map(h => kart(h)).join('') || '<div class="bos">Bu seçime uyan hikâye yok.</div>'}</div>
        ${uyan.length > d.n ? `<div class="daha"><button class="dugme" type="button" id="daha">Daha fazla göster</button></div>` : ''}</div></div></div>`;
  }
  // kid verilirse (kişi sayfası) kartın görseli, o kişinin göründüğü hikâye fotoğrafı olur
  function kart(h, kid) {
    const gs0 = S.hikayeGorselleri(h.id), on = kid ? gs0.find(g => S.fotoKisileri(g).some(k => k.id === kid)) : null;
    const gs = on ? [on, ...gs0.filter(g => g !== on)] : gs0, m = S.anaMekan(h.id), ks = S.hikayeKisileri(h.id), mek = S.hikayeMekanlari(h.id);
    return `<article class="kart"><a class="gorsel" href="#hikaye-${h.slug}" tabindex="-1" aria-hidden="true">${gs[0] ? img(gs[0], 600) : `<div class="yer-tutucu eski">${ik('kamera', 20)}</div>`}${gs.length ? `<span class="say">${gs.length} fotoğraf</span>` : ''}</a>
      <span class="ust-etiket">${[S.coklu(h.konular).join(', '), m && m.ilce, zaman(h)].filter(Boolean).map(esc).join(' · ')}</span>
      <h3><a href="#hikaye-${h.slug}">${esc(h.baslik)}</a></h3><p>${esc(ilkCumle(h.metin, 140))}</p>
      ${m ? `<div class="meta" style="text-transform:none;letter-spacing:0">${ik('pin', 14)}<a href="#mekan-${m.slug}">${esc(m.ad)}</a>${mek.length > 1 ? ` + ${mek.length - 1} mekân` : ''}</div>` : ''}
      ${ks.length ? `<div class="cipler">${ks.slice(0, 3).map(k => `<a class="cip" href="#kisi-${k.slug}" style="min-height:26px;font-size:12px">${esc(k.ad)}</a>`).join('')}${ks.length > 3 ? `<span class="cip tema" style="min-height:26px;font-size:12px">+${ks.length - 3}</span>` : ''}</div>` : ''}</article>`;
  }
  function harfGruplari(rows, adOf, href, altOf) {
    const g = new Map();
    rows.sort((a, b) => adOf(a).localeCompare(adOf(b), 'tr')).forEach(r => { const h = adOf(r).charAt(0).toLocaleUpperCase('tr'); if (!g.has(h)) g.set(h, []); g.get(h).push(r); });
    return `<div class="harf-grup">${[...g.entries()].map(([h, a]) => `<section><h2>${esc(h)}</h2><ul>${a.map(r => `<li><a href="${href(r)}">${esc(adOf(r))}<small>${esc(altOf(r))}</small></a></li>`).join('')}</ul></section>`).join('')}</div>`;
  }
  const kisiDurum = { q: '', meslekler: new Set(), hepsi: false };
  function kisilerSayfasi() {
    // mekânı olmayan ama hikâyede anılan ya da fotoğrafta görülen kişiler de listede
    const iz = k => { const m = S.kisiMekanlari(k.id).length, h = S.kisiHikayeleri(k.id).filter(x => x.durum !== 'taslak' && x.durum !== 'arsiv').length, f = S.kisiGorselleri(k.id).length;
      return m ? m + ' mekân' : h ? h + ' hikâye' : f ? f + ' fotoğraf' : ''; };
    const tum = S.t.kisiler.filter(k => k.durum !== 'taslak' && iz(k));
    const meslekSay = r => tum.filter(k => S.coklu(k.meslekler).includes(r)).length;
    // birden çok meslek seçilebilir: "herhangi biri" (en az birini taşıyan) ya da "hepsi" (hepsini taşıyan)
    const d = kisiDurum, sec = [...d.meslekler];
    const meslekUyar = k => { if (!sec.length) return true; const m = S.coklu(k.meslekler); return d.hepsi ? sec.every(x => m.includes(x)) : sec.some(x => m.includes(x)); };
    const uyan = tum.filter(k => (!d.q || fold(k.ad).includes(fold(d.q))) && meslekUyar(k));
    return `<div class="sayfa detay liste"><div class="sayfa-ust"><div><h1>Kişiler</h1><div class="alt-baslik">Yaşadığı, çalıştığı ya da anıldığı yerler, hikâyeler ve fotoğraflarla ${tum.length} kişi.</div></div>
      <div style="width:280px"><label class="sr" for="k-q">Kişi ara</label><input id="k-q" type="search" placeholder="Kişi ara" value="${esc(kisiDurum.q)}" style="height:38px;width:100%;border:1.5px solid var(--murekkep);padding:0 10px;font:inherit"></div>
      <div class="cipler ust-cipler" role="group" aria-label="Mesleğe göre süz">${S.liste('meslek').map(r => [r, meslekSay(r)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([r, n]) => `<button type="button" class="cip" data-meslek="${esc(r)}" aria-pressed="${d.meslekler.has(r)}">${esc(r)} <small>${n}</small></button>`).join('')}
        <button type="button" class="cip temizle" data-meslek-temizle ${sec.length ? '' : 'disabled'}>Temizle</button></div>
      <div class="secim-bilgi"><span class="secim-kipi" role="group" aria-label="Birden çok meslek seçilince"><button type="button" data-meslek-kip="herhangi" aria-pressed="${!d.hepsi}" ${sec.length > 1 ? '' : 'disabled'}>Herhangi biri</button><button type="button" data-meslek-kip="hepsi" aria-pressed="${d.hepsi}" ${sec.length > 1 ? '' : 'disabled'}>Hepsi</button></span>
        <span class="meta">${sec.length ? `${uyan.length} kişi: ${sec.map(esc).join(d.hepsi ? ' ve ' : ' ya da ')}` : `${uyan.length} kişi`}</span></div></div>
      ${uyan.length ? harfGruplari(uyan, k => k.ad, k => '#kisi-' + k.slug, k => [S.coklu(k.meslekler).slice(0, 2).join(', '), iz(k)].filter(Boolean).join(' · ')) : '<div class="bos">Sonuç yok.</div>'}</div>`;
  }
  const mekDurum = { q: '', ilce: '', gruplar: new Set(), turler: new Set(), yapi: '' };
  function mekanlarSayfasi() {
    const tum = S.t.mekanlar.filter(m => m.durum !== 'arsiv' && m.durum !== 'taslak' && S.mekanIcerikli(m));
    const ilceler = [...new Set(tum.map(m => m.ilce).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    // önce üst kategori (grup), istenirse grubun içinden tek tek türler; ikisi de çoklu seçim
    const d = mekDurum, turUyar = m => d.turler.size ? d.turler.has(m.tur) : !d.gruplar.size || d.gruplar.has(S.mekanGrup(m));
    const uyan = tum.filter(m => (!mekDurum.ilce || m.ilce === mekDurum.ilce) && turUyar(m) && (!mekDurum.yapi || m.yapi_durumu === mekDurum.yapi) && (!mekDurum.q || fold(m.ad + ' ' + m.bugunku_ad).includes(fold(mekDurum.q))));
    const turSay = t => tum.filter(m => m.tur === t).length, grupSay = g => tum.filter(m => S.mekanGrup(m) === g).length;
    const SEC = 'height:38px;border:1.5px solid var(--murekkep);font:inherit;background:#fff';
    return `<div class="sayfa detay liste"><div class="sayfa-ust"><div><h1>Mekânlar</h1><div class="alt-baslik">${tum.length} mekân, her birinin kalıcı adresi ve karekodu var.</div></div>
      <div style="display:flex;gap:8px"><label class="sr" for="m-q">Mekân ara</label><input id="m-q" type="search" placeholder="Mekân ara" value="${esc(mekDurum.q)}" style="height:38px;width:220px;border:1.5px solid var(--murekkep);padding:0 10px;font:inherit">
      <label class="sr" for="m-yapi">Yapının durumu</label><select id="m-yapi" style="${SEC}"><option value="">Ayakta / yıkılmış</option>${[['ayakta', 'Bugün ayakta'], ['yıkıldı', 'Yıkılmış']].map(([v, l]) => `<option value="${v}" ${mekDurum.yapi === v ? 'selected' : ''}>${l} (${tum.filter(m => m.yapi_durumu === v).length})</option>`).join('')}</select>
      <label class="sr" for="m-ilce">İlçe</label><select id="m-ilce" style="${SEC}"><option value="">Tüm ilçeler</option>${ilceler.map(i => `<option ${mekDurum.ilce === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}</select></div>
      <div class="kategori-suzgec"><div class="cipler ust-cipler" role="group" aria-label="Mekân türü grubu">${S.t.mekan_gruplari.filter(g => grupSay(g.ad)).map(g => `<button type="button" class="cip grup-cip" data-mgrup="${esc(g.ad)}" aria-pressed="${d.gruplar.has(g.ad)}" style="--r:${g.renk}"><i></i>${esc(g.ad)} <small>${grupSay(g.ad)}</small></button>`).join('')}
        <button type="button" class="cip temizle" data-mgrup-temizle ${d.gruplar.size || d.turler.size ? '' : 'disabled'}>Temizle</button></div>
        <div class="cipler alt-cipler" role="group" aria-label="Tür">${d.gruplar.size ? [...d.gruplar].flatMap(g => S.turlerOf(g).filter(turSay).map(t => `<button type="button" class="cip tur-cip" data-mtur="${esc(t)}" aria-pressed="${d.turler.has(t)}" style="--r:${S.grupRenk(g)}">${esc(t)} <small>${turSay(t)}</small></button>`)).join('') + '<span class="ipucu">Tür seçmezseniz grubun tamamı gösterilir.</span>' : '<span class="ipucu">Bir grup seçince türleri burada çıkar; istediğiniz türleri ayrıca seçebilirsiniz.</span>'}</div></div></div>
      <div class="meta" style="margin:-8px 0 16px;font-size:13px">${uyan.length} mekân</div>
      ${uyan.length ? harfGruplari(uyan, m => m.ad, m => '#mekan-' + m.slug, m => [m.tur, m.ilce, S.mekanHikayeleri(m.id).length ? S.mekanHikayeleri(m.id).length + ' hikâye' : ''].filter(Boolean).join(' · ')) : '<div class="bos">Sonuç yok.</div>'}</div>`;
  }
  // ================= ALBÜM =================
  // Üç düzen: mekân türüne göre şeritler, zamana göre tek şerit (on yıllar), ya da ızgara. Süzgeçler hepsinde ortak.
  const albumDurum = { duzen: 'tur', donem: '', grup: '', konu: '', ilce: '', gtur: '', tarih: '', n: 60 };
  // görsel türlerinin gösterim sırası (Excel'deki liste); veride başka bir tür varsa sona eklenir
  const GORSEL_TURLERI = ['Fotoğraf', 'Kartpostal', 'Resim', 'Gravür', 'Harita', 'Gazete', 'Belge'];
  const GTUR_BOS = '-';  // "türü girilmemiş" seçeneğinin değeri
  const albumListeleri = {};
  // "1930'lar" → 1930, "1903-1904" → 1903, "1961" → 1961; okunamazsa null
  const yilSayi = y => { const m = String(y || '').match(/(1[5-9]\d\d|20\d\d)/); return m ? +m[1] : null; };
  const onYil = y => Math.floor(y / 10) * 10;
  // mozaik: sütunlar; her sütunda 1–3 kare, genişlikler değişken (şerit yüksekliğinin katı)
  const DESEN = [[1.3, [1]], [.78, [.56, .44]], [.92, [.42, .58]], [.68, [.34, .33, .33]], [1.08, [.5, .5]], [.74, [1]], [.86, [.6, .4]], [1.2, [1]], [.7, [.5, .5]]];
  function mozaik(gs, anahtar, opts) {
    opts = opts || {}; albumListeleri[anahtar] = gs.map(g => g.id);
    const sutunlar = []; let i = 0, d = (anahtar.length * 7) % DESEN.length;
    const kare = (g, k, f) => { const m = S.ix.mekan.get(g.mekan_id); const y = g.yil || (g.donem === 'bugün' ? 'bugün' : '');
      return `<button type="button" class="al-k" style="flex:${f}" data-medya-liste="album:${anahtar}" data-medya-i="${k}" aria-label="${esc(m ? m.ad : 'Fotoğraf')}${y ? ', ' + esc(y) : ''} — tam ekran aç">${img(g, 520, m && m.ad)}<span class="al-alt"><b>${esc(m ? m.ad : '')}</b>${y ? `<span>${esc(y)}</span>` : ''}</span></button>`; };
    while (i < gs.length) {
      if (opts.isaret && opts.isaret.has(i)) { const t = opts.isaret.get(i); sutunlar.push(`<div class="al-isaret" id="${t.id}"><span>${esc(t.ad)}</span><small>${t.n}</small></div>`); }
      const [w, satir] = DESEN[d++ % DESEN.length]; const parca = [];
      for (let r = 0; r < satir.length && i < gs.length; r++) { if (r && opts.isaret && opts.isaret.has(i)) break; parca.push(kare(gs[i], i, satir[r])); i++; }
      sutunlar.push(`<div class="al-sutun" style="width:calc(var(--h) * ${parca.length === satir.length ? w : Math.max(w, .7)})">${parca.join('')}</div>`);
    }
    if (opts.daha) sutunlar.push(`<div class="al-sutun al-daha-sutun" style="width:calc(var(--h) * .6)"><button type="button" class="al-daha" ${opts.daha}>${opts.dahaMetin || 'Tümünü gör'} ${ik('sag', 16)}</button></div>`);
    return `<div class="al-serit-kap"><button type="button" class="al-ok sol" data-al-kaydir="-1" aria-label="Geri">${ik('sol', 20)}</button>
      <div class="al-serit" tabindex="0" aria-label="${esc(opts.etiket || 'Fotoğraflar')}">${sutunlar.join('')}</div>
      <button type="button" class="al-ok sag" data-al-kaydir="1" aria-label="İleri">${ik('sag', 20)}</button></div>`;
  }
  function albumSayfasi() {
    const d = albumDurum;
    const taban = S.t.gorseller.filter(g => S.ix.mekan.has(g.mekan_id) && (S.ix.mekan.get(g.mekan_id).durum !== 'arsiv'));
    // süzgeçler tek seçimli: dönem, mekân türü grubu, konu, ilçe (+ zaman şeridinden gelen "tarihsiz")
    const uy = (g, haric) => (haric === 'donem' || !d.donem || g.donem === d.donem) && (haric === 'konu' || !d.konu || (g.konu || 'mekân') === d.konu) &&
      (haric === 'grup' || !d.grup || S.mekanGrup(g.mekan_id) === d.grup) && (haric === 'ilce' || !d.ilce || (S.ix.mekan.get(g.mekan_id) || {}).ilce === d.ilce) &&
      (haric === 'gtur' || !d.gtur || (g.tur || GTUR_BOS) === d.gtur) &&
      (!d.tarih || (d.tarih === 'tarihli') === !!yilSayi(g.yil));
    const tum = taban.filter(g => uy(g));
    // önce açıklaması olan arşiv kareleri, sonra diğerleri; zaman düzeninde yıl sırası
    const puan = g => (g.donem === 'o zaman' ? 0 : 2) + (g.altyazi ? 0 : 1);
    const say = (haric, f) => taban.filter(g => uy(g, haric) && f(g)).length;
    const ilceler = [...new Set(taban.map(g => (S.ix.mekan.get(g.mekan_id) || {}).ilce).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    const suzgecVar = d.donem || d.konu || d.grup || d.ilce || d.gtur || d.tarih;
    const gturler = [...GORSEL_TURLERI, ...[...new Set(taban.map(g => g.tur).filter(t => t && !GORSEL_TURLERI.includes(t)))].sort((a, b) => a.localeCompare(b, 'tr'))];
    const secim = (id, ad, haric, secenekler, bos) => `<label class="al-sec${d[ad] ? ' dolu' : ''}"><span>${bos}</span><select id="${id}" data-al-sec="${ad}">
      <option value="">Tümü</option>${secenekler.map(([v, l, f]) => { const n = say(haric, f); return n || d[ad] === v ? `<option value="${esc(v)}" ${d[ad] === v ? 'selected' : ''}>${esc(l)} (${n})</option>` : ''; }).join('')}</select></label>`;
    const duzenler = [['tur', 'Mekân türüne göre', 'katman'], ['zaman', 'Zamana göre', 'saat'], ['gorsel', 'Görsel türüne göre', 'cerceve'], ['izgara', 'Tümü', 'izgara']];
    let govde = '';
    if (!tum.length) govde = '<div class="bos">Bu seçime uyan fotoğraf yok.</div>';
    else if (d.duzen === 'tur') {
      govde = S.t.mekan_gruplari.map(gr => {
        const gs = tum.filter(g => S.mekanGrup(g.mekan_id) === gr.ad).sort((a, b) => puan(a) - puan(b)); if (!gs.length) return '';
        const N = 48;
        return `<section class="al-bolum" style="--r:${gr.renk}"><div class="al-bolum-ust"><i></i><h2>${esc(gr.ad)}</h2><span>${gs.length} fotoğraf · ${esc(S.turlerOf(gr.ad).filter(t => gs.some(g => (S.ix.mekan.get(g.mekan_id) || {}).tur === t)).slice(0, 6).join(', '))}</span>
          <button type="button" class="al-hepsi" data-al-hepsi="${esc(gr.ad)}">Tümünü gör ${ik('sag', 14)}</button></div>
          ${mozaik(gs.slice(0, N), 'g-' + S.slugify(gr.ad), { etiket: gr.ad + ' fotoğrafları', daha: gs.length > N ? `data-al-hepsi="${esc(gr.ad)}"` : '', dahaMetin: `${gs.length - N} fotoğraf daha` })}</section>`;
      }).join('');
    } else if (d.duzen === 'gorsel') {
      const N = 48, bolum = (v, ad, gs, alt) => `<section class="al-bolum al-gtur${v === GTUR_BOS ? ' bos-tur' : ''}"><div class="al-bolum-ust"><i></i><h2>${esc(ad)}</h2><span>${gs.length} görsel${alt ? ' · ' + alt : ''}</span>
          <button type="button" class="al-hepsi" data-al-gtur-hepsi="${esc(v)}">Tümünü gör ${ik('sag', 14)}</button></div>
          ${mozaik(gs.slice(0, N), 'gt-' + S.slugify(v === GTUR_BOS ? 'turu-girilmemis' : v), { etiket: ad, daha: gs.length > N ? `data-al-gtur-hepsi="${esc(v)}"` : '', dahaMetin: `${gs.length - N} görsel daha` })}</section>`;
      govde = gturler.map(t => { const gs = tum.filter(g => g.tur === t).sort((a, b) => puan(a) - puan(b)); return gs.length ? bolum(t, t, gs) : ''; }).join('');
      const bos = tum.filter(g => !g.tur).sort((a, b) => puan(a) - puan(b));
      if (bos.length) govde += bolum(GTUR_BOS, 'Türü henüz girilmemiş', bos, 'içerik panelinden girildikçe yukarıdaki bölümlere geçer');
    } else if (d.duzen === 'zaman') {
      const tarihli = tum.filter(g => g.donem !== 'bugün' && yilSayi(g.yil)).sort((a, b) => yilSayi(a.yil) - yilSayi(b.yil) || puan(a) - puan(b));
      const tarihsiz = tum.filter(g => g.donem !== 'bugün' && !yilSayi(g.yil)).sort((a, b) => puan(a) - puan(b));
      const bugun = tum.filter(g => g.donem === 'bugün');
      const sira = [...tarihli, ...tarihsiz, ...bugun];
      const isaret = new Map();
      const onlar = new Map(); tarihli.forEach(g => { const o = onYil(yilSayi(g.yil)); onlar.set(o, (onlar.get(o) || 0) + 1); });
      const ekAd = o => String(o) + (/(10|30|40|60|90)$/.test(String(o)) ? "'lar" : "'ler");  // 1930'lar, 1950'ler
      let k = 0; [...onlar.entries()].forEach(([o, n]) => { isaret.set(k, { id: 'al-on-' + o, ad: ekAd(o), n }); k += n; });
      if (tarihsiz.length) { isaret.set(k, { id: 'al-on-tarihsiz', ad: 'Tarihsiz arşiv', n: tarihsiz.length }); k += tarihsiz.length; }
      if (bugun.length) isaret.set(k, { id: 'al-on-bugun', ad: 'Bugün', n: bugun.length });
      govde = `<div class="al-zaman"><div class="al-onyillar" role="group" aria-label="On yıla git">${[...onlar.entries()].map(([o, n]) => `<button type="button" data-al-onyil="al-on-${o}"><b>${ekAd(o)}</b><small>${n}</small></button>`).join('')}
          ${tarihsiz.length ? `<button type="button" data-al-onyil="al-on-tarihsiz" class="ayri"><b>Tarihsiz</b><small>${tarihsiz.length}</small></button>` : ''}${bugun.length ? `<button type="button" data-al-onyil="al-on-bugun"><b>Bugün</b><small>${bugun.length}</small></button>` : ''}</div>
        ${mozaik(sira, 'zaman', { isaret, etiket: 'Zamana göre fotoğraflar' })}</div>`;
    } else {
      const gs = tum.slice().sort((a, b) => puan(a) - puan(b)); albumListe = gs.map(g => g.id);
      govde = `<div class="album">${gs.slice(0, d.n).map((g, i) => { const m = S.ix.mekan.get(g.mekan_id); return `<figure><button type="button" class="kare" data-medya-liste="album" data-medya-i="${i}" aria-label="${esc(m.ad)} fotoğrafını tam ekran aç">${img(g, 900, m.ad)}</button><figcaption><span class="foto-konu">${KONU_AD[g.konu] || 'Mekân'}</span><a href="#mekan-${m.slug}">${esc(m.ad)}</a>${g.yil ? `<span> · ${esc(g.yil)}</span>` : ''}${(() => { const h = g.hikaye_id && S.ix.hikaye.get(g.hikaye_id); return h && h.durum !== 'taslak' ? `<span> · <a href="#hikaye-${h.slug}">${esc(h.baslik)}</a></span>` : ''; })()}${g.altyazi ? `<span class="altyazi">${esc(ilkCumle(g.altyazi, 110))}</span>` : ''}</figcaption></figure>`; }).join('')}</div>
        ${gs.length > d.n ? '<div class="daha"><button class="dugme" type="button" id="album-daha">Daha fazla göster</button></div>' : ''}`;
    }
    return `<div class="sayfa genis albumu"><div class="sayfa-ust"><div><h1>Albüm</h1><div class="alt-baslik">${tum.length === taban.length ? taban.length + ' fotoğraf' : tum.length + ' / ' + taban.length + ' fotoğraf'}; her biri çekildiği mekâna bağlı.</div></div>
      <div class="al-duzen" role="tablist" aria-label="Düzen">${duzenler.map(([v, l, i]) => `<button type="button" role="tab" aria-selected="${d.duzen === v}" data-al-duzen="${v}">${ik(i, 18)}<span>${l}</span></button>`).join('')}</div>
      <div class="al-suzgec">
        <div class="al-donem" role="group" aria-label="Dönem">${[['', 'Hepsi'], ['o zaman', 'O zaman'], ['bugün', 'Bugün']].map(([v, l]) => `<button type="button" data-al-donem="${v}" aria-pressed="${d.donem === v}">${l}</button>`).join('')}</div>
        ${secim('al-grup', 'grup', 'grup', S.t.mekan_gruplari.map(gr => [gr.ad, gr.ad, g => S.mekanGrup(g.mekan_id) === gr.ad]), 'Mekân türü')}
        ${secim('al-konu', 'konu', 'konu', [['mekân', 'Mekânın kendisi', g => (g.konu || 'mekân') === 'mekân'], ['hikâye', 'Bir an, bir olay', g => g.konu === 'hikâye']], 'Konu')}
        ${secim('al-ilce', 'ilce', 'ilce', ilceler.map(i => [i, i, g => (S.ix.mekan.get(g.mekan_id) || {}).ilce === i]), 'İlçe')}
        ${secim('al-gtur', 'gtur', 'gtur', [...gturler.map(t => [t, t, g => g.tur === t]), [GTUR_BOS, 'Türü girilmemiş', g => !g.tur]], 'Görsel türü')}
        <button type="button" class="al-temizle" data-al-temizle ${suzgecVar ? '' : 'disabled'}>Temizle</button>
        ${d.tarih ? `<button type="button" class="al-etiket-cip" data-al-tarih-kaldir>${d.tarih === 'tarihsiz' ? 'Yalnız tarihsiz' : 'Yalnız tarihli'} ${ik('kapat', 12)}</button>` : ''}
      </div></div>
      ${govde}</div>`;
  }
  function hakkindaSayfasi() {
    // bütün sayılar verinin kendisinden; sayfa veri değiştikçe kendiliğinden güncellenir
    const mek = S.t.mekanlar.filter(m => m.durum !== 'arsiv' && m.durum !== 'taslak' && S.mekanIcerikli(m));
    const hik = S.t.hikayeler.filter(h => h.durum !== 'taslak' && h.durum !== 'arsiv');
    const kis = S.t.kisiler.filter(k => k.durum !== 'taslak' && (S.kisiMekanlari(k.id).length || S.kisiHikayeleri(k.id).some(h => h.durum !== 'taslak' && h.durum !== 'arsiv') || S.kisiGorselleri(k.id).length));
    const gor = S.t.gorseller.filter(g => S.ix.mekan.has(g.mekan_id));
    const ilce = new Map(); mek.forEach(m => m.ilce && ilce.set(m.ilce, (ilce.get(m.ilce) || 0) + 1));
    const ilceSira = [...ilce.entries()].sort((a, b) => b[1] - a[1]);
    const eski = gor.filter(g => g.donem === 'o zaman').length, yeni = gor.filter(g => g.donem === 'bugün').length;
    const viki = kis.filter(k => S.vikipedi(k)).length;
    const cubuk = (ad, n, max, renk, href) => `<div class="hk-cubuk"><span>${href ? `<a href="${href}">${esc(ad)}</a>` : esc(ad)}</span><i style="width:${Math.max(3, n / max * 100)}%;background:${renk}"></i><b>${n}</b></div>`;
    const gSay = S.t.mekan_gruplari.map(g => [g, mek.filter(m => S.mekanGrup(m) === g.ad).length]).filter(x => x[1]), gMax = Math.max(1, ...gSay.map(x => x[1]));
    const kSay = S.liste('hikaye_konu').map(k => [k, hik.filter(h => S.coklu(h.konular).includes(k)).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]), kMax = Math.max(1, ...kSay.map(x => x[1]));
    const yikik = mek.filter(m => m.yapi_durumu === 'yıkıldı').length;
    const dSay = DONEMLER.map(d => [d, hik.filter(h => h.donem === d).length]), dMax = Math.max(1, ...dSay.map(x => x[1]));
    const iMax = ilceSira.length ? ilceSira[0][1] : 1;
    const adim = (no, baslik, metin) => `<li><span class="hk-no">${no}</span><div><h3>${baslik}</h3><p>${metin}</p></div></li>`;
    return `<div class="sayfa detay hakkinda">
      <div class="sayfa-ust"><div><span class="ust-etiket">Kent belleği haritası</span><h1>Hakkında</h1></div></div>
      <div class="hk-giris">
        <p class="hk-lead">Hafıza İstanbul, şehrin yapılarını, sokaklarını ve meydanlarını orada yaşanmış hikâyelerle ve o yerlerde iz bırakmış insanlarla birlikte gösteren bir kent belleği haritasıdır.</p>
        <p>Bir mekânın bugün ne olduğunu, bir zamanlar nasıl göründüğünü, orada neler yaşandığını ve kimlerin oradan geçtiğini aynı yerde bir araya getirir. Bir hikâye birden çok mekânda geçebilir, bir mekânda birden çok hikâye yaşanmış olabilir; kişiler de hikâyeler, fotoğraflar ve yaşadıkları, çalıştıkları yerler üzerinden mekânlara bağlanır.</p>
      </div>
      <div class="sayilar hk-sayilar">
        <div><b>${mek.length}</b>mekân</div><div><b>${hik.length}</b>hikâye</div><div><b>${kis.length}</b>kişi</div><div><b>${gor.length}</b>fotoğraf</div><div><b>${ilce.size}</b>ilçe</div>
      </div>

      <section class="hk-bolum"><h2>Nasıl gezilir?</h2>
        <ol class="hk-adimlar">
          ${adim(1, 'Haritada bir noktaya dokunun', 'Soldaki panel o mekânı anlatır: arşiv fotoğrafı ile bugününü karşılaştıran sürgü, mekân hakkındaki bilgi, orada iz bırakmış kişiler ve o yerde geçen hikâyeler.')}
          ${adim(2, 'Bir kişiyi izleyin', 'Panelde bir kişiye dokunduğunuzda sağda kişinin paneli açılır, kişinin bütün mekânları haritada numaralanır. "En çok birlikte anıldığı" kişilerle bir hayattan ötekine geçebilirsiniz.')}
          ${adim(3, 'Hikâyelerin peşine düşün', 'Hikâyeler sayfasında konu, dönem, ilçe ya da metin içinde arama ile süzün. Birçok mekânda geçen hikâyelerde duraklar metinde, listede ve haritada birlikte işaretlenir.')}
          ${adim(4, 'Yerinde okutun', 'Her mekânın değişmeyen bir adresi ve karekodu vardır. Karekod tabelalara, broşürlere ve sergilere basılabilir; okutan kişi doğrudan o mekânın sayfasına gelir.')}
        </ol>
      </section>

      <section class="hk-bolum"><h2>Neler anlatılıyor?</h2>
        <div class="hk-uclu hk-dortlu">
          <div><h3>Mekân türleri</h3>${gSay.map(([g, n]) => cubuk(g.ad, n, gMax, g.renk)).join('')}<p class="hk-not">Mekânların türlerine göre dağılımı; haritadaki noktaların rengi buradan gelir.${yikik ? ` ${yikik} mekânın yapısı bugün ayakta değil.` : ''}</p></div>
          <div><h3>Hikâye konuları</h3>${kSay.map(([k, n]) => cubuk(k, n, kMax, 'var(--murekkep)')).join('')}<p class="hk-not">Bir hikâyenin birden çok konusu olabilir.</p></div>
          <div><h3>Dönemler</h3>${dSay.map(([d, n]) => cubuk(d, n, dMax, 'var(--murekkep)')).join('')}<p class="hk-not">Hikâyelerin geçtiği dönem.</p></div>
          <div><h3>En çok mekânı olan ilçeler</h3>${ilceSira.slice(0, 8).map(([il, n]) => cubuk(il, n, iMax, 'var(--mavi)')).join('')}<p class="hk-not">Toplam ${ilce.size} ilçede ${mek.length} mekân.</p></div>
        </div>
      </section>

      <section class="hk-bolum hk-iki"><div><h2>Kayıtlar nasıl düzenlendi?</h2>
        <p>Her mekân dört ayrı türde metinle anlatılır ve bunlar birbirine karışmaz:</p>
        <dl class="hk-tanim">
          <dt>Mekân hakkında</dt><dd>Yeri tanıtan bilgi: kim yaptırdı, ne zaman yapıldı, kimler yaşadı, bugün ne durumda.</dd>
          <dt>Kişi bilgisi</dt><dd>Kişinin kim olduğu: doğumu, mesleği, eserleri.</dd>
          <dt>Hikâye</dt><dd>O yerde yaşanmış bir olay ya da anlatı; çoğu zaman bir tarihi ve kendi fotoğrafları vardır.</dd>
          <dt>Fotoğraf altyazısı</dt><dd>Yalnız fotoğrafı anlatır; fotoğrafta görülen kişiler ayrıca etiketlenir ve fotoğraf o kişilerin sayfasında da görünür.</dd>
          <dt>Kategoriler</dt><dd>Her mekânın bir türü (ev, cami, tiyatro, han…) ve bilindiği kadarıyla yapının bugün ayakta olup olmadığı; hikâyelerin konuları; kişilerin meslekleri. Hepsi sabit listelerden seçilir, böylece aynı şey hep aynı adla anılır.</dd>
        </dl>
        <p>Fotoğraflar da ikiye ayrılır: <b>mekânın fotoğrafı</b> (${eski} arşiv, ${yeni} güncel) "o zaman / bugün" karşılaştırmasında kullanılır; <b>bir anın ya da olayın fotoğrafı</b> hikâyesinin altında görünür. Mekânlar birleştirildiğinde silinmez; eski adresler kalan mekâna yönlendirilir, böylece basılmış karekodlar hiç bozulmaz.</p></div>
        <div><h2>Kaynaklar ve lisanslar</h2>
        <ul class="hk-liste">
          <li><b>Hikâyeler, mekân bilgileri ve arşiv fotoğrafları</b> proje ekibinin derlediği kayıtlardan gelir; her hikâyenin altında kaynağı yazar.</li>
          <li><b>Kişi ve mekân özetlerinin bir kısmı</b> Türkçe Vikipedi'den alınır (${viki} kişi). Her özet, ekip tarafından doğru kişi ya da yer olduğu kontrol edildikten sonra yayımlanır; altında madde bağlantısı ve ${VIKI_LISANS} lisansı yazar.</li>
          <li><b>Harita altlığı</b> OpenFreeMap'tir; harita verisi © OpenStreetMap katkıcıları.</li>
          <li><b>Fotoğrafların</b> kaynak ve kullanım izni bilgileri kayıtlara işlendikçe her fotoğrafın altında gösterilecektir.</li>
        </ul>
        <h2 style="margin-top:28px">Katkıda bulunun</h2>
        <p>Bir mekânın bugünkü fotoğrafını göndermek, bir bilgiyi düzeltmek ya da bildiğiniz bir hikâyeyi eklemek isterseniz proje ekibine yazabilirsiniz. Her mekân sayfasındaki kalıcı adresi eklemeniz işimizi kolaylaştırır.</p></div>
      </section>
    </div>`;
  }

  // ================= YÖNLENDİRME =================
  function route(koru) {
    koru = koru === true; const y = window.scrollY;
    const h = decodeURIComponent(location.hash.slice(1)) || 'harita';
    $('#ust').classList.remove('acik'); Goruntuleyici.kapat(true); Karsilastir.kapat(true);
    const sek = h.split('-')[0];
    $$('.sekmeler a').forEach(a => a.toggleAttribute('aria-current', false));
    const akt = { harita: 'harita', mekan: 'mekanlar', kisi: 'kisiler', hikaye: 'hikayeler' }[sek] || sek;
    const a = $(`.sekmeler a[data-sekme="${akt}"]`); if (a) a.setAttribute('aria-current', 'page');
    miniTemizle();
    if (h === 'harita') { $('#sayfa').hidden = true; $('#sayfa').innerHTML = ''; Harita.goster(); Harita.kur(); document.title = 'Hafıza İstanbul'; return; }
    $('#harita-gorunum').hidden = true; const s = $('#sayfa'); s.hidden = false; if (!koru) window.scrollTo(0, 0);
    let html = '', title = '', mini = null;
    const slug = h.slice(h.indexOf('-') + 1);
    if (sek === 'mekan') { let m = S.ix.mekanSlug.get(slug);
      if (m && m.durum === 'arsiv' && m.yonlendir && S.ix.mekan.get(m.yonlendir)) { location.replace('#mekan-' + S.ix.mekan.get(m.yonlendir).slug); return; }
      if (m) { html = mekanSayfasi(m); title = m.ad;
        mini = [[{ m, n: '•', bu: true }], {}]; } }  // mekân sayfasının haritası yalnız mekânı gösterir; hikâyenin mekân rotası hikâye sayfasındadır
    else if (sek === 'hikaye') { const x = S.ix.hikayeSlug.get(slug); if (x) { html = hikayeSayfasi(x); title = x.baslik; const mk = S.hikayeMekanlari(x.id); mini = [mk.map((y, i) => ({ m: y, n: mk.length > 1 ? i + 1 : '•' })), { cizgi: true }]; } }
    else if (sek === 'kisi') { const k = S.ix.kisiSlug.get(slug); if (k) { html = kisiSayfasi(k); title = k.ad; mini = [S.kisiMekanlari(k.id).map((y, i) => ({ m: y.mekan, n: i + 1 })), { kare: true }]; } }
    else if (h === 'hikayeler') { html = hikayelerSayfasi(); title = 'Hikâyeler'; }
    else if (h === 'kisiler') { html = kisilerSayfasi(); title = 'Kişiler'; }
    else if (h === 'mekanlar') { html = mekanlarSayfasi(); title = 'Mekânlar'; }
    else if (h === 'album') { html = albumSayfasi(); title = 'Albüm'; }
    else if (h === 'hakkinda') { html = hakkindaSayfasi(); title = 'Hakkında'; }
    if (!html) { html = `<div class="sayfa"><h1>Bulunamadı</h1><p class="bos">Bu adreste bir kayıt yok. <a href="#harita">Haritaya dön</a></p></div>`; title = 'Bulunamadı'; }
    s.innerHTML = html + `<footer class="alt-cubuk"><span>Hafıza İstanbul · kent belleği haritası</span><a href="panel.html">İçerik paneli</a></footer>`;
    document.title = title + ' — Hafıza İstanbul';
    const mEl = $('#mini'); if (mEl && mini && mini[0].length) miniHarita(mEl, mini[0], mini[1]); else if (mEl) mEl.remove();
    const su = $('.sayfa-ust', s); if (su && (koru ? y > 90 : false)) su.classList.add('dar');
    baslikOlc();
    const zs = $('.al-zaman .al-serit', s); document.body.classList.toggle('zaman-duzeni', !!zs); if (zs) { zamanYukseklik(); onyilIsaretle(zs); }
    if (koru) { window.scrollTo(0, y); return; }
    const f = $('h1', s); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
  }
  // sayfa içi olaylar
  document.addEventListener('click', e => {
    const hm = e.target.closest('[data-haritada]'); if (hm) { e.preventDefault(); go('harita'); Harita.kur().then(() => Harita.mekanSec(hm.dataset.haritada, true)); return; }
    const kh = e.target.closest('[data-kisi-harita]'); if (kh) { e.preventDefault(); go('harita'); Harita.kur().then(() => Harita.kisiSec(kh.dataset.kisiHarita)); return; }
    if (!e.target.closest('#sayfa')) return;
    if (e.target.closest('#daha')) { const n = listeDurum.n; listeDurum.n += 24; route(true); odakla('.kart h3 a', n); return; }
    if (e.target.closest('#album-daha')) { const n = albumDurum.n; albumDurum.n += 60; route(true); odakla('.album .kare', n); return; }
    const mg = e.target.closest('[data-mgrup]'); if (mg) { const g = mg.dataset.mgrup, d = mekDurum;
      if (d.gruplar.has(g)) { d.gruplar.delete(g); S.turlerOf(g).forEach(t => d.turler.delete(t)); } else d.gruplar.add(g); route(true); return; }
    if (e.target.closest('[data-mgrup-temizle]')) { mekDurum.gruplar.clear(); mekDurum.turler.clear(); route(true); return; }
    const mt = e.target.closest('[data-mtur]'); if (mt) { const t = mt.dataset.mtur; mekDurum.turler.has(t) ? mekDurum.turler.delete(t) : mekDurum.turler.add(t); route(true); return; }
    const r = e.target.closest('[data-meslek]'); if (r) { const m = r.dataset.meslek; kisiDurum.meslekler.has(m) ? kisiDurum.meslekler.delete(m) : kisiDurum.meslekler.add(m); route(true); return; }
    if (e.target.closest('[data-meslek-temizle]')) { kisiDurum.meslekler.clear(); route(true); return; }
    const kp = e.target.closest('[data-meslek-kip]'); if (kp) { kisiDurum.hepsi = kp.dataset.meslekKip === 'hepsi'; route(true); return; }
    // albüm
    const ad = albumDurum, alyen = () => { ad.n = 60; route(true); };
    const adn = e.target.closest('[data-al-donem]'); if (adn) { ad.donem = adn.dataset.alDonem; return alyen(); }
    if (e.target.closest('[data-al-tarih-kaldir]')) { ad.tarih = ''; return alyen(); }
    const adz = e.target.closest('[data-al-duzen]'); if (adz) { ad.duzen = adz.dataset.alDuzen; alyen();
      if (ad.duzen === 'zaman') window.scrollTo(0, 0);
      return; }
    if (e.target.closest('[data-al-temizle]')) { Object.assign(ad, { donem: '', grup: '', konu: '', ilce: '', gtur: '', tarih: '' }); return alyen(); }
    const agt = e.target.closest('[data-al-gtur-hepsi]'); if (agt) { ad.gtur = agt.dataset.alGturHepsi; ad.duzen = 'izgara'; ad.n = 60; route(); return; }
    const ah = e.target.closest('[data-al-hepsi]'); if (ah) { ad.grup = ah.dataset.alHepsi; ad.duzen = 'izgara'; ad.n = 60; route(); return; }
    const ak = e.target.closest('[data-al-kaydir]'); if (ak) { const sr = ak.parentElement.querySelector('.al-serit'); sr.scrollBy({ left: +ak.dataset.alKaydir * sr.clientWidth * .8, behavior: 'smooth' }); return; }
    const ao = e.target.closest('[data-al-onyil]'); if (ao) { const h = document.getElementById(ao.dataset.alOnyil); if (h) { const sr = h.closest('.al-serit'); sr.scrollTo({ left: h.offsetLeft - 8, behavior: 'smooth' }); } return; }
  });
  // harita panelleri kaydırılınca yapışan başlığa ince bir alt çizgi
  document.addEventListener('scroll', e => { const p = e.target; if (!(p instanceof Element) || !p.matches('.panel')) return; const b = $('.panel-baslik', p); if (b) b.classList.toggle('yapisti', p.scrollTop > 4); }, true);
  // albüm, zamana göre: fare tekerleği şeridi yana kaydırır; şeridin başına/sonuna gelince sayfa kaymaya devam eder
  document.addEventListener('wheel', e => {
    const sr = e.target.closest && e.target.closest('.al-zaman .al-serit'); if (!sr || e.ctrlKey) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return;
    const bas = sr.scrollLeft <= 0, son = sr.scrollLeft + sr.clientWidth >= sr.scrollWidth - 1;
    if ((d < 0 && bas) || (d > 0 && son)) return;
    e.preventDefault(); sr.scrollLeft += d * (e.deltaMode === 1 ? 40 : 1.2);
  }, { passive: false });
  // şerit yüksekliği: sayfa dikeyde ekrana sığar, aşağı kaydırmak gerekmez (alt çubuk bu düzende gizli).
  // Yazı tipleri (Google Fonts, display=swap) sonradan yüklenince başlıkların boyu değişir ve şerit aşağı kayar;
  // bu yüzden hesap yazı tipleri yüklenince ve üstteki alanın boyu her değiştiğinde yinelenir. Ölçü sonrası hâlâ
  // taşma varsa (tarayıcı yakınlaştırması, kaydırma çubuğu vb.) taşan kadar kısaltılır.
  function zamanYukseklik() {
    const z = $('.al-zaman'), sr = z && $('.al-serit', z); if (!sr) return;
    const ekran = document.documentElement.clientHeight || window.innerHeight;
    const ust = window.scrollY + sr.getBoundingClientRect().top;
    let h = Math.max(260, Math.floor(ekran - ust - 18));
    z.style.setProperty('--h', h + 'px');
    const tasma = Math.ceil(document.documentElement.scrollHeight - ekran);
    if (tasma > 0 && h > 260) { h = Math.max(260, h - tasma); z.style.setProperty('--h', h + 'px'); }
    if (!z._gozcu && window.ResizeObserver) {
      let kare = 0; z._gozcu = new ResizeObserver(() => { cancelAnimationFrame(kare); kare = requestAnimationFrame(zamanYukseklik); });
      [$('.albumu .sayfa-ust'), $('.al-onyillar', z), $('#ust')].filter(Boolean).forEach(el => z._gozcu.observe(el));
    }
  }
  if (document.fonts) { document.fonts.ready.then(() => zamanYukseklik()); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => zamanYukseklik()); }
  window.addEventListener('resize', () => zamanYukseklik());
  // albüm, zamana göre: şerit kaydıkça görünen on yılın düğmesi seçili olur, düğme şeridi de onu görünür tutar
  let onyilKare = 0;
  document.addEventListener('scroll', e => {
    const sr = e.target; if (!(sr instanceof Element) || !sr.matches('.al-zaman .al-serit')) return;
    cancelAnimationFrame(onyilKare); onyilKare = requestAnimationFrame(() => onyilIsaretle(sr));
  }, true);
  function onyilIsaretle(sr) {
    const isaretler = $$('.al-isaret', sr); if (!isaretler.length) return;
    const esik = sr.scrollLeft + sr.clientWidth * .25;
    let akt = isaretler[0]; isaretler.forEach(x => { if (x.offsetLeft <= esik) akt = x; });
    if (sr.scrollLeft + sr.clientWidth >= sr.scrollWidth - 4) akt = isaretler[isaretler.length - 1];
    const dugme = $(`[data-al-onyil="${akt.id}"]`); if (!dugme || dugme.hasAttribute('aria-current')) return;
    $$('[data-al-onyil]').forEach(x => x.toggleAttribute('aria-current', x === dugme));
    const serit = dugme.parentElement, sol = dugme.offsetLeft - serit.offsetLeft;
    if (sol < serit.scrollLeft || sol + dugme.offsetWidth > serit.scrollLeft + serit.clientWidth) serit.scrollTo({ left: sol - serit.clientWidth / 2 + dugme.offsetWidth / 2, behavior: 'smooth' });
  }
  function odakla(sec, i) { const el = $$(sec)[i]; if (el) el.focus({ preventScroll: true }); }
  document.addEventListener('change', e => {
    if (!e.target.closest('#sayfa')) return;
    if (e.target.name === 'donem') { e.target.checked ? listeDurum.donem.add(e.target.value) : listeDurum.donem.delete(e.target.value); listeDurum.n = 24; route(true); }
    if (e.target.name === 'konu') { e.target.checked ? listeDurum.konu.add(e.target.value) : listeDurum.konu.delete(e.target.value); listeDurum.n = 24; route(true); }
    if (e.target.id === 's-ilce') { listeDurum.ilce = e.target.value; listeDurum.n = 24; route(true); }
    if (e.target.id === 's-foto') { listeDurum.foto = e.target.checked; route(true); }
    if (e.target.id === 'm-ilce') { mekDurum.ilce = e.target.value; route(true); }
    if (e.target.id === 'm-yapi') { mekDurum.yapi = e.target.value; route(true); }
    if (e.target.dataset.alSec) { albumDurum[e.target.dataset.alSec] = e.target.value; albumDurum.n = 60; route(true); }
  });
  let yazT = null;
  document.addEventListener('input', e => {
    const id = e.target.id; if (!['s-q', 'k-q', 'm-q'].includes(id)) return;
    clearTimeout(yazT); yazT = setTimeout(() => {
      if (id === 's-q') listeDurum.q = e.target.value; if (id === 'k-q') kisiDurum.q = e.target.value; if (id === 'm-q') mekDurum.q = e.target.value;
      const pos = e.target.selectionStart; route(true); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } }
    }, 250);
  });

  // ---------- yapışkan sayfa başlığı ----------
  function baslikOlc() { const b = $('#sayfa .sayfa-ust'); document.documentElement.style.setProperty('--baslik-h', (b ? b.offsetHeight : 0) + 'px'); }
  function baslikDurum() {
    const b = $('#sayfa .sayfa-ust'); if (!b || $('#sayfa').hidden) return;
    const dar = b.classList.contains('dar');
    if (!dar && window.scrollY > 90) { b.classList.add('dar'); baslikOlc(); }
    else if (dar && window.scrollY < 20) { b.classList.remove('dar'); baslikOlc(); }
  }
  window.addEventListener('scroll', baslikDurum, { passive: true });
  window.addEventListener('resize', baslikOlc);

  // ================= BAŞLAT =================
  (async function () {
    ustCubuk();
    try { await S.load('site'); }
    catch (e) { $('#sayfa').hidden = false; $('#sayfa').innerHTML = `<div class="sayfa"><h1>Veri yüklenemedi</h1><p class="bos">${esc(e.message)}</p></div>`; return; }
    window.addEventListener('hashchange', route);
    route();
  })();
  window.HafizaSite = { Harita };
})();
