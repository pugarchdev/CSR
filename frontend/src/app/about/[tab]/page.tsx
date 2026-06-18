"use client";

import React from "react";
import AboutPage from "../page";

export default function AboutPageTab({ params }: { params: { tab: string } }) {
  return <AboutPage params={params} />;
}
