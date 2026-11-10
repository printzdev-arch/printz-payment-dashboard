import React from "react";
import { leafKeysOf } from "./capabilityUtils";

/**
 * The page list as tickboxes, grouped, with each menu's sub-pages shown under it.
 *
 * catalog       groups from the server: [{ group, items: [{ key, label, children? }] }]
 * selected      the ticked keys (saveable keys: pages and sub-pages)
 * onToggleKeys  called with the keys to flip: all ticked -> untick them, otherwise tick them all
 * lockedKeys    keys that are ticked and cannot be changed (for example a role's own pages)
 * disabled      nothing can be changed
 */
const Tick = ({ keys, selected, lockedKeys, disabled, onToggleKeys, children, className }) => {
  const free = keys.filter((k) => !lockedKeys.includes(k));
  const ticked = keys.filter((k) => selected.includes(k)).length;
  const frozen = disabled || free.length === 0;
  return (
    <label className={className} style={free.length === 0 && !disabled ? { opacity: 0.75 } : undefined} title={free.length === 0 && !disabled ? "From the role" : undefined}>
      <input
        type="checkbox"
        checked={ticked === keys.length}
        ref={(el) => el && (el.indeterminate = ticked > 0 && ticked < keys.length)}
        disabled={frozen}
        onChange={() => onToggleKeys(free)}
      />
      {children}
    </label>
  );
};

export default function CapabilityGrid({ catalog, selected, onToggleKeys, lockedKeys = [], disabled = false }) {
  return (
    <div className="emp-cap-grid">
      {catalog.map((group) => {
        const groupKeys = group.items.flatMap(leafKeysOf);
        return (
          <fieldset key={group.group} className="emp-cap-group" disabled={disabled}>
            <Tick keys={groupKeys} selected={selected} lockedKeys={lockedKeys} disabled={disabled} onToggleKeys={onToggleKeys} className="emp-cap-title">
              {group.group}
            </Tick>
            {group.items.map((item) =>
              item.children ? (
                <div key={item.key} className="emp-cap-menu">
                  <Tick keys={leafKeysOf(item)} selected={selected} lockedKeys={lockedKeys} disabled={disabled} onToggleKeys={onToggleKeys} className="emp-checkbox emp-cap-menu-title">
                    {item.label}
                  </Tick>
                  {item.children.map((child) => (
                    <Tick key={child.key} keys={[child.key]} selected={selected} lockedKeys={lockedKeys} disabled={disabled} onToggleKeys={onToggleKeys} className="emp-checkbox emp-cap-child">
                      {child.label}
                    </Tick>
                  ))}
                </div>
              ) : (
                <Tick key={item.key} keys={[item.key]} selected={selected} lockedKeys={lockedKeys} disabled={disabled} onToggleKeys={onToggleKeys} className="emp-checkbox">
                  {item.label}
                </Tick>
              )
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
