// --- Global Variables ---
let allData = [];
let filteredData = [];

// DOM Elements
const searchInput = document.getElementById("search");
const countryFilter = document.getElementById("country-filter");
const eventTypeFilter = document.getElementById("event-type-filter");
const outcomeFilter = document.getElementById("outcome-filter");
const resetBtn = document.getElementById("reset-btn");
const tooltip = d3.select("#tooltip");

// --- D3 Dimensions & Setup ---
const margin = { top: 40, right: 40, bottom: 60, left: 40 };
let width = document.getElementById("timeline").clientWidth - margin.left - margin.right;
let height = document.getElementById("timeline").clientHeight - margin.top - margin.bottom;

// Main SVG
const svg = d3.select("#timeline")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

// Clip path to keep circles within bounds during zoom/pan
svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const zoomGroup = chartGroup.append("g").attr("clip-path", "url(#clip)");
const circlesGroup = zoomGroup.append("g");
const xAxisGroup = chartGroup.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0, ${height})`);

// --- Scales ---
let xScale = d3.scaleLinear().range([0, width]);
let currentXScale = xScale; // To handle zooming
// Y scale used purely for visual separation (jitter/distribution)
let yScale = d3.scaleLinear().range([height, 0]).domain([0, 100]); 
// Color scale based on Outcome
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// --- Load Data ---
// Ensure the CSV filename is correct based on the download
d3.csv("World Important Dates.csv").then(data => {
    // 1. Data Cleaning
    allData = data.filter(d => d["Year"] && !isNaN(d["Year"]) && d["Name of Incident"]).map(d => {
        // Parse year
        let yearNum = parseFloat(d["Year"]);
        
        return {
            IncidentName: d["Name of Incident"],
            Year: yearNum,
            Month: d["Month"] || "Unknown",
            Date: d["Date"] || "Unknown",
            Country: d["Country"] || "Unknown",
            EventType: d["Type of Event"] || "Unknown",
            Outcome: d["Outcome"] || "Unknown",
            Impact: d["Impact"] || "Unknown",
            // Compute random Y position for scattering
            yPos: Math.random() * 100 
        };
    });

    filteredData = [...allData];

    // 2. Initialize UI (Filters, Legend)
    initializeFilters();
    initializeLegend();
    
    // Set fixed global color domain to ensure consistency
    colorScale.domain(Array.from(new Set(allData.map(d => d.Outcome))).filter(o => o !== "Unknown" && o !== ""));

    // 3. Setup Initial Scales & Render
    xScale.domain(d3.extent(allData, d => d.Year)).nice();
    currentXScale = xScale; // Reset zoom
    renderTimeline();
    
    // 4. Setup Zoom behavior
    setupZoom();
    
}).catch(error => {
    console.error("Error loading CSV:", error);
    d3.select("#timeline").html(`<p style="color:red; padding: 20px;">Error loading data. Make sure <b>World Important Dates.csv</b> is in the same directory.</p>`);
});


// --- Functions ---

function initializeFilters() {
    const countries = Array.from(new Set(allData.map(d => d.Country))).filter(c => c && c !== "Unknown").sort();
    const eventTypes = Array.from(new Set(allData.map(d => d.EventType))).filter(e => e && e !== "Unknown").sort();
    const outcomes = Array.from(new Set(allData.map(d => d.Outcome))).filter(o => o && o !== "Unknown").sort();

    countries.forEach(c => countryFilter.add(new Option(c, c)));
    eventTypes.forEach(e => eventTypeFilter.add(new Option(e, e)));
    outcomes.forEach(o => outcomeFilter.add(new Option(o, o)));

    // Event Listeners
    searchInput.addEventListener("input", applyFilters);
    countryFilter.addEventListener("change", applyFilters);
    eventTypeFilter.addEventListener("change", applyFilters);
    outcomeFilter.addEventListener("change", applyFilters);
    resetBtn.addEventListener("click", () => {
        searchInput.value = "";
        countryFilter.value = "All";
        eventTypeFilter.value = "All";
        outcomeFilter.value = "All";
        // Reset zoom as well
        svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
        applyFilters();
    });
}

function initializeLegend() {
    const legendContainer = d3.select("#legend");
    // We will legend by Outcome
    const outcomes = Array.from(new Set(allData.map(d => d.Outcome))).filter(o => o && o !== "Unknown");
    colorScale.domain(outcomes);
    
    outcomes.forEach(outcome => {
        const item = legendContainer.append("div").attr("class", "legend-item");
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(outcome));
        item.append("span").text(outcome);
    });
}

function applyFilters() {
    const searchText = searchInput.value.toLowerCase();
    const selectedCountry = countryFilter.value;
    const selectedEventType = eventTypeFilter.value;
    const selectedOutcome = outcomeFilter.value;

    filteredData = allData.filter(d => {
        const matchesSearch = d.IncidentName.toLowerCase().includes(searchText);
        const matchesCountry = selectedCountry === "All" || d.Country === selectedCountry;
        const matchesType = selectedEventType === "All" || d.EventType === selectedEventType;
        const matchesOutcome = selectedOutcome === "All" || d.Outcome === selectedOutcome;
        
        return matchesSearch && matchesCountry && matchesType && matchesOutcome;
    });

    renderTimeline();
}

function updateDashboard() {
    document.getElementById("visible-events").innerText = filteredData.length.toLocaleString();
    
    if (filteredData.length > 0) {
        const minYear = d3.min(filteredData, d => d.Year);
        const maxYear = d3.max(filteredData, d => d.Year);
        document.getElementById("earliest-year").innerText = formatYear(minYear);
        document.getElementById("latest-year").innerText = formatYear(maxYear);
        
        const uniqueCountries = new Set(filteredData.map(d => d.Country)).size;
        document.getElementById("countries-shown").innerText = uniqueCountries;
    } else {
        document.getElementById("earliest-year").innerText = "-";
        document.getElementById("latest-year").innerText = "-";
        document.getElementById("countries-shown").innerText = "0";
    }
}

// Helper to format negative years as BCE
function formatYear(year) {
    if (year < 0) return `${Math.abs(year)} BCE`;
    if (year === 0) return `1 BCE`; // technically no year 0, but fallback
    return `${year} CE`;
}

// Setup X-Axis function
function drawXAxis(scale) {
    const xAxis = d3.axisBottom(scale)
        .tickFormat(d => formatYear(d))
        .ticks(10);
    xAxisGroup.call(xAxis);
}

// Define zoom behavior globally to access in reset
const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 20])
    .extent([[0, 0], [width, height]])
    .on("zoom", (event) => {
        currentXScale = event.transform.rescaleX(xScale);
        drawXAxis(currentXScale);
        circlesGroup.selectAll("circle.event-circle")
            .attr("cx", d => currentXScale(d.Year));
    });

function setupZoom() {
    svg.call(zoomBehavior);
}

function renderTimeline() {
    // Update Dashboard
    updateDashboard();

    // Re-draw X Axis with current base scale (if no zoom applied) or currentXScale
    drawXAxis(currentXScale);

    // Bind Data
    const circles = circlesGroup.selectAll("circle.event-circle")
        .data(filteredData, d => d.IncidentName + d.Year); // unique key

    // Exit
    circles.exit()
        .transition()
        .duration(300)
        .attr("r", 0)
        .remove();

    // Enter & Update
    const enterCircles = circles.enter()
        .append("circle")
        .attr("class", "event-circle")
        .attr("cy", d => yScale(d.yPos))
        .attr("cx", d => currentXScale(d.Year))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.Outcome))
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    enterCircles.merge(circles)
        .transition()
        .duration(500)
        .attr("cx", d => currentXScale(d.Year))
        .attr("cy", d => yScale(d.yPos))
        .attr("r", d => 6); // Base radius
}

function showTooltip(event, d) {
    d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 10);

    tooltip.style("display", "block")
        .html(`
            <strong>${d.IncidentName}</strong>
            Year: ${formatYear(d.Year)}<br>
            Country: ${d.Country}<br>
            Type: ${d.EventType}<br>
            Outcome: ${d.Outcome}<br>
            Impact: ${d.Impact}
        `);
}

function moveTooltip(event) {
    const tooltipWidth = tooltip.node().offsetWidth;
    // Keep tooltip within window bounds roughly
    let xOffset = event.pageX + 15;
    if (xOffset + tooltipWidth > window.innerWidth) {
        xOffset = event.pageX - tooltipWidth - 15;
    }
    
    tooltip
        .style("left", xOffset + "px")
        .style("top", (event.pageY + 15) + "px");
}

function hideTooltip(event, d) {
    d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 6);
    
    tooltip.style("display", "none");
}

// Window resize handling
window.addEventListener("resize", () => {
    // Recalculate dimensions
    width = document.getElementById("timeline").clientWidth - margin.left - margin.right;
    
    svg.attr("width", width + margin.left + margin.right);
    svg.select("#clip rect").attr("width", width);
    
    xScale.range([0, width]);
    // Note: A full responsive implementation with zoom is complex, 
    // a simple re-render might reset the zoom. We'll reset it.
    svg.transition().duration(0).call(zoomBehavior.transform, d3.zoomIdentity);
    currentXScale = xScale;
    
    renderTimeline();
});
