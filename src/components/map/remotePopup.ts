import mapboxgl from "mapbox-gl";

/** Summary returned by a details endpoint such as /api/iati/activity. */
export type RemotePopupDetails = {
  title: string;
  organisation?: string | null;
  place?: string | null;
  description?: string | null;
  approximate?: boolean;
  href: string;
};

export type RemotePopupOptions = {
  /** Small label above the title, e.g. "Published to IATI" */
  badge: string;
  ctaLabel: string;
  detailsUrl: string;
  /** Client-side navigation (router.push); without it the button is a plain link. */
  onNavigate?: (href: string) => void;
};

const truncate = (value: string, length = 160) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

/** Opens a popup at a point and fills it from a details endpoint (title, organisation, place, link). */
export function openRemotePopup(map: mapboxgl.Map, lngLat: [number, number], options: RemotePopupOptions) {
  const node = document.createElement("div");
  node.className = "space-y-2 text-sm text-soltas-text";
  const badge = document.createElement("p");
  badge.className = "text-[11px] font-semibold uppercase tracking-wide text-soltas-muted";
  badge.textContent = options.badge;
  const loading = document.createElement("p");
  loading.className = "text-sm text-soltas-muted";
  loading.textContent = "Loading…";
  node.append(badge, loading);

  const popup = new mapboxgl.Popup({ offset: 10, maxWidth: "320px" }).setLngLat(lngLat).setDOMContent(node).addTo(map);

  fetch(options.detailsUrl)
    .then((res) => (res.ok ? (res.json() as Promise<RemotePopupDetails>) : Promise.reject(res.status)))
    .then((details) => {
      loading.remove();
      const title = document.createElement("h3");
      title.className = "text-base font-semibold text-soltas-text";
      title.textContent = details.title;
      node.appendChild(title);

      const meta = [details.organisation, details.place].filter(Boolean).join(" · ");
      if (meta) {
        const metaEl = document.createElement("p");
        metaEl.className = "text-xs font-medium text-soltas-muted";
        metaEl.textContent = details.approximate ? `${meta} (approximate location)` : meta;
        node.appendChild(metaEl);
      }
      if (details.description) {
        const description = document.createElement("p");
        description.className = "text-sm leading-snug text-soltas-muted";
        description.textContent = truncate(details.description);
        node.appendChild(description);
      }
      const cta = document.createElement("a");
      cta.href = details.href;
      cta.className =
        "mt-2 inline-flex w-full items-center justify-center rounded-md bg-soltas-ocean px-3 py-2 text-xs font-medium text-white hover:bg-soltas-abyssal";
      cta.textContent = options.ctaLabel;
      if (options.onNavigate) {
        cta.addEventListener("click", (event) => {
          event.preventDefault();
          options.onNavigate?.(details.href);
        });
      }
      node.appendChild(cta);
    })
    .catch(() => {
      loading.textContent = "Couldn’t load this activity.";
    });

  return popup;
}
