// Function to convert degrees to radians
const radians = degrees => degrees * (Math.PI / 180);

// Parse GPX track points into a custom structure for easier access
function parseTrackPoints(gpxTrackPoints) {
    return Array.from(gpxTrackPoints).map(trkpt => {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));

        // Get time
        const timeNode = trkpt.querySelector('time');
        const time = timeNode ? new Date(timeNode.textContent) : null;

        // Get elevation
        const eleNode = trkpt.getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;

        return {
            lat: lat,
            lon: lon,
            time: time,
            ele: ele
        };
    });
}

// Compute haversine distances (in km) between points
function distanceInKm(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371.0; // km
    const dlat = radians(lat2 - lat1);
    const dlon = radians(lon2 - lon1);
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

// Generate SVG for the route path
function generateSVG(trackPoints, mainColor, shadowColor, mainWidth, shadowWidth, shadowOffset, dotSize = 10) {
    // Find min and max latitude and longitude
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const point of trackPoints) {
        const lat = point.lat;
        const lon = point.lon;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
    }

    // Calculate aspect ratio
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    const aspectRatio = lonRange / latRange;

    // Set default width/height
    let svgWidth = 1920;
    let svgHeight = svgWidth / aspectRatio;

    if (svgHeight > 1080) {
        svgHeight = 1080;
        svgWidth = svgHeight * aspectRatio;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    // Compute a dynamic margin to prevent the moving dot and shadow from being clipped.
    // The margin is based on the size of the main dot (radius 10), the shadow offset,
    // and the shadow stroke width. This ensures there is enough space around the
    // entire drawing so that the animated dot and shadow remain fully visible.
    const dotRadius = parseFloat(dotSize);
    const margin = Math.max(10, dotRadius + shadowOffset + shadowWidth);
    const viewBoxWidth = svgWidth + 2 * margin;
    const viewBoxHeight = svgHeight + 2 * margin;

    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);

    // Use a viewBox that includes the computed margin on all sides
    svg.setAttribute('viewBox', `-${margin} -${margin} ${viewBoxWidth} ${viewBoxHeight}`);

    const mainPath = document.createElementNS(svgNS, 'path');
    mainPath.setAttribute('stroke', mainColor);
    mainPath.setAttribute('stroke-width', mainWidth);
    mainPath.setAttribute('stroke-linejoin', 'round');
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('id', 'MainPath');

    const shadowPath = document.createElementNS(svgNS, 'path');
    shadowPath.setAttribute('stroke', shadowColor);
    shadowPath.setAttribute('stroke-width', shadowWidth);
    shadowPath.setAttribute('stroke-linejoin', 'round');
    shadowPath.setAttribute('fill', 'none');
    shadowPath.setAttribute('id', 'ShadowPath');

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', svgWidth / 2);
    circle.setAttribute('cy', svgHeight / 2);
    circle.setAttribute('r', dotRadius);
    circle.setAttribute('fill', generateSlightlyDifferentColor(mainColor));
    circle.setAttribute('id', 'MainDot');

    const circleOutline = document.createElementNS(svgNS, 'circle');
    circleOutline.setAttribute('cx', svgWidth / 2);
    circleOutline.setAttribute('cy', svgHeight / 2);
    circleOutline.setAttribute('r', dotRadius + dotRadius * 0.2);
    circleOutline.setAttribute('fill', generateSlightlyDifferentColor(shadowColor));
    circleOutline.setAttribute('id', 'OutlineDot');

    let mainPathData = '';
    let shadowPathData = '';

    for (const point of trackPoints) {
        const lat = point.lat;
        const lon = point.lon;
        const x = (lon - minLon) * (svgWidth / lonRange);
        const y = svgHeight - (lat - minLat) * (svgHeight / latRange);

        mainPathData += `${x},${y} `;
        shadowPathData += `${x + shadowOffset},${y + shadowOffset} `;
    }

    mainPath.setAttribute('d', `M ${mainPathData}`);
    shadowPath.setAttribute('d', `M ${shadowPathData}`);
    svg.appendChild(shadowPath);
    svg.appendChild(mainPath);
    svg.appendChild(circleOutline);
    svg.appendChild(circle);

    return svg;
}

