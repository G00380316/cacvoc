import { getImageUrl } from "./storage.js";

export function serializeChurch(church) {
  if (!church || typeof church !== "object" || !church._id) {
    return null;
  }

  return {
    id: String(church._id),
    name: church.name,
    address: church.address ?? null,
    city: church.city ?? null,
    country: church.country ?? null,
    latitude: church.latitude ?? null,
    longitude: church.longitude ?? null,
    status: church.status,
  };
}

export function serializeAdmin(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: String(admin._id),
    username: admin.username,
    role: admin.role,
    church: serializeChurch(admin.church),
  };
}

export function serializeChurchForReview(church) {
  const submittedBy = church.submittedBy;

  return {
    ...serializeChurch(church),
    submittedBy:
      submittedBy && typeof submittedBy === "object" && submittedBy._id
        ? { id: String(submittedBy._id), username: submittedBy.username }
        : null,
    createdAt: church.createdAt,
    reviewedAt: church.reviewedAt ?? null,
  };
}

export function serializeServiceTimes(serviceTimes) {
  return Array.isArray(serviceTimes)
    ? serviceTimes.map(({ day, time, label }) => ({ day, time, label }))
    : [];
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : null;
}

export async function serializePost(post) {
  return {
    id: String(post._id),
    churchId: String(post.church?._id ?? post.church),
    type: post.type,
    title: post.title,
    body: post.body ?? "",
    imageKey: post.imageKey ?? null,
    imageUrl: post.imageKey ? await getImageUrl(post.imageKey) : null,
    startsAt: toIsoString(post.startsAt),
    endsAt: toIsoString(post.endsAt),
    location: post.location ?? null,
    preacher: post.preacher ?? null,
    mediaUrl: post.mediaUrl ?? null,
    bibleRef: post.bibleRef ?? null,
    date: post.date ?? null,
    createdAt: toIsoString(post.createdAt),
    updatedAt: toIsoString(post.updatedAt),
  };
}

export function serializePosts(posts) {
  return Promise.all(posts.map(serializePost));
}
