//-------------------------------------------------------------------------------
// Global Definitions:
var width  = window.innerWidth,
    height = window.innerHeight;

var margin = {top: 0, right: 0, bottom: 0, left: 0};
var offset = [2 * width / 5, height / 2];
var tooltipOffset = [ 3 * width / 5, height / 6];

//-------------------------------------------------------------------------------
// Graph and SVG objects:
var svg = d3.select('.wrapper').append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('z-index', '-1');

var g = svg.append('g');

//-------------------------------------------------------------------------------
// World Map globals:
var centroid = d3.geo.path()
    .projection(function(d) { return d; })
    .centroid;

var projection = d3.geo.orthographic()
    .scale(248)
    .clipAngle(90)
    .translate(offset);

// The borders: ?
var path = d3.geo.path()
    .projection(projection);

var graticule = d3.geo.graticule();

//-------------------------------------------------------------------------------
// Motion Globals:
var rotate = d3_geo_greatArcInterpolator();

//-------------------------------------------------------------------------------
// Single Variables:
var line = g.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', path);

var earth = g.append('circle')
    .attr('class', 'graticule-outline')
    .attr('cx', offset[0])
    .attr('cy', offset[1])
    .attr('r', projection.scale());

var title = g.append('text')
    .attr('x', offset[0])
    .attr('y', height * 3 / 5);

var pieRadius = 100;
var pieChart = undefined;

var tooltipLine;
var tooltip = d3.select('.wrapper')
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('z-index', '10')
                .style('visibility', 'visible')
                .style('left', tooltipOffset[0] + 'px')
                .style('top', tooltipOffset[1] - 20 + 'px' );
var currentCountryInfo;
//---------------------------------------------------------------------------------
// DataBase variables:
// TODO: Adapt for real data (I keep it as example for later)

humanFactorDataPath = 'data/global.csv';
worldRegionsDataPath= 'data/world_regions.json';
worldMapDataPath = 'data/readme-world-110m.json';

function type(d) {
  d.apples = +d.apples || 0;
  d.oranges = +d.oranges || 0;
  return d;
}

function typeHT(d) {
  return d;
}

//-------------------------------------------------------------------------------
// Utility Globals:
var color = d3.scale.category10();

var d3_radians = Math.PI / 180;

var automaticMode = 0;
var centered;

