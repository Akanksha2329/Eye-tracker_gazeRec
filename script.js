let heatmapInstance;
let gazePoints = [];
let trackingActive = false;

// Initialize heatmap
function initHeatmap() {
  if (typeof h337 === 'undefined') {
    alert("heatmap.js not loaded");
    return;
  }
  heatmapInstance = h337.create({
    container: document.getElementById('heatmap-container'),
    radius: 35,
    maxOpacity: 0.6,
    minOpacity: 0,
    blur: 0.85,
    gradient: {
      '0.1': 'blue',
      '0.3': 'cyan',
      '0.5': 'lime',
      '0.7': 'yellow',
      '1.0': 'red'
    }
  });
}

// GazeCloudAPI callbacks
GazeCloudAPI.OnCalibrationComplete = () => {
  console.log("Calibration complete");
  if (!heatmapInstance) initHeatmap();
  // Show Stop and Clear
  document.getElementById("stop-btn").style.display = "inline-block";
  document.getElementById("clear-btn").style.display = "inline-block";
  trackingActive = true;
};

GazeCloudAPI.OnResult = (GazeData) => {
  if (GazeData.state === 0 && heatmapInstance && trackingActive) {
    gazePoints.push({
      x: Math.round(GazeData.docX),
      y: Math.round(GazeData.docY),
      value: 1
    });
    if (gazePoints.length % 10 === 0) {
      heatmapInstance.setData({
        max: 10,
        data: gazePoints
      });
    }
  }
};

GazeCloudAPI.OnCamDenied = () => alert("Camera access denied.");
GazeCloudAPI.OnCamNotFound = () => alert("No webcam found.");
GazeCloudAPI.OnError = (error) => alert("GazeCloud error: " + error);

// Start/Stop/Clear functions
function startTracking() {
  console.log("Start Tracking clicked");

  // Immediately hide title and Start button
  document.getElementById("main-title").style.display = "none";
  document.getElementById("start-btn").style.display = "none";

  if (!heatmapInstance) initHeatmap();
  GazeCloudAPI.StartEyeTracking();
}

function stopTracking() {
  GazeCloudAPI.StopEyeTracking();
  trackingActive = false;
  console.log("Stopped tracking");
}

function clearHeatmap() {
  const container = document.getElementById('heatmap-container');
  const ui = document.getElementById('ui-elements');
  ui.style.display = 'none';

  html2canvas(container).then(canvas => {
    ui.style.display = 'block';
    const link = document.createElement('a');
    link.download = `heatmap_screenshot_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    if (heatmapInstance) {
      gazePoints = [];
      heatmapInstance.setData({ max: 10, data: [] });
    }

    // After stop + clear: show Start again, hide others
    if (!trackingActive) {
      document.getElementById("start-btn").style.display = "inline-block";
      document.getElementById("stop-btn").style.display = "none";
      document.getElementById("clear-btn").style.display = "none";
      document.getElementById("main-title").style.display = "block";
    }

    console.log("Heatmap cleared and screenshot saved.");
  });
}

// Init on load
window.addEventListener('load', initHeatmap);

let gazeBuffer = [];

function saveGazeData(x, y, time) {
  gazeBuffer.push({ x, y, timestamp: time });
}

// Called from GazeCloudAPI
GazeCloudAPI.OnResult = function (GazeData) {
  const dot = document.getElementById("dot");
  if (GazeData.state === 0) {
    dot.style.left = (GazeData.docX - 10) + "px";
    dot.style.top = (GazeData.docY - 10) + "px";
    dot.style.display = "block";
    saveGazeData(GazeData.docX, GazeData.docY, GazeData.time);
  } else {
    dot.style.display = "none";
  }
};

function runAnalysis() {
  if (gazeBuffer.length === 0) {
    alert("No gaze data collected!");
    return;
  }

  const data = JSON.parse(JSON.stringify(gazeBuffer));
  const start = data[0].timestamp;
  data.forEach(d => d.timestamp -= start);

  clearFixationCanvas();

  const fixations = detectFixations(data);
  console.log("✔ Fixations:", fixations.length);
  fixations.forEach((f, i) => {
    console.log(`#${i}: start=${f.start}, end=${f.end}, duration=${(f.end - f.start)} ms`);
  });

  drawFixationSequence(fixations);

  const saccades = computeSaccades(fixations);
  drawSaccadeHistogram(saccades.map(s => s.distance));
}

