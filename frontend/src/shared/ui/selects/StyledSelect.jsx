import React from "react";
import SelectField from "./SelectField";

// Collect <option> elements, including ones inside fragments and .map() lists
const collectOptions = (children, out = []) => {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      collectOptions(child.props.children, out);
      return;
    }
    if (child.type === "option") {
      const label = React.Children.toArray(child.props.children).join("");
      out.push({ value: child.props.value !== undefined ? child.props.value : label, label, disabled: child.props.disabled });
    } else if (child.type === "optgroup") {
      collectOptions(child.props.children, out);
    }
  });
  return out;
};

// Only layout bits of a native select's inline style belong on the outer box
const BOX_KEYS = ["width", "minWidth", "maxWidth", "flex", "flexGrow", "flexShrink", "flexBasis", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "alignSelf", "gridColumn"];
const boxStyle = (style) => {
  if (!style) return undefined;
  const out = {};
  BOX_KEYS.forEach((k) => {
    if (style[k] !== undefined) out[k] = style[k];
  });
  return out;
};
// A small native select (30-36px tall, e.g. inside a table row) becomes the compact dropdown
const isSmall = (style) => {
  const h = parseFloat(style?.height);
  return Number.isFinite(h) && h <= 36;
};

/**
 * Drop-in for a native <select>: same props (value, onChange, disabled, name) and the same <option> children,
 * drawn with the shared dropdown. Layout bits of `style` go on the outer box; `className` is ignored.
 */
export default function StyledSelect({ children, value, onChange, disabled, name, style, searchable, placeholder, compact, alignRight }) {
  const options = collectOptions(children).filter((o) => !o.disabled || String(o.value) === String(value));
  const blank = options.find((o) => String(o.value) === "");
  return (
    <SelectField
      value={value === undefined || value === null ? "" : value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      name={name}
      style={boxStyle(style)}
      searchable={searchable}
      alignRight={alignRight}
      compact={compact !== undefined ? compact : isSmall(style)}
      placeholder={placeholder || (blank ? blank.label : "Select")}
    />
  );
}
