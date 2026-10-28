import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  avatarSources,
  isAvatarPathForUser,
  MAX_AVATAR_BYTES,
  safeGooglePhoto,
  validateAvatarFile,
} from "../src/lib/avatars.ts";
import { normalizeAvatar, readAvatarForm } from "../src/lib/avatar-image.ts";
import {
  accountLinks,
  parseProfileTab,
  profileHref,
  profileTabs,
} from "../src/lib/profile-navigation.ts";
const uid = "00000000-0000-4000-8000-000000000001";
test("account links are role-specific and Profile sections have stable URLs", () => {
  assert.equal(accountLinks(null).length, 5);
  assert.equal(
    accountLinks("organizer").some((l) => l.href === "/admin"),
    false,
  );
  assert.equal(accountLinks("admin").length, 7);
  assert.equal(accountLinks("unexpected").length, 5);
  for (const tab of profileTabs) {
    assert.equal(
      parseProfileTab(
        new URL(profileHref(tab), "http://localhost").searchParams.get("tab"),
      ),
      tab,
    );
  }
  assert.equal(parseProfileTab("admin"), "Overview");
});
test("custom photo takes priority, then a safe Google photo, then initials", () => {
  const google = "https://lh3.googleusercontent.com/portrait";
  assert.deepEqual(avatarSources("https://storage.test/signed", google), [
    "https://storage.test/signed",
    google,
  ]);
  assert.deepEqual(avatarSources(null, google), [google]);
  for (const bad of [
    "http://lh3.googleusercontent.com/x",
    "https://evil.test/pixel",
    "https://googleusercontent.com.evil.test/x",
    "https://lh3.googleusercontent.com@evil.test/x",
    "javascript:alert(1)",
  ])
    assert.equal(safeGooglePhoto(bad), null);
  assert.deepEqual(avatarSources(null, null), []);
});
test("avatar keys cannot point to another member or traverse directories", () => {
  assert.equal(
    isAvatarPathForUser(
      `${uid}/11111111-1111-4111-8111-111111111111.webp`,
      uid,
    ),
    true,
  );
  for (const path of [
    `other/11111111-1111-4111-8111-111111111111.webp`,
    `${uid}/../other.webp`,
    `${uid}/photo.svg`,
    `${uid}/a/b.webp`,
  ])
    assert.equal(isAvatarPathForUser(path, uid), false);
});
test("accepts only supported, nonempty uploads up to five MB", () => {
  assert.equal(
    validateAvatarFile({ size: MAX_AVATAR_BYTES, type: "image/jpeg" }),
    null,
  );
  assert.match(
    validateAvatarFile({ size: MAX_AVATAR_BYTES + 1, type: "image/png" })!,
    /5 MB/,
  );
  assert.match(validateAvatarFile({ size: 12, type: "image/svg+xml" })!, /JPG/);
  assert.match(validateAvatarFile({ size: 0, type: "image/webp" })!, /empty/);
});
test("decodes JPEG/PNG/WebP and creates a bounded WebP without EXIF/GPS metadata", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    let pipeline = sharp({
      create: { width: 900, height: 600, channels: 3, background: "#2367ea" },
    });
    if (format === "jpeg")
      pipeline = pipeline.withMetadata({
        exif: { IFD0: { Artist: "Must be stripped" } },
      });
    const input = await pipeline[format]().toBuffer();
    const output = await normalizeAvatar(input, `image/${format}`);
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.equal(meta.exif, undefined);
    assert.equal(meta.xmp, undefined);
  }
});
test("rejects spoofed MIME types, corrupted input and excessive dimensions", async () => {
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => normalizeAvatar(png, "image/jpeg"), /valid/);
  await assert.rejects(
    () =>
      normalizeAvatar(
        new TextEncoder().encode('<svg onload="alert(1)"/>'),
        "image/png",
      ),
    /valid/,
  );
  const oversized = await sharp({
    create: { width: 4097, height: 4097, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    () => normalizeAvatar(oversized, "image/png"),
    /16 megapixels/,
  );
});
test("multipart upload reader accepts a real file and stops oversized request bodies", async () => {
  const form = new FormData();
  form.set(
    "photo",
    new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    "photo.png",
  );
  const file = await readAvatarForm(
    new Request("http://localhost/api/profile/avatar", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(file.type, "image/png");
  assert.equal(file.size, 3);
  await assert.rejects(
    () =>
      readAvatarForm(
        new Request("http://localhost/api/profile/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data; boundary=too-large",
          },
          body: new Uint8Array(MAX_AVATAR_BYTES + 65537),
        }),
      ),
    /5 MB/,
  );
});

test("same-origin checks accept the public local Host and reject cross-site requests", async () => {
  const { sameOrigin } = await import("../src/lib/request-origin.ts");
  const request = (origin: string, host = "127.0.0.1:3000") =>
    new Request("http://localhost:3000/api/profile/avatar", {
      headers: { origin, host },
    });
  assert.equal(
    sameOrigin(request("http://127.0.0.1:3000")),
    "http://127.0.0.1:3000",
  );
  assert.equal(sameOrigin(request("https://127.0.0.1:3000")), null);
  assert.equal(sameOrigin(request("http://evil.test")), null);
  assert.equal(sameOrigin(request("null")), null);
  assert.equal(sameOrigin(request("http://127.0.0.1:3000/path")), null);
});
