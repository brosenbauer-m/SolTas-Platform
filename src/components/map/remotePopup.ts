import mapboxgl from "mapbox-gl";

import { IATI_ABOUT } from "@/lib/iati/about";

/** Summary returned by a details endpoint such as /api/projects/summary. */
export type RemotePopupDetails = {
  title: string;
  /** small label above the title, e.g. "Humanitarian project" */
  eyebrow?: string | null;
  /** imported from IATI: shows the IATI tag with its (i) */
  iati?: boolean;
  organisation?: string | null;
  place?: string | null;
  description?: string | null;
  approximate?: boolean;
  href: string;
};

export type RemotePopupOptions = {
  /** Small label above the title until the details arrive */
  badge?: string;
  ctaLabel: string;
  detailsUrl: string;
  /** Client-side navigation (router.push); without it links are plain links. */
  onNavigate?: (href: string) => void;
};

/** One project at a spot, from /api/projects/at. */
type SpotItem = { slug: string; name: string; source: string; place: string | null; organisation: string | null };
type SpotDetails = { total: number; country: string | null; items: SpotItem[] };

export type SpotPopupOptions = {
  count: number;
  approximate: boolean;
  detailsUrl: string;
  onNavigate?: (href: string) => void;
};

const truncate = (value: string, length = 220) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href: string, className: string, text: string, onNavigate?: (href: string) => void) {
  const anchor = el("a", className, text);
  anchor.href = href;
  if (onNavigate) {
    anchor.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      onNavigate(href);
    });
  }
  return anchor;
}

/** The "IATI" tag with an (i) that unfolds a short explanation inside the popup. */
export function iatiTag(container: HTMLElement, onToggle?: () => void) {
  const row = el("span", "inline-flex items-center gap-1");
  const tag = el("span", "soltas-tag-iati", "IATI");
  const info = el("button", "soltas-info-button", "i");
  info.type = "button";
  info.setAttribute("aria-label", IATI_ABOUT.title);
  info.setAttribute("aria-expanded", "false");
  row.append(tag, info);

  const panel = el("div", "hidden rounded-xl bg-soltas-off-white p-3 text-xs leading-5 text-soltas-muted");
  panel.append(el("p", "font-semibold text-soltas-text", IATI_ABOUT.title), el("p", "mt-1", IATI_ABOUT.body));
  panel.append(el("p", "mt-1", IATI_ABOUT.connection));
  const more = el("a", "mt-1 inline-block font-medium text-soltas-ocean hover:underline", `${IATI_ABOUT.linkLabel} ↗`);
  more.href = IATI_ABOUT.href;
  more.target = "_blank";
  more.rel = "noopener noreferrer";
  panel.append(more);

  info.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = panel.classList.toggle("hidden") === false;
    info.setAttribute("aria-expanded", String(open));
    onToggle?.();
  });
  container.after(panel);
  return row;
}

/** Pans the map so the whole popup is visible (clear of the legend at the top), after its content changed. */
function keepInView(map: mapboxgl.Map, popup: mapboxgl.Popup) {
  window.requestAnimationFrame(() => {
    const node = popup.getElement();
    if (!node || !popup.isOpen()) return;
    const box = node.getBoundingClientRect();
    const frame = map.getContainer().getBoundingClientRect();
    const pad = { top: 100, right: 16, bottom: 16, left: 16 };
    let dx = 0;
    let dy = 0;
    if (box.top < frame.top + pad.top) dy = box.top - frame.top - pad.top;
    else if (box.bottom > frame.bottom - pad.bottom) dy = box.bottom - frame.bottom + pad.bottom;
    if (box.left < frame.left + pad.left) dx = box.left - frame.left - pad.left;
    else if (box.right > frame.right - pad.right) dx = box.right - frame.right + pad.right;
    if (dx || dy) map.panBy([dx, dy], { duration: 300 });
  });
}

/** Rounded card, at most 380 px and never wider than the map (narrow split view, phones). */
const popupOptions = (map: mapboxgl.Map) =>
  ({
    offset: 18,
    maxWidth: `${Math.max(240, Math.min(380, map.getContainer().clientWidth - 32))}px`,
    className: "soltas-popup",
    focusAfterOpen: false,
  }) as const;

