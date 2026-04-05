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
    drawHist(volume.voxels);
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


function drawHist(data) {
  d3.select("svg").remove(); // REMOVE IF DOING ANIMATIONS

  const margin = {top: 10, right: 10, bottom: 30, left: 30}
  const width = canvasWidth*0.4
  const height = canvasHeight*0.4

  const svg = d3.select("#tfContainer")
      .append("svg")
      .attr("width", width + margin.right + margin.left)
      .attr("height", height + margin.top + margin.bottom)

  const bins = d3.bin().thresholds(100)(data);

  // scales
  const scaleX = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, width - margin.right]);

  const scaleY = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top]);

  const scaleHeight = d3.scaleLinear([0, d3.max(bins, d => d.length)], [height - margin.bottom, margin.top]) // helper to feed the frequencies

  console.log(bins)

  // histogram itself
  svg.append("g")
      .selectAll()
      .data(bins)
      .join("rect")
        .attr("x", (d) => scaleX(d.x0))
        .attr("y", d => scaleHeight(d.length))
        .attr("width", (d) => scaleX(d.x1) -scaleX(d.x0))
        .attr("height", (d) => scaleHeight(0) - scaleHeight(d.length))
        .attr("fill", "#b00b55")

  // axes
  svg.append("g")
      .attr("transform", `translate(${0}, ${height - margin.bottom})`)
      .call(d3.axisBottom(scaleX))
  svg.append("g")
      .attr("transform", `translate(${margin.left}, ${0})`)
      .call(d3.axisLeft(scaleY))

}
