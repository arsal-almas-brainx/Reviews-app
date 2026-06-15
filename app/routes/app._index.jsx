import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="ReviewsApp Practice">
      <s-section heading="Judge.me-style product reviews">
        <s-paragraph>
          Customers submit reviews on product pages. You moderate them in the
          Reviews tab — approve to publish, reject to hide.
        </s-paragraph>
        <s-button href="/app/reviews" variant="primary">
          Open Reviews
        </s-button>
      </s-section>

      <s-section slot="aside" heading="How to test">
        <s-unordered-list>
          <s-list-item>
            Run <s-text>npm run dev</s-text> (uses localhost — no ngrok needed)
          </s-list-item>
          <s-list-item>
            Open Reviews → click <s-text>Add test review</s-text>
          </s-list-item>
          <s-list-item>Approve it to practice the moderation flow</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
