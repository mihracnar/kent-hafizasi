const map = L.map('map').setView([41.0082, 28.9784], 13);

const cartoLightLayer = L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://carto.com/">Carto</a>',
    maxZoom: 22
}).addTo(map);

const googleMapsSatelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '© <a href="https://maps.google.com/maps/about/terms/copyright/">Google Maps</a>',
    maxZoom: 22
});

const googleMapsLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    attribution: '© <a href="https://maps.google.com/maps/about/terms/copyright/">Google Maps</a>',
    maxZoom: 22
});

const googleMapsSatelliteHybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: '© <a href="https://maps.google.com/maps/about/terms/copyright/">Google Maps</a>',
    maxZoom: 22
});

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 22
});



// Katman kontrolünü oluşturma
const layersControl = L.control.layers({
    "Carto Light": cartoLightLayer,
    "Google Maps (Uydu)": googleMapsSatelliteLayer,
    "Google Maps (Uydu Hibrit)": googleMapsSatelliteHybridLayer,
    "Google Maps (Harita)": googleMapsLayer,
    "OpenStreetMap": osmLayer,
}, {}, { collapsed: false }); 


// Katman kontrolünü modal içine taşıma
layersControl.addTo(map); 
const layerControlElement = layersControl.getContainer();
document.getElementById('layersModalBody').appendChild(layerControlElement);


// Leaflet'in locate kontrolünü gizli başlat
const locateControl = L.control.locate({
  position: 'topright', // Konum seçeneği
  flyTo: true, // Konuma uçarak git
  showPopup: false, // Popup gösterme
  strings: { // Başlık metni
    title: "Konumuma Git"
  },
  icon: 'fa fa-location-arrow', // İkon sınıfı
  setView: true, // Haritayı konuma otomatik olarak yakınlaştırma
  showMarker: true // Marker gösterme
}).addTo(map);

// Locate kontrolünün butonunu gizle
locateControl.getContainer().style.display = 'none';

// Konum butonu işlevi
const locateButton = document.getElementById('locate-button');
locateButton.addEventListener('click', function() {
// Locate kontrolünü çalıştır
  locateControl.start();
});



// Search Control
const searchControl = new L.Control.Search({
    url: 'https://nominatim.openstreetmap.org/search?&countrycodes=TR&format=json&q={s}',
    jsonpParam: 'json_callback',
    propertyName: 'display_name',
    propertyLoc: ['lat', 'lon'],
    marker: false, // Built-in marker'ı devre dışı bırak
    autoCollapse: false,
    autoType: false,
    minLength: 2,
    collapsed: false,
    textPlaceholder: 'Konum ya da koordinat ara'
});

map.addControl(searchControl);
let searchMarker; 
map.createPane('searchMarkerPane');
map.getPane('searchMarkerPane').style.pointerEvents = 'none'; // Tıklamaları engelle
map.getPane('searchMarkerPane').style.zIndex = 200; // Daha düşük bir z-index ver

searchControl.on('search:locationfound', function(e) {
    if (searchMarker) {
        map.removeLayer(searchMarker); 
    }
    lat = e.latlng.lat;
    lon = e.latlng.lng;
    searchMarker = L.circleMarker(e.latlng, {
        radius: 30,
        pane: 'searchMarkerPane', // Özel pane kullan
        fillColor: '#3388ff',
        color: '#3388ff',
        fillOpacity: 0.5
    }).addTo(map);
});

searchControl.on('search:cancel', function() {
    console.log('Search cancelled');
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
});

function handleLocation(lat, lon) {
    if (searchMarker) {
        map.removeLayer(searchMarker);
    }
    map.setView([lat, lon], 13);
    searchMarker = L.circleMarker([lat, lon], {
        radius: 30,
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.4,
        fillColor: '#3388ff',
        pane: 'markerPane'
    }).addTo(map);
}

const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        if (!e.target.value && searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }
    });
}

