/**
 * Helpers for the page (capability) list. The list comes from the server as groups of items; an item with
 * `children` is a menu (like Attendance) whose sub-pages are ticked on their own. Only sub-pages and plain
 * pages ("leaf" keys) are saved. Older saved lists may hold a menu's own key, which means all of its children.
 */

/** The keys that are actually saved for an item: its children, or itself. */
export const leafKeysOf = (item) => (item.children ? item.children.map((c) => c.key) : [item.key]);

/** Every saveable key in the catalog. */
export const allLeafKeys = (catalog) => catalog.flatMap((g) => g.items.flatMap(leafKeysOf));

/** key -> label, for pages and for menus. */
export const labelMap = (catalog) => {
  const map = {};
  catalog.forEach((g) =>
    g.items.forEach((i) => {
      map[i.key] = i.label;
      (i.children || []).forEach((c) => {
        map[c.key] = c.label;
      });
    })
  );
  return map;
};

/** Turn a menu's own key (from older data) into its children, so a list holds saveable keys only. */
export const expandKeys = (keys, catalog) => {
  const parents = {};
  catalog.forEach((g) => g.items.forEach((i) => i.children && (parents[i.key] = i.children.map((c) => c.key))));
  const out = [];
  (Array.isArray(keys) ? keys : []).forEach((k) => (parents[k] ? out.push(...parents[k]) : out.push(k)));
  return [...new Set(out)];
};

/** "Attendance › Daily Attendance" style names for a list of saveable keys, in catalog order. */
export const namedPages = (catalog, keys) => {
  const wanted = new Set(keys);
  const names = [];
  catalog.forEach((g) =>
    g.items.forEach((i) => {
      if (i.children) i.children.forEach((c) => wanted.has(c.key) && names.push({ group: g.group, label: `${i.label} › ${c.label}`, key: c.key }));
      else if (wanted.has(i.key)) names.push({ group: g.group, label: i.label, key: i.key });
    })
  );
  return names;
};
