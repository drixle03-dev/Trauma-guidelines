"use client";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

/* eslint-disable @next/next/no-img-element */ // keep <img> for the zoom stage

// ---------- Types ----------
export type GuidelineItem = {
  id: string;
  title: string;
  category: string;
  src: string;
  tags?: string[];
  note?: string;
};

// ---------- Data (update filenames if you use different names) ----------
const SAMPLE_DATA: GuidelineItem[] = [
  {
    id: "trauma-circulation",
    title:
      "Circulation Cognitive Aide – TXA, Pelvic Binder, Fluids & Vasopressors",
    category: "Circulation",
    src: "/guidelines/trauma_circulation.jpg",
    tags: ["TXA", "pelvic binder", "fluid resuscitation", "vasopressor", "hemorrhage"],
    note: "Stopping internal bleeding + prehospital fluids and pressors.",
  },
  {
    id: "trauma-disability",
    title: "Disability Cognitive Aide – NEXUS & Glasgow Coma Scale",
    category: "Disability",
    src: "/guidelines/trauma_disability.jpg",
    tags: ["NEXUS", "c-spine", "GCS", "neuro"],
    note: "C-spine decision rule with full GCS table.",
  },
  {
    id: "trauma-reassessment",
    title: "Frequent Reassessment Cognitive Aide – Trauma Deterioration",
    category: "Reassessment",
    src: "/guidelines/trauma_reassessment.jpg",
    tags: ["shock index", "vitals", "trend", "mortality"],
    note: "Early vital thresholds, shock index → actions.",
  },
  {
    id: "trauma-bypass",
    title: "Trauma Bypass Criteria",
    category: "Bypass",
    src: "/guidelines/trauma_bypass.jpg",
    tags: ["triage", "criteria", "mechanism", "anatomic", "special considerations"],
    note: "MOI, vitals/LOC, anatomic & special considerations.",
  },
  {
    id: "trauma-checklist",
    title: "Ongoing Trauma Care Checklist",
    category: "Checklist",
    src: "/guidelines/trauma_checklist.jpg",
    tags: ["CABDEFGH", "TBI", "neuroprotection", "ongoing care"],
    note: "CABDEFGH with TBI neuroprotection callouts.",
  },
];

// ---------- Helpers ----------
const cls = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

const useLocalStorage = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
};

