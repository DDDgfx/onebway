var mapLayersAdded = [];
var mapSourcesAdded = [];


$(document).ready(function () {

    console.log("ready steady!");
    // THE WHOLE MAP INSIDE THIS CONDITIONAL.
    if (d3.select("#map")) {
        ////MAPBOX
        mapboxgl.accessToken = 'pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';
        //Create the map
        var map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/cizzle/ckt0bxdf7247z18nyfdyg0jxz',
            center: [-74.01437444860113, 40.704838691991284], // starting position [lng, lat]
            zoom: 12, // starting zoom
            bearing: 0, //bearing
            pitch: 0,
            scrollZoom: false
            //interactive: false
        });

        //The list of amenity categories.
        var amenityCategories = Array.from(uniqueValueMap(amenityData.features, 'subcategory').keys()).sort();
        console.log(amenityCategories)
        //to be recorded if you want category specific behavior.
        var currentCategory;
        //var iconScale = d3.scaleOrdinal(['attractions', 'fitness', 'food', 'hotels', 'retail', 'services', 'transit']).domain(amenityCategories);
        var iconScale = d3.scaleOrdinal(['1b_bars', '1b_cafes', '1b_health', '1b_hotels', '1b_landmarks', '1b_restaurants', '1b_retail']).domain(amenityCategories);
        var iconScaleSVG = d3.scaleOrdinal([icon_bars, icon_cafes, icon_health, icon_hotels, icon_landmarks, icon_restaurants, icon_retail]).domain(amenityCategories);
        //['Bars', 'Cafes', 'Health', 'Hotels', 'Landmarks', 'Restaurants', 'Retail']
        //to pan and zoom for each category in the list.
        var catAngles = {
            'Attractions': {
                padding: 50,
                pitch: 0,
                bearing: -50
            },
            'Fitness': {
                padding: 50,
                pitch: 60,
                bearing: 0
            },
            'Food and Drink': {
                padding: 50,
                pitch: 35,
                bearing: -50
            },
            'Hotels': {
                padding: 25,
                pitch: 70,
                bearing: 123
            },
            'Retail': {
                padding: 25,
                pitch: 0,
                bearing: 0
            },
            'Services': {
                padding: 50,
                pitch: 0,
                bearing: -50
            },
            'Transit': {
                padding: 50,
                pitch: 0,
                bearing: 0
            }

        }

        //Map ux
        var uxDiv = d3.select('#map-ux');

        var uxBtns = uxDiv.selectAll('a').on('click', function(e) {

            var mode = d3.select(this).attr('data-w-tab');
            console.log(e);
            console.log(mode);

            if (mode == 'Transportation') { transportationMode();}
            else if (mode == 'Commute Time') { commuteMode('walking'); }
            else if (mode == 'Cycle') {citibikeMode();}
            else if (mode == 'Point of Interest') { amenityMode(); }
        })

        //Map init
        map.on('load', function () {
            
            console.log('load');

            map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

            map.flyTo({
                center: [-74.01437444860113, 40.704838691991284],
                zoom: 13
            });

             //add a geo JSON source for 10 Exchange place. alone.
            map.addSource('oneBway', {
                'type': 'geojson',
                'data': oneBwayFeature

            });
            //add a layer for 10 Exchange
            map.addLayer({
                'id': 'oneBwayPoint',
                'type': 'symbol',
                'source': 'oneBway',
                'layout': {
                    'icon-image': '1b_dot',
                    // 'text-field' : ['get', 'Name'],
                    'icon-anchor': 'bottom',
                    'icon-size': 1,
                    'icon-allow-overlap': true
                }
            });


            map.addLayer({
                'id': 'oneBwayIcons',
                'type': 'symbol',
                'source': 'oneBway',
                'layout': {
                    'icon-image': '1b_1b',
                    // 'text-field' : ['get', 'Name'],
                    'icon-anchor': 'bottom-right',
                    'icon-size': 2,
                    'icon-allow-overlap': true,
                    'icon-offset': [-10, -10] 
                }
            });

            
            commuteMode('driving');

        });

        // Update map
        //Map update
        function commuteMode(commuteType) {

            console.log(commuteType);
            console.log(map.getStyle().layers);
            map.setPaintProperty('ferry', 'line-color', '#fff');
            map.setLayoutProperty('nyc subways', 'visibility', 'none');
            map.setLayoutProperty('nyc subways shadow', 'visibility', 'none');
            map.setLayoutProperty('nyc subway stations', 'visibility', 'none');
            map.setLayoutProperty('citibike stations', 'visibility', 'none');
            map.setLayoutProperty('bike lanes', 'visibility', 'none');

            d3.selectAll('.mapboxgl-popup').remove();

            var legendDiv = d3.select('#map-legend');
            legendDiv.html('');
            legendDiv.selectAll('*').remove();


            mapLayersAdded.forEach(function (d) {
                if (map.getLayer(d)) {
                    map.removeLayer(d);
                }

            })

            mapLayersAdded = [];

            if (!map.getSource('neighborhoodPoints')) {
                map.addSource('neighborhoodPoints', {
                    'type': 'geojson',
                    'data': neighborhoodData
    
                });
            }

            map.addLayer({
                'id': 'neighborhoods',
                'type': 'symbol',
                'source': 'neighborhoodPoints',
                'layout': {
                    'icon-image': '1b_dot_sm',
                    'icon-anchor': 'center',
                    'icon-size': 1,
                    'icon-allow-overlap': true
                }
            });

            mapLayersAdded.push('neighborhoods');


            //draw the route to the location
            var oneBway_x = oneBwayFeature.features[0].geometry.coordinates[0];
            var oneBway_y = oneBwayFeature.features[0].geometry.coordinates[1];
            var oneBwayGoogleCoords = oneBway_y + ',' + oneBway_x;

            neighborhoodData.features.forEach(function (feature) {
                var feature_x = feature.geometry.coordinates[0];
                var feature_y = feature.geometry.coordinates[1];
                var googleCoords = feature_y + ',' + feature_x;

                //Mapboox directions example request.
                //var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/" + commuteType + '/' + oneBway_x + '%2C' + oneBway_y + '%3B' + feature_x + '%2C' + feature_y + '?alternatives=false&geometries=geojson&steps=false&access_token=pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';

                const directionsService = new google.maps.DirectionsService();


                directionsService.route(
                    {
                            origin: googleCoords,
                            destination: oneBwayGoogleCoords,
                            travelMode: "TRANSIT"
                    },
                    (response, status) => {
                        //console.log(response);
                        var route = {
                            'type': 'LineString',
                            'coordinates': []
                        };
                        var path = response.routes[0].overview_path;
                        path.forEach(d => {
                            // console.log(d);
                            route['coordinates'].push([d.lng(), d.lat()]);
                        })
                        addNeighborhoodRouteG(route, feature.properties.Name);
                        createClearPopUpG(feature, response);
                        commuteLegend(response, feature.properties.Name); 

                       }
                )
                //mapbxo request - not in use
                // d3.json(reqUrl).then(function (d) {
                //     console.log(d);
                //     addNeighborhoodRoute(d, feature.properties.Name);
                //     createClearPopUp(feature, d);
                // })

            })

            var bounds = new mapboxgl.LngLatBounds([-74.06547906123738,40.68009370950463], [-73.93430769956821,40.76564283242632]);

            // neighborhoodData.features.forEach(function (feature) {
            //     bounds.extend(feature.geometry.coordinates)
            // });


            map.fitBounds(bounds, {
                padding: 0,
                pitch: 0,
                bearing: 0
            });

        }

        function transportationMode() {
            console.log(map.getStyle().layers);

            var legendDiv = d3.select('#map-legend');
            legendDiv.html('');
            legendDiv.selectAll('*').remove();

            map.flyTo({
                center: [-74.01437444860113, 40.704838691991284],
                zoom: 14
            });
            
            d3.selectAll('.mapboxgl-popup').remove();
            //popUps.forEach(d => d.remove())
            
            map.setPaintProperty('ferry', 'line-color', '#6699CC');
            map.setLayoutProperty('nyc subways', 'visibility', 'visible');
            map.setLayoutProperty('nyc subways shadow', 'visibility', 'visible');
            map.setLayoutProperty('nyc subway stations', 'visibility', 'visible');
            map.setLayoutProperty('transit-label', 'visibility', 'visible');
            map.setLayoutProperty('citibike stations', 'visibility', 'none');
            map.setLayoutProperty('bike lanes', 'visibility', 'none');

            console.log(mapLayersAdded);

            mapLayersAdded.forEach(function (d) {
                if (map.getLayer(d)) {
                    map.removeLayer(d);
                }

            })

            mapLayersAdded = [];

            var bounds = new mapboxgl.LngLatBounds([-74.04070778411328,40.69483814140284], [-73.98157251142398,40.71982111512975]);

            map.fitBounds(bounds, {
                padding: 0,
                pitch: 0,
                bearing: 0
            });

            transporationLegend()

        }

        function citibikeMode() {
            //console.log(map.getSource('composite').vectorLayerIds);
            var bounds = new mapboxgl.LngLatBounds([-74.0248118926728,40.69778281348687], [-74.0019293075955,40.71068600625975]);

            map.fitBounds(bounds, {
                padding: 0,
                pitch: 0,
                bearing: 0
            });


            var legendDiv = d3.select('#map-legend');
            legendDiv.html('');
            legendDiv.selectAll('*').remove();

            d3.selectAll('.mapboxgl-popup').remove();
            
            map.setPaintProperty('ferry', 'line-color', '#fff');
            map.setLayoutProperty('nyc subways', 'visibility', 'none');
            map.setLayoutProperty('nyc subways shadow', 'visibility', 'none');
            map.setLayoutProperty('nyc subway stations', 'visibility', 'none');
            map.setLayoutProperty('transit-label', 'visibility', 'none');
            map.setLayoutProperty('citibike stations', 'visibility', 'visible');
            map.setLayoutProperty('bike lanes', 'visibility', 'visible');


            //map.resize();
            // Add a GeoJSON source for all amenities
            //map.removeSource('locationPoints');
            //map.getSource('locationPoints').setData(locations);

            // if (!map.getSource('locationPoints')) {
            //     console.log("locations is not here");
            // }

            // console.log(map.getStyle().layers);
            console.log(mapLayersAdded);

            mapLayersAdded.forEach(function (d) {
                if (map.getLayer(d)) {
                    map.removeLayer(d);
                }

            })

            mapLayersAdded = [];




            citibikeLegend();


        }

        function amenityMode() {
            var legendDiv = d3.select('#map-legend');
            legendDiv.html('');
            legendDiv.selectAll('*').remove();
            amenityLegend(iconScaleSVG, legendDiv);


            d3.selectAll('.mapboxgl-popup').remove();


            console.log(map.getStyle().layers);
            console.log(mapLayersAdded);

            mapLayersAdded.forEach(function (d) {
                if (map.getLayer(d)) {
                    map.removeLayer(d);
                }

            })

            mapLayersAdded = [];

                        
            map.setPaintProperty('ferry', 'line-color', '#fff');
            map.setLayoutProperty('nyc subways', 'visibility', 'none');
            map.setLayoutProperty('nyc subways shadow', 'visibility', 'none');
            map.setLayoutProperty('nyc subway stations', 'visibility', 'none');
            map.setLayoutProperty('citibike stations', 'visibility', 'none');
            map.setLayoutProperty('bike lanes', 'visibility', 'none');

            // Add a GeoJSON source for all amenities
            if (!map.getSource('amenityPoints')) {
                map.addSource('amenityPoints', {
                    'type': 'geojson',
                    'data': amenityData
    
                });
            }




            mapSourcesAdded.push('amenityPoints');


            // map.addLayer({
            //     'id': 'amenities',
            //     'type': 'symbol',
            //     'source': 'amenityPoints',
            //     'layout': {
            //         'icon-image': '1b_dot_sm',
            //         'icon-anchor': 'center',
            //         'icon-size': 1,
            //         'icon-allow-overlap': true
            //     }
            // });

            // mapLayersAdded.push('amenities');

            //for each ammenity
            amenityData.features.forEach(function (feature) {
                //console.log(feature);
                //find the category name
                var category = feature.properties['subcategory'];

                if (!mapLayersAdded.includes(category)) {
                    mapLayersAdded.push(category)
                };
                //and if it has not been done, add the category as a layer and use the filter to add all the features that match.
                if (!map.getLayer(category)) {
                    map.addLayer({
                        'id': category,
                        'type': 'symbol',
                        'source': 'amenityPoints',
                        'layout': {
                            'icon-image': iconScale(category),
                            'icon-anchor': 'center',
                            'icon-size': .75,
                            'icon-allow-overlap': true
                        },
                        'filter': ['==', 'subcategory', category]
                    });
                }
                //and make it invisible to start.
                //map.setLayoutProperty(category, 'visibility', 'none');


            })

            //draw the route to the location
            var oneBway_x = oneBwayFeature.features[0].geometry.coordinates[0];
            var oneBway_y = oneBwayFeature.features[0].geometry.coordinates[1];

            var bounds = new mapboxgl.LngLatBounds();

            amenityData.features.forEach(function (feature) {
                bounds.extend(feature.geometry.coordinates)
            });


            // map.flyTo({
            //     center: [-74.01437444860113, 40.704838691991284],
            //     zoom: 15
            // });

            map.fitBounds(bounds, {
                padding: 25,
                pitch: 0,
                bearing: 0
            });

        }

        function transporationLegend() {
            var legendDiv = d3.select('#map-legend');


            var transportationScale =  d3.scaleOrdinal([icon_subway, icon_ferry]).domain(['4-5-6, 1-2-3, N-R, J-Z', 'Staten Island Ferry, NYC Ferry, NY Waterway']);


            createLegend(transportationScale, legendDiv);

        }

        function commuteLegend(directions, placeName) {
            var legendDiv = d3.select('#map-legend');



            var steps = directions.routes[0].legs[0].steps;

            var transitImages = steps.filter(d => d.transit).map(function(d) {
                console.log(d);

                return d.transit.line.icon ? d.transit.line.icon : d.transit.line.vehicle.icon;

            })

            console.log(transitImages);

            var duration = directions.routes[0].legs[0].duration.text;

            
            var legendItem = legendDiv.append('div').classed('legend-item-holder', true);//legend-item-icon-holder

            var transitIcons  = legendItem.selectAll('.legend-item-icon-holder')
                .data(transitImages)
                .join('div').classed('legend-item-icon-holder', true)
                .append('img')
                .attr('alt', 'x')
                .attr('src', d => d);


            legendItem.append('d').classed('legend-item-label', true).html(duration + ' from ' + placeName);
            
            // transitImages.forEach(function(d) {

            //     legendItem.append('div').classed('legend-item-icon-holder', true).html('text');

            // });
            
            //.append('img').attr('alt', 'x').attr('src', d));
            
            
            //legendItem.html(duration + ' from ' + placeName);

        }

        function amenityLegend(scale, legendDiv) {

            createLegend(scale, legendDiv)

        }

        function citibikeLegend() {
            var legendDiv = d3.select('#map-legend').append('div');
            var keyDiv = d3.select('#map-legend').append('div');


            var citibikeScale =  d3.scaleOrdinal([icon_citibike]).domain(['Little West St & 1 Pl', 'Broadway & Battery Pl', 'Bus Slip & State St', 'Broad St & Bridge St', 'Water - Whitehall Plaza']);
            var keyScale =  d3.scaleOrdinal([icon_citibikeLegend]).domain(['Bike lanes']);

            createLegend(citibikeScale, legendDiv);
            createLegend(keyScale, keyDiv);

        }

        //all the popups
        function createPopUp(feature) {

            var name; 
            
            if (feature.properties.Name) { name = feature.properties.Name } 
                else if (feature.properties.name) {name = feature.properties.name} 
                else if (feature.properties.stationName) {name = feature.properties.stationName};


            var url = feature.properties.url ? '↗' : '';


            //ADD POP UP
            var popUps = document.getElementsByClassName('mapboxgl-popup');
            if (popUps[0]) popUps[0].remove();

            var popupOffsets = {
                'top': [0, 5],
                'top-left': [0, 0],
                'top-right': [0, 0],
                'bottom': [0, -10],
                'bottom-left': [0, 0],
                'bottom-right': [0, 0],
                'left': [0, 0],
                'right': [0, 0]
            };

            var popup = new mapboxgl.Popup({
                    offset: popupOffsets,
                    focusAfterOpen: false,
                    maxWidth: 'none'
                })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(
                    '<h3>' + name + '<a target="_blank" href="' + feature.properties.url + '">' + url + '</a></h3>'
                )
                .addTo(map);


            //draw the route to the location
            var tenx_x = oneBwayFeature.features[0].geometry.coordinates[0];
            var tenx_y = oneBwayFeature.features[0].geometry.coordinates[1];
            var feature_x = feature.geometry.coordinates[0];
            var feature_y = feature.geometry.coordinates[1];


            //directions example request.
            var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/cycling/" + tenx_x + '%2C' + tenx_y + '%3B' + feature_x + '%2C' + feature_y + '?alternatives=false&geometries=geojson&steps=false&access_token=pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';

            //Turn this on to add way finding opaths from amenities.
            // d3.json(reqUrl).then(function (d) {
            //     addRoute(d);
            // })

            // addMarker(feature);
        }

        function createClearPopUp(feature, directionsData) {

            var duration = directionsData.routes[0].duration;
            var minutes = Math.floor(duration / 60);

            var hours = Math.floor(minutes / 60);
            var extraMinutes = (minutes % 60);

            var timeString = hours + " hours and " + extraMinutes + " minutes";

            //ADD POP UP
            // var popUps = document.getElementsByClassName('mapboxgl-popup');
            // if (popUps[0]) popUps[0].remove();

            var popup = new mapboxgl.Popup({
                    offset: [0, 0],
                    className: 'clear-popup'
                })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(
                    '<h3>' + feature.properties.Name + '</h3>' +
                    '<h4>' + timeString + '</h4>'
                )
                .addTo(map);


            //draw the route to the location
            var tenx_x = oneBwayFeature.features[0].geometry.coordinates[0];
            var tenx_y = oneBwayFeature.features[0].geometry.coordinates[1];
            var feature_x = feature.geometry.coordinates[0];
            var feature_y = feature.geometry.coordinates[1];


            //directions example request.
            var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/cycling/" + tenx_x + '%2C' + tenx_y + '%3B' + feature_x + '%2C' + feature_y + '?alternatives=false&geometries=geojson&steps=false&access_token=pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';

        }

        function createClearPopUpG(feature, directionsData) {

            // console.log(directionsData);
            var duration = directionsData.routes[0].legs[0].duration.text;
            //ADD POP UP
            // var popUps = document.getElementsByClassName('mapboxgl-popup');
            // if (popUps[0]) popUps[0].remove();

            var popup = new mapboxgl.Popup({
                    offset: [0, 0],
                    className: 'clear-popup'
                })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(
                    '<h3>' + feature.properties.Name + '</h3>' +
                    '<h4>' + duration + '</h4>'
                )
                .addTo(map);


            //draw the route to the location
            var tenx_x = oneBwayFeature.features[0].geometry.coordinates[0];
            var tenx_y = oneBwayFeature.features[0].geometry.coordinates[1];
            var feature_x = feature.geometry.coordinates[0];
            var feature_y = feature.geometry.coordinates[1];


            //directions example request.
            var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/cycling/" + tenx_x + '%2C' + tenx_y + '%3B' + feature_x + '%2C' + feature_y + '?alternatives=false&geometries=geojson&steps=false&access_token=pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';

        }

        function addNeighborhoodRoute(d, layerName) {

            var route = d.routes[0].geometry;

            console.log(route);

            if (map.getLayer(layerName)) map.removeLayer(layerName);
            if (map.getSource(layerName)) map.removeSource(layerName);

            map.addSource(layerName, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': route
                }
            });

            map.addLayer({
                'id': layerName,
                'type': 'line',
                'source': layerName,
                'layout': {
                    'line-join': 'miter',
                    'line-cap': 'square'
                },
                'paint': {
                    'line-color': '#595A5C',
                    'line-width': 1.5,
                    'line-dasharray': [2, 3],
                }
            });

            if (!mapLayersAdded.includes(layerName)) {
                mapLayersAdded.push(layerName);
            };
 

            map.moveLayer(layerName, 'oneBwayPoint');
        }

        function addNeighborhoodRouteG(route, layerName) {

            layerName = layerName + "G";
            //console.log(route);

            if (map.getLayer(layerName)) map.removeLayer(layerName);
            if (map.getSource(layerName)) map.removeSource(layerName);

            map.addSource(layerName, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': route
                }
            });

            map.addLayer({
                'id': layerName,
                'type': 'line',
                'source': layerName,
                'layout': {
                    'line-join': 'miter',
                    'line-cap': 'square'
                },
                'paint': {
                    'line-color': '#595A5C',
                    'line-width': 1.5,
                    'line-dasharray': [2, 3],
                }
            });

            if (!mapLayersAdded.includes(layerName)) {
                mapLayersAdded.push(layerName);
            };
 

            map.moveLayer(layerName, 'oneBwayPoint');
        }

        function addRoute(d) {

            var route = d.routes[0].geometry;


            if (map.getLayer('route')) map.removeLayer('route');
            if (map.getSource('route')) map.removeSource('route');

            map.addSource('route', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': route
                }
            });

            map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#5C6972',
                    'line-width': 2,
                    'line-dasharray': [.1, 2]
                }
            });

            map.moveLayer('route', 'oneBwayPoint');
        }

        function addMarker(d) {

            console.log(d)

            if (map.getLayer('focusmarker')) map.removeLayer('focusmarker');
            if (map.getSource('focusmarker')) map.removeSource('focusmarker');

            map.addSource('focusmarker', {
                'type': 'geojson',
                'data': d
            });

            map.addLayer({
                'id': 'focusmarker',
                'type': 'symbol',
                'source': 'focusmarker',
                'layout': {
                    'icon-image': 'teardrop_g',
                    // 'text-field' : ['get', 'Name'],
                    'icon-anchor': 'bottom',
                    'icon-size': .25,
                    'icon-allow-overlap': true
                }
            });

            //map.moveLayer('route', 'tenExchangePoint');
        }

        function createLegend(scale, legendDiv) {

            // d3.select('#map-legend').remove();


    


            // console.log(scale.domain());

            var legendItems = legendDiv.selectAll('div').data(scale.domain()).join('div').classed('legend-item-holder', true);

            //legendItems.html(d => d);

            // legendItems.append('img').attr('src', d => scale(d)).classed('legend-item-icon', true);
            var legendIconHolders = legendItems.append('div').classed('legend-item-icon-holder', true);
            legendIconHolders.html(d => scale(d));

            legendItems.append('div').html(d => d).classed('legend-item-label', true);



        }

        //MAP CLICK
        map.on('click', function (e) {
            console.log("zoom: " + map.getZoom() + " pitch: " + map.getPitch() + " bearing: " + map.getBearing() + " coords: [" + e.lngLat.lng + ',' + e.lngLat.lat + ']');
            // If the user clicked on one of your markers, get its information.
            var features = map.queryRenderedFeatures(e.point, {
                layers: mapLayersAdded.concat(['citibike stations', 'transit-label', 'nyc subway stations']), // replace with your layer name
            });

            var feature = features[0];

            console.log(feature);

            if (feature != undefined) {
                createPopUp(feature);
            }


        });


        
        //LIST UX BEHAVIOR
        var amenityCategoryHeaders = d3.selectAll(".amenity-header");
        var amenityListItems = d3.selectAll(".amenity-item");

        amenityListItems.on("mouseover", function (event, d) {

            //1. Change the icon to the teardtop on click, and make sure all other go back to normal.
            //2. Show route.
            amenityListItems.transition().style("opacity", .25);
            d3.select(this).transition().style("opacity", 1);

            var featureName = d3.select(this).select('div').select('div').html();
            featureName = featureName.replace('&amp;', '&');
            var featureJSON = amenityData.features.find(d => d.properties.Name == featureName);
            var mapFeature = map.queryRenderedFeatures({
                layers: amenityCategories,
                'filter': ['==', 'Name', featureName]
            });

            if (!mapFeature.length) {
                return;
            }

            var feature = mapFeature[0];

            createPopUp(feature);

        })

        amenityCategoryHeaders.on("click", function (event, d) {

            var mapCat = '';
            //find 
            var findCat = d3.select(this).selectAll("div").filter(function (d) {
                return this.innerHTML != "";
            });

            findCat.each(function (d) {
                mapCat = this.innerHTML
            });

            // .filter(function(d) {
            //     d3.select(this).html != "";
            // }).html;

            var popUps = document.getElementsByClassName('mapboxgl-popup');
            /** Check if there is already a popup on the map and if so, remove it */
            if (popUps[0]) popUps[0].remove();

            if (mapCat == currentCategory) {
                map.setLayoutProperty('amenities', 'visibility', 'visible');
            } else {
                currentCategory = mapCat;


                map.setLayoutProperty('amenities', 'visibility', 'none');

                if (map.getLayer('route')) map.removeLayer('route');


                amenityCategories.forEach(function (d) {
                    if (d == mapCat) {
                        map.setLayoutProperty(d, 'visibility', 'visible');
                    } else {
                        map.setLayoutProperty(d, 'visibility', 'none');
                    }

                })

                var features = amenityData.features.filter(d => d.properties.Category == mapCat);

                var bounds = new mapboxgl.LngLatBounds();

                features.forEach(function (feature) {
                    bounds.extend(feature.geometry.coordinates);
                });

                map.fitBounds(bounds, {
                    padding: catAngles[mapCat]["padding"],
                    pitch: catAngles[mapCat]["pitch"],
                    bearing: catAngles[mapCat]["bearing"]
                });

            }


        })

    }
    ////END
});


