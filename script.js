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
  document.getElementById("analyzeBtn").style.display = "inline-block";
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
      document.getElementById("analyzeBtn").style.display = "none";
      document.getElementById("main-title").style.display = "block";
    }

    console.log("Heatmap cleared and screenshot saved.");
  });
}

// Init on load
window.addEventListener('load', initHeatmap);