import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DAY_MS = 24 * 60 * 60 * 1000;
// Image URLs are signed as of the start of the UTC day, so a key gets the same URL all day
// (the app can cache images by URL) and every URL handed out stays valid for at least 24 hours.
const IMAGE_URL_EXPIRES_IN_SECONDS = 2 * 24 * 60 * 60;
const UPLOAD_EXPIRES_IN_SECONDS = 10 * 60;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// The file name part of the keys createImageUpload() hands out: <uuid>.<extension>
const IMAGE_FILE_NAME_PATTERN = /^[\w-]+\.(jpg|png|webp)$/;

export const UPLOAD_CONTENT_TYPES = Object.keys(IMAGE_EXTENSIONS);

let storage = null;

function getStorage() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();

  if (!bucket || !region) {
    return null;
  }

  if (storage?.bucket !== bucket || storage?.region !== region) {
    storage = {
      bucket,
      region,
      // Credentials come from the SDK's default provider chain (AWS_ACCESS_KEY_ID and
      // AWS_SECRET_ACCESS_KEY, a shared profile or an instance role). Checksums are only
      // added where S3 requires them, which keeps signed URLs free of checksum parameters.
      client: new S3Client({
        region,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }

  return storage;
}

export function isStorageConfigured() {
  return getStorage() !== null;
}

function churchImagePrefix(churchId) {
  return `churches/${churchId}/`;
}

/** Whether `key` has the shape of an image uploaded for this church. */
export function isChurchImageKey(key, churchId) {
  const prefix = churchImagePrefix(churchId);

  return (
    typeof key === "string" &&
    key.startsWith(prefix) &&
    IMAGE_FILE_NAME_PATTERN.test(key.slice(prefix.length))
  );
}

/** Presigned POST that lets the app upload one image (up to 5 MB) straight to S3. */
export async function createImageUpload(churchId, contentType) {
  const current = getStorage();
  const extension = IMAGE_EXTENSIONS[contentType];

  if (!current) {
    throw new Error("Image storage is not configured");
  }

  if (!extension) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }

  const key = `${churchImagePrefix(churchId)}${randomUUID()}.${extension}`;
  const { url, fields } = await createPresignedPost(current.client, {
    Bucket: current.bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_UPLOAD_BYTES],
      { "Content-Type": contentType },
    ],
    // Returned in `fields` so the app sends it with the upload, as the policy requires.
    Fields: { "Content-Type": contentType },
    Expires: UPLOAD_EXPIRES_IN_SECONDS,
  });

  return { key, url, fields };
}

function startOfUtcDay(date) {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

/** Signed GET URL for an image, or null when storage isn't configured or signing fails. */
export async function getImageUrl(key, now = new Date()) {
  const current = getStorage();

  if (!current || !key) {
    return null;
  }

  try {
    return await getSignedUrl(
      current.client,
      new GetObjectCommand({ Bucket: current.bucket, Key: key }),
      { signingDate: startOfUtcDay(now), expiresIn: IMAGE_URL_EXPIRES_IN_SECONDS }
    );
  } catch (error) {
    console.error(`[storage] Could not sign a URL for ${key}: ${error.message}`);
    return null;
  }
}

/** Best-effort delete: failures are logged, never thrown. */
export async function deleteImage(key) {
  const current = getStorage();

  if (!current || !key) {
    return;
  }

  try {
    await current.client.send(new DeleteObjectCommand({ Bucket: current.bucket, Key: key }));
  } catch (error) {
    console.error(`[storage] Could not delete ${key}: ${error.message}`);
  }
}
