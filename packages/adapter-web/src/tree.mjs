// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI tree ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI tree ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI tree ${key} must be a string`);
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI tree ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: props.value ?? "",
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onValueChange: optionalCallback(props, "onValueChange"),
    onExpandedChange: optionalCallback(props, "onExpandedChange"),
    onNodeActivate: optionalCallback(props, "onNodeActivate"),
  };
  if (typeof normalized.value !== "string") throw new TypeError("GUI tree value must be a string");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

function normalizeItemProps(props = {}) {
  const value = props.value;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("GUI tree item value must be a non-empty string");
  }
  const label = optionalString(props, "label");
  const accessibilityLabel = optionalString(props, "accessibilityLabel");
  const icon = optionalString(props, "icon");
  if (label.trim() === "" && accessibilityLabel.trim() === "") {
    throw new TypeError("GUI tree item requires a label or accessibilityLabel");
  }
  return {
    value,
    label,
    accessibilityLabel,
    icon,
    expanded: optionalBoolean(props, "expanded"),
    branch: optionalBoolean(props, "branch"),
    disabled: optionalBoolean(props, "disabled"),
  };
}

function directTreeNodes(container) {
  return [...container.children].filter((child) => child?.dataset?.guiTreeNode === "true");
}

function allTreeNodes(container) {
  const result = [];
  function visit(current) {
    for (const child of current.children ?? []) {
      if (child?.dataset?.guiTreeNode === "true") result.push(child);
      visit(child);
    }
  }
  visit(container);
  return result;
}

function nodeValue(node) {
  return node.dataset.guiTreeValue ?? "";
}

function nodeOwnDisabled(node) {
  return node.dataset.guiTreeDisabled === "true";
}

function nodeExpanded(node) {
  return node.dataset.guiTreeExpanded === "true";
}

function nodeOwnBranch(node) {
  return node.dataset.guiTreeBranch === "true";
}

function nodeGroup(node) {
  return [...node.children].find((child) => child?.dataset?.guiTreeGroup === "true") ?? null;
}

function nodeItem(node) {
  return [...node.children].find((child) => child?.dataset?.guiTreeItem === "true") ?? null;
}

function nodeDisclosure(node) {
  return nodeItem(node)?.children
    ? [...nodeItem(node).children].find((child) => child?.dataset?.guiTreeDisclosure === "true") ?? null
    : null;
}

function isBranch(node) {
  const group = nodeGroup(node);
  return nodeOwnBranch(node) || (group !== null && directTreeNodes(group).length > 0);
}