searchControl.on('search:textentered', function(e) {
    let inputText = e.text.trim();

    const coords = inputText.split(',');
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        lat = parseFloat(coords[0]);
        lon = parseFloat(coords[1]);

        map.setView([lat, lon], 13);

        if (searchMarker) {
            map.removeLayer(searchMarker);
        }
        searchMarker = L.marker([lat, lon], { zIndex: 100 }).addTo(map);
    }
});


// Zoom butonları işlevselliği
const zoomInButton = document.getElementById('zoom-in-button');
const zoomOutButton = document.getElementById('zoom-out-button');

zoomInButton.addEventListener('click', function() {
  map.zoomIn();
});

zoomOutButton.addEventListener('click', function() {
  map.zoomOut();
});


// Drive Linkini Dönüştürme
function convertDriveLink(url) {
    // Drive ID'sini çıkar
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
        const fileId = fileIdMatch[1].split('?')[0];
        
        // Google Drive paylaşım linki formatını kullan
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return url;
}


// Tema Renkleri
function getColor(tema) {
    switch (tema) {
      case 'Gündelik Yaşam ve Kent Belleği': return '#ECB159';
      case 'Mimarlık ve Şehircilik': return '#8CB9BD';
      case 'Şahıs': return '#9B4444';
      case 'Tarihsel Anekdot': return '#754E1A';
      default: return '#8c564b'; // Varsayılan kahverengi
    }
  }


// Label Manager
const LABEL_WIDTH = 120;
const LABEL_HEIGHT = 20;
const BUFFER_SIZE = 10;

let labelLayer = L.layerGroup();
let labelMarkers = new Map();
let iconCache = new Map();


function handleFeatureClick(feature, latlng) {
    map.flyTo(latlng, 17, {
        duration: 1.5,
        easeLinearity: 0.2
    });

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
        showClass: "fancybox-fadeIn", // Giriş animasyonu
        hideClass: "fancybox-fadeOut", // Çıkış animasyonu    
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

const LabelManager = {
    checkLabelVisibility: function() {
        if (!map.hasLayer(labelLayer)) return;

        const visibleLabels = new Set();
        const bounds = map.getBounds();
        const visibleMarkers = [];

        labelMarkers.forEach((marker, key) => {
            if (bounds.contains(marker.getLatLng())) {
                visibleMarkers.push(marker);
            } else {
                marker.setOpacity(0);
            }
        });

        visibleMarkers.forEach((marker1, index) => {
            const pos1 = map.latLngToContainerPoint(marker1.getLatLng());
            let isOverlapping = false;

            for (let i = 0; i < index; i++) {
                const marker2 = visibleMarkers[i];
                if (visibleLabels.has(marker2)) {
                    const pos2 = map.latLngToContainerPoint(marker2.getLatLng());
                    if (this.isOverlappingWithBuffer(pos1, pos2)) {
                        isOverlapping = true;
                        break;
                    }
                }
            }

            if (!isOverlapping) {
                visibleLabels.add(marker1);
            }
        });

        requestAnimationFrame(() => {
            visibleMarkers.forEach(marker => {
                marker.setOpacity(visibleLabels.has(marker) ? 1 : 0);
            });
        });
    },

    isOverlappingWithBuffer: function(pos1, pos2) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        
        return dx < (LABEL_WIDTH + 2 * BUFFER_SIZE) && 
               dy < (LABEL_HEIGHT + 2 * BUFFER_SIZE);
    },

    createLabel: function(feature, latlng) {
        const content = feature.properties.Mekan;
        let label = iconCache.get(content);
        
        if (!label) {
            label = L.divIcon({
                className: 'map-label',
                html: `<div class="label-content">${content}</div>`,
                iconSize: [LABEL_WIDTH, LABEL_HEIGHT],
                iconAnchor: [LABEL_WIDTH / 2, -10]
            });
            iconCache.set(content, label);
        }

        const labelMarker = L.marker(latlng, {
            icon: label,
            zIndexOffset: 1000
        });

        // Add click handler to label
        labelMarker.on('click', function() {
            handleFeatureClick(feature, latlng);
        });

        labelMarkers.set(content, labelMarker);
        return labelMarker;
    },

    updateLabels: function() {
        const zoom = map.getZoom();
        
        if (zoom >= 17) {
            if (!map.hasLayer(labelLayer)) {
                labelLayer.addTo(map);
            }
            this.checkLabelVisibility();
        } else {
            if (map.hasLayer(labelLayer)) {
                map.removeLayer(labelLayer);
            }
        }
    },

    initializeLabels: function(features) {
        if (!features || features.length === 0) {
            console.warn("No features available to initialize labels.");
            return;
        }

        this.clearLabels();

        features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                const latlng = L.latLng(coords[1], coords[0]);
                const labelMarker = this.createLabel(feature, latlng);
                labelMarker.feature = feature;
                labelLayer.addLayer(labelMarker);
            }
        });

        this.updateLabels();
    },

    clearLabels: function() {
        labelLayer.clearLayers();
        labelMarkers.clear();
    }
};

