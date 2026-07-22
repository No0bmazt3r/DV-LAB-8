// --- Global Variables ---
let allData = [];
let filteredData = [];

// DOM Elements
const searchInput = document.getElementById("search");
const searchOptions = document.getElementById("search-options");
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
let currentXScale = xScale; 
let yScale = d3.scaleLinear().range([height, 0]).domain([0, 100]); 

// Vibrant color palette for dark mode
const customColors = ["#38bdf8", "#a855f7", "#34d399", "#fbbf24", "#f43f5e", "#818cf8", "#f472b6", "#4ade80", "#fcd34d"];
const colorScale = d3.scaleOrdinal(customColors);

// --- Load Data ---
d3.csv("World Important Dates.csv").then(data => {
    // 1. Data Cleaning
    allData = data.filter(d => d["Year"] && !isNaN(d["Year"]) && d["Name of Incident"]).map(d => {
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
            // Jitter for y-axis
            yPos: Math.random() * 100 
        };
    });

    filteredData = [...allData];

    // 2. Initialize UI (Filters, Legend, Search Options)
    initializeFilters();
    initializeLegend();
    initializeSearchOptions();
    
    // Set fixed global color domain to ensure consistency
    colorScale.domain(Array.from(new Set(allData.map(d => d.Outcome))).filter(o => o !== "Unknown" && o !== ""));

    // 3. Setup Initial Scales & Render
    xScale.domain(d3.extent(allData, d => d.Year)).nice();
    currentXScale = xScale; 
    renderTimeline();
    
    // 4. Setup Zoom behavior
    setupZoom();
    
}).catch(error => {
    console.error("Error loading CSV:", error);
    d3.select("#timeline").html(`<div style="color:#f87171; padding: 20px; font-weight: 500;">Error loading data. Make sure <b>World Important Dates.csv</b> is in the same directory.</div>`);
});


// --- Functions ---

function initializeSearchOptions() {
    // Get unique incident names and sort them
    const uniqueIncidents = Array.from(new Set(allData.map(d => d.IncidentName))).sort();
    
    // Create datalist options
    const fragment = document.createDocumentFragment();
    
    // We can add all of them, or limit it if the dataset is massive, but HTML datalist usually handles thousands fine.
    uniqueIncidents.forEach(incident => {
        const option = document.createElement("option");
        option.value = incident;
        fragment.appendChild(option);
    });
    
    searchOptions.appendChild(fragment);
}

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
        svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
        applyFilters();
    });
}

function initializeLegend() {
    const legendContainer = d3.select("#legend");
    const outcomes = Array.from(new Set(allData.map(d => d.Outcome))).filter(o => o && o !== "Unknown");
    colorScale.domain(outcomes);
    
    outcomes.forEach(outcome => {
        const item = legendContainer.append("div").attr("class", "legend-item");
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", colorScale(outcome))
            .style("color", colorScale(outcome)); // For the box-shadow glow
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
    if (year === 0) return `1 BCE`; 
    return `${year} CE`;
}

// Setup X-Axis function
function drawXAxis(scale) {
    const xAxis = d3.axisBottom(scale)
        .tickFormat(d => formatYear(d))
        .ticks(10);
    xAxisGroup.call(xAxis);
    
    // Remove vertical tick lines to make it cleaner
    xAxisGroup.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.05)");
    xAxisGroup.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");
}

const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 30])
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
    updateDashboard();
    drawXAxis(currentXScale);

    const circles = circlesGroup.selectAll("circle.event-circle")
        .data(filteredData, d => d.IncidentName + d.Year); 

    circles.exit()
        .transition()
        .duration(300)
        .attr("r", 0)
        .style("opacity", 0)
        .remove();

    const enterCircles = circles.enter()
        .append("circle")
        .attr("class", "event-circle")
        .attr("cy", d => yScale(d.yPos))
        .attr("cx", d => currentXScale(d.Year))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.Outcome))
        .style("color", d => colorScale(d.Outcome)) // Used for hover drop-shadow
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    enterCircles.merge(circles)
        .transition()
        .duration(500)
        .attr("cx", d => currentXScale(d.Year))
        .attr("cy", d => yScale(d.yPos))
        .attr("r", 7)
        .style("opacity", 0.85); 
}

function showTooltip(event, d) {
    d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 12);

    tooltip.style("display", "block")
        .style("opacity", "0")
        .html(`
            <div class="tooltip-header">${d.IncidentName}</div>
            <div class="tooltip-body">
                <div class="tooltip-label">Year</div>
                <div class="tooltip-value">${formatYear(d.Year)}</div>
                
                <div class="tooltip-label">Country</div>
                <div class="tooltip-value">${d.Country}</div>
                
                <div class="tooltip-label">Type</div>
                <div class="tooltip-value">${d.EventType}</div>
                
                <div class="tooltip-label">Outcome</div>
                <div class="tooltip-value" style="color: ${colorScale(d.Outcome)}">${d.Outcome}</div>
                
                <div class="tooltip-label">Impact</div>
                <div class="tooltip-value">${d.Impact !== 'Unknown' ? d.Impact : 'Not specified'}</div>
            </div>
        `);
        
    tooltip.transition().duration(200).style("opacity", "1");
}

function moveTooltip(event) {
    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    
    let xOffset = event.pageX + 20;
    let yOffset = event.pageY + 20;
    
    if (xOffset + tooltipWidth > window.innerWidth) {
        xOffset = event.pageX - tooltipWidth - 20;
    }
    
    if (yOffset + tooltipHeight > window.innerHeight) {
        yOffset = event.pageY - tooltipHeight - 20;
    }
    
    tooltip
        .style("left", xOffset + "px")
        .style("top", yOffset + "px");
}

function hideTooltip(event, d) {
    d3.select(this)
        .transition()
        .duration(150)
        .attr("r", 7);
    
    tooltip.style("display", "none");
}

window.addEventListener("resize", () => {
    width = document.getElementById("timeline").clientWidth - margin.left - margin.right;
    
    svg.attr("width", width + margin.left + margin.right);
    svg.select("#clip rect").attr("width", width);
    
    xScale.range([0, width]);
    svg.transition().duration(0).call(zoomBehavior.transform, d3.zoomIdentity);
    currentXScale = xScale;
    
    renderTimeline();
});

// Theme Toggle
const themeToggleBtn = document.getElementById("theme-toggle");
themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.getAttribute("data-theme") === "light";
    document.body.setAttribute("data-theme", isLight ? "dark" : "light");
});