//-------------------------------------------------------------------------------
// Main: Loads json data and apply tansitions
d3.json(worldMapDataPath, function(error, world) {

    var zoomFactor = 1;
    
    // Loading the Map:
    var countries = topojson.object(world, world.objects.countries).geometries;
    var country = g.selectAll('.country')
        .data(countries)
        .enter().insert('path', '.graticule')
        .attr('class', 'country')
        .attr('d', path)
        .on('click', focusOnRegion)
        .on('dblclick', focusOnRegion)
        .on('mouseover', openCountryDescription)
        .on('mouseout', closeCountryDescription);
    
    heatMap();
    
    // Create Ranking bars:
    rankingBars();

    function rankingBars() {
        d3.json(worldRegionsDataPath, function(error, data) {

        });
    }

    function heatMap() {
        d3.csv(humanFactorDataPath, typeHT, function(error, data) {
                country.transition()
                       .style('fill', 'red')
                       .style('fill-opacity',function(d, j) {
                                    for(var dataI = 0; dataI < data.length; dataI++) {
                                        if(data[dataI].country == countries[j].id) {
                                            var opacity = d3.scale.linear()
                                                            .domain([10, 835])
                                                            .range([0.55, 1]);
                                            return opacity(data[dataI].total);
                                        }
                                    }
                                    return 0.2;
                                });
        });
    }
    
    function openCountryDescription(c) {
        tooltipLine = g.append('line')
                        .style('stroke', 'black')
                        .attr('x1', path.centroid(c)[0])
                        .attr('y1', path.centroid(c)[1])
                        .attr('x2', tooltipOffset[0])
                        .attr('y2', tooltipOffset[1]);
        tooltipLine.transition()
                   .duration(100)
                   .style('opacity', 0.9);
        
        currentCountryInfo = undefined;
        getDataForCountry(c, function(info) { currentCountryInfo = info; });
        var htmlInfo;
        if(currentCountryInfo) {
            htmlInfo = '<p>' + currentCountryInfo.country +'</p>'
            for(var attribute in currentCountryInfo) {
                var infoString = '<br>' + '<p>' + attribute + ': ' + currentCountryInfo[attribute] + '</p>';
                htmlInfo = htmlInfo.concat(infoString);
            }
        } else {
            htmlInfo = '<p>' + 'No human traffic data available for: ' + c.id + '</p>';
        }
        tooltip.html(htmlInfo);
    }

    function closeCountryDescription(c) {
        tooltipLine.transition()
                   .duration(500)
                   .style('opacity', 0);
    }

//-------------------------------------------------------------------------------
// Get Data for Country: return the data corresponding to the country c
    function getDataForCountry(country, updateCallback) {
        d3.csv(humanFactorDataPath, typeHT, function(error, data) {
            for(var i = 0; i < data.length; i++) {
                if(data[i].country == country.id) {
                    updateCallback(data[i]);
                }
            }
        });
    }

//-------------------------------------------------------------------------------
// Country click to Focus callback:
    function focusOnCountry(c) {
        console.log('clicked on:' + c.id);

        title.text(c.id);

        country.transition()
            .style('fill', function(d, j) {
                if(countries[j].id == c.id) {
                    return 'red';
                }
                return '#b8b8b8';
            });

        d3.transition()
            .delay(250)
            .duration(1250)
            .tween('rotate', function() {
                var point = centroid(c);
                rotate.source(projection.rotate()).target([-point[0], -point[1]]).distance();
                
                return function(t) {
                        projection.rotate(rotate(t));
                        country.attr('d', path);
                        line.attr('d', path);
                        tooltipLine.attr('x1', path.centroid(c)[0])
                                   .attr('y1', path.centroid(c)[1]);
                    };
            });
    }

//-------------------------------------------------------------------------------
// Double Click to focus on a world region:
    function focusOnRegion(c) {
        d3.json(worldRegionsDataPath, function(error, data) {
            // For a country get the correspoding region: TODO: do not repeat your self
            // The database is not cured for that so this piece of code is really disgusting, not time for that now.
            var region;
            var regionCentroid;
            for(var i = 0; i < data.worldRegions.length; i++) {
                var regionDesc = data.worldRegions[i];
                for(var cCount = 0; cCount < regionDesc.countries.length; cCount++) {
                    if(regionDesc.countries[cCount] == c.id) {
                        region = data.worldRegions[i].name;
                        regionCentroid = data.worldRegions[i].centroid;
                        break;
                    }
                }
            }
            var centroidCountry;
            for(var k = 0; k < countries.length; k++) {
                if(countries[k].id == regionCentroid) {
                    console.log(countries[k].id);
                    centroidCountry = countries[k];
                    break;
                }
            }

            if(centroidCountry) {
                title.text(region);
                // Rotate to the centroid country o the corresponding region:
                d3.transition()
                    .delay(100)
                    .duration(1250)
                    .tween('rotate', function() {
                        var targetPoint = centroid(centroidCountry);
                        rotate.source(projection.rotate()).target([-targetPoint[0], -targetPoint[1]]).distance();
                        return function(t) {
                                projection.rotate(rotate(t));
                                country.attr('d', path);
                                line.attr('d', path);
                                tooltipLine.attr('x1', path.centroid(centroidCountry)[0])
                                        .attr('y1', path.centroid(centroidCountry)[1]);
                        };
                    });
            }
        });
    }

//-------------------------------------------------------------------------------
// Country double click to Focus and show details callback:
    function countryFocusAndDetails(c) {
        // Focus:
        if(pieChart != undefined) {
            g.selectAll('.pie-arc').transition().style('opacity', '0');
            pieChart = undefined;
        }
        countryFocus(c);

        // Zoom:
        console.log('zooming...');
        var x, y;
        var point;
        if(c && centered != c) {
            point = centroid(c);
            x = offset[0];
            y = offset[1];
            zoomFactor = 4;
            centered = c;
        } else {
            x = offset[0];
            y = offset[1];
            zoomFactor = 1;
            centered = null;
        }
        g.selectAll('path')
            .classed('active', centered && function(d) { return d === centered; });

        g.transition()
            .duration(750)
            .attr('transform', 'translate(' + offset[0] + ',' + offset[1] + ')' + 
                               'scale(' + zoomFactor + ')' +
                               'translate(' + -x + ',' + -y + ')')
            .style('stroke-width', 1.5 / zoomFactor + 'px')
            .each('end', managePieTransitions);

    }

//-------------------------------------------------------------------------------
// Pie appearance and transition callback:
    function managePieTransitions(c) {
        // Show details: a Pie chart of fake data for now
        if(centered) {
            var pie = d3.layout.pie()
                        .value(function(d) { return d.apples; })
                        .sort(null);

            var arc = d3.svg.arc()
                        .innerRadius(0)
                        .outerRadius(pieRadius / zoomFactor);

            d3.csv('data/fake_data.csv', type, function(error, data) {
                console.log(data);
                pieChart = g.datum(data).selectAll('path.arc')
                                .data(pie)
                                .enter()
                                .append('path')
                                .attr('class', 'pie-arc')
                                .attr('transform', 'translate(' + offset[0] + ',' + offset[1] + ')')
                                .attr('fill', function(d, i) { return color(i); })
                                .attr('d', arc)
                                .each(function(d) { this._current = d; });
                pieChart.transition().delay(250).duration(100).style('opacity', '1');
            });
        }
    }

}); // Main End




