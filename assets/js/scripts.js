const map = L.map('map').setView([41.0082, 28.9784], 11);

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

const layersControl = L.control.layers({
    "Carto Light": cartoLightLayer,
    "Google Maps (Uydu)": googleMapsSatelliteLayer,
    "Google Maps (Uydu Hibrit)": googleMapsSatelliteHybridLayer,
    "Google Maps (Harita)": googleMapsLayer,
    "OpenStreetMap": osmLayer,
}, {}, { collapsed: false });

layersControl.addTo(map);
const layerControlElement = layersControl.getContainer();
document.getElementById('layersModalBody').appendChild(layerControlElement);

// Add click event listener to the logo
document.querySelector('.logo').addEventListener('click', function() {
    // Fly to initial position with animation
    map.flyTo([41.0082, 28.9784], 11, {
        animate: true,
        duration: 1// Duration of animation in seconds
    });
});

// Location Control
const locateControl = L.control.locate({
    position: 'topright',
    flyTo: true,
    showPopup: false,
    strings: {
        title: "Konumuma Git"
    },
    icon: 'fa fa-location-arrow',
    setView: true,
    showMarker: true
}).addTo(map);

locateControl.getContainer().style.display = 'none';

const locateButton = document.getElementById('locate-button');
locateButton.addEventListener('click', function() {
    locateControl.start();
});




// Search Control Configuration
function initializeSearch() {
    const searchControl = new L.Control.Search({
        sourceData: function(text, callResponse) {
            // First search in local data
            const localResults = searchLocalData(text);
            
            if (localResults.length > 0) {
                callResponse(localResults);
            } else {
                // If no local results, search using Nominatim
                searchNominatim(text, callResponse);
            }
        },
        propertyName: 'name',
        propertyLoc: ['lat', 'lon'],
        marker: false,
        autoCollapse: false,
        autoType: false,
        minLength: 2,
        collapsed: false,
        textPlaceholder: 'Konum ya da koordinat ara',
        firstTipSubmit: true,
        caseSensitive: false,
        // Aşağıdaki ayarları ekleyin
        initial: false,
        zoom: 17,
        formatData: function(rawjson) {
            console.log('Format data:', rawjson);
            return rawjson;
        },
        filterData: function(text, records) {
            console.log('Filter data:', records);
            return records;
        },
        // Sonuç gösterimini özelleştirme
        buildTip: function(text, val) {
            const title = val.name || 'İsimsiz Mekan';
            return '<div class="search-tip">' + title + '</div>';
        }
    });

    map.addControl(searchControl);

    // Create search marker pane
    map.createPane('searchMarkerPane');
    map.getPane('searchMarkerPane').style.pointerEvents = 'none';
    map.getPane('searchMarkerPane').style.zIndex = 200;

    let searchMarker = null;

    // Search result handlers
    searchControl.on('search:locationfound', function(e) {
        if (searchMarker) {
            map.removeLayer(searchMarker);
        }

        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        // Check if this is a local data result
        if (e.layer && e.layer.feature) {
            handleFeatureClick(e.layer.feature, e.latlng);
        } else {
            // This is a Nominatim result
            searchMarker = L.circleMarker(e.latlng, {
                radius: 30,
                pane: 'searchMarkerPane',
                fillColor: '#3388ff',
                color: '#3388ff',
                fillOpacity: 0.5
            }).addTo(map);
        }

        map.flyTo(e.latlng, 17);
    });

    searchControl.on('search:cancel', function() {
        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }
    });
}


// Search in local GeoJSON data
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
                // Ek bilgileri de ekleyelim
                properties: properties
            });
        }
    });
    
    return results;
}

// Search using Nominatim
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

// Initialize search when document is ready
$(document).ready(function() {
    initializeSearch();
});





// Label Manager Configuration
const LABEL_WIDTH = 120;
const LABEL_HEIGHT = 20;
const BUFFER_SIZE = 10;

