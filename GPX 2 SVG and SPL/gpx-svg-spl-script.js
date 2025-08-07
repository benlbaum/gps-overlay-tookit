// Function to convert degrees to radians
const radians = degrees => degrees * (Math.PI / 180);

function generateSVG(trackPoints, mainColor, shadowColor, mainWidth, shadowWidth, shadowOffset) {
    // Find min and max latitude and longitude
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const point of trackPoints) {
        const lat = parseFloat(point.getAttribute('lat'));
        const lon = parseFloat(point.getAttribute('lon'));

        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
    }

    // Calculate the aspect ratio of the GPX data
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const aspectRatio = lonRange / latRange;

    // Set the desired width and height while preserving aspect ratio
    let svgWidth = 1920;
    let svgHeight = svgWidth / aspectRatio;

    if (svgHeight > 1080) {
        // If height exceeds 1080 pixels, adjust height and width accordingly
        svgHeight = 1080;
        svgWidth = svgHeight * aspectRatio;
    }

    // Create an SVG document
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    // Add margin inside the SVG container
    const margin = 10; // Adjust the margin size as needed
    const viewBoxWidth = svgWidth + 2 * margin;
    const viewBoxHeight = svgHeight + 2 * margin;

    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('viewBox', `-${margin} -${margin} ${viewBoxWidth} ${viewBoxHeight}`); // Add margins to viewBox

    // Create the main path element
    const mainPath = document.createElementNS(svgNS, 'path');
    mainPath.setAttribute('stroke', mainColor); // Set main color
    mainPath.setAttribute('stroke-width', mainWidth); // Set main width
    mainPath.setAttribute('stroke-linejoin', 'round'); // Set linejoin to round
    mainPath.setAttribute('fill', 'none'); // Remove fill
    mainPath.setAttribute('id', 'MainPath'); // Add an 'id' attribute

    // Create the drop shadow path element
    const shadowPath = document.createElementNS(svgNS, 'path');
    shadowPath.setAttribute('stroke', shadowColor); // Set shadow color
    shadowPath.setAttribute('stroke-width', shadowWidth); // Set shadow width
    shadowPath.setAttribute('stroke-linejoin', 'round'); // Set linejoin to round
    shadowPath.setAttribute('fill', 'none'); // Remove fill
    shadowPath.setAttribute('id', 'ShadowPath'); // Add an 'id' attribute

    // Create a circle element for tracking
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', svgWidth/2);
    circle.setAttribute('cy', svgHeight/2);
    circle.setAttribute('r', 10); // You can adjust the radius as needed
    circle.setAttribute('fill', generateSlightlyDifferentColor(mainColor)); // Set circle color to main color
    circle.setAttribute('id', 'MainDot'); // Add an 'id' attribute to the circle

    const circleOutline = document.createElementNS(svgNS, 'circle');
    circleOutline.setAttribute('cx', svgWidth/2);
    circleOutline.setAttribute('cy', svgHeight/2);
    circleOutline.setAttribute('r', 12); // You can adjust the radius as needed
    circleOutline.setAttribute('fill', generateSlightlyDifferentColor(shadowColor)); // Set circle color to shadow color
    circleOutline.setAttribute('id', 'OutlineDot'); // Add an 'id' attribute to the circle

    // Build the path data strings for both paths
    let mainPathData = '';
    let shadowPathData = '';
    for (const point of trackPoints) {
        const lat = parseFloat(point.getAttribute('lat'));
        const lon = parseFloat(point.getAttribute('lon'));

        // Convert lat/lon to SVG coordinates (adjust as needed)
        const x = (lon - minLon) * (svgWidth / lonRange);
        const y = svgHeight - ((lat - minLat) * (svgHeight / latRange));

        mainPathData += `${x},${y} `;
        // Offset shadow path slightly (adjust as needed)
        shadowPathData += `${x + shadowOffset},${y + shadowOffset} `;
    }

    // Set the path data attributes for both paths
    mainPath.setAttribute('d', `M ${mainPathData}`);
    shadowPath.setAttribute('d', `M ${shadowPathData}`);

    // Append both paths and the circle to the SVG container
    svg.appendChild(shadowPath); // Add the shadow path first
    svg.appendChild(mainPath);   // Add the main path on top
    svg.appendChild(circleOutline); //Add the circle outline
    svg.appendChild(circle);     // Add the circle

    return svg; // Return the generated SVG
}