function uniqueValueMap(data, column) {
    //What happens in uniques


    if (data[0]['properties'][column]) {

        const uniqueColumnValueMap = new Map()


        // Stripping oiut bad values.
        data.forEach(function (d) {

            if (d['properties'][column] != null && d['properties'][column] != undefined) {
                uniqueColumnValueMap.set(d['properties'][column], false)
            }
        });


        return uniqueColumnValueMap;


    } else {
        return "error"
    }

}


//DATA & ICONS
var oneBwayFeature = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [-74.01437444860113, 40.704838691991284],
        },
        "properties": {
            "Name": "One Broadway",
            "Category": "Primary",
            "Address": "1 Broadway, New York, NY 10004",
            "Google Business URL": ""
        }
    }]
}

var neighborhoodData = {
    "type": "FeatureCollection",
    "name": "neighborhoods",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": [{
            "type": "Feature",
            "properties": {
                "Name": "Grand Central Station",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9761572, 40.7546667, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Long Island City",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9581378, 40.7455883, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Downtown Brooklyn",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9899532, 40.6977936, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Dumbo",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9934174, 40.7039496, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Union Square",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9885406, 40.7366094, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Penn Station",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9903102, 40.751056, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Hoboken",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0315472, 40.7371793, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Newark Airport",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.1823743, 40.6876171, 0.0]
            }
        }
    ]
}

