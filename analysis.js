// Analysis data
let analysisResults = {
  fixations: [],
  saccades: []
};

// Calculate distance between two points
function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function processGazeData() {
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
        velocity: dist / (timeDiff / 1000),
        duration: frameTime
      });
      currentFix = [gazePoints[i]];
    }
  }
}

// Analyze gaze data for fixations and saccades
function analyzeGazeData() {
  if (gazePoints.length < 2) {
    alert("Not enough gaze data to analyze.");
    return;
  }

  processGazeData();

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
  canvas.width = bg.naturalWidth;
  canvas.height = bg.naturalHeight;


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

  const scaleX = canvas.width / bg.clientWidth;
  const scaleY = canvas.height / bg.clientHeight;

  for (let i = 0; i < fixations.length; i++) {
    const f = fixations[i];

  // Scale fixation coordinates
  const fx = f.x * scaleX;
  const fy = f.y * scaleY;
  const next = fixations[i + 1];
  const nx = next?.x * scaleX;
  const ny = next?.y * scaleY;

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
  const container = document.getElementById("saccade-d3-container");
  container.style.display = "block";
  container.innerHTML = ""; // Clear old graph

  const data = analysisResults.saccades;
    if (!data || data.length === 0) {
      console.warn("No saccade data to display.");
      return;
    }
  const width = container.clientWidth || 800;
  const height = 300;
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };


  const svg = d3.select(container)
    .append("svg")
    .attr("id", "saccade-svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(data.map((d, i) => i))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const minBarWidth = 10;
  const bandwidth = Math.max(x.bandwidth(), minBarWidth);  

  const maxY = Math.max(
    1, // Avoid zero scaling
    d3.max(data, d => d.distance || 0),
    d3.max(data, d => d.velocity || 0)
  );

  const y = d3.scaleLinear()
    .domain([0, maxY])
    .range([height - margin.bottom, margin.top]);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");  

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(i => `S${i + 1}`))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");


  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Bars - Distance (blue)
  svg.selectAll(".bar-distance")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d, i) => x(i))
    .attr("y", d => {
      const val = y(d.distance);
      return isNaN(val) ? y(0) : val;
    })
    .attr("width", bandwidth / 2)
    .attr("height", d => {
      const val = y(0) - y(d.distance);
      return isNaN(val) ? 0 : val;
    })
    .attr("fill", "steelblue")
    .on("mouseover", function(event, d) {
      tooltip.style("opacity", 1)
         .html(`
           <strong>Saccade ${data.indexOf(d) + 1}</strong><br/>
           From: (${Math.round(d.from.x)}, ${Math.round(d.from.y)})<br/>
           To: (${Math.round(d.to.x)}, ${Math.round(d.to.y)})<br/>
           Distance: ${d.distance.toFixed(2)} px<br/>
           Velocity: ${d.velocity.toFixed(2)} px/s
         `);
    })
    .on("mousemove", function(event) {
      tooltip
         .style("left", (event.pageX + 15) + "px")
         .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

  // Bars - Velocity (red)
  svg.selectAll(".bar-velocity")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d, i) => x(i) + x.bandwidth() / 2)
    .attr("y", d => {
      const val = y(d.velocity);
      return isNaN(val) ? y(0) : val;
    })
    .attr("width", bandwidth / 2)
    .attr("height", d => {
      const val = y(0) - y(d.velocity);
      return isNaN(val) ? 0 : val;
    })
    .attr("fill", "tomato")
    .on("mouseover", function(event, d) {
      tooltip.style("opacity", 1)
         .html(`
           <strong>Saccade ${data.indexOf(d) + 1}</strong><br/>
           From: (${Math.round(d.from.x)}, ${Math.round(d.from.y)})<br/>
           To: (${Math.round(d.to.x)}, ${Math.round(d.to.y)})<br/>
           Distance: ${d.distance.toFixed(2)} px<br/>
           Velocity: ${d.velocity.toFixed(2)} px/s
         `);
    })
    .on("mousemove", function(event) {
      tooltip
         .style("left", (event.pageX + 15) + "px")
         .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

  // Legend
  svg.append("text")
    .attr("x", width - 160)
    .attr("y", margin.top - 10)
    .attr("fill", "steelblue")
    .text("■ Distance (px)");

  svg.append("text")
    .attr("x", width - 160)
    .attr("y", margin.top + 10)
    .attr("fill", "tomato")
    .text("■ Velocity (px/s)");
}

// Download graph and data
function downloadAnalysis() {
  const fixationCanvas = document.getElementById("fixation-sequence-canvas");

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

  // Download D3 SVG as image
  const svg = document.getElementById("saccade-svg");
  if (svg) {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `saccade_graph_${Date.now()}.svg`;
    downloadLink.click();
  }
  /* // Optional: Export SVG to PNG
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);

    const pngLink = document.createElement("a");
    pngLink.href = canvas.toDataURL("image/png");
    pngLink.download = `saccade_graph_${Date.now()}.png`;
    pngLink.click();
  };

  img.src = svgUrl;
*/
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

      // Reset everything
      if (heatmapInstance) {
        gazePoints = [];
        heatmapInstance.setData({ max: 10, data: [] });
      }

      trackingActive = false;

      document.getElementById("start-calibration-btn").style.display = "inline-block";
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

      const sacContainer = document.getElementById("saccade-d3-container");
      if (sacContainer) {
        sacContainer.innerHTML = "";
        sacContainer.style.display = "none";
      }

      setTimeout(() => {
         alert("✅ Analysis complete!\nAll files have been downloaded, and the app has been reset.");
      }, 100);


      console.log("Everything done. UI reset.");
    });
  });
}