// Debounce ile optimize edilmiş event handler'lar
let debounceTimer;
const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => LabelManager.updateLabels(), 200);
};

map.on('zoomend', debouncedUpdate);
map.on('moveend', debouncedUpdate);

// Document Ready ve GeoJSON yükleme
$(document).ready(function() {
    const resetModalScroll = () => $('.modal-body').scrollTop(0);

    $('#noteModal').on('show.bs.modal', function() {
        $(this).find('.modal-body').scrollTop(0);
    }).on('shown.bs.modal', function() {
        $(this).find('.modal-body').scrollTop(0);
    });

    // MarkerClusterGroup oluştur
    const markers = L.markerClusterGroup({
        disableClusteringAtZoom: 17,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        // Cluster icon oluşturma fonksiyonunu özelleştir
        iconCreateFunction: function(cluster) {
            const childCount = cluster.getChildCount();
            let size = 'large';
            
            if (childCount < 10) {
                size = 'small';
            } else if (childCount < 100) {
                size = 'medium';
            }
            
            return new L.DivIcon({
                html: '<div><span>' + childCount + '</span></div>',
                className: 'marker-cluster marker-cluster-' + size,
                iconSize: new L.Point(40, 40)
            });
        }
    });

    fetch('assets/geojson/data.geojson')
        .then(response => response.json())
        .then(data => {
            LabelManager.initializeLabels(data.features);
            
            const geoJsonLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    const marker = L.circleMarker(latlng, {
                        radius: 6.5,
                        fillColor: getColor(feature.properties.Tema),
                        color: '#ffffff',
                        weight: 1.5,
                        opacity: 0.8,
                        fillOpacity: 0.8,
                        pane: 'markerPane',
                    });

                    return marker;
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        handleFeatureClick(feature, layer.getLatLng());
                    });
                }
            });

            markers.addLayer(geoJsonLayer);
            map.addLayer(markers);
        })
        .catch(error => {
            console.error('GeoJSON yüklenirken hata oluştu:', error);
        });
});


// Albüm