var amenityData = {
    "type": "FeatureCollection",
    "name": "amenities",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-74.01570049099769, 40.71908615042376]
            },
            "properties": {
                "id": "amenity-sunset",
                "Name": "Sail Sunset",
                "category": "Lifestyle",
                "subcategory": "Landmarks",
                "Address": "Pier 25, West St, New York, NY 10013",
                "url": "https://www.sailsunset.com/"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-74.01708401644817, 40.712389323993484]
            },
            "properties": {
                "id": "amenity-ventura",
                "Name": "Ventura Private Charters",
                "category": "Lifestyle",
                "subcategory": "Landmarks",
                "Address": "North Cove Marina at Brookfield Place, New York, NY 10281",
                "urlGoogle Business URL": "https://www.sailnewyork.com/"
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Bill's Bar & Burger",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.billsbarandburger.com/venues/downtown/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0144894, 40.7095137, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Broadstone Bar & Kitchen",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.broadstonenyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118433, 40.7041987, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Cedar Local",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.cedarlocal.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0080807, 40.7070857, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Clinton Hall",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.clintonhallny.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0150054, 40.7080189, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Full Shilling",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.thefullshilling.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0074941, 40.7057352, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Split Eights",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.spliteightsnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.010131, 40.7058282, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Stone Street Tavern",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.stonestreettavernnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0102046, 40.7042226, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Suspenders",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://suspendersnyc.com/menu/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0136016, 40.7086054, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Dead Rabbit",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "https://www.deadrabbitnyc.com/menus/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0110309, 40.7032966, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Ulysses",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://www.ulyssesnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0100459, 40.7043615, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Underdog",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "https://www.underdogbarnyc.com/pickup-menu"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0103657, 40.7044393, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Watermark Bar",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "https://watermarkny.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.003525, 40.7048406, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Cauldron",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Bars",
                "url": "http://thecauldron.io/nyc/potions"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0105259, 40.704384, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Bean & Bean Wall St.",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.beannbeancoffee.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.012229, 40.7073708, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Blue Bottle Coffee",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://bluebottlecoffee.com/cafes/world-trade-center"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0112971, 40.7065505, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Blue Spoon Coffee",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://bluespooncoffee.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0074731, 40.7081041, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Café 11",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.cafe11nyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0139684, 40.7052717, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Cafe Grumpy",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.cafegrumpy.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0119572, 40.7039603, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Café Exchange",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.allmenus.com/ny/new-york/7419-cafe-exchange/menu/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0133262, 40.7068281, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Dunkin",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.dunkindonuts.com/en?utm_source=google&utm_medium=local&utm_campaign=localmaps&utm_content=351785"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0119503, 40.7050828, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Dunkin",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.dunkindonuts.com/?utm_source=google&utm_medium=local&utm_campaign=localmaps&utm_content=348020"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.014163, 40.70804, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Flavors Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://flavorsnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0126146, 40.705974, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Flavors Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://flavorsnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.012872, 40.703472, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Gigino at Wagner Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://gigino-wagnerpark.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159366, 40.7048787, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Gregory’s",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.gregoryscoffee.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0126146, 40.705974, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Ground Central",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.groundcentral.nyc/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0103882, 40.7036305, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Hole In the Wall",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.holeinthewallnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0056138, 40.7084008, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Inatteso Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.inattesocafe.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.01701, 40.706223, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Joe & The Juice",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.joejuice.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0117654, 40.7060275, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Kaffe Landskap",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://kaffelandskapnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0109679, 40.7151719, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Lady M Cake Boutique",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.ladym.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118457, 40.7102397, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Laughing Man Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://laughingmancoffee.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0101315, 40.7172639, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Le Pain Quotidien",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.lepainquotidien.com/us/en/locations/85_broad_st/85-broad-st?utm_source=google&utm_medium=business+listing&utm_campaign=&y_source=1_Nzg1ODU1MS03MTUtbG9jYXRpb24uZ29vZ2xlX3dlYnNpdGVfb3ZlcnJpZGU%3D"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0111456, 40.7040662, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Leo's Bagels",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://leosbagels.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0096537, 40.7049944, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Lox Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.loxnyc.com/menu"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0185571, 40.7059551, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Pret a Manger",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.pret.com/en-us"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118334, 40.7051718, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Pret a Manger",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.pret.com/en-us"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0125217, 40.7063491, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Starbucks",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.starbucks.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0130305, 40.7068263, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Starbucks",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.starbucks.com/store-locator/store/12804/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0128481, 40.7044082, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Starbucks",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://www.starbucks.com/store-locator/store/16686/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0138065, 40.7033758, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Wattle Café",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://wattlecafe.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.014163, 40.70804, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Sauce & Barrel",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://www.sauceandbarrel.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0143364, 40.7081117, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Trader Express Deli",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "http://tradersexpresscaterers.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.01219, 40.7048226, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Van Leeuwen Ice Cream",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Cafes",
                "url": "https://vanleeuwenicecream.com/scoop-shops/?utm_source=G&utm_medium=local&utm_campaign=google-local#newyork"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0023085, 40.7076233, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Blink Fitness",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://locations.blinkfitness.com/ny/manhattan/111-nassau-street"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0073712, 40.7108531, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "CityMD",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.citymd.com/urgent-care-locations/ny/manhattan/financial-district/318"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0112665, 40.7064941, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Crossfit Wallstreet",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "http://crossfitwallstreet.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0120302, 40.7053506, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Crunch FiDi",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.crunch.com/locations/fidi"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0100931, 40.7086765, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "CVS",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.cvs.com/store-locator/new-york-ny-pharmacies/129-fulton-street-on-the-corner-of-nassau-st-new-york-ny-10038/storeid=2716?WT.mc_id=LS_GOOGLE_FS_2716"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.007457, 40.7102958, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Duane Reade Pharmacy",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.walgreens.com/locator/duane+reade-1+whitehall+st-new+york-ny-10004/id=14131"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0128442, 40.7038046, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Duane Reade Pharmacy",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.walgreens.com/locator/duane+reade-67+broad+st-new+york-ny-10004/id=14125"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0113224, 40.7048579, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Duane Reade Pharmacy",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.walgreens.com/locator/walgreens-37+broadway-new+york-ny-10006/id=14101"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0132177, 40.7062214, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Equinox Brookfield Place",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.equinox.com/clubs/new-york/downtown/brookfieldplace"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0151624, 40.7120627, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Equinox Wall Street",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.equinox.com/clubs/new-york/downtown/wallstreet"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0105948, 40.7076193, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "NewYork-Presbyterian Lower Manhattan Hospital",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.nyp.org/lowermanhattan?utm_source=yextgmb&utm_medium=organic&utm_campaign=yext_doctor_listings&y_source=1_MTM4MTIwMzAtNzE1LWxvY2F0aW9uLmdvb2dsZV93ZWJzaXRlX292ZXJyaWRl"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.005103, 40.7103592, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Planet Fitness",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "http://www.planetfitness.com/gyms/manhattan-wall-st-ny-212"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0137577, 40.7054843, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Retro Fitness",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.retrofitness.com/location/onenewyorkplaza/?utm_campaign=None-One-NY-Plaza-NY-Category-Search&utm_medium=Organic&utm_source=Google&utm_content=None-None&y_source=1_MTIxMzI4MzQtNzE1LWxvY2F0aW9uLmdvb2dsZV93ZWJzaXRlX292ZXJyaWRl"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118801, 40.7020841, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Trifecta Med Spa Downtown",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://trifectamedspanyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0136016, 40.7086054, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Urgent Care at NYU Langone at Trinity",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://nyulangone.org/locations/nyu-langone-at-trinity/urgent-care-at-nyu-langone-at-trinity?cid=syn_yext&y_entity_id=1059&y_source=1_MTU2NTg2NjQtNzE1LWxvY2F0aW9uLndlYnNpdGU%3D"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0112146, 40.7085227, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Four Seasons Hotel Downtown Spa",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Health",
                "url": "https://www.fourseasons.com/newyorkdowntown/spa/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0091904, 40.7126317, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Artezen Hotel",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.artezenhotel.com/?utm_source=google&utm_medium=organic&utm_campaign=business-listing"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0087404, 40.7095847, 0.0]
            }
        },
        // {
        //     "type": "Feature",
        //     "properties": {
        //         "Name": "The Bowery Hotel",
        //         "description": null,
        //         "timestamp": null,
        //         "begin": null,
        //         "end": null,
        //         "altitudeMode": null,
        //         "tessellate": -1,
        //         "extrude": 0,
        //         "visibility": -1,
        //         "drawOrder": null,
        //         "icon": null,
        //         "category": "Lifestyle",
        //         "subcategory": "Hotels",
        //         "url": "http://www.theboweryhotel.com/"
        //     },
        //     "geometry": {
        //         "type": "Point",
        //         "coordinates": [-73.9914737, 40.7260151, 0.0]
        //     }
        // },
        {
            "type": "Feature",
            "properties": {
                "Name": "Club Quarters",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://clubquartershotels.com/new-york-city/world-trade-center"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0139468, 40.7098216, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Conrad New York",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.hilton.com/en/hotels/nyccici-conrad-new-york-downtown/?SEO_id=GMB-CI-NYCCICI&y_source=1_MjA4MTg0MC03MTUtbG9jYXRpb24uZ29vZ2xlX3dlYnNpdGVfb3ZlcnJpZGU%3D"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0155621, 40.7150499, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Gild Hall, A Thompson Hotel",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.thompsonhotels.com/hotels/new-york/new-york/gild-hall?src=corp_lclb_gmb_seo_lgatg"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0071288, 40.7078815, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Four Seasons Hotel Downtown",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.fourseasons.com/newyorkdowntown/?seo=google_local_nyd1_amer"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0091904, 40.7126317, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Beekman",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.thebeekman.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0069218, 40.7110284, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Andaz Wall Street",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.hyatt.com/en-US/hotel/new-york/andaz-wall-street/nycaw?src=corp_lclb_gmb_seo_nycaw"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0079362, 40.7051285, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Mint House at 70 Pine",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Hotels",
                "url": "https://www.minthouse.com/70-pine"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0077715, 40.7065047, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "9/11 Memorial and Museum",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.911memorial.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0124786, 40.7114147, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "American Merchant Mariners' Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.nycgovparks.org/parks/battery-park/highlights/9745"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159996, 40.703141, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Bowling Green",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.nycgovparks.org/parks/bowling-green"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0132798, 40.7045406, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Castle Clinton",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.nps.gov/cacl/index.htm"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159996, 40.703141, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Charging Bull",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.chargingbull.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0136509, 40.7049774, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "City Hall",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www1.nyc.gov/site/designcommission/public-programs/city-hall/about-city-hall.page"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0065164, 40.7124142, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "East Coast Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.nycgovparks.org/parks/battery-park/monuments/1929"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159996, 40.703141, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Irish Hunger Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://bpcparks.org/whats-here/parks/irish-hunger-memorial/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0161749, 40.714776, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Korean War Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.nycgovparks.org/parks/battery-park/monuments/1930"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0170115, 40.7040613, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Liberty Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpca.ny.gov/places/parks/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.014051, 40.710374, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Mother Carbini Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpca.ny.gov/places/museums-memorials/mother-cabrini-memorial/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.018597, 40.7088853, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Museum of Jewish Heritage",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://mjhbyc.org"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0185571, 40.7059551, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "National Museum of the American Indian",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.americanindian.si.edu/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0138948, 40.7043347, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "New York Stock Exchange",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "nyse.com"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0113189, 40.7068661, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "New York Vietname Veterans Memorial",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.vietnamveteransplaza.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.009675, 40.7033782, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Rector Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpca.ny.gov/places/parks/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.016706, 40.7093267, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Rockefeller Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://bpcparks.org/whats-here/parks/irish-hunger-memorial/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0161749, 40.714776, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Seaglass Carousel",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://seaglasscarousel.nyc/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159996, 40.703141, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Stone Street",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpca.ny.gov/places/parks/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0115842, 40.704031, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Battery",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.thebattery.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0159996, 40.703141, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Skyscraper Museum",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://skyscraper.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0177501, 40.705726, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Trinity Church",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.trinitywallstreet.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.011594, 40.7079928, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "West Thames Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpcparks.org/whats-here/parks/west-thames-park/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0160212, 40.7082873, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "World Trade Center",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://www.wtc.com/about/buildings/1-world-trade-center"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0131689, 40.7130082, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Zucotti Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "https://bpca.ny.gov/places/parks/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0131196, 40.709329, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Federal Reserve Bank of New York",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Landmarks",
                "subcategory": "Landmarks",
                "url": "http://www.newyorkfed.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0086667, 40.7084278, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "2West",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://www.the-wagner-hotel.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.017457, 40.7056483, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Ampia Rooftop",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://www.ampianyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.012096, 40.703459, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Blue Ribbon Federal Grill",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://bfplny.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0156903, 40.7124742, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Bluestone Lane Batery Park",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://bluestonelane.com/cafes/battery-park-cafe-2-river-terrace-new-york/?y_source=1_MjI2MTA4ODAtNzE1LWxvY2F0aW9uLndlYnNpdGU%3D"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0160748, 40.7153848, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "BlueStone Lane Tribeca",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://bluestonelane.com/?y_source=1_MjUxNjY5ODYtNzE1LWxvY2F0aW9uLndlYnNpdGU="
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0085429, 40.7160834, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Bravo",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://www.bravokosherdowntown.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0134583, 40.7065964, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Broadstone Bar & Kitchen",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://www.broadstonenyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118433, 40.7041987, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "CAVA",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://cava.com/locations/wall-street-ny"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0088264, 40.7058501, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Chipotle",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://locations.chipotle.com/ny/new-york/2-broadway?utm_source=google&utm_medium=yext&utm_campaign=yext_listings"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0128481, 40.7044082, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Crown Shy",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.crownshy.nyc/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0077715, 40.7065047, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Delmonico’s",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.delmonicos.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0105948, 40.7049925, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Dig-inn",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.diginn.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0071352, 40.7059385, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Cipriani Club 55",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://cipriani.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0093957, 40.7061756, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Tacombi",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://tacombi.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0118676, 40.7046445, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Miramar",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://miramarnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.017798, 40.7081329, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Eataly NYC Downtown",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.eataly.com/us_en/stores/nyc-downtown/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0119758, 40.7100647, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Fraunces Tavern",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle ",
                "subcategory": "Restaurants",
                "url": "http://www.frauncestavern.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0113522, 40.7033808, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Inatteso Pizzabar",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://inatteso.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0170497, 40.7060267, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Mad Dog & Beans Maxican Cantina",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://maddogandbeans.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0102964, 40.704197, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Merchants River House",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.merchantsriverhouse.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0178841, 40.7113232, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "PJ Clarkes",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://pjclarkes.com/location/on-the-hudson/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.015403, 40.7134543, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Reserve Cut",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "http://reservecut.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0117654, 40.7060275, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Nobu Downtown",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.noburestaurants.com/downtown/home/?utm_source=google&utm_medium=Yext"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0095804, 40.7107732, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Toro Loco",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Restaurants",
                "url": "https://www.toroloconyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0121212, 40.7041754, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Brookfield Place",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://bfplny.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0156903, 40.7124742, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "South Street Seaport",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://southstreetseaportmuseum.org/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0014567, 40.705573, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Leez New York",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://leez.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0131705, 40.7072256, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "LOFT",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://stores.loft.com/us/ny/new-york/2-broadway.html?y_source=1_MTY0MjI0MC03MTUtbG9jYXRpb24ud2Vic2l0ZQ%3D%3D"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0128481, 40.7044082, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Petropolis",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://petropolisnyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0143571, 40.7079952, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Oculus",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://www.panynj.gov/wtcprogress/transportation-hub.html"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0100209, 40.710184, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "The Fulton Center",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "http://www.fultoncenternyc.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0089937, 40.7105274, 0.0]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "Name": "Paper Source",
                "description": null,
                "timestamp": null,
                "begin": null,
                "end": null,
                "altitudeMode": null,
                "tessellate": -1,
                "extrude": 0,
                "visibility": -1,
                "drawOrder": null,
                "icon": null,
                "category": "Lifestyle",
                "subcategory": "Retail",
                "url": "https://store-locator.papersource.com/locations/store/ny-new-york-fidi"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0119031, 40.7056608, 0.0]
            }
        }
    ]
}


