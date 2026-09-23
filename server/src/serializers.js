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
