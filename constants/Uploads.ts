import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { apiRequest } from "@/constants/Api";

const MAX_EDGE = 1600;

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

/** Lets the admin choose a photo, then shrinks it to a JPEG suitable for upload. */
export async function pickImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });

  const asset = result.canceled ? null : result.assets[0];

  if (!asset) {
    return null;
  }

  const longEdge = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);

  if (longEdge > MAX_EDGE) {
    context.resize(
      asset.width >= asset.height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE }
    );
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}

type UploadTicket = {
  key: string;
  url: string;
  fields: Record<string, string>;
};

/** Uploads straight to S3 using a presigned form from the API. Returns the object key. */
export async function uploadImage(image: PickedImage, adminToken: string) {
  const ticket = await apiRequest<UploadTicket>("/editor/uploads", {
    method: "POST",
    body: { contentType: "image/jpeg" },
    adminToken,
  });

  const form = new FormData();
  for (const [name, value] of Object.entries(ticket.fields)) {
    form.append(name, value);
  }
  // S3 requires the file to be the last field in the form.
  form.append("file", { uri: image.uri, name: "image.jpg", type: "image/jpeg" } as unknown as Blob);

  let response: Response;

  try {
    response = await fetch(ticket.url, { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't upload the image. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`The image upload was rejected (${response.status}).`);
  }

  return ticket.key;
}
