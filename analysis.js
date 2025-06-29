// Analysis data
let analysisResults = {
  fixations: [],
  saccades: []
};

// Calculate distance between two points
function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Analyze gaze data for fixations and saccades
function analyzeGazeData() {
  if (gazePoints.length < 2) {
    alert("Not enough gaze data to analyze.");
    return;
  }

  const fixationThreshold = 50;
  const fixationDuration = 200;
  const frameTime = 33;
  let currentFix = [gazePoints[0]];

  analysisResults = { fixations: [], saccades: [] };

  for (let i = 1; i < gazePoints.length; i++) {
    const dist = getDistance(gazePoints[i], gazePoints[i - 1]);

    if (dist < fixationThreshold) {
      currentFix.push(gazePoints[i]);
    } else {
      if (currentFix.length * frameTime >= fixationDuration) {
        const avgX = currentFix.reduce((sum, p) => sum + p.x, 0) / currentFix.length;
        const avgY = currentFix.reduce((sum, p) => sum + p.y, 0) / currentFix.length;
        analysisResults.fixations.push({ x: avgX, y: avgY, duration: currentFix.length * frameTime });
      }
      const timeDiff = frameTime * (i - 1);
      analysisResults.saccades.push({
        from: gazePoints[i - 1],
        to: gazePoints[i],
        distance: dist,
        velocity: dist / (timeDiff / 1000)
      });
      currentFix = [gazePoints[i]];
    }
  }

  plotSaccadeGraph();

  // Show the fixation image and canvas
  document.getElementById("bg-image-fixation").src = document.getElementById("bg-image").src;
  document.getElementById("bg-image-fixation").style.display = "block";
  document.getElementById("fixation-sequence-canvas").style.display = "block";

  drawFixationSequence();
  downloadAnalysis();
}

