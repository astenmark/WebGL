

var canvas;
var gl;
var program;

var texSize = 64;

// Create a checkerboard pattern using floats
var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++) 
        for ( var j = 0; j < texSize; j++) 
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [1, c, c, 1];
    }

// Convert floats to ubytes for texture
var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ ) 
        for ( var j = 0; j < texSize; j++ ) 
           for(var k =0; k<4; k++) 
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];

var mvMatrix = mat4();
var projMatrix = mat4();
var rotationMatrix = mat4();

var sphereTexture;
var sphereVertexPositionBuffer;
var sphereVertexNormalBuffer;
var sphereVertexTextureCoordBuffer;
var sphereVertexIndexBuffer;

// light
var ambient = [ 0.3, 0.3, 0.3 ];
var directional = [ 0.8, 0.8, 0.8 ];

// set up a checkered board texture
function configureTexture(image) {
    texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    sphereTexture = texture;
}

function handleTexture(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

// set up a texture loaded from file
function initTexture(filename) {
    sphereTexture = gl.createTexture();
    sphereTexture.image = new Image();
    sphereTexture.image.onload = function() { handleTexture(sphereTexture); }
    sphereTexture.image.src = filename;
    //handleTexture(sphereTexture);
}

// Init sphere buffers
function initBuffers() {
    var latitudeBands=40, longitudeBands=40, radius=2;

    var vertexPositionData=[], normalData=[], textureCoordData=[];

    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta, y = cosTheta, z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalData), gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = normalData.length / 3;

    sphereVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoordData), gl.STATIC_DRAW);
    sphereVertexTextureCoordBuffer.itemSize = 2;
    sphereVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexPositionData), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    sphereVertexIndexBuffer.itemSize = 1;
    sphereVertexIndexBuffer.numItems = indexData.length;
}


function update_texture(event) {
    var texsel = document.getElementById("texture").value;
    console.log(texsel);
    if (texsel == "checkered") {
        configureTexture(image2);
    } else if (texsel == "earth") {
        initTexture("earth.jpg");
    } else if (texsel == "mars") {
        initTexture("mars.jpg");
    }
    render();
}

function update_rotation(event) {
    var xrot = parseFloat(document.getElementById("rotx").value);
    var yrot = parseFloat(document.getElementById("roty").value);
    var zrot = parseFloat(document.getElementById("rotz").value);
    rotationMatrix = mat4();
    rotationMatrix = mult(rotationMatrix, rotate(xrot, [1, 0, 0]));
    rotationMatrix = mult(rotationMatrix, rotate(yrot, [0, 1, 0]));
    rotationMatrix = mult(rotationMatrix, rotate(zrot, [0, 0, 1]));
    render();
}


var render = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // projection
    projMatrix = perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    // lighting
    gl.uniform3f(program.ambientColor, ambient[0], ambient[1], ambient[2]);
    var lightingDirection = vec3(-1.0, -1.0, -1.0);
    var adjustedLD = normalize(lightingDirection);
    adjustedLD = scale(-1, adjustedLD);
    gl.uniform3fv(program.lightingDirection, adjustedLD);

    gl.uniform3f(program.directionalColor, directional[0], directional[1], directional[2] );

    // move and rotate
    mvMatrix = translate(0, 0, -7);
    mvMatrix = mult(mvMatrix, rotationMatrix);

    // prepare buffers and attribs
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sphereTexture);
    gl.uniform1i(program.textureLoc, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexTextureCoordBuffer);
    gl.vertexAttribPointer(program.textureCoordAttribute, sphereVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.vertexAttribPointer(program.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);

    // set up matrices
    gl.uniformMatrix4fv(program.projectionMatrixLoc, false, flatten(projMatrix));
    gl.uniformMatrix4fv(program.modelViewMatrixLoc, false, flatten(mvMatrix));

    var nMatrix = normalMatrix(mvMatrix, true);
    gl.uniformMatrix3fv(program.normalMatrixLoc, false, flatten(nMatrix));

    // draw
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.1, 0.1, 0.1, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    program.vertexPositionAttribute = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);

    program.textureCoordAttribute = gl.getAttribLocation(program, "vTexCoord");
    gl.enableVertexAttribArray(program.textureCoordAttribute);

    program.vertexNormalAttribute = gl.getAttribLocation(program, "vNormal");
    gl.enableVertexAttribArray(program.vertexNormalAttribute);

    program.projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    program.modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    program.normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    program.textureLoc = gl.getUniformLocation(program, "texture");
    program.ambientColor = gl.getUniformLocation(program, "ambientColor");
    program.lightingDirection = gl.getUniformLocation(program, "vLightDir");
    program.directionalColor = gl.getUniformLocation(program, "vDirColor");

    // Init buffers
    initBuffers();

    // Set up event handlers
    document.getElementById("rotx").onchange = update_rotation;
    document.getElementById("roty").onchange = update_rotation;
    document.getElementById("rotz").onchange = update_rotation;
    document.getElementById("rotx").oninput = update_rotation;
    document.getElementById("roty").oninput = update_rotation;
    document.getElementById("rotz").oninput = update_rotation;
    document.getElementById("texture").onchange = update_texture;

    // Init texture
    configureTexture(image2);  // start with checkered texture

    // Render
    render();
}