function generateSPL(trackPoints) {
    // Define the radius of the Earth in miles
    const earth_radius = 3958.8; // miles

    // Initialize variables for total distance and the previous point's coordinates
    let total_distance = 0;
    let point_distance = 0;
    let fraction = 0;
    let prev_lat = null;
    let prev_lon = null;
    let prev_time = null;
    let time_diff = 0;
    let time_elapsed = 0;
    let frameRateInput = document.getElementById('frameRate');
    let frame_rate = parseInt(frameRateInput.value, 10);

    // Create an array to store SPL lines, including the header row
    const splLines = ["DFSP"]; // Start with the header row

    // Iterate through the track points to first get total_distance
    for (const trkpt of trackPoints) {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));

        if (prev_lat !== null && prev_lon !== null) {
            // Calculate the distance between the current and previous points
            const dlat = radians(lat - prev_lat);
            const dlon = radians(lon - prev_lon);
            const a = Math.sin(dlat / 2) ** 2 + Math.cos(radians(prev_lat)) * Math.cos(radians(lat)) * Math.sin(dlon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = earth_radius * c;
            total_distance += distance;
        }

        prev_lat = lat;
        prev_lon = lon;
    }

    prev_lat = null;
    prev_lon = null;

    // Iterate through the track points
    for (const trkpt of trackPoints) {
        lat = parseFloat(trkpt.getAttribute('lat'));
        lon = parseFloat(trkpt.getAttribute('lon'));

        if (prev_lat !== null && prev_lon !== null) {
            // Calculate the distance between the current and previous points
            const dlat = radians(lat - prev_lat);
            const dlon = radians(lon - prev_lon);
            const a = Math.sin(dlat / 2) ** 2 + Math.cos(radians(prev_lat)) * Math.cos(radians(lat)) * Math.sin(dlon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = earth_radius * c;
            point_distance += distance;
        }

        prev_lat = lat;
        prev_lon = lon;

        // Calculate time difference in seconds
        const time = trkpt.querySelector('time').textContent;
        if (prev_time !== null) {
            const prev_time_obj = new Date(prev_time);
            const current_time_obj = new Date(time);
            time_diff = (current_time_obj - prev_time_obj) / 1000;
        } else {
            time_diff = 0;
        }

        time_elapsed += time_diff * frame_rate;
        prev_time = time;

        // Add the current point's distance and fraction to SPL lines
        fraction = point_distance / total_distance;
        splLines.push(`${Math.round(time_elapsed)} ${fraction}`);
    }

    // Join the SPL lines with line breaks
    const splContent = splLines.join('\n');

    return splContent;
}

// Function to handle GPX file upload
function handleFile() {
    const fileInput = document.getElementById('fileInput');
    const svgContainer = document.getElementById('svgContainer');
    
    // Get user-selected input values
    const mainColor = document.getElementById('mainColor').value;
    const shadowColor = document.getElementById('shadowColor').value;
    const mainWidth = parseInt(document.getElementById('mainWidth').value, 10);
    const shadowWidth = parseInt(document.getElementById('shadowWidth').value, 10);
    const shadowOffset = parseInt(document.getElementById('shadowOffset').value, 10);

    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const gpxData = e.target.result;

            // Parse GPX data
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
            const trackPoints = xmlDoc.querySelectorAll('trkpt');

            // Generate SVG
            const svg = generateSVG(trackPoints, mainColor, shadowColor, mainWidth, shadowWidth, shadowOffset);

            // Clear previous SVG content and append the new SVG
            svgContainer.innerHTML = '';
            svgContainer.appendChild(svg);

            // Generate SPL
            //const splData = generateSPL(trackPoints);
            //downloadSPL(splData);
        };

        reader.readAsText(file);

        // After generating the SVG, remove the 'hidden' class from input elements
        const labelInputTable = document.getElementById('labelInputTable');
        labelInputTable.classList.remove('hidden');
        svgContainer.classList.remove('hidden');

        //Show the Download Buttons
        const svgDownloadButton = document.getElementById('svgDownloadButton');
        svgDownloadButton.style.display = 'block';
        const splDownloadButton = document.getElementById('splDownloadButton');
        splDownloadButton.style.display = 'block';
    }

}

