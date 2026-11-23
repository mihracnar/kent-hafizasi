"""Yeni veri modelini düzenlenebilir bir Excel dosyasına yazar: data_ozel/sheets/*.csv → hafiza-veri.xlsx

Sekme ve sütun adları Google Sheets'e geçildiğinde Apps Script'in (apps-script/Code.gs) beklediğiyle aynıdır.
Adı "_" ile başlayan sütunlar okumayı kolaylaştıran otomatik formüllerdir; betikler bunları okumaz.

Kullanım:  python tools/excel_olustur.py [çıktı.xlsx]
"""
import csv, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kategoriler as KAT
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'data_ozel' / 'sheets'
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data_ozel' / 'hafiza-veri.xlsx'
SEKMELER = KAT.SEKMELER
SAYI = {'enlem', 'boylam', 'sira', 'kaynak_satir'}
GENISLIK = {'id': 9, 'slug': 28, 'baslik': 40, 'ad': 34, 'metin': 70, 'kaynak': 45, 'bugunku_ad': 34, 'alt_temalar': 28, 'drive_id': 36,
            'konu_notu': 34, 'not': 34, 'tema': 26, 'altyazi': 30, 'kisa_bilgi': 40, 'roller': 24, 'koordinat_ham': 26, 'ham': 30, 'site_url': 24, 'aciklama': 70, 'aciklama_kaynak': 40, 'kaynak_kayitlar': 26, 'kayit_notlari': 40, 'iliski': 20, 'vikipedi_ozet': 60, 'vikipedi_baslik': 28, 'vikipedi_url': 30, 'vikipedi_neden': 40, 'vikipedi_onay': 14, 'wikidata': 12, 'kisi_id': 18, 'konu': 10, 'bilgi_kaynak': 40,
            'tur': 14, 'yapi_durumu': 12, 'konular': 28, 'meslekler': 28, 'grup': 14, 'liste': 14, 'deger': 22, 'renk': 10}
LISTE = {('hikayeler', 'durum'): 'yayinda,taslak,arsiv', ('mekanlar', 'durum'): 'yayinda,taslak,arsiv', ('kisiler', 'durum'): 'yayinda,taslak',
         ('hikayeler', 'donem'): '1900 Öncesi,1901 - 1950,1951 - 1990,1991 Sonrası',
         ('mekanlar', 'tabela'): 'evet,hayır', ('mekanlar', 'karekod_basildi'): 'evet,hayır', ('gorseller', 'donem'): 'o zaman,bugün', ('gorseller', 'konu'): 'mekân,hikâye',
         ('gorseller', 'izin'): 'Kamu malı,İzinli,Kaynak gösterilerek,İzin bekleniyor', ('hikaye_mekan', 'rol'): 'ana,geçtiği',
         ('hikaye_kisi', 'onay'): 'onaylı,öneri,reddedildi', ('mekan_kisi', 'onay'): 'onaylı,öneri,reddedildi',
         ('mekanlar', 'donem'): '1900 Öncesi,1901 - 1950,1951 - 1990,1991 Sonrası',
         ('kisiler', 'vikipedi_onay'): 'öneri,onaylı,reddedildi', ('mekanlar', 'vikipedi_onay'): 'öneri,onaylı,reddedildi',
         ('mekanlar', 'yapi_durumu'): ','.join(KAT.YAPI_DURUMU), ('gorseller', 'tur'): ','.join(KAT.GORSEL_TURLERI),
         ('mekan_turleri', 'grup'): ','.join(g for g, _ in KAT.GRUPLAR), ('listeler', 'liste'): 'hikaye_konu,meslek'}
# yardımcı sütunlar: (sütun adı, kimlik sütunu, hedef sekme, hedef sütun)
YARDIM = {'hikaye_mekan': [('_hikaye', 'hikaye_id', 'hikayeler', 'baslik'), ('_mekan', 'mekan_id', 'mekanlar', 'ad')],
          'hikaye_kisi': [('_hikaye', 'hikaye_id', 'hikayeler', 'baslik'), ('_kisi', 'kisi_id', 'kisiler', 'ad')],
          'mekan_kisi': [('_mekan', 'mekan_id', 'mekanlar', 'ad'), ('_kisi', 'kisi_id', 'kisiler', 'ad')],
          'gorseller': [('_mekan', 'mekan_id', 'mekanlar', 'ad'), ('_hikaye', 'hikaye_id', 'hikayeler', 'baslik')]}
