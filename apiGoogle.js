
var drawingManager;
var selectedShape;
var colors = ['#1E90FF', '#000000', '#32CD32', '#FF8C00', '#4B0082'];
var selectedColor;
var colorButtons = {};
var polygonArray = [];
var map;
    
function getLocation() {
    if (navigator.geolocation) {
        $('#search-button').html('Buscando...');
        $('#search-button').attr('disabled','disabled');
        navigator.geolocation.getCurrentPosition(setAutomaticCenter,habilitarButton);
    } else {
        x.innerHTML = "O seu navegador não suporta Geolocalização.";
    }
}
    
function habilitarButton() {
    $('#search-button').html('Buscar');
    $('#search-button').attr('disabled',false);
}

function setAutomaticCenter(position) {
    console.log('entrou');
    if (position!=null) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        setCenter(lat,lng);
    }
    habilitarButton();
}

function search() {
    $('#search-button').attr('disabled','disabled');
    var query = $('#query').val();
    if (query.search("CROQUI")==0) {
        getCroquiByCode(query);
    } else {
        searchCity(query);
    }
}
    
function getCroquiByCode(query='') {
    $('#search-button').attr('disabled',false);
    window.location.href = '/croqui-propriedade-rural/' + query;
}
    
function searchCity(query='') {
    var url = 'https://maps.google.com/maps/api/geocode/json?key=AIzaSyCySJPt6RQZ4ke9EoNpLK_s-JJOyAwn-rc&address=' + query;
    $.ajax({
        url: url,
    }).done(function(data) {
        if (data.status=='OK') {
            var location = data.results[0].geometry.location;
            setCenter(location.lat,location.lng);
        } else {
            alert('Mapa não encontrado, tente digitar CIDADE ESTADO');
        }
        $('#search-button').attr('disabled',false);
    });
}
    
function initialize () {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: new google.maps.LatLng(-23.427626, -51.929725),
        mapTypeId: google.maps.MapTypeId.HYBRID,
        disableDefaultUI: true,
        zoomControl: true
    });
    var polyOptions = {
        strokeWeight: 2,
        strokeOpacity: 0.7,
        fillOpacity: 0.30,
        editable: true,
        draggable: false,
        zIndex: 1
    };
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControlOptions: {
            drawingModes: ['polygon']
        },
        polylineOptions: {
            editable: true,
            draggable: false
        },
        polygonOptions: polyOptions,
        map: map
    });
    buildColorPalette();
    
    google.maps.event.addListener(drawingManager, 'overlaycomplete', function (e) {
        var newShape = e.overlay;
        newShape.type = e.type;
        newShape.id = polygonArray.length;
        newShape.name = 'G' + (newShape.id + 1);
        newShape.area = getArea(newShape);
        newShape.perimeter = getPerimeter(newShape);
        addShape(newShape);
        setSelection(newShape);
    });
    google.maps.event.addListener(drawingManager, 'drawingmode_changed', clearSelection);
    google.maps.event.addListener(map, 'click', clearSelection);
    google.maps.event.addDomListener(document.getElementById('delete-button'), 'click', deleteSelectedShape);
    }
function clearSelection () {
    if (selectedShape) {
        if (selectedShape.type !== 'marker') {
            if (selectedShape.getPath().length<3) {
                deleteSelectedShape();
            } else {
                selectedShape.setOptions({ zIndex: 1 , fillOpacity: 0.3 });
                selectedShape.setEditable(false);
                clearField(selectedShape);
            }
        }
        selectedShape = null;
    }
}

function setSelection (shape) {
    if (shape.type !== 'marker') {
        clearSelection();
        shape.setEditable(true);
        selectColor(shape.get('fillColor') || shape.get('strokeColor'));
        selectField(shape);
        shape.setOptions({ zIndex: 10 , fillOpacity: 0.4 });
    }
    selectedShape = shape;
}

function deleteSelectedShape () {
    if (selectedShape) {
        $('#farm-field-'+selectedShape.id).remove();
        polygonArray[selectedShape.id] = null;
        selectedShape.setMap(null);
        updateArea();
    }
}

function selectColor (color) {
    selectedColor = color;
    for (var i = 0; i < colors.length; ++i) {
        var currColor = colors[i];
        colorButtons[currColor].style.border = currColor == color ? '2px solid #fff' : '1px solid #fff';
    }


    var polygonOptions = drawingManager.get('polygonOptions');
    polygonOptions.fillColor = color;
    polygonOptions.strokeColor = color;
    drawingManager.set('polygonOptions', polygonOptions);
}

function setSelectedShapeColor (color) {
    if (selectedShape) {
        selectedShape.set('strokeColor', color);
        selectedShape.set('fillColor', color);
    }
}

function makeColorButton (color) {
    var button = document.createElement('span');
    button.className = 'color-button';
    button.style.backgroundColor = color;
    google.maps.event.addDomListener(button, 'click', function () {
        selectColor(color);
        setSelectedShapeColor(color);
    });

    return button;
}

