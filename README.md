# Hafıza İstanbul

İstanbul'un mekânlarını orada yaşanmış hikâyeler ve kişilerle birlikte gösteren kent belleği haritası.

- **Site** (`index.html`): harita, mekân ve kişi panelleri; Hikâyeler, Kişiler, Mekânlar, Albüm, Hakkında sayfaları. Her mekânın kalıcı adresi (`#mekan-galata-koprusu`) ve karekodu vardır.
- **İçerik paneli** (`panel.html`): hikâye, mekân, kişi ve görselleri düzenleme; olası tekrar mekânları birleştirme; kişi önerilerini onaylama; siteyi yayınlama.

## Veri modeli

Tek tablo yerine yedi kayıt tablosu ve üç kategori listesi. Site `data/*.json` dosyalarını okur; panel aynı tabloları Google Sheets'te yönetir.

| Tablo | Ne tutar |
|---|---|
| `mekanlar` | id (M-0001), slug, ad, bugunku_ad, **tur** (mekân türü), **yapi_durumu** (ayakta / yıkıldı / boş), ilce, enlem, boylam, karekod_basildi, durum, **aciklama** (mekânın genel bilgisi), aciklama_kaynak |
| `hikayeler` | id (H-0001), slug, baslik, yil, tarih, donem, **konular** (virgülle), metin, kaynak, durum |
| `kisiler` | id (K-001), slug, ad, yasam, **meslekler** (virgülle), **kisa_bilgi** (kişinin bilgisi / biyografisi), bilgi_kaynak, durum |
| `gorseller` | id (G-0001), drive_id, site_url, **tur** (Fotoğraf, Kartpostal, Resim, Gravür, Harita, Gazete, Belge), donem (o zaman / bugün), yil, altyazi, kaynak, izin, mekan_id, hikaye_id, **kisi_id** (fotoğrafta görülen kişiler, virgülle), **konu** (mekân / hikâye) |
| `hikaye_mekan` | hikaye_id, mekan_id, sira, rol (ana / geçtiği) — bir hikâye birden çok mekânda, bir mekânda birden çok hikâye |
| `hikaye_kisi` | hikaye_id, kisi_id, onay (onaylı / öneri / reddedildi) |
| `mekan_kisi` | mekan_id, kisi_id, iliski, onay — kişinin mekânla doğrudan bağı (burada yaşadı, evi, atölyesi…) |
| `mekan_gruplari` | ad, renk, sira — dokuz grup (Konut, Dinî yapı, Kamu, Kültür, Yeme-içme, İş yeri, Açık alan, Sanayi, Anıt); haritadaki renk buradan gelir |
| `mekan_turleri` | ad, grup, sira — `mekanlar.tur` sütununun izinli değerleri (Ev, Apartman, Cami, Tiyatro, Han…) ve grupları |
| `listeler` | liste, deger, sira — çok seçimli alanların izinli değerleri: `hikaye_konu` (Siyaset, Edebiyat…) ve `meslek` (Yazar, Ressam…) |

**Kategoriler somut ve tek kavramlıdır.** Bir mekânın tek bir türü vardır (ev, konak, cami, tiyatro, han, çeşme…); renk türün grubundan gelir. Yapının bugün ayakta olup olmadığı yalnız metin bunu söylüyorsa doldurulur. Hikâyenin birden çok konusu, kişinin birden çok mesleği olabilir; değerler sabit listeden seçilir. Mekân–kişi bağının adı (yaşadı, doğdu…) zorunlu değildir. Eski `tema`, `alt_temalar`, `roller` ve mekânın `donem` sütunu silinmedi, ekip içi sütunlara taşındı; sitede kullanılmaz. İlk sınıflama `tools/mekan_tur.txt`, `hikaye_konu.txt`, `kisi_meslek.txt`, `gorsel_tur.txt` dosyalarındadır (her kayıt tek tek okunarak); `python tools/kategori_ekle.py` bunları Excel'e işler.

