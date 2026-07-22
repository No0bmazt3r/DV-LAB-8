# DV Lab 8: Interactive Historical Timeline

This project is an interactive historical timeline built purely with **Vanilla JavaScript**, **HTML5**, **CSS3**, and **D3.js (v7)**. It visualizes important historical events from around the world using the "World Important Dates" dataset.

## Assignment Criteria Fulfilled

- **Task 1: Create an Interactive Timeline**: A horizontal timeline is generated using D3.js, representing events as circles positioned accurately along an x-axis mapped to the event years (handling both BCE and CE dates). Vertical jitter is applied to prevent heavy overlap. The SVG container is responsive and supports scroll-to-zoom and drag-to-pan functionalities.
- **Task 2: Load Data from CSV**: Uses `d3.csv()` to fetch and parse the dataset. Invalid data rows (e.g., missing years) are filtered out, and missing fields are gracefully defaulted to "Unknown".
- **Task 3: Event Details (Tooltip)**: A custom HTML tooltip displays the Event Name, Year, Country, Event Type, and Outcome when hovering over any marker.
- **Task 4: Search Functionality**: A search bar dynamically filters the data array by Incident Name on input and triggers a smooth D3 enter/update/exit transition cycle.
- **Task 5: Filtering**: Includes dynamic `<select>` dropdowns for **Country**, **Event Type**, and **Outcome**. Changes trigger immediate timeline updates.
- **Task 6: Color Encoding**: Event markers are color-coded based on their 'Outcome'. A dynamically generated legend provides a key for the colors.
- **Task 7: Summary Dashboard**: Real-time summary statistics (Visible events, Earliest year, Latest year, and Unique countries shown) are displayed above the timeline and updated automatically alongside any search or filter actions.

## Installation & Setup

Because this project uses vanilla web technologies and loads D3.js directly via CDN, **no package managers** (like `npm`) or build tools (like Webpack or Vite) are required.

### Prerequisites
You need the dataset. Download **World Important Dates.csv** from Kaggle:
[Link to Dataset](https://www.kaggle.com/datasets/saketk511/world-important-events-ancient-to-modern?resource=download)

Place the downloaded CSV directly into the root folder next to `index.html`.

### Running Locally
To bypass CORS restrictions when loading a local CSV file with JavaScript, you need to serve the files through a local web server.

**Option 1: Using VS Code**
1. Install the "Live Server" extension by Ritwick Dey.
2. Right-click on `index.html` and select **"Open with Live Server"**.

**Option 2: Using Python**
1. Open your terminal in the project directory.
2. Run `python3 -m http.server 8000`.
3. Open your browser and navigate to `http://localhost:8000`.

## File Structure
- `index.html`: Contains the structural layout, dashboard, filters, and container elements.
- `style.css`: Aesthetic and layout styling, keeping a modern dashboard look.
- `script.js`: The pure Vanilla JS and D3.js logic managing data fetching, scaling, event binding, and reactivity.
- `README.md`: Project documentation.