// Generate SPL for the route path
function generateSPL(trackPoints, frameRate, compressedFrames = null) {
    let totalDistance = 0;
    let pointDistance = 0;
    let prevLat = null;
    let prevLon = null;
    let prevTime = null;
    let timeElapsed = 0;
    const frameRateLocal = parseInt(frameRate, 10);
    const splLines = ['DFSP'];

    // calculate total distance
    for (const point of trackPoints) {
        const lat = point.lat;
        const lon = point.lon;

        if (prevLat !== null && prevLon !== null) {
            totalDistance += distanceInKm(prevLat, prevLon, lat, lon);
        }
        prevLat = lat;
        prevLon = lon;
    }

    prevLat = null;
    prevLon = null;

    let index = 0;
    for (const point of trackPoints) {
        const lat = point.lat;
        const lon = point.lon;

        if (prevLat !== null && prevLon !== null) {
            pointDistance += distanceInKm(prevLat, prevLon, lat, lon);
        }

        prevLat = lat;
        prevLon = lon;
        let frameIndex;

        if (compressedFrames) {
            frameIndex = compressedFrames[index];
        } else {
            const time = point.time;
            let timeDiff;

            if (prevTime !== null && time !== null) {
                timeDiff = (time - prevTime) / 1000;
            } else {
                timeDiff = 0;
            }

            timeElapsed += timeDiff * frameRateLocal;
            prevTime = time;
            frameIndex = Math.round(timeElapsed);
        }
        const fraction = pointDistance / totalDistance;
        splLines.push(`${frameIndex} ${fraction}`);
        index++;
    }

    return splLines.join('\n');
}

// --- Elevation support functions ---