// ---------- Main Component ----------
export default function GuidelinesLibrary({
  items = SAMPLE_DATA,
}: {
  items?: GuidelineItem[];
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useLocalStorage<string>("gl-category", "All");
  const [favorites, setFavorites] = useLocalStorage<string[]>("gl-favs", []);
  const [active, setActive] = useState<GuidelineItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panning, setPanning] = useState({ x: 0, y: 0 });
  const [isDragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  );

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((i) => {
      const inCategory = category === "All" || i.category === category;
      if (!text) return inCategory;
      const hay = [i.title, i.category, i.note, ...(i.tags || [])]
        .join(" ")
        .toLowerCase();
      return inCategory && hay.includes(text);
    });
  }, [items, q, category]);

  // Ensure an active item exists and stays in filtered set
  useEffect(() => {
    if (filtered.length === 0) {
      if (active) setActive(null);
      return;
    }
    if (!active) {
      setActive(filtered[0]);
      return;
    }
    if (!filtered.some((i) => i.id === active.id)) {
      setActive(filtered[0] ?? null);
    }
  }, [filtered, active]);

  const open = (item: GuidelineItem) => {
    setActive(item);
    setZoom(1);
    setRotation(0);
    setPanning({ x: 0, y: 0 });
  };

  const toggleFav = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // NAV: memoized so we can include in deps
  const nav = useCallback(
    (dir: 1 | -1) => {
      if (!active) return;
      const idx = filtered.findIndex((x) => x.id === active.id);
      const next = filtered.at(idx + dir);
      if (next) open(next);
    },
    [active, filtered]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setActive(null);
      if (active) {
        if (e.key === "ArrowRight") nav(1);
        if (e.key === "ArrowLeft") nav(-1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, nav]);

  // Zoom / pan handlers
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!active) return;
    const delta = -e.deltaY;
    setZoom((z) => {
      const next = Math.min(8, Math.max(0.5, z + delta * 0.0015));
      return Number(next.toFixed(3));
    });
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!active) return;
    setDragging(true);
    dragOrigin.current = { x: e.clientX - panning.x, y: e.clientY - panning.y };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!active || !isDragging || !dragOrigin.current) return;
    setPanning({
      x: e.clientX - dragOrigin.current.x,
      y: e.clientY - dragOrigin.current.y,
    });
  };
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchOrigin.current = { x: t.clientX - panning.x, y: t.clientY - panning.y };
    }
  };
  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 1 && touchOrigin.current) {
      const t = e.touches[0];
      setPanning({
        x: t.clientX - touchOrigin.current.x,
        y: t.clientY - touchOrigin.current.y,
      });
    }
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    touchOrigin.current = null;
  };

  const downloadActive = () => {
    if (!active) return;
    const a = document.createElement("a");
    a.href = active.src;
    a.download = `${active.title.replace(/\s+/g, "_")}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70 border-b border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Trauma Guidelines</h1>
              <p className="text-xs text-neutral-400 -mt-0.5">
                Search · Filter · View · Download
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (title, tags)…  Press / to focus"
              className="flex-1 md:w-80 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-emerald-400"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm"
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Tabs + Inline Viewer */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-neutral-400 text-sm">
            No results. Try a different search or category.
          </div>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Guidelines"
              className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
            >
              {filtered.map((item) => {
                const isActive = active?.id === item.id;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => open(item)}
                    className={cls(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs sm:text-sm transition truncate max-w-[16rem]",
                      isActive
                        ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                        : "border-neutral-700 text-neutral-300 bg-neutral-900 hover:border-neutral-500"
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>

            {active && (
              <div className="mt-4">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-2xl bg-neutral-900/90 border border-b-0 border-neutral-800 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <strong className="truncate max-w-[40vw] sm:max-w-[24rem]">
                      {active.title}
                    </strong>
                    <span className="text-neutral-400 hidden sm:inline">
                      · {active.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => nav(-1)} className="rounded-lg border border-neutral-700 px-2 py-1">
                      ← Prev
                    </button>
                    <button onClick={() => nav(1)} className="rounded-lg border border-neutral-700 px-2 py-1">
                      Next →
                    </button>
                    <span className="mx-2 hidden sm:inline text-neutral-500">|</span>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="rounded-lg border border-neutral-700 px-2 py-1"
                    >
                      −
                    </button>
                    <span className="min-w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(8, z + 0.25))}
                      className="rounded-lg border border-neutral-700 px-2 py-1"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        setZoom(1);
                        setPanning({ x: 0, y: 0 });
                        setRotation(0);
                      }}
                      className="rounded-lg border border-neutral-700 px-2 py-1"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="rounded-lg border border-neutral-700 px-2 py-1"
                    >
                      Rotate
                    </button>
                    <button
                      onClick={() => toggleFav(active.id)}
                      className="rounded-lg border border-neutral-700 px-2 py-1"
                    >
                      {favorites.includes(active.id) ? "★ Unfav" : "☆ Fav"}
                    </button>
                    <button onClick={downloadActive} className="rounded-lg border border-neutral-700 px-2 py-1">
                      Download
                    </button>
                  </div>
                </div>

                {/* Stage */}
                <div
                  className="relative h-[70vh] overflow-hidden rounded-b-2xl bg-neutral-950 border border-neutral-800"
                  onWheel={onWheel}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `translate(-50%, -50%) translate(${panning.x}px, ${panning.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={active.src}
                      alt={active.title}
                      className="max-h-[80vh] max-w-[90vw] select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal removed in favor of inline tab viewer */}

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-neutral-500">
        <p className="mb-2">Tips</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Press <kbd className="rounded bg-neutral-800 px-1">/</kbd> to focus search.{" "}
            <kbd className="rounded bg-neutral-800 px-1">Esc</kbd> closes the viewer.
          </li>
          <li>Use mouse wheel (or pinch) to zoom; drag to pan; rotate in 90° steps.</li>
          <li>Favorites and last category are saved locally on your device.</li>
        </ul>
      </footer>
    </div>
  );
}
