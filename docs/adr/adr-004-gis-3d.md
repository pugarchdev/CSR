# ADR-004: GIS and 3D Web Experience Implementation

## Status
Approved

## Context
The landing page and analytical dashboard must deliver an impressive, interactive visual experience representing corporate social responsibility projects across Maharashtra's 36 districts. Plain text or standard flat chart representations do not meet modern user expectations for design depth.

## Decision
1. **Interactive 3D Impact Visualizer**: We will build an interactive WebGL canvas on the landing page using Three.js (or React Three Fiber).
   - This features a spinning "Impact Sphere" consisting of glowing particle nodes.
   - Each node cluster represents a CSR theme (Education, Water Conservation, Health, Rural Development).
   - Users can drag, rotate, and click node clusters, which filters the underlying Project Marketplace dynamically.
2. **Maharashtra GIS Interactive Map**:
   - A fully responsive SVG choropleth map of Maharashtra (comprising all 36 districts like Mumbai, Pune, Nagpur, Gadchiroli).
   - Custom CSS gradients and glassmorphism cards overlays (backdrop blur, subtle border lines).
   - Framer Motion animation triggers on mouse-enter/hover to scale path structures and open rich floating stat popups.
3. **Typography and Layout Rules**:
   - Primary typeface: Google Fonts `Outfit` (for futuristic headings) and `Inter` (for readability).
   - Theme colors: curated slate/zinc dark mode, paired with warm glowing violet/indigo accents.

## Consequences
- Requires WebGL-capable client browsers (standard on modern devices).
- Elevated visual aesthetics that make the landing page feel extremely premium and modern.
- Clear geographical visual cues on funding distribution across districts.
