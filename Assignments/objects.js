"use strict";

var canvas, gl, program;

// Model-View and Projection matrices
var mvMatrix = mat4();
var pMatrix = mat4();
var mvMatrixStack = [];

// default parameters
var rotX = 0, rotY = 0, rotZ = 0;
var transX = 0.0, transY = 0.0, transZ = -5.0;
var scaleX = 1.0, scaleY = 1.0, scaleZ = 1.0;

var cylinderBuffer, cylinderIndexBuffer;
var coneBuffer;
var sphereBuffer, sphereIndexBuffer;

var objects = [];
var current_object;

// Generate n-gon
function createNgon(n, startAngle, r1){ // r1 is radius of circle for ngon , optional argument
    var vertices = [], dA = Math.PI*2 / n, angle, r = 0.9; // so that it will stay inside canvas
    if (arguments.length === 3) {
        r = r1;
    }
    for (var i=0; i < n; i++) {
        angle = startAngle + dA*i;
        vertices.push([r*Math.cos(angle), r*Math.sin(angle)]);
    }
    return vertices;
}

function initGL(canvas) {
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
}

function init_shaders() {
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    program.vertexPositionAttribute = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);

    // Projection and Model-View matrices
    program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
    program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
    program.colorUniform = gl.getUniformLocation(program, "uColor");
}

function init_cylinder() {
    // Set up cylinder
    cylinderBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer);
    var n=30;
    var circle = createNgon(n, 0, 1.0);
    var vertices = [ [0, -1, 0] ];
    for (var i = 0; i < circle.length; i++) {
        vertices.push([circle[i][0], -1, circle[i][1]]);
    }
    vertices.push([circle[0][0], -1, circle[0][1]]);
    vertices.push([0, 1, 0]);
    for (var i = 0; i < circle.length; i++) {
        vertices.push([circle[i][0], 1, circle[i][1]]);
    }
    vertices.push([circle[0][0], 1, circle[0][1]]);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    cylinderBuffer.n = n;
    cylinderBuffer.itemSize = vertices[0].length;
    cylinderBuffer.numItems = vertices.length;

    var indices = [];
    for (var i = 0; i < circle.length; i++) {
        indices.push([ i+1, i+2, i+n+2+1 ]);
        indices.push([ i+2, i+n+2+1, i+n+2+2 ]);
    }
    indices = flatten(indices);
    cylinderIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    cylinderIndexBuffer.itemSize = 1;
    cylinderIndexBuffer.numItems = indices.length;
}

function init_cone() {
    // Set up cone
    coneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer);
    var n=30;
    var circle = createNgon(n, 0, 1.0);

    // set up the first fan
    var vertices = [ [0, -1, 0] ];
    for (var i = 0; i < circle.length; i++) {
        vertices.push([circle[i][0], -1, circle[i][1]]);
    }
    vertices.push([circle[0][0], -1, circle[0][1]]);

    // set up the second fan
    vertices.push([0, 1, 0]);
    for (var i = 0; i < circle.length; i++) {
        vertices.push([circle[i][0], -1, circle[i][1]]);
    }
    vertices.push([circle[0][0], -1, circle[0][1]]);

    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    coneBuffer.itemSize = 3;
    coneBuffer.numItems = vertices.length/2;

}

function init_sphere() {
    var n = 30;

    var vertices = [];
    for (var i=0; i <= n; i++) {
        var theta = i * Math.PI / n,
            sinTheta = Math.sin(theta),
            cosTheta = Math.cos(theta);

        for (var j=0; j <= n; j++) {
            var phi = j * 2 * Math.PI / n,
                sinPhi = Math.sin(phi),
                cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (j / n);
            var v = 1 - (i / n);

            vertices.push([x, y, z]);
        }
    }
    vertices = flatten(vertices);

    var indices = [];
    for (var i=0; i < n; i++) {
        for (var j=0; j < n; j++) {
            var first = (i * (n + 1)) + j,
                second = first + n + 1;
            indices.push([first, second, first + 1]);
            indices.push([second, second + 1, first + 1]);
        }
    }
    indices = flatten(indices);

    sphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    sphereBuffer.itemSize = 3;
    sphereBuffer.numItems = vertices.length / 3;

    sphereIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    sphereIndexBuffer.itemSize = 1;
    sphereIndexBuffer.numItems = indices.length;
}

function initBuffers() {
    init_cylinder();
    init_cone();
    init_sphere();
}

