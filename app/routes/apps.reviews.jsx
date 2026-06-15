import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import {
  computeReviewSummary,
  normalizeProductId,
  validateReviewInput,
} from "../utils/reviews.server";

function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);
  const session = context.session;

  if (!session) {
    return jsonResponse({ error: "App not installed on this store." }, 401);
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");

  if (!productId) {
    return jsonResponse({ error: "product_id is required." }, 400);
  }

  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) {
    return jsonResponse({ error: "Invalid product_id." }, 400);
  }

  const reviews = await prisma.review.findMany({
    where: {
      shop: session.shop,
      productId: normalizedProductId,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      authorName: true,
      createdAt: true,
    },
  });

  return jsonResponse({
    reviews,
    summary: computeReviewSummary(reviews),
  });
};

export const action = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);
  const session = context.session;

  if (!session) {
    return jsonResponse({ error: "App not installed on this store." }, 401);
  }

  let payload;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await request.json();
  } else {
    const formData = await request.formData();
    payload = {
      product_id: formData.get("product_id"),
      rating: formData.get("rating"),
      title: formData.get("title"),
      body: formData.get("body"),
      author_name: formData.get("author_name"),
    };
  }

  const { errors, data } = validateReviewInput({
    productId: payload.product_id,
    rating: payload.rating,
    body: payload.body,
    authorName: payload.author_name,
  });

  if (errors.length > 0) {
    return jsonResponse({ errors }, 400);
  }

  const title = String(payload.title ?? "").trim();

  const review = await prisma.review.create({
    data: {
      shop: session.shop,
      productId: data.productId,
      rating: data.rating,
      title: title || null,
      body: data.body,
      authorName: data.authorName,
      status: "pending",
    },
    select: { id: true, status: true },
  });

  return jsonResponse({
    success: true,
    message: "Thank you! Your review is pending approval.",
    review,
  });
};
