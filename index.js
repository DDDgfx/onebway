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

            var allPops = d3.selectAll('.clear-popup').remove();


            commuteLegend(); 

            
            //map.setPaintProperty('ferry', 'line-color', '#000000');


            //map.resize();
            // Add a GeoJSON source for all amenities
            //map.removeSource('locationPoints');
            //map.getSource('locationPoints').setData(locations);

            // if (!map.getSource('locationPoints')) {
            //     console.log("locations is not here");
            // }

            // console.log(map.getStyle().layers);
            //console.log(mapLayersAdded);

            mapLayersAdded.forEach(function (d) {
                if (map.getLayer(d)) {
                    map.removeLayer(d);
                }

            })

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

                //directions example request.
                var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/" + commuteType + '/' + oneBway_x + '%2C' + oneBway_y + '%3B' + feature_x + '%2C' + feature_y + '?alternatives=false&geometries=geojson&steps=false&access_token=pk.eyJ1IjoiY2l6emxlIiwiYSI6ImNrcDJ0MjhteTE5cGsyb213bms0dHp6c3QifQ.-dc9k9y6KKnDlE5UszjS9A';

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
                        console.log(response.routes[0].legs.steps);
                        addNeighborhoodRouteG(route, feature.properties.Name);
                        createClearPopUpG(feature, response);

                       }
                )

                //AIzaSyAW2bdPy8GEgbDO9l4v-uZRV3T51YCmi6A


                d3.json(reqUrl).then(function (d) {
                    //console.log(d);
                    // addNeighborhoodRoute(d, feature.properties.Name);
                    // createClearPopUp(feature, d);
                })

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

            map.flyTo({
                center: [-74.01437444860113, 40.704838691991284],
                zoom: 14
            });

            var popUps = document.getElementsByClassName('mapboxgl-popup');
            console.log(popUps);

            if (popUps[0])  for (item of popUps) {
                item.remove();
            };

            //popUps.forEach(d => d.remove())
            
            map.setPaintProperty('ferry', 'line-color', '#6699CC');
            map.setLayoutProperty('nyc subways', 'visibility', 'visible');
            map.setLayoutProperty('nyc subways shadow', 'visibility', 'visible');
            map.setLayoutProperty('nyc subway stations', 'visibility', 'visible');
            map.setLayoutProperty('transit-label', 'visibility', 'visible');
            map.setLayoutProperty('citibike stations', 'visibility', 'none');
            map.setLayoutProperty('bike lanes', 'visibility', 'none');


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



        }

        function citibikeMode() {
            console.log(map.getStyle().layers);

            var allPops = d3.selectAll('.clear-popup').remove();
            
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



        }

        function amenityMode() {

            //map.resize();
            // Add a GeoJSON source for all amenities
            //map.removeSource('locationPoints');
            //map.getSource('locationPoints').setData(locations);

            // if (!map.getSource('locationPoints')) {
            //     console.log("locations is not here");
            // }

            var allPops = d3.selectAll('.clear-popup').remove();


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
                            'icon-anchor': 'bottom',
                            'icon-size': 1,
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


            map.flyTo({
                center: [-74.01437444860113, 40.704838691991284],
                zoom: 15
            });

            // map.fitBounds(bounds, {
            //     padding: 25,
            //     pitch: 0,
            //     bearing: 0
            // });

        }

        function commuteLegend() {
            var legendDiv = d3.select('#map-legend');
            legendDiv.html('');
            legendDiv.selectAll('*').remove();



        }

        //all the popups
        function createPopUp(feature) {
            var description = feature.properties.Category;
            var id = feature.properties.id;
            console.log(feature.properties.Name);

            //ADD POP UP
            var popUps = document.getElementsByClassName('mapboxgl-popup');
            if (popUps[0]) popUps[0].remove();

            var popup = new mapboxgl.Popup({
                    offset: [0, -25]
                })
                .setLngLat(feature.geometry.coordinates)
                .setHTML(
                    '<h3>' + feature.properties.Name + '</h3>' +
                    '<h3><a target="_blank" href="' + feature.properties["Google Business URL"] + '">directions</a></h3>'
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

            addMarker(feature);
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

        function createLegend(scale) {

            // d3.select('#map-legend').remove();


            var legend = d3.select("#copy-ux").insert("div", "#controls").attr("id", "map-legend").html('Legend')



            // console.log(scale.domain());

            var legendItems = legend.selectAll('div').data(scale.domain()).join('div').classed('legend-item-holder', true);

            //legendItems.html(d => d);

            legendItems.append('img').attr('src', d => 'icons/halodot_' + scale(d) + '.svg').classed('legend-item-icon', true);
            legendItems.append('div').html(d => d).classed('legend-item-label', true);



        }

        //MAP CLICK
        map.on('click', function (e) {
            console.log("zoom: " + map.getZoom() + " pitch: " + map.getPitch() + " bearing: " + map.getBearing() + " coords: [" + e.lngLat.lng + ',' + e.lngLat.lat + ']');
            // If the user clicked on one of your markers, get its information.
            var features = map.queryRenderedFeatures(e.point, {
                layers: mapLayersAdded, //.concat(['tenExchangePoint', '10-exchange-ammenities']) // replace with your layer name
            });

            if (!features.length) {
                return;
            }
            var feature = features[0];

            amenityListItems.transition().style("opacity", .25);

            // amenityListItems.filter(d => d.Name == feature.properties.Name).transition().style("opacity", 1);
            amenityListItems.each(function (d) {
                var featureName = d3.select(this).select('div').select('div').html();
                featureName = featureName.replace('&amp;', '&');
                if (featureName == feature.properties.Name) {
                    d3.select(this).transition().style("opacity", 1);
                }
            })
            console.log(feature);

            createPopUp(feature);

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
                "Google Business URL": "https://www.sailsunset.com/"
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
                "Google Business URL": "https://www.sailnewyork.com/"
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
        {
            "type": "Feature",
            "properties": {
                "Name": "The Bowery Hotel",
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
                "url": "http://www.theboweryhotel.com/"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-73.9914737, 40.7260151, 0.0]
            }
        },
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


