# Harita yazı glifleri

`noto-sans-semibold/` — mekân adı etiketleri için Noto Sans SemiBold (600) SDF glifleri.
Altlık sunucularında (CARTO, OpenFreeMap) Noto Sans SemiBold yok; yarı kalın bu yüzden burada.
`basemap.js` içindeki `transformRequest` yalnız "Noto Sans SemiBold" isteklerini buraya yönlendirir;
burada olmayan bir Unicode aralığı istenirse OpenFreeMap'teki Regular'a düşer. Altlık haritanın kendi yazıları etkilenmez.

Üretim: `cargo install build_pbf_glyphs` → `build_pbf_glyphs <ttf klasörü> <çıktı>`;
kaynak TTF `@expo-google-fonts/noto-sans` paketindeki `NotoSans_600SemiBold.ttf`.
Kapsanan aralıklar: Latin, Latin Genişletilmiş A/B, IPA, birleşik işaretler, Yunan, Kiril,
Latin Genişletilmiş Ek, genel noktalama, harf benzeri simgeler. Lisans: SIL OFL 1.1 (`OFL.txt`).
