"""Kişiler ve mekânlar için Türkçe Vikipedi önerilerini bulur ve Excel'e yazar.

Kullanım (internet bağlantısı olan bilgisayarda):
    python tools/vikipedi_cek.py                     # data_ozel/hafiza-veri.xlsx
    python tools/vikipedi_cek.py dosya.xlsx --sadece kisiler
    python tools/vikipedi_cek.py --yeniden           # bekleyen önerileri de yeniden arar
    python tools/vikipedi_cek.py --ozet-yenile       # onaylı/öneri satırların özetini Vikipedi'nin kısa özetiyle yeniden yazar
                                                     # (madde ve onay değişmez, yalnız vikipedi_ozet)
Her çalıştırmada tools/vikipedi_elle.txt'deki elle verilmiş maddeler de getirilip yazılır.

Her eşleşme vikipedi_onay = "öneri" olarak yazılır; panelde ya da Excel'de "onaylı" yapılmadan sitede görünmez.
"onaylı" ve "reddedildi" satırlara hiç dokunulmaz. Neden eşleştiği iç alan vikipedi_neden'de yazar.

Kişi: Wikidata'da adla aranır, yalnız "insan" (Q5) olan ve Türkçe Vikipedi maddesi bulunan adaylar alınır;
      ad tam uyuyorsa, Türkiye/Osmanlı ile bağlıysa ve yaşam yılları tutuyorsa öne geçer.
Mekân: mekânın koordinatının 400 m çevresindeki Türkçe Vikipedi maddelerine bakılır; adı mekânın adına
       ya da bugünkü adına benzeyen en yakın madde önerilir.
Özet: Vikipedi'nin kısa özeti (maddenin ilk cümleleri), olduğu gibi; yalnız çift virgül gibi biçim bozuklukları düzeltilir.
       Özet bozuk gelirse (ör. "Mîna Urgan (") maddenin giriş paragrafı alınır. (Vikipedi, CC BY-SA 4.0). Sitede kaynak bağlantısı ve lisansla gösterilir.

Yanıtlar data_ozel/vikipedi_onbellek.json dosyasında saklanır; yeniden çalıştırmak hızlıdır.
"""
import json, sys, time, re, pathlib, urllib.request, urllib.parse, difflib, math, collections
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill

ROOT = pathlib.Path(__file__).resolve().parent.parent
import argparse
_ap = argparse.ArgumentParser(description='Vikipedi önerilerini Excel\'e yazar')
_ap.add_argument('xlsx', nargs='?', default=str(ROOT / 'data_ozel' / 'hafiza-veri.xlsx'))
_ap.add_argument('--sadece', choices=['kisiler', 'mekanlar'])
_ap.add_argument('--yeniden', action='store_true', help='bekleyen önerileri de yeniden ara')
_ap.add_argument('--ozet-yenile', action='store_true', help='onaylı/öneri satırların özetini kısa özetle yeniden yaz')
_ARG = _ap.parse_args()
XLSX, SADECE, YENIDEN, OZET_YENILE = pathlib.Path(_ARG.xlsx), _ARG.sadece, _ARG.yeniden, _ARG.ozet_yenile
ELLE = ROOT / 'tools' / 'vikipedi_elle.txt'
ONBELLEK = ROOT / 'data_ozel' / 'vikipedi_onbellek.json'
UA = 'HafizaIstanbul/1.0 (https://mihracnar.github.io/kent-hafizasi/; kent bellegi haritasi)'
ALANLAR = ['vikipedi_onay', 'vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet', 'vikipedi_neden']
TURKIYE = {'Q43', 'Q12560'}  # Türkiye, Osmanlı İmparatorluğu

try: onbellek = json.loads(ONBELLEK.read_text(encoding='utf-8'))
except Exception: onbellek = {}
# Önbellekten atılanlar, yeniden sorulur: hata cevapları (Wikidata yoğunken {"error": ...} döner) ve
# sonuçsuz Wikidata aramaları. Eskiden bunlar "Wikidata'da aday yok" diye kaydedilip bir daha denenmiyordu.
def _sil(u, v):
    if isinstance(v, dict) and 'error' in v: return True
    return 'wbsearchentities' in u and not (v or {}).get('search')
for _u in [u for u, v in onbellek.items() if _sil(u, v)]: del onbellek[_u]

