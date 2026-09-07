// SPDX-License-Identifier: AGPL-3.0-or-later

import Ajv2020 from "ajv/dist/2020.js";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const [schemaPath, ...arguments_] = process.argv.slice(2);

if (!schemaPath || arguments_.length === 0) {
  console.error(
    "Usage: node scripts/validate-json-schema.mjs <schema> <data-file...> | --directory <dir> --suffix <suffix>"
  );
  process.exit(2);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function collectDataFiles(args) {
  const directoryIndex = args.indexOf("--directory");
  if (directoryIndex === -1) return Promise.resolve([...args].sort());

  const suffixIndex = args.indexOf("--suffix");
  if (
    directoryIndex + 1 >= args.length ||
    suffixIndex === -1 ||
    suffixIndex + 1 >= args.length
  ) {
    throw new Error("--directory requires a path and --suffix requires a suffix");
  }

  const directory = args[directoryIndex + 1];
  const suffix = args[suffixIndex + 1];
  return readdir(directory).then((entries) =>
    entries
      .filter((name) => name.endsWith(suffix))
      .sort()
      .map((name) => join(directory, name))
  );
}

const schema = await readJson(schemaPath);
const ajv = new Ajv2020({ strict: false });
const validate = ajv.compile(schema);
const dataFiles = await collectDataFiles(arguments_);

if (dataFiles.length === 0) {
  console.error(`No data files matched schema ${schemaPath}`);
  process.exit(1);
}

let failed = false;
for (const dataPath of dataFiles) {
  const data = await readJson(dataPath);
  if (validate(data)) {
    console.log(`${dataPath} valid`);
    continue;
  }

  failed = true;
  console.error(`${dataPath} invalid`);
  console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
}

if (failed) process.exit(1);
