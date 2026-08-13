"use client";
import LiveOperationalPage from "@/components/operations/LiveOperationalPage";
export default function Page(){return <LiveOperationalPage title="CSR Portfolio Analytics" eyebrow="Authoritative reporting" description="Live project distribution by sector from the portal database. Funding and beneficiary values are shown only when supported by recorded project data." endpoint="/analytics/stats" emptyMessage="No sector-level project statistics are available." columns={[{label:"Sector",keys:["sector"]},{label:"Projects",keys:["count"]}]}/>}
