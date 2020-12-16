let app;
let map;
let neighborhood_markers = 
[
    {location: [44.942068, -93.020521], marker: null},
    {location: [44.977413, -93.025156], marker: null},
    {location: [44.931244, -93.079578], marker: null},
    {location: [44.956192, -93.060189], marker: null},
    {location: [44.978883, -93.068163], marker: null},
    {location: [44.975766, -93.113887], marker: null},
    {location: [44.959639, -93.121271], marker: null},
    {location: [44.947700, -93.128505], marker: null},
    {location: [44.930276, -93.119911], marker: null},
    {location: [44.982752, -93.147910], marker: null},
    {location: [44.963631, -93.167548], marker: null},
    {location: [44.973971, -93.197965], marker: null},
    {location: [44.949043, -93.178261], marker: null},
    {location: [44.934848, -93.176736], marker: null},
    {location: [44.913106, -93.170779], marker: null},
    {location: [44.937705, -93.136997], marker: null},
    {location: [44.949203, -93.093739], marker: null}
];

function init() {
    let crime_url = 'http://localhost:8000';
    let query;

    app = new Vue({
        el: '#app',
        data: {
            map: {
                center: {
                    lat: 44.955139,
                    lng: -93.102222,
                    address: ""
                },
                zoom: 12,
                bounds: {
                    nw: {lat: 45.008206, lng: -93.217977},
                    se: {lat: 44.883658, lng: -92.993787}
                }
            },
            codes: [],
            neighborhoods: [],
            incidents: [],
            search_bar: "",
            code_dictionary: {},
            visible_neighborhoods: [1,2,3]
        }

    });

    map = L.map('leafletmap').setView([app.map.center.lat, app.map.center.lng], app.map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18,
        dragging: true
    }).addTo(map);
    map.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    map.on("zoomend",updateVisibleNeighborhoods);
    map.on("moveend",updateVisibleNeighborhoods);

    let i;
    for(i = 0; i<neighborhood_markers.length;i++){
        neighborhood_markers[i].marker = L.marker(neighborhood_markers[i].location).addTo(map);
        //neighborhood_markers[i].marker.bindPopup('Hello');
    }
    
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map);

    getJSON('data/StPaulDistrictCouncil.geojson').then((result) => {
        // St. Paul GeoJSON
        $(result.features).each(function(key, value) {
            district_boundary.addData(value);
        });
    }).catch((error) => {
        console.log('Error:', error);
    });

    getJSON('/codes').then((result) =>{
        app.codes = result;
        let code_dictionary = {};
        let i;
        for(i = 0; i<app.codes.length; i++){
            code_dictionary[app.codes[i].code] = app.codes[i].type;
        }
        app.code_dictionary = code_dictionary;
    }).catch((error) => {
        console.log('Error:', error);
    });

    getJSON('/neighborhoods').then((result) =>{
        app.neighborhoods = result;
    }).catch((error) => {
        console.log('Error:', error);
    });

    getJSON('/incidents').then((result) =>{
        app.incidents = result;
        console.log(app.incidents)
        for(i = 0; i<neighborhood_markers.length;i++){
            let j;
            let count=0;
            for(j=0;j<app.incidents.length; j++){
                if(i+1== app.incidents[j].neighborhood_number){
                    count = count + 1;
                }
            }
            neighborhood_markers[i].marker.bindPopup(count + ' total crimes');
        }
    }).catch((error) => {
        console.log('Error:', error);
    });
}

function updateVisibleNeighborhoods(){
    console.log("map interaction finished");
}

function search() 
{
    let query = app.search_bar;
    console.log(query);
    getJSON('https://nominatim.openstreetmap.org/search?format=json&q=' + query + 'Saint Paul, Minnesota').then((result) => {
        console.log(result);
        if (result.length == 0)
        {
            console.log('Error: no such address or object');
            app.search_bar = "";
        }
        else
        {
            app.map.center.lat = parseFloat(result[0].lat);
            app.map.center.lng = parseFloat(result[0].lon);
            console.log(app.map.center.lat);
            map = map.panTo(new L.LatLng(app.map.center.lat, app.map.center.lng));
            map.setZoom(17);
            app.search_bar = result[0].display_name;
            app.map.center.address = result[0].display_name;
            //console.log(app.map.bounds.nw);
        }
    });


}

function getJSON(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            dataType: "json",
            url: url,
            success: function(data) {
                resolve(data);
            },
            error: function(status, message) {
                reject({status: status.status, message: status.statusText});
            }
        });
    });
}
