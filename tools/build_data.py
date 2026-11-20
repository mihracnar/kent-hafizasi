"""Hafıza İstanbul — eski tablodan yeni veri modeline taşıma.

Kaynak: Google Sheets "hafıza noktaları" tablosunun iki sekmesi, CSV olarak indirilmiş hâlde
  kaynak/tum_veri.csv    ("Tüm Veri" sekmesi)
  kaynak/kayip_eser.csv  ("Kayıp Eser" sekmesi)
(Sheets: Dosya → İndir → Virgülle ayrılmış değerler; her sekme ayrı indirilir.)
Eski sitede olup bu iki sekmede bulunmayan kayıtlar assets/geojson/data_v2.geojson'dan alınır.

Çıktı:
  data/*.json             site ve panelin okuduğu herkese açık tablolar (iç alanlar yok)
  data_ozel/*.json        yalnız panelin okuduğu iç alanlar (veri giren, not, konu notu, ham değerler)
  data_ozel/sheets/*.csv  yeni Google Sheets dosyasına aktarılacak tam tablolar
kaynak/ ve data_ozel/ depoya girmez (.gitignore): ekip adları ve iç notlar içerir.

Kullanım:  python tools/build_data.py
"""
import csv, json, re, math, pathlib, unicodedata, collections
ROOT = pathlib.Path(__file__).resolve().parent.parent
KAYNAK = ROOT / 'kaynak'
OUT = ROOT / 'data'; OZEL = ROOT / 'data_ozel'
for d in (OUT, OZEL, OZEL / 'sheets'): d.mkdir(parents=True, exist_ok=True)

TR = str.maketrans({'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
                    'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u'})
CP = str.maketrans({'\x91': "'", '\x92': "'", '\x93': '“', '\x94': '”', '\x96': '–', '\x97': '—', '\x85': '…', '\x95': '•'})
def slugify(s):
    s = unicodedata.normalize('NFKD', s.translate(TR)).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')[:70].strip('-') or 'kayit'
def tek(s): return ' '.join((s or '').translate(CP).split())
def satirlar(s): return ' · '.join(x.strip() for x in (s or '').translate(CP).splitlines() if x.strip())
def metin(s): return re.sub(r'\n{3,}', '\n\n', (s or '').translate(CP).strip())
def norm(s): return ' '.join((s or '').translate(CP).replace('’', "'").replace('‘', "'").split()).casefold()
class Sluglar:
    def __init__(self): self.used = set()
    def __call__(self, s):
        b = slugify(s); x = b; n = 2
        while x in self.used: x = f'{b}-{n}'; n += 1
        self.used.add(x); return x

DRIVE = re.compile(r'https?://drive\.google\.com/file/d/([A-Za-z0-9_-]+)[^\s,]*')
def fotolar(hucre):
    """Hücredeki Drive dosya kimlikleri ve çözülemeyen başvurular (dosya adı, klasör/arama bağlantısı, başka adres)."""
    h = (hucre or '').strip()
    ids = DRIVE.findall(h)
    kalan = DRIVE.sub('', h)
    ref = [x.strip(' ,;') for x in re.split(r'\n+', kalan) if x.strip(' ,;')]
    return ids, ref

def koordinat(s):
    s = (s or '').strip()
    m = re.search(r'@(-?\d+\.\d+),\s*(-?\d+\.\d+)', s) or re.search(r'[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)', s) \
        or re.search(r'(-?\d{1,2}[.,]\d{3,})\s*[,;\s]\s*(-?\d{1,2}[.,]\d{3,})', s)
    if not m: return None, None
    a, b = float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))
    if 40 <= a <= 42 and 27 <= b <= 31: return round(a, 7), round(b, 7)
    if 40 <= b <= 42 and 27 <= a <= 31: return round(b, 7), round(a, 7)
    return None, None

def tabela(s):
    t = tek(s).casefold()
    if t.startswith('evet') or t.startswith('mevcut'): return 'evet'
    if t.startswith('hayır'): return 'hayır'
    return ''

