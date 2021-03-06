﻿$(document).ready(function() {
	console.log("Document Loaded");
	setVariables()
	drawMap();
    drawSat();
    setClickListeners();
	getStatus();
});

var setVariables = function() {
    // get the smaller of width/height as the map dimension
    $width = window.outerHeight < window.innerWidth ? 0.45 * window.innerWidth : 0.9 * window.innerWidth;
    $height = $width;
    if (window.outerHeight > window.innerWidth) {d3.select(".ui").attr("width", "100%");}

    // append svg to document to draw on
    $svg = d3.select(".svg").append("svg")
    .attr("width", $width)
    .attr("height", $height);

    // set initial position and references to table cells
    $lon = 0;
	$lat = 0;
	$az = 0;
	$alt = 0;
    $time = "";
    $log = $("#log");

    $stop_flag = false;

    $trajectory = [];

	$lonlabel = d3.select("#lon");
	$latlabel = d3.select("#lat");
	$azilabel = d3.select("#azi");
	$altlabel = d3.select("#alt");
	$timelabel = d3.select("#time");

    // set up projection as a globe
    $projection = d3.geo.orthographic()
        .scale($width * 0.459)  // experimentally determined factor
        .translate([$width / 2, $height / 2])
        .clipAngle(90)
        .precision(1);

    // set up path (to draw map with)
    $path = d3.geo.path()
        .projection($projection);

}

function setClickListeners() {
    $("#startcomputing").click(function() {
        $.get(window.location.href + "?startcomputing")
            .success(function() {
                $stop_flag = false;
            });
    });

    $("#stopcomputing").click(function() {
        $trajectory = [];
        $.get(window.location.href + "?stopcomputing")
            .success(function() {
                $stop_flag = true;
            });
    });

    $("#starttracking").click(function() {
        $.get(window.location.href + "?starttracking");
    });

    $("#stoptracking").click(function() {
        $.get(window.location.href + "?stoptracking");
    });
}

var drawMap = function() {

    var graticule = d3.geo.graticule();


	$svg.append("defs").append("path")
		.datum({type: "Sphere"})
		.attr("id", "sphere")
		.attr("d", $path);

	$svg.append("use")
		.attr("class", "stroke")
		.attr("xlink:href", "#sphere");

	$svg.append("use")
		.attr("class", "fill")
		.attr("xlink:href", "#sphere");

	$svg.append("path")
		.datum(graticule)
		.attr("class", "graticule")
		.attr("d", $path);

	d3.json("world-50m.json", function(error, world) {
	  if (error) throw error;
	  console.log("World loaded");

	 $svg.insert("path", ".graticule")
		  .datum(topojson.feature(world, world.objects.land))
		  .attr("class", "land")
		  .attr("d", $path);

	  $svg.insert("path", ".graticule")
		  .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
		  .attr("class", "boundary")
		  .attr("d", $path);

      $svg.append("path")
          .datum({type: "LineString", coordinates: $trajectory})
          .attr("d", $path)
          .attr("class", "trajectory");
	});

	d3.select(self.frameElement).style("height", $height + "px");
};

var drawSat = function() {
    $svg.selectAll("circle")
		.data([[$lon, $lat]]).enter()
		.append("circle")
		.attr("cx", function (d) { return $projection(d)[0]; })
		.attr("cy", function (d) { return $projection(d)[1]; })
		.attr("r", "8px")
		.attr("fill", "red")
		.attr("class", "satellite");

}

function getStatus(){
	$.getJSON(window.location.href + '?status', function(data) {
			$lon = parseFloat(data.lon);
			$lat = parseFloat(data.lat);
			$az = parseFloat(data.az);
			$alt = parseFloat(data.alt);
			$time = data.time;

            addTrajectory($lat, $lon);
            appendLog(data.log);

			$lonlabel.text($lon.toFixed(3));
			$latlabel.text($lat.toFixed(3));
			$azilabel.text($az.toFixed(3));
			$altlabel.text($alt.toFixed(3));
			$timelabel.text($time + " UTC");

            rotateProjection($lat, $lon);
            plotPoints($lat, $lon);

			setTimeout(getStatus, 1000*data.interval);
	}).fail(function() {
        setTimeout(getStatus, 2000);
        $trajectory = [];
        if (!$stop_flag) {
            appendLog(["Server connection failed. Retrying in 2s."]);
        }
    });
}

function rotateProjection(lat, lon) {
		$projection.rotate([-lon, -lat]);
        //$svg.selectAll("path").attr("d", $path);
        $svg.selectAll(".boundary, .land, .graticule, .fill, .stroke, #sphere")
            .attr("d", $path);
}

function plotPoints(lat, lon) {
	$svg.selectAll(".trajectory")
          .datum({type: "LineString", coordinates: $trajectory})
          .attr("d", $path);
}

function addTrajectory(lat, lon) {
    $trajectory.push([lon, lat]);
}

function appendLog(log) {
    for (i=0; i<log.length; i++) {
        $log.prepend("<p>" + log[i] + "</p>" );
    }
    //$log.scrollTop($log.prop("scrollHeight"));
}
