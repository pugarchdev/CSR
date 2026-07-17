"use client";

import ProjectMarketplace from "../page";

export default function MarketplacePageTab({ params }: { params: { tab: string } }) {
  return <ProjectMarketplace params={params} />;
}