function analyzeGazeOnly(callback) {
  processGazeData();

  plotSaccadeGraph();

  // Show the fixation image and canvas
  document.getElementById("bg-image-fixation").src = document.getElementById("bg-image").src;
  document.getElementById("bg-image-fixation").style.display = "block";
  document.getElementById("fixation-sequence-canvas").style.display = "block";

  drawFixationSequence();
  downloadAnalysis(); // saves Excel + saccade graph

  if (callback) callback(); // calls the heatmap part after this
}

// ...existing code...




// 2. Helper: Check if a point is inside AOI rectangle
function isInAOI(point, aoi) {
  return (
    point.x >= aoi.x &&
    point.x <= aoi.x + aoi.width &&
    point.y >= aoi.y &&
    point.y <= aoi.y + aoi.height
  );
}

// 3. AOI metrics calculation
function analyzeAOIMetrics(aoi) {
  // Fixations inside AOI
  const fixationsInAOI = analysisResults.fixations.filter(fix => isInAOI(fix, aoi));
  const fixationCount = fixationsInAOI.length;
  const fixationDuration = fixationsInAOI.reduce((sum, f) => sum + f.duration, 0);
  const firstFixationDuration = fixationsInAOI[0]?.duration || 0;
  const lastFixationDuration = fixationsInAOI.at(-1)?.duration || 0;

  // Dispersion (spread of fixation points)
  let dispersion = 0;
  if (fixationsInAOI.length > 1) {
    const avgX = fixationsInAOI.reduce((sum, f) => sum + f.x, 0) / fixationCount;
    const avgY = fixationsInAOI.reduce((sum, f) => sum + f.y, 0) / fixationCount;
    dispersion = Math.sqrt(
      fixationsInAOI.reduce((sum, f) => sum + ((f.x - avgX) ** 2 + (f.y - avgY) ** 2), 0) / fixationCount
    );
  }

  // Saccades inside AOI (both start and end inside AOI)
  const saccadesInAOI = analysisResults.saccades.filter(sac =>
    isInAOI(sac.from, aoi) && isInAOI(sac.to, aoi)
  );
  const saccadeCount = saccadesInAOI.length;
  const saccadeDuration = saccadesInAOI.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Amplitude, direction, peak velocity
  const amplitudes = saccadesInAOI.map(s => getDistance(s.from, s.to));
  const directions = saccadesInAOI.map(s => Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * 180 / Math.PI);
  const velocities = saccadesInAOI.map(s => s.velocity);

  const avgAmplitude = amplitudes.length ? amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length : 0;
  const avgDirection = directions.length ? directions.reduce((a, b) => a + b, 0) / directions.length : 0;
  const peakVelocity = velocities.length ? Math.max(...velocities) : 0;

  // AOI area in cm² (if you know pixels per cm, e.g. 37.8 px/cm for 96 DPI)
  const PX_PER_CM = 37.8; // Change this value to match your screen DPI
  const AOI_Area_sq_cm = (aoi.width * aoi.height) / (PX_PER_CM * PX_PER_CM);

  // Dwell time (total fixation duration in AOI)
  const dwellTimeMs = fixationDuration;

  // Dwell time (%) - needs total stimulus duration
  const stimulusDurationMs = gazePoints.length * 33; // 33ms per frame
  const dwellTimePercent = stimulusDurationMs ? (dwellTimeMs / stimulusDurationMs) * 100 : 0;

  // Dwell count (number of fixations in AOI)
  const dwellCount = fixationCount;

  // Revisit count (number of times AOI is re-entered after first dwell)
  let revisitCount = 0;
  let inAOI = false;
  for (let i = 0; i < analysisResults.fixations.length; i++) {
    const fix = analysisResults.fixations[i];
    if (isInAOI(fix, aoi)) {
      if (!inAOI) {
        if (revisitCount > 0) revisitCount++; // Count as revisit after first dwell
        else revisitCount = 1; // First dwell
        inAOI = true;
      }
    } else {
      inAOI = false;
    }
 }

  return {
    AOI_X_px: aoi.x,
    AOI_Y_px: aoi.y,
    AOI_Width_px: aoi.width,
    AOI_Height_px: aoi.height,
    AOI_Area_sq_px: aoi.width * aoi.height,
    AOI_Area_sq_cm: AOI_Area_sq_cm,
    Dwell_Time_ms: dwellTimeMs,
    Dwell_Time_percent: dwellTimePercent,
    Dwell_Count: dwellCount,
    Revisit_Count: revisitCount,
    Stimulus_Duration_ms: stimulusDurationMs,
    Fixation_Count: fixationCount,
    Fixation_Duration_ms: fixationDuration,
    First_Fixation_Duration_ms: firstFixationDuration,
    Last_Fixation_Duration_ms: lastFixationDuration,
    Dispersion_px: dispersion,
    Saccade_Count: saccadeCount,
    Saccade_Duration_ms: saccadeDuration,
    Avg_Amplitude_px: avgAmplitude,
    Avg_Direction_deg: avgDirection,
    Peak_Velocity_px_s: peakVelocity
  };
}