let timeoutId = null;

// Function to handle GPX file upload and SVG generation
function handleFileWithDelay() {
    if (timeoutId) {
        clearTimeout(timeoutId); // Clear the previous timeout if it exists
    }

    // Delay the SVG generation by 500 milliseconds
    timeoutId = setTimeout(() => {
        timeoutId = null; // Reset the timeout ID
        handleFile(); // Generate SVG after the delay
    }, 100);
}

//Allow for SVG Download
function downloadSVG() {
    const svgContainer = document.getElementById('svgContainer');
    const svg = svgContainer.querySelector('svg');

    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'SVG - GPS Animator Tool - Bikes with Ben.svg'; // Set the filename here
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Function to download SPL file
function downloadSPL(splContent, totalDuration) {
    // Format the total duration as HH-MM-SS-ss
    const formattedDuration = formatDuration(totalDuration);

    const filename = `SPL - Duration ${formattedDuration} - GPS Animator Tool - Bikes with Ben.spl`;

    const blob = new Blob([splContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Add event listeners to input elements
document.getElementById('mainColor').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowColor').addEventListener('input', handleFileWithDelay);
document.getElementById('mainWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowOffset').addEventListener('input', handleFileWithDelay);

// Add event listener to the "Download SPL" button
const splDownloadButton = document.getElementById('splDownloadButton');
splDownloadButton.addEventListener('click', () => {
    // Parse GPX data again to retrieve trackPoints
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const gpxData = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
            const trackPoints = xmlDoc.querySelectorAll('trkpt');
            const splContent = generateSPL(trackPoints); // Call generateSPL with the GPX track points
            const totalDuration = calculateTotalDuration(trackPoints);
            downloadSPL(splContent, totalDuration);
        };
        reader.readAsText(file);
    }
});

const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.getElementById('fileInputLabel');

fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
        // A file has been selected, hide the label
        fileInputLabel.style.display = 'none';
    } else {
        // No file selected, show the label
        fileInputLabel.style.display = 'block';
    }
});

// Function to calculate the total duration from trackPoints
function calculateTotalDuration(trackPoints) {
    let totalDuration = 0;

    for (let i = 1; i < trackPoints.length; i++) {
        const prevTime = new Date(trackPoints[i - 1].querySelector('time').textContent);
        const currentTime = new Date(trackPoints[i].querySelector('time').textContent);

        const timeDiffInSeconds = (currentTime - prevTime) / 1000;
        totalDuration += timeDiffInSeconds;
    }

    return totalDuration;
}

// Function to format duration as HH-MM-SS-ss
function formatDuration(durationInSeconds) {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const milliseconds = Math.floor((durationInSeconds - Math.floor(durationInSeconds)) * 100);

    return `${padZero(hours)}-${padZero(minutes)}-${padZero(seconds)}-${padZero(milliseconds)}`;
}

// Function to pad a number with leading zeros if needed
function padZero(number) {
    return number.toString().padStart(2, '0');
}

//Davinci Resolve assigns a single background node to things of like color.  I'd like the dot to get a different
//very slightly different color background so that it looks the same, but gets a different node in Davinci.
function generateSlightlyDifferentColor(color) {
    // Convert the mainColor to an RGB color representation
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // You can adjust the factor to make the color more or less different
    const colorDifferenceFactor = 0.99; // Adjust this value as needed

    // Calculate slightly different RGB values
    const newR = Math.round(r * colorDifferenceFactor);
    const newG = Math.round(g * colorDifferenceFactor);
    const newB = Math.round(b * colorDifferenceFactor);

    // Convert the new RGB values back to a hex color
    const newHexColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;

    return newHexColor;
}

// Initial SVG generation
handleFileWithDelay(); // Generate SVG when the page loads