/**
 * Vis 1 Task 1 Framework
 * Copyright (C) TU Wien
 *   Institute of Visual Computing and Human-Centered Technology
 *   Research Unit of Computer Graphics
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 *
 * Main script for VisVU exercise. Loads the volume, initializes the scene, and contains the paint function.
 *
 * @author Manuela Waldner
 * @author Laura Luidolt
 * @author Diana Schalko
 */
let renderer, camera, scene, orbitCamera;
let canvasWidth,
  canvasHeight = 0;
let container = null;
let volume = null;
let fileInput = null;
let testShader = null;
let testMesh = null;

/**
 * Load all data and initialize UI here.
 */
function init() {
  // volume viewer
  container = document.getElementById("viewContainer");
  canvasWidth = window.innerWidth * 0.7;
  canvasHeight = window.innerHeight * 0.7;

  // WebGL renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(canvasWidth, canvasHeight);
  container.appendChild(renderer.domElement);

  // read and parse volume file
  fileInput = document.getElementById("upload");
  fileInput.addEventListener("change", readFile);
}

/**
 * Handles the file reader. No need to change anything here.
 */
function readFile() {
  let reader = new FileReader();
  reader.onloadend = function () {
    console.log("data loaded: ");

    let data = new Uint16Array(reader.result);
    volume = new Volume(data);

    resetVis();
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}

/**
 * Construct the THREE.js scene and update histogram when a new volume is loaded by the user.
 *
 * Currently renders the bounding box of the volume.
 */
async function resetVis() {
  // create new empty scene and perspective camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    canvasWidth / canvasHeight,
    0.1,
    1000,
  );

  // dummy shader gets a color as input
  testShader = new TestShader2(
    createVolumeTexture(volume),
    0.1,
    0.1,
    new THREE.Vector3(volume.width, volume.height, volume.depth),
  );

  // dummy scene: we render a box and attach our color test shader as material
  const testCube = new THREE.BoxGeometry(
    volume.width,
    volume.height,
    volume.depth,
  );

  const testMaterial = testShader.material;
  await testShader.load(); // this function needs to be called explicitly, and only works within an async function!
  testMesh = new THREE.Mesh(testCube, testMaterial);
  scene.add(testMesh);

  // our camera orbits around an object centered at (0,0,0)
  orbitCamera = new OrbitCamera(
    camera,
    new THREE.Vector3(0, 0, 0),
    2 * volume.max,
    renderer.domElement,
  );

  // init paint loop
  requestAnimationFrame(paint);
}

function createVolumeTexture(volume) {
  const texture = new THREE.Data3DTexture(
    volume.voxels,
    volume.width,
    volume.height,
    volume.depth,
  );
  texture.minFilter = THREE.LinearFilter;
  texture.maxFilter = THREE.LinearFilter;

  texture.format = THREE.RedFormat;
  texture.type = THREE.FloatType;
  texture.unpackAlignment = 1;

  texture.needsUpdate = true;

  return texture;
}

/**
 * Render the scene and update all necessary shader information.
 */
function paint() {
  if (volume) {
    //NOTE: model matrix and inverse() aren't available in fragment shaders,
    // and we can't calculate them in the vertex shader either because they would get interpolated incorrectly.
    testShader.setUniform(
      "inverseModelMat",
      testMesh.matrixWorld.clone().invert(),
    );

    renderer.render(scene, camera);
  }
}