let labelLayer = L.layerGroup();
let labelMarkers = new Map();
let iconCache = new Map();

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
        return dx < (LABEL_WIDTH + 2 * BUFFER_SIZE) && dy < (LABEL_HEIGHT + 2 * BUFFER_SIZE);
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

        labelMarker.on('click', function() {
            handleFeatureClick(feature, latlng);
        });

        labelMarkers.set(content, labelMarker);
        return labelMarker;
    },

    updateLabels: function() {
        const zoom = map.getZoom();
        
        if (zoom >= 16) {
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




// Filter System
let markers = null;
let selectedThemes = new Set();
let selectedSubThemes = new Set();
let allFeatures = [];
let geoJsonLayer = null;

function getColor(tema) {
    switch (tema) {
        case 'Gündelik Yaşam ve Kent Belleği': return '#ECB159';
        case 'Mimarlık ve Şehircilik': return '#8CB9BD';
        case 'Şahıs': return '#9B4444';
        case 'Tarihsel Anekdot': return '#754E1A';
        default: return '#8c564b';
    }
}

function convertDriveLink(url) {
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
        const fileId = fileIdMatch[1].split('?')[0];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return url;
}

function handleFeatureClick(feature, latlng) {
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom > 17 ? currentZoom : 17;

    map.flyTo(latlng, targetZoom, {
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

function initializeFilters() {
    fetch('assets/geojson/data_v2.geojson')
        .then(response => response.json())
        .then(data => {
            allFeatures = data.features;
            initializeMarkers(data);
            setupFilterModal();
            setupFilterEvents();
        })
        .catch(error => console.error('Filter data loading error:', error));
}

function initializeMarkers(data) {
    markers = L.markerClusterGroup({
        disableClusteringAtZoom: 17,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
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

    geoJsonLayer = L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6.5,
                fillColor: getColor(feature.properties.Tema),
                color: '#ffffff',
                weight: 1.5,
                opacity: 0.8,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function(feature, layer) {
            layer.on('click', function() {
                handleFeatureClick(feature, layer.getLatLng());
            });
        }
    });

    markers.addLayer(geoJsonLayer);
    map.addLayer(markers);
    LabelManager.initializeLabels(allFeatures);
}

function setupFilterModal() {
    // Clear existing subtheme container
    const subThemeContainer = document.getElementById('subThemeContainer');
    subThemeContainer.innerHTML = '';
    
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

function updateSubThemeOptions() {
    const subThemeContainer = document.getElementById('subThemeContainer');
    subThemeContainer.innerHTML = '';
    selectedSubThemes.clear();

    if (selectedThemes.size === 0) {
        return;
    }

    // Get all subthemes for selected themes
    const relevantSubThemes = new Set();
    allFeatures.forEach(feature => {
        if (selectedThemes.has(feature.properties.Tema) && feature.properties.Alt_Tema) {
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

function applyFilters() {
    const filteredFeatures = allFeatures.filter(feature => {
        const themeMatch = selectedThemes.size === 0 || 
                          selectedThemes.has(feature.properties.Tema);
        
        let subThemeMatch = true;
        if (selectedSubThemes.size > 0 && feature.properties.Alt_Tema) {
            const featureSubThemes = feature.properties.Alt_Tema.split(',')
                .map(t => t.trim());
            subThemeMatch = featureSubThemes.some(t => selectedSubThemes.has(t));
        }
        
        return themeMatch && subThemeMatch;
    });

    // Update markers
    markers.clearLayers();
    
    const newGeoJsonLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: filteredFeatures
    }, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6.5,
                fillColor: getColor(feature.properties.Tema),
                color: '#ffffff',
                weight: 1.5,
                opacity: 0.8,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function(feature, layer) {
            layer.on('click', function() {
                handleFeatureClick(feature, layer.getLatLng());
            });
        }
    });

    markers.addLayer(newGeoJsonLayer);
    
    // Update labels with filtered features
    LabelManager.initializeLabels(filteredFeatures);
    
    $('#filterModal').modal('hide');
}

function resetFilters() {
    selectedThemes.clear();
    selectedSubThemes.clear();

    // Reset all checkboxes
    document.querySelectorAll('.theme-filters input[type="checkbox"], .subtheme-filters input[type="checkbox"]')
        .forEach(checkbox => checkbox.checked = false);

    // Clear subtheme container
    const subThemeContainer = document.getElementById('subThemeContainer');
    subThemeContainer.innerHTML = '';

    // Reset markers and labels to show all features
    if (markers && geoJsonLayer) {
        markers.clearLayers();
        markers.addLayer(geoJsonLayer);
        LabelManager.initializeLabels(allFeatures);
    }
}

// Map event listeners for label management
let debounceTimer;
const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => LabelManager.updateLabels(), 200);
};

map.on('zoomend', debouncedUpdate);
map.on('moveend', debouncedUpdate);

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