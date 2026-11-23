"""Hafıza İstanbul — denetimli kategori listeleri ve sekmelerin sütun sırası.

Bu listeler Excel'e (mekan_gruplari, mekan_turleri, listeler sekmeleri) ilk kurulumda yazılır.
Sonrasında asıl liste Excel'dekidir: yeni bir tür ya da meslek gerekirse o sekmeye satır eklenir,
excel_to_json.py denetimi Excel'deki listeye göre yapar.
"""

# Mekân türü grupları: haritadaki renk gruptan gelir.
GRUPLAR = [
    ('Konut', '#9B4444'),
    ('Dinî yapı', '#6B5B95'),
    ('Kamu', '#3F6E9A'),
    ('Kültür', '#B8862E'),
    ('Yeme-içme', '#C8643B'),
    ('İş yeri', '#3E8A82'),
    ('Açık alan', '#5E8C4A'),
    ('Sanayi', '#6E6A64'),
    ('Anıt', '#7A5230'),
]

# Mekân türü (tek seçim) → grup
TURLER = {
    'Konut': ['Ev', 'Apartman', 'Köşk', 'Konak', 'Yalı', 'Gecekondu', 'Yurt'],
    'Dinî yapı': ['Cami', 'Mescit', 'Kilise', 'Sinagog', 'Tekke', 'Türbe', 'Medrese'],
    'Kamu': ['Saray', 'Resmî bina', 'Okul', 'Üniversite', 'Hastane', 'Cezaevi', 'Kışla', 'Gar', 'İskele', 'Köprü'],
    'Kültür': ['Tiyatro', 'Sinema', 'Müze', 'Galeri', 'Atölye', 'Stüdyo', 'Kütüphane', 'Halkevi', 'Dernek', 'Kulüp'],
    'Yeme-içme': ['Kahvehane', 'Pastane', 'Lokanta', 'Meyhane', 'Bar', 'Gazino'],
    'İş yeri': ['Han', 'Pasaj', 'Çarşı', 'Dükkân', 'Kitabevi', 'Ofis', 'Gazete', 'Matbaa', 'Banka', 'Otel', 'Hamam'],
    'Açık alan': ['Meydan', 'Cadde', 'Sokak', 'Semt', 'Park', 'Bahçe', 'Stadyum', 'Ağaç', 'Deniz'],
    'Sanayi': ['Fabrika', 'Depo', 'Tersane'],
    'Anıt': ['Anıt', 'Heykel', 'Çeşme', 'Kule', 'Sur', 'Mezar', 'Mezarlık', 'Kazı alanı'],
}

YAPI_DURUMU = ['ayakta', 'yıkıldı']   # boş: metinde bilgi yok

HIKAYE_KONULARI = ['Siyaset', 'Savaş', 'Afet', 'Edebiyat', 'Sinema', 'Tiyatro', 'Müzik', 'Resim', 'Fotoğraf', 'Basın',
                   'Spor', 'Mimarlık', 'Göç', 'Din', 'Eğitim', 'Gündelik yaşam']

MESLEKLER = ['Yazar', 'Şair', 'Çevirmen', 'Gazeteci', 'Yayıncı', 'Oyuncu', 'Yönetmen', 'Senarist', 'Müzisyen', 'Besteci',
             'Şarkıcı', 'Ressam', 'Heykeltıraş', 'Seramik sanatçısı', 'Fotoğrafçı', 'Grafik sanatçısı', 'Hattat', 'Mimar',
             'Mühendis', 'Hekim', 'Bilim insanı', 'Tarihçi', 'Arkeolog', 'Akademisyen', 'Siyasetçi', 'Devlet görevlisi',
             'Hükümdar', 'Asker', 'Din adamı', 'Sporcu', 'İş insanı', 'Küratör', 'Terzi']

GORSEL_TURLERI = ['Fotoğraf', 'Kartpostal', 'Resim', 'Gravür', 'Harita', 'Gazete', 'Belge']

# Sekmelerin sütun sırası. Önce herkese açık sütunlar, sonra ekip içi (IC) sütunlar.
# tema, alt_temalar, roller ve mekânın dönemi eski sınıflamadır: ekip içi sütunlara taşındı, sitede kullanılmaz.
SUTUNLAR = {
    'mekanlar': ['id', 'slug', 'ad', 'bugunku_ad', 'tur', 'yapi_durumu', 'ilce', 'enlem', 'boylam', 'tabela', 'karekod_basildi', 'durum',
                 'aciklama', 'aciklama_kaynak', 'vikipedi_onay', 'vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet',
                 'tabela_ham', 'koordinat_ham', 'vikipedi_neden', 'kaynak_kayitlar', 'kayit_notlari', 'tema', 'alt_temalar', 'donem'],
    'hikayeler': ['id', 'slug', 'baslik', 'yil', 'tarih', 'donem', 'konular', 'metin', 'kaynak', 'durum',
                  'kaynak_sekme', 'kaynak_satir', 'giren', 'giris_tarihi', 'konu_notu', 'not', 'tema', 'alt_temalar'],
    'kisiler': ['id', 'slug', 'ad', 'yasam', 'meslekler', 'kisa_bilgi', 'bilgi_kaynak', 'durum',
                'vikipedi_onay', 'vikipedi_baslik', 'vikipedi_url', 'wikidata', 'vikipedi_ozet', 'vikipedi_neden', 'roller'],
    'gorseller': ['id', 'drive_id', 'site_url', 'tur', 'donem', 'yil', 'altyazi', 'kaynak', 'izin', 'mekan_id', 'hikaye_id', 'kisi_id',
                  'konu', 'sira', 'ham'],
}

# ekip içi sütunlar: her sekmede (ad) ya da yalnız bir sekmede ((sekme, ad))
IC = {'kaynak_sekme', 'kaynak_satir', 'giren', 'giris_tarihi', 'konu_notu', 'not', 'tabela_ham', 'koordinat_ham', 'ham',
      'kaynak_kayitlar', 'kayit_notlari', 'vikipedi_neden', 'tema', 'alt_temalar', 'roller', ('mekanlar', 'donem')}
def ic(sekme, sutun): return sutun in IC or (sekme, sutun) in IC

SEKMELER = ['hikayeler', 'mekanlar', 'kisiler', 'gorseller', 'hikaye_mekan', 'hikaye_kisi', 'mekan_kisi',
            'mekan_gruplari', 'mekan_turleri', 'listeler']

def liste_satirlari():
    """listeler sekmesi: çok seçimli alanların (hikâye konusu, meslek) izinli değerleri."""
    rows = [{'liste': 'hikaye_konu', 'deger': v, 'sira': i} for i, v in enumerate(HIKAYE_KONULARI, 1)]
    rows += [{'liste': 'meslek', 'deger': v, 'sira': i} for i, v in enumerate(MESLEKLER, 1)]
    return rows
def grup_satirlari(): return [{'ad': a, 'renk': r, 'sira': i} for i, (a, r) in enumerate(GRUPLAR, 1)]
def tur_satirlari():
    rows, i = [], 0
    for g, _ in GRUPLAR:
        for t in TURLER[g]:
            i += 1; rows.append({'ad': t, 'grup': g, 'sira': i})
    return rows

def karar_oku(yol):
    """tools/*.txt karar dosyası: 'id | değer | değer…' satırları → {id: [değerler]}"""
    out = {}
    for line in yol.read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'): continue
        p = [x.strip() for x in line.split('|')]
        out[p[0]] = p[1:]
    return out
