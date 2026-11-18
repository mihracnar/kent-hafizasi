// =====================================================================
//  Kent Hafızası — MapLibre GL JS sürümü
//  Not: MapLibre'nin zoom seviyeleri Leaflet'tekinden 1 düşüktür
//  (aynı görüntü için Leaflet 11 = MapLibre 10). Aşağıdaki değerler buna göre.
// =====================================================================

const BASLANGIC_MERKEZ = [28.9784, 41.0082]; // [boylam, enlem]
const BASLANGIC_ZOOM = 10;   // Leaflet'te 11
const DETAY_ZOOM = 16;       // Leaflet'te 17 (nokta/arama sonucuna gidiş)
const ETIKET_ZOOM = 15;      // Leaflet'te 16 (etiketlerin göründüğü seviye)
const KUME_MAKS_ZOOM = 15;   // Leaflet'te disableClusteringAtZoom: 17

// Not: Kamera hareketlerinde "essential: true" kullanılıyor. Aksi hâlde Windows'ta
// "Animasyon efektleri" kapalıysa MapLibre uçuş animasyonlarını atlayıp doğrudan atlar.

const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const FONT_KALIN = ['Noto Sans Bold'];

// ---------------------------------------------------------------------
// Altlıklar
// ---------------------------------------------------------------------
function rasterStil(tiles, attribution, maxzoom) {
    return {
        version: 8,
        glyphs: GLYPHS,
        sources: {
            altlik: { type: 'raster', tiles: tiles, tileSize: 256, maxzoom: maxzoom, attribution: attribution }
        },
        layers: [{ id: 'altlik', type: 'raster', source: 'altlik' }]
    };
}

const GOOGLE_ATR = '© <a href="https://maps.google.com/maps/about/terms/copyright/" target="_blank">Google Maps</a>';

