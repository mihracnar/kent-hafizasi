/**
 * Hafıza İstanbul — Google Sheets arka ucu (Apps Script web uygulaması).
 *
 * Kurulum:
 *  1. data/sheets/*.csv dosyalarını bir Google Sheets dosyasına, her biri ayrı sekme olacak şekilde aktarın.
 *     Sekme adları: mekanlar, hikayeler, kisiler, gorseller, hikaye_mekan, hikaye_kisi, temalar
 *  2. Uzantılar → Apps Script → bu dosyayı yapıştırın.
 *  3. Proje ayarları → Komut dosyası özellikleri:
 *       PANEL_ANAHTARI   panelin yazarken gönderdiği gizli anahtar (zorunlu)
 *       GORSEL_KLASORU   yüklenen fotoğrafların konacağı Drive klasörünün kimliği (isteğe bağlı)
 *       GITHUB_REPO      ör. mihracnar/kent-hafizasi (isteğe bağlı, "Siteyi yayınla" için)
 *       GITHUB_TOKEN     yalnız bu depoda "contents: read/write" ve "actions" izni olan ince ayarlı jeton
 *  4. Dağıt → Yeni dağıtım → Web uygulaması: "Beni olarak çalıştır", erişim "Herkes".
 *     Verilen /exec adresini config.js içindeki sheetsUrl alanına yazın.
 *
 * Okuma herkese açıktır ama anahtarsız okumada iç alanlar (veri giren, not, konu notu…) gönderilmez.
 * Yazma, silme, yükleme ve yayınlama anahtar ister.
 */
var TABLOLAR = ['mekanlar', 'hikayeler', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi', 'temalar'];
var ANAHTAR_SUTUNLARI = { hikaye_mekan: ['hikaye_id', 'mekan_id'], hikaye_kisi: ['hikaye_id', 'kisi_id'], mekan_kisi: ['mekan_id', 'kisi_id'], temalar: ['ad'] };
var SAYI_SUTUNLARI = { enlem: 1, boylam: 1, sira: 1, kaynak_satir: 1 };
// Yalnız panelin görmesi gereken iç alanlar: anahtarsız okumada (site, herkes) gönderilmez.
var IC_ALANLAR = { kaynak_sekme: 1, kaynak_satir: 1, giren: 1, giris_tarihi: 1, konu_notu: 1, not: 1, tabela_ham: 1, koordinat_ham: 1, ham: 1, kaynak_kayitlar: 1, kayit_notlari: 1, vikipedi_neden: 1 };

function doGet(e) {
  var p = (e && e.parameter) || {};
  if ((p.action || 'all') !== 'all') return json_({ ok: false, error: 'bilinmeyen işlem' });
  var anahtar = PropertiesService.getScriptProperties().getProperty('PANEL_ANAHTARI');
  var tam = !!anahtar && p.key === anahtar;
  var out = {};
  TABLOLAR.forEach(function (t) {
    var rows = oku_(t);
    if (!tam) rows = rows.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (!IC_ALANLAR[k]) o[k] = r[k]; }); return o; });
    out[t] = rows;
  });
  out.tam = tam;
  return json_(out);
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'geçersiz istek' }); }
  var anahtar = PropertiesService.getScriptProperties().getProperty('PANEL_ANAHTARI');
  if (!anahtar || body.key !== anahtar) return json_({ ok: false, error: 'Panel anahtarı yanlış ya da tanımlı değil' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'upsert') { yaz_(body.table, body.row); return json_({ ok: true }); }
    if (body.action === 'delete') { sil_(body.table, body.row); return json_({ ok: true }); }
    if (body.action === 'upload') return json_({ ok: true, drive_id: yukle_(body.name, body.data) });
    if (body.action === 'publish') return json_(yayinla_());
    return json_({ ok: false, error: 'bilinmeyen işlem' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally { lock.releaseLock(); }
}

function sayfa_(t) {
  if (TABLOLAR.indexOf(t) < 0) throw new Error('bilinmeyen tablo: ' + t);
  var sh = SpreadsheetApp.getActive().getSheetByName(t);
  if (!sh) throw new Error('"' + t + '" sekmesi yok');
  return sh;
}
function oku_(t) {
  var sh = SpreadsheetApp.getActive().getSheetByName(t);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getValues(), h = v.shift().map(String);
  return v.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {};
    h.forEach(function (k, i) {
      if (!k || k.charAt(0) === '_') return; // "_" ile başlayan sütunlar yalnız okumaya yardımcı formüllerdir
      var x = r[i];
      if (SAYI_SUTUNLARI[k]) x = (x === '' || x === null) ? null : Number(String(x).replace(',', '.'));
      else x = (x === null || x === undefined) ? '' : String(x);
      o[k] = x;
    });
    return o;
  });
}
function anahtar_(t, row) { return (ANAHTAR_SUTUNLARI[t] || ['id']).map(function (k) { return String(row[k]); }).join('__'); }
function satirBul_(sh, t, row) {
  var v = sh.getDataRange().getValues(), h = v[0].map(String), ks = ANAHTAR_SUTUNLARI[t] || ['id'], want = anahtar_(t, row);
  var idx = ks.map(function (k) { return h.indexOf(k); });
  for (var i = 1; i < v.length; i++) {
    if (idx.map(function (j) { return String(v[i][j]); }).join('__') === want) return { satir: i + 1, basliklar: h };
  }
  return { satir: -1, basliklar: h };
}
function yaz_(t, row) {
  var sh = sayfa_(t), f = satirBul_(sh, t, row), h = f.basliklar;
  Object.keys(row).forEach(function (k) { if (h.indexOf(k) < 0) { h.push(k); sh.getRange(1, h.length).setValue(k); } });
  var satir = f.satir;
  if (satir < 0) { satir = sh.getLastRow() + 1; }
  h.forEach(function (k, i) {
    if (!k) return;
    if (k.charAt(0) === '_') { // yardımcı formülü bir üst satırdan kopyala, kullanıcı formülüne dokunma
      if (f.satir < 0 && satir > 2) sh.getRange(satir - 1, i + 1).copyTo(sh.getRange(satir, i + 1));
      return;
    }
    if (!(k in row)) return;
    var x = row[k];
    sh.getRange(satir, i + 1).setValue(x === null || x === undefined ? '' : x);
  });
}
function sil_(t, row) { var sh = sayfa_(t), f = satirBul_(sh, t, row); if (f.satir > 0) sh.deleteRow(f.satir); }
function yukle_(ad, dataUrl) {
  var m = String(dataUrl).match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) throw new Error('görsel verisi okunamadı');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], ad || 'bugun.jpg');
  var kid = PropertiesService.getScriptProperties().getProperty('GORSEL_KLASORU');
  var dosya = kid ? DriveApp.getFolderById(kid).createFile(blob) : DriveApp.createFile(blob);
  dosya.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return dosya.getId();
}
function yayinla_() {
  var p = PropertiesService.getScriptProperties(), repo = p.getProperty('GITHUB_REPO'), tok = p.getProperty('GITHUB_TOKEN');
  if (!repo || !tok) return { ok: false, error: 'GITHUB_REPO ve GITHUB_TOKEN tanımlı değil; iş akışını GitHub\'dan elle çalıştırın.' };
  var r = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ event_type: 'sheets-yayin' })
  });
  if (r.getResponseCode() >= 300) return { ok: false, error: 'GitHub: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200) };
  return { ok: true };
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