function buildColorPalette () {
    var colorPalette = document.getElementById('color-palette');
    for (var i = 0; i < colors.length; ++i) {
        var currColor = colors[i];
        var colorButton = makeColorButton(currColor);
        colorPalette.appendChild(colorButton);
        colorButtons[currColor] = colorButton;
    }
    selectColor(colors[0]);
}
    
function getArea(shape) {
    return google.maps.geometry.spherical.computeArea(shape.getPath())
}

function getPerimeter(shape) {
    var path = shape.getPath();
    var newPath = [];
    newPath.push(path.getAt(0));
    newPath.push(path.getAt(path.length-1));
    var perimetro = google.maps.geometry.spherical.computeLength(newPath) + google.maps.geometry.spherical.computeLength(path);
    return perimetro;
}
    
function addShape(newShape) {
    drawingManager.setDrawingMode(null);
    
    google.maps.event.addListener(newShape, 'click', function (e) {
        if (e.vertex !== undefined) {
            if (newShape.type === google.maps.drawing.OverlayType.POLYGON) {
                var path = newShape.getPaths().getAt(e.path);
                path.removeAt(e.vertex);
                if (path.length < 3) {
                    deleteSelectedShape();
                }
            }
        }
        setSelection(newShape);
    });
    
    google.maps.event.addListener(newShape.getPath(), 'insert_at', function() {
        newShape.area = getArea(newShape);
        newShape.perimeter = getPerimeter(newShape);
        updateField(newShape)
        polygonArray[newShape.id] = newShape;
        updateArea();
    });
    google.maps.event.addListener(newShape.getPath(), 'set_at', function() {
        newShape.area = getArea(newShape);
        newShape.perimeter = getPerimeter(newShape);
        updateField(newShape)
        polygonArray[newShape.id] = newShape;
        updateArea();
    });

    google.maps.event.addListener(newShape.getPath(), 'remove_at', function() {
        newShape.area = getArea(newShape);
        newShape.perimeter = getPerimeter(newShape);
        updateField(newShape)
        polygonArray[newShape.id] = newShape;
        updateArea();
    });
    addField(newShape);
    selectField(newShape);
    polygonArray.push(newShape);
    updateArea();
}
    
function addField(shape) {
    var field = '<tr id="farm-field-' + shape.id +  '" onclick="selectFieldList(' + shape.id + ')"><td>';
    field += shape.name;
    field += '</td>';
    field += '<td>' + formatBr((shape.area/10000).toFixed(2)) + ' ha</td>';
    field += '<td>' + formatBr((shape.area/24200).toFixed(2)) + ' alq</td>';
    field += '<td>' + formatBr(shape.area.toFixed(0)) + ' m<sup>2</sup></td>';
    field += '<td>' + (shape.perimeter).toFixed(0) + ' m </td></tr>';
    $('#farm-fields').append(field);
}
    
function formatBr(number=0) {
    return new Intl.NumberFormat('pt-BR').format(number);
} 

function selectField(shape) {
    $('#farm-field-'+shape.id).addClass('warning');
}
    
function clearField(shape) {
    $('#farm-field-'+shape.id).removeClass('warning');
}

function updateArea() {
    var total_area_m2 = getTotalArea();
    $('#total_area_ha').html(formatBr((total_area_m2/10000).toFixed(2))  + ' ha');
    $('#total_area_alq').html(formatBr((total_area_m2/24200).toFixed(2))  + ' alq');
    $('#total_area_m2').html(formatBr((total_area_m2).toFixed(0))  + ' m<sup>2</sup>');
    
    var total_perimeter = getTotalPerimeter();
    $('#total_perimeter').html(formatBr((total_perimeter).toFixed(0))  + ' m');
}
    
function getTotalArea() {
    var total_area = 0.0;
    for (i=0; i<polygonArray.length; i++) {
        if (polygonArray[i]) {
            total_area += polygonArray[i].area;
        }
    }
    $('#div-link').hide(100);
    return total_area;
}
    
function getTotalPerimeter() {
    var total_perimeter = 0.0;
    for (i=0; i<polygonArray.length; i++) {
        if (polygonArray[i]) {
            total_perimeter += polygonArray[i].perimeter;
        }
    }
    return total_perimeter;
}
    
function updateField(shape) {
    var field = '<td>';
    field += shape.name;
    field += '</td>';
    field += '<td>' + formatBr((shape.area/10000).toFixed(2)) + ' ha </td>';
    field += '<td>' + formatBr((shape.area/24200).toFixed(2)) + ' alq </td>';
    field += '<td>' + formatBr(shape.area.toFixed(0)) + ' m<sup>2</sup></td>';
     field += '<td>' + (shape.perimeter).toFixed(0) + ' m </td>';
    $('#farm-field-'+shape.id).html(field);
}
function selectFieldList(id) {
    var shape = polygonArray[id];
    setSelection(shape);
    selectField(shape);
}

function parser2JSON() {
    var number_of_fields = 0;
    var farm =  new Object();
    farm.fields = [];
    // falta parte do código
}