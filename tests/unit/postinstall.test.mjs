import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  ensureSwcHelpers,
  isStandaloneAppInstall,
  removeStrayAppDir,
} from "../../scripts/postinstall.mjs";

let root;
const quiet = { log() {}, warn() {} };

function touch(filePath, content = "") {
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
}

function addRootSwcHelpers() {
  touch(join(root, "node_modules", "@swc", "helpers", "package.json"), '{"name":"@swc/helpers"}');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "omniroute-postinstall-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("postinstall in a source checkout", () => {
  beforeEach(() => {
    mkdirSync(join(root, "src", "app"), { recursive: true });
    addRootSwcHelpers();
  });

  it("is not detected as a standalone install", () => {
    assert.equal(isStandaloneAppInstall(root), false);
  });

  it("does not create app/ when ensuring @swc/helpers", async () => {
    await ensureSwcHelpers(root, quiet);
    assert.equal(existsSync(join(root, "app")), false);
  });

  it("removes a stray app/ that only holds node_modules/@swc", () => {
    touch(join(root, "app", "node_modules", "@swc", "helpers", "package.json"), "{}");
    assert.equal(removeStrayAppDir(root, quiet), true);
    assert.equal(existsSync(join(root, "app")), false);
  });

  it("leaves app/ alone when it holds anything else", () => {
    touch(join(root, "app", "node_modules", "@swc", "helpers", "package.json"), "{}");
    touch(join(root, "app", "page.tsx"), "export default function Page() {}");
    assert.equal(removeStrayAppDir(root, quiet), false);
    assert.equal(existsSync(join(root, "app", "page.tsx")), true);
  });

  it("leaves app/node_modules alone when it holds other packages", () => {
    touch(join(root, "app", "node_modules", "@swc", "helpers", "package.json"), "{}");
    touch(join(root, "app", "node_modules", "left-pad", "package.json"), "{}");
    assert.equal(removeStrayAppDir(root, quiet), false);
    assert.equal(existsSync(join(root, "app", "node_modules", "left-pad")), true);
  });
});

describe("postinstall in the published standalone package", () => {
  beforeEach(() => {
    touch(join(root, "app", "server.js"), "// standalone server");
    addRootSwcHelpers();
  });

  it("is detected as a standalone install", () => {
    assert.equal(isStandaloneAppInstall(root), true);
  });

  it("copies @swc/helpers into app/node_modules", async () => {
    await ensureSwcHelpers(root, quiet);
    assert.equal(
      existsSync(join(root, "app", "node_modules", "@swc", "helpers", "package.json")),
      true
    );
  });

  it("never removes the standalone app/ directory", () => {
    assert.equal(removeStrayAppDir(root, quiet), false);
    assert.equal(existsSync(join(root, "app", "server.js")), true);
  });
});

describe("removeStrayAppDir without src/app", () => {
  it("does nothing outside a source checkout", () => {
    touch(join(root, "app", "node_modules", "@swc", "helpers", "package.json"), "{}");
    assert.equal(removeStrayAppDir(root, quiet), false);
    assert.equal(existsSync(join(root, "app")), true);
  });
});