def al(url):
    if url in onbellek: return onbellek[url]
    for deneme in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=20) as r: veri = json.loads(r.read().decode('utf-8'))
            if isinstance(veri, dict) and 'error' in veri:   # yoğunluk / hız sınırı: bekle, yeniden dene, önbelleğe yazma
                time.sleep(3 * (deneme + 1)); continue
            onbellek[url] = veri; time.sleep(0.15); return veri
        except urllib.error.HTTPError as e:
            if e.code == 404: onbellek[url] = None; return None
            if e.code == 429: time.sleep(5 * (deneme + 1)); continue
            time.sleep(1)
        except Exception:
            time.sleep(2)
    return None

def fold(s):
    s = (s or '').replace('İ', 'i').replace('I', 'ı').lower()
    for a, b in zip('çğıöşüâîû', 'cgiosuaiu'): s = s.replace(a, b)
    return ' '.join(re.sub(r'[^\w\s]', ' ', s).split())

def temizle(t):
    """Yalnız biçim düzeltmesi: içi boşalmış parantez, çift virgül, boşluk ("Sabri Berkel,, Türk ressam." → "Sabri Berkel, Türk ressam.")."""
    t = re.sub(r'\(\s*[;,]?\s*\)', '', t)
    t = re.sub(r'\s+([,.;:])', r'\1', t); t = re.sub(r',\s*,', ',', t)
    return re.sub(r'[ \t]{2,}', ' ', t).strip()

def bozuk(t):
    t = (t or '').strip()
    return len(t) < 15 or t[-1] in '(,;:' or t.count('(') != t.count(')')

def giris_ozet(baslik):
    """Yalnız kısa özet bozuk geldiğinde (ör. "Mîna Urgan (") kullanılır: maddenin giriş paragrafı, devamı eklenmez."""
    v = al('https://tr.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'extracts', 'exintro': 1, 'explaintext': 1,
                                                                         'redirects': 1, 'titles': baslik, 'format': 'json', 'formatversion': 2}))
    sayfalar = (v or {}).get('query', {}).get('pages', [])
    metin = (sayfalar[0].get('extract') or '').strip() if sayfalar else ''
    return temizle(metin.split('\n')[0]) if metin else None

