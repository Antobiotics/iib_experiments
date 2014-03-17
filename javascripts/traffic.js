//-------------------------------------------------------------------------------
// Global Definitions:
var width  = window.innerWidth,
    height = window.innerHeight;

var margin = {top: 0, right: 0, bottom: 0, left: 0};
var offset = [2 * width / 5, height / 2];

//-------------------------------------------------------------------------------
// Graph and SVG objects:
var svg = d3.select('.wrapper').append('svg')
    .attr('width', width)
    .attr('height', height);

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
//---------------------------------------------------------------------------------
// DataBase variables:
// TODO: Adapt for real data (I keep it as example for later)

humanFactorDataPath = 'data/global.csv';
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

var tip = d3.tip()
            .attr('class', 'd3-tip')
            .html(function(d) {
                return "<strong>Frequency:</strong> <span style='color:red'>" + "some texxxxt !!" + "</span>";
            })
//g.call(tip);
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
        .call(tip)
        .on('click', countryFocus)
        .on('dblclick', countryFocusAndDetails)
        .on('mouseover', openCountryDescription)
        .on('mouseout', closeCountryDescription);
    
    heatMap();

    function heatMap() {
        d3.csv(humanFactorDataPath, typeHT, function(error, data) {
                console.log(data);
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
                        .attr('x2', 780)
                        .attr('y2', 20);
        tooltipLine.transition()
                   .duration(100)
                   .style('opacity', 0.9);
        
        var countryInfo = getDataForCountry(c);
        if(countryInfo != null) {
            console.log(countryInfo);
            tip.show();
        }
    }

    function closeCountryDescription(c) {
        tooltipLine.transition()
                   .duration(500)
                   .style('opacity', 0);
        tip.hide();
    }
//-------------------------------------------------------------------------------
// Get Data for Country: return the data corresponding to the country c
    function getDataForCountry(country) {
        d3.csv(humanFactorDataPath, typeHT, function(error, data) {
            for(var i = 0; i < data.length; i++) {
                if(data[i].country == country.id) {
                    console.log(data[i]);
                    return data[i];
                }
            }
            return null;
        });
    }

//-------------------------------------------------------------------------------
// Country click to Focus callback:
    function countryFocus(c) {
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
// Interpolator Class:
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

//-------------------------------------------------------------------------------
// Interpolator Class:
function d3_geo_greatArcInterpolator() {
var x0, y0, cy0, sy0, kx0, ky0,
    x1, y1, cy1, sy1, kx1, ky1,
    d,
    k;

    function interpolate(t) {
        var B = Math.sin(t *= d) * k,
            A = Math.sin(d - t) * k,
            x = A * kx0 + B * kx1,
            y = A * ky0 + B * ky1,
            z = A * sy0 + B * sy1;
        return [
        Math.atan2(y, x) / d3_radians,
        Math.atan2(z, Math.sqrt(x * x + y * y)) / d3_radians
        ];
    }

    interpolate.distance = function() {
        if (d == null) k = 1 / Math.sin(d = Math.acos(Math.max(-1, Math.min(1, sy0 * sy1 + cy0 * cy1 * Math.cos(x1 - x0)))));
        return d;
    };

    interpolate.source = function(_) {
        var cx0 = Math.cos(x0 = _[0] * d3_radians),
            sx0 = Math.sin(x0);
        cy0 = Math.cos(y0 = _[1] * d3_radians);
        sy0 = Math.sin(y0);
        kx0 = cy0 * cx0;
        ky0 = cy0 * sx0;
        d = null;
        return interpolate;
    };

    interpolate.target = function(_) {
        var cx1 = Math.cos(x1 = _[0] * d3_radians),
            sx1 = Math.sin(x1);
        cy1 = Math.cos(y1 = _[1] * d3_radians);
        sy1 = Math.sin(y1);
        kx1 = cy1 * cx1;
        ky1 = cy1 * sx1;
        d = null;
        return interpolate;
    };

    return interpolate;
}
//-------------------------------------------------------------------------------