ACIKLAMA = {'id': 'Değişmez kimlik. Yeni satırda bir sonraki numarayı verin (ör. H-0820). Asla yeniden kullanmayın.',
            'slug': 'Kalıcı adres (#hikaye-…, #mekan-…). Yayınlandıktan sonra değiştirmeyin; karekodlar buna gider.',
            'durum': 'yayinda: sitede görünür · taslak: görünmez · arsiv: kaldırıldı (silmek yerine)',
            'drive_id': 'Drive dosya kimliği: drive.google.com/file/d/<BU KISIM>/view',
            'sira': 'Hikâyenin geçtiği mekânların metindeki sırası (1, 2, 3…)',
            'rol': 'ana: hikâyenin asıl mekânı · geçtiği: hikâyede geçen diğer mekânlar',
            'onay': 'onaylı: sitede görünür · öneri: ad metinde geçiyor, kontrol bekliyor · reddedildi: bağlanmasın',
            'karekod_basildi': 'evet yapılınca slug değiştirilmemeli.',
            'aciklama': 'Mekânın genel bilgisi: yeri tanıtan metin (kim yaptırdı, kim yaşadı, ne oldu). Olay ve anlatılar hikayeler sekmesine girer. Paragrafları boş satırla ayırın.',
            'iliski': 'İsteğe bağlı kısa not: yaşadı, doğdu, atölyesi…',
            'altyazi': 'Fotoğrafın altyazısı: fotoğrafta ne/kim görülüyor.',
            'vikipedi_onay': 'tools/vikipedi_cek.py öneri yazar. Doğru maddeyse onaylı yapın; ancak o zaman özet sitede (Vikipedi atfıyla) görünür. Yanlışsa reddedildi: betik bir daha önermez.',
            'vikipedi_ozet': 'Türkçe Vikipedi maddesinin giriş paragrafı (CC BY-SA 4.0). Elle değiştirmeyin; ekibin metni kisa_bilgi / aciklama sütununa yazılır.',
            'tur': 'mekanlar: mekânın türü, mekan_turleri sekmesindeki listeden tek değer; haritadaki renk türün grubundan gelir. gorseller: Fotoğraf, Kartpostal, Resim, Gravür, Harita, Gazete ya da Belge.',
            'yapi_durumu': 'Yapı bugün ayakta mı: ayakta / yıkıldı. Bilinmiyorsa boş bırakın.',
            'konular': 'Hikâyenin konuları, listeler sekmesindeki hikaye_konu değerlerinden; birden çoksa virgülle (Edebiyat, Siyaset).',
            'meslekler': 'Kişinin meslekleri, listeler sekmesindeki meslek değerlerinden; birden çoksa virgülle (Yazar, Gazeteci).',
            'tema': 'Eski sınıflama, yalnız ekip içi kayıt. Sitede kullanılmaz.', 'alt_temalar': 'Eski sınıflama, yalnız ekip içi kayıt. Sitede kullanılmaz.',
            'roller': 'Eski sınıflama, yalnız ekip içi kayıt. Sitede meslekler sütunu kullanılır.'}

AR = 'Arial'
BASLIK = Font(name=AR, bold=True, color='FFFFFF'); BASLIK_DOLGU = PatternFill('solid', fgColor='141414')
IC_DOLGU = PatternFill('solid', fgColor='7A5300'); YARDIM_DOLGU = PatternFill('solid', fgColor='8A8A84')
GOVDE = Font(name=AR, size=10); YARDIM_FONT = Font(name=AR, size=10, color='6E6E6E', italic=True)

def oku(ad):
    with open(SRC / f'{ad}.csv', encoding='utf-8-sig') as fh:
        rd = csv.DictReader(fh); return rd.fieldnames, list(rd)