def ozet(baslik):
    v = al('https://tr.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(baslik.replace(' ', '_'), safe=''))
    if not v or v.get('type') == 'disambiguation' or not (v.get('extract') or '').strip(): return None
    baslik2 = v.get('title') or baslik
    metin = temizle(v['extract'])
    if bozuk(metin): metin = giris_ozet(baslik2) or metin
    return {'baslik': baslik2, 'ozet': metin, 'url': ((v.get('content_urls') or {}).get('desktop') or {}).get('page') or
            'https://tr.wikipedia.org/wiki/' + urllib.parse.quote(baslik2.replace(' ', '_')), 'wikidata': v.get('wikibase_item') or ''}

def yillar(yasam):
    return [int(y) for y in re.findall(r'\b(1[0-9]{3}|20[0-9]{2})\b', yasam or '')]

def claim_ids(e, p): return [((c.get('mainsnak') or {}).get('datavalue') or {}).get('value', {}).get('id') for c in e.get('claims', {}).get(p, [])]
def claim_yil(e, p):
    for c in e.get('claims', {}).get(p, []):
        t = (((c.get('mainsnak') or {}).get('datavalue') or {}).get('value') or {}).get('time', '')
        m = re.match(r'[+-](\d{4})', t)
        if m: return int(m.group(1))
    return None

# adın önündeki/arkasındaki unvanlar: yedek aramada atılır, ad karşılaştırmasında sayılmaz
UNVAN = set(fold(x) for x in '''neyzen şeyh derviş baba bahriyeli santuri tamburi tanburi kemani kantocu hattat hafız hâfız mimar ressam doktor dr prof
paşa bey efendi hanım ağa hoca molla kâtip katip sultan prens prenses aşık âşık küçük'''.split())

def sade(ad): return ' '.join(t for t in fold(ad).split() if t not in UNVAN)

def wd_ara(metin):
    ara = al('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({'action': 'wbsearchentities', 'search': metin, 'language': 'tr', 'uselang': 'tr', 'type': 'item', 'limit': 10, 'format': 'json'}))
    return [x['id'] for x in (ara or {}).get('search', [])]

def vp_ara(metin):
    """Türkçe Vikipedi'nin kendi araması → maddelerin Wikidata kimlikleri."""
    v = al('https://tr.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': metin, 'srlimit': 6, 'srnamespace': 0, 'format': 'json'}))
    basliklar = [x['title'] for x in (v or {}).get('query', {}).get('search', [])]
    if not basliklar: return []
    pp = al('https://tr.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'pageprops', 'ppprop': 'wikibase_item', 'redirects': 1, 'titles': '|'.join(basliklar), 'format': 'json'}))
    return [x['pageprops']['wikibase_item'] for x in ((pp or {}).get('query', {}).get('pages', {}) or {}).values() if (x.get('pageprops') or {}).get('wikibase_item')]

def kapsar(ad, adlar):
    """Kayıttaki adın unvansız bütün kelimeleri adaylardan birinde var mı (ya da tersi)? "Ahmet Süheyl Ünver" ~ "Süheyl Ünver"."""
    def altdizi(k, u):  # k'nin kelimeleri u'da aynı sırayla geçiyor mu ("Hikmet Nazım" ≠ "Nâzım Hikmet")
        it = iter(u); return all(t in it for t in k)
    a = sade(ad).split()
    if len(a) < 2: return False          # tek kelimeye inen ad ("Abdullah Ağa" → "abdullah") yetmez
    for x in adlar:
        b = sade(x).split()
        if len(b) >= 2 and (altdizi(b, a) or altdizi(a, b)): return True
    return False

def kisi_bul(ad, yasam):
    ids, yol = wd_ara(ad), ''
    if not ids and sade(ad) != fold(ad): ids, yol = wd_ara(sade(ad)), 'unvansız adla arandı'
    if not ids: ids, yol = vp_ara(ad), 'Vikipedi aramasıyla bulundu'
    if not ids: return None, 'Wikidata\'da ve Vikipedi aramasında aday yok'
    ent = (al('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({'action': 'wbgetentities', 'ids': '|'.join(ids), 'props': 'claims|sitelinks|labels|aliases|descriptions', 'languages': 'tr|en', 'sitefilter': 'trwiki', 'format': 'json'})) or {}).get('entities', {})
    y = yillar(yasam); adaylar = []
    for q in ids:
        e = ent.get(q) or {}
        if 'Q5' not in claim_ids(e, 'P31'): continue
        tr = (e.get('sitelinks') or {}).get('trwiki', {}).get('title')
        if not tr: continue
        adlar = [l.get('value', '') for l in (e.get('labels') or {}).values()] + [a.get('value', '') for v in (e.get('aliases') or {}).values() for a in v]
        tam = any(fold(a) == fold(ad) for a in adlar) or fold(tr) == fold(ad)
        puan, neden = 0, []
        if tam: puan += 3; neden.append('ad tam uyuyor')
        elif kapsar(ad, adlar + [tr]): puan += 2; neden.append('ad unvan/ek ad dışında uyuyor')
        else: neden.append('ad kısmen uyuyor')
        if set(claim_ids(e, 'P27')) & TURKIYE: puan += 1; neden.append('Türkiye/Osmanlı')
        d, o = claim_yil(e, 'P569'), claim_yil(e, 'P570')
        if y and (d or o):
            if any(abs(a - b) <= 1 for a in y for b in (d, o) if b): puan += 2; neden.append('yıllar tutuyor')
            else: puan -= 3; neden.append(f'yıllar tutmuyor ({d}–{o})')
        aciklama = ((e.get('descriptions') or {}).get('tr') or (e.get('descriptions') or {}).get('en') or {}).get('value', '')
        adaylar.append((puan, q, tr, neden, aciklama))
    if not adaylar: return None, 'insan olup Türkçe maddesi olan aday yok'
    adaylar.sort(key=lambda a: -a[0])
    p, q, tr, neden, aciklama = adaylar[0]
    if p < 3 and not any('ad tam' in n or 'unvan/ek ad' in n for n in neden): return None, f'zayıf aday: {tr}'
    if yol: neden.insert(0, yol)
    if len(adaylar) > 1: neden.append(f'{len(adaylar)} aday; diğeri: {adaylar[1][2]}' + (' (aynı puan, dikkat)' if adaylar[1][0] == p else ''))
    if aciklama: neden.append(f'Wikidata: {aciklama}')
    oz = ozet(tr)
    if not oz: return None, f'{tr}: özet alınamadı'
    oz['wikidata'] = oz['wikidata'] or q
    return oz, ' · '.join(neden)

GENEL = set(fold(x) for x in '''camii cami mescidi kilisesi kilise köşkü köşk yalısı yalı evi ev apartmanı apartman hanı han sarayı saray çeşmesi çeşme meydanı meydan
sokak sokağı caddesi cadde sineması sinema tiyatrosu tiyatro lisesi lise okulu okul mektebi hastanesi hastane kahvesi kahvehanesi kıraathanesi pasajı pasaj binası bina
türbesi türbe tekkesi tekke hamamı hamam kulesi kule istasyonu garı gar iskelesi iskele parkı park mezarlığı mezarlık konağı konak kasrı kasır fabrikası fabrika
oteli otel müzesi müze bahçesi bahçe kışlası kışla anıtı anıt külliyesi külliye çarşısı çarşı lokantası pastanesi meyhanesi gazinosu kitabevi atölyesi
köprüsü köprü ve ile the de da istanbul'''.split())

def benzerlik(a, b):
    fa, fb = fold(re.sub(r'\(.*?\)', '', a)), fold(re.sub(r'\(.*?\)', '', b))
    if not fa or not fb: return 0
    seq = difflib.SequenceMatcher(None, fa, fb).ratio()
    ta = {t for t in fa.split() if t not in GENEL and len(t) > 2}; tb = {t for t in fb.split() if t not in GENEL and len(t) > 2}
    ort = len(ta & tb) / max(len(ta), len(tb)) if ta and tb else 0  # iki adın ayırt edici kelimeleri büyük ölçüde aynı olmalı
    return max(seq, ort)

def mekan_bul(ad, bugunku, enlem, boylam):
    v = al('https://tr.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'geosearch', 'gscoord': f'{enlem}|{boylam}', 'gsradius': 400, 'gslimit': 40, 'format': 'json'}))
    adaylar = []
    adlar = [ad] + [x.strip() for x in (bugunku or '').split('·') if x.strip()]
    for s in (v or {}).get('query', {}).get('geosearch', []):
        puanlar = [(benzerlik(s['title'], x), i) for i, x in enumerate(adlar)]
        b, i = max(puanlar, key=lambda x: (x[0], -x[1]))
        if b >= 0.75: adaylar.append((b, s['dist'], s['title'], i > 0))
    if not adaylar: return None, 'yakında adı benzeyen madde yok'
    adaylar.sort(key=lambda a: (-round(a[0], 1), a[1]))
    b, d, tr, bugunden = adaylar[0]
    oz = ozet(tr)
    if not oz: return None, f'{tr}: özet alınamadı'
    neden = [f'{"BUGÜNKÜ adına" if bugunden else "adına"} benzerlik {b:.2f}', f'{round(d)} m uzakta'] + (['dikkat: madde bugünkü yeri anlatıyor olabilir, mekânın kendisini değil'] if bugunden else [])
    if len(adaylar) > 1: neden.append(f'{len(adaylar)} aday; diğeri: {adaylar[1][2]}')
    return oz, ' · '.join(neden)

def sutunlar(ws):
    h = [c.value for c in ws[1]]
    for a in ALANLAR:
        if a not in h:
            j = len(h) + 1; c = ws.cell(row=1, column=j, value=a)
            c.font = Font(name='Arial', bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='7A5300' if a == 'vikipedi_neden' else '141414')
            h.append(a)
    return {k: i + 1 for i, k in enumerate(h) if k}

def isle(ws, tur):
    col = sutunlar(ws); say = {} if OZET_YENILE else {'öneri': 0, 'bulunamadı': 0, 'atlandı': 0}
    satirlar = [r for r in range(2, ws.max_row + 1) if ws.cell(row=r, column=col['id']).value]
    for n, r in enumerate(satirlar, 1):
        g = lambda k: ws.cell(row=r, column=col[k]).value if k in col else None
        onay = (g('vikipedi_onay') or '').strip()
        if OZET_YENILE:
            if onay in ('onaylı', 'öneri') and g('vikipedi_baslik'):
                o = ozet(str(g('vikipedi_baslik'))); oz = o and o['ozet']
                if oz and oz != g('vikipedi_ozet'):
                    ws.cell(row=r, column=col['vikipedi_ozet'], value=oz).number_format = '@'; say['özet yenilendi'] = say.get('özet yenilendi', 0) + 1
                elif not oz: say['özet alınamadı'] = say.get('özet alınamadı', 0) + 1
            if n % 25 == 0:
                print(f'  {tur}: {n}/{len(satirlar)}', flush=True)
                ONBELLEK.write_text(json.dumps(onbellek, ensure_ascii=False), encoding='utf-8')
            continue
        if onay in ('onaylı', 'reddedildi') or (onay == 'öneri' and not YENIDEN) or g('durum') == 'arsiv':
            say['atlandı'] += 1; continue
        if tur == 'kisiler':
            oz, neden = kisi_bul(str(g('ad') or ''), str(g('yasam') or ''))
        else:
            if g('enlem') in (None, '') or g('boylam') in (None, ''): say['atlandı'] += 1; continue
            oz, neden = mekan_bul(str(g('ad') or ''), str(g('bugunku_ad') or ''), g('enlem'), g('boylam'))
        if oz:
            for k, v in (('vikipedi_onay', 'öneri'), ('vikipedi_baslik', oz['baslik']), ('vikipedi_url', oz['url']), ('wikidata', oz['wikidata']), ('vikipedi_ozet', oz['ozet']), ('vikipedi_neden', neden)):
                c = ws.cell(row=r, column=col[k], value=v); c.number_format = '@'
            say['öneri'] += 1
        else:
            ws.cell(row=r, column=col['vikipedi_neden'], value='bulunamadı: ' + neden).number_format = '@'
            say['bulunamadı'] += 1
        if n % 25 == 0:
            print(f'  {tur}: {n}/{len(satirlar)}', flush=True)
            ONBELLEK.write_text(json.dumps(onbellek, ensure_ascii=False), encoding='utf-8')
    return say

def elle_uygula(wb):
    """tools/vikipedi_elle.txt: "K-010 = Lev Troçki" (onaylı yazılır) ya da "K-025 = Agop Ayvaz | öneri"."""
    if not ELLE.exists(): return
    say = collections.Counter()
    for line in ELLE.read_text(encoding='utf-8').splitlines():
        line = line.split('#', 1)[0].strip()
        if not line or '=' not in line: continue
        rid, kalan = [x.strip() for x in line.split('=', 1)]
        baslik, _, onay = [x.strip() for x in kalan.partition('|')]
        onay = onay or 'onaylı'
        tur = 'kisiler' if rid.startswith('K-') else 'mekanlar'
        if (SADECE and SADECE != tur) or tur not in wb.sheetnames: continue
        ws = wb[tur]; col = sutunlar(ws)
        r = next((r for r in range(2, ws.max_row + 1) if str(ws.cell(row=r, column=col['id']).value or '').strip() == rid), None)
        if not r: print('  elle: satır yok', rid); say['satır yok'] += 1; continue
        if ws.cell(row=r, column=col['vikipedi_baslik']).value == baslik and ws.cell(row=r, column=col['vikipedi_onay']).value == onay and not OZET_YENILE:
            say['zaten yazılı'] += 1; continue
        oz = ozet(baslik)
        if not oz: print(f'  elle: {rid} "{baslik}" maddesi alınamadı'); say['alınamadı'] += 1; continue
        for k, v in (('vikipedi_onay', onay), ('vikipedi_baslik', oz['baslik']), ('vikipedi_url', oz['url']), ('wikidata', oz['wikidata']),
                     ('vikipedi_ozet', oz['ozet']), ('vikipedi_neden', 'elle verildi (tools/vikipedi_elle.txt)')):
            ws.cell(row=r, column=col[k], value=v).number_format = '@'
        say['yazıldı'] += 1
    print('elle verilenler', dict(say))

def main():
    if not XLSX.exists(): sys.exit(f'Excel dosyası bulunamadı: {XLSX}')
    wb = load_workbook(XLSX)
    for t in ('kisiler', 'mekanlar'):
        if SADECE and SADECE != t: continue
        if t not in wb.sheetnames: sys.exit(f'"{t}" sekmesi yok')
        print(t, '…'); print(t, isle(wb[t], t))
    elle_uygula(wb)
    ONBELLEK.write_text(json.dumps(onbellek, ensure_ascii=False), encoding='utf-8')
    wb.save(XLSX)
    print(f'{XLSX} güncellendi. Şimdi: python tools/excel_to_json.py  (öneriler panelde "Vikipedi önerileri" sekmesinde onay bekler)')

if __name__ == '__main__':
    main()