function drawFixationSequence() {
  const bg = document.getElementById("bg-image");
  const bgFixation = document.getElementById("bg-image-fixation");
  bgFixation.src = bg.src;
  bgFixation.style.display = "block";

  const canvas = document.getElementById("fixation-sequence-canvas");
  const ctx = canvas.getContext("2d");

  // ✅ Proper canvas resolution
  canvas.width = bg.clientWidth;
  canvas.height = bg.clientHeight;


  // ✅ Resize canvas visually to match display size
  canvas.style.width = bg.clientWidth + "px";
  canvas.style.height = bg.clientHeight + "px";

  canvas.style.display = "block";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dynamic sizes based on screen
  const screenFactor = Math.min(canvas.width, canvas.height) / 1000;
  const circleRadius = 15 * screenFactor;
  const arrowLength = 10 * screenFactor;
  const fontSize = 14 * screenFactor;

  ctx.lineWidth = 2;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fixations = analysisResults.fixations;

  for (let i = 0; i < fixations.length; i++) {
    const f = fixations[i];

  // Fixed 
  const fx = f.x;
  const fy = f.y;

  const next = fixations[i + 1];
  const nx = next?.x;
  const ny = next?.y;

  ctx.beginPath();
  ctx.arc(fx, fy, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "yellow";
  ctx.fill();
  ctx.stroke();
 
  ctx.fillStyle = "black";
  ctx.fillText(i + 1, fx, fy);

  if (i < fixations.length - 1) {
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    const angle = Math.atan2(ny - fy, nx - fx);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx - arrowLength * Math.cos(angle - 0.3), ny - arrowLength * Math.sin(angle - 0.3));
    ctx.lineTo(nx - arrowLength * Math.cos(angle + 0.3), ny - arrowLength * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();
  }
 }
}

// Plot distance and velocity as a graph
function plotSaccadeGraph() {
  const canvas = document.getElementById("saccade-graph");
  const ctx = canvas.getContext("2d");

  const bg = document.getElementById("bg-image");
  canvas.width = bg.clientWidth;
  canvas.height = bg.clientHeight;



  const screenFactor = canvas.width / 1000;
  const barWidth = 6 * screenFactor;
  const spacing = 10 * screenFactor;

  canvas.style.display = "block";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${14 * screenFactor}px sans-serif`;
  ctx.fillText("Saccadic Distance (blue) & Velocity (red)", 10, 20);



  const distances = analysisResults.saccades.map(s => s.distance);
  const velocities = analysisResults.saccades.map(s => s.velocity);

  const maxD = Math.max(...distances);
  const maxV = Math.max(...velocities);

  for (let i = 0; i < distances.length; i++) {
    const x = 30 + i * spacing;
    const distH = (distances[i] / maxD) * 100;
    const velH = (velocities[i] / maxV) * 100;

    ctx.fillStyle = "blue";
    ctx.fillRect(x, 280 - distH, barWidth, distH);

    ctx.fillStyle = "red";
    ctx.fillRect(x + barWidth, 280 - velH, barWidth, velH);
  }
}


// Download graph and data
function downloadAnalysis() {
  const graphCanvas = document.getElementById("saccade-graph");
  const fixationCanvas = document.getElementById("fixation-sequence-canvas");

  // Download graph image
  html2canvas(graphCanvas).then(gSnap => {
    const graphLink = document.createElement("a");
    graphLink.download = `saccade_graph_${Date.now()}.png`;
    graphLink.href = gSnap.toDataURL();
    graphLink.click();
  });

  // Download fixation sequence image (with background image)
  const fixationWrapper = document.getElementById("fixation-visual");
  html2canvas(fixationWrapper).then(fSnap => {
  const fixLink = document.createElement("a");
  fixLink.download = `fixation_sequence_${Date.now()}.png`;
  fixLink.href = fSnap.toDataURL();
  fixLink.click();
  document.getElementById("fixation-sequence-canvas").style.display = "none";
  document.getElementById("bg-image-fixation").style.display = "none";
  });

  // Prepare Excel data
  const fixationSheet = analysisResults.fixations.map((f, index) => ({
    Index: index + 1,
    X: f.x,
    Y: f.y,
    Duration_ms: f.duration
  }));

  const saccadeSheet = analysisResults.saccades.map((s, index) => ({
    Index: index + 1,
    From_X: s.from.x,
    From_Y: s.from.y,
    To_X: s.to.x,
    To_Y: s.to.y,
    Distance: s.distance,
    Velocity: s.velocity
  }));

  const wb = XLSX.utils.book_new();
  const wsFix = XLSX.utils.json_to_sheet(fixationSheet);
  const wsSac = XLSX.utils.json_to_sheet(saccadeSheet);
  XLSX.utils.book_append_sheet(wb, wsFix, "Fixations");
  XLSX.utils.book_append_sheet(wb, wsSac, "Saccades");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });

  const excelLink = document.createElement("a");
  excelLink.download = `gaze_analysis_${Date.now()}.xlsx`;
  excelLink.href = URL.createObjectURL(blob);
  excelLink.click();
}

//
function analyzeAndReset() {
  if (gazePoints.length < 2) {
    alert("Not enough gaze data to analyze.");
    return;
  }

  analyzeGazeOnly(() => {
    // After analysis and Excel/graph download is done

    const container = document.getElementById('heatmap-container');
    const ui = document.getElementById('ui-elements');
    ui.style.display = 'none';

    const calCanvas = document.getElementById("CalCanvasId");
    const webcamVideo = document.getElementById("showvideoid");
    if (calCanvas) calCanvas.style.visibility = "hidden";
    if (webcamVideo) webcamVideo.style.visibility = "hidden";

    
    // Take heatmap screenshot
    const heatmapVisual = document.getElementById('heatmap-visual');
    html2canvas(heatmapVisual).then(heatmapCanvas => {
      if (calCanvas) calCanvas.style.visibility = "visible";
      if (webcamVideo) webcamVideo.style.visibility = "visible";

      ui.style.display = 'block';

      // Download heatmap image
      const link = document.createElement('a');
      link.download = `heatmap_screenshot_${Date.now()}.png`;
      link.href = heatmapCanvas.toDataURL();
      link.click();

      document.getElementById("saccade-graph").style.display = "none";
      document.getElementById("fixation-sequence-canvas").style.display = "none";

      // Reset everything
      if (heatmapInstance) {
        gazePoints = [];
        heatmapInstance.setData({ max: 10, data: [] });
      }

      trackingActive = false;

      document.getElementById("start-btn").style.display = "inline-block";
      document.getElementById("main-title").style.display = "block";
      document.getElementById("analyzeClearBtn").style.display = "none";
      document.getElementById("stop-btn").style.display = "none";
      document.getElementById("upload-btn").style.display = "none";

     // ✅ Reset background image
      const bgImage = document.getElementById("bg-image");
      bgImage.src = "";
      bgImage.removeAttribute("src");
      bgImage.style.display = "none";
      imageUploaded = false;

      setTimeout(() => {
         alert("✅ Analysis complete!\nAll files have been downloaded, and the app has been reset.");
      }, 100);


      console.log("Everything done. UI reset.");
    });
  });
}

function analyzeGazeOnly(callback) {
  const fixationThreshold = 50;
  const fixationDuration = 200;
  const frameTime = 33;
  let currentFix = [gazePoints[0]];

  analysisResults = { fixations: [], saccades: [] };

  for (let i = 1; i < gazePoints.length; i++) {
    const dist = getDistance(gazePoints[i], gazePoints[i - 1]);

    if (dist < fixationThreshold) {
      currentFix.push(gazePoints[i]);
    } else {
      if (currentFix.length * frameTime >= fixationDuration) {
        const avgX = currentFix.reduce((sum, p) => sum + p.x, 0) / currentFix.length;
        const avgY = currentFix.reduce((sum, p) => sum + p.y, 0) / currentFix.length;
        analysisResults.fixations.push({ x: avgX, y: avgY, duration: currentFix.length * frameTime });
      }
      const timeDiff = frameTime * (i - 1);
      analysisResults.saccades.push({
        from: gazePoints[i - 1],
        to: gazePoints[i],
        distance: dist,
        velocity: dist / (timeDiff / 1000)
      });
      currentFix = [gazePoints[i]];
    }
  }

  plotSaccadeGraph();

  // Show the fixation image and canvas
  document.getElementById("bg-image-fixation").src = document.getElementById("bg-image").src;
  document.getElementById("bg-image-fixation").style.display = "block";
  document.getElementById("fixation-sequence-canvas").style.display = "block";

  drawFixationSequence();
  downloadAnalysis(); // saves Excel + saccade graph

  if (callback) callback(); // calls the heatmap part after this
}