const ALTLIKLAR = [
    { id: 'positron', ad: 'Positron (Açık)', stil: 'https://tiles.openfreemap.org/styles/positron' },
    { id: 'google-uydu', ad: 'Google Maps (Uydu)', stil: rasterStil(['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], GOOGLE_ATR, 20) },
    { id: 'google-hibrit', ad: 'Google Maps (Uydu Hibrit)', stil: rasterStil(['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'], GOOGLE_ATR, 20) },
    { id: 'google-harita', ad: 'Google Maps (Harita)', stil: rasterStil(['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'], GOOGLE_ATR, 20) },
    { id: 'osm', ad: 'OpenStreetMap', stil: rasterStil(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors', 19) }
];

// ---------------------------------------------------------------------
// Harita
// ---------------------------------------------------------------------
const map = new maplibregl.Map({
    container: 'map',
    center: BASLANGIC_MERKEZ,
    zoom: BASLANGIC_ZOOM,
    maxZoom: 21,
    // Leaflet'teki gibi döndürme/eğme kapalı
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: { compact: false }
});
map.touchZoomRotate.disableRotation();
map.keyboard.disableRotation();

// ---------------------------------------------------------------------
// Veri durumu
// ---------------------------------------------------------------------
let allFeatures = [];      // Tüm kayıtlar (orijinal GeoJSON özellikleri)
let gosterilenler = [];    // Filtreden sonra haritada gösterilenler
let aramaNoktasi = null;   // Nominatim sonucu için vurgulanan nokta [boylam, enlem]
let selectedThemes = new Set();
let selectedSubThemes = new Set();
let selectedDistricts = new Set();

function bosFC() {
    return { type: 'FeatureCollection', features: [] };
}

function gecerliKoordinat(feature) {
    return feature && feature.geometry && Array.isArray(feature.geometry.coordinates) &&
        feature.geometry.coordinates.length >= 2;
}

function noktaKoleksiyonu(features) {
    return { type: 'FeatureCollection', features: features.filter(gecerliKoordinat) };
}

function aramaKoleksiyonu() {
    if (!aramaNoktasi) return bosFC();
    return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: aramaNoktasi } }]
    };
}

// Tema renkleri (lejanttaki renklerle aynı)
const TEMA_RENGI = ['match', ['get', 'Tema'],
    'Gündelik Yaşam ve Kent Belleği', '#ECB159',
    'Mimarlık ve Şehircilik', '#8CB9BD',
    'Şahıs', '#9B4444',
    'Tarihsel Anekdot', '#754E1A',
    '#8c564b'
];

// ---------------------------------------------------------------------
// Veri kaynakları ve katmanları (her altlık değişiminde yeniden eklenir)
// ---------------------------------------------------------------------
function veriKaynaklari() {
    const noktalar = noktaKoleksiyonu(gosterilenler);
    return {
        'mekanlar': {
            type: 'geojson',
            data: noktalar,
            cluster: true,
            clusterMaxZoom: KUME_MAKS_ZOOM,
            clusterRadius: 50
        },
        // Etiketler kümelemeden bağımsız (Leaflet'teki ayrı etiket katmanı gibi)
        'mekan-etiketleri': { type: 'geojson', data: noktalar },
        'kume-kapsama': { type: 'geojson', data: bosFC() },
        'arama-sonucu': { type: 'geojson', data: aramaKoleksiyonu() }
    };
}

function veriKatmanlari() {
    return [
        // Kümenin üzerine gelince kapsadığı alan (showCoverageOnHover)
        {
            id: 'kume-kapsama-dolgu', type: 'fill', source: 'kume-kapsama',
            paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.2 }
        },
        {
            id: 'kume-kapsama-cizgi', type: 'line', source: 'kume-kapsama',
            paint: { 'line-color': '#3388ff', 'line-width': 3 }
        },
        // Nominatim arama sonucu
        {
            id: 'arama-sonucu', type: 'circle', source: 'arama-sonucu',
            paint: {
                'circle-radius': 30,
                'circle-color': '#3388ff',
                'circle-opacity': 0.5,
                'circle-stroke-color': '#3388ff',
                'circle-stroke-width': 3
            }
        },
        // Tekil noktalar
        {
            id: 'nokta', type: 'circle', source: 'mekanlar',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-radius': 6.5,
                'circle-color': TEMA_RENGI,
                'circle-opacity': 0.8,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.5,
                'circle-stroke-opacity': 0.8
            }
        },
        // Kümeler: dış halka + iç daire + sayı
        {
            id: 'kume-halka', type: 'circle', source: 'mekanlar',
            filter: ['has', 'point_count'],
            paint: { 'circle-radius': 20, 'circle-color': 'rgba(64, 95, 115, 0.15)' }
        },
        {
            id: 'kume', type: 'circle', source: 'mekanlar',
            filter: ['has', 'point_count'],
            paint: { 'circle-radius': 15, 'circle-color': 'rgba(64, 95, 115, 0.5)' }
        },
        {
            id: 'kume-sayi', type: 'symbol', source: 'mekanlar',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': FONT_KALIN,
                'text-size': 12,
                'text-allow-overlap': true,
                'text-ignore-placement': true
            },
            paint: { 'text-color': '#ffffff' }
        },
        // Mekan adları (çakışanlar otomatik gizlenir)
        {
            id: 'etiket', type: 'symbol', source: 'mekan-etiketleri',
            minzoom: ETIKET_ZOOM,
            layout: {
                'text-field': ['coalesce', ['get', 'Mekan'], ''],
                'text-font': FONT_KALIN,
                'text-size': 14,
                'text-anchor': 'top',
                'text-offset': [0, 0.8],
                'text-max-width': 9,
                'text-padding': 6
            },
            paint: {
                'text-color': 'rgba(13, 13, 13, 0.95)',
                'text-halo-color': 'rgba(255, 255, 255, 0.85)',
                'text-halo-width': 2
            }
        }
    ];
}

function kaynaklariGuncelle() {
    const noktalar = noktaKoleksiyonu(gosterilenler);
    const mekanlar = map.getSource('mekanlar');
    const etiketler = map.getSource('mekan-etiketleri');
    if (mekanlar) mekanlar.setData(noktalar);
    if (etiketler) etiketler.setData(noktalar);
}

function aramaNoktasiniGuncelle() {
    const kaynak = map.getSource('arama-sonucu');
    if (kaynak) kaynak.setData(aramaKoleksiyonu());
}

// Altlık değiştir: yeni stilin üzerine veri katmanlarını ekler
let aktifAltlik = null;
function altligiDegistir(altlikId) {
    const altlik = ALTLIKLAR.find(a => a.id === altlikId) || ALTLIKLAR[0];
    aktifAltlik = altlik.id;
    map.setStyle(altlik.stil, {
        diff: false,
        transformStyle: (onceki, yeni) => ({
            ...yeni,
            glyphs: yeni.glyphs || GLYPHS,
            sources: { ...yeni.sources, ...veriKaynaklari() },
            layers: [...yeni.layers, ...veriKatmanlari()]
        })
    });
}

altligiDegistir('positron');

// Katmanlar modalındaki seçim listesi
(function katmanMenusunuKur() {
    const kutu = document.createElement('div');
    kutu.className = 'basemap-control';
    ALTLIKLAR.forEach(altlik => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'altlik';
        input.value = altlik.id;
        input.checked = altlik.id === aktifAltlik;
        input.addEventListener('change', function() {
            if (this.checked) altligiDegistir(this.value);
        });
        const span = document.createElement('span');
        span.textContent = ' ' + altlik.ad;
        label.appendChild(input);
        label.appendChild(span);
        kutu.appendChild(label);
    });
    document.getElementById('layersModalBody').appendChild(kutu);
})();

