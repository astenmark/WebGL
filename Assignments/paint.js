"use strict";

var gl, canvas;
var drawing = false;
var cindex = 0, linewidth = 1;

var maxNumTriangles = 2000, maxNumVertices  = 3 * maxNumTriangles;
var index = 0;
var numPolygons = 0;
var numIndices = [];
numIndices[0] = 0;
var start = [0];
var widths = [1];

var bufferId, cBufferId;

var colors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];

var backgrounds = [
    vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
    vec4( 0.8, 0.8, 0.8, 1.0 ),  // lt grey
    vec4( 0.5, 0.5, 0.5, 1.0 ),  // md grey
    vec4( 0.3, 0.3, 0.3, 1.0 ),  // dk grey
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
];


HTMLCanvasElement.prototype.relMouseCoords = function (event) {
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do {
        totalOffsetX += currentElement.offsetLeft;
        totalOffsetY += currentElement.offsetTop;
    }
    while (currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    // Fix for variable canvas width
    canvasX = Math.round( canvasX * (this.width / this.offsetWidth) );
    canvasY = Math.round( canvasY * (this.height / this.offsetHeight) );

    return {x:canvasX, y:canvasY}
}

function addPoint(x, y) {
    var t;
    t = vec2(2*x/canvas.width-1, 2*(canvas.height-y)/canvas.height-1);
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

    t = vec4(colors[cindex]);
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

    numIndices[numPolygons]++;
    index++;
}

function handleMouseDown(event) {
    var coords = canvas.relMouseCoords(event);
    drawing = true;

    addPoint(coords.x, coords.y);
    widths[numPolygons] = linewidth;
}

function handleMouseUp() {
    var coords = canvas.relMouseCoords(event);
    drawing = false;

    addPoint(coords.x, coords.y);

    numPolygons++;
    numIndices[numPolygons] = 0;
    start[numPolygons] = index;

    render();
}

function handleMouseMove() {
    if (drawing) {
        var coords = canvas.relMouseCoords(event);
        addPoint(coords.x, coords.y);

        numPolygons++;
        render();
        numPolygons--;
    }
}

function init() {
    canvas = document.getElementById( "gl-canvas" );

    // Initialize WebGL
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    // Initialize shaders
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Initialize mouse event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);

    // Initialize input elements
    document.getElementById("color").onchange = function(event) {
        cindex = parseInt(event.target.value);
    }

    document.getElementById("linewidth").onchange = function(event) {
        linewidth = parseInt(event.target.value);
    }

    document.getElementById("background").onchange = function(event) {
        var bgindex = parseInt(event.target.value);
        gl.clearColor( backgrounds[bgindex][0], backgrounds[bgindex][1], backgrounds[bgindex][2], backgrounds[bgindex][3] );
        render();
    }

    document.getElementById("clear").onclick = function(event) {
        index = 0;
        numPolygons = 0;
        numIndices = [0];
        start = [0];
        widths = [linewidth];
        render();
    }

    // Initialize buffers
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );
    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );

    cBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    for(var i = 0; i < numPolygons; i++) {
        gl.lineWidth( widths[i] );
        gl.drawArrays( gl.LINE_STRIP, start[i], numIndices[i] );
    }
}
