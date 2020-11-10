/*
 * A somewhat messy example
 */
import { Mesher } from '../src/mesher.js'

// SECTION: THREE.js setup

let [scene, camera, renderer] = (function createScene() {
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

    let renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild(renderer.domElement);

    return [scene, camera, renderer];
})();


function setCamera(camera, controls, sceneDimensions) {
    // Positions the camera twice as far away as a corner of the scene and points
    // towards the middle of it.

    let sd = sceneDimensions;
    camera.position.set(sd[0] * 2, sd[1] * 2, sd[2] * 2);
    camera.lookAt(sd[0] * 0.5, sd[1] * 0.5, sd[2] * 0.5);
}

function setLight(scene, sceneDimensions) {
    let sd = sceneDimensions;
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(sd[0]/4, sd[0], sd[2]/2);
        scene.add(light);
    }

    {
        const light = new THREE.AmbientLight( 0x808080 ); // soft white light
        scene.add( light );
    }
}

function animate(scene, camera, renderer) {
	requestAnimationFrame( () => animate(scene, camera, renderer) );
	renderer.render( scene, camera );
}

// SECTION Mesh generation and adding to the scene

const matMap = {
    1: (dir) => { 
        if (dir == 'ynegative') {
            return new THREE.Color('darkgreen') 
        }
        
        return new THREE.Color(0x8B4513) 
    }
};


function createGeometry(triangles) {
    let geometry = new THREE.Geometry();

    // At first, THREE.js needs to know about all the vertices.
    // So we add the to the geometry, and also store the index THREE will use
    // to reference them
    let vertexMap = {};
    let counter = 0;
    for (let [i, _tri] of triangles.entries()) {
        let tri = _tri.triangle;
        for (let [j, vertex] of tri.entries()) {
            if (!vertexMap.hasOwnProperty(vertex)) {
                vertexMap[vertex] = counter;
                counter++;
                
                geometry.vertices.push(
                    new THREE.Vector3(...vertex)
                );
            }
        }
    }

    // Now we create the actual faces.
    // Iterate over the trianlges generate by the Mesher and lookup the corresponding
    // index in the vertexMap
    for (let [i, _tri] of triangles.entries()) {
        let tri = _tri.triangle;
        geometry.faces.push(
            new THREE.Face3(vertexMap[tri[0]], vertexMap[tri[1]], vertexMap[tri[2]])
        );
        // adding some color
        geometry.faces[i].color = matMap[_tri.type](_tri.direction);
    }

    for (let i = 0; i < triangles.length / 2; i++) {
        let tri = triangles[2*i];
        let width = tri.width;
        let height = tri.height;
        geometry.faceVertexUvs[0].push(
            [ new THREE.Vector2(0, 0), new THREE.Vector2(width, height), new THREE.Vector2(0, height) ],
            [ new THREE.Vector2(0, 0), new THREE.Vector2(width, 0), new THREE.Vector2(width, height) ],
        )
    }

    geometry.computeFaceNormals();

    // Adding some textures
    let loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    let texture = loader.load('black_border.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Putting it together
    let material = new THREE.MeshPhongMaterial({vertexColors: THREE.FaceColors, map: texture});
    let cube = new THREE.Mesh( geometry, material );

    return cube
}

function addToScene(scene, offset, func) {
    let MESHER = new Mesher();

    let voxels = func();
    let quads = MESHER.mesh(voxels, offset);
    let triangles = MESHER.splitQuads(quads);
    let cube = createGeometry(triangles)

    console.log(`${quads.length} cubes and ${triangles.length} triangles`);

    scene.add(cube);
}

// SECTION: Creating some voxels

function createRandomVoxel(x, y, z) {
    let voxels = new Array(x);
    for (let i = 0; i < x; i++) {
        voxels[i] = new Array(y);
        for (let j = 0; j < y; j++) {
            voxels[i][j] = new Array(z);
            for (let k = 0; k < z; k++) {
                voxels[i][j][k] = Math.random() > 0.5 ? 1 : 0;
            }
        }
    }

    return voxels
}

// SECTION: Giving things a go

let size = 8;
let sceneDimensions = [size, size, size];

addToScene(scene, [0, 0, 0], () => createRandomVoxel(size, size, size));

setCamera(camera, null, sceneDimensions);
setLight(scene, sceneDimensions);
animate(scene, camera, renderer);