function update_rotation(event) {
    if (current_object !== undefined) {
        objects[current_object][1][0] = parseFloat(document.getElementById("rotx").value);
        objects[current_object][1][1] = parseFloat(document.getElementById("roty").value);
        objects[current_object][1][2] = parseFloat(document.getElementById("rotz").value);
        render();
    }
}

function update_translation(event) {
    if (current_object !== undefined) {
        objects[current_object][2][0] = parseFloat(document.getElementById("transx").value);
        objects[current_object][2][1] = parseFloat(document.getElementById("transy").value);
        objects[current_object][2][2] = parseFloat(document.getElementById("transz").value);
        render();
    }
}

function update_scaling(event) {
    if (current_object !== undefined) {
        objects[current_object][3][0] = parseFloat(document.getElementById("scalex").value);
        objects[current_object][3][1] = parseFloat(document.getElementById("scaley").value);
        objects[current_object][3][2] = parseFloat(document.getElementById("scalez").value);
        render();
    }
}

function add_object(event) {
    var objtype = document.getElementById("object").value;

    objects.push([objtype, [rotX, rotY, rotZ], [transX, transY, transZ], [scaleX, scaleY, scaleZ]]);
    current_object = objects.length - 1;
    document.getElementById("selected").value = current_object;
    document.getElementById("selobjtype").value = objects[current_object][0];
    update_sliders(objects[current_object][1], objects[current_object][2], objects[current_object][3]);

    render();
}

function del_object(event) {
    if (current_object !== undefined) {
        objects.splice(current_object, 1);
        if (current_object > objects.length -1) { current_object = objects.length - 1; }
        if (objects.length === 0) { current_object = undefined; }
        document.getElementById("selected").value = current_object;
        document.getElementById("selobjtype").value = objects[current_object][0];
        update_sliders(objects[current_object][1], objects[current_object][2], objects[current_object][3]);
        render();
    }
}

function sel_prev(event) {
    if (current_object !== undefined) {
        current_object--;
        if (current_object < 0) { current_object = objects.length - 1; }
        document.getElementById("selected").value = current_object;
        document.getElementById("selobjtype").value = objects[current_object][0];
        update_sliders(objects[current_object][1], objects[current_object][2], objects[current_object][3]);
        render();
    }
}

function sel_next(event) {
    if (current_object !== undefined) {
        current_object++;
        if (current_object > objects.length - 1) { current_object = 0; }
        document.getElementById("selected").value = current_object;
        document.getElementById("selobjtype").value = objects[current_object][0];
        update_sliders(objects[current_object][1], objects[current_object][2], objects[current_object][3]);
        render();
    }
}

function update_sliders(rot, trans, scale) {
    document.getElementById("rotx").value = rot[0];
    document.getElementById("roty").value = rot[1];
    document.getElementById("rotz").value = rot[2];
    document.getElementById("transx").value = trans[0];
    document.getElementById("transy").value = trans[1];
    document.getElementById("transz").value = trans[2];
    document.getElementById("scalex").value = scale[0];
    document.getElementById("scaley").value = scale[1];
    document.getElementById("scalez").value = scale[2];
}

function initInput() {
    update_sliders([rotX, rotY, rotZ], [transX, transY, transZ], [scaleX, scaleY, scaleZ]);
    document.getElementById("rotx").onchange = update_rotation;
    document.getElementById("roty").onchange = update_rotation;
    document.getElementById("rotz").onchange = update_rotation;
    document.getElementById("rotx").oninput = update_rotation;
    document.getElementById("roty").oninput = update_rotation;
    document.getElementById("rotz").oninput = update_rotation;
    document.getElementById("transx").onchange = update_translation;
    document.getElementById("transy").onchange = update_translation;
    document.getElementById("transz").onchange = update_translation;
    document.getElementById("transx").oninput = update_translation;
    document.getElementById("transy").oninput = update_translation;
    document.getElementById("transz").oninput = update_translation;
    document.getElementById("scalex").onchange = update_scaling;
    document.getElementById("scaley").onchange = update_scaling;
    document.getElementById("scalez").onchange = update_scaling;
    document.getElementById("scalex").oninput = update_scaling;
    document.getElementById("scaley").oninput = update_scaling;
    document.getElementById("scalez").oninput = update_scaling;
    document.getElementById("addobject").onclick = add_object;
    document.getElementById("delobject").onclick = del_object;
    document.getElementById("selprev").onclick = sel_prev;
    document.getElementById("selnext").onclick = sel_next;
}