// 4. Add AOI metrics to Excel export in downloadAnalysis()
function downloadAnalysis() {
  const fixationCanvas = document.getElementById("fixation-sequence-canvas");

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

  // AOI metrics sheet with header and rows
  const aoiMetrics = analyzeAOIMetrics(AOI);

  const aoiMetricsHeader = {
    Metric: "Metric",
    Unit: "Unit",
    Description: "Description",
    Value: "Value"
  };

  const aoiMetricsRows = [
    { Metric: "AOI X", Unit: "px", Description: "AOI top-left X coordinate", Value: aoiMetrics.AOI_X_px },
    { Metric: "AOI Y", Unit: "px", Description: "AOI top-left Y coordinate", Value: aoiMetrics.AOI_Y_px },
    { Metric: "AOI Width", Unit: "px", Description: "AOI width", Value: aoiMetrics.AOI_Width_px },
    { Metric: "AOI Height", Unit: "px", Description: "AOI height", Value: aoiMetrics.AOI_Height_px },
    { Metric: "AOI Size", Unit: "px²", Description: "Size of AOI in square pixels", Value: aoiMetrics.AOI_Area_sq_px },
    { Metric: "AOI Size", Unit: "cm²", Description: "Size of AOI in square centimeters", Value: aoiMetrics.AOI_Area_sq_cm },
    { Metric: "Dwell Time", Unit: "ms", Description: "Average of how long the respondents gazed at the AOI", Value: aoiMetrics.Dwell_Time_ms },
    { Metric: "Dwell Time (%)", Unit: "%", Description: "Average of how long the respondents gazed at the AOI about the time during which the AOI was active", Value: aoiMetrics.Dwell_Time_percent },
    { Metric: "Dwell Count", Unit: "", Description: "Average of how often the gaze entered the AOI", Value: aoiMetrics.Dwell_Count },
    { Metric: "Revisit Count", Unit: "", Description: "Average of how often the respondents looked back at the AOI after the first dwell", Value: aoiMetrics.Revisit_Count },
    { Metric: "Stimulus Duration", Unit: "ms", Description: "Average duration of how long the stimulus was presented", Value: aoiMetrics.Stimulus_Duration_ms },
    { Metric: "Fixation Count", Unit: "", Description: "Number of fixations in AOI", Value: aoiMetrics.Fixation_Count },
    { Metric: "Fixation Duration", Unit: "ms", Description: "Total fixation duration in AOI", Value: aoiMetrics.Fixation_Duration_ms },
    { Metric: "First Fixation Duration", Unit: "ms", Description: "Duration of first fixation in AOI", Value: aoiMetrics.First_Fixation_Duration_ms },
    { Metric: "Last Fixation Duration", Unit: "ms", Description: "Duration of last fixation in AOI", Value: aoiMetrics.Last_Fixation_Duration_ms },
    { Metric: "Dispersion", Unit: "px", Description: "Spread of fixation points in AOI", Value: aoiMetrics.Dispersion_px },
    { Metric: "Saccade Count", Unit: "", Description: "Number of saccades in AOI", Value: aoiMetrics.Saccade_Count },
    { Metric: "Saccade Duration", Unit: "ms", Description: "Total saccade duration in AOI", Value: aoiMetrics.Saccade_Duration_ms },
    { Metric: "Avg Amplitude", Unit: "px", Description: "Average saccade amplitude in AOI", Value: aoiMetrics.Avg_Amplitude_px },
    { Metric: "Avg Direction", Unit: "deg", Description: "Average saccade direction in AOI", Value: aoiMetrics.Avg_Direction_deg },
    { Metric: "Peak Velocity", Unit: "px/s", Description: "Peak saccade velocity in AOI", Value: aoiMetrics.Peak_Velocity_px_s }
  ];

  const wb = XLSX.utils.book_new();
  const wsFix = XLSX.utils.json_to_sheet(fixationSheet);
  const wsSac = XLSX.utils.json_to_sheet(saccadeSheet);
  const wsAOI = XLSX.utils.json_to_sheet(aoiMetricsRows);
  XLSX.utils.book_append_sheet(wb, wsFix, "Fixations");
  XLSX.utils.book_append_sheet(wb, wsSac, "Saccades");
  XLSX.utils.book_append_sheet(wb, wsAOI, "AOI Metrics");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });

  const excelLink = document.createElement("a");
  excelLink.download = `gaze_analysis_${Date.now()}.xlsx`;
  excelLink.href = URL.createObjectURL(blob);
  excelLink.click();

  // Download D3 SVG as image
  const svg = document.getElementById("saccade-svg");
  if (svg) {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `saccade_graph_${Date.now()}.svg`;
    downloadLink.click();
  }
  // ...existing code...
}

