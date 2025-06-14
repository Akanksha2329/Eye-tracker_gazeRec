// Enable click recalibration (optional)
GazeCloudAPI.UseClickRecalibration = true;

// Called when calibration is completed
GazeCloudAPI.OnCalibrationComplete = function () {
    console.log("Calibration complete");
};

// Called when camera access is denied
GazeCloudAPI.OnCamDenied = function () {
    console.log("Camera access denied");
};

// Called when an error occurs
GazeCloudAPI.OnError = function (msg) {
    console.error("Error: " + msg);
};

// Main gaze result callback
GazeCloudAPI.OnResult = function (GazeData) {
    const dot = document.getElementById("dot");

    if (GazeData.state === 0) {
        // Gaze is valid
        dot.style.left = (GazeData.docX - 10) + "px";
        dot.style.top = (GazeData.docY - 10) + "px";
        dot.style.display = "block";

        console.log(`Gaze at (X: ${GazeData.docX}, Y: ${GazeData.docY}) - Time: ${GazeData.time}`);
    } else if (GazeData.state === -1) {
        console.warn("Face tracking lost");
        dot.style.display = "none";
    } else if (GazeData.state === 1) {
        console.warn("Uncalibrated gaze data");
    }
};

// Start tracking function
function startTracking() {
    GazeCloudAPI.StartEyeTracking();
    console.log("Eye tracking started");
}

// Stop tracking function
function stopTracking() {
    GazeCloudAPI.StopEyeTracking();
    document.getElementById("dot").style.display = "none";
    console.log("Eye tracking stopped");
}