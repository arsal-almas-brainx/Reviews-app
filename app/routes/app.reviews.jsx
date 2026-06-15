import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const reviews = await prisma.review.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return { reviews };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-test") {
    const response = await admin.graphql(
      `#graphql
        query firstProduct {
          products(first: 1) {
            nodes {
              id
              title
            }
          }
        }`,
    );
    const { data } = await response.json();
    const product = data?.products?.nodes?.[0];

    if (!product) {
      return {
        error: "No products in your store. Add a product first, then try again.",
      };
    }

    await prisma.review.create({
      data: {
        shop: session.shop,
        productId: product.id,
        productTitle: product.title,
        rating: 5,
        title: "Great product!",
        body: "Test review for practice — approve me to publish on the storefront.",
        authorName: "Test Customer",
        status: "pending",
      },
    });

    return {
      success: true,
      message: `Test review added for "${product.title}".`,
    };
  }

  const id = formData.get("id");

  if (!id || typeof id !== "string") {
    return { error: "Review id is required." };
  }

  const review = await prisma.review.findFirst({
    where: { id, shop: session.shop },
  });

  if (!review) {
    return { error: "Review not found." };
  }

  if (intent === "approve") {
    await prisma.review.update({
      where: { id },
      data: { status: "published" },
    });
    return { success: true, message: "Review published." };
  }

  if (intent === "reject") {
    await prisma.review.update({
      where: { id },
      data: { status: "rejected" },
    });
    return { success: true, message: "Review rejected." };
  }

  if (intent === "delete") {
    await prisma.review.delete({ where: { id } });
    return { success: true, message: "Review deleted." };
  }

  return { error: "Unknown action." };
};

function statusTone(status) {
  if (status === "published") return "success";
  if (status === "rejected") return "critical";
  return "warning";
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function productLabel(productId) {
  const numeric = productId.split("/").pop();
  return numeric || productId;
}

export default function ReviewsPage() {
  const { reviews } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const isSubmitting = fetcher.state !== "idle";

  return (
    <s-page heading="Product reviews">
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isSubmitting}
        onClick={() => fetcher.submit({ intent: "create-test" }, { method: "POST" })}
      >
        Add test review
      </s-button>

      <s-section heading="Manage reviews">
        <s-paragraph>
          Reviews submitted on your storefront appear here as pending until you
          approve them. Approved reviews show on the product page.
        </s-paragraph>

        {reviews.length === 0 ? (
          <s-box padding="large" background="subdued" borderRadius="base">
            <s-paragraph>
              No reviews yet. Click <s-text>Add test review</s-text> above to
              simulate a customer submission, then approve it here.
            </s-paragraph>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {reviews.map((review) => (
              <s-box
                key={review.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="base">
                    <s-badge tone={statusTone(review.status)}>
                      {review.status}
                    </s-badge>
                    <s-text>
                      {review.rating}/5 · Product #{productLabel(review.productId)}
                    </s-text>
                  </s-stack>

                  {review.title && <s-heading>{review.title}</s-heading>}

                  <s-paragraph>{review.body}</s-paragraph>

                  <s-text>
                    {review.authorName} · {formatDate(review.createdAt)}
                  </s-text>

                  <s-stack direction="inline" gap="small">
                    {review.status !== "published" && (
                      <s-button
                        variant="primary"
                        disabled={isSubmitting}
                        onClick={() =>
                          fetcher.submit(
                            { intent: "approve", id: review.id },
                            { method: "POST" },
                          )
                        }
                      >
                        Approve
                      </s-button>
                    )}
                    {review.status !== "rejected" && (
                      <s-button
                        disabled={isSubmitting}
                        onClick={() =>
                          fetcher.submit(
                            { intent: "reject", id: review.id },
                            { method: "POST" },
                          )
                        }
                      >
                        Reject
                      </s-button>
                    )}
                    <s-button
                      variant="tertiary"
                      disabled={isSubmitting}
                      onClick={() =>
                        fetcher.submit(
                          { intent: "delete", id: review.id },
                          { method: "POST" },
                        )
                      }
                    >
                      Delete
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Dev setup">
        <s-paragraph>
          Use <s-text>npm run dev</s-text> — localhost mode, no ngrok. Admin
          loads reliably in Shopify.
        </s-paragraph>
        <s-paragraph>
          Storefront widget (optional later): uncomment <s-text>[app_proxy]</s-text>{" "}
          in shopify.app.toml, then use Cloudflare tunnel instead of ngrok —
          run <s-text>npx cloudflared tunnel --url http://127.0.0.1:3000</s-text>{" "}
          after <s-text>npm run dev:storefront</s-text>.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