// --- AOI Selection Logic ---

let AOI = { x: 100, y: 100, width: 200, height: 150 }; // Default AOI
let aoiSelecting = false;
let aoiStart = null;

function enableAOISelection() {
  const img = document.getElementById("bg-image");
  const canvas = document.getElementById("aoi-canvas");
  if (!img.src) {
    alert("Upload an image first!");
    return;
  }
  // Match canvas size to image
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.style.display = "block";
  canvas.style.pointerEvents = "auto";
  canvas.style.left = img.offsetLeft + "px";
  canvas.style.top = img.offsetTop + "px";

  aoiSelecting = true;
  aoiStart = null;

  canvas.onmousedown = function(e) {
    if (!aoiSelecting) return;
    const rect = canvas.getBoundingClientRect();
    aoiStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  canvas.onmousemove = function(e) {
    if (!aoiSelecting || !aoiStart) return;
    const rect = canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    drawAOIRect(aoiStart.x, aoiStart.y, x2 - aoiStart.x, y2 - aoiStart.y);
  };
  canvas.onmouseup = function(e) {
    if (!aoiSelecting || !aoiStart) return;
    const rect = canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    AOI = {
      x: Math.min(aoiStart.x, x2),
      y: Math.min(aoiStart.y, y2),
      width: Math.abs(x2 - aoiStart.x),
      height: Math.abs(y2 - aoiStart.y)
    };
    drawAOIRect(AOI.x, AOI.y, AOI.width, AOI.height);
    aoiSelecting = false;
    canvas.style.pointerEvents = "none";
    canvas.style.display = "none";
    alert(`AOI selected: x=${AOI.x}, y=${AOI.y}, w=${AOI.width}, h=${AOI.height}`);
    document.getElementById("start-tracking-btn").style.display = "inline-block";
    document.getElementById("aoi-select-btn").style.display = "none";
  };
}

function drawAOIRect(x, y, w, h) {
  const canvas = document.getElementById("aoi-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// --- End AOI Selection Logic ---
