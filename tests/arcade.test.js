import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("arcade.json matches the cabinet manifest and points at real files", () => {
  const arcade = JSON.parse(fs.readFileSync(path.join(root, "arcade.json"), "utf8"));
  assert.equal(arcade.name, "Lantern Lancers");
  assert.equal(arcade.id, "lanternlancers");
  assert.equal(arcade.icon, "assets/icon.jpg");
  assert.equal(arcade.cover, "assets/cover.jpg");
  assert.equal(arcade.port, 8811);
  assert.equal(arcade.players, 4);
  assert.equal(arcade.minPlayers, 1);
  assert.equal(arcade.version, "1.0.0");
  assert.deepEqual(arcade.input, ["keyboard", "gamepad"]);
  assert.equal(arcade.launch.web, "index.html");
  assert.equal(arcade.launch.mac, "./launch-mac.command");
  assert.equal(arcade.launch.windows, "launch-windows.bat");
  assert.equal(arcade.launch.linux, "./launch-linux.sh");

  const files = [
    arcade.icon,
    arcade.cover,
    arcade.launch.web,
    arcade.launch.windows,
    "launch-mac.command",
    "launch-linux.sh",
    "server.py",
    "src/ui/main.js",
    "src/core/match.js",
  ];
  for (const rel of files) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} is missing`);
  }

  for (const rel of ["launch-mac.command", "launch-linux.sh"]) {
    const mode = fs.statSync(path.join(root, rel)).mode;
    assert.ok(mode & 0o111, `${rel} should be executable`);
  }
});
