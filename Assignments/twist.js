"use strict";

var canvas;
var gl;

var points = [];

var numTimesToSubdivide = 3;

var angle = 0.0;

var bufferId;

var filled = 1;

function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.


    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*Math.pow(4, 6), gl.STATIC_DRAW );



    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    document.getElementById("numsteps").onchange = function(event) {
        var event = event || window.event; // for IE
        var target = event.target || event.srcElement;
        numTimesToSubdivide = parseInt(target.value);
        render();
    };

    document.getElementById("numsteps").oninput = function(event) {
        var event = event || window.event; // for IE
        var target = event.target || event.srcElement;
        numTimesToSubdivide = parseInt(target.value);
        render();
    };

    document.getElementById("angle").onchange = function(event) {
        var event = event || window.event; // for IE
        var target = event.target || event.srcElement;
        angle = parseInt(target.value) / 10;
        render();
    };

    document.getElementById("angle").oninput = function(event) {
        var event = event || window.event; // for IE
        var target = event.target || event.srcElement;
        angle = parseInt(target.value) / 10;
        render();
    };

    document.getElementById("filled").onchange = function(event) {
        var event = event || window.event; // for IE
        var target = event.target || event.srcElement;
        filled = target.checked;
        render();
    };

    render();
};

function triangle( a, b, c )
{
    points.push( a, b, c );
}

function divideTriangle( a, b, c, count )
{

    // check for end of recursion

    if ( count <= 0 ) {
        var ax = twist(a[0], a[1], angle);
        var bx = twist(b[0], b[1], angle);
        var cx = twist(c[0], c[1], angle);
        triangle( ax, bx, cx );
    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );

        --count;

        // three new triangles

        divideTriangle( a, ab, ac, count );
        divideTriangle( c, ac, bc, count );
        divideTriangle( b, bc, ab, count );
        divideTriangle( ab, ac, bc, count );
    }
}

window.onload = init;

function render()
{
    var index;
    var vertices = [
        vec2( -0.6, -0.6 ),
        vec2(  0,  0.6 ),
        vec2(  0.6, -0.6 )
    ];
    points = [];
    divideTriangle( vertices[0], vertices[1], vertices[2],
                    numTimesToSubdivide);

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));
    gl.clear( gl.COLOR_BUFFER_BIT );
    if (Boolean(filled)) {
        gl.drawArrays( gl.TRIANGLES, 0, points.length );
    } else {
        for (index = 0; index < points.length; index += 3) {
            gl.drawArrays( gl.LINE_LOOP, index, 3 );
        }
    }
    points = [];
    //requestAnimFrame(render);
}

function rotate( x, y, theta )
{
    var a = x * Math.cos( theta ) - y * Math.sin( theta );
    var b = x * Math.sin( theta ) + y * Math.cos( theta );
    return vec2( a, b );
}

function twist( x, y, theta )
{
    var d = Math.sqrt( x*x + y*y );
    return rotate( x, y, d*theta );
}
