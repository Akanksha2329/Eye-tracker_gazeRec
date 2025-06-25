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
function downloadAnalysisFiles() {
  const canvas = document.getElementById("saccade-graph");
  html2canvas(canvas).then(graphCanvas => {
    // Save image
    const imageLink = document.createElement("a");
    imageLink.download = `saccade_graph_${Date.now()}.png`;
    imageLink.href = graphCanvas.toDataURL();
    imageLink.click();

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

    // Create and download the Excel file
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    const excelLink = document.createElement("a");
    excelLink.download = `gaze_analysis_${Date.now()}.xlsx`;
    excelLink.href = URL.createObjectURL(blob);
    excelLink.click();
  });
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

    // Take heatmap screenshot
    html2canvas(container).then(heatmapCanvas => {
      ui.style.display = 'block';

      // Download heatmap image
      const link = document.createElement('a');
      link.download = `heatmap_screenshot_${Date.now()}.png`;
      link.href = heatmapCanvas.toDataURL();
      link.click();

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

      alert("✅ Analysis complete!\nAll files have been downloaded, and the app has been reset.");

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
  downloadAnalysisFiles(); // saves Excel + saccade graph

  if (callback) callback(); // calls the heatmap part after this
}
