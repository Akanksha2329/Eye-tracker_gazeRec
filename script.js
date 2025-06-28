let heatmapInstance;
let gazePoints = [];
let trackingActive = false;
let imageUploaded = false;  // New flag to track image upload

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

  // ✅ Show only the necessary buttons
  document.getElementById("start-btn").style.display = "none";
  document.getElementById("main-title").style.display = "none";
  document.getElementById("upload-btn").style.display = "inline-block";
  
  trackingActive = false;
  imageUploaded = false;
};


GazeCloudAPI.OnResult = (GazeData) => {
  if (GazeData.state === 0 && heatmapInstance && trackingActive && imageUploaded) {
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
  document.getElementById("start-btn").style.display = "none";
  document.getElementById("main-title").style.display = "none";
  GazeCloudAPI.StartEyeTracking();
  trackingActive = true;
}

// Trigger image upload input
function triggerUpload() {
  document.getElementById("imageUpload").click();
}

// Handle uploaded image
function handleImageUpload() {
  const input = document.getElementById("imageUpload");
  const img = document.getElementById("bg-image");

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      img.onload = () => {
        imageUploaded = true;

    startTracking(); 

    // Show tracking buttons
    document.getElementById("stop-btn").style.display = "inline-block";
    document.getElementById("analyzeClearBtn").style.display = "inline-block";
    document.getElementById("upload-btn").style.display = "none";
  };

  img.src = e.target.result;     // set the image
  img.style.display = "block";   // show it
};

    reader.readAsDataURL(input.files[0]);
  }
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

  html2canvas(document.getElementById('screenshot-wrapper')).then(canvas => {
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
      document.getElementById("analyzeClearBtn").style.display = "none";
      document.getElementById("upload-btn").style.display = "none";
      document.getElementById("main-title").style.display = "block";
      document.getElementById("bg-image").style.display = "none";
      imageUploaded = false;

    }

    console.log("Heatmap cleared and screenshot saved.");
  });
}

// Init on load
window.addEventListener('load', initHeatmap);