/** Opens a popup at a point and fills it from a details endpoint (title, organisation, place, link). */
export function openRemotePopup(map: mapboxgl.Map, lngLat: [number, number], options: RemotePopupOptions) {
  const node = el("div", "space-y-2 text-sm text-soltas-text");
  const head = el("div", "flex min-h-5 flex-wrap items-center gap-2");
  const badge = el("p", "text-xs font-medium uppercase tracking-wide text-soltas-muted", options.badge ?? "");
  head.appendChild(badge);
  const loading = el("p", "text-sm text-soltas-muted", "Loading…");
  node.append(head, loading);

  const popup = new mapboxgl.Popup(popupOptions(map)).setLngLat(lngLat).setDOMContent(node).addTo(map);

  fetch(options.detailsUrl)
    .then((res) => (res.ok ? (res.json() as Promise<RemotePopupDetails>) : Promise.reject(res.status)))
    .then((details) => {
      loading.remove();
      if (details.eyebrow) badge.textContent = details.eyebrow;
      if (details.iati) head.appendChild(iatiTag(head, () => keepInView(map, popup)));
      node.appendChild(el("h3", "text-[17px] font-semibold leading-snug tracking-tight text-soltas-text", details.title));

      const meta = [details.organisation, details.place].filter(Boolean).join(" · ");
      if (meta) {
        node.appendChild(
          el("p", "text-[13px] font-medium text-soltas-muted", details.approximate ? `${meta} (country only)` : meta),
        );
      }
      if (details.description) {
        node.appendChild(el("p", "line-clamp-4 text-sm leading-6 text-soltas-muted", truncate(details.description)));
      }
      node.appendChild(link(details.href, "soltas-popup-cta", options.ctaLabel, options.onNavigate));
      keepInView(map, popup);
    })
    .catch(() => {
      loading.textContent = "Couldn’t load this project.";
    });

  return popup;
}

/** Opens a popup listing the projects at one spot (several projects with the same coordinates). */
export function openSpotPopup(map: mapboxgl.Map, lngLat: [number, number], options: SpotPopupOptions) {
  const node = el("div", "space-y-3 text-sm text-soltas-text");
  node.appendChild(
    el("h3", "text-[17px] font-semibold tracking-tight text-soltas-text", `${options.count.toLocaleString("en")} projects here`),
  );
  const note = el(
    "p",
    "text-[13px] leading-5 text-soltas-muted",
    options.approximate
      ? "Only the country is known for these, so they share its centre on the map."
      : "These projects share the same location.",
  );
  node.appendChild(note);
  const loading = el("p", "text-sm text-soltas-muted", "Loading…");
  node.appendChild(loading);

  const popup = new mapboxgl.Popup(popupOptions(map)).setLngLat(lngLat).setDOMContent(node).addTo(map);

  fetch(options.detailsUrl)
    .then((res) => (res.ok ? (res.json() as Promise<SpotDetails>) : Promise.reject(res.status)))
    .then((details) => {
      loading.remove();
      if (details.country && options.approximate) {
        note.textContent = `Only the country is known for these, so they share the centre of ${details.country}.`;
      }
      const list = el("ul", "soltas-popup-list");
      for (const item of details.items) {
        const row = el("li", "");
        const href = `/projects/${encodeURIComponent(item.slug)}`;
        const anchor = link(href, "block rounded-xl px-3 py-2 hover:bg-soltas-off-white", "", options.onNavigate);
        const title = el("span", "flex items-start justify-between gap-2");
        title.append(el("span", "font-medium leading-snug text-soltas-text", item.name));
        if (item.source === "iati") title.append(el("span", "soltas-tag-iati shrink-0", "IATI"));
        anchor.append(title);
        const meta = [item.organisation, options.approximate ? null : item.place].filter(Boolean).join(" · ");
        if (meta) anchor.append(el("span", "mt-0.5 block text-xs text-soltas-muted", meta));
        row.appendChild(anchor);
        list.appendChild(row);
      }
      node.appendChild(list);
      if (details.total > details.items.length) {
        const rest = details.total - details.items.length;
        const more = details.country
          ? link(
              `/projects?country=${encodeURIComponent(details.country)}`,
              "soltas-popup-cta",
              `See all ${details.total.toLocaleString("en")} in ${details.country}`,
              options.onNavigate,
            )
          : el("p", "text-xs text-soltas-muted", `and ${rest.toLocaleString("en")} more. Use the filters to narrow them down.`);
        node.appendChild(more);
      }
      keepInView(map, popup);
    })
    .catch(() => {
      loading.textContent = "Couldn’t load these projects.";
    });

  return popup;
}