// ---------------------------------------------------------------------
// Harita etkileşimleri
// ---------------------------------------------------------------------
['nokta', 'kume', 'etiket'].forEach(katman => {
    map.on('mouseenter', katman, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', katman, () => { map.getCanvas().style.cursor = ''; });
});

function orijinalOzellik(mapFeature) {
    const i = mapFeature.properties._i;
    return allFeatures[i];
}

map.on('click', 'nokta', (e) => {
    const feature = orijinalOzellik(e.features[0]);
    if (feature) handleFeatureClick(feature, feature.geometry.coordinates);
});

map.on('click', 'etiket', (e) => {
    // Nokta ya da kümeyle üst üste gelirse onlar öncelikli
    if (map.queryRenderedFeatures(e.point, { layers: ['nokta', 'kume'] }).length) return;
    const feature = orijinalOzellik(e.features[0]);
    if (feature) handleFeatureClick(feature, feature.geometry.coordinates);
});

// Kümeye tıklayınca açıldığı zoom seviyesine yaklaş
map.on('click', 'kume', async (e) => {
    const kume = e.features[0];
    const kaynak = map.getSource('mekanlar');
    try {
        const zoom = await kaynak.getClusterExpansionZoom(kume.properties.cluster_id);
        map.easeTo({ center: kume.geometry.coordinates, zoom: zoom, essential: true });
    } catch (err) {
        console.error('Küme açılamadı:', err);
    }
});

// Kümenin kapsadığı alanı göster (dışbükey zarf)
function disbukeyZarf(noktalar) {
    const p = noktalar.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const alt = [];
    for (const n of p) {
        while (alt.length >= 2 && cross(alt[alt.length - 2], alt[alt.length - 1], n) <= 0) alt.pop();
        alt.push(n);
    }
    const ust = [];
    for (let i = p.length - 1; i >= 0; i--) {
        const n = p[i];
        while (ust.length >= 2 && cross(ust[ust.length - 2], ust[ust.length - 1], n) <= 0) ust.pop();
        ust.push(n);
    }
    ust.pop();
    alt.pop();
    return alt.concat(ust);
}

let uzerindekiKume = null;
function kapsamayiTemizle() {
    uzerindekiKume = null;
    const kaynak = map.getSource('kume-kapsama');
    if (kaynak) kaynak.setData(bosFC());
}

map.on('mousemove', 'kume', async (e) => {
    const kume = e.features[0];
    const id = kume.properties.cluster_id;
    if (id === uzerindekiKume) return;
    uzerindekiKume = id;
    try {
        const yapraklar = await map.getSource('mekanlar').getClusterLeaves(id, Infinity, 0);
        if (uzerindekiKume !== id) return;
        const zarf = disbukeyZarf(yapraklar.map(f => f.geometry.coordinates));
        let geometri;
        if (zarf.length >= 3) {
            geometri = { type: 'Polygon', coordinates: [zarf.concat([zarf[0]])] };
        } else {
            geometri = { type: 'LineString', coordinates: zarf };
        }
        map.getSource('kume-kapsama').setData({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: geometri }]
        });
    } catch (err) {
        console.error('Küme kapsamı alınamadı:', err);
    }
});
map.on('mouseleave', 'kume', kapsamayiTemizle);
map.on('zoomstart', kapsamayiTemizle);

// Logoya tıklayınca başlangıç görünümüne dön
document.querySelector('.logo').addEventListener('click', function() {
    map.flyTo({ center: BASLANGIC_MERKEZ, zoom: BASLANGIC_ZOOM, duration: 1000, essential: true });
});

// Konum (gizli MapLibre kontrolü, sağ alttaki butonla tetiklenir)
const geolocateControl = new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showUserLocation: true,
    showAccuracyCircle: true,
    fitBoundsOptions: { maxZoom: DETAY_ZOOM, essential: true }
});
map.addControl(geolocateControl, 'top-left');
geolocateControl.on('error', function(err) {
    alert('Konumunuz alınamadı' + (err && err.message ? ': ' + err.message : '.'));
});

document.getElementById('locate-button').addEventListener('click', function() {
    geolocateControl.trigger();
});

// Zoom butonları
document.getElementById('zoom-in-button').addEventListener('click', function() {
    map.zoomIn({ essential: true });
});
document.getElementById('zoom-out-button').addEventListener('click', function() {
    map.zoomOut({ essential: true });
});