TEMALAR = [('Şahıs', '#9B4444', 1), ('Gündelik Yaşam ve Kent Belleği', '#B8862E', 2), ('Mimarlık ve Şehircilik', '#4F8A8F', 3), ('Tarihsel Anekdot', '#754E1A', 4)]
DONEMLER = ['1900 Öncesi', '1901 - 1950', '1951 - 1990', '1991 Sonrası']
# Vikipedi önerileri tools/vikipedi_cek.py ile Excel'e yazılır; panelde onaylanmadan sitede görünmez
VIKI_BOS = {'vikipedi_onay': '', 'vikipedi_baslik': '', 'vikipedi_url': '', 'wikidata': '', 'vikipedi_ozet': ''}
ROL_DISI = {'Fotoğraf Hikayesi', 'Ofis/Atölye', 'Tarihi Yapı Hikayesi', 'Sokaklar ve Meydanlar', 'Eğlence ve Boş Zaman', 'Dini Yapılar', 'Mezar/Hazire', 'Yıkım', 'Siyaset', 'Basın'}

# ---------- kaynak satırları ----------
def oku(dosya, sekme):
    out = []
    with open(KAYNAK / dosya, encoding='utf-8') as fh:
        rd = csv.reader(fh); h = [x.split('\n')[0].strip() for x in next(rd)]
        for i, r in enumerate(rd):
            if not any(c.strip() for c in r): continue
            d = dict(zip(h, r + [''] * (len(h) - len(r))))
            if not (d.get('Mekan', '').strip() or d.get('Metin', '').strip()): continue
            d['_sekme'], d['_satir'] = sekme, i + 2
            out.append(d)
    return out
kayitlar = oku('tum_veri.csv', 'Tüm Veri') + oku('kayip_eser.csv', 'Kayıp Eser')
# eski sitede olup tabloda karşılığı olmayan kayıtlar
v2 = json.load(open(ROOT / 'assets/geojson/data_v2.geojson', encoding='utf-8'))['features']
metinler = {norm(k['Metin']) for k in kayitlar if k['Metin'].strip()}
mekanlar_ad = {norm(k['Mekan']) for k in kayitlar}
for j, f in enumerate(v2):
    p = f['properties']
    if norm(p.get('Metin')) in metinler or norm(p.get('Mekan')) in mekanlar_ad: continue  # tabloda aynı ad ya da metin varsa tablodaki güncel hâli geçerli
    eski_ids = set(i for s in (p.get('Eski_Fotograf_Linki') or []) for i in DRIVE.findall(s))
    if eski_ids and any(eski_ids & set(DRIVE.findall(k.get('Eski Fotoğraf Linki', ''))) for k in kayitlar): continue
    g = f.get('geometry')
    kayitlar.append({'_sekme': 'eski site', '_satir': j, 'Tema': p.get('Tema', ''), 'Alt Tema': p.get('Alt_Tema', ''), 'Mekan': p.get('Mekan', ''),
                     'Mekanın Bugünkü Adı': p.get('Mekanin_Bugunku_Adi', ''), 'Eski Fotoğraf Linki': '\n'.join(p.get('Eski_Fotograf_Linki') or []),
                     'Metin': p.get('Metin', ''), 'Kaynak': p.get('Kaynak', ''), 'İlçe': p.get('Ilce', ''),
                     'Harita Linki/Koordinat': f"{g['coordinates'][1]}, {g['coordinates'][0]}" if g else ''})