function closestNode(target, root) {
  let current = target;
  while (current && current !== root) {
    if (current.dataset?.guiTreeNode === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

function isDescendantOfItem(target, node) {
  const item = nodeItem(node);
  let current = target;
  while (current && current !== node) {
    if (current === item) return true;
    current = current.parentNode ?? null;
  }
  return false;
}

function parentTreeNode(node, root) {
  let current = node.parentNode ?? null;
  while (current && current !== root) {
    if (current.dataset?.guiTreeNode === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

function isVisibleNode(node, root) {
  let current = node.parentNode ?? null;
  while (current && current !== root) {
    if (current.hidden === true) return false;
    current = current.parentNode ?? null;
  }
  return true;
}

/**
 * Creates one controlled tree node. `branch` is structural adapter metadata;
 * nested nodes appended to groupElement also make the item a branch. Expansion
 * is caller-owned and changes only after update({ expanded }) plus refreshItems().
 */
export function createGuiTreeItem(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTreeItem requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  element.className = "gui-tree__node";
  element.setAttribute("role", "treeitem");

  const itemElement = document.createElement("div");
  itemElement.className = "gui-tree__item";
  itemElement.dataset.guiTreeItem = "true";

  const disclosureElement = document.createElement("span");
  disclosureElement.className = "gui-tree__disclosure";
  disclosureElement.dataset.guiTreeDisclosure = "true";
  disclosureElement.setAttribute("aria-hidden", "true");

  const iconElement = document.createElement("span");
  iconElement.className = "gui-tree__icon";
  iconElement.setAttribute("aria-hidden", "true");

  const labelElement = document.createElement("span");
  labelElement.className = "gui-tree__label";

  const groupElement = document.createElement("div");
  groupElement.className = "gui-tree__group";
  groupElement.dataset.guiTreeGroup = "true";
  groupElement.setAttribute("role", "group");

  itemElement.append(disclosureElement);
  itemElement.append(iconElement);
  itemElement.append(labelElement);
  element.append(itemElement);
  element.append(groupElement);

  let props = normalizeItemProps(initialProps);

  function render() {
    element.dataset.guiTreeNode = "true";
    element.dataset.guiTreeValue = props.value;
    element.dataset.guiTreeDisabled = props.disabled ? "true" : "false";
    element.dataset.guiTreeExpanded = props.expanded ? "true" : "false";
    element.dataset.guiTreeBranch = props.branch ? "true" : "false";
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
    iconElement.textContent = props.icon;
    iconElement.hidden = props.icon === "";
    labelElement.textContent = props.label;
    labelElement.hidden = props.label === "";
    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }

  render();

  return {
    element,
    itemElement,
    disclosureElement,
    iconElement,
    labelElement,
    groupElement,
    update(nextProps = {}) {
      props = normalizeItemProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

/**
 * Creates a controlled single-selection Tree using ARIA tree/treeitem/group
 * semantics. Focus roves only across visible enabled nodes. Arrow keys manage
 * hierarchy focus/expansion requests; Space requests selection and Enter emits
 * node activation. Expansion never animates implicitly.
 */
export function createGuiTree(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTree requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  element.className = "gui-tree";
  element.setAttribute("role", "tree");

  let props = normalizeProps(initialProps);
  let focusValue = null;

  function effectiveDisabled(node) {
    return props.disabled || nodeOwnDisabled(node);
  }

  function syncBranch(node) {
    const group = nodeGroup(node);
    const disclosure = nodeDisclosure(node);
    const branch = isBranch(node);
    const expanded = branch && nodeExpanded(node);
    if (branch) node.setAttribute("aria-expanded", expanded ? "true" : "false");
    else node.removeAttribute("aria-expanded");
    if (group) group.hidden = !expanded;
    if (disclosure) {
      disclosure.textContent = branch ? (expanded ? "▾" : "▸") : "";
      disclosure.dataset.guiTreePlaceholder = branch ? "false" : "true";
    }
  }

  function visibleEnabledNodes() {
    return allTreeNodes(element).filter((node) => isVisibleNode(node, element) && !effectiveDisabled(node));
  }

  function syncItems() {
    const nodes = allTreeNodes(element);
    for (const node of nodes) syncBranch(node);

    const visibleEnabled = visibleEnabledNodes();
    const validFocus = visibleEnabled.find((node) => nodeValue(node) === focusValue) ?? null;
    const selectedFocus = visibleEnabled.find((node) => nodeValue(node) === props.value) ?? null;
    const nextFocus = validFocus ?? selectedFocus ?? visibleEnabled[0] ?? null;
    focusValue = nextFocus ? nodeValue(nextFocus) : null;

    for (const node of nodes) {
      const selected = nodeValue(node) === props.value;
      const disabled = effectiveDisabled(node);
      node.setAttribute("aria-selected", selected ? "true" : "false");
      node.setAttribute("aria-disabled", disabled ? "true" : "false");
      node.tabIndex = !disabled && isVisibleNode(node, element) && nodeValue(node) === focusValue ? 0 : -1;
    }
  }

  function render() {
    element.dataset.guiComponent = "tree";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    syncItems();
  }

  function focusNode(node) {
    if (!node || effectiveDisabled(node) || !isVisibleNode(node, element)) return;
    focusValue = nodeValue(node);
    syncItems();
    node.focus?.();
  }

  function requestSelection(node) {
    const nextValue = nodeValue(node);
    focusValue = nextValue;
    syncItems();
    if (nextValue !== props.value) props.onValueChange?.(nextValue);
  }

  function click(event) {
    const node = closestNode(event.target, element);
    if (!node || effectiveDisabled(node) || !isVisibleNode(node, element)) return;
    const disclosure = nodeDisclosure(node);
    if (event.target === disclosure) {
      if (isBranch(node)) props.onExpandedChange?.(nodeValue(node));
      return;
    }
    if (!isDescendantOfItem(event.target, node)) return;
    requestSelection(node);
  }

  function doubleClick(event) {
    const node = closestNode(event.target, element);
    if (!node || effectiveDisabled(node) || !isVisibleNode(node, element)) return;
    if (!isDescendantOfItem(event.target, node)) return;
    focusValue = nodeValue(node);
    syncItems();
    props.onNodeActivate?.(nodeValue(node));
  }

  function keydown(event) {
    const node = closestNode(event.target, element);
    if (!node || effectiveDisabled(node) || !isVisibleNode(node, element)) return;
    const visible = visibleEnabledNodes();
    const index = visible.indexOf(node);
    if (index < 0) return;

    let handled = true;
    if (event.key === "ArrowDown") focusNode(visible[Math.min(index + 1, visible.length - 1)]);
    else if (event.key === "ArrowUp") focusNode(visible[Math.max(index - 1, 0)]);
    else if (event.key === "Home") focusNode(visible[0]);
    else if (event.key === "End") focusNode(visible[visible.length - 1]);
    else if (event.key === "ArrowRight") {
      if (!isBranch(node)) handled = false;
      else if (!nodeExpanded(node)) props.onExpandedChange?.(nodeValue(node));
      else {
        const child = directTreeNodes(nodeGroup(node)).find((candidate) => !effectiveDisabled(candidate));
        if (child) focusNode(child);
      }
    } else if (event.key === "ArrowLeft") {
      if (isBranch(node) && nodeExpanded(node)) props.onExpandedChange?.(nodeValue(node));
      else {
        const parent = parentTreeNode(node, element);
        if (parent) focusNode(parent);
        else handled = false;
      }
    } else if (event.key === " " || event.key === "Spacebar") requestSelection(node);
    else if (event.key === "Enter") props.onNodeActivate?.(nodeValue(node));
    else handled = false;

    if (handled) event.preventDefault?.();
  }

  function focusIn(event) {
    const node = closestNode(event.target, element);
    if (!node || effectiveDisabled(node) || !isVisibleNode(node, element)) return;
    focusValue = nodeValue(node);
    syncItems();
  }

  element.addEventListener("click", click);
  element.addEventListener("dblclick", doubleClick);
  element.addEventListener("keydown", keydown);
  element.addEventListener("focusin", focusIn);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    refreshItems() {
      syncItems();
    },
    destroy() {
      element.removeEventListener("click", click);
      element.removeEventListener("dblclick", doubleClick);
      element.removeEventListener("keydown", keydown);
      element.removeEventListener("focusin", focusIn);
    },
  };
}