function render() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    pMatrix = perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    for (var i = 0; i < objects.length; i++) {
        var rotation = objects[i][1];
        var translation = objects[i][2];
        var scaling = objects[i][3];
        var selected = i === current_object;
        if (objects[i][0] == "cone") {
            drawCone(rotation, translation, scaling, selected);
        } else if (objects[i][0] == "cylinder") {
            drawCylinder(rotation, translation, scaling, selected);
        } else if (objects[i][0] == "sphere") {
            drawSphere(rotation, translation, scaling, selected);
        }
    }
}

function drawCylinder(rot, trans, scale, selected) {
    mvMatrix = mat4();
    mvMatrix = mult(mvMatrix, translate(trans[0], trans[1], trans[2]));
    mvMatrix = mult(mvMatrix, rotate(rot[0], [1, 0, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[1], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[2], [0, 0, 1]));
    mvMatrix = mult(mvMatrix, scalem(scale[0], scale[1], scale[2]));

    gl.uniform3f(program.colorUniform, 1, 0, 0);
    gl.uniformMatrix4fv(program.pMatrixUniform, false, flatten(pMatrix));
    gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mvMatrix));

    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, cylinderBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, cylinderBuffer.n+2);
    if (selected === true)
        gl.uniform3f(program.colorUniform, 1, 0, 0);
    else
        gl.uniform3f(program.colorUniform, 0, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 1, cylinderBuffer.n+2-1);

    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderIndexBuffer);
    gl.drawElements(gl.TRIANGLES, cylinderIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    if (selected === true)
        gl.uniform3f(program.colorUniform, 1, 0, 0);
    else
        gl.uniform3f(program.colorUniform, 0, 0, 0);
    gl.drawElements(gl.LINE_STRIP, cylinderIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, cylinderBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, cylinderBuffer.n+2, cylinderBuffer.n+2);
    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.drawArrays(gl.LINE_STRIP, cylinderBuffer.n+2, cylinderBuffer.n+2);
}

function drawCone(rot, trans, scale, selected) {
    mvMatrix = mat4();
    mvMatrix = mult(mvMatrix, translate(trans[0], trans[1], trans[2]));
    mvMatrix = mult(mvMatrix, rotate(rot[0], [1, 0, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[1], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[2], [0, 0, 1]));
    mvMatrix = mult(mvMatrix, scalem(scale[0], scale[1], scale[2]));

    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.uniformMatrix4fv(program.pMatrixUniform, false, flatten(pMatrix));
    gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mvMatrix));

    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, coneBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, coneBuffer.numItems);
    if (selected === true)
        gl.uniform3f(program.colorUniform, 1, 0, 0);
    else
        gl.uniform3f(program.colorUniform, 0, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, coneBuffer.numItems);

    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.drawArrays(gl.TRIANGLE_FAN, coneBuffer.numItems, coneBuffer.numItems);
    if (selected === true)
        gl.uniform3f(program.colorUniform, 1, 0, 0);
    else
        gl.uniform3f(program.colorUniform, 0, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, 2*coneBuffer.numItems);
}

function drawSphere(rot, trans, scale, selected) {
    mvMatrix = mat4();
    mvMatrix = mult(mvMatrix, translate(trans[0], trans[1], trans[2]));
    mvMatrix = mult(mvMatrix, rotate(rot[0], [1, 0, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[1], [0, 1, 0]));
    mvMatrix = mult(mvMatrix, rotate(rot[2], [0, 0, 1]));
    mvMatrix = mult(mvMatrix, scalem(scale[0], scale[1], scale[2]));

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, sphereBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);

    gl.uniformMatrix4fv(program.pMatrixUniform, false, flatten(pMatrix));
    gl.uniformMatrix4fv(program.mvMatrixUniform, false, flatten(mvMatrix));

    gl.uniform3f(program.colorUniform, 1, 1, 1);
    gl.drawElements(gl.TRIANGLES, sphereIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    if (selected === true)
        gl.uniform3f(program.colorUniform, 1, 0, 0);
    else
        gl.uniform3f(program.colorUniform, 0, 0, 0);
    gl.drawElements(gl.LINE_STRIP, sphereIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    initGL(canvas);
    init_shaders();
    initBuffers();
    initInput();

    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );
    gl.enable(gl.DEPTH_TEST);

    render();
}
