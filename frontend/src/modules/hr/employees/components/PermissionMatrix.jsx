import React, { useMemo } from "react";
import { leafKeysOf, availableActionsMap, allowedActionsOf } from "./capabilityUtils";

/**
 * Pages as a table with View / Create / Edit / Delete boxes (and All) for each page.
 *
 * catalog      groups from the server: [{ group, items: [{ key, label, actions, children? }] }]
 * pages        the keys that can be opened (a ticked View)
 * actions      { pageKey: ["view", "edit", ...] } for pages that are limited; a page with no entry has every action
 * onChange     (pages, actions) => void
 * lockedKeys   pages that stay open (View is fixed on), for example a role's own pages for one employee
 * disabled     nothing can be changed
 */
const COLS = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
];

export default function PermissionMatrix({ catalog, pages, actions = {}, onChange, lockedKeys = [], disabled = false }) {
  const available = useMemo(() => availableActionsMap(catalog), [catalog]);

  // Flip one action for a set of pages: all on -> off, otherwise on
  const apply = (keys, action, on) => {
    let nextPages = [...pages];
    const nextActions = { ...actions };
    keys.forEach((key) => {
      const avail = available[key] || ["view"];
      if (!avail.includes(action)) return;
      const locked = lockedKeys.includes(key);
      const desired = new Set(allowedActionsOf(key, nextPages, nextActions, avail));
      if (on) {
        desired.add(action);
        desired.add("view");
      } else if (action === "view") {
        desired.clear();
      } else {
        desired.delete(action);
      }
      if (desired.size === 0 && locked) desired.add("view");
      if (desired.size === 0) {
        nextPages = nextPages.filter((k) => k !== key);
        delete nextActions[key];
        return;
      }
      if (!nextPages.includes(key)) nextPages.push(key);
      if (desired.size === avail.length) delete nextActions[key];
      else nextActions[key] = avail.filter((a) => desired.has(a));
    });
    onChange(nextPages, nextActions);
  };

  // The tick state of an action across a set of pages: { has, on, mixed }
  const stateOf = (keys, action) => {
    const withAction = keys.filter((k) => (available[k] || ["view"]).includes(action));
    if (withAction.length === 0) return { has: false };
    const onCount = withAction.filter((k) => allowedActionsOf(k, pages, actions, available[k] || ["view"]).includes(action)).length;
    return { has: true, on: onCount === withAction.length, mixed: onCount > 0 && onCount < withAction.length, keys: withAction };
  };

  const allState = (keys) => {
    const withAny = keys.filter((k) => (available[k] || []).length > 0);
    const full = withAny.filter((k) => allowedActionsOf(k, pages, actions, available[k]).length === available[k].length).length;
    const some = withAny.filter((k) => allowedActionsOf(k, pages, actions, available[k]).length > 0).length;
    return { on: full === withAny.length && withAny.length > 0, mixed: some > 0 && full < withAny.length };
  };
  const applyAll = (keys, on) => {
    let p = [...pages];
    let a = { ...actions };
    keys.forEach((key) => {
      const avail = available[key] || ["view"];
      const locked = lockedKeys.includes(key);
      if (on) {
        if (!p.includes(key)) p.push(key);
        delete a[key];
      } else if (locked) {
        p = p.includes(key) ? p : [...p, key];
        a[key] = ["view"];
        if (avail.length === 1) delete a[key];
      } else {
        p = p.filter((k) => k !== key);
        delete a[key];
      }
    });
    onChange(p, a);
  };

  const Box = ({ keys, action }) => {
    const st = stateOf(keys, action);
    if (!st.has) return <span className="emp-mx-dash">–</span>;
    const frozen = disabled || (action === "view" && st.keys.every((k) => lockedKeys.includes(k)));
    return (
      <input
        type="checkbox"
        aria-label={action}
        checked={st.on}
        ref={(el) => el && (el.indeterminate = st.mixed)}
        disabled={frozen}
        onChange={() => apply(st.keys, action, !st.on)}
      />
    );
  };
  const AllBox = ({ keys }) => {
    const st = allState(keys);
    const frozen = disabled || keys.every((k) => lockedKeys.includes(k) && (available[k] || []).length <= 1);
    return (
      <input
        type="checkbox"
        aria-label="All"
        checked={st.on}
        ref={(el) => el && (el.indeterminate = st.mixed)}
        disabled={frozen}
        onChange={() => applyAll(keys, !st.on)}
      />
    );
  };

  const Row = ({ keys, label, kind, path }) => (
    <tr className={`emp-mx-row emp-mx-${kind}`}>
      <td className="emp-mx-name">
        <span>{label}</span>
        {path && <small>{path}</small>}
      </td>
      {COLS.map((c) => (
        <td key={c.key}>
          <Box keys={keys} action={c.key} />
        </td>
      ))}
      <td>
        <AllBox keys={keys} />
      </td>
    </tr>
  );

  return (
    <div className="emp-mx-wrap">
      <table className="emp-mx">
        <thead>
          <tr>
            <th>Page</th>
            {COLS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th>All</th>
          </tr>
        </thead>
        <tbody>
          {catalog.map((group) => {
            const groupKeys = group.items.flatMap(leafKeysOf);
            return (
              <React.Fragment key={group.group}>
                <Row keys={groupKeys} label={group.group} kind="group" />
                {group.items.map((item) =>
                  item.children ? (
                    <React.Fragment key={item.key}>
                      <Row keys={leafKeysOf(item)} label={item.label} kind="menu" />
                      {item.children.map((child) => (
                        <Row key={child.key} keys={[child.key]} label={child.label} kind="child" />
                      ))}
                    </React.Fragment>
                  ) : (
                    <Row key={item.key} keys={[item.key]} label={item.label} kind="page" />
                  )
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="emp-mx-note">A dash means that action does not exist for the page. Create, Edit and Delete need View.</p>
    </div>
  );
}
