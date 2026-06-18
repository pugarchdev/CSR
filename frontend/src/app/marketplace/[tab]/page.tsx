"use client";

import React from "react";
import ProjectMarketplace from "../page";

export default function MarketplacePageTab({ params }: { params: { tab: string } }) {
  return <ProjectMarketplace params={params} />;
}
