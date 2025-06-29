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
        velocity: dist / (timeDiff / 1000)
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
    .attr("y", d => y(d.distance))
    .attr("width", bandwidth / 2)
    .attr("height", d => y(0) - y(d.distance))
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
    .attr("y", d => y(d.velocity))
    .attr("width", bandwidth / 2)
    .attr("height", d => y(0) - y(d.velocity))
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