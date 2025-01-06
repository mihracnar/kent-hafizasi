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
    "OpenStreetMap": osmLayer
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
    marker: L.circleMarker([0, 0], { radius: 30 }),
    autoCollapse: false,
    autoType: false,
    minLength: 2,
    collapsed: false,
    textPlaceholder: 'Konum ya da koordinat ara'
});

map.addControl(searchControl);

let searchMarker; 

searchControl.on('search:locationfound', function(e) {
    if (searchMarker) {
        map.removeLayer(searchMarker); 
    }
    lat = e.latlng.lat;
    lon = e.latlng.lng;
    searchMarker = L.circleMarker(e.latlng, { radius: 30 }).addTo(map);
});

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
        searchMarker = L.marker([lat, lon]).addTo(map);
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



function getColor(tema) {
    switch (tema) {
      case 'Gündelik Yaşam ve Kent Belleği': return '#38a6ee';
      case 'Mimarlık ve Şehircilik': return '#b5d176';
      case 'Şahıs': return '#ea402c';
      case 'Tarihsel Anekdot': return '#8d4e0e';
      default: return '#8c564b'; // Varsayılan kahverengi
    }
  }




// Geojson ve Photogalery yükleme
$(document).ready(function() {
    // Modal kapandığında scroll'u sıfırla
    $('#noteModal').on('hidden.bs.modal', function () {
        $('.modal-body').scrollTop(0);
    });

    fetch('assets/geojson/data.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: getColor(feature.properties.Tema),
                        color: '#ffffff', // Kenarlık rengi beyaz
                        weight: 1,
                        opacity: 0.8,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        const markerLatLng = layer.getLatLng();
                        
                        map.flyTo(markerLatLng, 17, {
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

                        // Fancybox'ı başlat
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
                    });
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error('GeoJSON yüklenirken hata oluştu:', error);
        });
});


