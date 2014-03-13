//-------------------------------------------------------------------------------
// Global Definitions:
var width = 960,
    height = 500;

//-------------------------------------------------------------------------------
// World Map globals:
var centroid = d3.geo.path()
    .projection(function(d) { return d; })
    .centroid;

var projection = d3.geo.orthographic()
    .scale(248)
    .clipAngle(90);

var path = d3.geo.path()
    .projection(projection);

var graticule = d3.geo.graticule()
    .extent([[-180, -90], [180 - .1, 90 - .1]]);

//-------------------------------------------------------------------------------
// Motion Globals:
var rotate = d3_geo_greatArcInterpolator();

//-------------------------------------------------------------------------------
// Graph and SVG objects:
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g");

//-------------------------------------------------------------------------------
// Single Objects:
var line = g.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);

var earth = g.append("circle")
    .attr("class", "graticule-outline")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", projection.scale());

var title = g.append("text")
    .attr("x", width / 2)
    .attr("y", height * 3 / 5);

var pieRadius = 100;
var arc = d3.svg.arc()
    .outerRadius(pieRadius - 10)
    .innerRadius(pieRadius - 70);

var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.apples; });

//-------------------------------------------------------------------------------
// Utility Globals:
var color = d3.scale.category20();

var d3_radians = Math.PI / 180;

var automaticMode = 0;
var centered;

//-------------------------------------------------------------------------------
// Main: Loads json data and apply tansitions
d3.json("data/readme-world-110m.json", function(error, world) {
    var countries = topojson.object(world, world.objects.countries).geometries,
        i = -1,
        n = countries.length;

    var country = g.selectAll(".country")
        .data(countries)
        .enter().insert("path", ".graticule")
        .attr("class", "country")
        .attr("d", path)
        .on('click', countryFocus)
        .on('dblclick', countryFocusAndDetails);

    if(automaticMode) {
        step();
    }

//-------------------------------------------------------------------------------
// Step Loop function:
    function step() {
        if (++i >= n) i = 0;

        title.text(countries[i].id);

        country.transition()
            .style("fill", function(d, j) { return j === i ? "red" : "#b8b8b8"; });

        d3.transition()
            .delay(250)
            .duration(1250)
            .tween("rotate", function() {
            var point = centroid(countries[i]);
            rotate.source(projection.rotate()).target([-point[0], -point[1]]).distance();
            return function(t) {
                projection.rotate(rotate(t));
                country.attr("d", path);
                line.attr("d", path);
            };
            })
        .transition()
            .each("end", step);
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
                    };
            });
    }

//-------------------------------------------------------------------------------
// Country double click to Focus and show details callback:
    function countryFocusAndDetails(c) {
        // Focus:
        countryFocus(c);
        
        // Zoom:
        console.log('zooming...');
        var x, y, k;
        if(c && centered != c) {
            var point = centroid(c);
            //x = point[0];
            //y = point[1];
            x = width / 2;
            y = height / 2;
            k = 4;
            centered = c;
        } else {
            x = width  / 2;
            y = height / 2;
            k = 1;
            centered = null;
        }
        g.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + 
                                ")scale(" + k + 
                                ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    }
});

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