wb = Workbook(); wb.remove(wb.active)
# --- Oku beni
ok = wb.create_sheet('Oku beni')
satirlar = [
    ('Hafıza İstanbul — veri', ''),
    ('Bu dosya sitenin ve içerik panelinin tek kaynağıdır. Sonra Google Sheets\'e yüklenecek; sekme ve sütun adlarını değiştirmeyin.', ''),
    ('', ''),
    ('Sekme', 'Ne tutar'),
    ('hikayeler', 'Her satır bir hikâye. Mekânları hikaye_mekan, kişileri hikaye_kisi sekmesinde bağlanır.'),
    ('mekanlar', 'Her satır bir yer: koordinat, bugünkü adı, kalıcı adresi (slug), tabela/karekod bilgisi ve aciklama sütununda mekânın genel bilgisi.'),
    ('kisiler', 'Mekânlarla ve hikâyelerle ilişkili kişiler. Kişinin mekânları mekan_kisi bağlarından ve hikâyelerinden bulunur. vikipedi_* sütunları Vikipedi önerisidir; onaylanmadan sitede görünmez.'),
    ('gorseller', 'Her satır bir fotoğraf (Drive kimliğiyle). donem: o zaman / bugün. Bir mekâna, isteğe bağlı bir hikâyeye bağlı. konu: mekân (yerin fotoğrafı) / hikâye (bir an, olay, film sahnesi). kisi_id: fotoğrafta görülen kişiler, virgülle (K-001, K-002); fotoğraf o kişilerin sayfasında da görünür. altyazi: fotoğrafta ne görüldüğü.'),
    ('hikaye_mekan', 'Hangi hikâye hangi mekânlarda geçiyor (çoktan çoğa). sira: metindeki sıra.'),
    ('hikaye_kisi', 'Hangi hikâyede hangi kişi anlatılıyor. onay sütunu önerileri ayırır.'),
    ('mekan_kisi', 'Hangi kişi hangi mekânla doğrudan ilişkili (burada yaşadı, evi, atölyesi…). onay sütunu önerileri ayırır.'),
    ('mekan_gruplari', 'Mekân türü grupları (Konut, Dinî yapı, Kamu…) ve haritadaki renkleri.'),
    ('mekan_turleri', 'mekanlar.tur sütununun izinli değerleri ve her türün grubu. Yeni tür gerekirse buraya satır ekleyin.'),
    ('listeler', 'Çok seçimli alanların izinli değerleri: hikaye_konu (hikayeler.konular) ve meslek (kisiler.meslekler).'),
    ('', ''),
    ('Kurallar', ''),
    ('1', 'id değişmez ve tekrar kullanılmaz. Bağlar hep id ile kurulur, satır numarasıyla değil.'),
    ('2', 'Bir hücreye tek değer: bir fotoğraf bir satır, bir bağ bir satır.'),
    ('3', 'Silmek yerine durum = arsiv yapın.'),
    ('4', 'Siyah başlıklı sütunlar herkese açık site verisidir. Kahverengi başlıklılar (veri giren, not, konu notu, ham değerler, eski tema ve rol sınıflaması) ekip içidir; sitede görünmez.'),
    ('5', 'Gri başlıklı, "_" ile başlayan sütunlar formüldür ve yalnız okumayı kolaylaştırır; yeni satırda üstteki hücreden aşağı çekin. Betikler bu sütunları okumaz.'),
    ('6', 'Açılır listeli hücrelerde yalnız listedeki değerler geçerlidir (durum, dönem, rol, onay, tür…). Çok seçimli alanlarda (konular, meslekler) değerler virgülle ayrılır ve listeler sekmesinde bulunmalıdır.'),
    ('', ''),
    ('Genel bilgi mi, hikâye mi?', 'Yeri tanıtan bilgi (kim yaptırdı, kim yaşadı, ne zaman yıkıldı) mekanlar → aciklama sütununa; o yerde yaşanmış bir olay ya da anlatı hikayeler sekmesine. Yalnız fotoğrafı anlatan metin gorseller → altyazi sütununa.'),
    ('Yeni hikâye eklemek', 'hikayeler\'e bir satır (yeni id, slug, baslik, metin…) + hikaye_mekan\'a en az bir satır (hikaye_id, mekan_id, sira 1, rol ana).'),
    ('Siteyi güncellemek', 'python tools/excel_to_json.py  — dosyayı okur, denetler ve data/*.json dosyalarını yazar.'),
]
for r in satirlar: ok.append(list(r))
KALIN = {'A4', 'B4', 'A16', 'A24', 'A25', 'A26'}
for row in ok.iter_rows():
    for c in row:
        c.font = Font(name=AR, size=11, bold=c.coordinate in KALIN)
        c.alignment = Alignment(wrap_text=True, vertical='top')
