"""Excel'deki yeni veri modelini (hafiza-veri.xlsx) okuyup sitenin ve panelin dosyalarını yazar.

  data/*.json       herkese açık site verisi (iç alanlar ve bağlantısı olmayan görseller yok)
  data_ozel/*.json  yalnız panelin okuduğu iç alanlar

Önce denetler: tekrar eden kimlik ve kalıcı adres, var olmayan kayda bağ, geçersiz liste değeri, koordinat aralığı.
Hata varsa hiçbir şey yazmaz. "_" ile başlayan yardımcı sütunlar okunmaz.

Kullanım:  python tools/excel_to_json.py [hafiza-veri.xlsx]
"""
import sys, json, pathlib, re
from openpyxl import load_workbook

ROOT = pathlib.Path(__file__).resolve().parent.parent
XLSX = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data_ozel' / 'hafiza-veri.xlsx'
SEKMELER = ['mekanlar', 'hikayeler', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi', 'temalar']
SAYI = {'enlem', 'boylam', 'sira', 'kaynak_satir'}
IC = {'kaynak_sekme', 'kaynak_satir', 'giren', 'giris_tarihi', 'konu_notu', 'not', 'tabela_ham', 'koordinat_ham', 'ham', 'kaynak_kayitlar', 'kayit_notlari', 'vikipedi_neden'}
LISTE = {('hikayeler', 'durum'): {'yayinda', 'taslak', 'arsiv'}, ('mekanlar', 'durum'): {'yayinda', 'taslak', 'arsiv'}, ('kisiler', 'durum'): {'yayinda', 'taslak'},
         ('hikayeler', 'donem'): {'', '1900 Öncesi', '1901 - 1950', '1951 - 1990', '1991 Sonrası'},
         ('mekanlar', 'tabela'): {'', 'evet', 'hayır'}, ('mekanlar', 'karekod_basildi'): {'', 'evet', 'hayır'}, ('gorseller', 'donem'): {'o zaman', 'bugün'}, ('gorseller', 'konu'): {'', 'mekân', 'hikâye'},
         ('hikaye_mekan', 'rol'): {'ana', 'geçtiği'}, ('hikaye_kisi', 'onay'): {'onaylı', 'öneri', 'reddedildi'}, ('mekan_kisi', 'onay'): {'onaylı', 'öneri', 'reddedildi'},
         ('mekanlar', 'donem'): {'', '1900 Öncesi', '1901 - 1950', '1951 - 1990', '1991 Sonrası'},
         ('kisiler', 'vikipedi_onay'): {'', 'öneri', 'onaylı', 'reddedildi'}, ('mekanlar', 'vikipedi_onay'): {'', 'öneri', 'onaylı', 'reddedildi'}}

VIKI = ('vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet')
if not XLSX.exists():
    sys.exit(f'Excel dosyası bulunamadı: {XLSX}\nDosyayı bu konuma koyun ya da yolunu verin: python tools/excel_to_json.py <dosya.xlsx>')
wb = load_workbook(XLSX, data_only=True, read_only=True)
T = {}
for ad in SEKMELER:
    if ad not in wb.sheetnames: sys.exit(f'"{ad}" sekmesi yok' + (' — bu sekme mekân bilgisi ayrımıyla eklendi; yeni hafiza-veri.xlsx dosyasını kullanın' if ad == 'mekan_kisi' else ''))
    it = wb[ad].iter_rows(values_only=True)
    basliklar = [str(h).strip() if h is not None else '' for h in next(it)]
    rows = []
    for r in it:
        if not any(v not in (None, '') for v in r): continue
        o = {}
        for k, v in zip(basliklar, r):
            if not k or k.startswith('_'): continue
            if k in SAYI:
                if v in (None, ''): v = None
                else:
                    f = float(str(v).replace(',', '.')); v = int(f) if k in ('sira', 'kaynak_satir') else f
            else:
                v = '' if v is None else (str(int(v)) if isinstance(v, float) and v.is_integer() else str(v))
            o[k] = v
        rows.append(o)
    T[ad] = rows

# ---------- denetim ----------
hata, uyari = [], []
def tekil(ad, alan):
    gor = {}
    for i, r in enumerate(T[ad], 2):
        v = r.get(alan, '')
        if not v: hata.append(f'{ad} satır {i}: {alan} boş'); continue
        if v in gor: hata.append(f'{ad} satır {i}: {alan} "{v}" satır {gor[v]} ile aynı')
        gor[v] = i
for ad in ('mekanlar', 'hikayeler', 'kisiler', 'gorseller'): tekil(ad, 'id')
for ad in ('mekanlar', 'hikayeler', 'kisiler'): tekil(ad, 'slug')
ids = {ad: {r['id'] for r in T[ad]} for ad in ('mekanlar', 'hikayeler', 'kisiler')}
def bag(ad, alan, hedef, bos_olabilir=False):
    for i, r in enumerate(T[ad], 2):
        v = r.get(alan, '')
        if not v and bos_olabilir: continue
        if v not in ids[hedef]: hata.append(f'{ad} satır {i}: {alan} "{v}" {hedef} sekmesinde yok')
bag('hikaye_mekan', 'hikaye_id', 'hikayeler'); bag('hikaye_mekan', 'mekan_id', 'mekanlar')
bag('hikaye_kisi', 'hikaye_id', 'hikayeler'); bag('hikaye_kisi', 'kisi_id', 'kisiler')
bag('mekan_kisi', 'mekan_id', 'mekanlar'); bag('mekan_kisi', 'kisi_id', 'kisiler')
bag('gorseller', 'mekan_id', 'mekanlar'); bag('gorseller', 'hikaye_id', 'hikayeler', bos_olabilir=True)
_kid = {str(k.get('id')) for k in T['kisiler']}
for i, g in enumerate(T['gorseller']):
    for k in [x.strip() for x in str(g.get('kisi_id') or '').split(',') if x.strip()]:
        if k not in _kid: hata.append(f"gorseller satır {i+2}: kisi_id '{k}' kisiler sekmesinde yok")
for (ad, alan), izin in LISTE.items():
    for i, r in enumerate(T[ad], 2):
        if r.get(alan, '') not in izin: hata.append(f'{ad} satır {i}: {alan} "{r.get(alan)}" geçersiz (izinli: {", ".join(sorted(x for x in izin if x))})')
temalar = {t['ad'] for t in T['temalar']}
for sk in ('hikayeler', 'mekanlar'):
    for i, r in enumerate(T[sk], 2):
        if r.get('tema') and r['tema'] not in temalar: hata.append(f'{sk} satır {i}: tema "{r["tema"]}" temalar sekmesinde yok')
for i, m in enumerate(T['mekanlar'], 2):
    if m.get('enlem') is not None and not (40.5 <= m['enlem'] <= 41.7 and 27.9 <= (m.get('boylam') or 0) <= 30.0):
        uyari.append(f'mekanlar satır {i}: koordinat İstanbul dışında görünüyor ({m["enlem"]}, {m.get("boylam")})')
cift = set()
for i, r in enumerate(T['hikaye_mekan'], 2):
    k = (r['hikaye_id'], r['mekan_id'])
    if k in cift: hata.append(f'hikaye_mekan satır {i}: aynı bağ iki kez')
    cift.add(k)
cift = set()
for i, r in enumerate(T['mekan_kisi'], 2):
    k = (r['mekan_id'], r['kisi_id'])
    if k in cift: hata.append(f'mekan_kisi satır {i}: aynı bağ iki kez')
    cift.add(k)
mekansiz = ids['hikayeler'] - {r['hikaye_id'] for r in T['hikaye_mekan']}
if mekansiz: uyari.append(f'{len(mekansiz)} hikâyenin mekânı yok (sitede görünmez): ' + ', '.join(sorted(mekansiz)[:10]))

for u in uyari: print('uyarı:', u)
if hata:
    print(f'\n{len(hata)} hata bulundu, hiçbir dosya yazılmadı:')
    for h in hata[:60]: print('  -', h)
    if len(hata) > 60: print(f'  … ve {len(hata) - 60} hata daha')
    sys.exit(1)

# ---------- yaz ----------
def jyaz(yol, rows):
    yol.write_text('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False) for r in rows) + '\n]\n', encoding='utf-8')
(ROOT / 'data').mkdir(exist_ok=True); (ROOT / 'data_ozel').mkdir(exist_ok=True)
for ad, rows in T.items():
    acik = [{k: v for k, v in r.items() if k not in IC} for r in rows]
    if ad == 'gorseller': acik = [g for g in acik if g.get('drive_id') or g.get('site_url')]
    if ad in ('kisiler', 'mekanlar'):  # onaylanmamış Vikipedi önerisi herkese açık veriye girmez (panel tam hâlini data_ozel'den okur)
        acik = [r if r.get('vikipedi_onay') == 'onaylı' else dict(r, **{k: '' for k in VIKI if k in r}) for r in acik]
    jyaz(ROOT / 'data' / f'{ad}.json', acik)
    if ad in ('mekanlar', 'hikayeler', 'gorseller', 'kisiler'):
        jyaz(ROOT / 'data_ozel' / f'{ad}.json', [dict({k: r.get(k, '') for k in r if k in IC or (k in VIKI and r.get('vikipedi_onay') != 'onaylı')}, id=r['id']) for r in rows])
jyaz(ROOT / 'data_ozel' / 'gorseller_tum.json', [{k: v for k, v in g.items() if k not in IC} for g in T['gorseller']])
print({ad: len(r) for ad, r in T.items()})
print('data/*.json ve data_ozel/*.json yazıldı.')