// ---------------------------------------------------------------------
// Arama: önce yerel veride, sonuç yoksa Nominatim'de
// ---------------------------------------------------------------------
function initializeSearch() {
    const kutu = document.getElementById('search-control');
    const input = document.getElementById('searchInput');
    const liste = document.getElementById('searchTooltip');
    const iptal = document.getElementById('searchCancel');
    const buton = document.getElementById('searchButton');

    let sonuclar = [];
    let seciliIndeks = -1;
    let zamanlayici = null;
    let sorguNo = 0;

    function listeyiGizle() {
        liste.innerHTML = '';
        liste.style.display = 'none';
        sonuclar = [];
        seciliIndeks = -1;
    }

    function iptalGorunurlugu() {
        iptal.style.display = input.value.length > 0 ? 'flex' : 'none';
    }

    function listeyiGoster(kayitlar) {
        sonuclar = kayitlar;
        seciliIndeks = -1;
        liste.innerHTML = '';
        if (kayitlar.length === 0) {
            liste.style.display = 'none';
            return;
        }
        kayitlar.forEach((kayit, i) => {
            const li = document.createElement('li');
            li.className = 'search-tip';
            li.textContent = kayit.name || 'İsimsiz Mekan';
            li.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                sonucuSec(i);
            });
            liste.appendChild(li);
        });
        liste.style.display = 'block';
    }

    function seciliyiIsaretle() {
        [...liste.children].forEach((li, i) => {
            li.classList.toggle('search-tip-select', i === seciliIndeks);
            if (i === seciliIndeks) li.scrollIntoView({ block: 'nearest' });
        });
    }

    function sonucuSec(i) {
        const kayit = sonuclar[i];
        if (!kayit) return;
        input.value = kayit.name || '';
        iptalGorunurlugu();
        listeyiGizle();

        if (kayit.feature) {
            // Yerel veri: notu aç
            aramaNoktasi = null;
            aramaNoktasiniGuncelle();
            handleFeatureClick(kayit.feature, [kayit.lon, kayit.lat]);
        } else {
            // Nominatim / koordinat: noktayı vurgula
            aramaNoktasi = [kayit.lon, kayit.lat];
            aramaNoktasiniGuncelle();
            map.flyTo({ center: aramaNoktasi, zoom: DETAY_ZOOM, essential: true });
        }
    }

    function ara(metin) {
        const no = ++sorguNo;
        const koordinat = koordinatCoz(metin);
        if (koordinat) {
            listeyiGoster([koordinat]);
            return;
        }
        const yerel = searchLocalData(metin);
        if (yerel.length > 0) {
            listeyiGoster(yerel);
            return;
        }
        kutu.classList.add('search-load');
        searchNominatim(metin, function(kayitlar) {
            if (no !== sorguNo) return; // daha yeni bir arama başladı
            kutu.classList.remove('search-load');
            listeyiGoster(kayitlar);
        });
    }

    input.addEventListener('input', function() {
        iptalGorunurlugu();
        clearTimeout(zamanlayici);
        const metin = input.value.trim();
        if (metin.length < 2) {
            sorguNo++;
            kutu.classList.remove('search-load');
            listeyiGizle();
            return;
        }
        zamanlayici = setTimeout(() => ara(metin), 300);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' && sonuclar.length) {
            e.preventDefault();
            seciliIndeks = Math.min(seciliIndeks + 1, sonuclar.length - 1);
            seciliyiIsaretle();
        } else if (e.key === 'ArrowUp' && sonuclar.length) {
            e.preventDefault();
            seciliIndeks = Math.max(seciliIndeks - 1, 0);
            seciliyiIsaretle();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            gonder();
        } else if (e.key === 'Escape') {
            listeyiGizle();
        }
    });

    // Enter / büyüteç: seçili ya da ilk sonuca git
    function gonder() {
        if (sonuclar.length) {
            sonucuSec(seciliIndeks >= 0 ? seciliIndeks : 0);
        } else if (input.value.trim().length >= 2) {
            clearTimeout(zamanlayici);
            ara(input.value.trim());
        }
    }

    buton.addEventListener('click', function() {
        input.focus();
        gonder();
    });

    iptal.addEventListener('click', function(e) {
        e.preventDefault();
        input.value = '';
        sorguNo++;
        kutu.classList.remove('search-load');
        iptalGorunurlugu();
        listeyiGizle();
        aramaNoktasi = null;
        aramaNoktasiniGuncelle();
        input.focus();
    });

    input.addEventListener('blur', function() {
        setTimeout(listeyiGizle, 150);
    });

    iptalGorunurlugu();
    listeyiGizle();
}

