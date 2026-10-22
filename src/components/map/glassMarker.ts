/**
 * A single map marker in the frosted-glass style of the project circles (see .soltas-map-glass in globals.css),
 * with a coloured core for its type. Returns the element for a mapboxgl.Marker.
 */
export function glassMarker(color: string, label: string) {
  const root = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "soltas-map-glass soltas-map-glass--point";
  button.style.setProperty("--glass-size", "24px");
  button.setAttribute("aria-label", label);
  button.title = label;
  const core = document.createElement("span");
  core.className = "soltas-map-glass__core";
  core.style.background = color;
  core.style.borderColor = color;
  button.appendChild(core);
  root.appendChild(button);
  return root;
}