var icon_bars = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;fill-rule:evenodd;}</style></defs><path class="cls-1" d="M5.73,0a3.65,3.65,0,1,0,0,7.29.89.89,0,0,1,.58.4l5.9,8.86a1.69,1.69,0,0,1,.29.95v4.9a.53.53,0,0,1-.15.36.52.52,0,0,1-.37.16H8.33a1,1,0,1,0,0,2.08H18.75a1,1,0,0,0,0-2.08H15.1a.53.53,0,0,1-.52-.52V17.5a1.69,1.69,0,0,1,.29-.95L22.74,4.74a1,1,0,0,0-.87-1.61h-12a.7.7,0,0,1-.63-.51A3.65,3.65,0,0,0,5.73,0Zm0,2.08A1.57,1.57,0,1,1,4.17,3.65,1.55,1.55,0,0,1,5.73,2.08ZM19.41,5.21H9.21a.37.37,0,0,0-.3.18,3.66,3.66,0,0,1-.75,1,.24.24,0,0,0-.05.31L10.34,10a1,1,0,0,0,.81.44h4.79a1,1,0,0,0,.81-.44l2.89-4.34a.26.26,0,0,0,0-.28A.26.26,0,0,0,19.41,5.21Z"/></svg>';
var icon_cafes = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;fill-rule:evenodd;}</style></defs><path class="cls-1" d="M11.92,3.87a1.18,1.18,0,0,1-2.35,0V1.17a1.18,1.18,0,0,1,2.35,0ZM16.09,6a1.17,1.17,0,1,1-2.34,0V3.34a1.17,1.17,0,1,1,2.34,0Zm3.38,5.25.76-.08a2.67,2.67,0,0,1,2.92,3.06,6.08,6.08,0,0,1-5,5.44,7.76,7.76,0,0,1-1.84,2.94h2.18a1.18,1.18,0,1,1,0,2.35H3.93a1.18,1.18,0,0,1,0-2.35H5.17A7.8,7.8,0,0,1,3,18.25L1.83,10a1.23,1.23,0,0,1,.28-.94A1.18,1.18,0,0,1,3,8.65h15.5a1.2,1.2,0,0,1,.89.4,1.23,1.23,0,0,1,.28.94ZM4.34,11l1,6.92a5.49,5.49,0,0,0,10.87,0l1-6.92Zm14.32,6.11.48-3.42,1.34-.14a.3.3,0,0,1,.26.09.32.32,0,0,1,.09.27A3.87,3.87,0,0,1,18.66,17.11ZM6.56,7.21A1.18,1.18,0,0,0,7.74,6V3.34a1.18,1.18,0,1,0-2.35,0V6A1.18,1.18,0,0,0,6.56,7.21Z"/></svg>';
var icon_citibike = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;}</style></defs><path class="cls-1" d="M16,2a1.75,1.75,0,1,1-1.76,1.74A1.73,1.73,0,0,1,16,2Z"/><path class="cls-1" d="M12.9,4.84a1.77,1.77,0,0,1,1.49.87L16,9h2.63a.88.88,0,0,1,0,1.75H15.49c-.59,0-1.06-1.26-2.08-2.82l-2.68,2.82c1,.77,2.65,1.36,2.65,2.08v4.92a.88.88,0,1,1-1.75,0v-3.6c0-.72-.88-.88-3.37-2.31a1.63,1.63,0,0,1-1-1.48,1.78,1.78,0,0,1,.51-1.23l3.92-3.78A1.82,1.82,0,0,1,12.9,4.84Z"/><path class="cls-1" d="M5.35,12.79a5.11,5.11,0,1,0,5.1,5.11A5.12,5.12,0,0,0,5.35,12.79Zm2.52,7.62a3.55,3.55,0,0,1-5,0,3.54,3.54,0,0,1,0-5,3.56,3.56,0,0,1,2.52-1.06,3.56,3.56,0,0,1,2.52,6.09Z"/><path class="cls-1" d="M19.65,12.79a5.1,5.1,0,1,0,5.1,5.1A5.11,5.11,0,0,0,19.65,12.79Zm2.52,7.62a3.55,3.55,0,1,1,1-2.52A3.52,3.52,0,0,1,22.17,20.41Z"/></svg>';
var icon_ferry = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;stroke:#595a5c;stroke-width:0.34px;}</style></defs><g id="_1broadway" data-name="1broadway"><g id="home-2---desktop"><g id="Group-22"><path id="Combined-Shape" class="cls-1" d="M3.85,18h.09a.72.72,0,0,1,.45.26,3.14,3.14,0,0,0,2.35,1.26,3.18,3.18,0,0,0,2.34-1.26.7.7,0,0,1,1.08,0,3.12,3.12,0,0,0,2.34,1.26,3.18,3.18,0,0,0,2.34-1.26.7.7,0,0,1,1.08,0,3.14,3.14,0,0,0,2.34,1.26,3.18,3.18,0,0,0,2.35-1.26.7.7,0,0,1,1.08,0A3.12,3.12,0,0,0,24,19.49a.7.7,0,0,1,.72.72.72.72,0,0,1-.72.72,4.24,4.24,0,0,1-2.88-1.19,4.09,4.09,0,0,1-5.77,0,4.24,4.24,0,0,1-2.88,1.19,4.24,4.24,0,0,1-2.88-1.19,4.26,4.26,0,0,1-2.88,1.19,4.27,4.27,0,0,1-2.89-1.19A4.24,4.24,0,0,1,1,20.93a.7.7,0,0,1-.72-.72A.72.72,0,0,1,1,19.49a3.22,3.22,0,0,0,2.34-1.26A.72.72,0,0,1,3.85,18ZM14.92,4.07a.69.69,0,0,1,.69.54h0l.47,2h1.1a.72.72,0,0,1,.7.59h0l.77,4.71,1.39.46a.72.72,0,0,1,.46.88h0L19,18.2a1.52,1.52,0,0,1-.67.18,1.37,1.37,0,0,1-.8-.26h0l1.41-4.63-5.66-1.85v6.51a1.42,1.42,0,0,1-.72.2,1.37,1.37,0,0,1-.72-.2h0V11.61L6.14,13.47,7.56,18.1a1.51,1.51,0,0,1-.8.25,1.46,1.46,0,0,1-.67-.18h0L4.57,13.23A.73.73,0,0,1,5,12.36H5l1.39-.46L7.2,7.19a.69.69,0,0,1,.69-.6H9l.47-2a.71.71,0,0,1,.69-.54h4.79ZM16.57,8H8.49l-.57,3.37L12.29,10a.56.56,0,0,1,.44,0h0l4.38,1.41ZM14.35,5.49H10.7l-.26,1.1h4.17Z"/></g></g></g></svg>';
var icon_health = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1,.cls-2{fill:#595a5c;}.cls-1{fill-rule:evenodd;}</style></defs><path class="cls-1" d="M12.5,23.73a.61.61,0,0,1-.44-.19L2.39,13.88a7.46,7.46,0,0,1,0-10.54A7.06,7.06,0,0,1,7.7,1.28a7.8,7.8,0,0,1,4.8,1.9,7.8,7.8,0,0,1,4.8-1.9,7,7,0,0,1,5.31,2.06,7.45,7.45,0,0,1,0,10.53l-9.67,9.67A.61.61,0,0,1,12.5,23.73ZM7.42,2.53A5.75,5.75,0,0,0,3.29,4.22,6.19,6.19,0,0,0,1.47,8.61a6,6,0,0,0,.34,2H6.58l.89-1.48A.63.63,0,0,1,8,8.84a.62.62,0,0,1,.53.35l1.56,3.14,2.31-4.92A.64.64,0,0,1,13,7.05a.65.65,0,0,1,.56.27l2.34,3.31h7.34a6,6,0,0,0,.34-2,6.19,6.19,0,0,0-1.82-4.39,5.81,5.81,0,0,0-4.36-1.69,6.56,6.56,0,0,0-4.41,1.94.62.62,0,0,1-.44.18.59.59,0,0,1-.44-.18A6.56,6.56,0,0,0,7.65,2.53ZM22.6,11.88A6.35,6.35,0,0,1,21.71,13L12.5,22.21,3.29,13a6.35,6.35,0,0,1-.89-1.12H6.94a.61.61,0,0,0,.53-.31L8,10.76,9.6,14a.63.63,0,0,0,.56.34h0a.63.63,0,0,0,.56-.34l2.4-5.11L15,11.62a.64.64,0,0,0,.51.26Z"/><path class="cls-2" d="M12.06,23.54l.15-.14h0Zm.44.19v.21h0ZM2.39,13.88l.15-.15h0Zm0-10.54.15.15h0ZM7.7,1.28V1.5h0Zm4.8,1.9-.14.16.14.12.14-.12Zm4.8-1.9v.21h0Zm5.31,2.06-.15.15h0Zm0,10.53-.15-.15h0Zm-9.67,9.67-.15-.15h0ZM3.29,4.22l.15.15h0ZM7.42,2.53v.21h0Zm-5.61,8.1-.2.07,0,.14h.15Zm4.77,0v.21H6.7l.06-.1Zm.89-1.48L7.29,9h0ZM8,8.84v.22H8Zm.53.35.19-.1h0Zm1.56,3.14-.19.1.19.39.19-.4Zm2.31-4.92.2.09h0ZM13,7.05l0-.21h0Zm.56.27-.17.12h0Zm2.34,3.31-.17.13.06.08h.11Zm7.34,0v.21h.15l.05-.14ZM21.71,4.22l.15-.15h0ZM17.35,2.53v.21h0ZM12.94,4.47l.15.15h0Zm-.88,0-.15.15h0ZM7.65,2.53V2.31h0Zm15,9.35.18.11.2-.32H22.6ZM21.71,13l-.15-.15h0ZM12.5,22.21l-.15.15.15.15.15-.15ZM3.29,13l.15-.15h0ZM2.4,11.88v-.21H2l.2.32Zm4.54,0v.21h0Zm.53-.31-.18-.11h0ZM8,10.76l.19-.09L8,10.32l-.2.33ZM9.6,14l.19-.1h0Zm.56.34v.22h0Zm0,0v.22h0Zm.56-.34.19.09h0Zm2.4-5.11.18-.12-.21-.3-.16.33ZM15,11.62l-.17.12h0Zm.51.26v-.21h0ZM11.91,23.69a.83.83,0,0,0,.59.25v-.42a.45.45,0,0,1-.29-.12ZM2.24,14l9.67,9.66.3-.3L2.54,13.73ZM0,8.61A7.7,7.7,0,0,0,2.24,14l.3-.3A7.28,7.28,0,0,1,.42,8.61ZM2.24,3.19A7.7,7.7,0,0,0,0,8.61H.42A7.28,7.28,0,0,1,2.54,3.49ZM7.7,1.07A7.28,7.28,0,0,0,2.24,3.19l.3.3a6.83,6.83,0,0,1,5.15-2Zm4.94,2A8,8,0,0,0,7.7,1.07V1.5a7.52,7.52,0,0,1,4.67,1.84ZM17.3,1.07a8,8,0,0,0-4.94,2l.28.32a7.59,7.59,0,0,1,4.67-1.85Zm5.46,2.12A7.21,7.21,0,0,0,17.3,1.07v.42a6.84,6.84,0,0,1,5.15,2ZM25,8.6a7.66,7.66,0,0,0-2.24-5.41l-.3.3A7.24,7.24,0,0,1,24.58,8.6ZM22.76,14A7.67,7.67,0,0,0,25,8.6h-.42a7.26,7.26,0,0,1-2.12,5.12Zm-9.67,9.67L22.76,14l-.3-.3-9.67,9.67Zm-.59.25a.8.8,0,0,0,.59-.25l-.3-.3a.41.41,0,0,1-.29.13ZM3.44,4.37a5.59,5.59,0,0,1,4-1.63V2.31A6,6,0,0,0,3.14,4.07ZM1.68,8.61A6,6,0,0,1,3.44,4.37l-.3-.3A6.41,6.41,0,0,0,1.26,8.61Zm.33,2a5.83,5.83,0,0,1-.33-2H1.26a6.41,6.41,0,0,0,.35,2.09Zm-.2.28H6.58v-.42H1.81Zm4.95-.1.89-1.49L7.29,9l-.9,1.48Zm.89-1.49A.42.42,0,0,1,8,9.06V8.63A.83.83,0,0,0,7.29,9ZM8,9.06a.4.4,0,0,1,.35.22l.38-.19A.84.84,0,0,0,8,8.63Zm.35.22,1.56,3.15.38-.19L8.75,9.09Zm1.94,3.14L12.63,7.5l-.39-.18L9.93,12.24ZM12.63,7.5A.4.4,0,0,1,13,7.27l0-.43a.86.86,0,0,0-.69.48ZM13,7.27a.41.41,0,0,1,.38.17l.34-.24a.84.84,0,0,0-.75-.36Zm.38.17,2.34,3.32.34-.25L13.68,7.2Zm2.51,3.4h7.34v-.42H15.85Zm7.47-2.23a5.83,5.83,0,0,1-.33,2l.4.14a6.41,6.41,0,0,0,.35-2.09ZM21.56,4.37a6,6,0,0,1,1.76,4.24h.42a6.41,6.41,0,0,0-1.88-4.54Zm-4.2-1.63a5.58,5.58,0,0,1,4.2,1.63l.3-.3a6,6,0,0,0-4.52-1.75ZM13.09,4.62a6.32,6.32,0,0,1,4.27-1.88l0-.42a6.74,6.74,0,0,0-4.55,2Zm-.59.25a.83.83,0,0,0,.59-.25l-.3-.3a.4.4,0,0,1-.29.12Zm-.59-.25a.82.82,0,0,0,.59.25V4.44a.38.38,0,0,1-.29-.12ZM7.64,2.74a6.32,6.32,0,0,1,4.27,1.88l.3-.3a6.79,6.79,0,0,0-4.55-2Zm-.22,0h.23V2.31H7.42Zm15,9a5.91,5.91,0,0,1-.86,1.08l.3.3A6,6,0,0,0,22.78,12Zm-.86,1.08-9.21,9.21.3.3,9.21-9.21Zm-8.91,9.21L3.44,12.85l-.3.3,9.21,9.21ZM3.44,12.85a5.91,5.91,0,0,1-.86-1.08L2.22,12a6,6,0,0,0,.92,1.16Zm3.5-1.18H2.4v.42H6.94Zm.35-.21a.42.42,0,0,1-.35.21v.42a.81.81,0,0,0,.71-.42Zm.49-.81-.49.81.36.22.49-.81Zm2,3.28L8.15,10.67l-.38.19,1.64,3.26Zm.37.23a.41.41,0,0,1-.37-.23l-.38.19a.83.83,0,0,0,.75.47Zm0,0h0v.43h0Zm.37-.23a.41.41,0,0,1-.37.23v.43a.84.84,0,0,0,.74-.47Zm2.4-5.1-2.4,5.11.38.18L13.32,9Zm2.26,2.66L13.3,8.8,13,9l1.89,2.7Zm.33.18a.4.4,0,0,1-.33-.18l-.35.25a.84.84,0,0,0,.68.35Zm7.08,0H15.52v.42H22.6Z"/></svg>';
var icon_hotels = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;fill-rule:evenodd;}</style></defs><path class="cls-1" d="M20.31,0a4.49,4.49,0,0,1,3.31,1.38A4.49,4.49,0,0,1,25,4.69V20.31A4.71,4.71,0,0,1,20.31,25H4.69a4.49,4.49,0,0,1-3.31-1.38A4.49,4.49,0,0,1,0,20.31V4.69A4.49,4.49,0,0,1,1.38,1.38,4.49,4.49,0,0,1,4.69,0Zm.21,20.52a1,1,0,0,0,.31-.73V5.21a1.06,1.06,0,0,0-1-1H17.71a1.06,1.06,0,0,0-1,1v5.21H8.33V5.21a1.06,1.06,0,0,0-1-1H5.21a1.06,1.06,0,0,0-1,1V19.79a1.06,1.06,0,0,0,1,1H7.29a1.06,1.06,0,0,0,1-1V14.58h8.34v5.21a1.06,1.06,0,0,0,1,1h2.08A1,1,0,0,0,20.52,20.52Z"/></svg>';
var icon_landmarks = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25"><defs><style>.cls-1{fill:#595a5c;fill-rule:evenodd;}</style></defs><path class="cls-1" d="M1.8,1.34a1.34,1.34,0,0,1,2.68,0V23.66a1.34,1.34,0,0,1-2.68,0ZM14.62.86a20.36,20.36,0,0,0,5.09.88A8,8,0,0,0,23.2,1V14.43a7.68,7.68,0,0,1-3.49.79,20.64,20.64,0,0,1-5-.86,20.2,20.2,0,0,0-5.09-.88,8,8,0,0,0-3.49.75V.79A7.71,7.71,0,0,1,9.63,0a20.56,20.56,0,0,1,5,.86Z"/></svg>';
var icon_restaurants = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1,.cls-2{fill:#595a5c;}.cls-1{fill-rule:evenodd;}</style></defs><path class="cls-1" d="M.21,12.5A12.29,12.29,0,1,1,12.5,24.79,12.3,12.3,0,0,1,.21,12.5Zm1.38,0A10.91,10.91,0,1,0,12.5,1.59,10.92,10.92,0,0,0,1.59,12.5Zm8.67-5.59a.69.69,0,0,1,1.38,0v4.58a2.24,2.24,0,0,1-2.25,2.24H9.17v5.81a.69.69,0,0,1-1.38,0V13.73H7.56a2.24,2.24,0,0,1-2.24-2.24V6.91A.68.68,0,0,1,6,6.22a.69.69,0,0,1,.69.69v4.58a.87.87,0,0,0,.87.87H9.39a.87.87,0,0,0,.87-.87Zm6.41-.69A3.93,3.93,0,0,0,13,10.37a4.06,4.06,0,0,0,3,4.07v5.1a.69.69,0,0,0,1.38,0v-5.1a4.06,4.06,0,0,0,3-4.07A3.93,3.93,0,0,0,16.67,6.22Zm0,6.92a2.57,2.57,0,0,1-2.28-2.77A2.56,2.56,0,0,1,16.67,7.6a2.56,2.56,0,0,1,2.27,2.77A2.57,2.57,0,0,1,16.67,13.14Zm-7.5-2.61a.69.69,0,0,1-1.38,0V6.91a.69.69,0,0,1,1.38,0Z"/><path class="cls-2" d="M11.64,6.91h0ZM9.17,13.73v-.21H9v.21Zm-1.38,0H8v-.21H7.79Zm8.19.71h.21v-.17l-.17,0Zm1.38,0-.05-.21-.16,0v.17ZM12.5,0A12.52,12.52,0,0,0,0,12.5H.42A12.09,12.09,0,0,1,12.5.42ZM25,12.5A12.52,12.52,0,0,0,12.5,0V.42A12.09,12.09,0,0,1,24.58,12.5ZM12.5,25A12.52,12.52,0,0,0,25,12.5h-.42A12.09,12.09,0,0,1,12.5,24.58ZM0,12.5A12.52,12.52,0,0,0,12.5,25v-.42A12.09,12.09,0,0,1,.42,12.5ZM12.5,23.2A10.71,10.71,0,0,1,1.8,12.5H1.38A11.13,11.13,0,0,0,12.5,23.62ZM23.2,12.5A10.71,10.71,0,0,1,12.5,23.2v.42A11.13,11.13,0,0,0,23.62,12.5ZM12.5,1.8A10.71,10.71,0,0,1,23.2,12.5h.42A11.13,11.13,0,0,0,12.5,1.38ZM1.8,12.5A10.71,10.71,0,0,1,12.5,1.8V1.38A11.13,11.13,0,0,0,1.38,12.5ZM11,6a.9.9,0,0,0-.9.9h.43A.47.47,0,0,1,11,6.43Zm.9.9A.9.9,0,0,0,11,6v.42a.47.47,0,0,1,.48.48Zm0,4.58V6.91h-.42v4.58ZM9.39,14a2.46,2.46,0,0,0,2.46-2.46h-.42a2,2,0,0,1-2,2Zm-.22,0h.22v-.43H9.17Zm.21,5.59V13.73H9v5.81Zm-.9.9a.9.9,0,0,0,.9-.9H9a.47.47,0,0,1-.47.48Zm-.9-.9a.9.9,0,0,0,.9.9V20A.47.47,0,0,1,8,19.54Zm0-5.81v5.81H8V13.73Zm0,.22h.23v-.43H7.56ZM5.1,11.49A2.47,2.47,0,0,0,7.56,14v-.43a2,2,0,0,1-2-2Zm0-4.58v4.58h.43V6.91ZM6,6a.9.9,0,0,0-.9.9h.43A.47.47,0,0,1,6,6.43Zm.9.9A.9.9,0,0,0,6,6v.42a.47.47,0,0,1,.48.48Zm0,4.58V6.91H6.48v4.58Zm.66.66a.67.67,0,0,1-.66-.66H6.48a1.09,1.09,0,0,0,1.08,1.08Zm1.83,0H7.56v.42H9.39Zm.66-.66a.66.66,0,0,1-.66.66v.42a1.09,1.09,0,0,0,1.09-1.08Zm0-4.58v4.58h.43V6.91Zm3.18,3.46a3.71,3.71,0,0,1,3.44-3.94V6a4.14,4.14,0,0,0-3.87,4.36ZM16,14.23a3.84,3.84,0,0,1-2.79-3.86H12.8a4.26,4.26,0,0,0,3.13,4.27Zm.17,5.31v-5.1h-.42v5.1Zm.48.48a.48.48,0,0,1-.48-.48h-.42a.9.9,0,0,0,.9.9Zm.48-.48a.48.48,0,0,1-.48.48v.42a.9.9,0,0,0,.9-.9Zm0-5.1v5.1h.42v-5.1Zm3-4.07a3.83,3.83,0,0,1-2.8,3.86l.09.41a4.25,4.25,0,0,0,3.13-4.27ZM16.67,6.43a3.72,3.72,0,0,1,3.44,3.94h.42A4.14,4.14,0,0,0,16.67,6Zm-2.49,3.94a2.77,2.77,0,0,0,2.49,3v-.43a2.35,2.35,0,0,1-2.07-2.55Zm2.49-3a2.78,2.78,0,0,0-2.49,3h.42a2.35,2.35,0,0,1,2.07-2.56Zm2.49,3a2.78,2.78,0,0,0-2.49-3v.43a2.35,2.35,0,0,1,2.06,2.56Zm-2.49,3a2.77,2.77,0,0,0,2.49-3h-.43a2.34,2.34,0,0,1-2.06,2.55ZM8.48,11.43a.9.9,0,0,0,.9-.9H9a.49.49,0,0,1-.48.48Zm-.9-.9a.9.9,0,0,0,.9.9V11A.48.48,0,0,1,8,10.53Zm0-3.62v3.62H8V6.91Zm.9-.9a.9.9,0,0,0-.9.9H8a.47.47,0,0,1,.48-.48Zm.9.9a.9.9,0,0,0-.9-.9v.42A.48.48,0,0,1,9,6.91Zm0,3.62V6.91H9v3.62Z"/></svg>';
var icon_retail = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1,.cls-2{fill:#595a5c;}.cls-1{fill-rule:evenodd;}</style></defs><path class="cls-1" d="M12.5.25A4.91,4.91,0,0,0,7.73,4.06H4.6a1.91,1.91,0,0,0-1.33.58A2.46,2.46,0,0,0,2.71,5.8a.07.07,0,0,1,0,0L1.62,23.25a.41.41,0,0,0,0,.11A1.4,1.4,0,0,0,3,24.75H22a1.4,1.4,0,0,0,1.39-1.39.41.41,0,0,0,0-.11L22.3,5.85a.07.07,0,0,1,0,0,2.46,2.46,0,0,0-.56-1.16,1.91,1.91,0,0,0-1.33-.58H17.27A4.91,4.91,0,0,0,12.5.25Zm0,1.63a3.23,3.23,0,0,1,3.08,2.18H9.42A3.23,3.23,0,0,1,12.5,1.88ZM7.6,5.69h-3c-.07,0-.07,0-.12,0h0a.93.93,0,0,0-.16.37h0l-1,17H21.72l-1-17h0a.93.93,0,0,0-.16-.37h0c-.05,0-.05,0-.12,0h-3V9.12a.81.81,0,0,1-.4.72.82.82,0,0,1-.83,0,.81.81,0,0,1-.4-.72V5.69H9.23V9.12a.81.81,0,0,1-.4.72.82.82,0,0,1-.83,0,.81.81,0,0,1-.4-.72Z"/><path class="cls-2" d="M7.73,4.06V4.3h.19l0-.19Zm-5,1.74.24,0H3Zm0,0-.24,0H2.7ZM1.62,23.25l.24,0H1.62Zm0,.11h0Zm21.78,0h0Zm0-.11h-.24ZM22.3,5.85h.24Zm0,0-.24,0h0Zm-5-1.74L17,4.11l0,.19h.19Zm-1.69,0V4.3h.35L15.81,4Zm-6.16,0L9.19,4l-.12.32h.35ZM7.6,5.69h.24V5.45H7.6Zm-3.12,0,.18.17h0Zm0,0,.19.17h0Zm-.16.37.24,0h0Zm0,0-.24,0h0Zm0,0-.24,0h0v0Zm-1,17H3l0,.26h.26Zm18.44,0v.25H22l0-.26Zm-1-17h0Zm0,0h.24v0Zm-.16-.37.18-.16h0Zm0,0-.18.17h0Zm-3.12,0V5.45h-.24v.24Zm0,3.43h0Zm-.4.72-.13-.21Zm-.83,0,.13-.21Zm-.4-.72h0Zm0-3.43H16V5.45h-.24Zm-6.54,0V5.45H9v.24Zm0,3.43h0Zm-.4.72L8.7,9.63h0ZM8,9.84l.13-.21h0Zm-.4-.72h0Zm.36-5A4.67,4.67,0,0,1,12.5.49V0a5.16,5.16,0,0,0-5,4ZM4.6,4.3H7.73V3.81H4.6Zm-1.14.51A1.58,1.58,0,0,1,4.6,4.3V3.81a2.09,2.09,0,0,0-1.51.67ZM3,5.85a2.12,2.12,0,0,1,.51-1l-.37-.33a2.61,2.61,0,0,0-.62,1.27Zm0,0v0l-.48-.1s0,0,0,.07ZM1.86,23.26,3,5.87l-.49,0L1.37,23.23Zm0,.1a.25.25,0,0,1,0-.08l-.49-.07c0,.05,0,.1,0,.15ZM3,24.51a1.16,1.16,0,0,1-1.15-1.15H1.36A1.65,1.65,0,0,0,3,25Zm19,0H3V25H22Zm1.15-1.15A1.16,1.16,0,0,1,22,24.51V25a1.65,1.65,0,0,0,1.64-1.64Zm0-.08a.25.25,0,0,1,0,.08h.49c0-.05,0-.1,0-.15ZM22.05,5.87l1.09,17.39.49,0L22.54,5.84Zm0,0v0l.49-.07s0,0,0-.07Zm-.51-1a2.12,2.12,0,0,1,.51,1l.48-.1a2.61,2.61,0,0,0-.62-1.27ZM20.4,4.3a1.58,1.58,0,0,1,1.14.51l.37-.33a2.09,2.09,0,0,0-1.51-.67Zm-3.13,0H20.4V3.81H17.27ZM12.5.49A4.67,4.67,0,0,1,17,4.11L17.51,4a5.16,5.16,0,0,0-5-4ZM15.81,4A3.48,3.48,0,0,0,12.5,1.63v.49a3,3,0,0,1,2.85,2ZM9.42,4.3h6.16V3.81H9.42ZM12.5,1.63A3.48,3.48,0,0,0,9.19,4l.46.16a3,3,0,0,1,2.85-2ZM4.6,5.94h3V5.45h-3Zm.06,0,0,0h0l0,0,0,0h0V5.45a.4.4,0,0,0-.17,0,.56.56,0,0,0-.13.11Zm0,0h0L4.3,5.58h0Zm-.11.25A1.89,1.89,0,0,1,4.61,6l0,0v0h0l-.37-.33a1.2,1.2,0,0,0-.22.48Zm0-.08v0a.13.13,0,0,1,0,.06l-.48-.1a.19.19,0,0,0,0,.08Zm0,.08a.37.37,0,0,0,0-.08l-.49.06V6.08Zm-1,17,1-17-.49,0-1,17Zm18.19-.26H3.28v.49H21.72ZM20.44,6.14l1,17,.49,0-1-17Zm0,0h0Zm-.1-.2h0v0l0,0a1.89,1.89,0,0,1,.06.18l.48-.1a1.2,1.2,0,0,0-.22-.48Zm0,0h0l.37-.33h0Zm.06,0h0l-.05,0-.05,0h0l0,0,.36-.33a.56.56,0,0,0-.13-.11.4.4,0,0,0-.17,0Zm-3,0h3V5.45h-3Zm.25,3.18V5.69h-.49V9.12Zm-.53.93a1.07,1.07,0,0,0,.53-.93h-.49a.59.59,0,0,1-.29.5Zm-1.07,0a1,1,0,0,0,1.07,0l-.25-.42a.58.58,0,0,1-.57,0Zm-.53-.93a1.07,1.07,0,0,0,.53.93l.25-.42a.59.59,0,0,1-.29-.5Zm0-3.43V9.12H16V5.69Zm-6.29.25h6.54V5.45H9.23Zm.25,3.18V5.69H9V9.12ZM9,10.05a1.07,1.07,0,0,0,.53-.93H9a.59.59,0,0,1-.29.5Zm-1.07,0a1,1,0,0,0,1.07,0L8.7,9.63a.58.58,0,0,1-.57,0Zm-.53-.93a1.07,1.07,0,0,0,.53.93l.25-.42a.59.59,0,0,1-.29-.5Zm0-3.43V9.12h.49V5.69Z"/></svg>';
var icon_subway = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" preserveAspectRatio="xMidYMid meet"><defs><style>.cls-1{fill:#595a5c;}</style></defs><g id="_1broadway" data-name="1broadway"><g id="home-2---desktop"><g id="Group-22"><path id="Combined-Shape" class="cls-1" d="M16.34,7a2.88,2.88,0,0,1,2.89,2.88h0v7.7a2.88,2.88,0,0,1-2.89,2.88h-.08L18,22.16a1,1,0,0,1,0,1.36,1,1,0,0,1-.68.28,1,1,0,0,1-.68-.28h0l-3.09-3.09H11.45L8.37,23.52a1,1,0,0,1-.68.28A1,1,0,0,1,7,23.52a1,1,0,0,1,0-1.36H7l1.72-1.73H8.65a2.89,2.89,0,0,1-2.89-2.88h0V9.85A2.89,2.89,0,0,1,8.65,7h7.69ZM3.66,4.86A12.5,12.5,0,0,1,21.34,22.54a1,1,0,0,1-.68.28A1,1,0,0,1,20,21.18a10.58,10.58,0,1,0-15,0,1,1,0,0,1,0,1.36,1,1,0,0,1-1.36,0A12.51,12.51,0,0,1,3.66,4.86Zm7.18,10.76H7.69v1.93a1,1,0,0,0,1,1h7.69a1,1,0,0,0,1-1h0V15.62H14.15a1.91,1.91,0,0,1-3.31,0Zm5.5-6.73H8.65a1,1,0,0,0-1,1h0V13.7h3.15a1.91,1.91,0,0,1,3.31,0h3.16V9.85a1,1,0,0,0-1-1Z"/></g></g></g></svg>';
var icon_citibikeLegend = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25"><defs><style>.bike-lane{fill:none;stroke:#018240;stroke-linecap:round;stroke-linejoin:round;stroke-width:3.72px;}</style></defs><line class="bike-lane" x1="2.19" y1="12.47" x2="22.19" y2="12.47"/></svg>'