// "41.0336, 28.9770" gibi girilen koordinatı tanı (enlem, boylam)
function koordinatCoz(metin) {
    const m = metin.match(/^\s*(-?\d+(?:[.]\d+)?)\s*[,; ]\s*(-?\d+(?:[.]\d+)?)\s*$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { name: lat + ', ' + lon, lat: lat, lon: lon };
}

// Yerel GeoJSON verisinde arama
function searchLocalData(text) {
    const results = [];
    const searchText = text.toLowerCase().trim();

    allFeatures.forEach(feature => {
        const properties = feature.properties;
        if (!properties) return;

        const searchFields = [
            properties.Mekan,
            properties.Mekanin_Bugunku_Adi,
            properties.Ilce,
            properties.Alt_Tema,
            properties.Tema
        ];

        const matches = searchFields.some(field => {
            if (!field) return false;
            return String(field).toLowerCase().includes(searchText);
        });

        if (matches && feature.geometry?.coordinates?.length >= 2) {
            results.push({
                name: properties.Mekan || 'İsimsiz Mekan',
                lat: feature.geometry.coordinates[1],
                lon: feature.geometry.coordinates[0],
                feature: feature,
                properties: properties
            });
        }
    });

    return results;
}

// Nominatim ile arama
function searchNominatim(text, callResponse) {
    const params = {
        q: text,
        format: 'json',
        countrycodes: 'TR'
    };

    fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams(params))
        .then(response => response.json())
        .then(data => {
            const results = data.map(item => ({
                name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            }));
            callResponse(results);
        })
        .catch(error => {
            console.error('Nominatim search error:', error);
            callResponse([]);
        });
}

$(document).ready(function() {
    initializeSearch();
});

// ---------------------------------------------------------------------
// Not penceresi
// ---------------------------------------------------------------------
function convertDriveLink(url) {
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
        const fileId = fileIdMatch[1].split('?')[0];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return url;
}

// lngLat: [boylam, enlem]
function handleFeatureClick(feature, lngLat) {
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom > DETAY_ZOOM ? currentZoom : DETAY_ZOOM;

    map.flyTo({ center: lngLat, zoom: targetZoom, duration: 1500, essential: true });
    
    $('#noteModalLabel').text(feature.properties.Mekan || '');
    
    if (feature.properties.Eski_Fotograf_Linki && feature.properties.Eski_Fotograf_Linki.length > 0) {
        const coverImageUrl = convertDriveLink(feature.properties.Eski_Fotograf_Linki[0]);
        $('#featured-image-place').css({
            'background-image': `url(${coverImageUrl})`,
            'background-size': 'cover',
            'background-position': 'center'
        });
    }
    
    $('#Tema').text(feature.properties.Tema || '');
    $('#altTema').text(feature.properties.Alt_Tema || '');
    $('#mekaninBugunkuAdi').text(feature.properties.Mekanin_Bugunku_Adi || '');
    $('#ilce').text(feature.properties.Ilce || '');
    $('#metin').text(feature.properties.Metin || '');
    $('#kaynak').text(feature.properties.Kaynak || '');
    
    let galleryHTML = '';
    
    if (feature.properties.Eski_Fotograf_Linki && Array.isArray(feature.properties.Eski_Fotograf_Linki)) {
        feature.properties.Eski_Fotograf_Linki.forEach((link, index) => {
            const convertedUrl = convertDriveLink(link);
            galleryHTML += `
                <div class="ke-gallery-item">
                    <a href="${convertedUrl}" 
                       data-fancybox="gallery-${feature.properties.Mekan}"
                       data-caption="Fotoğraf ${index + 1}">
                        <img src="${convertedUrl}" 
                             alt="Fotoğraf ${index + 1}" 
                             class="img-fluid gallery-image"
                             onerror="this.onerror=null; this.src='assets/images/placeholder.jpg';">
                    </a>
                </div>`;
        });
    }
    
    $('#mediaID').html(galleryHTML);

    Fancybox.bind(`[data-fancybox="gallery-${feature.properties.Mekan}"]`, {
        compact: false,
        idle: false,
        animated: true,
        showClass: "fancybox-zoomIn",
        hideClass: "fancybox-zoomOut",
        dragToClose: false,
        toolbar: {
            display: [
                "zoom",
                "fullscreen",
                "close",
            ],
        },
        buttons: {
            zoom: {
                click: function (instance) {
                    if (instance.isScaledDown()) {
                        instance.zoomIn();
                    } else {
                        instance.zoomOut();
                    }
                },
            },
        },
        caption: function (fancybox, carousel, slide) {
            return slide.caption;
        },
    });

    $('#noteModal').modal('show');
}


// ---------------------------------------------------------------------
// Filtreleme
// ---------------------------------------------------------------------
function initializeFilters() {
    fetch('assets/geojson/data_v2.geojson')
        .then(response => response.json())
        .then(data => {
            allFeatures = data.features;
            // Haritadan tıklanan noktayı orijinal kayda bağlamak için sıra numarası
            allFeatures.forEach((feature, i) => {
                feature.properties = feature.properties || {};
                feature.properties._i = i;
            });
            gosterilenler = allFeatures;
            kaynaklariGuncelle();
            setupFilterModal();
        })
        .catch(error => console.error('Filter data loading error:', error));
}

