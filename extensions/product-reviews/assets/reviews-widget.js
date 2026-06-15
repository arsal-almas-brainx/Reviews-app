(function () {
  function starsForRating(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = Math.round(value);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "";
    }
  }

  async function loadReviews(widget) {
    const listEl = widget.querySelector("[data-reviews-list]");
    const summaryEl = widget.querySelector("[data-reviews-summary]");
    const summaryStars = widget.querySelector("[data-summary-stars]");
    const summaryCount = widget.querySelector("[data-summary-count]");
    const productId = widget.dataset.productId;
    const proxyPath = widget.dataset.proxyPath || "/apps/reviews";

    try {
      const response = await fetch(
        `${proxyPath}?product_id=${encodeURIComponent(productId)}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) {
        throw new Error("Failed to load reviews");
      }

      const data = await response.json();
      const reviews = data.reviews || [];
      const summary = data.summary || { average: 0, count: 0 };

      if (summary.count > 0) {
        summaryEl.hidden = false;
        summaryStars.textContent = starsForRating(summary.average);
        summaryCount.textContent = `${summary.average} · ${summary.count} review${summary.count === 1 ? "" : "s"}`;
      } else {
        summaryEl.hidden = true;
      }

      if (reviews.length === 0) {
        listEl.innerHTML =
          '<p class="reviews-app__empty">No reviews yet. Be the first to review this product!</p>';
        return;
      }

      listEl.innerHTML = reviews
        .map((review) => {
          const title = review.title
            ? `<h4 class="reviews-app__item-title">${escapeHtml(review.title)}</h4>`
            : "";
          return `
            <article class="reviews-app__item">
              <div class="reviews-app__item-header">
                <span class="reviews-app__stars">${starsForRating(review.rating)}</span>
              </div>
              ${title}
              <p class="reviews-app__item-body">${escapeHtml(review.body)}</p>
              <p class="reviews-app__item-meta">
                ${escapeHtml(review.authorName)} · ${formatDate(review.createdAt)}
              </p>
            </article>
          `;
        })
        .join("");
    } catch {
      listEl.innerHTML =
        '<p class="reviews-app__empty">Unable to load reviews. Please try again later.</p>';
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setupForm(widget) {
    const form = widget.querySelector("[data-review-form]");
    const messageEl = widget.querySelector("[data-form-message]");
    const submitButton = widget.querySelector("[data-submit-button]");
    const productId = widget.dataset.productId;
    const proxyPath = widget.dataset.proxyPath || "/apps/reviews";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      messageEl.hidden = true;
      messageEl.className = "reviews-app__message";
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      const formData = new FormData(form);
      const payload = {
        product_id: productId,
        author_name: formData.get("author_name"),
        rating: formData.get("rating"),
        title: formData.get("title"),
        body: formData.get("body"),
      };

      try {
        const response = await fetch(proxyPath, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorText =
            data.errors?.join(" ") || data.error || "Unable to submit review.";
          throw new Error(errorText);
        }

        messageEl.textContent =
          data.message || "Thank you! Your review is pending approval.";
        messageEl.className = "reviews-app__message reviews-app__message--success";
        messageEl.hidden = false;
        form.reset();
      } catch (error) {
        messageEl.textContent = error.message || "Unable to submit review.";
        messageEl.className = "reviews-app__message reviews-app__message--error";
        messageEl.hidden = false;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit review";
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-reviews-widget]").forEach((widget) => {
      loadReviews(widget);
      setupForm(widget);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
