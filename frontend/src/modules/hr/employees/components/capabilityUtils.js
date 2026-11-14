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

/** key -> the actions that page has ("view" first), from the server's catalog. Pages with no list get all four. */
export const availableActionsMap = (catalog) => {
  const map = {};
  const put = (item) => {
    map[item.key] = Array.isArray(item.actions) && item.actions.length > 0 ? item.actions : ["view", "create", "edit", "delete"];
  };
  catalog.forEach((g) =>
    g.items.forEach((i) => {
      if (i.children) i.children.forEach(put);
      else put(i);
    })
  );
  return map;
};

/** What a person can do on a page now: nothing if the page is not ticked; every action unless the page has its own list. */
export const allowedActionsOf = (key, pages, actions, available) => {
  if (!pages.includes(key)) return [];
  const listed = actions && Array.isArray(actions[key]) ? actions[key] : null;
  return available.filter((a) => a === "view" || !listed || listed.includes(a));
};

/** True when two action maps give the same result for these pages. */
export const sameActions = (pages, a, b, availableMap) =>
  pages.every((key) => {
    const avail = availableMap[key] || ["view"];
    const x = allowedActionsOf(key, pages, a, avail).join(",");
    const y = allowedActionsOf(key, pages, b, avail).join(",");
    return x === y;
  });