ok['A1'].font = Font(name=AR, bold=True, size=16)
ok.column_dimensions['A'].width = 22; ok.column_dimensions['B'].width = 110

sayac = {}
for ad in SEKMELER:
    alanlar, rows = oku(ad)
    ws = wb.create_sheet(ad)
    yardim = YARDIM.get(ad, [])
    basliklar = alanlar + [y[0] for y in yardim]
    ws.append(basliklar)
    for r in rows:
        out = []
        for k in alanlar:
            v = r.get(k, '')
            if k in SAYI and v not in ('', None):
                f = float(v); v = int(f) if f.is_integer() and k != 'enlem' and k != 'boylam' else f
            elif v in (None,): v = ''
            out.append(v if v != '' else None)
        ws.append(out)
    n = len(rows) + 1
    for j, k in enumerate(basliklar, 1):
        c = ws.cell(row=1, column=j); c.font = BASLIK
        c.fill = YARDIM_DOLGU if k.startswith('_') else IC_DOLGU if KAT.ic(ad, k) else BASLIK_DOLGU
        c.alignment = Alignment(vertical='center')
        if k in ACIKLAMA: c.comment = Comment(ACIKLAMA[k], 'Hafıza İstanbul')
        ws.column_dimensions[get_column_letter(j)].width = GENISLIK.get(k, 16 if not k.startswith('_') else 30)
        if k not in SAYI:
            for i in range(2, n + 1): ws.cell(row=i, column=j).number_format = '@'
    # yardımcı formüller
    for (yad, anahtar, hedef, hsutun) in yardim:
        j = basliklar.index(yad) + 1; aj = get_column_letter(basliklar.index(anahtar) + 1)
        hal, _ = oku(hedef)
        hid = get_column_letter(hal.index('id') + 1); hcol = get_column_letter(hal.index(hsutun) + 1)
        for i in range(2, n + 1):
            c = ws.cell(row=i, column=j)
            c.value = f'=IF({aj}{i}="","",IFERROR(INDEX({hedef}!${hcol}:${hcol},MATCH({aj}{i},{hedef}!${hid}:${hid},0)),"⚠ bulunamadı"))'
            c.number_format = 'General'; c.font = YARDIM_FONT
    for row in ws.iter_rows(min_row=2, max_row=n):
        for c in row:
            if not str(c.value or '').startswith('=IF('): c.font = GOVDE
    # açılır listeler
    for (s, k), liste in LISTE.items():
        if s == ad and k in basliklar:
            col = get_column_letter(basliklar.index(k) + 1)
            dv = DataValidation(type='list', formula1=f'"{liste}"', allow_blank=True, showErrorMessage=True, errorTitle='Geçersiz değer', error='Listeden bir değer seçin.')
            ws.add_data_validation(dv); dv.add(f'{col}2:{col}{n + 500}')
    if ad == 'mekanlar' and 'tur' in basliklar:
        col = get_column_letter(basliklar.index('tur') + 1)
        dv = DataValidation(type='list', formula1='mekan_turleri!$A$2:$A$200', allow_blank=True, showErrorMessage=True, errorTitle='Geçersiz tür', error='mekan_turleri sekmesindeki bir türü seçin.')
        ws.add_data_validation(dv); dv.add(f'{col}2:{col}{n + 500}')
    ws.freeze_panes = 'B2'; ws.auto_filter.ref = f'A1:{get_column_letter(len(basliklar))}{n}'
    sayac[ad] = len(rows)

wb.save(OUT)
print(OUT, sayac)
