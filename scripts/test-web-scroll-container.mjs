// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiScrollContainer } from "../packages/adapter-web/src/scroll-container.mjs";

class FakeElement {
  constructor(tagName) { this.tagName=tagName.toUpperCase(); this.className=""; this.dataset={}; this.attributes=new Map(); this.children=[]; this.scrollTop=0; this.scrollLeft=0; }
  append(...children) { this.children.push(...children); }
  setAttribute(name,value) { this.attributes.set(name,String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
}
class FakeDocument { createElement(tagName) { return new FakeElement(tagName); } }

const document = new FakeDocument();
const viewport = createGuiScrollContainer(document, { accessibilityLabel:"Activity log", variant:"both", size:"large" });
assert.equal(viewport.element.tagName,"DIV");
assert.equal(viewport.element.dataset.guiComponent,"scroll-container");
assert.equal(viewport.element.dataset.guiVariant,"both");
assert.equal(viewport.element.dataset.guiSize,"large");
assert.equal(viewport.element.getAttribute("role"),"region");
assert.equal(viewport.element.getAttribute("aria-label"),"Activity log");
assert.equal(viewport.element.getAttribute("tabindex"),"0");
assert.equal(viewport.contentElement.className,"gui-scroll-container__content");
assert.equal(viewport.element.children[0],viewport.contentElement);

viewport.element.scrollTop=37; viewport.element.scrollLeft=19;
viewport.update({ variant:"horizontal", size:"small", accessibilityLabel:"", keyboardFocusable:false });
assert.equal(viewport.element.dataset.guiVariant,"horizontal");
assert.equal(viewport.element.dataset.guiSize,"small");
assert.equal(viewport.element.getAttribute("role"),null,"unlabelled scroll containers must not create unnamed region landmarks");
assert.equal(viewport.element.getAttribute("aria-label"),null);
assert.equal(viewport.element.getAttribute("tabindex"),null);
assert.equal(viewport.element.scrollTop,37,"updates must not reset host-owned vertical scroll state");
assert.equal(viewport.element.scrollLeft,19,"updates must not reset host-owned horizontal scroll state");
assert.throws(()=>viewport.update({variant:"diagonal"}),/Unknown GUI scroll container variant/);
assert.throws(()=>createGuiScrollContainer(document,{keyboardFocusable:"yes"}),/must be a boolean/);

const irPath="build/spec-ir-web-scroll-container-test.json";
const cssPath="build/web/scroll-container-components-test.css";
function run(command,args,label){const result=spawnSync(command,args,{encoding:"utf8",shell:false});if(result.status!==0)throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);}
try {
  run(process.execPath,["packages/compiler/src/index.mjs","--output",irPath],"Specification compiler");
  run(process.execPath,["packages/adapter-web/src/generate-components-css.mjs",irPath,cssPath],"Web component CSS generator");
  const css=await readFile(cssPath,"utf8");
  assert.match(css,/\.gui-scroll-container \{ box-sizing: border-box; min-inline-size: 0; min-block-size: 0; outline: none; \}/);
  assert.match(css,/data-gui-variant="vertical"[^\n]*overflow-y: auto; overflow-x: hidden/);
  assert.match(css,/data-gui-variant="horizontal"[^\n]*overflow-x: auto; overflow-y: hidden/);
  assert.match(css,/data-gui-variant="both"[^\n]*overflow: auto/);
  assert.match(css,/\.gui-scroll-container__content \{ box-sizing: border-box; min-inline-size: 0; min-block-size: 0; \}/);
  assert.match(css,/\.gui-scroll-container:where\(:focus-visible\)/);
  assert.doesNotMatch(css,/gui-scroll-container[^\n]*::-webkit-scrollbar/,"Scroll Container must preserve native scrollbar rendering");
} finally { await Promise.all([rm(irPath,{force:true}),rm(cssPath,{force:true})]); }
console.log("Native Web Scroll Container adapter and generated CSS tests passed.");