// Generate SVG for elevation profile
function generateElevationSVG(trackPoints, mainColor, shadowColor, mainWidth, shadowWidth, shadowOffset, svgWidth, svgHeight, showGrid = false, fillColor = null, dotSize = 10) {
    let minEle = Infinity;
    let maxEle = -Infinity;

    trackPoints.forEach(point => {
        const ele = point.ele;

        if (ele < minEle) minEle = ele;
        if (ele > maxEle) maxEle = ele;
    });

    if (minEle === Infinity || maxEle === -Infinity) {
        minEle = 0;
        maxEle = 0;
    }

    const eleRange = maxEle - minEle || 1;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    // Compute a dynamic margin for the elevation graph. We want to ensure that the
    // animated dot (and its outline) plus any shadow width/offset are fully visible.
    // The outline dot radius is 12, so use that as the base. Add the shadowOffset
    // and shadowWidth to provide additional space. Fall back to a minimum of 10.
    const dotRadius = parseFloat(dotSize);
    const dotOutlineRadius = dotRadius + dotRadius * 0.2;
    const margin = Math.max(10, dotOutlineRadius + shadowOffset + shadowWidth);

    // Reserve extra space at the bottom for x-axis labels when grid is enabled
    const extraSpacing = showGrid ? 40 : 0;
    const finalHeight = svgHeight + extraSpacing;
    const finalWidth = svgWidth;
    const viewBoxWidth = finalWidth + 2 * margin;
    const viewBoxHeight = finalHeight + 2 * margin;

    svg.setAttribute('width', finalWidth);
    // Set the total height so that labels fit inside the canvas (excluding margin)
    svg.setAttribute('height', finalHeight);
    // Use a viewBox that includes the computed margin on all sides
    svg.setAttribute('viewBox', `-${margin} -${margin} ${viewBoxWidth} ${viewBoxHeight}`);

    // Determine total distance in km for x-axis labels if grid is shown
    let totalDistanceKm = 0;
    let prevLat = null;
    let prevLon = null;
    trackPoints.forEach(point => {
        const lat = point.lat;
        const lon = point.lon;

        if (prevLat !== null && prevLon !== null) {
            totalDistanceKm += distanceInKm(prevLat, prevLon, lat, lon);
        }
        prevLat = lat;
        prevLon = lon;
    });

    // Create main path and optionally shadow/fill
    const mainPath = document.createElementNS(svgNS, 'path');
    mainPath.setAttribute('stroke', mainColor);
    mainPath.setAttribute('stroke-width', mainWidth);
    mainPath.setAttribute('stroke-linejoin', 'round');
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('id', 'ElevationMainPath');

    const shadowPath = document.createElementNS(svgNS, 'path');
    shadowPath.setAttribute('stroke', shadowColor);
    shadowPath.setAttribute('stroke-width', shadowWidth);
    shadowPath.setAttribute('stroke-linejoin', 'round');
    shadowPath.setAttribute('fill', 'none');
    shadowPath.setAttribute('id', 'ElevationShadowPath');

    // Dot markers
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', svgWidth / 2);

    // Center the dot vertically within the final SVG height to align with DaVinci resolve's anchor
    const centerY = (svgHeight + (showGrid ? 40 : 0)) / 2;
    circle.setAttribute('cy', centerY);
    circle.setAttribute('r', dotRadius);
    circle.setAttribute('fill', generateSlightlyDifferentColor(mainColor));
    circle.setAttribute('id', 'ElevationMainDot');

    const circleOutline = document.createElementNS(svgNS, 'circle');
    circleOutline.setAttribute('cx', svgWidth / 2);
    circleOutline.setAttribute('cy', centerY);
    circleOutline.setAttribute('r', dotRadius + dotRadius * 0.2);
    circleOutline.setAttribute('fill', generateSlightlyDifferentColor(shadowColor));
    circleOutline.setAttribute('id', 'ElevationOutlineDot');

    let mainPathData = '';
    let shadowPathData = '';
    const pointCount = trackPoints.length;
    //const xInc = pointCount > 1 ? svgWidth / (pointCount - 1) : 0; //xInc is different between points based on real distance traveled
    let totalX = 0;

    trackPoints.forEach((point, idx) => {
        let eleVal = point.ele;

        const xInc = pointCount > 1 && idx > 0 ? (svgWidth * distanceInKm(trackPoints[idx - 1].lat, trackPoints[idx - 1].lon, point.lat, point.lon)) / totalDistanceKm : 0;
        totalX += xInc;
        const x = totalX;
        const y = svgHeight - (eleVal - minEle) * (svgHeight / eleRange);

        mainPathData += `${x},${y} `;
        shadowPathData += `${x + shadowOffset},${y + shadowOffset} `;
    });

    mainPath.setAttribute('d', `M ${mainPathData}`);
    shadowPath.setAttribute('d', `M ${shadowPathData}`);

    // If grid and fill requested, build fill path and grid/labels

    if (showGrid) {
        // Build fill path closing to baseline
        const trimmed = mainPathData.trim();
        const fillPathData = `M ${trimmed} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;
        const fillPath = document.createElementNS(svgNS, 'path');
        const color = fillColor || mainColor;

        fillPath.setAttribute('d', fillPathData);
        fillPath.setAttribute('fill', color);

        // Draw horizontal grid lines and labels
        const numYLines = 5;

        for (let i = 0; i < numYLines; i++) {
            const yVal = svgHeight - (i * svgHeight) / (numYLines - 1);
            const line = document.createElementNS(svgNS, 'line');

            line.setAttribute('x1', 0);
            line.setAttribute('y1', yVal);
            line.setAttribute('x2', svgWidth);
            line.setAttribute('y2', yVal);
            line.setAttribute('stroke', '#555555');
            line.setAttribute('stroke-width', 1);
            svg.appendChild(line);

            // Label for elevation
            const val = minEle + (eleRange * i) / (numYLines - 1);
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', -5);
            text.setAttribute('y', yVal + 4);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('font-size', '16');
            text.setAttribute('fill', mainColor);
            text.textContent = Math.round(val) + ' m';
            svg.appendChild(text);
        }

        // Draw vertical grid lines and labels
        const numXLines = 5;

        for (let i = 0; i < numXLines; i++) {
            const xPos = (i * svgWidth) / (numXLines - 1);
            const vline = document.createElementNS(svgNS, 'line');
            vline.setAttribute('x1', xPos);
            vline.setAttribute('y1', 0);
            vline.setAttribute('x2', xPos);
            vline.setAttribute('y2', svgHeight);
            vline.setAttribute('stroke', '#555555');
            vline.setAttribute('stroke-width', 1);
            svg.appendChild(vline);

            // X-axis labels (distance in km if available)
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', xPos);
            text.setAttribute('y', svgHeight + 20);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '16');
            text.setAttribute('fill', mainColor);
            let label;

            if (totalDistanceKm > 0) {
                const dist = ((totalDistanceKm * i) / (numXLines - 1)).toFixed(1);
                label = dist + ' km';
            } else {
                label = Math.round((i * 100) / (numXLines - 1)) + '%';
            }
            text.textContent = label;
            svg.appendChild(text);
        }

        // Append fill path before main path so it appears beneath
        svg.appendChild(fillPath);
        // Append main path for outline
        svg.appendChild(mainPath);
    } else {
        // Without grid, draw shadow path then main path
        svg.appendChild(shadowPath);
        svg.appendChild(mainPath);
    }
    // Append dots on top
    svg.appendChild(circleOutline);
    svg.appendChild(circle);

    return svg;
}

function generateElevationSPL(trackPoints, frameRate, svgWidth, svgHeight, compressedFrames = null) {
    const frameRateLocal = parseInt(frameRate, 10);
    const splLines = ['DFSP'];
    const totalPoints = trackPoints.length;

    if (totalPoints < 1) {
        return splLines.join('\n');
    }

    // Compute elevation values and min/max to map to pixel height
    let minEle = Infinity;
    let maxEle = -Infinity;
    const eleValues = new Array(totalPoints);
    for (let i = 0; i < totalPoints; i++) {
        let val = trackPoints[i].ele;
        eleValues[i] = val;
        if (val < minEle) minEle = val;
        if (val > maxEle) maxEle = val;
    }
    const eleRange = maxEle - minEle || 1;

    const cumulativeDistances = new Array(totalPoints).fill(0);
    const cumulativePathLengths = new Array(totalPoints).fill(0);
    let totalDistanceKm = 0;
    let totalPathLength = 0;
    {
        let prevLatD = null;
        let prevLonD = null;
        let prevEle = null;
        for (let i = 0; i < totalPoints; i++) {
            const point = trackPoints[i];
            const lat = point.lat;
            const lon = point.lon;
            const ele = point.ele;
            if (prevLatD !== null && prevLonD !== null && prevEle !== null) {
                const dist = distanceInKm(prevLatD, prevLonD, lat, lon);
                totalDistanceKm += dist;
                cumulativeDistances[i] = totalDistanceKm;

                const elevDiff = (ele - prevEle) * (svgHeight / eleRange) * 100; // scale elevation difference to pixel space

                const pathDist = Math.sqrt(dist * dist + elevDiff * elevDiff);
                totalPathLength += pathDist;
                cumulativePathLengths[i] = totalPathLength;
            } else {
                cumulativeDistances[i] = 0;
                cumulativePathLengths[i] = 0;
            }

            prevLatD = lat;
            prevLonD = lon;
            prevEle = ele;
        }
    }

    console.log(svgHeight / eleRange, eleRange, svgHeight, totalDistanceKm);

    // Generate each SPL line
    let prevTime = null;
    let timeElapsed = 0;
    for (let i = 0; i < totalPoints; i++) {
        // Determine frame index
        let frameIndex;
        if (compressedFrames) {
            frameIndex = compressedFrames[i];
        } else {
            const point = trackPoints[i];
            const currTime = point.time;
            if (prevTime !== null && currTime !== null) {
                const diff = (currTime - prevTime) / 1000;
                timeElapsed += diff * frameRateLocal;
            }
            prevTime = point.time;
            frameIndex = Math.round(timeElapsed);
        }

        // Compute the fraction mapping distance to pixel length
        let fraction;
        if (totalPathLength > 0) {
            fraction = cumulativePathLengths[i] / totalPathLength;
        } else {
            fraction = 0;
        }

        splLines.push(`${frameIndex} ${fraction}`);
    }

    return splLines.join('\n');
}

// Compute compressed frame indices to remove idle (paused) segments from SPL.
// This function detects segments where there is negligible movement for a
// continuous duration exceeding a user‑defined threshold and removes the
// corresponding time. It returns an object containing the adjusted frame
// indices for each track point and the total new duration in seconds. The
// frame rate must be supplied by the caller via the frame rate input.
function computeCompressedFrames(trackPoints, frameRate, pauseThreshold, distanceThreshold, timeGapThreshold) {
    const frameRateLocal = parseInt(frameRate, 10);
    const len = trackPoints.length;

    if (len === 0) {
        return { compressedFrames: [], newDuration: 0 };
    }

    // Numeric conversions for thresholds
    const thresholdSec = parseFloat(pauseThreshold);
    const distThresholdMeters = parseFloat(distanceThreshold);
    const idleDistanceThreshold = isNaN(distThresholdMeters) ? 0.0 : distThresholdMeters / 1000; // convert m to km
    const gapThresholdSec = parseFloat(timeGapThreshold);
    // Build an array of original absolute times (seconds relative to start)
    const originalTimes = new Array(len);
    const baseTime = trackPoints[0].time;
    originalTimes[0] = 0;

    for (let i = 1; i < len; i++) {
        const currTime = trackPoints[i].time;
        originalTimes[i] = (currTime - baseTime) / 1000;
    }

    // Copy originalTimes into processedTimes for potential gap smoothing
    const processedTimes = originalTimes.slice();
    // Smooth large time gaps if a valid gap threshold is provided

    if (!isNaN(gapThresholdSec) && gapThresholdSec > 0) {
        for (let i = 1; i < len; i++) {
            const dt = processedTimes[i] - processedTimes[i - 1];

            if (dt > gapThresholdSec) {
                // Determine previous and next deltas
                let dtPrev;

                if (i >= 2) {
                    dtPrev = processedTimes[i - 1] - processedTimes[i - 2];
                } else {
                    dtPrev = dt;
                }

                let dtNext;
                if (i + 1 < len) {
                    // Use original times for next delta
                    dtNext = originalTimes[i + 1] - originalTimes[i];
                }

                // Compute new delta as average when both sides exist, otherwise use available
                let newDelta = dtPrev;
                if (dtNext !== undefined && !isNaN(dtNext) && dtNext > 0) {
                    newDelta = (dtPrev + dtNext) / 2;
                }

                // Reduction amount
                const reduction = dt - newDelta;

                if (reduction > 0) {
                    for (let j = i; j < len; j++) {
                        processedTimes[j] -= reduction;
                    }
                }
            }
        }
    }

    // Compute haversine distances (in km) between consecutive points
    const distances = new Array(len);
    distances[0] = 0;

    for (let i = 1; i < len; i++) {
        const prevLat = trackPoints[i - 1].lat;
        const prevLon = trackPoints[i - 1].lon;
        const currLat = trackPoints[i].lat;
        const currLon = trackPoints[i].lon;
        distances[i] = distanceInKm(prevLat, prevLon, currLat, currLon);
    }

    const removedSegments = [];
    let idleStartIndex = null;
    let idleAccumTime = 0;

    // Traverse points to identify idle segments based on distance and time thresholds
    for (let i = 1; i < len; i++) {
        const dt = processedTimes[i] - processedTimes[i - 1];

        if (distances[i] < idleDistanceThreshold) {
            if (idleStartIndex === null) {
                idleStartIndex = i; // index of the first idle point
            }
            idleAccumTime += dt;
        } else {
            // Movement resumed; if idle period long enough, mark removal
            if (idleStartIndex !== null) {
                if (idleAccumTime >= thresholdSec) {
                    const segStart = idleStartIndex;
                    const segEnd = i - 1; // last idle index
                    const duration = processedTimes[segEnd] - processedTimes[segStart];

                    if (duration > 0) {
                        removedSegments.push({ start: segStart, end: segEnd, duration: duration });
                    }
                }

                // Reset idle tracking
                idleStartIndex = null;
                idleAccumTime = 0;
            }
        }
    }

    // Handle idle segment at the end of the track
    if (idleStartIndex !== null && idleAccumTime >= thresholdSec) {
        const segStart = idleStartIndex;
        const segEnd = len - 1;
        const duration = processedTimes[segEnd] - processedTimes[segStart];

        if (duration > 0) {
            removedSegments.push({ start: segStart, end: segEnd, duration: duration });
        }
    }

    // Compute compressed times by subtracting removed durations from processedTimes
    const compressedTimes = new Array(len);
    let totalRemoved = 0;
    let segIdx = 0;
    let currentSeg = removedSegments.length > 0 ? removedSegments[0] : null;
    let segmentBaseTime = 0;

    for (let i = 0; i < len; i++) {
        // Advance to the next removal segment if we've passed the current one
        while (currentSeg && i > currentSeg.end && segIdx < removedSegments.length) {
            totalRemoved += currentSeg.duration;
            segIdx++;
            currentSeg = segIdx < removedSegments.length ? removedSegments[segIdx] : null;
            segmentBaseTime = 0;
        }

        if (currentSeg && i >= currentSeg.start && i <= currentSeg.end) {
            // Within an idle segment: all points get the same compressed time as the start of the segment
            if (i === currentSeg.start) {
                // compute base time for this segment relative to removed durations so far
                segmentBaseTime = processedTimes[currentSeg.start] - totalRemoved;
            }
            compressedTimes[i] = segmentBaseTime;
            // Do not update totalRemoved yet; we handle it when advancing past the segment
        } else {
            // Outside idle segments
            compressedTimes[i] = processedTimes[i] - totalRemoved;
        }
    }

    // Consume any remaining segments (update totalRemoved) – not strictly necessary but kept for completeness
    while (currentSeg && segIdx < removedSegments.length) {
        totalRemoved += currentSeg.duration;
        segIdx++;
        currentSeg = segIdx < removedSegments.length ? removedSegments[segIdx] : null;
    }

    // Calculate new duration after removing idle segments
    const newDuration = processedTimes[len - 1] - totalRemoved;
    // Convert times to frame indices
    const compressedFrames = compressedTimes.map(t => Math.round(t * frameRateLocal));

    return { compressedFrames, newDuration };
}

// Download route SVG
function downloadSVG() {
    const svgContainer = document.getElementById('svgContainer');
    const svg = svgContainer.querySelector('svg');

    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SVG - GPS Animator Tool - Bikes with Ben.svg';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Download elevation SVG
function downloadElevationSVG() {
    const elevationContainer = document.getElementById('elevationContainer');
    const svg = elevationContainer.querySelector('svg');

    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SVG - Elevation - GPS Animator Tool - Bikes with Ben.svg';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Download route SPL
function downloadSPL(splContent, totalDuration) {
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
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Download elevation SPL
function downloadElevationSPL(splContent, totalDuration) {
    const formattedDuration = formatDuration(totalDuration);
    const filename = `SPL Elevation - Duration ${formattedDuration} - GPS Animator Tool - Bikes with Ben.spl`;
    const blob = new Blob([splContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Calculate total duration from track points
function calculateTotalDuration(trackPoints) {
    let totalDuration = 0;

    for (let i = 1; i < trackPoints.length; i++) {
        const prevTime = trackPoints[i - 1].time;
        const currentTime = trackPoints[i].time;
        const timeDiffInSeconds = (currentTime - prevTime) / 1000;
        totalDuration += timeDiffInSeconds;
    }

    return totalDuration;
}

// Format duration as HH-MM-SS-ss
function formatDuration(durationInSeconds) {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const milliseconds = Math.floor((durationInSeconds - Math.floor(durationInSeconds)) * 100);

    return `${padZero(hours)}-${padZero(minutes)}-${padZero(seconds)}-${padZero(milliseconds)}`;
}

function padZero(number) {
    return number.toString().padStart(2, '0');
}

// Generate slightly different color for dot backgrounds
function generateSlightlyDifferentColor(color) {
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    const colorDifferenceFactor = 0.99;
    const newR = Math.round(r * colorDifferenceFactor);
    const newG = Math.round(g * colorDifferenceFactor);
    const newB = Math.round(b * colorDifferenceFactor);
    const newHexColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;

    return newHexColor;
}

// Handle GPX file upload and generate both route and elevation graphics
function handleFile() {
    const fileInput = document.getElementById('fileInput');
    const svgContainer = document.getElementById('svgContainer');
    const elevationContainer = document.getElementById('elevationContainer');
    // Route parameters
    const mainColor = document.getElementById('mainColor').value;
    const shadowColor = document.getElementById('shadowColor').value;
    const mainWidth = parseInt(document.getElementById('mainWidth').value, 10);
    const shadowWidth = parseInt(document.getElementById('shadowWidth').value, 10);
    const shadowOffset = parseInt(document.getElementById('shadowOffset').value, 10);
    // Elevation parameters
    const altMainColor = document.getElementById('altMainColor').value;
    const altShadowColor = document.getElementById('altShadowColor').value;
    const altMainWidth = parseInt(document.getElementById('altMainWidth').value, 10);
    const altShadowWidth = parseInt(document.getElementById('altShadowWidth').value, 10);
    const altShadowOffset = parseInt(document.getElementById('altShadowOffset').value, 10);
    const altWidth = parseInt(document.getElementById('altWidth').value, 10);
    const altHeight = parseInt(document.getElementById('altHeight').value, 10);
    const altShowGrid = document.getElementById('altShowGrid').checked;
    const altFillColor = document.getElementById('altFillColor').value;

    const dotSize = parseInt(document.getElementById('dotSize').value, 10);
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const gpxData = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
            const gpxTrackPoints = xmlDoc.querySelectorAll('trkpt');
            const trackPoints = parseTrackPoints(gpxTrackPoints);
            // Route SVG
            const routeSvg = generateSVG(trackPoints, mainColor, shadowColor, mainWidth, shadowWidth, shadowOffset, dotSize);
            svgContainer.innerHTML = '';
            svgContainer.appendChild(routeSvg);
            // Elevation SVG
            const elevationSvg = generateElevationSVG(trackPoints, altMainColor, altShadowColor, altMainWidth, altShadowWidth, altShadowOffset, altWidth, altHeight, altShowGrid, altFillColor, dotSize);
            elevationContainer.innerHTML = '';
            elevationContainer.appendChild(elevationSvg);
        };
        reader.readAsText(file);
        // Show input controls and containers
        const labelInputTable = document.getElementById('labelInputTable');
        labelInputTable.classList.remove('hidden');
        svgContainer.classList.remove('hidden');
        elevationContainer.classList.remove('hidden');
        // Show buttons
        const svgDownloadButton = document.getElementById('svgDownloadButton');
        svgDownloadButton.style.display = 'block';
        const splDownloadButton = document.getElementById('splDownloadButton');
        splDownloadButton.style.display = 'block';
        const altSvgButton = document.getElementById('altSvgDownloadButton');
        const altSplButton = document.getElementById('altSplDownloadButton');

        if (altSvgButton) altSvgButton.style.display = 'block';
        if (altSplButton) altSplButton.style.display = 'block';
    }
}

// Delay execution of handleFile to prevent rapid re-rendering
let timeoutId = null;
function handleFileWithDelay() {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
        timeoutId = null;
        handleFile();
    }, 100);
}

// Hook route parameter inputs to handleFileWithDelay
document.getElementById('mainColor').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowColor').addEventListener('input', handleFileWithDelay);
document.getElementById('mainWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('shadowOffset').addEventListener('input', handleFileWithDelay);

// Hook elevation parameter inputs to handleFileWithDelay
document.getElementById('altMainColor').addEventListener('input', handleFileWithDelay);
document.getElementById('altShadowColor').addEventListener('input', handleFileWithDelay);
document.getElementById('altMainWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('altShadowWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('altShadowOffset').addEventListener('input', handleFileWithDelay);
document.getElementById('altWidth').addEventListener('input', handleFileWithDelay);
document.getElementById('altHeight').addEventListener('input', handleFileWithDelay);
document.getElementById('altShowGrid').addEventListener('change', handleFileWithDelay);
document.getElementById('altFillColor').addEventListener('input', handleFileWithDelay);

// Hook general parameters to handleFileWithDelay
document.getElementById('dotSize').addEventListener('input', handleFileWithDelay);

// Set up route SPL download behaviour
const splDownloadButton = document.getElementById('splDownloadButton');
splDownloadButton.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const gpxData = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
            const gpxTrackPoints = xmlDoc.querySelectorAll('trkpt');
            const trackPoints = parseTrackPoints(gpxTrackPoints);
            // Determine whether to remove idle segments
            const removePauses = document.getElementById('removePauses').checked;
            const threshold = document.getElementById('pauseThreshold').value;
            const distThreshold = document.getElementById('distanceThreshold').value;
            const gapThreshold = document.getElementById('timeGapThreshold').value;
            let compressedFramesInfo = null;
            let totalDuration;

            if (removePauses) {
                // Compute compressed frames and adjusted duration using thresholds
                const frameRate = document.getElementById('frameRate').value;
                compressedFramesInfo = computeCompressedFrames(trackPoints, frameRate, threshold, distThreshold, gapThreshold);
                totalDuration = compressedFramesInfo.newDuration;
            } else {
                totalDuration = calculateTotalDuration(trackPoints);
            }
            const frames = compressedFramesInfo ? compressedFramesInfo.compressedFrames : null;
            const frameRate = document.getElementById('frameRate').value;
            const splContent = generateSPL(trackPoints, frameRate, frames);
            downloadSPL(splContent, totalDuration);
        };
        reader.readAsText(file);
    }
});

// Set up elevation SPL download behaviour
const altSplDownloadButton = document.getElementById('altSplDownloadButton');
altSplDownloadButton.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const gpxData = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'text/xml');
            const gpxTrackPoints = xmlDoc.querySelectorAll('trkpt');
            const trackPoints = parseTrackPoints(gpxTrackPoints);
            const removePauses = document.getElementById('removePauses').checked;
            const threshold = document.getElementById('pauseThreshold').value;
            const distThreshold = document.getElementById('distanceThreshold').value;
            const gapThreshold = document.getElementById('timeGapThreshold').value;
            let compressedFramesInfo = null;
            let totalDuration;

            if (removePauses) {
                const frameRate = document.getElementById('frameRate').value;
                compressedFramesInfo = computeCompressedFrames(trackPoints, frameRate, threshold, distThreshold, gapThreshold);
                totalDuration = compressedFramesInfo.newDuration;
            } else {
                totalDuration = calculateTotalDuration(trackPoints);
            }
            const frames = compressedFramesInfo ? compressedFramesInfo.compressedFrames : null;
            const frameRate = document.getElementById('frameRate').value;
            // Read elevation graph dimensions from inputs to map distance to pixel positions
            const altWidthVal = parseFloat(document.getElementById('altWidth').value);
            const altHeightVal = parseFloat(document.getElementById('altHeight').value);
            const splContent = generateElevationSPL(trackPoints, frameRate, altWidthVal, altHeightVal, frames);
            downloadElevationSPL(splContent, totalDuration);
        };
        reader.readAsText(file);
    }
});

// Hook route SVG download
const svgDownloadButton = document.getElementById('svgDownloadButton');
svgDownloadButton.addEventListener('click', () => {
    downloadSVG();
});

// Hook elevation SVG download
const altSvgDownloadButton = document.getElementById('altSvgDownloadButton');
altSvgDownloadButton.addEventListener('click', () => {
    downloadElevationSVG();
});

// Ensure file input hides label when selected
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.getElementById('fileInputLabel');
fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
        fileInputLabel.style.display = 'none';
        // Trigger file processing immediately when a file is selected
        handleFile();
    } else {
        fileInputLabel.style.display = 'block';
    }
});
