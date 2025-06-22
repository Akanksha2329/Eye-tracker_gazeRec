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
  downloadAnalysis();
}

// Plot distance and velocity as a graph
function plotSaccadeGraph() {
  const canvas = document.getElementById("saccade-graph");
  const ctx = canvas.getContext("2d");

  canvas.style.display = "block";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "14px sans-serif";
  ctx.fillText("Saccadic Distance (blue) & Velocity (red)", 10, 20);

  const distances = analysisResults.saccades.map(s => s.distance);
  const velocities = analysisResults.saccades.map(s => s.velocity);

  const maxD = Math.max(...distances);
  const maxV = Math.max(...velocities);

  for (let i = 0; i < distances.length; i++) {
    const x = 30 + i * 10;
    const distH = (distances[i] / maxD) * 100;
    const velH = (velocities[i] / maxV) * 100;

    ctx.fillStyle = "blue";
    ctx.fillRect(x, 280 - distH, 4, distH);

    ctx.fillStyle = "red";
    ctx.fillRect(x + 4, 280 - velH, 4, velH);
  }
}


// Download graph and data
function downloadAnalysis() {
  const canvas = document.getElementById("saccade-graph");
  html2canvas(canvas).then(graphCanvas => {
    // Save image
    const imageLink = document.createElement("a");
    imageLink.download = `saccade_graph_${Date.now()}.png`;
    imageLink.href = graphCanvas.toDataURL();
    imageLink.click();

    // Save data
    const data = {
      fixations: analysisResults.fixations,
      saccades: analysisResults.saccades
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const dataLink = document.createElement("a");
    dataLink.download = `gaze_analysis_${Date.now()}.json`;
    dataLink.href = URL.createObjectURL(blob);
    dataLink.click();
  });
}