function clearFixationCanvas() {
  const container = document.getElementById('fixationCanvasContainer');
  container.innerHTML = '';
}

function detectFixations(data) {
  const FIX_RADIUS = 50;
  const FIX_DURATION = 100;
  let fixations = [];
  let i = 0;

  while (i < data.length) {
    let j = i + 1;
    while (j < data.length) {
      const window = data.slice(i, j + 1);
      const xs = window.map(p => p.x);
      const ys = window.map(p => p.y);
      const dx = Math.max(...xs) - Math.min(...xs);
      const dy = Math.max(...ys) - Math.min(...ys);
      const duration = window.at(-1).timestamp - window[0].timestamp;

      if (dx <= FIX_RADIUS && dy <= FIX_RADIUS && duration >= FIX_DURATION) {
        j++;
      } else {
        break;
      }
    }

    if (j - i > 1) {
      const group = data.slice(i, j);
      const fix_x = group.reduce((sum, d) => sum + d.x, 0) / group.length;
      const fix_y = group.reduce((sum, d) => sum + d.y, 0) / group.length;
      const start = group[0].timestamp;
      const end = group.at(-1).timestamp;

      if (end > start) {
        fixations.push({ x: fix_x, y: fix_y, start, end });
      }

      i = j;
    } else {
      i++;
    }
  }

  return fixations;
}

function drawFixationSequence(fixations) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  canvas.style.position = 'absolute';
  document.getElementById('fixationCanvasContainer').appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.font = '12px Arial';

  fixations.forEach((f, i) => {
    ctx.beginPath();
    ctx.arc(f.x, f.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(i + 1, f.x + 8, f.y - 8);
  });

  ctx.strokeStyle = 'black';
  ctx.setLineDash([5, 3]);

  for (let i = 1; i < fixations.length; i++) {
    ctx.beginPath();
    ctx.moveTo(fixations[i - 1].x, fixations[i - 1].y);
    ctx.lineTo(fixations[i].x, fixations[i].y);
    ctx.stroke();
  }
}

function computeSaccades(fixations) {
  let saccades = [];

  for (let i = 1; i < fixations.length; i++) {
    const prev = fixations[i - 1];
    const curr = fixations[i];

    if (!prev || !curr || prev.end === undefined || curr.start === undefined) {
      console.warn(`⚠ Missing timestamp in fixations ${i - 1} or ${i}`);
      continue;
    }

    const x1 = prev.x, y1 = prev.y;
    const x2 = curr.x, y2 = curr.y;
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const duration = (curr.start - prev.end) / 1000; // in seconds

    if (duration > 0.01) {
      const velocity = distance / duration;
      saccades.push({ distance, velocity });
      console.log(`Saccade ${i - 1} → ${i}: dist=${distance.toFixed(2)}px, dur=${duration.toFixed(3)}s, vel=${velocity.toFixed(2)}px/s`);
    } else {
      console.warn(`⚠ Ignoring invalid saccade duration between ${i - 1} and ${i}`);
    }
  }

  if (saccades.length === 0) {
    console.warn("⚠ No valid saccades calculated.");
    return [];
  }

  const totalTime = (fixations.at(-1).end - fixations[0].start) / 1000;
  const avgDistance = avg(saccades.map(s => s.distance));
  const avgVelocity = avg(saccades.map(s => s.velocity));
  const avgDensity = saccades.length / totalTime;

  console.log(`📏 Avg Saccade Distance: ${avgDistance.toFixed(2)} px`);
  console.log(`⚡ Avg Velocity: ${avgVelocity.toFixed(2)} px/s`);
  console.log(`📈 Avg Density: ${avgDensity.toFixed(2)} saccades/s`);

  return saccades;
}

function drawSaccadeHistogram(distances) {
  const ctx = document.getElementById('saccadeHistogram').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: distances.map((_, i) => `S${i + 1}`),
      datasets: [{
        label: 'Saccadic Distance (px)',
        data: distances,
        backgroundColor: 'skyblue',
        borderColor: 'black',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