// Modal açılış eventi için listener ekleyelim
$('#filterModal').on('show.bs.modal', function () {
    updateDistrictOptions();
});

function setupFilterModal() {
    const subThemeContainer = document.getElementById('subThemeContainer');
    const districtContainer = document.getElementById('districtContainer');
    subThemeContainer.innerHTML = '';
    districtContainer.innerHTML = '';
    
    // Setup theme checkboxes event listeners
    document.querySelectorAll('.theme-filters .custom-control-input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedThemes.add(this.value);
            } else {
                selectedThemes.delete(this.value);
            }
            updateSubThemeOptions();
        });
    });
}


function updateDistrictOptions() {
    const districtContainer = document.getElementById('districtContainer');
    
    // Get all districts from allFeatures
    const allDistricts = new Set();
    allFeatures.forEach(feature => {
        if (feature.properties.Ilce) {
            allDistricts.add(feature.properties.Ilce.trim());
        }
    });

    // Create select element
    const select = document.createElement('select');
    select.className = 'form-control';
    select.id = 'districtSelect';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Tüm İlçeler';
    select.appendChild(defaultOption);

    // Add all district options, sorted alphabetically
    Array.from(allDistricts).sort().forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        if (selectedDistricts.has(district)) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // Clear and append new select element
    districtContainer.innerHTML = '';
    districtContainer.appendChild(select);

    // Add change event listener
    select.addEventListener('change', function() {
        selectedDistricts.clear();
        if (this.value) {
            selectedDistricts.add(this.value);
            // When district changes, update available themes
            updateThemeOptions();
        } else {
            // Reset theme checkboxes when no district is selected
            document.querySelectorAll('.theme-filters .custom-control-input').forEach(checkbox => {
                checkbox.checked = false;
                checkbox.disabled = false;
            });
            selectedThemes.clear();
        }
        // Clear subthemes when district changes
        selectedSubThemes.clear();
        updateSubThemeOptions();
    });
}

function updateThemeOptions() {
    const selectedDistrict = Array.from(selectedDistricts)[0];
    
    // Get available themes for selected district
    const availableThemes = new Set();
    allFeatures.forEach(feature => {
        if (!selectedDistrict || feature.properties.Ilce === selectedDistrict) {
            availableThemes.add(feature.properties.Tema);
        }
    });

    // Update theme checkboxes
    document.querySelectorAll('.theme-filters .custom-control-input').forEach(checkbox => {
        const themeAvailable = availableThemes.has(checkbox.value);
        checkbox.disabled = !themeAvailable;
        if (!themeAvailable) {
            checkbox.checked = false;
            selectedThemes.delete(checkbox.value);
        }
    });
}

function updateSubThemeOptions() {
    const subThemeContainer = document.getElementById('subThemeContainer');
    subThemeContainer.innerHTML = '';
    selectedSubThemes.clear();

    if (selectedThemes.size === 0) {
        return;
    }

    const selectedDistrict = Array.from(selectedDistricts)[0];

    // Get all subthemes for selected themes and district
    const relevantSubThemes = new Set();
    allFeatures.forEach(feature => {
        if ((!selectedDistrict || feature.properties.Ilce === selectedDistrict) && 
            selectedThemes.has(feature.properties.Tema) && 
            feature.properties.Alt_Tema) {
            feature.properties.Alt_Tema.split(',')
                .map(theme => theme.trim())
                .filter(theme => theme)
                .forEach(theme => relevantSubThemes.add(theme));
        }
    });

    // Create checkboxes for relevant subthemes
    Array.from(relevantSubThemes).sort().forEach((subTheme, index) => {
        const div = document.createElement('div');
        div.className = 'custom-control custom-checkbox';
        div.innerHTML = `
            <input type="checkbox" class="custom-control-input subtheme-checkbox" 
                   id="subTheme_${index}" value="${subTheme}">
            <label class="custom-control-label" for="subTheme_${index}">${subTheme}</label>
        `;
        subThemeContainer.appendChild(div);
    });

    // Setup subtheme checkboxes event listeners
    document.querySelectorAll('.subtheme-filters .custom-control-input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedSubThemes.add(this.value);
            } else {
                selectedSubThemes.delete(this.value);
            }
        });
    });
}

