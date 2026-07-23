// tools/build.test.mjs
// tools/build.mjs is a standalone CLI script (paths resolved relative to its
// own file location, not cwd — see its ROOT constant), so it can't be unit
// tested by importing functions out of it. Instead each test copies the
// tools/ + data/ + site/ subtree the build needs into a throwaway temp
// directory (fs.cpSync — a Node built-in, no dependency added) and runs the
// real CLI against that copy via child_process, exactly as CI would. This
// keeps every mutation (corrupt JSON, edited manifest, …) off the real repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // tools/.. = repo root

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), "at-build-test-"));
  for (const sub of ["tools", "data", "site"]) {
    cpSync(join(REPO_ROOT, sub), join(dir, sub), { recursive: true });
  }
  return dir;
}

// Runs `node tools/build.mjs [args]` inside a temp repo copy and always
// resolves (never throws) — build.mjs exits non-zero on validation errors,
// which is a normal, assertable outcome for these tests, not a test failure.
function runBuild(dir, args = []) {
  try {
    const stdout = execFileSync("node", [join(dir, "tools", "build.mjs"), ...args], { cwd: dir, encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

test("--check on a clean, already-rendered repo copy exits 0 and reports zero writes", (t) => {
  const dir = makeTempRepo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const result = runBuild(dir, ["--check"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Build OK/);
  assert.match(result.stdout, /0 rendu\(s\)/); // the checked-in site/ output is already up to date
});

test("--check validates without writing any files, even when a trip's data would change the rendered page", (t) => {
  const dir = makeTempRepo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const outFile = join(dir, "site", "istanbul", "index.html");
  const before = readFileSync(outFile, "utf8");

  const tripPath = join(dir, "data", "trips", "istanbul.json");
  const trip = JSON.parse(readFileSync(tripPath, "utf8"));
  trip.hero.h1Pre = "TEST_MARKER_XYZ";
  writeFileSync(tripPath, JSON.stringify(trip, null, 2));

  const checked = runBuild(dir, ["--check"]);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.match(checked.stdout, /istanbul/); // reported as differing…
  assert.equal(readFileSync(outFile, "utf8"), before, "--check must not write site/istanbul/index.html");

  // Same repo copy, real (non-check) build: now it must actually write.
  const real = runBuild(dir, []);
  assert.equal(real.status, 0, real.stderr || real.stdout);
  const after = readFileSync(outFile, "utf8");
  assert.notEqual(after, before);
  assert.ok(after.includes("TEST_MARKER_XYZ"), "the real build should render the updated field");
});

test("malformed JSON in a trip file fails the build (exit 1) and leaves output untouched", (t) => {
  const dir = makeTempRepo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const outFile = join(dir, "site", "istanbul", "index.html");
  const before = readFileSync(outFile, "utf8");
  writeFileSync(join(dir, "data", "trips", "istanbul.json"), "{ not valid json");

  const result = runBuild(dir, ["--check"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JSON invalide/);
  assert.equal(readFileSync(outFile, "utf8"), before);
});

test("a trip missing a required field is reported as a build error and blocks the build", (t) => {
  const dir = makeTempRepo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const tripPath = join(dir, "data", "trips", "istanbul.json");
  const trip = JSON.parse(readFileSync(tripPath, "utf8"));
  delete trip.meta.title;
  writeFileSync(tripPath, JSON.stringify(trip, null, 2));

  const result = runBuild(dir, ["--check"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /meta\.title/);
  assert.match(result.stderr, /Build bloqué/);
});

test("a manifest entry pointing at a nonexistent trip file is reported as an error", (t) => {
  const dir = makeTempRepo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const manifestPath = join(dir, "data", "build-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.trips["does-not-exist"] = { enabled: true, outputDir: null };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const result = runBuild(dir, ["--check"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does-not-exist/);
  assert.match(result.stderr, /introuvable/);
});
