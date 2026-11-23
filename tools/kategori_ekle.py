"""Excel'e yeni kategori alanlarını ekler (bir kez çalıştırılır; tekrar çalıştırmak zararsızdır).

  mekanlar.tur, mekanlar.yapi_durumu   ← tools/mekan_tur.txt
  hikayeler.konular                    ← tools/hikaye_konu.txt
  kisiler.meslekler                    ← tools/kisi_meslek.txt
  gorseller.tur                        ← tools/gorsel_tur.txt
  gorseller.yil (boşsa)                ← tools/gorsel_yil.txt
  yeni sekmeler: mekan_gruplari, mekan_turleri, listeler (temalar sekmesi kalkar)

Eski tema, alt_temalar, roller ve mekânın dönemi silinmez; ekip içi (kahverengi) sütunlara taşınır.
Excel'de zaten dolu olan bir alan karar dosyasıyla ezilmez. Hücre değerleri olduğu gibi taşınır.
Önce dosyanın yedeği alınır: hafiza-veri.yedek-<tarih>.xlsx

Kullanım:  python tools/kategori_ekle.py [hafiza-veri.xlsx]
"""
import sys, csv, shutil, subprocess, datetime, pathlib
from openpyxl import load_workbook
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kategoriler as K

ROOT = pathlib.Path(__file__).resolve().parent.parent
XLSX = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data_ozel' / 'hafiza-veri.xlsx'
SHEETS = ROOT / 'data_ozel' / 'sheets'; SHEETS.mkdir(parents=True, exist_ok=True)
TOOLS = ROOT / 'tools'
SAYI = {'enlem', 'boylam', 'sira', 'kaynak_satir'}

wb = load_workbook(XLSX, data_only=True, read_only=True)
def oku(ad):
    it = wb[ad].iter_rows(values_only=True)
    bas = [str(h).strip() if h is not None else '' for h in next(it)]
    rows = []
    for r in it:
        if not any(v not in (None, '') for v in r): continue
        o = {}
        for k, v in zip(bas, r):
            if not k or k.startswith('_'): continue
            if v is None: v = ''
            elif k in SAYI: v = repr(v) if isinstance(v, float) else str(v)
            elif isinstance(v, float) and v.is_integer(): v = str(int(v))
            else: v = str(v)
            o[k] = v
        rows.append(o)
    return [b for b in bas if b and not b.startswith('_')], rows

T = {ad: oku(ad) for ad in ('hikayeler', 'mekanlar', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi')}
for ad in ('mekan_gruplari', 'mekan_turleri', 'listeler'):
    if ad in wb.sheetnames: T[ad] = oku(ad)
wb.close()

say = {}
def doldur(tablo, alan, kararlar, donustur=lambda x: x):
    n = 0
    for r in T[tablo][1]:
        if (r.get(alan) or '').strip(): continue
        v = kararlar.get(r['id'])
        if v is None: continue
        v = donustur(v)
        if v: r[alan] = v; n += 1
    say[f'{tablo}.{alan}'] = n

mt = K.karar_oku(TOOLS / 'mekan_tur.txt')
doldur('mekanlar', 'tur', mt, lambda v: v[0])
doldur('mekanlar', 'yapi_durumu', mt, lambda v: (v[1] if len(v) > 1 else '').lower())
doldur('hikayeler', 'konular', K.karar_oku(TOOLS / 'hikaye_konu.txt'), lambda v: v[0])
doldur('kisiler', 'meslekler', K.karar_oku(TOOLS / 'kisi_meslek.txt'), lambda v: v[0])
doldur('gorseller', 'tur', K.karar_oku(TOOLS / 'gorsel_tur.txt'), lambda v: v[0])
doldur('gorseller', 'yil', K.karar_oku(TOOLS / 'gorsel_yil.txt'), lambda v: v[0])

def yaz(ad, alanlar, rows):
    with open(SHEETS / f'{ad}.csv', 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=alanlar, extrasaction='ignore'); w.writeheader()
        for r in rows: w.writerow({k: r.get(k, '') for k in alanlar})

for ad in ('hikayeler', 'mekanlar', 'kisiler', 'gorseller'):
    var, rows = T[ad]
    sira = K.SUTUNLAR[ad] + [k for k in var if k not in K.SUTUNLAR[ad]]  # bilinmeyen sütun varsa sona
    yaz(ad, sira, rows)
for ad in ('hikaye_mekan', 'hikaye_kisi', 'mekan_kisi'):
    yaz(ad, *T[ad])
yaz('mekan_gruplari', ['ad', 'renk', 'sira'], T['mekan_gruplari'][1] if 'mekan_gruplari' in T else K.grup_satirlari())
yaz('mekan_turleri', ['ad', 'grup', 'sira'], T['mekan_turleri'][1] if 'mekan_turleri' in T else K.tur_satirlari())
yaz('listeler', ['liste', 'deger', 'sira'], T['listeler'][1] if 'listeler' in T else K.liste_satirlari())

yedek = XLSX.with_name(XLSX.stem + '.yedek-' + datetime.datetime.now().strftime('%Y%m%d-%H%M') + '.xlsx')
shutil.copy2(XLSX, yedek)
subprocess.run([sys.executable, str(TOOLS / 'excel_olustur.py'), str(XLSX)], check=True)
print('yedek:', yedek.name)
print('doldurulan:', say)