function filtreliGorunumeGit(filteredFeatures) {
    const tumu = selectedThemes.size === 0 && selectedSubThemes.size === 0 && selectedDistricts.size === 0;
    const koordinatlar = filteredFeatures.filter(gecerliKoordinat).map(f => f.geometry.coordinates);

    if (tumu || koordinatlar.length === 0) {
        map.flyTo({ center: BASLANGIC_MERKEZ, zoom: BASLANGIC_ZOOM, duration: 1500, essential: true });
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    koordinatlar.forEach(([x, y]) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    // Leaflet'teki bounds.pad(0.1) karşılığı
    const padX = (maxX - minX) * 0.1;
    const padY = (maxY - minY) * 0.1;
    map.fitBounds([[minX - padX, minY - padY], [maxX + padX, maxY + padY]], {
        padding: 50,
        duration: 1500,
        maxZoom: DETAY_ZOOM,
        essential: true
    });
}

function applyFilters() {
    const filteredFeatures = allFeatures.filter(feature => {
        // Tema filtresi
        const themeMatch = selectedThemes.size === 0 || 
                          selectedThemes.has(feature.properties.Tema);
        
        // Alt tema filtresi
        let subThemeMatch = true;
        if (selectedSubThemes.size > 0 && feature.properties.Alt_Tema) {
            const featureSubThemes = feature.properties.Alt_Tema.split(',')
                .map(t => t.trim());
            subThemeMatch = featureSubThemes.some(t => selectedSubThemes.has(t));
        }
        
        // İlçe filtresi temadan bağımsız
        const districtMatch = selectedDistricts.size === 0 || 
                            (feature.properties.Ilce && 
                             selectedDistricts.has(feature.properties.Ilce.trim()));
        
        return districtMatch && (
            (selectedThemes.size === 0 && selectedSubThemes.size === 0) ||
            (themeMatch && subThemeMatch)
        );
    });

    gosterilenler = filteredFeatures;
    kaynaklariGuncelle();
    filtreliGorunumeGit(filteredFeatures);

    $('#filterModal').modal('hide');
}
    
function resetFilters() {
    selectedThemes.clear();
    selectedSubThemes.clear();
    selectedDistricts.clear();

    document.querySelectorAll('.theme-filters input[type="checkbox"]')
        .forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = false;
        });

    const districtSelect = document.getElementById('districtSelect');
    if (districtSelect) {
        districtSelect.value = '';
    }

    const subThemeContainer = document.getElementById('subThemeContainer');
    subThemeContainer.innerHTML = '';

    gosterilenler = allFeatures;
    kaynaklariGuncelle();

    map.flyTo({ center: BASLANGIC_MERKEZ, zoom: BASLANGIC_ZOOM, duration: 1500, essential: true });
}


// Initialize on document ready
$(document).ready(function() {
    initializeFilters();
    
    // Modal scroll reset
    $('#noteModal, #albumModal').on('show.bs.modal', function() {
        $(this).find('.modal-body').scrollTop(0);
    });
});

// Not görüntüleme modalı için scroll reset özelliği
$(document).ready(function() {
    const resetModalScroll = () => {
        $('.modal-body').scrollTop(0);
    };

    $('#noteModal').on({
        'show.bs.modal': resetModalScroll,
        'shown.bs.modal': resetModalScroll
    });

});

