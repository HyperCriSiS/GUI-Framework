// SPDX-License-Identifier: AGPL-3.0-or-later

import process from "node:process";
import { compileSpecificationToFile } from "./index.mjs";

function parseArgs(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex >= 0 && !argv[outputIndex + 1]) throw new Error("--output requires a path");
  const specRootIndex = argv.indexOf("--spec-root");
  if (specRootIndex >= 0 && !argv[specRootIndex + 1]) throw new Error("--spec-root requires a path");
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : "build/spec-ir.json",
    specRoot: specRootIndex >= 0 ? argv[specRootIndex + 1] : "spec",
  };
}

const { ir, outputPath } = await compileSpecificationToFile(parseArgs(process.argv.slice(2)));
console.log(`Compiled GUI Framework specification ${ir.specVersion} to ${outputPath}`);