document.addEventListener('DOMContentLoaded', function() {
    let allGalleryItems = [];
    let selectedTheme = null;
    let selectedSubthemes = new Set();
    
    // GeoJSON'dan verileri çek
    fetch('assets/geojson/data.geojson')
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
            Array.from(allSubthemes).sort().forEach(subtheme => {
                const tag = document.createElement('span');
                tag.className = 'subtheme-tag';
                tag.dataset.subtheme = subtheme;
                tag.textContent = subtheme;
                tag.onclick = () => toggleSubtheme(tag);
                subthemeSlider.appendChild(tag);
            });

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

    // Alt tema toggle fonksiyonu (yalnızca bir tane seçilebilir)
    function toggleSubtheme(element) {
        // Önce tüm alt temaları devre dışı bırak
        document.querySelectorAll('.subtheme-tag').forEach(tag => tag.classList.remove('active'));
        selectedSubthemes.clear();

        // Yeni seçimi aktif hale getir
        element.classList.add('active');
        selectedSubthemes.add(element.dataset.subtheme);

        renderGallery();
    }

    // Slider kontrol butonları
    function initializeSliderControls() {
        const slider = document.querySelector('.subtheme-slider');
        const leftBtn = document.querySelector('.slider-control.left');
        const rightBtn = document.querySelector('.slider-control.right');

        leftBtn.onclick = () => {
            slider.scrollBy({ left: -200, behavior: 'smooth' });
        };

        rightBtn.onclick = () => {
            slider.scrollBy({ left: 200, behavior: 'smooth' });
        };
    }

    // Ana tema filtre click handler
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            selectedTheme = this.dataset.tema;
            renderGallery();
        });
    });

    // Galeri render fonksiyonu
    function renderGallery() {
        let filteredItems = allGalleryItems;

        // Ana tema filtresi
        if (selectedTheme) {
            filteredItems = filteredItems.filter(item => item.tema === selectedTheme);
        }

        // Alt tema filtresi
        if (selectedSubthemes.size > 0) {
            filteredItems = filteredItems.filter(item => 
                item.altTema.some(tema => selectedSubthemes.has(tema))
            );
        }

     const galleryGrid = document.getElementById('albumMediaID');
    galleryGrid.innerHTML = filteredItems.map(item => `
        <div class="ke-gallery-item">
            <a href="${item.src}" 
               data-fancybox="album-gallery"
               data-caption="${item.metin || 'No description available'}" 
               data-label="${item.caption || 'Unknown location'}">
                <div class="gallery-overlay">
                    <p class="gallery-label">${item.caption || 'Unknown location'}</p>
                </div>
                <img src="${item.src}" 
                     alt="${item.caption || 'Image not available'}" 
                     class="img-fluid gallery-image"
                     onerror="this.onerror=null; this.src='assets/images/placeholder.jpg';">
            </a>
        </div>
    `).join('');

    initializeFancybox();
}

    function updateSubthemes() {
        const subthemeSlider = document.getElementById('subthemeSlider');
        subthemeSlider.innerHTML = ''; // Mevcut alt tema seçeneklerini temizle
    
        // Alt tema seçimini sıfırla
        selectedSubthemes.clear();
        document.querySelectorAll('.subtheme-tag').forEach(tag => tag.classList.remove('active'));
    
        if (!selectedTheme) return; // Ana tema seçilmediyse işlem yapma
    
        // Seçilen ana tema ile ilişkili alt temaları bul
        const relatedSubthemes = new Set();
        allGalleryItems.forEach(item => {
            if (item.tema === selectedTheme) {
                item.altTema.forEach(subtheme => relatedSubthemes.add(subtheme));
            }
        });
    
        // İlgili alt temaları slider'a ekle
        Array.from(relatedSubthemes).sort().forEach(subtheme => {
            const tag = document.createElement('span');
            tag.className = 'subtheme-tag';
            tag.dataset.subtheme = subtheme;
            tag.textContent = subtheme;
            tag.onclick = () => toggleSubtheme(tag);
            subthemeSlider.appendChild(tag);
        });
    }
    

        // Ana tema filtre click handler (alt temaları günceller)
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', function() {
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                selectedTheme = this.dataset.tema;
        
                updateSubthemes(); // Alt temaları güncelle ve seçimleri sıfırla
                renderGallery();   // Galeriyi yeniden render et
            });
        });
        


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
            caption: function (fancybox, carousel, slide) {
                return slide.caption;
            },
        });
    }

    // Modal scroll reset
    $('#albumModal').on('show.bs.modal', function() {
        $(this).find('.modal-body').scrollTop(0);
    });
});