# ---------- tablolar ----------
mekanlar, hikayeler, gorseller, hm, hk = [], [], [], [], []
mslug, hslug, kslug = Sluglar(), Sluglar(), Sluglar()
mkey, gor_ids, cozulemeyen = {}, set(), []
for n, k in enumerate(kayitlar, 1):
    ad = tek(k.get('Mekan')) or tek(k.get('S Kolonu'))[:80] or 'Adsız kayıt'
    lat, lon = koordinat(k.get('Harita Linki/Koordinat'))
    key = (round(lon, 6) if lon is not None else ('yok', n), round(lat, 6) if lat is not None else None, ad.casefold())
    if key not in mkey:
        m = {'id': f'M-{len(mekanlar)+1:04d}', 'slug': mslug(ad), 'ad': ad, 'bugunku_ad': satirlar(k.get('Mekanın Bugünkü Adı')),
             'ilce': tek(k.get('İlçe')), 'enlem': lat, 'boylam': lon, 'tabela': tabela(k.get('Tabela Yapılabilir mi?')),
             'karekod_basildi': 'hayır', 'durum': 'yayinda',
             '_ozel': {'tabela_ham': tek(k.get('Tabela Yapılabilir mi?')), 'koordinat_ham': tek(k.get('Harita Linki/Koordinat')) if lat is None else ''}}
        mekanlar.append(m); mkey[key] = m
    m = mkey[key]
    if not m['bugunku_ad']: m['bugunku_ad'] = satirlar(k.get('Mekanın Bugünkü Adı'))
    if not m['tabela']: m['tabela'] = tabela(k.get('Tabela Yapılabilir mi?'))
    hid = f'H-{n:04d}'
    tarih = tek(k.get('Spesifik bir Tarih Varsa Tarih'))
    donem = tek(k.get('Dönem'))
    eksik = not tek(k.get('Metin')) or lat is None
    h = {'id': hid, 'slug': hslug(ad), 'baslik': ad, 'yil': tarih if re.fullmatch(r'\d{4}', tarih) else '', 'tarih': tarih,
         'donem': donem if donem in DONEMLER else '', 'tema': tek(k.get('Tema')),
         'alt_temalar': ', '.join(x.strip() for x in (k.get('Alt Tema') or '').split(',') if x.strip()),
         'metin': metin(k.get('Metin')), 'kaynak': metin(k.get('Kaynak')), 'durum': 'taslak' if eksik else 'yayinda',
         '_ozel': {'kaynak_sekme': k['_sekme'], 'kaynak_satir': k['_satir'], 'giren': tek(k.get('İsim')), 'giris_tarihi': tek(k.get('Veri Giriş Tarihi')),
                   'konu_notu': tek(k.get('S Kolonu')), 'not': metin(k.get('Not'))}}
    hikayeler.append(h)
    hm.append({'hikaye_id': hid, 'mekan_id': m['id'], 'sira': 1, 'rol': 'ana'})
    for donem_g, sutun in (('o zaman', 'Eski Fotoğraf Linki'), ('bugün', 'Güncel Fotoğraf Linki')):
        ids, ref = fotolar(k.get(sutun))
        sira = 0
        for fid in ids:
            if fid in gor_ids: continue
            gor_ids.add(fid); sira += 1
            gorseller.append({'id': f'G-{len(gorseller)+1:04d}', 'drive_id': fid, 'site_url': '', 'donem': donem_g, 'yil': '', 'altyazi': '',
                              'kaynak': '', 'izin': '', 'mekan_id': m['id'], 'hikaye_id': hid, 'kisi_id': '', 'konu': '', 'sira': sira, '_ozel': {'ham': ''}})
        for r in ref:
            sira += 1
            gorseller.append({'id': f'G-{len(gorseller)+1:04d}', 'drive_id': '', 'site_url': '', 'donem': donem_g, 'yil': '', 'altyazi': '',
                              'kaynak': '', 'izin': '', 'mekan_id': m['id'], 'hikaye_id': hid, 'kisi_id': '', 'konu': '', 'sira': sira, '_ozel': {'ham': r}})
            cozulemeyen.append(r)

# 1923 hikâyesi: metinde geçen semtler mekân olarak bağlanır (hikâye–mekân çoktan çoğa örneği)
h1923 = next((h for h in hikayeler if h['baslik'] == 'Galata Köprüsü' and '3. Kolordu' in h['metin']), None)
if h1923:
    def bul(ad): return next((m for m in mekanlar if m['ad'] == ad), None)
    hm[:] = [x for x in hm if x['hikaye_id'] != h1923['id']]
    for s, (ad, lon, lat, ilce) in enumerate([('Gebze', 29.4300, 40.8028, 'Gebze'), ('Pendik', 29.2330, 40.8770, 'Pendik'), ('Bostancı', 29.0950, 40.9580, 'Kadıköy'),
                                               ('Göztepe', 29.0620, 40.9780, 'Kadıköy'), ('Kadıköy', 29.0250, 40.9905, 'Kadıköy'), ('Haydarpaşa Garı', None, None, None),
                                               ('Galata Köprüsü', None, None, None), ('Beyoğlu', 28.9775, 41.0340, 'Beyoğlu')], 1):
        m = bul(ad)
        if not m:
            m = {'id': f'M-{len(mekanlar)+1:04d}', 'slug': mslug(ad), 'ad': ad, 'bugunku_ad': ad, 'ilce': ilce, 'enlem': lat, 'boylam': lon,
                 'tabela': '', 'karekod_basildi': 'hayır', 'durum': 'yayinda', '_ozel': {'tabela_ham': '', 'koordinat_ham': ''}}
            mekanlar.append(m)
        hm.append({'hikaye_id': h1923['id'], 'mekan_id': m['id'], 'sira': s, 'rol': 'ana' if ad == 'Galata Köprüsü' else 'geçtiği'})

