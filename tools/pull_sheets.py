"""Google Sheets'teki (Apps Script web uygulaması) tabloları çekip sitenin okuduğu data/*.json dosyalarını yazar.

Kullanım:
  SHEETS_URL=https://script.google.com/macros/s/.../exec python tools/pull_sheets.py
  python tools/pull_sheets.py --gorselleri-kopyala   # Drive görsellerini assets/gorsel/ altına küçültüp kopyalar

--gorselleri-kopyala: site_url'ü boş olan her görseli Drive'ın görsel adresinden (lh3.googleusercontent.com) indirir (dosyanın
"bağlantıya sahip herkes görüntüleyebilir" olması gerekir) ve site_url alanını depodaki dosyaya çevirir.
Böylece Drive'daki dosya silinse ya da taşınsa da sitede kalır.
"""
import json, os, sys, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
TABLOLAR = ['mekanlar', 'hikayeler', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi', 'temalar']
url = os.environ.get('SHEETS_URL')
if not url: sys.exit('SHEETS_URL tanımlı değil')
with urllib.request.urlopen(url + ('&' if '?' in url else '?') + 'action=all', timeout=120) as r:
    veri = json.load(r)
eksik = [t for t in TABLOLAR if t not in veri]
if eksik: sys.exit('Sheets yanıtında eksik sekme: ' + ', '.join(eksik))
if '--gorselleri-kopyala' in sys.argv:
    hedef = ROOT / 'assets/gorsel'; hedef.mkdir(parents=True, exist_ok=True)
    for g in veri['gorseller']:
        if g.get('site_url') or not g.get('drive_id'): continue
        dosya = hedef / f"{g['drive_id']}.jpg"
        if not dosya.exists():
            try:
                with urllib.request.urlopen(f"https://lh3.googleusercontent.com/d/{g['drive_id']}", timeout=60) as r:
                    dosya.write_bytes(r.read())
            except Exception as e:
                print('indirilemedi', g['id'], e); continue
        g['site_url'] = f"assets/gorsel/{g['drive_id']}.jpg"
IC = {'kaynak_sekme', 'kaynak_satir', 'giren', 'giris_tarihi', 'konu_notu', 'not', 'tabela_ham', 'koordinat_ham', 'ham', 'kaynak_kayitlar', 'kayit_notlari', 'vikipedi_neden'}
for t in TABLOLAR:  # Apps Script anahtarsız okumada iç alanları zaten göndermez; yine de ayıkla
    veri[t] = [{k: v for k, v in r.items() if k not in IC} for r in veri[t]]
veri['gorseller'] = [g for g in veri['gorseller'] if g.get('drive_id') or g.get('site_url')]
VIKI = ('vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet')  # onaylanmamış Vikipedi önerisi siteye gitmez
for t in ('kisiler', 'mekanlar'):
    veri[t] = [r if r.get('vikipedi_onay') == 'onaylı' else dict(r, **{k: '' for k in VIKI if k in r}) for r in veri[t]]
(ROOT / 'data').mkdir(exist_ok=True)
for t in TABLOLAR:
    rows = veri[t]
    (ROOT / 'data' / f'{t}.json').write_text('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False) for r in rows) + '\n]\n', encoding='utf-8')
print({t: len(veri[t]) for t in TABLOLAR})
