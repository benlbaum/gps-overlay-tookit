let gpxDataGlobal;
let map;
let gpxLayer;
let originalFileName; // Variable to store the original file name

document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];
    
    if (file && file.name.endsWith('.gpx')) {
        originalFileName = file.name; // Store the original file name

        const reader = new FileReader();
        
        reader.onload = function (e) {
            gpxDataGlobal = e.target.result; // Store GPX data globally
            displayGPX(gpxDataGlobal, 0, 100); // Initial display without trimming

            // Show the trim controls and download button
            document.getElementById('trimControls').classList.remove('hidden');
            document.getElementById('downloadButton').classList.remove('hidden');
        };
        
        reader.readAsText(file);
    } else {
        alert('Please upload a valid GPX file.');
        this.value = ''; // Reset the file input
    }
});

function displayGPX(gpxData, startTrimPercent, endTrimPercent) {
    if (map) {
        map.remove(); // Remove existing map before creating a new one
    }

    map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Trim the GPX data
    const trimmedGPX = trimGPX(gpxData, startTrimPercent, endTrimPercent);

    gpxLayer = new L.GPX(trimmedGPX, {
        async: true
    }).on('loaded', function(e) {
        map.fitBounds(e.target.getBounds());
    }).addTo(map);

    // Enable download button with trimmed GPX data
    enableDownload(trimmedGPX);
}

function trimGPX(gpxData, startTrimPercent, endTrimPercent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    const totalPoints = trackPoints.length;

    const startIndex = Math.floor(totalPoints * (startTrimPercent / 100));
    const endIndex = Math.floor(totalPoints * (endTrimPercent / 100));

    const trimmedDoc = xmlDoc.cloneNode(true);
    const trkseg = trimmedDoc.querySelector('trkseg');

    // Remove all track points before the startIndex and after the endIndex
    for (let i = 0; i < startIndex; i++) {
        trkseg.removeChild(trkseg.firstChild);
    }
    for (let i = trkseg.children.length - 1; i >= endIndex - startIndex; i--) {
        trkseg.removeChild(trkseg.lastChild);
    }

    return new XMLSerializer().serializeToString(trimmedDoc);
}

// Function to enable downloading of the trimmed GPX file
function enableDownload(trimmedGPX) {
    const downloadButton = document.getElementById('downloadButton');

    downloadButton.onclick = function () {
        const blob = new Blob([trimmedGPX], { type: 'application/gpx+xml' });

        // Generate the trimmed file name
        const trimmedFileName = originalFileName.replace('.gpx', '-trimmed.gpx');

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = trimmedFileName; // Use the trimmed file name for download
        document.body.appendChild(a);
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };
}

// Event listeners for the trim sliders
document.getElementById('startTrim').addEventListener('input', function () {
    const startTrimPercent = parseInt(this.value, 10);
    const endTrimPercent = parseInt(document.getElementById('endTrim').value, 10);
    displayGPX(gpxDataGlobal, startTrimPercent, endTrimPercent);
});

document.getElementById('endTrim').addEventListener('input', function () {
    const endTrimPercent = parseInt(this.value, 10);
    const startTrimPercent = parseInt(document.getElementById('startTrim').value, 10);
    displayGPX(gpxDataGlobal, startTrimPercent, endTrimPercent);
});