**Dört metin birbirinden ayrıdır.** Yeri tanıtan metin (kim yaptırdı, kim yaşadı, ne zaman yıkıldı) mekânın `aciklama` alanındadır; kişinin kim olduğunu anlatan metin (doğumu, mesleği, eserleri) kişinin `kisa_bilgi` alanındadır; o yerde yaşanmış bir olay ya da anlatı `hikayeler` tablosundadır; yalnız fotoğrafı anlatan metin görselin `altyazi` alanındadır. Fotoğrafın konusu da ayrıdır: mekânın fotoğrafı ya da bir an/olay (hikâye). Mekânın "o zaman / bugün" karşılaştırmasında yalnız mekân fotoğrafları kullanılır; hikâyenin fotoğrafları hikâyenin altında, hikâyeye bağlı olmayan anlar ve kişi fotoğrafları mekân sayfasında ayrı bir galeride görünür; fotoğrafta görülen kişiler `kisi_id`'de tutulur ve fotoğraf o kişilerin sayfasında da görünür. Kişinin mekânları `mekan_kisi` bağlarından ve hikâyelerinden bulunur. Haritada genel bilgisi ya da hikâyesi olan mekânlar görünür; rengi mekânın türünün grubundan gelir. Kimlikler ve kalıcı adresler (slug) değişmez; karekodu basılan mekânın adresi kilitlenir. Birleştirilen mekânlar silinmez, arşive alınır ve adresleri kalan mekâna yönlendirilir.

### Eski tablodan taşıma

Kaynak, ekibin "hafıza noktaları" Google Sheets tablosu. Bu tabloda bir satır hem mekân hem hikâye, kişiler mekân adının içinde; taşıma betiği bunları ayırır.

1. Tablodan **Tüm Veri** ve **Kayıp Eser** sekmelerini CSV olarak indirin (*Dosya → İndir → Virgülle ayrılmış değerler*, her sekme ayrı) ve `kaynak/tum_veri.csv`, `kaynak/kayip_eser.csv` adlarıyla kaydedin.
2. `python tools/build_data.py`

Betik:

- her satırı bir hikâye yapar; aynı ad ve koordinattaki satırları tek mekânda birleştirir;
- eski ve güncel fotoğraf sütunlarındaki Drive bağlantılarını ayrı görsellere böler ("o zaman" / "bugün"); bağlantı yerine dosya adı ya da klasör yazan hücreleri panelde "bağlantısı çözülemeyen görsel" olarak işaretler;
- Dönem, tarih ve "Tabela yapılabilir mi?" sütunlarını alır; metni ya da koordinatı olmayan satırları taslak yapar;
- kişileri `tools/kisi_eslesme.txt` dosyasından alır (sekme:satır : kişiler; kayıtlar okunarak elle hazırlandı); bir kişinin tam adı başka bir hikâyenin metninde geçiyorsa bağı "öneri" olarak ekler, panelde onay bekler;
- kayıtları `tools/hikaye_ayrim.txt` dosyasına göre ayırır (metinler tek tek okunarak hazırlandı): `M` metin mekânın genel bilgisi olur, `F` kaydın ilk arşiv fotoğrafının altyazısı olur, `S A B | metin` verilen yerden ikiye bölünür (cümleler değiştirilmez). Hikâye parçası kalmayan kayıt hikâye olmaktan çıkar; kişi bağları mekâna (`mekan_kisi`), fotoğrafları mekâna geçer; eski tablodaki satır numarası ve notlar mekânın ekip içi alanlarında (`kaynak_kayitlar`, `kayit_notlari`) kalır. Dosyada olmayan kayıt hikâye olarak kalır;
- mekân metinlerinin içindeki kişi biyografilerini `tools/kisi_bilgi.txt`'e göre kişinin `kisa_bilgi` alanına taşır (cümleler değiştirilmez; metinde açıkça yazan doğum-ölüm yılları `yasam`'a yazılır) ve kişiyi mekâna onaylı olarak bağlar;
- adında hikâye, kişi, film ya da resim adı geçen mekânları `tools/mekan_ad.txt`'teki adlarla yeniden adlandırır (tablodaki eski ad `kayit_notlari`'nda kalır; karekodu basılmamışsa adres de yeni addan üretilir);
- hikâyelere `tools/hikaye_baslik.txt`'teki başlıkları verir (her metin okunarak; hikâyenin adı mekânın adı değil anlattığı olaydır) ve hikâye adreslerini (slug) bu başlıklardan üretir;
- hikâye metinlerinde adıyla geçen kişileri `tools/hikaye_kisi_ek.txt`'e göre hikâyeye onaylı olarak bağlar; kişiler tablosunda olmayanları yeni kişi olarak açar;
- mekân–kişi önerilerini `tools/mekan_kisi_karar.txt`'e göre onaylar ya da reddeder; boş hikâye tarihlerini `tools/hikaye_tarih.txt`'ten doldurur;
- eski tabloda birden çok fotoğrafı olan kayıtlarda tek fotoğrafa düşmüş altyazıları `tools/altyazi_duzelt.json`'a göre doğru fotoğraflara dağıtır (kontrol için `tools/altyazi-kontrol.html`, yerel sunucuyla açılır);
- fotoğraftaki kişileri `tools/gorsel_kisi.txt`'ten, fotoğrafın konusunu `tools/gorsel_konu.txt`'ten alır (altyazılar okunarak hazırlandı);
- Vikipedi önerilerini `data_ozel/vikipedi.json`'dan, inceleme kararlarını `tools/vikipedi_karar.txt`'ten alır;
- eski sitede olup bu iki sekmede bulunmayan kayıtları `assets/geojson/data_v2.geojson`'dan taşır.

