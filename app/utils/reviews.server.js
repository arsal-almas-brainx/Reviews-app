export function normalizeProductId(productId) {
  if (!productId) return null;
  const id = String(productId).trim();
  if (id.startsWith("gid://shopify/Product/")) return id;
  const numeric = id.replace(/\D/g, "");
  if (!numeric) return null;
  return `gid://shopify/Product/${numeric}`;
}

export function computeReviewSummary(reviews) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const review of reviews) {
    const rating = review.rating;
    if (rating >= 1 && rating <= 5) {
      distribution[rating] += 1;
      total += rating;
    }
  }

  const count = reviews.length;
  const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

  return { average, count, distribution };
}

export function validateReviewInput({ productId, rating, body, authorName }) {
  const errors = [];
  const normalizedProductId = normalizeProductId(productId);

  if (!normalizedProductId) {
    errors.push("A valid product is required.");
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    errors.push("Rating must be between 1 and 5.");
  }

  const trimmedBody = String(body ?? "").trim();
  if (trimmedBody.length < 3) {
    errors.push("Review body must be at least 3 characters.");
  }
  if (trimmedBody.length > 5000) {
    errors.push("Review body must be 5000 characters or fewer.");
  }

  const trimmedAuthor = String(authorName ?? "").trim();
  if (trimmedAuthor.length < 1) {
    errors.push("Author name is required.");
  }
  if (trimmedAuthor.length > 100) {
    errors.push("Author name must be 100 characters or fewer.");
  }

  return {
    errors,
    data:
      errors.length === 0
        ? {
            productId: normalizedProductId,
            rating: numericRating,
            body: trimmedBody,
            authorName: trimmedAuthor,
          }
        : null,
  };
}
