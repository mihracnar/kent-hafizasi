/* Hafıza İstanbul — içerik yönetim paneli.
 * Adresler: #hikayeler, #hikaye-h-0264, #yeni-hikaye, #mekanlar, #mekan-m-0251, #yeni-mekan, #kisiler, #kisi-k-022, #gorseller, #kontrol, #ayarlar */
(function () {
  'use strict';
  const S = window.HafizaStore, esc = S.esc, fold = S.fold;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const P = {
    kitap: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    kisi: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', gorsel: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    uyari: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>', ayar: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',
    ara: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', arti: '<path d="M12 5v14M5 12h14"/>', kapat: '<path d="M6 6l12 12M18 6L6 18"/>', yukari: '<path d="M6 15l6-6 6 6"/>', asagi: '<path d="M6 9l6 6 6-6"/>',
    tut: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    yukle: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>', goz: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', kilit: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    birlestir: '<path d="M6 3v6a6 6 0 0 0 6 6 6 6 0 0 1 6 6M18 3v6"/>', tamam: '<path d="M5 12l5 5 9-10"/>', kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', sheet: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    sol: '<path d="M15 6l-6 6 6 6"/>', sag: '<path d="M9 6l6 6-6 6"/>',
  };
  const ik = (n, s) => `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true"${s ? ` style="width:${s}px;height:${s}px"` : ''}>${P[n]}</svg>`;
  const kopya = o => JSON.parse(JSON.stringify(o));
  const DONEMLER = ['1900 Öncesi', '1901 - 1950', '1951 - 1990', '1991 Sonrası'];
  const bos = v => !String(v == null ? '' : v).trim();
  const metreYaz = d => d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km';
  function bildir(t, hata) { const b = document.createElement('div'); b.className = 'bildirim' + (hata ? ' hata' : ''); b.setAttribute('role', 'status'); b.textContent = t; document.body.appendChild(b); setTimeout(() => b.remove(), 3200); }
  function pencere(baslik, govde, dugmeler) {
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'perde';
      d.innerHTML = `<div class="pencere" role="dialog" aria-modal="true" aria-labelledby="pb"><h2 id="pb" style="font-size:18px">${baslik}</h2><div>${govde}</div><div class="satir" style="justify-content:flex-end">${dugmeler.map((b, i) => `<button type="button" class="d ${b.cls || ''}" data-i="${i}">${b.t}</button>`).join('')}</div></div>`;
      document.body.appendChild(d);
      const kapat = v => { d.remove(); res(v); };
      d.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) kapat({ i: +b.dataset.i, el: d }); else if (e.target === d) kapat({ i: -1 }); });
      d.addEventListener('keydown', e => { if (e.key === 'Escape') kapat({ i: -1 }); });
      const f = d.querySelector('input,select,textarea,button'); f && f.focus();
      // değerleri kapanmadan önce oku
      d.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { const v = {}; $$('[name]', d).forEach(x => v[x.name] = x.type === 'checkbox' ? x.checked : x.value); res({ i: +b.dataset.i, v }); } }, true);
    });
  }
  function img(g, w) { return g ? `<img src="${esc(S.imgUrl(g, w || 400))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''; }

  // ---------- kontrol kuyruğu hesapları ----------
  function kontrol() {
    const t = S.t, ix = S.ix;
    const aktifMek = t.mekanlar.filter(m => m.durum !== 'arsiv');
    const ayri = (a, b) => (a.ayri || '').split(',').includes(b.id) || (b.ayri || '').split(',').includes(a.id);
    const onek = s => fold(s).split(/\s+/).slice(0, 2).join(' ');
    // olası tekrar: ilk iki kelimesi aynı ve 400 m içinde, ya da bugünkü adı aynı ve 600 m içinde, ya da aynı koordinat
    const coords = aktifMek.filter(m => m.enlem != null);
    const ciftler = [];
    for (let i = 0; i < coords.length; i++) for (let j = i + 1; j < coords.length; j++) {
      const a = coords[i], b = coords[j];
      if (Math.abs(a.enlem - b.enlem) > 0.006 || Math.abs(a.boylam - b.boylam) > 0.008) continue;
      const d = S.dist(a, b); let neden = '';
      if (d < 1 && fold(a.ad) !== fold(b.ad)) neden = 'aynı koordinat';
      else if (d < 400 && onek(a.ad).split(' ').length > 1 && onek(a.ad) === onek(b.ad)) neden = 'adın başı aynı';
      else if (d < 600 && a.bugunku_ad && fold(a.bugunku_ad.split(' · ')[0]) === fold(b.bugunku_ad.split(' · ')[0]) && a.bugunku_ad.length > 3) neden = 'bugünkü adı aynı';
      if (neden && !ayri(a, b)) ciftler.push({ a, b, d, neden });
    }
    // çiftleri gruplara topla
    const kok = new Map(); const bul = x => { while (kok.get(x) && kok.get(x) !== x) x = kok.get(x); return x; };
    ciftler.forEach(c => { kok.set(c.a.id, bul(c.a.id)); kok.set(c.b.id, bul(c.b.id)); kok.set(bul(c.b.id), bul(c.a.id)); });
    const gruplar = new Map(); ciftler.forEach(c => { const r = bul(c.a.id); if (!gruplar.has(r)) gruplar.set(r, { ids: new Set(), ciftler: [] }); const g = gruplar.get(r); g.ids.add(c.a.id); g.ids.add(c.b.id); g.ciftler.push(c); });
    const tekrar = [...gruplar.values()].map(g => ({ mekanlar: [...g.ids].map(id => ix.mekan.get(id)), ciftler: g.ciftler, dmax: Math.max(...g.ciftler.map(c => c.d)), neden: [...new Set(g.ciftler.map(c => c.neden))].join(', ') }))
      .sort((p, q) => p.dmax - q.dmax);
    const yayinH = t.hikayeler.filter(h => h.durum !== 'arsiv');
    return {
      tekrar, ciftSayisi: ciftler.length,
      kaynak: yayinH.filter(h => bos(h.kaynak)),
      gorselsiz: yayinH.filter(h => !S.hikayeGorselleri(h.id).length && !(S.hikayeMekanlari(h.id).some(m => S.mekanGorselleri(m.id).length))),
      metin: yayinH.filter(h => bos(h.metin)),
      bugun: aktifMek.filter(m => bos(m.bugunku_ad) && S.mekanIcerikli(m)),
      koordinat: aktifMek.filter(m => m.enlem == null && S.mekanIcerikli(m)),
      oneri: t.hikaye_kisi.filter(x => x.onay === 'öneri' && ix.hikaye.has(x.hikaye_id) && ix.kisi.has(x.kisi_id)),
      oneriMk: (t.mekan_kisi || []).filter(x => x.onay === 'öneri' && ix.mekan.has(x.mekan_id) && ix.kisi.has(x.kisi_id)),
      gorselBag: t.gorseller.filter(g => !g.drive_id && !g.site_url),
      vikipedi: [...t.kisiler.map(r => ['kisiler', r]), ...aktifMek.map(r => ['mekanlar', r])].filter(([, r]) => r.vikipedi_onay === 'öneri'),
    };
  }
  let K = null; const kontrolTaze = () => (K = kontrol());

  // ---------- Vikipedi önerileri (tools/vikipedi_cek.py yazar; burada onaylanır) ----------
  const VIKI_ALAN = ['vikipedi_onay', 'vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet', 'vikipedi_neden'];
  function vikiCip(r) { const o = r.vikipedi_onay; return o === 'onaylı' ? '<span class="cip yesil">Onaylı</span>' : o === 'öneri' ? '<span class="cip oneri">Öneri</span>' : o === 'reddedildi' ? '<span class="cip gri">Reddedildi</span>' : ''; }
  function vikiBolum(r) {
    const var_ = (r.vikipedi_ozet || '').trim();
    return `<section class="kart" id="viki"><div class="satir"><h2>Vikipedi</h2>${vikiCip(r)}<span class="soluk sag">sitede yalnız onaylı özet, Vikipedi atfıyla görünür</span></div>
      ${var_ ? `<div><a href="${esc(r.vikipedi_url)}" target="_blank" rel="noopener"><b>${esc(r.vikipedi_baslik)}</b></a>${r.wikidata ? ` <span class="mono soluk">${esc(r.wikidata)}</span>` : ''}</div>
        ${r.vikipedi_neden ? `<div class="soluk" style="font-size:13px">Neden önerildi: ${esc(r.vikipedi_neden)}</div>` : ''}
        <p style="margin:0;line-height:1.55;font-size:14px">${esc(r.vikipedi_ozet)}</p>
        <div class="satir">${r.vikipedi_onay !== 'onaylı' ? '<button type="button" class="d kucuk ana-d" data-viki="onaylı">Doğru madde, onayla</button>' : ''}${r.vikipedi_onay !== 'reddedildi' ? '<button type="button" class="d kucuk duz" data-viki="reddedildi">Yanlış madde</button>' : ''}<button type="button" class="d kucuk duz" data-viki="temizle">Temizle</button></div>`
        : `<p class="soluk" style="margin:0">${r.vikipedi_neden ? esc(r.vikipedi_neden) : 'Henüz öneri yok. tools/vikipedi_cek.py çalıştırılınca burada görünür.'}</p>`}
      <div class="satir"><div class="alan" style="flex:1"><label for="viki-link">Doğru maddeyi elle ver</label><input id="viki-link" placeholder="https://tr.wikipedia.org/wiki/…"></div><button type="button" class="d kucuk" id="viki-getir">Getir</button></div></section>`;
  }
  // tr.wikipedia özetini tarayıcıdan getirir (ağ izinliyse)
  async function vikiGetir(url) {
    const m = String(url).match(/tr\.(?:m\.)?wikipedia\.org\/wiki\/([^?#]+)/); if (!m) throw new Error('tr.wikipedia.org/wiki/… bağlantısı verin');
    const r = await fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/' + m[1]); if (!r.ok) throw new Error('madde bulunamadı');
    const v = await r.json(); if (v.type === 'disambiguation') throw new Error('anlam ayrımı sayfası; kişinin/yerin kendi maddesini verin');
    return { vikipedi_baslik: v.title, vikipedi_url: (v.content_urls && v.content_urls.desktop && v.content_urls.desktop.page) || url, wikidata: v.wikibase_item || '', vikipedi_ozet: (v.extract || '').trim(), vikipedi_onay: 'onaylı', vikipedi_neden: 'elle verildi' };
  }
  function vikiOlaylar(r, uygula) {
    $$('[data-viki]').forEach(b => b.onclick = () => {
      const v = b.dataset.viki;
      uygula(v === 'temizle' ? Object.fromEntries(VIKI_ALAN.map(k => [k, ''])) : { vikipedi_onay: v });
    });
    const g = $('#viki-getir'); if (g) g.onclick = async () => {
      try { uygula(await vikiGetir($('#viki-link').value.trim())); bildir('Vikipedi özeti alındı'); }
      catch (e) { bildir('Getirilemedi: ' + e.message + (e instanceof TypeError ? ' (bu sayfadan Vikipedi\'ye erişilemiyor olabilir)' : ''), true); }
    };
  }

  // ---------- kabuk ----------
  function kabuk(aktif, kirinti, govde, eylemler) {
    const say = { hikayeler: S.t.hikayeler.length, mekanlar: S.t.mekanlar.filter(m => m.durum !== 'arsiv').length, kisiler: S.t.kisiler.length, gorseller: S.t.gorseller.length };
    const kk = K || kontrolTaze();
    const kSay = kk.tekrar.length + kk.kaynak.length + kk.bugun.length + kk.gorselsiz.length + kk.metin.length + kk.koordinat.length + kk.gorselBag.length + (kk.oneri.length || kk.oneriMk.length ? 1 : 0) + (kk.vikipedi.length ? 1 : 0);
    const nav = [['hikayeler', 'Hikâyeler', 'kitap', say.hikayeler], ['mekanlar', 'Mekânlar', 'pin', say.mekanlar], ['kisiler', 'Kişiler', 'kisi', say.kisiler], ['gorseller', 'Görseller', 'gorsel', say.gorseller], ['kontrol', 'Kontrol kuyruğu', 'uyari', kSay]];
    const b = S.backend.kind;
    const bekleyen = b === 'sheets' ? (S._sheetsDirty || 0) : S.unpublished();
    document.body.innerHTML = `<div class="duzen"><aside class="yan"><div class="marka"><b>Hafıza İstanbul</b><span>İçerik yönetimi</span></div>
      <nav aria-label="Panel menüsü">${nav.map(([k, l, i, n]) => `<a href="#${k}" ${aktif === k ? 'aria-current="page"' : ''}>${ik(i, 18)}<span>${l}</span><i class="${k === 'kontrol' ? 'uyari' : ''}">${n}</i></a>`).join('')}
      <a href="#ayarlar" ${aktif === 'ayarlar' ? 'aria-current="page"' : ''}>${ik('ayar', 18)}<span>Sheets ve ayarlar</span></a></nav>
      <div class="baglanti"><b><i class="${b === 'sheets' ? '' : 'yerel'}"></i>${esc(S.backend.label)}</b>
        <span>${b === 'sheets' ? 'Her kayıt doğrudan tabloya yazılır.' : 'Google Sheets bağlantısı kurulunca kayıtlar tabloya yazılır.'}</span>
        <a href="index.html">Siteyi aç</a></div></aside>
      <div class="ana"><header class="ust"><nav aria-label="Konum">${kirinti}</nav><div class="sag">${eylemler || ''}
        <span class="bekleyen">${bekleyen ? bekleyen + ' değişiklik yayında değil' : 'Her şey yayında'}</span>
        <button type="button" class="d koyu" id="yayinla" ${bekleyen ? '' : 'disabled'}>${ik('yukle', 16)}Siteyi yayınla</button></div></header>
      <main class="icerik" id="icerik">${govde}</main></div></div>`;
    $('#yayinla').onclick = yayinla;
  }
  async function yayinla() {
    const n = S.backend.kind === 'sheets' ? (S._sheetsDirty || 0) : S.unpublished();
    const r = await pencere('Siteyi yayınla', `<p style="margin:0;line-height:1.5">${n} değişiklik sitede görünür hâle gelecek.${S.backend.kind === 'sheets' ? ' Site verisi Sheets\'ten yeniden üretilir; birkaç dakika sürebilir.' : ' Önizlemede site sekmesi yenilendiğinde değişiklikleri görürsünüz.'}</p>`, [{ t: 'Vazgeç' }, { t: 'Yayınla', cls: 'koyu' }]);
    if (r.i !== 1) return;
    try { await S.publish(); bildir('Yayınlandı'); kontrolTaze(); route(); } catch (e) { bildir('Yayınlanamadı: ' + e.message, true); }
  }

  // ---------- genel liste ----------
  const liste = { hikayeler: { f: 'tumu', q: '', s: 0, sec: new Set() }, mekanlar: { f: 'tumu', q: '', s: 0 }, kisiler: { f: 'tumu', q: '', s: 0 } };
  const SAYFA = 50;
  function filtreHtml(defs, aktif) { return defs.map(([k, l, n]) => `<button type="button" class="filtre" data-f="${k}" aria-pressed="${aktif === k}">${l}${n != null ? ` <small>${n}</small>` : ''}</button>`).join(''); }
  function sayfalama(n, s) { return `<div class="sayfalama"><span>${n ? `${s * SAYFA + 1}–${Math.min(n, (s + 1) * SAYFA)} / ${n}` : '0 kayıt'}</span><div class="satir"><button type="button" class="d kucuk" data-sayfa="-1" ${s ? '' : 'disabled'} aria-label="Önceki sayfa">${ik('sol', 16)}</button><button type="button" class="d kucuk" data-sayfa="1" ${(s + 1) * SAYFA < n ? '' : 'disabled'} aria-label="Sonraki sayfa">${ik('sag', 16)}</button></div></div>`; }
  function aramaHtml(id, q, ph) { return `<div class="arama">${ik('ara', 16)}<label class="sr" for="${id}">${ph}</label><input id="${id}" type="search" placeholder="${ph}" value="${esc(q)}"></div>`; }
  function durumCip(r) { return r.durum === 'taslak' ? '<span class="cip gri">Taslak</span>' : r.durum === 'arsiv' ? '<span class="cip gri">Arşiv</span>' : '<span class="cip yesil">Yayında</span>'; }

  function hikayelerSayfasi() {
    const L = liste.hikayeler; K = K || kontrolTaze();
    const oneriH = new Set(K.oneri.map(x => x.hikaye_id));
    const kaynakH = new Set(K.kaynak.map(h => h.id)), gorselsizH = new Set(K.gorselsiz.map(h => h.id));
    const ayniBaslik = h => { const m = S.anaMekan(h.id); return m && m.ad === h.baslik; };
    const F = { tumu: () => true, kaynak: h => kaynakH.has(h.id), gorselsiz: h => gorselsizH.has(h.id), metin: h => bos(h.metin), oneri: h => oneriH.has(h.id), taslak: h => h.durum === 'taslak', baslik: ayniBaslik, donem: h => !h.donem };
    const tum = S.t.hikayeler;
    const uyan = tum.filter(F[L.f] || F.tumu).filter(h => !L.q || fold(h.baslik + ' ' + h.metin + ' ' + h.id).includes(fold(L.q)));
    const sayfa = uyan.slice(L.s * SAYFA, (L.s + 1) * SAYFA);
    const satir = h => {
      const mek = S.hikayeMekanlari(h.id), ks = S.hikayeKisileri(h.id, true), on = ks.filter(k => k._onay === 'öneri').length, ok = ks.length - on;
      return `<tr class="${L.sec.has(h.id) ? 'secili' : ''}"><td><input type="checkbox" data-sec="${h.id}" ${L.sec.has(h.id) ? 'checked' : ''} aria-label="${esc(h.baslik)} seç" style="width:16px;height:16px"></td>
        <td><a class="baslik" href="#hikaye-${h.id.toLowerCase()}">${esc(h.baslik)}</a><div class="mono soluk">${h.id}</div></td>
        <td>${mek[0] ? `<span class="mekan-cip">${ik('pin', 12)}${esc(mek[0].ad)}</span>${mek.length > 1 ? ` <span class="soluk">+${mek.length - 1}</span>` : ''}` : '<span class="cip kirmizi">Mekânsız</span>'}</td>
        <td>${ok ? `<span class="sayi">${ok}</span>` : '<span class="soluk">—</span>'} ${on ? `<span class="cip oneri">${on} öneri</span>` : ''}</td>
        <td class="soluk">${esc(h.tema)}</td><td class="sayi">${esc(h.yil || '—')}</td><td class="sayi">${S.hikayeGorselleri(h.id).length}</td>
        <td>${durumCip(h)} ${bos(h.kaynak) ? '<span class="cip kirmizi">Kaynak eksik</span>' : ''}</td></tr>`;
    };
    kabuk('hikayeler', '<b>Hikâyeler</b>', `
      <div class="satir"><h1>Hikâyeler</h1><span class="soluk">${tum.length} kayıt</span><div class="sag">${aramaHtml('l-q', L.q, 'Başlık, metin, kimlik ara')}<a class="d ana-d" href="#yeni-hikaye">${ik('arti', 16)}Yeni hikâye</a></div></div>
      <div class="filtreler">${filtreHtml([['tumu', 'Tümü', tum.length], ['kaynak', 'Kaynak eksik', K.kaynak.length], ['gorselsiz', 'Görselsiz', K.gorselsiz.length], ['metin', 'Metni boş', K.metin.length], ['oneri', 'Kişi önerisi bekliyor', oneriH.size], ['baslik', 'Başlığı mekân adıyla aynı', tum.filter(ayniBaslik).length], ['donem', 'Dönemi boş', tum.filter(h => !h.donem).length], ['taslak', 'Taslak', tum.filter(h => h.durum === 'taslak').length]], L.f)}</div>
      ${L.sec.size ? `<div class="toplu"><b>${L.sec.size} kayıt seçili</b><label class="sr" for="toplu-tema">Tema</label><select id="toplu-tema" class="girdi" style="width:auto;height:30px;font-size:12px"><option value="">Temayı değiştir…</option>${S.t.temalar.map(t => `<option>${esc(t.ad)}</option>`).join('')}</select>
        <button type="button" class="d kucuk" data-toplu="taslak">Taslağa al</button><button type="button" class="d kucuk" data-toplu="yayinda">Yayına al</button><button type="button" class="d kucuk duz" data-toplu="temizle">Seçimi kaldır</button></div>` : ''}
      <div class="tablo-kap"><table class="tablo"><thead><tr><th><input type="checkbox" id="hepsi" aria-label="Bu sayfadakileri seç" style="width:16px;height:16px"></th><th>Başlık</th><th>Mekânlar</th><th>Kişiler</th><th>Tema</th><th>Yıl</th><th>Görsel</th><th>Durum</th></tr></thead>
      <tbody>${sayfa.map(satir).join('') || '<tr><td colspan="8" class="bos">Kayıt yok</td></tr>'}</tbody></table></div>${sayfalama(uyan.length, L.s)}`);
    listeOlaylari(L, () => hikayelerSayfasi());
    $('#hepsi').onchange = e => { sayfa.forEach(h => e.target.checked ? L.sec.add(h.id) : L.sec.delete(h.id)); hikayelerSayfasi(); };
    $$('[data-sec]').forEach(c => c.onchange = () => { c.checked ? L.sec.add(c.dataset.sec) : L.sec.delete(c.dataset.sec); hikayelerSayfasi(); });
    const tt = $('#toplu-tema'); if (tt) tt.onchange = async () => { if (!tt.value) return; for (const id of L.sec) await S.save('hikayeler', Object.assign(kopya(S.ix.hikaye.get(id)), { tema: tt.value })); bildir(L.sec.size + ' hikâyenin teması değişti'); L.sec.clear(); kontrolTaze(); hikayelerSayfasi(); };
    $$('[data-toplu]').forEach(b => b.onclick = async () => {
      const v = b.dataset.toplu; if (v === 'temizle') { L.sec.clear(); return hikayelerSayfasi(); }
      for (const id of L.sec) await S.save('hikayeler', Object.assign(kopya(S.ix.hikaye.get(id)), { durum: v }));
      bildir(L.sec.size + ' hikâye güncellendi'); L.sec.clear(); kontrolTaze(); hikayelerSayfasi();
    });
  }
  function listeOlaylari(L, yeniden) {
    $$('[data-f]').forEach(b => b.onclick = () => { L.f = b.dataset.f; L.s = 0; yeniden(); });
    $$('[data-sayfa]').forEach(b => b.onclick = () => { L.s += +b.dataset.sayfa; yeniden(); window.scrollTo(0, 0); });
    const q = $('#l-q'); let tm; if (q) q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { L.q = q.value; L.s = 0; const p = q.selectionStart; yeniden(); const n = $('#l-q'); n.focus(); n.setSelectionRange(p, p); }, 250); };
  }

  function mekanlarSayfasi() {
    const L = liste.mekanlar;
    const tum = S.t.mekanlar;
    const F = { tumu: m => m.durum !== 'arsiv', koordinat: m => m.enlem == null && m.durum !== 'arsiv', bugun: m => bos(m.bugunku_ad) && m.durum !== 'arsiv', bugunfoto: m => m.durum !== 'arsiv' && !S.mekanGorselleri(m.id, 'bugün').length, karekod: m => m.karekod_basildi === 'evet', arsiv: m => m.durum === 'arsiv', hikayesiz: m => m.durum !== 'arsiv' && !S.mekanHikayeleri(m.id).length, bilgili: m => m.durum !== 'arsiv' && !!(m.aciklama || '').trim(), bilgisiz: m => m.durum !== 'arsiv' && !(m.aciklama || '').trim() && !S.mekanHikayeleri(m.id).length };
    const uyan = tum.filter(F[L.f] || F.tumu).filter(m => !L.q || fold(m.ad + ' ' + m.bugunku_ad + ' ' + m.ilce + ' ' + m.id).includes(fold(L.q)));
    const sayfa = uyan.slice(L.s * SAYFA, (L.s + 1) * SAYFA);
    const n = k => tum.filter(F[k]).length;
    kabuk('mekanlar', '<b>Mekânlar</b>', `
      <div class="satir"><h1>Mekânlar</h1><span class="soluk">${n('tumu')} mekân</span><div class="sag">${aramaHtml('l-q', L.q, 'Ad, adres, ilçe ara')}<a class="d ana-d" href="#yeni-mekan">${ik('arti', 16)}Yeni mekân</a></div></div>
      <div class="filtreler">${filtreHtml([['tumu', 'Tümü', n('tumu')], ['koordinat', 'Koordinatsız', n('koordinat')], ['bugun', 'Bugünkü adı boş', n('bugun')], ['bugunfoto', 'Bugünkü fotoğrafı yok', n('bugunfoto')], ['bilgili', 'Genel bilgisi var', n('bilgili')], ['hikayesiz', 'Hikâyesiz', n('hikayesiz')], ['bilgisiz', 'Bilgisi de hikâyesi de yok', n('bilgisiz')], ['karekod', 'Karekodu basıldı', n('karekod')], ['arsiv', 'Arşiv', n('arsiv')]], L.f)}</div>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>Mekân</th><th>İlçe</th><th>Genel bilgi</th><th>Hikâye</th><th>Görsel (o zaman / bugün)</th><th>Koordinat</th><th>Durum</th></tr></thead><tbody>
      ${sayfa.map(m => `<tr><td></td><td><a class="baslik" href="#mekan-${m.id.toLowerCase()}">${esc(m.ad)}</a><div class="soluk" style="font-size:12px">${esc(m.bugunku_ad || '')}</div></td><td>${esc(m.ilce || '—')}</td>
        <td>${(m.aciklama || '').trim() ? '<span class="cip yesil">Var</span>' : '<span class="soluk">—</span>'}</td><td class="sayi">${S.mekanHikayeleri(m.id).length}</td><td class="sayi">${S.mekanGorselleri(m.id, 'o zaman').length} / ${S.mekanGorselleri(m.id, 'bugün').length}</td>
        <td>${m.enlem != null ? `<span class="mono soluk">${(+m.enlem).toFixed(4)}, ${(+m.boylam).toFixed(4)}</span>` : '<span class="cip kirmizi">Yok</span>'}</td>
        <td>${durumCip(m)} ${m.karekod_basildi === 'evet' ? `<span class="cip gri">${ik('kilit', 12)}Karekod</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="bos">Kayıt yok</td></tr>'}
      </tbody></table></div>${sayfalama(uyan.length, L.s)}`);
    listeOlaylari(L, () => mekanlarSayfasi());
  }

  function kisilerSayfasi() {
    const L = liste.kisiler;
    const tum = S.t.kisiler;
    const onSay = k => S.t.hikaye_kisi.filter(x => x.kisi_id === k.id && x.onay === 'öneri').length + S.t.mekan_kisi.filter(x => x.kisi_id === k.id && x.onay === 'öneri').length;
    const F = { tumu: () => true, oneri: k => onSay(k) > 0, bilgi: k => bos(k.kisa_bilgi) && bos(k.yasam), hikayesiz: k => !S.kisiMekanlari(k.id).length };
    const uyan = tum.filter(F[L.f] || F.tumu).filter(k => !L.q || fold(k.ad + ' ' + k.roller).includes(fold(L.q))).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    const sayfa = uyan.slice(L.s * SAYFA, (L.s + 1) * SAYFA);
    kabuk('kisiler', '<b>Kişiler</b>', `
      <div class="satir"><h1>Kişiler</h1><span class="soluk">${tum.length} kişi</span><div class="sag">${aramaHtml('l-q', L.q, 'Kişi ara')}<a class="d ana-d" href="#yeni-kisi">${ik('arti', 16)}Yeni kişi</a></div></div>
      <div class="filtreler">${filtreHtml([['tumu', 'Tümü', tum.length], ['oneri', 'Öneri bekleyen', tum.filter(F.oneri).length], ['bilgi', 'Yaşam ve kısa bilgi boş', tum.filter(F.bilgi).length], ['hikayesiz', 'Onaylı mekânı ya da hikâyesi yok', tum.filter(F.hikayesiz).length]], L.f)}</div>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>Kişi</th><th>Roller</th><th>Hikâye</th><th>Mekân</th><th>Öneri</th></tr></thead><tbody>
      ${sayfa.map(k => { const o = onSay(k); return `<tr><td></td><td><a class="baslik" href="#kisi-${k.id.toLowerCase()}">${esc(k.ad)}</a><div class="mono soluk">${k.id}</div></td><td class="soluk">${esc(k.roller || '—')}</td>
        <td class="sayi">${S.kisiHikayeleri(k.id).length}</td><td class="sayi">${S.kisiMekanlari(k.id).length}</td><td>${o ? `<span class="cip oneri">${o} öneri</span>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="bos">Kayıt yok</td></tr>'}
      </tbody></table></div>${sayfalama(uyan.length, L.s)}`);
    listeOlaylari(L, () => kisilerSayfasi());
  }

  // ---------- arama kutusu (mekân / kişi ekleme) ----------
  function oneriKutusu(el, kaynak, sec) {
    const inp = $('input', el); let box = null, items = [], i = -1;
    const kapat = () => { if (box) box.remove(); box = null; i = -1; };
    const ciz = () => {
      kapat(); const q = inp.value.trim(); if (q.length < 2) return;
      items = kaynak(q); box = document.createElement('div'); box.className = 'oneri-liste'; box.setAttribute('role', 'listbox');
      box.innerHTML = items.map((x, k) => `<button type="button" role="option" data-k="${k}">${x.html}</button>`).join('');
      el.appendChild(box);
      box.onclick = e => { const b = e.target.closest('[data-k]'); if (b) { const x = items[+b.dataset.k]; kapat(); inp.value = ''; sec(x); } };
    };
    inp.addEventListener('input', ciz);
    inp.addEventListener('keydown', e => {
      if (!box) return; const bs = $$('[data-k]', box);
      if (e.key === 'ArrowDown') { i = Math.min(bs.length - 1, i + 1); e.preventDefault(); } else if (e.key === 'ArrowUp') { i = Math.max(0, i - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); const x = items[i < 0 ? 0 : i]; if (x) { kapat(); inp.value = ''; sec(x); } return; } else if (e.key === 'Escape') { kapat(); return; }
      bs.forEach((b, k) => b.setAttribute('aria-selected', k === i));
    });
    document.addEventListener('click', e => { if (!el.contains(e.target)) kapat(); });
    return { doldur: v => { inp.value = v; inp.focus(); ciz(); } };
  }
  const mekanKaynak = (haric) => q => {
    const f = fold(q);
    const v = S.t.mekanlar.filter(m => m.durum !== 'arsiv' && !haric.has(m.id) && (fold(m.ad).includes(f) || fold(m.bugunku_ad).includes(f))).slice(0, 7)
      .map(m => ({ tip: 'mevcut', m, html: `<span><b>${esc(m.ad)}</b> <span class="soluk">· ${esc(m.ilce || 'ilçe yok')}</span></span><small>mevcut · ${S.mekanHikayeleri(m.id).length} hikâye</small>` }));
    v.push({ tip: 'yeni', ad: q, html: `${ik('arti', 16)}<span>"${esc(q)}" adıyla <b>yeni mekân</b> oluştur</span><small>koordinat sonra</small>` });
    return v;
  };
  const kisiKaynak = (haric) => q => {
    const f = fold(q);
    const v = S.t.kisiler.filter(k => !haric.has(k.id) && fold(k.ad).includes(f)).slice(0, 7)
      .map(k => ({ tip: 'mevcut', k, html: `<span><b>${esc(k.ad)}</b> <span class="soluk">${esc(k.roller || '')}</span></span><small>${S.kisiHikayeleri(k.id).length} hikâye</small>` }));
    v.push({ tip: 'yeni', ad: q, html: `${ik('arti', 16)}<span>"${esc(q)}" adıyla <b>yeni kişi</b> oluştur</span>` });
    return v;
  };
  async function yeniMekan(ad, ek) {
    const m = Object.assign({ id: S.nextId('mekanlar', 'M'), slug: S.uniqueSlug('mekanlar', ad), ad, bugunku_ad: '', ilce: '', enlem: null, boylam: null, karekod_basildi: 'hayır', durum: 'yayinda' }, ek || {});
    await S.save('mekanlar', m); return m;
  }
  async function yeniKisi(ad) {
    const k = { id: S.nextId('kisiler', 'K', 3), slug: S.uniqueSlug('kisiler', ad), ad, yasam: '', roller: '', kisa_bilgi: '', bilgi_kaynak: '', durum: 'yayinda' };
    await S.save('kisiler', k); return k;
  }

  // ---------- küçük harita ----------
  let haritalar = [];
  function haritaTemizle() { haritalar.splice(0).forEach(m => { try { m.remove(); } catch (e) { } }); }
  async function miniHarita(el, noktalar, opts) {
    opts = opts || {};
    const map = await HafizaBasemap.create(el, { dataPath: S.cfg.dataPath, map: { scrollZoom: !!opts.surukle } });
    haritalar.push(map);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const p = noktalar.filter(x => x.m.enlem != null);
    if (opts.cizgi && p.length > 1) {
      map.addSource('yol', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: p.map(x => [+x.m.boylam, +x.m.enlem]) } } });
      map.addLayer({ id: 'yol', type: 'line', source: 'yol', paint: { 'line-color': '#B3261E', 'line-width': 2.5, 'line-dasharray': [1, 2.5] } });
    }
    const isaretler = p.map(x => {
      const d = document.createElement('div'); d.className = 'rozet'; d.textContent = x.n; d.style.border = '2px solid #fff'; if (x.renk) d.style.background = x.renk;
      return new maplibregl.Marker({ element: d, draggable: !!x.surukle }).setLngLat([+x.m.boylam, +x.m.enlem]).addTo(map);
    });
    if (p.length === 1) map.jumpTo({ center: [+p[0].m.boylam, +p[0].m.enlem], zoom: opts.zoom || 14 });
    else if (p.length) { const b = new maplibregl.LngLatBounds(); p.forEach(x => b.extend([+x.m.boylam, +x.m.enlem])); map.fitBounds(b, { padding: 30, maxZoom: 15, duration: 0 }); }
    return { map, isaretler };
  }
  function metinOnizleme(metin, mekanlar, kisiler) {
    let t = esc(metin || ''); const reps = [];
    mekanlar.forEach((m, i) => reps.push({ s: m.ad.split(' / ')[0], r: `<mark class="y">${esc(m.ad.split(' / ')[0])}</mark><sup>${i + 1}</sup>` }));
    kisiler.forEach(k => reps.push({ s: k.ad, r: `<mark class="k">${esc(k.ad)}</mark>` }));
    reps.sort((a, b) => b.s.length - a.s.length).forEach((x, i) => { const e = esc(x.s); const at = t.indexOf(e); if (at >= 0 && e.length > 2) { t = t.slice(0, at) + `\u0000${i}\u0000` + t.slice(at + e.length); } });
    reps.forEach((x, i) => { t = t.replace(`\u0000${i}\u0000`, x.r); });
    return t.replace(/\n/g, '<br>') || '<span class="soluk">Metin boş</span>';
  }

  // ================= HİKÂYE DÜZENLEME =================
  async function hikayeDuzenle(id) {
    const yeni = !id; const orj = yeni ? null : S.ix.hikaye.get(id);
    if (!yeni && !orj) return bulunamadi();
    const h = yeni ? { id: S.nextId('hikayeler', 'H'), slug: '', baslik: '', yil: '', tarih: '', tema: S.t.temalar[0].ad, alt_temalar: '', metin: '', kaynak: '', durum: 'taslak' } : kopya(orj);
    let mek = yeni ? (yeniHikayeMekan ? [{ hikaye_id: h.id, mekan_id: yeniHikayeMekan, sira: 1, rol: 'ana' }] : []) : (S.ix.hmByHikaye.get(h.id) || []).map(x => kopya(x)).sort((a, b) => (+a.sira || 0) - (+b.sira || 0));
    let kis = yeni ? [] : S.t.hikaye_kisi.filter(x => x.hikaye_id === h.id).map(kopya);
    const mekOrj = kopya(mek), kisOrj = kopya(kis);
    let degisti = false;
    const ciz = () => {
      haritaTemizle();
      const mekR = mek.map(x => S.ix.mekan.get(x.mekan_id)).filter(Boolean);
      const okK = kis.filter(x => x.onay === 'onaylı').map(x => S.ix.kisi.get(x.kisi_id)).filter(Boolean);
      const onK = kis.filter(x => x.onay === 'öneri').map(x => S.ix.kisi.get(x.kisi_id)).filter(Boolean);
      const gs = S.hikayeGorselleri(h.id);
      const yeniIcin = yeni ? 'Yeni hikâye' : esc(h.baslik);
      kabuk('hikayeler', `<a href="#hikayeler">Hikâyeler</a> / <b>${yeniIcin}</b>`, `
        ${bos(h.kaynak) ? `<div class="uyari-bant kirmizi">${ik('uyari')}<span><b>Kaynak alanı boş.</b> Hikâye yayında kalabilir; sitede "Kaynak eksik" etiketiyle görünür.</span></div>` : ''}
        ${!yeni && S.anaMekan(h.id) && S.anaMekan(h.id).ad === h.baslik ? `<div class="uyari-bant gri">${ik('kitap')}<span>Başlık mekânın adıyla aynı. Eski tabloda hikâyelerin başlığı yoktu; bu hikâyeye kendi başlığını verebilirsiniz.</span></div>` : ''}
        <div class="iki"><div class="sol"><section class="kart">
          <div class="alan"><label for="h-baslik">Başlık</label><input id="h-baslik" class="buyuk" value="${esc(h.baslik)}"></div>
          <div class="alan"><label for="h-slug">Kalıcı adres</label><div class="onek"><span>#hikaye-</span><input id="h-slug" value="${esc(h.slug)}"></div><span class="ipucu">Yayınlandıktan sonra değiştirmeyin; bu adrese verilmiş bağlantılar bozulur.</span></div>
          <div class="izgara"><div class="alan"><label for="h-yil">Yıl</label><input id="h-yil" value="${esc(h.yil)}" inputmode="numeric"></div>
            <div class="alan"><label for="h-tarih">Tarih <span class="soluk" style="font-weight:400">(serbest: 1914-1916, 20. yy…)</span></label><input id="h-tarih" value="${esc(h.tarih)}"></div>
            <div class="alan"><label for="h-donem">Dönem</label><select id="h-donem"><option value="">—</option>${DONEMLER.map(d => `<option ${h.donem === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="alan"><label for="h-tema">Tema</label><select id="h-tema">${S.t.temalar.map(t => `<option ${t.ad === h.tema ? 'selected' : ''}>${esc(t.ad)}</option>`).join('')}</select></div>
            <div class="alan"><label for="h-durum">Durum</label><select id="h-durum">${[['yayinda', 'Yayında'], ['taslak', 'Taslak'], ['arsiv', 'Arşiv']].map(([v, l]) => `<option value="${v}" ${h.durum === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
          <div class="alan"><label for="h-alt">Alt temalar <span class="soluk" style="font-weight:400">(virgülle)</span></label><input id="h-alt" value="${esc(h.alt_temalar)}" list="alt-liste"><datalist id="alt-liste">${[...new Set(S.t.hikayeler.flatMap(x => (x.alt_temalar || '').split(',').map(y => y.trim()).filter(Boolean)))].map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
          <div class="alan"><span class="etiket" id="h-metin-e">Metin</span>
            <div class="arac" role="toolbar" aria-label="Metin araçları"><button type="button" class="yer" id="sec-mekan">${ik('pin', 14)}Seçili adı mekâna bağla</button><button type="button" class="kisi" id="sec-kisi">${ik('kisi', 14)}Seçili adı kişiye bağla</button></div>
            <textarea id="h-metin" rows="9" aria-labelledby="h-metin-e">${esc(h.metin)}</textarea>
            <div class="onizleme" id="onizleme" aria-label="Bağlantılı adların önizlemesi">${metinOnizleme(h.metin, mekR, okK)}</div>
            <span class="ipucu">Metinde bir adı seçip düğmeye basın; panel o adı mekân ya da kişi olarak bağlar. Önizlemede bağlı adlar renkli görünür.</span></div>
          <div class="alan"><label for="h-kaynak">Kaynak</label><textarea id="h-kaynak" rows="2" class="${bos(h.kaynak) ? 'eksik' : ''}" placeholder="Kitap, makale, arşiv belgesi ya da bağlantı">${esc(h.kaynak)}</textarea></div>
          <details class="ic-alanlar" ${h.konu_notu || h.not ? 'open' : ''}><summary>Ekip notları <span class="soluk">(sitede görünmez)</span></summary>
            <div class="alan"><label for="h-konu">Konu notu <span class="soluk" style="font-weight:400">(eski tablodaki "S Kolonu")</span></label>
              <div class="satir" style="flex-wrap:nowrap"><input id="h-konu" value="${esc(h.konu_notu || '')}">${h.konu_notu ? '<button type="button" class="d kucuk" id="konu-baslik">Başlık yap</button>' : ''}</div></div>
            <div class="alan"><label for="h-not">Not</label><textarea id="h-not" rows="2">${esc(h.not || '')}</textarea></div>
            ${h.giren || h.giris_tarihi ? `<div class="soluk" style="font-size:12px">Veriyi giren: ${esc(h.giren || '—')}${h.giris_tarihi ? ' · ' + esc(h.giris_tarihi) : ''}</div>` : ''}
          </details>
          <div class="mono soluk">Sheets · hikayeler · ${h.id}${h.kaynak_sekme ? ` · eski tabloda "${esc(h.kaynak_sekme)}" ${h.kaynak_sekme === 'eski site' ? 'kaydı ' : 'satır '}${h.kaynak_satir}` : ''}</div>
        </section></div>
        <div class="sagk">
          <section class="kart ince"><div class="satir"><h2>Mekânlar</h2><span class="soluk sag">${mek.length} · metindeki sırayla</span></div>
            ${mekR.some(m => m.enlem != null) ? '<div class="mini" id="mini"></div>' : ''}
            <ol class="liste" id="mek-liste">${mek.map((x, i) => { const m = S.ix.mekan.get(x.mekan_id); if (!m) return ''; return `<li draggable="true" data-i="${i}">
              <span class="tutamac" aria-hidden="true">${ik('tut', 16)}</span><span class="rozet">${i + 1}</span><a class="ad" href="#mekan-${m.id.toLowerCase()}">${esc(m.ad)}</a>
              <span class="not">${m.enlem == null ? 'koordinat yok' : ''}</span>
              <label class="sr" for="rol-${i}">Rol</label><select id="rol-${i}" data-rol="${i}"><option value="ana" ${x.rol === 'ana' ? 'selected' : ''}>ana</option><option value="geçtiği" ${x.rol !== 'ana' ? 'selected' : ''}>geçtiği</option></select>
              <button type="button" class="ib" data-yukari="${i}" aria-label="${esc(m.ad)} yukarı" ${i ? '' : 'disabled'}>${ik('yukari', 14)}</button><button type="button" class="ib" data-asagi="${i}" aria-label="${esc(m.ad)} aşağı" ${i < mek.length - 1 ? '' : 'disabled'}>${ik('asagi', 14)}</button>
              <button type="button" class="ib" data-mek-sil="${i}" aria-label="${esc(m.ad)} bağını kaldır">${ik('kapat', 14)}</button></li>`; }).join('')}</ol>
            <div class="oneri-kutu" id="mek-ekle"><label class="sr" for="mek-ara">Mekân ekle</label><div class="arama" style="width:100%">${ik('ara', 16)}<input id="mek-ara" placeholder="Mekân ekle"></div></div></section>
          <section class="kart ince"><div class="satir"><h2>Kişiler</h2><span class="soluk sag">${okK.length}</span></div>
            <div class="satir" style="gap:6px">${okK.map(k => `<span class="kisi-cip"><a href="#kisi-${k.id.toLowerCase()}">${esc(k.ad)}</a><button type="button" class="ib" data-kisi-sil="${k.id}" aria-label="${esc(k.ad)} bağını kaldır">${ik('kapat', 13)}</button></span>`).join('') || '<span class="soluk">Bağlı kişi yok</span>'}</div>
            ${onK.length ? `<div class="etiket" style="font-size:12px;font-weight:600;color:var(--amber)">Öneriler: ad metinde geçiyor, bağlansın mı?</div><div class="satir" style="gap:6px">${onK.map(k => `<span class="kisi-cip oneri">${esc(k.ad)}<button type="button" class="ib" data-onayla="${k.id}" aria-label="${esc(k.ad)} bağla">${ik('tamam', 14)}</button><button type="button" class="ib" data-reddet="${k.id}" aria-label="${esc(k.ad)} bağlama">${ik('kapat', 13)}</button></span>`).join('')}</div>` : ''}
            <div class="oneri-kutu" id="kisi-ekle"><label class="sr" for="kisi-ara">Kişi ekle</label><div class="arama" style="width:100%">${ik('ara', 16)}<input id="kisi-ara" placeholder="Kişi ekle"></div></div></section>
          <section class="kart ince"><div class="satir"><h2>Görseller</h2><span class="soluk sag">${gs.length}</span></div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${gs.map(g => `<div class="kucuk-gorsel">${img(g, 300)}<span>${esc(g.donem)}${g.yil ? ' · ' + esc(g.yil) : ''}</span><button type="button" class="ib" data-g-cikar="${g.id}" aria-label="Görseli bu hikâyeden çıkar">${ik('kapat', 12)}</button></div>`).join('')}</div>
            <button type="button" class="d" id="g-sec">${ik('arti', 16)}Mekânın görsellerinden seç</button>
            <a class="d duz" href="#gorseller">Görsel kütüphanesi</a></section>
        </div></div>`,
        `${!yeni ? `<a class="d" href="index.html#hikaye-${esc(h.slug)}">${ik('goz', 16)}Sitede gör</a>` : ''}<button type="button" class="d ana-d" id="kaydet">Kaydet</button>`);
      olaylar(mekR);
      if ($('#mini')) miniHarita($('#mini'), mekR.map((m, i) => ({ m, n: i + 1 })), { cizgi: true });
    };
    const oku = () => {
      h.baslik = $('#h-baslik').value.trim(); h.slug = $('#h-slug').value.trim(); h.yil = $('#h-yil').value.trim(); h.tarih = $('#h-tarih').value.trim(); h.donem = $('#h-donem').value;
      h.konu_notu = $('#h-konu').value.trim(); h.not = $('#h-not').value.trim();
      h.tema = $('#h-tema').value; h.durum = $('#h-durum').value; h.alt_temalar = $('#h-alt').value.split(',').map(x => x.trim()).filter(Boolean).join(', ');
      h.metin = $('#h-metin').value; h.kaynak = $('#h-kaynak').value.trim();
    };
    const olaylar = (mekR) => {
      $$('#icerik input, #icerik textarea, #icerik select').forEach(el => el.addEventListener('input', () => { degisti = true; }));
      const kb = $('#konu-baslik'); if (kb) kb.onclick = () => { $('#h-baslik').value = $('#h-konu').value; $('#h-baslik').dispatchEvent(new Event('input')); degisti = true; };
      $('#h-baslik').addEventListener('input', e => { if (yeni || !orj.slug) $('#h-slug').value = S.uniqueSlug('hikayeler', e.target.value, h.id); });
      $('#h-metin').addEventListener('input', e => { $('#onizleme').innerHTML = metinOnizleme(e.target.value, mek.map(x => S.ix.mekan.get(x.mekan_id)).filter(Boolean), kis.filter(x => x.onay === 'onaylı').map(x => S.ix.kisi.get(x.kisi_id)).filter(Boolean)); });
      const yenile = () => { oku(); ciz(); degisti = true; };
      $$('[data-mek-sil]').forEach(b => b.onclick = () => { mek.splice(+b.dataset.mekSil, 1); mek.forEach((x, i) => x.sira = i + 1); yenile(); });
      $$('[data-yukari]').forEach(b => b.onclick = () => { const i = +b.dataset.yukari; [mek[i - 1], mek[i]] = [mek[i], mek[i - 1]]; mek.forEach((x, k) => x.sira = k + 1); yenile(); });
      $$('[data-asagi]').forEach(b => b.onclick = () => { const i = +b.dataset.asagi; [mek[i + 1], mek[i]] = [mek[i], mek[i + 1]]; mek.forEach((x, k) => x.sira = k + 1); yenile(); });
      $$('[data-rol]').forEach(s => s.onchange = () => { const i = +s.dataset.rol; if (s.value === 'ana') mek.forEach(x => x.rol = 'geçtiği'); mek[i].rol = s.value; yenile(); });
      // sürükle-bırak
      let suruklenen = null;
      $$('#mek-liste li').forEach(li => {
        li.addEventListener('dragstart', () => { suruklenen = +li.dataset.i; li.classList.add('surukle'); });
        li.addEventListener('dragend', () => li.classList.remove('surukle'));
        li.addEventListener('dragover', e => e.preventDefault());
        li.addEventListener('drop', e => { e.preventDefault(); const to = +li.dataset.i; if (suruklenen == null || suruklenen === to) return; const [x] = mek.splice(suruklenen, 1); mek.splice(to, 0, x); mek.forEach((y, k) => y.sira = k + 1); yenile(); });
      });
      const mk = oneriKutusu($('#mek-ekle'), mekanKaynak(new Set(mek.map(x => x.mekan_id))), async x => {
        oku(); let m = x.m;
        if (x.tip === 'yeni') { m = await yeniMekan(x.ad); bildir(`"${m.ad}" mekânı oluşturuldu; koordinatını mekân ekranından girin`); }
        mek.push({ hikaye_id: h.id, mekan_id: m.id, sira: mek.length + 1, rol: mek.length ? 'geçtiği' : 'ana' }); degisti = true; ciz();
      });
      const kk = oneriKutusu($('#kisi-ekle'), kisiKaynak(new Set(kis.map(x => x.kisi_id))), async x => {
        oku(); let k = x.k; if (x.tip === 'yeni') k = await yeniKisi(x.ad);
        const v = kis.find(y => y.kisi_id === k.id); if (v) v.onay = 'onaylı'; else kis.push({ hikaye_id: h.id, kisi_id: k.id, onay: 'onaylı' }); degisti = true; ciz();
      });
      const secili = () => { const ta = $('#h-metin'); return ta.value.slice(ta.selectionStart, ta.selectionEnd).trim(); };
      $('#sec-mekan').onclick = () => { const s = secili(); if (!s) return bildir('Önce metinde bir ad seçin'); mk.doldur(s); };
      $('#sec-kisi').onclick = () => { const s = secili(); if (!s) return bildir('Önce metinde bir ad seçin'); kk.doldur(s); };
      $$('[data-kisi-sil]').forEach(b => b.onclick = () => { kis = kis.filter(x => x.kisi_id !== b.dataset.kisiSil); yenile(); });
      $$('[data-onayla]').forEach(b => b.onclick = () => { kis.find(x => x.kisi_id === b.dataset.onayla).onay = 'onaylı'; yenile(); });
      $$('[data-reddet]').forEach(b => b.onclick = () => { kis.find(x => x.kisi_id === b.dataset.reddet).onay = 'reddedildi'; yenile(); });
      $$('[data-g-cikar]').forEach(b => b.onclick = async () => { const g = kopya(S.ix.gorsel.get(b.dataset.gCikar)); g.hikaye_id = ''; await S.save('gorseller', g); oku(); ciz(); });
      $('#g-sec').onclick = async () => {
        oku();
        const aday = mek.flatMap(x => S.mekanGorselleri(x.mekan_id)).filter(g => g.hikaye_id !== h.id);
        if (!aday.length) return bildir('Bağlı mekânlarda seçilecek başka görsel yok');
        const r = await pencere('Mekânın görsellerinden seç', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${aday.map(g => `<label style="display:flex;flex-direction:column;gap:4px;font-size:12px"><span class="kucuk-gorsel">${img(g, 300)}</span><span><input type="checkbox" name="${g.id}"> ${esc((S.ix.mekan.get(g.mekan_id) || {}).ad || '')}</span></label>`).join('')}</div>`, [{ t: 'Vazgeç' }, { t: 'Ekle', cls: 'ana-d' }]);
        if (r.i !== 1) return;
        for (const [gid, on] of Object.entries(r.v || {})) if (on) { const g = kopya(S.ix.gorsel.get(gid)); g.hikaye_id = h.id; await S.save('gorseller', g); }
        ciz();
      };
      $('#kaydet').onclick = kaydet;
    };
    const kaydet = async () => {
      oku();
      if (!h.baslik) return bildir('Başlık boş olamaz', true);
      if (!h.slug) h.slug = S.uniqueSlug('hikayeler', h.baslik, h.id);
      if (S.t.hikayeler.some(x => x.slug === h.slug && x.id !== h.id)) return bildir('Bu kalıcı adres başka bir hikâyede kullanılıyor', true);
      try {
        if (yeni || JSON.stringify(h) !== JSON.stringify(orj)) await S.save('hikayeler', h);
        const k = x => x.mekan_id; const yeniM = new Map(mek.map(x => [k(x), x])), eskiM = new Map(mekOrj.map(x => [k(x), x]));
        for (const [id, x] of eskiM) if (!yeniM.has(id)) await S.remove('hikaye_mekan', x);
        for (const [id, x] of yeniM) { const e = eskiM.get(id); if (!e || e.sira !== x.sira || e.rol !== x.rol) await S.save('hikaye_mekan', Object.assign({}, x, { hikaye_id: h.id })); }
        const yeniK = new Map(kis.map(x => [x.kisi_id, x])), eskiK = new Map(kisOrj.map(x => [x.kisi_id, x]));
        for (const [id, x] of eskiK) if (!yeniK.has(id)) await S.remove('hikaye_kisi', x);
        for (const [id, x] of yeniK) { const e = eskiK.get(id); if (!e || e.onay !== x.onay) await S.save('hikaye_kisi', Object.assign({}, x, { hikaye_id: h.id })); }
        degisti = false; kontrolTaze(); bildir('Kaydedildi');
        if (yeni) location.hash = 'hikaye-' + h.id.toLowerCase(); else route();
      } catch (e) { bildir('Kaydedilemedi: ' + e.message, true); }
    };
    ciz();
    ayrilmaUyarisi(() => degisti);
  }
  let ayrilmaKontrol = null;
  function ayrilmaUyarisi(f) { ayrilmaKontrol = f; }

  // ================= MEKÂN DÜZENLEME =================
  async function mekanDuzenle(id) {
    const yeni = !id; const orj = yeni ? null : S.ix.mekan.get(id);
    if (!yeni && !orj) return bulunamadi();
    const m = yeni ? { id: S.nextId('mekanlar', 'M'), slug: '', ad: '', bugunku_ad: '', ilce: '', enlem: null, boylam: null, karekod_basildi: 'hayır', durum: 'yayinda', aciklama: '', aciklama_kaynak: '', tema: '', alt_temalar: '', donem: '' } : kopya(orj);
    let mkB = yeni ? [] : S.t.mekan_kisi.filter(x => x.mekan_id === m.id).map(kopya); const mkEski = new Map(mkB.map(x => [x.kisi_id, x]));
    let degisti = false;
    const ciz = () => {
      haritaTemizle();
      const hs = yeni ? [] : S.mekanHikayeleri(m.id);
      const eski = yeni ? [] : S.mekanGorselleri(m.id, 'o zaman'), bugun = yeni ? [] : S.mekanGorselleri(m.id, 'bugün');
      const adaylar = yeni || m.enlem == null ? [] : (K || kontrolTaze()).tekrar.filter(g => g.mekanlar.some(x => x.id === m.id));
      const ilceler = [...new Set(S.t.mekanlar.map(x => x.ilce).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
      const kilitli = m.karekod_basildi === 'evet';
      const url = S.mekanUrl(m);
      kabuk('mekanlar', `<a href="#mekanlar">Mekânlar</a> / <b>${yeni ? 'Yeni mekân' : esc(m.ad)}</b>`, `
        ${m.durum === 'arsiv' ? `<div class="uyari-bant gri">${ik('kilit')}<span>Bu mekân arşivde${m.yonlendir && S.ix.mekan.get(m.yonlendir) ? `; adresi <a href="#mekan-${m.yonlendir.toLowerCase()}">${esc(S.ix.mekan.get(m.yonlendir).ad)}</a> sayfasına yönlendiriliyor` : ''}.</span></div>` : ''}
        ${adaylar.map(g => { const o = g.mekanlar.filter(x => x.id !== m.id); const c = g.ciftler.find(c => c.a.id === m.id || c.b.id === m.id) || g.ciftler[0];
          return `<div class="uyari-bant amber">${ik('birlestir')}<span><b>${o.map(x => `"${esc(x.ad)}"`).join(', ')}</b> ile aynı yer olabilir (${esc(c.neden)}, ${metreYaz(c.d)}).</span><div class="sag"><a class="d kucuk" href="#kontrol-tekrar-${m.id.toLowerCase()}">Karşılaştır</a></div></div>`; }).join('')}
        <div class="iki"><div class="sol"><section class="kart">
          <div class="izgara2"><div class="alan"><label for="m-ad">Mekânın adı</label><input id="m-ad" class="buyuk" value="${esc(m.ad)}"></div>
            <div class="alan"><label for="m-bugun">Bugünkü adı ya da adresi</label><input id="m-bugun" class="buyuk ${bos(m.bugunku_ad) ? 'eksik' : ''}" value="${esc(m.bugunku_ad)}"></div></div>
          <div class="satir" style="align-items:flex-end;gap:14px">
            <div class="alan" style="min-width:200px"><label for="m-ilce">İlçe</label><input id="m-ilce" list="ilce-liste" value="${esc(m.ilce)}"><datalist id="ilce-liste">${ilceler.map(i => `<option value="${esc(i)}">`).join('')}</datalist></div>
            <div class="alan" style="min-width:150px"><label for="m-tabela">Tabela yapılabilir mi?</label><select id="m-tabela">${[['', '—'], ['evet', 'Evet'], ['hayır', 'Hayır']].map(([v, l]) => `<option value="${v}" ${(m.tabela || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${m.tabela_ham && !['evet', 'hayır'].includes(m.tabela_ham.toLocaleLowerCase('tr')) ? `<span class="ipucu">Tabloda: "${esc(m.tabela_ham)}"</span>` : ''}</div>
            <div class="alan" style="min-width:150px"><label for="m-durum">Durum</label><select id="m-durum">${[['yayinda', 'Yayında'], ['taslak', 'Taslak'], ['arsiv', 'Arşiv']].map(([v, l]) => `<option value="${v}" ${m.durum === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
          <div class="satir" style="align-items:flex-end">
            <div class="alan"><label for="m-enlem">Enlem</label><input id="m-enlem" class="mono" style="width:150px;font-size:14px" value="${m.enlem ?? ''}"></div>
            <div class="alan"><label for="m-boylam">Boylam</label><input id="m-boylam" class="mono" style="width:150px;font-size:14px" value="${m.boylam ?? ''}"></div>
            <div class="alan" style="flex:1;min-width:220px"><label for="m-link">ya da Google Haritalar bağlantısı</label><input id="m-link" placeholder="https://www.google.com/maps/…/@41.0182,28.9719,17z"></div></div>
          ${m.enlem == null && m.koordinat_ham ? `<div class="uyari-bant amber">${ik('pin')}<span>Tablodaki koordinat okunamadı: <span class="mono">${esc(m.koordinat_ham)}</span></span></div>` : ''}
          <div class="mini buyuk" id="m-harita"></div><span class="soluk" style="font-size:12px">Pimi sürükleyin ya da haritada bir yere tıklayın.</span>
        </section>
        <section class="kart"><div class="satir"><h2>Mekânın genel bilgisi</h2><span class="soluk sag">mekânı tanıtan metin; olaylar ve anlatılar hikâye olarak girilir</span></div>
          <div class="alan"><label for="m-aciklama">Genel bilgi</label><textarea id="m-aciklama" rows="${Math.min(16, Math.max(5, Math.ceil((m.aciklama || '').length / 110)))}">${esc(m.aciklama || '')}</textarea><span class="ipucu">Paragrafları boş satırla ayırın.</span></div>
          <div class="alan"><label for="m-akaynak">Kaynak</label><input id="m-akaynak" value="${esc(m.aciklama_kaynak || '')}"></div>
          <div class="satir" style="align-items:flex-end;gap:14px">
            <div class="alan" style="min-width:220px"><label for="m-tema">Tema <span class="soluk" style="font-weight:400">(haritadaki renk)</span></label><select id="m-tema"><option value="">—</option>${S.t.temalar.map(t => `<option ${m.tema === t.ad ? 'selected' : ''}>${esc(t.ad)}</option>`).join('')}</select></div>
            <div class="alan" style="min-width:160px"><label for="m-donem">Dönem</label><select id="m-donem"><option value="">—</option>${DONEMLER.map(d => `<option ${m.donem === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="alan" style="flex:1;min-width:220px"><label for="m-alt">Alt temalar <span class="soluk" style="font-weight:400">(virgülle)</span></label><input id="m-alt" value="${esc(m.alt_temalar || '')}"></div></div>
          ${m.kaynak_kayitlar || m.kayit_notlari ? `<details class="ic-alanlar"><summary>Ekip notları <span class="soluk">(sitede görünmez)</span></summary>
            ${m.kaynak_kayitlar ? `<div class="alan"><label>Eski tablodaki satırlar</label><span class="mono soluk">${esc(m.kaynak_kayitlar)}</span></div>` : ''}
            ${m.kayit_notlari ? `<div class="alan"><label>Kayıt notları</label><div style="white-space:pre-line;font-size:13px">${esc(m.kayit_notlari)}</div></div>` : ''}</details>` : ''}
        </section>
        ${!yeni ? vikiBolum(m) : ''}
        <section class="kart"><div class="satir"><h2>Bu mekâna bağlı kişiler</h2><span class="soluk sag">burada yaşadı, evi, atölyesi… · hikâyelerdeki kişiler ayrıca gelir</span></div>
          <ul class="liste">${mkB.map(x => { const k = S.ix.kisi.get(x.kisi_id); return k ? `<li><a class="ad" href="#kisi-${k.id.toLowerCase()}">${esc(k.ad)}</a>
            <input class="mk-iliski" data-mk="${k.id}" value="${esc(x.iliski || '')}" placeholder="ilişki: yaşadı, doğdu…" style="max-width:200px;font-size:13px">
            ${x.onay === 'onaylı' ? '<span class="cip yesil">Onaylı</span>' : `<button type="button" class="d kucuk" data-mk-onay="${k.id}">${x.onay === 'reddedildi' ? 'Yeniden bağla' : 'Bağla'}</button>`}
            <button type="button" class="ib" data-mk-kaldir="${k.id}" aria-label="${esc(k.ad)} bağını kaldır">${ik('kapat', 14)}</button></li>` : ''; }).join('') || '<li class="soluk">Doğrudan bağlı kişi yok.</li>'}</ul>
          <div class="satir"><label class="sr" for="m-kisi-ekle">Kişi ekle</label><div class="alan" style="flex:1"><input id="m-kisi-ekle" list="kisi-liste" placeholder="Kişi adı yazın (yoksa yeni kişi oluşur)"></div><datalist id="kisi-liste">${S.t.kisiler.map(k => `<option value="${esc(k.ad)}">`).join('')}</datalist><button type="button" class="d kucuk" id="m-kisi-ekle-d">${ik('arti', 14)}Ekle</button></div>
        </section>
        <section class="kart"><div class="satir"><h2>Bu mekânla ilgili hikâyeler</h2><span class="soluk sag">${hs.length} · bağlar hikâye ekranından kurulur</span></div>
          <ul class="liste">${hs.map(h => { const x = (S.ix.hmByHikaye.get(h.id) || []).find(y => y.mekan_id === m.id) || {}; const n = S.hikayeMekanlari(h.id).length;
            return `<li><span class="mono soluk" style="width:60px">${esc(h.yil || '')}</span><a class="ad" href="#hikaye-${h.id.toLowerCase()}">${esc(h.baslik)}</a><span class="not">${n > 1 ? `${n} mekândan ${x.sira}.si · ${esc(x.rol || '')}` : 'tek mekân'}</span>${durumCip(h)}</li>`; }).join('') || '<li class="soluk">Henüz hikâye yok.</li>'}</ul>
          ${!yeni ? `<a class="d" href="#yeni-hikaye" data-yeni-hikaye="${m.id}" style="align-self:flex-start">${ik('arti', 16)}Bu mekâna yeni hikâye</a>` : ''}</section></div>
        <div class="sagk">
          <section class="kart ince"><h2>Kalıcı adres ve karekod</h2>
            <div class="onek"><span>${kilitli ? ik('kilit', 14) : '#mekan-'}</span><input id="m-slug" value="${esc(m.slug)}" ${kilitli ? 'disabled' : ''} aria-label="Kalıcı adres"></div>
            <label class="satir" style="gap:8px;font-size:13px"><input type="checkbox" id="m-karekod" ${kilitli ? 'checked' : ''} style="width:18px;height:18px">Karekod basıldı (adres kilitlenir)</label>
            ${!yeni ? `<div class="satir" style="align-items:center"><div class="karekod">${karekod(url)}</div><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="mono soluk" style="word-break:break-all">${esc(url)}</span><a class="d kucuk" href="${karekodPng(url)}" download="karekod-${esc(m.slug)}.gif">Karekodu indir</a></div></div>` : ''}</section>
          ${!yeni ? `<section class="kart ince"><h2>Görseller</h2>
            <div class="satir"><b style="font-size:13px">O zaman</b><span class="sag soluk">${eski.length}</span></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${eski.map(g => `<a class="kucuk-gorsel" style="height:64px" href="#gorseller" data-gorsel-git="${g.id}">${img(g, 200)}${g.yil ? `<span>${esc(g.yil)}</span>` : ''}</a>`).join('')}</div>
            <div class="satir"><b style="font-size:13px">Bugün</b><span class="sag" style="color:${bugun.length ? 'var(--gri)' : 'var(--kirmizi)'};font-weight:600">${bugun.length}</span></div>
            ${bugun.length ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${bugun.map(g => `<div class="kucuk-gorsel" style="height:64px">${img(g, 200)}</div>`).join('')}</div>` : ''}
            <label class="yukle">${ik('kamera', 18)}Bugünkü fotoğrafı yükle<span class="soluk" style="font-size:12px">sitede O zaman / Bugün bölmesi için</span><input type="file" accept="image/*" id="m-yukle"></label></section>` : ''}
          <div class="mono soluk" style="line-height:1.6">Sheets · mekanlar · ${m.id}</div>
        </div></div>`,
        `${!yeni ? `<a class="d" href="index.html#mekan-${esc(m.slug)}">${ik('goz', 16)}Sitede gör</a>` : ''}<button type="button" class="d ana-d" id="kaydet">Kaydet</button>`);
      olaylar();
    };
    const oku = () => {
      m.aciklama = $('#m-aciklama').value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); m.aciklama_kaynak = $('#m-akaynak').value.trim(); m.tema = $('#m-tema').value; m.donem = $('#m-donem').value;
      m.alt_temalar = $('#m-alt').value.split(',').map(x => x.trim()).filter(Boolean).join(', ');
      $$('.mk-iliski').forEach(el => { const x = mkB.find(y => y.kisi_id === el.dataset.mk); if (x) x.iliski = el.value.trim(); });
      m.ad = $('#m-ad').value.trim(); m.bugunku_ad = $('#m-bugun').value.trim(); m.ilce = $('#m-ilce').value.trim(); m.durum = $('#m-durum').value; m.tabela = $('#m-tabela').value;
      const la = parseFloat(String($('#m-enlem').value).replace(',', '.')), lo = parseFloat(String($('#m-boylam').value).replace(',', '.'));
      m.enlem = isNaN(la) ? null : +la.toFixed(6); m.boylam = isNaN(lo) ? null : +lo.toFixed(6);
      if (m.karekod_basildi !== 'evet') m.slug = $('#m-slug').value.trim();
    };
    const olaylar = async () => {
      $$('#icerik input, #icerik select, #icerik textarea').forEach(el => el.addEventListener('input', () => { degisti = true; }));
      $$('[data-mk-onay]').forEach(b => b.onclick = () => { oku(); mkB.find(x => x.kisi_id === b.dataset.mkOnay).onay = 'onaylı'; degisti = true; ciz(); });
      $$('[data-mk-kaldir]').forEach(b => b.onclick = () => { oku(); mkB = mkB.filter(x => x.kisi_id !== b.dataset.mkKaldir); degisti = true; ciz(); });
      const kEkle = async () => {
        const ad = $('#m-kisi-ekle').value.trim(); if (!ad) return;
        oku();
        let k = S.t.kisiler.find(x => fold(x.ad) === fold(ad));
        if (!k) { k = { id: S.nextId('kisiler', 'K', 3), slug: S.uniqueSlug('kisiler', ad), ad, yasam: '', roller: '', kisa_bilgi: '', bilgi_kaynak: '', durum: 'yayinda' }; await S.save('kisiler', k); bildir(`Yeni kişi: ${ad}`); }
        if (!mkB.some(x => x.kisi_id === k.id)) mkB.push({ mekan_id: m.id, kisi_id: k.id, iliski: '', onay: 'onaylı' });
        degisti = true; ciz();
      };
      vikiOlaylar(m, d => { oku(); Object.assign(m, d); degisti = true; ciz(); });
      $('#m-kisi-ekle-d').onclick = kEkle; $('#m-kisi-ekle').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); kEkle(); } };
      $('#m-ad').addEventListener('input', e => { if (yeni) $('#m-slug').value = S.uniqueSlug('mekanlar', e.target.value, m.id); });
      $('#m-karekod').onchange = e => { oku(); m.karekod_basildi = e.target.checked ? 'evet' : 'hayır'; degisti = true; ciz(); };
      const yy = $('[data-yeni-hikaye]'); if (yy) yy.onclick = () => { yeniHikayeMekan = m.id; };
      $$('[data-gorsel-git]').forEach(a => a.onclick = () => { gorselDurum.sec = a.dataset.gorselGit; gorselDurum.f = 'tumu'; gorselDurum.q = m.ad; });
      const up = $('#m-yukle'); if (up) up.onchange = async () => {
        const f = up.files[0]; if (!f) return;
        try {
          const veri = await kucult(f, 1400);
          let g = { id: S.nextId('gorseller', 'G'), drive_id: '', site_url: '', donem: 'bugün', yil: String(new Date().getFullYear()), altyazi: '', kaynak: '', izin: '', mekan_id: m.id, hikaye_id: '', kisi_id: '', konu: 'mekân', sira: 1 };
          if (S.backend.kind === 'sheets') { const r = await S.uploadImage(veri, f.name, m); g.drive_id = r.drive_id; } else g.site_url = veri;
          await S.save('gorseller', g); bildir('Bugünkü fotoğraf eklendi'); oku(); ciz();
        } catch (e) { bildir('Yüklenemedi: ' + e.message, true); }
      };
      // harita
      const nokta = m.enlem != null ? m : { enlem: 41.025, boylam: 28.975 };
      const { map, isaretler } = await miniHarita($('#m-harita'), [{ m: nokta, n: '', surukle: true }], { zoom: m.enlem != null ? 16 : 12, surukle: true });
      const pin = isaretler[0];
      const komsular = S.t.mekanlar.filter(x => x.id !== m.id && x.enlem != null && Math.abs(x.enlem - nokta.enlem) < 0.01 && Math.abs(x.boylam - nokta.boylam) < 0.013);
      map.addSource('komsu', { type: 'geojson', data: { type: 'FeatureCollection', features: komsular.map(x => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+x.boylam, +x.enlem] }, properties: {} })) } });
      map.addLayer({ id: 'komsu', type: 'circle', source: 'komsu', paint: { 'circle-radius': 4, 'circle-color': '#8A8A84', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } }, map.getStyle().layers.length ? undefined : undefined);
      const yaz = ll => { $('#m-enlem').value = ll.lat.toFixed(6); $('#m-boylam').value = ll.lng.toFixed(6); degisti = true; };
      pin.on('dragend', () => yaz(pin.getLngLat()));
      map.on('click', e => { pin.setLngLat(e.lngLat); yaz(e.lngLat); });
      const elle = () => { const la = parseFloat($('#m-enlem').value.replace(',', '.')), lo = parseFloat($('#m-boylam').value.replace(',', '.')); if (!isNaN(la) && !isNaN(lo)) { pin.setLngLat([lo, la]); map.easeTo({ center: [lo, la] }); } };
      $('#m-enlem').onchange = elle; $('#m-boylam').onchange = elle;
      $('#m-link').oninput = e => { const v = e.target.value; const r = v.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || v.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || v.match(/(-?\d{2}\.\d{3,}),\s*(-?\d{2}\.\d{3,})/);
        if (r) { $('#m-enlem').value = (+r[1]).toFixed(6); $('#m-boylam').value = (+r[2]).toFixed(6); elle(); degisti = true; bildir('Koordinat bağlantıdan alındı'); } };
      $('#kaydet').onclick = kaydet;
    };
    const kaydet = async () => {
      oku();
      if (!m.ad) return bildir('Ad boş olamaz', true);
      if (!m.slug) m.slug = S.uniqueSlug('mekanlar', m.ad, m.id);
      if (S.t.mekanlar.some(x => x.slug === m.slug && x.id !== m.id)) return bildir('Bu kalıcı adres başka bir mekânda kullanılıyor', true);
      try {
        await S.save('mekanlar', m);
        for (const [kid, x] of mkEski) if (!mkB.some(y => y.kisi_id === kid)) await S.remove('mekan_kisi', x);
        for (const x of mkB) { const e = mkEski.get(x.kisi_id); if (!e || e.onay !== x.onay || (e.iliski || '') !== (x.iliski || '')) await S.save('mekan_kisi', Object.assign({}, x, { mekan_id: m.id })); }
        degisti = false; kontrolTaze(); bildir('Kaydedildi'); if (yeni) location.hash = 'mekan-' + m.id.toLowerCase(); else route(); }
      catch (e) { bildir('Kaydedilemedi: ' + e.message, true); }
    };
    ciz(); ayrilmaUyarisi(() => degisti);
  }
  let yeniHikayeMekan = null;
  function kucult(file, max) {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.onerror = () => rej(new Error('dosya okunamadı'));
      r.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('görsel açılamadı')); im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; im.src = r.result; };
      r.readAsDataURL(file);
    });
  }
  function karekod(url) { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; } }
  function karekodPng(url) { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createDataURL(10, 4); } catch (e) { return '#'; } }

  // ================= KİŞİ DÜZENLEME =================
  function kisiDuzenle(id) {
    const yeni = !id; const orj = yeni ? null : S.ix.kisi.get(id);
    if (!yeni && !orj) return bulunamadi();
    const k = yeni ? { id: S.nextId('kisiler', 'K', 3), slug: '', ad: '', yasam: '', roller: '', kisa_bilgi: '', bilgi_kaynak: '', durum: 'yayinda' } : kopya(orj);
    const baglar = yeni ? [] : S.t.hikaye_kisi.filter(x => x.kisi_id === k.id);
    const ok = baglar.filter(x => x.onay === 'onaylı'), on = baglar.filter(x => x.onay === 'öneri');
    const mBag = yeni ? [] : S.t.mekan_kisi.filter(x => x.kisi_id === k.id && x.onay !== 'reddedildi');
    kabuk('kisiler', `<a href="#kisiler">Kişiler</a> / <b>${yeni ? 'Yeni kişi' : esc(k.ad)}</b>`, `
      <div class="iki"><div class="sol"><section class="kart">
        <div class="izgara2"><div class="alan"><label for="k-ad">Ad</label><input id="k-ad" class="buyuk" value="${esc(k.ad)}"></div>
          <div class="alan"><label for="k-slug">Kalıcı adres</label><div class="onek"><span>#kisi-</span><input id="k-slug" value="${esc(k.slug)}"></div></div></div>
        <div class="izgara2"><div class="alan"><label for="k-yasam">Yaşam</label><input id="k-yasam" value="${esc(k.yasam)}" placeholder="1906–1954"></div>
          <div class="alan"><label for="k-roller">Roller <span class="soluk" style="font-weight:400">(virgülle)</span></label><input id="k-roller" value="${esc(k.roller)}" placeholder="Yazar, Şair"></div></div>
        <div class="alan"><label for="k-bilgi">Kişi bilgisi (biyografi)</label><textarea id="k-bilgi" rows="6" placeholder="Kim olduğu, ne yaptığı, İstanbul'la bağı. Mekânı anlatan cümleler mekânın genel bilgisine, olaylar hikâyelere yazılır.">${esc(k.kisa_bilgi)}</textarea></div>
        <div class="alan"><label for="k-bkaynak">Bilginin kaynağı</label><input id="k-bkaynak" value="${esc(k.bilgi_kaynak || '')}"></div>
        <div class="alan" style="max-width:220px"><label for="k-durum">Durum</label><select id="k-durum">${[['yayinda', 'Yayında'], ['taslak', 'Taslak']].map(([v, l]) => `<option value="${v}" ${k.durum === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="mono soluk">Sheets · kisiler · ${k.id}</div></section>
      ${!yeni ? vikiBolum(k) : ''}
      <section class="kart"><div class="satir"><h2>Hikâyeleri</h2><span class="soluk sag">${ok.length} onaylı</span></div>
        <ul class="liste">${ok.map(x => { const h = S.ix.hikaye.get(x.hikaye_id); const m = h && S.anaMekan(h.id); return h ? `<li><a class="ad" href="#hikaye-${h.id.toLowerCase()}">${esc(h.baslik)}</a><span class="not">${esc(m ? m.ad : '')}</span><button type="button" class="ib" data-kaldir="${h.id}" aria-label="Bağı kaldır">${ik('kapat', 14)}</button></li>` : ''; }).join('') || '<li class="soluk">Onaylı hikâye yok</li>'}</ul></section>
      <section class="kart"><div class="satir"><h2>Doğrudan bağlı mekânlar</h2><span class="soluk sag">${mBag.filter(x => x.onay === 'onaylı').length} onaylı · mekân ekranından düzenlenir</span></div>
        <ul class="liste">${mBag.map(x => { const m = S.ix.mekan.get(x.mekan_id); return m ? `<li><a class="ad" href="#mekan-${m.id.toLowerCase()}">${esc(m.ad)}</a><span class="not">${esc(x.iliski || m.ilce || '')}</span>${x.onay === 'onaylı' ? '' : `<button type="button" class="d kucuk" data-mk-onay="${m.id}">Bağla</button><button type="button" class="d kucuk duz" data-mk-red="${m.id}">Bağlama</button>`}</li>` : ''; }).join('') || '<li class="soluk">Doğrudan bağlı mekân yok</li>'}</ul></section>
      ${on.length ? `<section class="kart"><div class="satir"><h2>Öneriler</h2><span class="soluk sag">adı bu hikâyelerin metninde geçiyor</span></div>
        <ul class="liste">${on.map(x => { const h = S.ix.hikaye.get(x.hikaye_id); return h ? `<li><a class="ad" href="#hikaye-${h.id.toLowerCase()}">${esc(h.baslik)}</a><button type="button" class="d kucuk" data-onay="${h.id}">Bağla</button><button type="button" class="d kucuk duz" data-red="${h.id}">Bağlama</button></li>` : ''; }).join('')}</ul></section>` : ''}
      </div><div class="sagk">${!yeni ? '<section class="kart ince"><h2>Mekânları</h2><div class="mini buyuk" id="mini"></div></section>' : ''}</div></div>`,
      `${!yeni ? `<a class="d" href="index.html#kisi-${esc(k.slug)}">${ik('goz', 16)}Sitede gör</a>` : ''}<button type="button" class="d ana-d" id="kaydet">Kaydet</button>`);
    if (!yeni) miniHarita($('#mini'), S.kisiMekanlari(k.id).map((x, i) => ({ m: x.mekan, n: i + 1, renk: '#1F4E8C' })), {});
    const bagla = async (hid, onay) => { const x = S.t.hikaye_kisi.find(y => y.hikaye_id === hid && y.kisi_id === k.id); await S.save('hikaye_kisi', Object.assign({}, x, { onay })); kontrolTaze(); kisiDuzenle(k.id); };
    $$('[data-onay]').forEach(b => b.onclick = () => bagla(b.dataset.onay, 'onaylı'));
    $$('[data-red]').forEach(b => b.onclick = () => bagla(b.dataset.red, 'reddedildi'));
    const mbagla = async (mid, onay) => { const x = S.t.mekan_kisi.find(y => y.mekan_id === mid && y.kisi_id === k.id); await S.save('mekan_kisi', Object.assign({}, x, { onay })); kontrolTaze(); kisiDuzenle(k.id); };
    $$('[data-mk-onay]').forEach(b => b.onclick = () => mbagla(b.dataset.mkOnay, 'onaylı'));
    $$('[data-mk-red]').forEach(b => b.onclick = () => mbagla(b.dataset.mkRed, 'reddedildi'));
    $$('[data-kaldir]').forEach(b => b.onclick = async () => { const x = S.t.hikaye_kisi.find(y => y.hikaye_id === b.dataset.kaldir && y.kisi_id === k.id); await S.remove('hikaye_kisi', x); kisiDuzenle(k.id); });
    $('#k-ad').addEventListener('input', e => { if (yeni) $('#k-slug').value = S.uniqueSlug('kisiler', e.target.value, k.id); });
    const kOku = () => Object.assign(k, { ad: $('#k-ad').value.trim() || k.ad, slug: $('#k-slug').value.trim() || k.slug, yasam: $('#k-yasam').value.trim(), roller: $('#k-roller').value.split(',').map(x => x.trim()).filter(Boolean).join(', '), kisa_bilgi: $('#k-bilgi').value.trim(), bilgi_kaynak: $('#k-bkaynak').value.trim(), durum: $('#k-durum').value });
    vikiOlaylar(k, async d => { kOku(); Object.assign(k, d); await S.save('kisiler', k); kontrolTaze(); bildir(d.vikipedi_onay === 'onaylı' ? 'Vikipedi özeti onaylandı' : 'Kaydedildi'); kisiDuzenle(k.id); });
    $('#kaydet').onclick = async () => {
      Object.assign(k, { ad: $('#k-ad').value.trim(), slug: $('#k-slug').value.trim(), yasam: $('#k-yasam').value.trim(), roller: $('#k-roller').value.split(',').map(x => x.trim()).filter(Boolean).join(', '), kisa_bilgi: $('#k-bilgi').value.trim(), bilgi_kaynak: $('#k-bkaynak').value.trim(), durum: $('#k-durum').value });
      if (!k.ad) return bildir('Ad boş olamaz', true);
      if (!k.slug) k.slug = S.uniqueSlug('kisiler', k.ad, k.id);
      if (S.t.kisiler.some(x => x.slug === k.slug && x.id !== k.id)) return bildir('Bu kalıcı adres başka bir kişide kullanılıyor', true);
      await S.save('kisiler', k); bildir('Kaydedildi'); if (yeni) location.hash = 'kisi-' + k.id.toLowerCase(); else route();
    };
  }

  // ================= GÖRSELLER =================
  const gorselDurum = { f: 'tumu', q: '', n: 60, sec: null };
  function gorsellerSayfasi() {
    const D = gorselDurum, tum = S.t.gorseller;
    const F = { tumu: () => true, ozaman: g => g.donem === 'o zaman', bugun: g => g.donem === 'bugün', altyazi: g => bos(g.altyazi), yil: g => bos(g.yil), izin: g => bos(g.izin), mekansiz: g => !S.ix.mekan.has(g.mekan_id), cozulemeyen: g => !g.drive_id && !g.site_url };
    const uyan = tum.filter(F[D.f] || F.tumu).filter(g => { if (!D.q) return true; const m = S.ix.mekan.get(g.mekan_id); return fold((m ? m.ad : '') + ' ' + g.altyazi + ' ' + g.id).includes(fold(D.q)); });
    const g = D.sec && S.ix.gorsel.get(D.sec);
    const n = k => tum.filter(F[k]).length;
    const coklu = tum.filter(x => x.drive_id).length;
    const m = g && S.ix.mekan.get(g.mekan_id);
    kabuk('gorseller', '<b>Görseller</b>', `<div class="gorsel-duzen"><div class="sol">
      <div class="satir"><h1>Görseller</h1><span class="soluk">${tum.length} görsel · ${coklu} tanesi Google Drive'da</span><div class="sag">${aramaHtml('l-q', D.q, 'Mekân, altyazı ara')}</div></div>
      <div class="filtreler">${filtreHtml([['tumu', 'Tümü', tum.length], ['ozaman', 'O zaman', n('ozaman')], ['bugun', 'Bugün', n('bugun')], ['altyazi', 'Altyazısız', n('altyazi')], ['yil', 'Yılı boş', n('yil')], ['izin', 'İzni belirsiz', n('izin')], ['mekansiz', 'Mekâna bağlı değil', n('mekansiz')], ['cozulemeyen', 'Bağlantısı çözülemeyen', n('cozulemeyen')]], D.f)}</div>
      <div class="gorsel-izgara">${uyan.slice(0, D.n).map(x => { const mm = S.ix.mekan.get(x.mekan_id); const eksik = [bos(x.yil) && 'yıl', bos(x.altyazi) && 'altyazı'].filter(Boolean);
        return `<button type="button" class="gorsel-oge" data-g="${x.id}" aria-pressed="${D.sec === x.id}"><span class="kare">${img(x, 300)}<span>${esc(x.donem)}${x.yil ? ' · ' + esc(x.yil) : ''}</span></span><b>${esc(mm ? mm.ad : 'Mekânsız')}</b><small class="${eksik.length ? '' : 'tamam'}">${eksik.length ? eksik.join(' ve ') + ' yok' : esc(x.altyazi).slice(0, 40)}</small></button>`; }).join('') || '<div class="bos">Görsel yok</div>'}</div>
      ${uyan.length > D.n ? '<button type="button" class="d" id="g-daha" style="align-self:center">Daha fazla göster</button>' : ''}</div>
      <aside aria-label="Seçili görsel">${g ? `<div class="satir"><h2>Görsel bilgisi</h2><button type="button" class="ib sag" id="g-kapat" aria-label="Kapat">${ik('kapat', 16)}</button></div>
        <div class="buyuk-gorsel">${img(g, 800)}</div>
        <div class="mono soluk">${g.id}${g.drive_id ? ` · <a href="${esc(S.driveLink(g))}" target="_blank" rel="noopener">Drive'da aç</a>` : ''}</div>
        ${!g.drive_id && !g.site_url ? `<div class="uyari-bant amber" style="font-size:13px">${ik('uyari')}<span>Tabloda bağlantı yerine şu yazıyor: <span class="mono">${esc(g.ham || '—')}</span>. Dosyayı Drive'da bulup bağlantısını aşağıya yapıştırın.</span></div>` : ''}
        <div class="alan"><label for="g-drive">Drive bağlantısı</label><input id="g-drive" value="${g.drive_id ? esc(S.driveLink(g)) : ''}" placeholder="https://drive.google.com/file/d/…"></div>
        <fieldset style="border:none;margin:0;padding:0"><legend style="margin-bottom:6px">Dönem</legend><div class="segment">${['o zaman', 'bugün'].map(d => `<button type="button" data-donem="${d}" aria-pressed="${g.donem === d}">${d === 'o zaman' ? 'O zaman' : 'Bugün'}</button>`).join('')}</div></fieldset>
        <div class="izgara" style="grid-template-columns:110px 1fr"><div class="alan"><label for="g-yil">Yıl</label><input id="g-yil" value="${esc(g.yil)}"></div>
          <div class="alan"><label for="g-izin">Kullanım izni</label><select id="g-izin" class="${bos(g.izin) ? 'eksik' : ''}">${['', 'Kamu malı', 'İzinli', 'Kaynak gösterilerek', 'İzin bekleniyor'].map(v => `<option value="${v}" ${g.izin === v ? 'selected' : ''}>${v || 'Belirtilmemiş'}</option>`).join('')}</select></div></div>
        <fieldset style="border:none;margin:0;padding:0"><legend style="margin-bottom:6px">Fotoğrafın konusu</legend><div class="segment">${['mekân', 'hikâye'].map(d => `<button type="button" data-konu="${d}" aria-pressed="${(g.konu || 'mekân') === d}">${d === 'mekân' ? 'Mekân' : 'Hikâye / an'}</button>`).join('')}</div></fieldset>
        <div class="alan"><label for="g-kisi">Fotoğrafta görülen kişiler</label><input id="g-kisi" list="g-kisi-liste" value="${esc(String(g.kisi_id || '').split(',').map(x => (S.ix.kisi.get(x.trim()) || {}).ad).filter(Boolean).join(', '))}" placeholder="Ad Soyad, Ad Soyad">
          <datalist id="g-kisi-liste">${S.t.kisiler.map(k => `<option value="${esc(k.ad)}">`).join('')}</datalist><small class="soluk">Virgülle ayırın. Fotoğraf bu kişilerin sayfasında da görünür.</small></div>
        <div class="alan"><label for="g-alt">Altyazı</label><textarea id="g-alt" rows="2" placeholder="Fotoğrafta ne görünüyor?">${esc(g.altyazi)}</textarea></div>
        <div class="alan"><label for="g-kaynak">Görselin kaynağı</label><input id="g-kaynak" value="${esc(g.kaynak)}" placeholder="Arşiv, koleksiyon, fotoğrafçı"></div>
        <div class="alan"><span class="etiket">Bağlı olduğu yerler</span>
          <div class="satir" style="gap:6px">${m ? `<a class="mekan-cip" href="#mekan-${m.id.toLowerCase()}">${ik('pin', 12)}${esc(m.ad)}</a>` : '<span class="cip kirmizi">Mekânsız</span>'}</div>
          <div class="oneri-kutu" id="g-mekan"><label class="sr" for="g-mekan-ara">Mekânı değiştir</label><div class="arama" style="width:100%">${ik('ara', 16)}<input id="g-mekan-ara" placeholder="Mekânı değiştir"></div></div>
          ${m ? `<label for="g-hikaye" style="font-size:13px;font-weight:600;margin-top:6px">Hikâye</label><select id="g-hikaye" class="girdi"><option value="">— yalnız mekâna bağlı —</option>${S.mekanHikayeleri(m.id).map(h => `<option value="${h.id}" ${g.hikaye_id === h.id ? 'selected' : ''}>${esc(h.baslik)} (${h.id})</option>`).join('')}</select>` : ''}</div>
        <button type="button" class="d ana-d" id="g-kaydet">Kaydet</button>
        <div class="uyari-bant gri" style="font-size:13px">${ik('gorsel')}<span>${g.drive_id ? "Görsel Drive'da duruyor. Yayınlarken sitenin kendi depolamasına küçültülüp kopyalanması önerilir; Drive'daki dosya silinse de sitede kalır." : 'Görsel panele yüklendi.'}</span></div>`
        : '<div class="bos">Düzenlemek için bir görsel seçin.</div>'}</aside></div>`);
    listeOlaylari(D, () => gorsellerSayfasi());
    $$('[data-g]').forEach(b => b.onclick = () => { D.sec = b.dataset.g; gorsellerSayfasi(); });
    const dd = $('#g-daha'); if (dd) dd.onclick = () => { D.n += 60; gorsellerSayfasi(); };
    if (!g) return;
    const yeniG = kopya(g);
    $('#g-kapat').onclick = () => { D.sec = null; gorsellerSayfasi(); };
    $$('[data-konu]').forEach(b => b.onclick = () => { yeniG.konu = b.dataset.konu; $$('[data-konu]').forEach(x => x.setAttribute('aria-pressed', x.dataset.konu === yeniG.konu)); });
    $$('[data-donem]').forEach(b => b.onclick = () => { yeniG.donem = b.dataset.donem; $$('[data-donem]').forEach(x => x.setAttribute('aria-pressed', x.dataset.donem === yeniG.donem)); });
    oneriKutusu($('#g-mekan'), q => mekanKaynak(new Set([g.mekan_id]))(q).filter(x => x.tip === 'mevcut'), async x => { yeniG.mekan_id = x.m.id; yeniG.hikaye_id = ''; await S.save('gorseller', yeniG); bildir('Mekân değişti'); gorsellerSayfasi(); });
    $('#g-kaydet').onclick = async () => {
      Object.assign(yeniG, { yil: $('#g-yil').value.trim(), izin: $('#g-izin').value, altyazi: $('#g-alt').value.trim(), kaynak: $('#g-kaynak').value.trim() });
      const adlar = $('#g-kisi').value.split(',').map(x => x.trim()).filter(Boolean), kimlik = [];
      for (const ad of adlar) { const k = S.t.kisiler.find(x => fold(x.ad) === fold(ad)); if (!k) return bildir(`“${ad}” kişiler listesinde yok; önce Kişiler bölümünden ekleyin`, true); kimlik.push(k.id); }
      yeniG.kisi_id = kimlik.join(', ');
      const dl = $('#g-drive').value.trim(); const dm = dl.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || dl.match(/[?&]id=([A-Za-z0-9_-]+)/);
      if (dl && !dm) return bildir('Bu bir Drive dosya bağlantısı değil (…/file/d/… biçiminde olmalı)', true);
      if (dm) { yeniG.drive_id = dm[1]; yeniG.ham = ''; }
      const gh = $('#g-hikaye'); if (gh) yeniG.hikaye_id = gh.value;
      await S.save('gorseller', yeniG); bildir('Kaydedildi'); gorsellerSayfasi();
    };
  }

  // ================= KONTROL KUYRUĞU =================
  const kontrolDurum = { sekme: 'tekrar', sec: 0 };
  function kontrolSayfasi(odak) {
    K = kontrolTaze(); const D = kontrolDurum;
    if (odak) { D.sekme = 'tekrar'; const i = K.tekrar.findIndex(g => g.mekanlar.some(m => m.id === odak)); if (i >= 0) D.sec = i; }
    const sek = [['tekrar', 'Olası tekrar mekân', K.tekrar.length], ['kaynak', 'Kaynağı eksik', K.kaynak.length], ['bugun', 'Bugünkü adı boş', K.bugun.length], ['gorselsiz', 'Görselsiz', K.gorselsiz.length], ['metin', 'Metni boş', K.metin.length], ['koordinat', 'Koordinatsız', K.koordinat.length], ['gorselBag', 'Görsel bağlantısı çözülemeyen', K.gorselBag.length], ['oneri', 'Kişi önerileri', K.oneri.length + K.oneriMk.length], ['vikipedi', 'Vikipedi önerileri', K.vikipedi.length]];
    let govde = '';
    if (D.sekme === 'tekrar') {
      if (D.sec >= K.tekrar.length) D.sec = 0;
      const g = K.tekrar[D.sec];
      govde = `<div class="kuyruk"><ul aria-label="Olası tekrar mekânlar">${K.tekrar.map((x, i) => `<li><button type="button" data-grup="${i}" aria-current="${i === D.sec}"><b>${esc(x.mekanlar[0].ad)}</b><small>${x.mekanlar.length} kayıt · ${x.dmax < 1 ? '0 m' : metreYaz(x.dmax)} · ${esc(x.neden)}</small></button></li>`).join('') || '<li class="bos">Olası tekrar kalmadı.</li>'}</ul>
        <div>${g ? birlestirKart(g) : ''}</div></div>`;
    } else if (D.sekme === 'oneri') {
      const gr = new Map(); K.oneri.forEach(x => { if (!gr.has(x.hikaye_id)) gr.set(x.hikaye_id, []); gr.get(x.hikaye_id).push(x); });
      govde = `<div class="kart"><p class="soluk" style="margin:0">Bu kişilerin adı hikâyenin metninde geçiyor. Bağlanırsa kişinin sayfasında ve haritada bu mekân da görünür. Ad bir ödülün, sokağın ya da kurumun parçası olabilir; okuyup karar verin.</p>
        <ul class="liste">${[...gr.entries()].slice(0, 60).map(([hid, a]) => { const h = S.ix.hikaye.get(hid); return `<li style="flex-wrap:wrap;padding:8px 0"><a class="ad" style="flex:1 1 260px" href="#hikaye-${hid.toLowerCase()}">${esc(h.baslik)}</a>
          ${a.map(x => { const k = S.ix.kisi.get(x.kisi_id); return `<span class="kisi-cip oneri">${esc(k.ad)}<button type="button" class="ib" data-onay="${hid}|${k.id}" aria-label="${esc(k.ad)} bağla">${ik('tamam', 14)}</button><button type="button" class="ib" data-red="${hid}|${k.id}" aria-label="${esc(k.ad)} bağlama">${ik('kapat', 13)}</button></span>`; }).join('')}</li>`; }).join('') || '<li class="bos">Öneri yok.</li>'}</ul>
        ${gr.size > 60 ? `<span class="soluk">+ ${gr.size - 60} hikâye daha</span>` : ''}</div>
        ${(() => { const gm = new Map(); K.oneriMk.forEach(x => { if (!gm.has(x.mekan_id)) gm.set(x.mekan_id, []); gm.get(x.mekan_id).push(x); });
          return gm.size ? `<div class="kart"><div class="satir"><h2>Mekân bilgisinde adı geçen kişiler</h2><span class="soluk sag">${gm.size} mekân</span></div>
          <p class="soluk" style="margin:0">Bu kişilerin adı mekânın genel bilgisinde geçiyor. Bağlanırsa kişi doğrudan bu mekânla ilişkilendirilir.</p>
          <ul class="liste">${[...gm.entries()].slice(0, 60).map(([mid, a]) => { const m = S.ix.mekan.get(mid); return `<li style="flex-wrap:wrap;padding:8px 0"><a class="ad" style="flex:1 1 260px" href="#mekan-${mid.toLowerCase()}">${esc(m.ad)}</a>
            ${a.map(x => { const k = S.ix.kisi.get(x.kisi_id); return `<span class="kisi-cip oneri">${esc(k.ad)}<button type="button" class="ib" data-onay="mk|${mid}|${k.id}" aria-label="${esc(k.ad)} bağla">${ik('tamam', 14)}</button><button type="button" class="ib" data-red="mk|${mid}|${k.id}" aria-label="${esc(k.ad)} bağlama">${ik('kapat', 13)}</button></span>`; }).join('')}</li>`; }).join('')}</ul>
          ${gm.size > 60 ? `<span class="soluk">+ ${gm.size - 60} mekân daha</span>` : ''}</div>` : ''; })()}`;
    } else if (D.sekme === 'vikipedi') {
      govde = `<div class="kart"><p class="soluk" style="margin:0">tools/vikipedi_cek.py'nin bulduğu maddeler. Doğru kişi ya da yer mi, okuyup karar verin; onaylanan özet sitede Vikipedi atfıyla görünür. Yanlışsa reddedin, betik bir daha önermez. Doğru madde başkaysa kaydın ekranından elle verin.</p>
        <ul class="liste">${K.vikipedi.slice(0, 80).map(([t, r]) => `<li style="flex-direction:column;align-items:stretch;gap:6px;padding:12px 0">
          <div class="satir"><span class="cip gri">${t === 'kisiler' ? 'Kişi' : 'Mekân'}</span><a class="ad" href="#${t === 'kisiler' ? 'kisi' : 'mekan'}-${r.id.toLowerCase()}">${esc(r.ad)}</a><span class="soluk">→</span><a href="${esc(r.vikipedi_url)}" target="_blank" rel="noopener"><b>${esc(r.vikipedi_baslik)}</b></a>
            <span class="sag"><button type="button" class="d kucuk ana-d" data-vk="${t}|${r.id}|onaylı">Onayla</button> <button type="button" class="d kucuk duz" data-vk="${t}|${r.id}|reddedildi">Yanlış</button></span></div>
          ${r.vikipedi_neden ? `<span class="soluk" style="font-size:12.5px">${esc(r.vikipedi_neden)}</span>` : ''}
          <span style="font-size:13.5px;line-height:1.5">${esc((r.vikipedi_ozet || '').slice(0, 360))}${(r.vikipedi_ozet || '').length > 360 ? '…' : ''}</span></li>`).join('') || '<li class="bos">Bekleyen öneri yok.</li>'}</ul>
        ${K.vikipedi.length > 80 ? `<span class="soluk">+ ${K.vikipedi.length - 80} öneri daha</span>` : ''}</div>`;
    } else if (D.sekme === 'gorselBag') {
      govde = `<div class="kart"><p class="soluk" style="margin:0">Tabloda bu görsellerin yerinde Drive dosya bağlantısı yerine dosya adı, klasör ya da arama bağlantısı yazıyor. Dosyayı Drive'da bulup görsel ekranında bağlantısını yapıştırın.</p></div>
        <div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>Tabloda yazan</th><th>Dönem</th><th>Mekân</th></tr></thead><tbody>
        ${K.gorselBag.map(g => { const m = S.ix.mekan.get(g.mekan_id); return `<tr><td></td><td><a class="baslik" href="#gorseller" data-gorsel-ac="${g.id}">${esc(g.ham || g.id)}</a></td><td>${esc(g.donem)}</td><td>${m ? `<a href="#mekan-${m.id.toLowerCase()}">${esc(m.ad)}</a>` : '—'}</td></tr>`; }).join('') || '<tr><td colspan="4" class="bos">Kalmadı.</td></tr>'}</tbody></table></div>`;
    } else {
      const rows = K[D.sekme], mekan = D.sekme === 'bugun' || D.sekme === 'koordinat';
      govde = `<div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>${mekan ? 'Mekân' : 'Hikâye'}</th><th>${mekan ? 'İlçe' : 'Mekân'}</th><th>${mekan ? 'Hikâye' : 'Tema'}</th></tr></thead><tbody>
        ${rows.slice(0, 200).map(r => mekan ? `<tr><td></td><td><a class="baslik" href="#mekan-${r.id.toLowerCase()}">${esc(r.ad)}</a></td><td>${esc(r.ilce || '—')}</td><td class="sayi">${S.mekanHikayeleri(r.id).length}</td></tr>`
          : `<tr><td></td><td><a class="baslik" href="#hikaye-${r.id.toLowerCase()}">${esc(r.baslik)}</a><div class="mono soluk">${r.id}</div></td><td>${esc((S.anaMekan(r.id) || {}).ad || '—')}</td><td class="soluk">${esc(r.tema)}</td></tr>`).join('') || '<tr><td colspan="4" class="bos">Bu türde sorun kalmadı.</td></tr>'}</tbody></table></div>`;
    }
    kabuk('kontrol', '<b>Kontrol kuyruğu</b>', `<div><h1>Kontrol kuyruğu</h1><p class="soluk" style="margin:4px 0 0;max-width:760px;line-height:1.5">Eski tablodan taşınan kayıtlarda panelin bulduğu sorunlar. "Ayrı tut" dediğiniz çift bir daha önerilmez.</p></div>
      <div class="sekmeler" role="tablist">${sek.map(([k, l, n]) => `<button type="button" role="tab" data-sekme="${k}" aria-selected="${D.sekme === k}">${l}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</div>${govde}`);
    $$('[data-sekme]').forEach(b => b.onclick = () => { D.sekme = b.dataset.sekme; D.sec = 0; kontrolSayfasi(); });
    $$('[data-gorsel-ac]').forEach(a => a.onclick = () => { gorselDurum.sec = a.dataset.gorselAc; gorselDurum.f = 'cozulemeyen'; gorselDurum.q = ''; });
    $$('[data-grup]').forEach(b => b.onclick = () => { D.sec = +b.dataset.grup; kontrolSayfasi(); });
    const oneriKarar = async (v, onay) => {
      if (v.startsWith('mk|')) { const [, mid, kid] = v.split('|'); const x = S.t.mekan_kisi.find(y => y.mekan_id === mid && y.kisi_id === kid); await S.save('mekan_kisi', Object.assign({}, x, { onay })); kontrolTaze(); return kontrolSayfasi(); }
      const [hid, kid] = v.split('|'); const x = S.t.hikaye_kisi.find(y => y.hikaye_id === hid && y.kisi_id === kid); await S.save('hikaye_kisi', Object.assign({}, x, { onay })); kontrolSayfasi(); };
    $$('[data-onay]').forEach(b => b.onclick = () => oneriKarar(b.dataset.onay, 'onaylı'));
    $$('[data-red]').forEach(b => b.onclick = () => oneriKarar(b.dataset.red, 'reddedildi'));
    $$('[data-vk]').forEach(b => b.onclick = async () => { const [t, id, onay] = b.dataset.vk.split('|'); const row = (t === 'kisiler' ? S.ix.kisi : S.ix.mekan).get(id); await S.save(t, Object.assign(kopya(row), { vikipedi_onay: onay })); kontrolTaze(); kontrolSayfasi(); });
    const bk = $('#birlestir'); if (bk) bk.onclick = () => birlestir(K.tekrar[D.sec]);
    const ay = $('#ayri-tut'); if (ay) ay.onclick = async () => {
      const g = K.tekrar[D.sec];
      for (const m of g.mekanlar) { const x = kopya(m); const set = new Set((x.ayri || '').split(',').filter(Boolean)); g.mekanlar.forEach(o => o.id !== m.id && set.add(o.id)); x.ayri = [...set].join(','); await S.save('mekanlar', x); }
      bildir('Ayrı mekânlar olarak işaretlendi'); kontrolSayfasi();
    };
    const sr = $('#sonra'); if (sr) sr.onclick = () => { D.sec = (D.sec + 1) % Math.max(1, K.tekrar.length); kontrolSayfasi(); };
  }
  function birlestirKart(g) {
    const ms = g.mekanlar;
    const adlar = [...new Set(ms.map(m => m.ad))], adresler = [...new Set(ms.map(m => m.bugunku_ad).filter(Boolean))];
    const hikS = new Set(ms.flatMap(m => S.mekanHikayeleri(m.id).map(h => h.id))).size, gorS = ms.reduce((a, m) => a + S.mekanGorselleri(m.id).length, 0);
    const kilitli = ms.filter(m => m.karekod_basildi === 'evet');
    return `<section class="kart"><div class="satir"><h2 style="font-size:18px">${esc(ms[0].ad)}</h2><span class="soluk">${ms.length} kayıt · ${esc(g.neden)} · en uzak ${g.dmax < 1 ? '0 m' : metreYaz(g.dmax)}</span></div>
      <div class="tablo-kap" style="border:none"><table class="tablo" style="min-width:640px"><thead><tr><th></th><th>Mekân adı (yazıldığı gibi)</th><th>Bugünkü adı</th><th>Hikâyeler</th><th>Görsel</th></tr></thead><tbody>
      ${ms.map(m => `<tr><td class="mono soluk">${m.id}</td><td><a class="baslik" href="#mekan-${m.id.toLowerCase()}">${esc(m.ad)}</a></td><td class="soluk">${esc(m.bugunku_ad || '—')}</td><td>${S.mekanHikayeleri(m.id).map(h => `<div style="font-size:13px">${esc(h.baslik)}</div>`).join('')}</td><td class="sayi">${S.mekanGorselleri(m.id).length}</td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;padding:14px;border-radius:8px;background:#F4F7FB;border:1px solid #D4DEEC">
        <fieldset class="secim" style="flex:1 1 260px;border:none;margin:0;padding:0"><legend style="margin-bottom:8px">Birleşik mekânın adı</legend>${adlar.map((a, i) => `<label><input type="radio" name="b-ad" value="${esc(a)}" ${i === 0 ? 'checked' : ''}>${esc(a)}</label>`).join('')}</fieldset>
        <fieldset class="secim" style="flex:1 1 260px;border:none;margin:0;padding:0"><legend style="margin-bottom:8px">Bugünkü adı / adresi</legend>${(adresler.length ? adresler : ['']).map((a, i) => `<label><input type="radio" name="b-adres" value="${esc(a)}" ${i === 0 ? 'checked' : ''}>${esc(a || '(boş)')}</label>`).join('')}</fieldset>
        <fieldset class="secim" style="flex:1 1 100%;border:none;margin:0;padding:0"><legend style="margin-bottom:8px">Kalan kayıt (konumu ve kalıcı adresi korunur)</legend>${ms.map((m, i) => `<label><input type="radio" name="b-kalan" value="${m.id}" ${(kilitli[0] ? m.id === kilitli[0].id : i === 0) ? 'checked' : ''}>${m.id} · #mekan-${esc(m.slug)}${m.karekod_basildi === 'evet' ? ' · karekod basıldı' : ''}</label>`).join('')}</fieldset>
        <div style="flex:1 1 100%;padding-top:10px;border-top:1px solid #D4DEEC">Sonuç: <b>1 mekân · ${hikS} hikâye · ${gorS} görsel</b>. Diğer kayıtlar silinmez; arşive alınır ve adresleri kalan mekâna yönlendirilir.</div></div>
      <div class="satir"><button type="button" class="d ana-d" id="birlestir">${ik('birlestir', 16)}Tek mekânda birleştir</button><button type="button" class="d" id="ayri-tut">Ayrı mekânlar</button><button type="button" class="d duz" id="sonra">Sonraya bırak</button></div></section>`;
  }
  async function birlestir(g) {
    const ad = ($('input[name=b-ad]:checked') || {}).value, adres = ($('input[name=b-adres]:checked') || {}).value, kalanId = ($('input[name=b-kalan]:checked') || {}).value;
    const kalan = kopya(S.ix.mekan.get(kalanId)); kalan.ad = ad || kalan.ad; kalan.bugunku_ad = adres ?? kalan.bugunku_ad;
    try {
      await S.save('mekanlar', kalan);
      for (const m of g.mekanlar) {
        if (m.id === kalan.id) continue;
        for (const x of S.t.hikaye_mekan.filter(y => y.mekan_id === m.id)) {
          await S.remove('hikaye_mekan', x);
          if (!S.t.hikaye_mekan.some(y => y.hikaye_id === x.hikaye_id && y.mekan_id === kalan.id)) await S.save('hikaye_mekan', Object.assign({}, x, { mekan_id: kalan.id }));
        }
        for (const gg of S.t.gorseller.filter(y => y.mekan_id === m.id)) await S.save('gorseller', Object.assign({}, gg, { mekan_id: kalan.id }));
        for (const x of S.t.mekan_kisi.filter(y => y.mekan_id === m.id)) {
          await S.remove('mekan_kisi', x);
          if (!S.t.mekan_kisi.some(y => y.mekan_id === kalan.id && y.kisi_id === x.kisi_id)) await S.save('mekan_kisi', Object.assign({}, x, { mekan_id: kalan.id }));
        }
        if (m.aciklama && !(kalan.aciklama || '').includes(m.aciklama)) { kalan.aciklama = [kalan.aciklama, m.aciklama].filter(Boolean).join('\n\n'); if (m.aciklama_kaynak && !(kalan.aciklama_kaynak || '').includes(m.aciklama_kaynak)) kalan.aciklama_kaynak = [kalan.aciklama_kaynak, m.aciklama_kaynak].filter(Boolean).join(' · '); await S.save('mekanlar', kalan); }
        await S.save('mekanlar', Object.assign(kopya(m), { durum: 'arsiv', yonlendir: kalan.id }));
      }
      bildir(`${g.mekanlar.length} kayıt "${kalan.ad}" altında birleşti`); kontrolSayfasi();
    } catch (e) { bildir('Birleştirilemedi: ' + e.message, true); }
  }

  // ================= AYARLAR / SHEETS =================
  function ayarlarSayfasi() {
    const anahtar = (() => { try { return localStorage.getItem('hafiza-panel-anahtar') || ''; } catch (e) { return ''; } })();
    const say = S.TABLES.map(n => [n, S.t[n].length]);
    kabuk('ayarlar', '<b>Sheets ve ayarlar</b>', `<h1>Google Sheets bağlantısı</h1>
      <section class="kart"><div class="satir"><h2>Durum</h2></div>
        ${S.backend.kind === 'sheets' ? `<div class="uyari-bant mavi">${ik('sheet')}<span>Panel <span class="mono">${esc(S.cfg.sheetsUrl)}</span> adresindeki Apps Script üzerinden tabloya bağlı.</span></div>`
          : `<div class="uyari-bant amber">${ik('sheet')}<span><b>Önizleme modu.</b> Google Sheets bağlı değil; kayıtlar ${S.backend.kind === 'db' ? 'bu önizleme sayfasının veritabanında' : 'yalnız bu tarayıcıda'} tutuluyor ve "Siteyi yayınla" ile önizleme sitesine geçiyor.</span></div>`}
        <div class="sheets-sekmeler">${say.map(([n, c]) => `<span>${n} · ${c}</span>`).join('')}</div>
        <ol style="margin:0;padding-left:20px;line-height:1.7">
          <li><span class="mono">data/sheets/</span> klasöründeki yedi CSV dosyasını yeni bir Google Sheets dosyasına, her biri ayrı sekme olacak şekilde içe aktarın (sekme adları dosya adlarıyla aynı).</li>
          <li>Sheets'te <i>Uzantılar → Apps Script</i> açın, <span class="mono">apps-script/Code.gs</span> içeriğini yapıştırın; <i>Proje ayarları → Komut dosyası özellikleri</i>'ne <span class="mono">PANEL_ANAHTARI</span> ekleyin.</li>
          <li><i>Dağıt → Yeni dağıtım → Web uygulaması</i> (erişim: herkes). Verilen adresi <span class="mono">config.js</span> içindeki <span class="mono">sheetsUrl</span>'e yazın.</li>
          <li>Siteyi yayınlamak için GitHub'daki "Veriyi Sheets'ten güncelle" iş akışı çalışır; ayrıntılar README'de.</li></ol></section>
      <section class="kart"><h2>Panel anahtarı</h2><p class="soluk" style="margin:0">Sheets'e yazmak için gerekir; yalnız bu tarayıcıda saklanır.</p>
        <div class="satir"><label class="sr" for="anahtar">Panel anahtarı</label><input id="anahtar" type="password" class="girdi" style="max-width:320px" value="${esc(anahtar)}"><button type="button" class="d" id="anahtar-kaydet">Kaydet</button></div></section>
      ${S.backend.kind !== 'sheets' ? `<section class="kart"><h2>Taslaklar</h2><p class="soluk" style="margin:0">${S.unpublished()} kaydedilmiş ama yayınlanmamış değişiklik var.</p><div class="satir"><button type="button" class="d tehlike" id="taslak-sil" ${S.unpublished() ? '' : 'disabled'}>Yayınlanmamış değişiklikleri sil</button></div></section>` : ''}`);
    $('#anahtar-kaydet').onclick = () => { try { localStorage.setItem('hafiza-panel-anahtar', $('#anahtar').value); bildir('Kaydedildi'); } catch (e) { bildir('Bu tarayıcı saklamaya izin vermiyor', true); } };
    const ts = $('#taslak-sil'); if (ts) ts.onclick = async () => { const r = await pencere('Taslakları sil', 'Yayınlanmamış tüm değişiklikler silinecek. Geri alınamaz.', [{ t: 'Vazgeç' }, { t: 'Sil', cls: 'tehlike' }]); if (r.i === 1) { await S.discardDrafts(); kontrolTaze(); ayarlarSayfasi(); bildir('Taslaklar silindi'); } };
  }

  function bulunamadi() { kabuk('', '<b>Bulunamadı</b>', '<div class="bos">Bu kayıt yok. <a href="#hikayeler">Hikâyelere dön</a></div>'); }

  // ================= YÖNLENDİRME =================
  let sonHash = null;
  async function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'hikayeler';
    if (ayrilmaKontrol && ayrilmaKontrol() && h !== sonHash) {
      const r = await pencere('Kaydedilmemiş değişiklikler', 'Bu ekranda kaydedilmemiş değişiklikler var. Çıkarsanız kaybolacak.', [{ t: 'Ekranda kal' }, { t: 'Kaydetmeden çık', cls: 'tehlike' }]);
      if (r.i !== 1) { history.replaceState(null, '', '#' + sonHash); return; }
    }
    ayrilmaKontrol = null; sonHash = h; haritaTemizle(); window.scrollTo(0, 0);
    const [tur, ...rest] = h.split('-'); const id = rest.join('-').toUpperCase();
    document.title = 'Panel — Hafıza İstanbul';
    if (h === 'hikayeler') return hikayelerSayfasi();
    if (h === 'mekanlar') return mekanlarSayfasi();
    if (h === 'kisiler') return kisilerSayfasi();
    if (h === 'gorseller') return gorsellerSayfasi();
    if (h === 'kontrol') return kontrolSayfasi();
    if (h === 'ayarlar') return ayarlarSayfasi();
    if (h.startsWith('kontrol-tekrar-')) return kontrolSayfasi(h.slice(15).toUpperCase());
    if (h === 'yeni-hikaye') { await hikayeDuzenle(null); if (yeniHikayeMekan) { yeniHikayeMekan = null; } return; }
    if (h === 'yeni-mekan') return mekanDuzenle(null);
    if (h === 'yeni-kisi') return kisiDuzenle(null);
    if (tur === 'hikaye') return hikayeDuzenle(id);
    if (tur === 'mekan') return mekanDuzenle(id);
    if (tur === 'kisi') return kisiDuzenle(id);
    bulunamadi();
  }

  (async function () {
    document.body.innerHTML = '<div class="bos" style="padding:80px">Panel yükleniyor…</div>';
    try { await S.load('panel'); }
    catch (e) { document.body.innerHTML = `<div class="bos" style="padding:80px"><h1>Veri yüklenemedi</h1><p>${esc(e.message)}</p><p>Google Sheets adresini ve panel anahtarını kontrol edin.</p></div>`; return; }
    kontrolTaze();
    window.addEventListener('hashchange', route);
    window.addEventListener('beforeunload', e => { if (ayrilmaKontrol && ayrilmaKontrol()) { e.preventDefault(); e.returnValue = ''; } });
    route();
  })();
})();
