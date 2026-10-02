# Project File Documentation

This document describes the files in the GreenWear prototype project and explains the functions of each file.

1. index.html
   - Main entry point and layout container.
   - Structures camera viewport, target design brackets, and control HUD.
   - Defines dashboard segments for clothing catalog and carbon indicators.
   - Holds structural wrapper for saved wardrobe history list.

2. css/style.css
   - Sets general layouts, flex variables, and viewport limits.
   - Styles camera overlays, tracking indicators, and scanning banners.
   - Configures animated circular stats rings for savings metrics.
   - Formats product cards, history list drawers, and ownership badges.

3. js/products.js
   - Functions as the local mock product database.
   - Stores name, category, fiber description, and asset paths.
   - Maintains water savings percentages and carbon footprint metrics.
   - Maps category match rules, color tags, and color names.

4. js/api.js
   - Simulates backend database connection behavior.
   - Provides product lookup with a 1 second async delay.
   - Houses matching rules for category and color compatibility.
   - Returns suggested matching garment with ownership states.

5. js/ar.js
   - Drives overall prototype lifecycle logic.
   - Coordinates camera access permissions and mirror options.
   - Controls simulated 2.2 second scan delays before loading data.
   - Automatically populates HTML cards, dashboard specs, and lists.
   - Runs MediaPipe Pose tracker to draw overlay clothes on coordinates.
   - Saves successfully scanned items to localStorage history list.

6. js/main.js
   - Idle placeholder file for future setup.

7. FILES.md
   - Lists and explains codebase files and directories.

8. GreenWear.pdf
   - Implementation plan guide detailing schedule, flows, and database designs.

9. .gitignore
   - Prevents temporary system files from being tracked by git.
