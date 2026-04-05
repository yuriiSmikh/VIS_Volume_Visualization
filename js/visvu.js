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

let isoValues = [0.25, 0.3, 0.1];
let isoColors = ["#ff0000", "#00ff00", "#0000ff"];

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

  // dummy shader gets a color as input, but this ain't no dum-dum
  testShader = new TestShader2(
    createVolumeTexture(volume),
    new THREE.Vector3(volume.width, volume.height, volume.depth)
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
    // NOTE: model matrix and inverse() aren't available in fragment shaders,
    //       and we can't calculate them in the vertex shader either because they would get interpolated incorrectly.
    testShader.setUniform(
      "inverseModelMat",
      testMesh.matrixWorld.clone().invert(),
    );

    testShader.setUniform("isoValues", isoValues);
    testShader.setUniform( "isoColors",
      isoColors.map((c) => new THREE.Color(c)),
    );
    testShader.setUniform("isoCount", isoValues.length);

    renderer.render(scene, camera);
  }
}

function drawHist(data) {
  d3.select("svg").remove(); // REMOVE IF DOING ANIMATIONS

  const margin = { top: 10, right: 10, bottom: 30, left: 30 };
  const width = canvasWidth * 0.4;
  const height = canvasHeight * 0.4;

  const svg = d3
    .select("#tfContainer")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);

  const bins = d3.bin().thresholds(100)(data);

  const scaleX = d3
    .scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right])
    .clamp(true);

  const scaleY = d3
    .scaleLinear()
    .domain([0, 1])
    .range([height - margin.bottom, margin.top]);

  const scaleHeight = d3.scaleLinear(
    [0, d3.max(bins, (d) => d.length)],
    [height - margin.bottom, margin.top],
  );

  // histogram
  svg
    .append("g")
    .selectAll()
    .data(bins)
    .join("rect")
    .attr("x", (d) => scaleX(d.x0))
    .attr("y", (d) => scaleHeight(d.length))
    .attr("width", (d) => scaleX(d.x1) - scaleX(d.x0))
    .attr("height", (d) => scaleHeight(0) - scaleHeight(d.length))
    .attr("fill", "#b00b55");

  // axes
  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(scaleX));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(scaleY));

  // --- CONTROL POINTS ---

  const points = isoValues.map((v) => ({
    x: scaleX(v ?? 0),
    y: height - margin.bottom,
  }));

  const dots = svg
    .append("g")
    .selectAll("circle")
    .data(points)
    .enter()
    .append("circle")
    .attr("r", 8)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("fill", "#fff")
    .attr("stroke", "#333")
    .style("cursor", "pointer");

  // Overlay for interaction
  const overlay = svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .style("fill", "transparent")
    .style("cursor", "crosshair");

  function dragHandler(event, d) {
    const x = Math.max(margin.left, Math.min(width - margin.right, event.x));
    const y = Math.max(margin.top, Math.min(height - margin.bottom, event.y));

    d.x = x;
    d.y = y;

    d3.select(this).attr("cx", x).attr("cy", y);

    const iso = Math.max(0.0, Math.min(1.0, scaleX.invert(x)));
    const index = dots.data().indexOf(d);

    updateIso(index, iso);
  }

  dots.call(d3.drag().on("start drag", dragHandler));
  // Finding the closest point to drag
  overlay.call(
    d3.drag().on("start drag", (event) => {
      const x = Math.max(margin.left, Math.min(width - margin.right, event.x));
      const y = Math.max(margin.top, Math.min(height - margin.bottom, event.y));

      let closest = points[0];
      let minDist = Math.abs(points[0].x - x) + Math.abs(points[0].y - y);

      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(points[i].x - x) + Math.abs(points[i].y - y);
        if (dist < minDist) {
          minDist = dist;
          closest = points[i];
        }
      }

      closest.x = x;
      closest.y = y;

      dots
        .filter((d) => d === closest)
        .attr("cx", x)
        .attr("cy", y);

      const iso = Math.max(0.0, Math.min(1.0, scaleX.invert(x)));
      const index = points.indexOf(closest);

      updateIso(index, iso);
    }),
  );

  // --- CONTROL LIST UI ---

  // remove old UI if re-drawing
  d3.select("#tfContainer").selectAll(".iso-controls").remove();

  const controlDiv = d3
    .select("#tfContainer")
    .append("div")
    .attr("class", "iso-controls")
    .style("margin-top", "10px");

  // one row per point
  const items = controlDiv
    .selectAll("div")
    .data(points)
    .enter()
    .append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("margin-bottom", "6px");

  // label
  items
    .append("span")
    .text((d, i) => `Iso ${i}`)
    .style("width", "50px");

  // value label
  const valueLabels = items
    .append("span")
    .text((d, i) => isoValues[i].toFixed(2))
    .style("width", "50px");

  // color picker
  items
    .append("input")
    .attr("type", "color")
    .attr("value", (d, i) => isoColors[i])
    .on("input", function (event, d) {
      const index = dots.data().indexOf(d);
      updateColor(index, event.target.value);

      // update dot color immediately
      dots.filter((p) => p === d).attr("fill", isoColors[index]);
    });

  const buttons = controlDiv
    .append("div")
    .style("margin-top", "10px")
    .style("display", "flex")
    .style("gap", "10px");

  // ADD button
  buttons
    .append("button")
    .text("Add")
    .on("click", () => {
      if (isoValues.length >= 8) return;

      isoValues.push(0.5); // default position
      isoColors.push("#ffffff"); // default color
      drawHist(volume.voxels);
    });

  // REMOVE button
  buttons
    .append("button")
    .text("Remove")
    .on("click", () => {
      if (isoValues.length <= 1) return; // keep at least 1

      isoValues.pop();
      isoColors.pop();
      drawHist(volume.voxels);
    });
}

function updateIso(index, value) {
  isoValues[index] = value;
  requestAnimationFrame(paint); // requesting repaint because some iso-value changed
}

function updateColor(index, color) {
  isoColors[index] = color;
  requestAnimationFrame(paint); // requesting repaint because some color changed
}