// Albüm
document.addEventListener('DOMContentLoaded', function() {
    let allGalleryItems = [];
    let selectedTheme = null;
    let selectedSubthemes = new Set();
    
    // GeoJSON'dan verileri çek
    fetch('assets/geojson/data_v2.geojson')
        .then(response => response.json())
        .then(data => {
            // Tüm alt temaları topla
            const allSubthemes = new Set();
            data.features.forEach(feature => {
                if (feature.properties.Alt_Tema) {
                    feature.properties.Alt_Tema.split(',')
                        .map(theme => theme.trim())
                        .forEach(theme => allSubthemes.add(theme));
                }
            });

            // Alt tema slider'ını doldur
            const subthemeSlider = document.getElementById('subthemeSlider');
            if (subthemeSlider) {
                Array.from(allSubthemes).sort().forEach(subtheme => {
                    const tag = document.createElement('span');
                    tag.className = 'subtheme-tag';
                    tag.dataset.subtheme = subtheme;
                    tag.textContent = subtheme;
                    tag.onclick = () => toggleSubtheme(tag);
                    subthemeSlider.appendChild(tag);
                });
            }

            // Fotoğraf verilerini hazırla
            allGalleryItems = data.features
                .filter(feature => feature.properties.Eski_Fotograf_Linki && 
                                 Array.isArray(feature.properties.Eski_Fotograf_Linki) && 
                                 feature.properties.Eski_Fotograf_Linki.length > 0)
                .flatMap(feature => feature.properties.Eski_Fotograf_Linki.map(link => ({
                    src: convertDriveLink(link),
                    tema: feature.properties.Tema,
                    altTema: feature.properties.Alt_Tema ? 
                            feature.properties.Alt_Tema.split(',').map(t => t.trim()) : [],
                    caption: feature.properties.Mekan || '',
                    metin: feature.properties.Metin || ''
                })));

            renderGallery();
            initializeSliderControls();
        });

    // Alt tema toggle fonksiyonu
    function toggleSubtheme(element) {
        document.querySelectorAll('.subtheme-tag').forEach(tag => tag.classList.remove('active'));
        selectedSubthemes.clear();

        element.classList.add('active');
        selectedSubthemes.add(element.dataset.subtheme);

        renderGallery();
    }

    // Slider kontrol butonları
    function initializeSliderControls() {
        const slider = document.querySelector('.subtheme-slider');
        const leftBtn = document.querySelector('.slider-control.left');
        const rightBtn = document.querySelector('.slider-control.right');

        if (slider && leftBtn && rightBtn) {
            leftBtn.onclick = () => {
                slider.scrollBy({ left: -200, behavior: 'smooth' });
            };

            rightBtn.onclick = () => {
                slider.scrollBy({ left: 200, behavior: 'smooth' });
            };

            enableTouchScroll(slider);
        }
    }

    function enableTouchScroll(slider) {
        if (!slider) return;
        
        let startX;
        slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
    
        slider.addEventListener('touchmove', (e) => {
            const diff = startX - e.touches[0].clientX;
            slider.scrollBy({ left: diff, behavior: 'smooth' });
        });
    }

    // Ana tema filtre click handler
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            selectedTheme = this.dataset.tema;
            updateSubthemes();
            renderGallery();
        });
    });

    // Galeri render fonksiyonu
    function renderGallery() {
        const galleryGrid = document.getElementById('albumMediaID');
        if (!galleryGrid) return;

        let filteredItems = allGalleryItems;

        if (selectedTheme) {
            filteredItems = filteredItems.filter(item => item.tema === selectedTheme);
        }

        if (selectedSubthemes.size > 0) {
            filteredItems = filteredItems.filter(item => 
                item.altTema.some(tema => selectedSubthemes.has(tema))
            );
        }

        galleryGrid.innerHTML = filteredItems.map(item => `
            <div class="ke-gallery-item">
                <a href="${item.src}" 
                   data-fancybox="album-gallery"
                   data-caption="${item.caption}"
                   data-description="${item.metin || ''}"
                   class="gallery-link">
                    <div class="gallery-overlay">
                        <p class="gallery-label">${item.caption || 'Konum belirtilmemiş'}</p>
                    </div>
                    <img src="${item.src}" 
                         alt="${item.caption || 'Görsel mevcut değil'}" 
                         class="img-fluid gallery-image"
                         onerror="this.onerror=null; this.src='assets/images/placeholder.jpg';">
                </a>
            </div>
        `).join('');

        initializeFancybox();
    }

    function updateSubthemes() {
        const subthemeSlider = document.getElementById('subthemeSlider');
        if (!subthemeSlider) return;

        subthemeSlider.innerHTML = '';
        selectedSubthemes.clear();
        document.querySelectorAll('.subtheme-tag').forEach(tag => tag.classList.remove('active'));
    
        if (!selectedTheme) return;
    
        const relatedSubthemes = new Set();
        allGalleryItems.forEach(item => {
            if (item.tema === selectedTheme) {
                item.altTema.forEach(subtheme => relatedSubthemes.add(subtheme));
            }
        });
    
        Array.from(relatedSubthemes).sort().forEach(subtheme => {
            const tag = document.createElement('span');
            tag.className = 'subtheme-tag';
            tag.dataset.subtheme = subtheme;
            tag.textContent = subtheme;
            tag.onclick = () => toggleSubtheme(tag);
            subthemeSlider.appendChild(tag);
        });
    }

    function initializeFancybox() {
        Fancybox.bind('[data-fancybox="album-gallery"]', {
            compact: false,
            idle: false,
            animated: true,
            showClass: "fancybox-zoomIn",
            hideClass: "fancybox-zoomOut",
            dragToClose: false,
            toolbar: {
                display: [
                    "zoom",
                    "fullscreen",
                    "close",
                ],
            },
            buttons: {
                zoom: {
                    click: function (instance) {
                        if (instance.isScaledDown()) {
                            instance.zoomIn();
                        } else {
                            instance.zoomOut();
                        }
                    },
                },
            },
            caption: function (fancybox, slide) {
                const caption = slide.triggerEl?.dataset?.caption || '';
                const description = slide.triggerEl?.dataset?.description || '';
                
                let captionHtml = '<div class="fancybox-caption-wrap">';
                if (caption) {
                    captionHtml += `<h4 class="fancybox-caption-title">${caption}</h4>`;
                }
                if (description) {
                    captionHtml += `<p class="fancybox-caption-text">${description}</p>`;
                }
                captionHtml += '</div>';
                
                return captionHtml || '';
            },
        });
    }
});