Çıktılar: `data/*.json` (herkese açık site verisi), `data_ozel/` (yalnız panel: veri giren, not, "S Kolonu" konu notu, tablodaki ham değerler; Sheets'e aktarılacak tam CSV'ler `data_ozel/sheets/` altında). `kaynak/` ve `data_ozel/` depoya girmez.

## Şimdilik: Excel ile çalışmak

Veri `hafiza-veri.xlsx` dosyasında, yedi sekme hâlinde (sekme ve sütun adları ileride Google Sheets'te de aynı kalacak):

- Siyah başlıklı sütunlar site verisi, kahverengi başlıklılar ekip içi (sitede görünmez), gri ve "_" ile başlayanlar okumayı kolaylaştıran formüllerdir. Açıklamalar dosyadaki "Oku beni" sekmesinde ve başlık hücrelerinin notlarında.
- Düzenledikten sonra: `python tools/excel_to_json.py yol/hafiza-veri.xlsx` — dosyayı denetler (tekrar eden kimlik, var olmayan kayda bağ, geçersiz değer…), hata yoksa `data/*.json` ve `data_ozel/*.json` dosyalarını yazar. Ardından commit/push ile site güncellenir.
- Dosyayı yeniden üretmek gerekirse: `python tools/build_data.py && python tools/excel_olustur.py`.

Excel dönemi boyunca panel önizleme modunda çalışır (değişiklikler tarayıcıda kalır); kalıcı değişiklikler Excel'de yapılır.

## Vikipedi önerileri

Kişilere biyografi, mekânlara genel bilgi olarak Türkçe Vikipedi özeti eklenebilir. Öneriler internet bağlantısı olan bilgisayarda bulunur:

```
python tools/vikipedi_cek.py                 # data_ozel/hafiza-veri.xlsx'e öneri yazar
python tools/vikipedi_cek.py --ozet-yenile   # onaylı/öneri satırların özetini kısa özetle yeniden yazar
python tools/excel_to_json.py
```

- **Özet:** Vikipedi'nin kısa özeti olduğu gibi alınır (çoğu zaman ilk bir-iki cümle); yalnız çift virgül gibi biçim bozuklukları düzeltilir. Kısa özet bozuk gelirse (ör. "Mîna Urgan (") maddenin giriş paragrafı alınır. Kısa biyografiler uzatılmaz.
- **Elle verilen maddeler:** `tools/vikipedi_elle.txt` — `K-010 = Lev Troçki` (onaylı) ya da `K-025 = Agop Ayvaz | öneri`. Otomatik aramanın bulamadığı ya da yanlış önerdiği, kayıtla birlikte okunarak doğrulanan eşleşmeler; betik her çalıştığında getirilir.

- **Kişi:** Wikidata'da adla aranır; yalnız "insan" olan ve Türkçe Vikipedi maddesi bulunan adaylar alınır. Ad tam uyuyorsa, Türkiye/Osmanlı ile bağlıysa, yaşam yılları tutuyorsa öne geçer.
- **Mekân:** koordinatın 400 m çevresindeki Türkçe maddelerden adı mekânın adına (ya da bugünkü adına) benzeyen en yakını önerilir. Bugünkü adla eşleşenler "dikkat" notuyla gelir: madde mekânın kendisini değil bugünkü yeri anlatıyor olabilir.
- Her öneri `vikipedi_onay = öneri` olarak yazılır ve **panelde onaylanmadan sitede görünmez** (Kontrol kuyruğu → Vikipedi önerileri, ya da kişinin/mekânın ekranı). Yanlışsa "reddedildi": betik bir daha önermez. Doğru madde başkaysa ekrandan bağlantısı elle verilir.
- Onaylanmamış öneriler herkese açık `data/*.json`'a yazılmaz; yalnız panelin okuduğu `data_ozel/` altında durur.
- Sitede özet, ekibin metninden ayrı bir blokta, madde bağlantısı ve CC BY-SA 4.0 lisans notuyla gösterilir. Kişi sayfasında sıra: biyografi → ilgili hikâyeler → mekânları.
- **Panelde onay Excel'e yazılmaz.** Excel döneminde panel önizleme modunda çalıştığı için "Onayla" yalnız o tarayıcıda kalır. Kalıcı karar Excel'deki `vikipedi_onay` sütununa (onaylı / reddedildi) yazılır, sonra `excel_to_json.py` çalıştırılır.
- Yanıtlar `data_ozel/vikipedi_onbellek.json`'da saklanır; `--yeniden` bekleyen önerileri tekrar arar, `--sadece kisiler|mekanlar` tek tabloyu işler.

## Google Sheets'e bağlama

1. `hafiza-veri.xlsx` dosyasını Google Drive'a yükleyip Google Sheets olarak açın (Dosya → Google E-Tablolar olarak kaydet). Sekme adları hazır; eski tablo arşiv olarak kalır.
2. Sheets'te *Uzantılar → Apps Script* açın, `apps-script/Code.gs` içeriğini yapıştırın. *Proje ayarları → Komut dosyası özellikleri* altına `PANEL_ANAHTARI` ekleyin (isteğe bağlı: `GORSEL_KLASORU`, `GITHUB_REPO`, `GITHUB_TOKEN`).
3. *Dağıt → Yeni dağıtım → Web uygulaması* ("Beni olarak çalıştır", erişim "Herkes"). Verilen adresi `config.js` içindeki `sheetsUrl` alanına yazın.
4. GitHub deposunda *Settings → Secrets → Actions* altına `SHEETS_URL` olarak aynı adresi ekleyin.
5. Panelde *Sheets ve ayarlar* ekranından panel anahtarını girin.

Panel her kaydı doğrudan Sheets'e yazar. "Siteyi yayınla" düğmesi `Veriyi Sheets'ten güncelle` iş akışını tetikler (`GITHUB_TOKEN` tanımlıysa; değilse iş akışı GitHub'daki Actions sekmesinden elle çalıştırılır). İş akışı `tools/pull_sheets.py` ile `data/*.json` dosyalarını yeniler, Drive görsellerini `assets/gorsel/` altına kopyalar ve değişiklik varsa depoya kaydeder; GitHub Pages siteyi birkaç dakika içinde günceller.

`sheetsUrl` boşken panel önizleme modunda çalışır: değişiklikler tarayıcıda tutulur ve "Siteyi yayınla" ile aynı tarayıcıdaki siteye geçer.

## Yerelde çalıştırma

```
python -m http.server 8000
```

Sonra `http://localhost:8000/` (site) ve `http://localhost:8000/panel.html` (panel).

## Dosyalar

```
index.html, panel.html, config.js
assets/js/store.js      ortak veri katmanı (tablolar, dizinler, Sheets / önizleme arka uçları)
assets/js/basemap.js    MapLibre altlığı (OpenFreeMap Positron)
assets/js/site.js       site
assets/js/panel.js      içerik paneli
assets/css/             site.css, panel.css
assets/vendor/          MapLibre GL JS 5 (CSP sürümü), qrcode-generator
data/                   yedi tablo (.json), sheets/ altında CSV'ler
apps-script/Code.gs     Google Sheets web uygulaması
tools/                  build_data.py, pull_sheets.py, kisi_eslesme.txt
.github/workflows/veri.yml
```
