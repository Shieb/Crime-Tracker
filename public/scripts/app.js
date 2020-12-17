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
            visible_neighborhoods: [],
            markers: []
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

    //don't think we need this one.
    //map.on("zoomend",updateVisibleNeighborhoods);
    map.on("moveend",updateMapIncidents);
    
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
        let neighborhood_dictionary = {};
        let i;
        for(i = 0; i<app.neighborhoods.length; i++){
            neighborhood_dictionary[app.neighborhoods[i].id] = i+1 + ": " + app.neighborhoods[i].name;
        }
        app.neighborhood_dictionary = neighborhood_dictionary;
    }).catch((error) => {
        console.log('Error:', error);
    });
    updateMapIncidents();
}

function updateMapIncidents()
{
    updateVisibleNeighborhoods();
    updateMarkers();
    getIncidents();
}

function updateMarkers()
{
    while(app.markers.length > 0)
    {
        map.removeLayer(app.markers.pop())
    }
    for(let i = 0; i<app.visible_neighborhoods.length; i++){
        app.markers.push(L.marker(neighborhood_markers[i].location).addTo(map));
        //app.markers[i].bindPopup('Hello');
    }
    console.log(app.markers);
}
function updateVisibleNeighborhoods(){
    
    let seenNeighborhoods = [];
    for(let i = 0; i < neighborhood_markers.length; i++)
    {
        if (neighborhood_markers[i].location[1] - 0.02 < map.getBounds().getEast() 
        && neighborhood_markers[i].location[1] + 0.02 > map.getBounds().getWest()
        && neighborhood_markers[i].location[0] - 0.02 < map.getBounds().getNorth()
        && neighborhood_markers[i].location[0] + 0.02 > map.getBounds().getSouth())
        {
            seenNeighborhoods.push(i);
        }
    }
    console.log("map interaction finished: " + seenNeighborhoods);
    if (seenNeighborhoods.length != 0)
        app.visible_neighborhoods = seenNeighborhoods;
}

function getIncidents()
{
    if (app.visible_neighborhoods.length > 0)
    {
        let incSearch = "/incidents?id=" + (app.visible_neighborhoods[0] + 1);
        for(let i = 1; i < app.visible_neighborhoods.length; i++)
        {
            incSearch = incSearch + "," + (app.visible_neighborhoods[i] + 1);
        }
        getJSON(incSearch).then((result) =>{
            app.incidents = result;

            let i;
            for(i = 0; i<app.visible_neighborhoods.length;i++){
                let j;
                let count=0;
                for(j=0;j<app.incidents.length; j++){
                    if(i+1== app.incidents[j].neighborhood_number){
                        count = count + 1;
                    }
                }
                app.markers[i].bindPopup('Neighborhood ' +(i+1) + ': ' +count + ' total crimes');
            }
        }).catch((error) => {
            console.log('Error:', error);
        });
    }
    else
    {
        getJSON('/incidents').then((result) =>{
            app.incidents = result;

            let i;
            for(i = 0; i<app.visible_neighborhoods.length;i++){
                let j;
                let count=0;
                for(j=0;j<app.incidents.length; j++){
                    if(i+1== app.incidents[j].neighborhood_number){
                        count = count + 1;
                    }
                }
                neighborhood_markers[i].marker.bindPopup('Neighborhood ' +(i+1) + ': ' +count + ' total crimes');
            }
        }).catch((error) => {
            console.log('Error:', error);
        });
    }
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