# ---------- kişiler (tools/kisi_eslesme.txt, elle okunarak hazırlandı) ----------
hid_by = {(h['_ozel']['kaynak_sekme'], str(h['_ozel']['kaynak_satir'])): h['id'] for h in hikayeler}
kmap, bulunamayan = {}, []
for line in (ROOT / 'tools/kisi_eslesme.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    sekme, satir, adlar = line.split(':', 2)
    hid = hid_by.get((sekme.strip(), satir.strip()))
    if not hid: bulunamayan.append(line); continue
    for ad in [x.strip() for x in adlar.split(';') if x.strip()]:
        if ad not in kmap: kmap[ad] = {'id': f'K-{len(kmap)+1:03d}', 'slug': kslug(ad), 'ad': ad, 'yasam': '', 'roller': '', 'kisa_bilgi': '', 'bilgi_kaynak': '', 'durum': 'yayinda', **VIKI_BOS}
        if not any(x['hikaye_id'] == hid and x['kisi_id'] == kmap[ad]['id'] for x in hk):
            hk.append({'hikaye_id': hid, 'kisi_id': kmap[ad]['id'], 'onay': 'onaylı'})
kisiler = list(kmap.values())
for k in kisiler: k['_ozel'] = {'vikipedi_neden': ''}
H = {h['id']: h for h in hikayeler}
for k in kisiler:
    roller = []
    for x in hk:
        if x['kisi_id'] != k['id'] or sum(1 for y in hk if y['hikaye_id'] == x['hikaye_id']) > 1: continue
        roller += [r.strip() for r in H[x['hikaye_id']]['alt_temalar'].split(',') if r.strip() and r.strip() not in ROL_DISI]
    k['roller'] = ', '.join(dict.fromkeys(roller))
# öneri: kişinin tam adı başka bir hikâyenin metninde geçiyorsa (panelde okunup onaylanır)
def sade(s): return s.replace('â', 'a').replace('Â', 'A').replace('î', 'i').replace('û', 'u')
var = {(x['hikaye_id'], x['kisi_id']) for x in hk}
for k in kisiler:
    if len(k['ad'].split()) < 2: continue
    pat = re.compile(r'(?<![\wçğıöşüÇĞİÖŞÜ])' + re.escape(sade(k['ad'])) + r'(?![a-zçğıöşü])')
    for h in hikayeler:
        if (h['id'], k['id']) not in var and pat.search(sade(h['metin'])):
            hk.append({'hikaye_id': h['id'], 'kisi_id': k['id'], 'onay': 'öneri'}); var.add((h['id'], k['id']))

temalar = [{'ad': a, 'renk': r, 'sira': s} for a, r, s in TEMALAR]

# ---------- hikâye / mekân bilgisi / foto altyazısı ayrımı (tools/hikaye_ayrim.txt, metinler tek tek okunarak) ----------
# M: metin mekânın genel bilgisine (aciklama) gider · F: kaydın ilk 'o zaman' fotoğrafının altyazısı olur
# S A B | x: metin x'in başladığı yerden bölünür, cümleler değiştirilmez · hikâye parçası kalmayan kayıt hikâye olmaktan çıkar,
# kişi bağları mekâna (mekan_kisi) taşınır, görseller mekânda kalır.
for m in mekanlar:
    m.update({'aciklama': '', 'aciklama_kaynak': '', 'tema': '', 'alt_temalar': '', 'donem': '', **VIKI_BOS})
    m['_ozel']['vikipedi_neden'] = ''
    m['_ozel'].update({'kaynak_kayitlar': '', 'kayit_notlari': ''})
ayrim = {}
for line in (ROOT / 'tools/hikaye_ayrim.txt').read_text(encoding='utf-8').splitlines():
    line = line.split('    #')[0].strip()
    if not line or line.startswith('#'): continue
    sekme, satir, karar = line.split(':', 2)
    ayrim[(sekme.strip(), satir.strip())] = karar.strip()
M_ = {m['id']: m for m in mekanlar}
ana = {x['hikaye_id']: x['mekan_id'] for x in hm if x['rol'] == 'ana'}
mk, cikan, ayrim_say = [], set(), collections.Counter()
def ekle(m, alan, metin_, ayrac='\n\n'):
    if metin_ and metin_ not in m[alan]: m[alan] = (m[alan] + ayrac + metin_) if m[alan] else metin_
for h in hikayeler:
    o = h['_ozel']; karar = ayrim.pop((o['kaynak_sekme'], str(o['kaynak_satir'])), None)
    if not karar: continue
    t = h['metin']
    if karar.startswith('S'):
        tip, x = karar[1:].split('|', 1); a, b = tip.split(); x = x.strip()
        assert t.count(x) == 1, (h['id'], x)
        i = t.index(x); parcalar = [(a, t[:i].strip()), (b, t[i:].strip())]
    else:
        parcalar = [(karar, t)]
    ayrim_say[karar.split('|')[0].strip()] += 1
    m = M_[ana[h['id']]]
    hik = [p for k_, p in parcalar if k_ == 'H']
    for k_, p in parcalar:
        if k_ == 'M':
            ekle(m, 'aciklama', p); ekle(m, 'aciklama_kaynak', h['kaynak'], ' · ')
            if not m['tema']: m['tema'] = h['tema']
            if not m['donem']: m['donem'] = h['donem']
            m['alt_temalar'] = ', '.join(dict.fromkeys([s.strip() for s in (m['alt_temalar'] + ',' + h['alt_temalar']).split(',') if s.strip()]))
        elif k_ == 'F':
            gs = sorted([g for g in gorseller if g['hikaye_id'] == h['id'] and g['donem'] == 'o zaman'], key=lambda g: (not g['drive_id'], g['sira']))
            gs[0]['altyazi'] = (gs[0]['altyazi'] + ' ' + p).strip()
    ekle(m['_ozel'], 'kaynak_kayitlar', f"{o['kaynak_sekme']}:{o['kaynak_satir']}", '; ')
    if hik:
        h['metin'] = hik[0]
        # bölünen kayıtta onaylı kişi, adı mekân bilgisi parçasında geçiyorsa mekâna da bağlanır; adı hikâye parçasında geçmiyorsa hikâyeden alınır
        mpar = ' '.join(p for k_, p in parcalar if k_ == 'M')
        for x in [y for y in hk if y['hikaye_id'] == h['id'] and y['onay'] == 'onaylı']:
            ad_ = next(k['ad'] for k in kisiler if k['id'] == x['kisi_id'])
            if mpar and ad_ in mpar:
                if not any(y['mekan_id'] == m['id'] and y['kisi_id'] == x['kisi_id'] for y in mk): mk.append({'mekan_id': m['id'], 'kisi_id': x['kisi_id'], 'iliski': '', 'onay': 'onaylı'})
                if ad_ not in h['metin']: hk.remove(x)
        continue
    # hikâye parçası kalmadı: kayıt mekânın bilgisi oldu
    cikan.add(h['id'])
    notlar = ' · '.join(x for x in [o['konu_notu'] and 'konu: ' + o['konu_notu'], o['not'] and 'not: ' + o['not'], o['giren'] and 'giren: ' + o['giren']] if x)
    if notlar: ekle(m['_ozel'], 'kayit_notlari', f"{o['kaynak_sekme']}:{o['kaynak_satir']} — {notlar}", '\n')
    if not m['tema']: m['tema'] = h['tema']
    for x in hk:
        if x['hikaye_id'] == h['id'] and not any(y['mekan_id'] == m['id'] and y['kisi_id'] == x['kisi_id'] for y in mk):
            mk.append({'mekan_id': m['id'], 'kisi_id': x['kisi_id'], 'iliski': '', 'onay': x['onay']})
        elif x['hikaye_id'] == h['id'] and x['onay'] == 'onaylı':
            next(y for y in mk if y['mekan_id'] == m['id'] and y['kisi_id'] == x['kisi_id'])['onay'] = 'onaylı'
assert not ayrim, ('ayrım dosyasında bulunamayan kayıtlar', list(ayrim)[:5])
hikayeler[:] = [h for h in hikayeler if h['id'] not in cikan]
hm[:] = [x for x in hm if x['hikaye_id'] not in cikan]
hk[:] = [x for x in hk if x['hikaye_id'] not in cikan]
for g in gorseller:
    if g['hikaye_id'] in cikan: g['hikaye_id'] = ''

# ---------- mekân adları (tools/mekan_ad.txt): adın içindeki hikâye/kişi/film/resim adı ayrılır ----------
for line in (ROOT / 'tools/mekan_ad.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    mid, ad_ = [x.strip() for x in line.split('|', 1)]
    m = M_[mid]
    if m['ad'] != ad_:
        ekle(m['_ozel'], 'kayit_notlari', f"Tablodaki adı: {m['ad']}", '\n'); m['ad'] = ad_
        if m.get('karekod_basildi') != 'evet':  # karekodu basılmadıysa adres de yeni addan
            mslug.used.discard(m['slug']); m['slug'] = mslug(ad_)

# ---------- hikâye başlıkları (tools/hikaye_baslik.txt, metinler okunarak) ----------
# Hikâyenin adı mekânın adı değil, anlattığı olaydır; adres (slug) da yeni başlıktan üretilir.
H_ = {h['id']: h for h in hikayeler}
for line in (ROOT / 'tools/hikaye_baslik.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    hid, b_ = [x.strip() for x in line.split('|', 1)]
    assert hid in H_, hid
    H_[hid]['baslik'] = b_
# hikâye tarihleri (tools/hikaye_tarih.txt): yalnız tarihi boş olanlara, metinde yazan tarih
for line in (ROOT / 'tools/hikaye_tarih.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    hid, tarih, donem = [x.strip() for x in (line + '|').split('|')[:3]]
    h = H_[hid]
    if not (h['yil'] or h['tarih']): h['tarih'] = tarih.replace(' (*)', '')
    if donem: h['donem'] = donem
hslug2 = Sluglar()
for h in hikayeler: h['slug'] = hslug2(re.sub(r"['’‘]", '', h['baslik']))  # Gebze'den → gebzeden

# ---------- kişi bilgisi (tools/kisi_bilgi.txt, mekân metinleri tek tek okunarak) ----------
# Mekânın genel bilgisindeki kişinin biyografisi olan cümleler kişinin bilgisine taşınır; cümleler değiştirilmez.
K_ = {k['id']: k for k in kisiler}
kb_say = collections.Counter()
for line in (ROOT / 'tools/kisi_bilgi.txt').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line or line.startswith('#'): continue
    if ' yasam=' in line:
        kid, y = line.split(' yasam='); k = K_[kid.strip()]
        if not k['yasam']: k['yasam'] = y.strip(); kb_say['yasam'] += 1
        continue
    sol, sag = line.split(' | ', 1)
    mid, kid = [x.strip() for x in sol.split('>')]
    bas, son = [x.strip() for x in sag.split('||')] if '||' in sag else (sag.strip(), '')
    m, k = M_[mid], K_[kid]; t = m['aciklama']
    assert t.count(bas) == 1, (mid, bas)
    i = t.index(bas); j = t.index(son, i + len(bas)) if son else len(t)
    if son and not son[0].isupper():  # bitiş cümle ortasındaysa cümle başına geri git
        j = max(t.rfind('. ', i, j) + 2, i)
    parca = t[i:j].strip()
    sol_t, sag_t = t[:i].rstrip(), t[j:].lstrip()
    ayrac = '\n\n' if ('\n\n' in t[max(0, i - 3):i + 1] or '\n\n' in t[max(0, j - 2):j + 2]) else ' '
    m['aciklama'] = (sol_t + ayrac + sag_t).strip() if sol_t and sag_t else (sol_t or sag_t)
    ekle(k, 'kisa_bilgi', parca)
    if m['aciklama_kaynak']: ekle(k, 'bilgi_kaynak', m['aciklama_kaynak'], ' · ')
    x = next((y for y in mk if y['mekan_id'] == mid and y['kisi_id'] == kid), None)
    if x: x['onay'] = 'onaylı'
    else: mk.append({'mekan_id': mid, 'kisi_id': kid, 'iliski': '', 'onay': 'onaylı'})
    kb_say['parça'] += 1
for m in mekanlar:
    if not m['aciklama']: m['aciklama_kaynak'] = ''

# ---------- hikâyelerde adı geçen kişiler (tools/hikaye_kisi_ek.txt, metinler okunarak) ----------
ad_ile = {k['ad']: k for k in kisiler}
hke_say = collections.Counter()
for line in (ROOT / 'tools/hikaye_kisi_ek.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    hid, adlar = [x.strip() for x in line.split(':', 1)]
    assert hid in H_, hid
    for ad in [x.strip() for x in adlar.split(';') if x.strip()]:
        k = ad_ile.get(ad)
        if not k:
            k = {'id': f'K-{len(kisiler)+1:03d}', 'slug': kslug(ad), 'ad': ad, 'yasam': '', 'roller': '', 'kisa_bilgi': '', 'bilgi_kaynak': '', 'durum': 'yayinda', **VIKI_BOS, '_ozel': {'vikipedi_neden': ''}}
            kisiler.append(k); ad_ile[ad] = k; K_[k['id']] = k; hke_say['yeni kişi'] += 1
        x = next((y for y in hk if y['hikaye_id'] == hid and y['kisi_id'] == k['id']), None)
        if x is None: hk.append({'hikaye_id': hid, 'kisi_id': k['id'], 'onay': 'onaylı'}); hke_say['yeni bağ'] += 1
        elif x['onay'] != 'onaylı': x['onay'] = 'onaylı'; hke_say['onaylanan öneri'] += 1

# ---------- mekân–kişi önerileri (tools/mekan_kisi_karar.txt, metinler okunarak) ----------
mkk = {}
for line in (ROOT / 'tools/mekan_kisi_karar.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    tur, kalan = line.split(' ', 1); cift, neden = [x.strip() for x in kalan.split('|', 1)]
    mkk[cift] = 'reddedildi' if tur == 'RED' else 'öneri'
mkk_say = collections.Counter()
for x in mk:
    if x['onay'] == 'onaylı': continue
    x['onay'] = mkk.get(f"{x['mekan_id']}>{x['kisi_id']}", 'onaylı'); mkk_say[x['onay']] += 1
mk[:] = [x for x in mk if x['onay'] != 'reddedildi']  # reddedilen bağ silinir; kararı dosyada durur

# ---------- fotoğrafta görülen kişiler (tools/gorsel_kisi.txt, altyazılar okunarak) ----------
G_ = {g['id']: g for g in gorseller}
# birden çok fotoğrafı olan kayıtlarda tek fotoğrafa düşen altyazılar, metindeki sıraya göre fotoğraflarına dağıtılır (tools/altyazi_duzelt.json)
AD = json.loads((ROOT / 'tools/altyazi_duzelt.json').read_text(encoding='utf-8'))
_once = ''.join(sorted(re.sub(r'\s+', '', G_[g]['altyazi']) for g in AD))
for gid, metin in AD.items(): G_[gid]['altyazi'] = metin
assert sorted(_once) == sorted(''.join(re.sub(r'\s+', '', v) for v in AD.values())), 'altyazı dağıtımında metin kaybı'
for line in (ROOT / 'tools/gorsel_kisi.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    gid, ks = line.split(':', 1)
    ids = [x.strip() for x in ks.split(',') if x.strip()]
    for ad in [x for x in ids if not x.startswith('K-') and x not in ad_ile]:   # altyazıda adı geçen, tabloda olmayan kişi: yeni kişi
        k = {'id': f'K-{len(kisiler)+1:03d}', 'slug': kslug(ad), 'ad': ad, 'yasam': '', 'roller': '', 'kisa_bilgi': '', 'bilgi_kaynak': '', 'durum': 'yayinda', **VIKI_BOS, '_ozel': {'vikipedi_neden': ''}}
        kisiler.append(k); ad_ile[ad] = k; K_[k['id']] = k
    ids = list(dict.fromkeys(x if x.startswith('K-') else ad_ile[x]['id'] for x in ids))
    assert all(x in K_ for x in ids), line
    G_[gid.strip()]['kisi_id'] = ', '.join(ids)

# ---------- fotoğrafın konusu (tools/gorsel_konu.txt) ----------
konu_k = {}
for line in (ROOT / 'tools/gorsel_konu.txt').read_text(encoding='utf-8').splitlines():
    if not line.strip() or line.startswith('#'): continue
    tur, ids = line.split(':', 1)
    for gid in ids.split(): assert gid in G_, gid; konu_k[gid] = tur.strip()
for g in gorseller:
    # hikâye kaydının "güncel fotoğraf" sütunundan gelenler mekânın bugünkü fotoğrafıdır, hikâyenin değil
    if g['donem'] == 'bugün' and g['hikaye_id'] and g['id'] not in konu_k: g['hikaye_id'] = ''
    g['konu'] = konu_k.get(g['id']) or ('hikâye' if g['hikaye_id'] else 'mekân')

# ---------- Vikipedi önerileri (data_ozel/vikipedi.json + tools/vikipedi_karar.txt) ----------
viki_say = collections.Counter()
VJ = OZEL / 'vikipedi.json'
if VJ.exists():
    V = json.loads(VJ.read_text(encoding='utf-8'))
    satir = {r['id']: r for r in kisiler + mekanlar}
    for rid, v in V.items():
        if rid not in satir: continue
        r = satir[rid]
        for kk in ('vikipedi_onay', 'vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet'): r[kk] = v.get(kk, '') or ''
        r['_ozel']['vikipedi_neden'] = v.get('vikipedi_neden', '') or ''
    kararlar, varsay = {}, {}
    for line in (ROOT / 'tools/vikipedi_karar.txt').read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'): continue
        tur, kalan = line.split(' ', 1)
        if tur == 'ONAY':
            for rid in kalan.split(): kararlar[rid] = ('onaylı', '')
        elif tur in ('RED', 'BEKLE'):
            rid, neden = [x.strip() for x in kalan.split('|', 1)]
            kararlar[rid] = ('reddedildi' if tur == 'RED' else 'öneri', neden)
        elif tur == 'VARSAYILAN':
            varsay = dict(x.split('=') for x in kalan.split())
    for r in kisiler + mekanlar:
        if r['vikipedi_onay'] != 'öneri': continue
        tablo = 'kisiler' if r['id'].startswith('K-') else 'mekanlar'
        onay, neden = kararlar.get(r['id'], ({'ONAY': 'onaylı', 'RED': 'reddedildi'}.get(varsay.get(tablo, ''), 'öneri'), ''))
        r['vikipedi_onay'] = onay
        if neden: r['_ozel']['vikipedi_neden'] = ('inceleme: ' + neden + ' · ' + r['_ozel']['vikipedi_neden']).strip(' ·')
        viki_say[tablo + ' ' + onay] += 1

# ---------- yaz ----------
VIKI = ('vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet')  # onaylanmamış Vikipedi önerisi siteye gitmez, yalnız data_ozel'de durur
def acik(rows): return [{k: ('' if k in VIKI and r.get('vikipedi_onay') != 'onaylı' else v) for k, v in r.items() if k != '_ozel'} for r in rows]
def tam(rows): return [dict({k: v for k, v in r.items() if k != '_ozel'}, **r.get('_ozel', {})) for r in rows]
def jyaz(yol, rows):
    yol.write_text('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False) for r in rows) + '\n]\n', encoding='utf-8')
TABLO = {'mekanlar': mekanlar, 'hikayeler': hikayeler, 'kisiler': kisiler, 'gorseller': gorseller, 'hikaye_mekan': hm, 'hikaye_kisi': hk, 'mekan_kisi': mk, 'temalar': temalar}
for ad, rows in TABLO.items():
    jyaz(OUT / f'{ad}.json', acik([r for r in rows if not (ad == 'gorseller' and not r['drive_id'] and not r['site_url'])]) if ad == 'gorseller' else acik(rows))
    if any('_ozel' in r for r in rows):
        jyaz(OZEL / f'{ad}.json', [dict(dict(r['_ozel'], **{k: r[k] for k in VIKI if k in r and r.get('vikipedi_onay') != 'onaylı'}), id=r['id']) for r in rows if '_ozel' in r])
    t = tam(rows)
    with open(OZEL / 'sheets' / f'{ad}.csv', 'w', encoding='utf-8-sig', newline='') as fh:
        alanlar = list(dict.fromkeys(k for r in t for k in r))
        w = csv.DictWriter(fh, fieldnames=alanlar); w.writeheader(); w.writerows(t)
# panel için: çözülemeyen görseller de dahil tüm görseller (site yalnız bağlantısı olanları görür)
jyaz(OZEL / 'gorseller_tum.json', acik(gorseller))

say = {k: len(v) for k, v in TABLO.items()}
print(say)
print('kaynak:', collections.Counter(h['_ozel']['kaynak_sekme'] for h in hikayeler))
print('görsel: o zaman', sum(1 for g in gorseller if g['donem'] == 'o zaman' and g['drive_id']), '· bugün', sum(1 for g in gorseller if g['donem'] == 'bugün' and g['drive_id']),
      '· çözülemeyen', len(cozulemeyen))
print('taslak (metni ya da koordinatı yok):', sum(1 for h in hikayeler if h['durum'] == 'taslak'))
print('kişi bağı onaylı', sum(1 for x in hk if x['onay'] == 'onaylı'), '· öneri', sum(1 for x in hk if x['onay'] == 'öneri'))
print('kişi bilgisi:', dict(kb_say), '· bilgisi olan kişi:', sum(1 for k in kisiler if k['kisa_bilgi']), '· fotoğrafında kişi işaretli görsel:', sum(1 for g in gorseller if g['kisi_id']))
print('fotoğraf konusu:', dict(collections.Counter(g['konu'] for g in gorseller)))
print('hikâyelerde adı geçen kişiler:', dict(hke_say))
print('mekân–kişi önerileri:', dict(mkk_say))
print('vikipedi:', dict(viki_say))
print('ayrım kararları:', dict(ayrim_say), '· hikâye olmaktan çıkan:', len(cikan), '· genel bilgisi olan mekân:', sum(1 for m in mekanlar if m['aciklama']),
      '· altyazılı görsel:', sum(1 for g in gorseller if g['altyazi']), '· mekan_kisi:', len(mk))
if bulunamayan: print('eşleşme dosyasında bulunamayan satırlar:', bulunamayan)
