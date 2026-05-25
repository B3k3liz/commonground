# CommonGround — Homestead & Co-op OS (MVP)

CommonGround is a beautiful, premium, and highly interactive digital operating system designed for homesteads, eco-villages, and collaborative community groups. It coordinates chores, tracks resources, and plans crop growth stages so the community can run efficiently and fund their goals (like retirement and homestead expansion).

This initial MVP focuses on a visually spectacular **Forest Dark Mode** interface housing an **Interactive Co-op Task Board** and a **Crop Growth Planner**.

---

## 🌲 Features Included in this MVP

1.  **Homestead Dashboard**:
    *   **Live Metrics**: Dynamic counts of active crops, pending chores, tools currently checked out, and community marketplace earnings.
    *   **Urgent action checklist**: Shows immediate, high-priority homestead chores assigned to community members.
    *   **Live Activity Feed**: Captures real-time activities across the farm (e.g. planting, watering, and task completions).
    *   **Weather Panel**: Displays current local conditions and recommends agricultural actions (e.g. optimal soil watering times).
2.  **Crop Growth Planner**:
    *   **Dynamic Grow Progress Bars**: Math-calculated growth percentages based on planting dates and variety durations.
    *   **Crop Actions**: One-click watering logs, and a dynamic "Harvest" trigger that unlocks when a crop hits 100% completion.
    *   **Search Engine**: Real-time filtering by crop name or variety.
    *   **Planting Modal**: Form to easily add new crops to the soil bed calendar.
3.  **Co-op Kanban Task Board**:
    *   **Natively Draggable Cards**: Drag and drop tasks smoothly between **To Do**, **In Progress**, and **Completed** columns.
    *   **Custom Tags & Priorities**: Visual cards tagged by category (Gardening, Livestock, Building, General) and color-coded priority levels.
    *   **Chore Assignee Avatar**: Displays who is responsible for each chore.
    *   **Chore Filters**: Instant dropdown filtering by priority levels and operations.

---

## 🛠️ Technology Stack & Architecture

*   **HTML5**: Semantically written structure with fully embedded custom SVG vector iconography (works 100% offline, zero CDN latency).
*   **Vanilla CSS**: Custom pine, amber, and warm terracotta clay HSL colors with high-end glassmorphic card stylings (`backdrop-filter`) and fluid micro-transitions.
*   **Vanilla JavaScript**: Zero heavy libraries or node compilation dependencies. Implements direct state-to-view synchronization, custom math growth dates, and native HTML Drag & Drop APIs.
*   **LocalStorage Persistence**: All additions, chore drag movements, deletions, and watering logs are stored directly inside the browser's storage, keeping your edits safe across restarts.

---

## 🚀 How to Run the App

1.  **Open in your Browser**:
    *   Simply double-click the `index.html` file or drag it directly into any modern web browser (Chrome, Firefox, Safari, Edge).
    *   No local server or installation is required!
2.  **Set as Active Workspace (Recommended)**:
    *   For the best development experience and to build new features (like the livestock logs or market manager) together, open the project directory in your editor and set `C:\Users\Bekah\.gemini\antigravity\scratch\commonground` as your active workspace.
