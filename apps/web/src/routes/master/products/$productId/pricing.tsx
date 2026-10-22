import { createFileRoute } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../../components/ui/FeedbackMessage";
import { useProductPricing, useUpdatePricing } from "../../../../features/product/api";
import { PricingForm } from "../../../../features/product/PricingForm";

/** Tab "Pricing": pengajuan pricing tampil di "Pending Product" (api-specs 08 §8.5, §8.6; AC-97.01). */
function PricingTab() {
  const { productId } = Route.useParams();
  const pricing = useProductPricing(productId);
  const update = useUpdatePricing(productId);

  if (pricing.error) return <FeedbackMessage type="error">{pricing.error.message}</FeedbackMessage>;
  if (!pricing.data) return <p>Loading...</p>;
  return (
    <PricingForm
      pricing={pricing.data}
      onSubmit={(request) => update.mutate(request)}
      submitting={update.isPending}
      error={update.error?.message}
      notice={update.data?.message}
    />
  );
}

export const Route = createFileRoute("/master/products/$productId/pricing")({ component: PricingTab });
