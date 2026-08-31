// CSR portfolio data per district, keyed by the district names used in
// /public/maharashtra-districts.geojson. Values are illustrative until the
// analytics API is wired in (see analyticsController on the backend).

export interface SectorSplit {
  name: string;
  value: number; // percentage share
  color: string;
}

export interface TopCompany {
  name: string;
  spend: number; // Rs Cr
}

export interface YearlySpend {
  year: string;
  spend: number; // Rs Cr
}

export interface DistrictCsr {
  name: string;
  csrSpend: number; // Rs Cr
  yoyGrowth: number; // %
  companies: number;
  projects: number;
  activeNgos: number;
  beneficiaries: number;
  sectors: SectorSplit[];
  topCompanies: TopCompany[];
  trend: YearlySpend[];
}

export const SECTOR_COLORS = [
  "#1557c4",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

function sectors(ed: number, health: number, rural: number, env: number, live: number): SectorSplit[] {
  const others = Math.max(0, 100 - (ed + health + rural + env + live));
  return [
    { name: "Education", value: ed, color: SECTOR_COLORS[0] },
    { name: "Health", value: health, color: SECTOR_COLORS[1] },
    { name: "Rural Development", value: rural, color: SECTOR_COLORS[2] },
    { name: "Environment", value: env, color: SECTOR_COLORS[3] },
    { name: "Livelihood", value: live, color: SECTOR_COLORS[4] },
    { name: "Others", value: others, color: SECTOR_COLORS[5] },
  ];
}

function trend(current: number, growthPct: number): YearlySpend[] {
  const years = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"];
  const r = 1 + growthPct / 100;
  return years.map((year, i) => ({
    year,
    spend: Number((current / Math.pow(r, years.length - 1 - i)).toFixed(1)),
  }));
}

function district(
  name: string,
  csrSpend: number,
  yoyGrowth: number,
  companies: number,
  projects: number,
  activeNgos: number,
  beneficiaries: number,
  sectorSplit: SectorSplit[],
  topCompanies: TopCompany[]
): DistrictCsr {
  return { name, csrSpend, yoyGrowth, companies, projects, activeNgos, beneficiaries, sectors: sectorSplit, topCompanies, trend: trend(csrSpend, Math.max(yoyGrowth, 4)) };
}

export const districtCsrData: Record<string, DistrictCsr> = {
  "Mumbai City": district("Mumbai City", 1045.6, 6.2, 812, 402, 96, 310000, sectors(28, 22, 8, 16, 14), [
    { name: "Reliance Industries", spend: 96.4 }, { name: "Tata Sons", spend: 88.2 }, { name: "HDFC Bank", spend: 64.9 }, { name: "Aditya Birla Group", spend: 52.3 },
  ]),
  "Mumbai Suburban": district("Mumbai Suburban", 830.8, 5.1, 640, 355, 84, 265000, sectors(26, 24, 9, 15, 13), [
    { name: "Larsen & Toubro", spend: 71.5 }, { name: "Kotak Mahindra Bank", spend: 45.8 }, { name: "Godrej Industries", spend: 39.6 }, { name: "Mahindra & Mahindra", spend: 36.2 },
  ]),
  Pune: district("Pune", 645.2, 7.8, 522, 318, 78, 228000, sectors(30, 18, 10, 17, 12), [
    { name: "Bajaj Auto", spend: 58.7 }, { name: "Infosys Foundation", spend: 44.1 }, { name: "Tata Motors", spend: 41.3 }, { name: "Persistent Systems", spend: 22.6 },
  ]),
  Thane: district("Thane", 402.4, 6.9, 348, 226, 61, 152000, sectors(25, 21, 12, 16, 13), [
    { name: "JSW Group", spend: 38.2 }, { name: "Raymond", spend: 21.4 }, { name: "Bayer India", spend: 16.8 }, { name: "TCS", spend: 15.3 },
  ]),
  Nagpur: district("Nagpur", 255.32, 9.4, 341, 512, 89, 29000, sectors(32, 15, 17, 11, 8), [
    { name: "Vedanta Limited", spend: 48.82 }, { name: "ONGC Limited", spend: 36.87 }, { name: "Power Grid Corporation", spend: 24.01 }, { name: "HDFC Bank Limited", spend: 18.39 }, { name: "Kotak Mahindra Bank", spend: 15.42 },
  ]),
  Nashik: district("Nashik", 198.6, 8.1, 214, 187, 52, 96000, sectors(27, 19, 16, 14, 12), [
    { name: "Hindustan Aeronautics", spend: 22.4 }, { name: "Mahindra & Mahindra", spend: 18.7 }, { name: "Glenmark", spend: 12.1 }, { name: "Jindal Polyfilms", spend: 9.8 },
  ]),
  Raigad: district("Raigad", 168.3, 7.2, 156, 132, 38, 74000, sectors(22, 20, 15, 21, 11), [
    { name: "JSW Steel", spend: 26.8 }, { name: "Reliance Industries", spend: 21.2 }, { name: "GAIL India", spend: 11.6 }, { name: "Deepak Fertilisers", spend: 8.9 },
  ]),
  "Chhatrapati Sambhajinagar": district("Chhatrapati Sambhajinagar", 152.7, 6.4, 148, 141, 46, 88000, sectors(29, 18, 15, 13, 14), [
    { name: "Bajaj Auto", spend: 19.6 }, { name: "Videocon", spend: 10.2 }, { name: "Wockhardt", spend: 9.4 }, { name: "Endurance Tech", spend: 8.1 },
  ]),
  Aurangabad: district("Chhatrapati Sambhajinagar", 152.7, 6.4, 148, 141, 46, 88000, sectors(29, 18, 15, 13, 14), [
    { name: "Bajaj Auto", spend: 19.6 }, { name: "Videocon", spend: 10.2 }, { name: "Wockhardt", spend: 9.4 }, { name: "Endurance Tech", spend: 8.1 },
  ]),
  Kolhapur: district("Kolhapur", 96.4, 5.8, 102, 118, 41, 67000, sectors(24, 17, 19, 15, 14), [
    { name: "Kirloskar Group", spend: 12.3 }, { name: "Menon Pistons", spend: 6.4 }, { name: "Ghatge Patil", spend: 5.2 }, { name: "Gokul Dairy", spend: 4.1 },
  ]),
  Ratnagiri: district("Ratnagiri", 74.8, 6.6, 68, 84, 29, 46000, sectors(21, 19, 18, 22, 12), [
    { name: "JSW Energy", spend: 14.2 }, { name: "Finolex Industries", spend: 8.6 }, { name: "Gadre Marine", spend: 3.9 }, { name: "Bharati Shipyard", spend: 3.2 },
  ]),
  Sindhudurg: district("Sindhudurg", 38.5, 5.2, 34, 52, 19, 24000, sectors(23, 18, 20, 21, 10), [
    { name: "Sesa Goa (Vedanta)", spend: 6.8 }, { name: "Bank of India", spend: 2.9 }, { name: "Konkan Railway", spend: 2.4 }, { name: "MSEB Holding", spend: 1.8 },
  ]),
  Palghar: district("Palghar", 88.2, 7.5, 92, 96, 33, 58000, sectors(26, 22, 16, 14, 13), [
    { name: "JNPT", spend: 9.8 }, { name: "Tata Power", spend: 8.4 }, { name: "Viraj Profiles", spend: 5.6 }, { name: "ONGC", spend: 4.9 },
  ]),
  Ahilyanagar: district("Ahilyanagar", 84.6, 5.9, 88, 102, 36, 62000, sectors(25, 18, 21, 14, 13), [
    { name: "Kinetic Group", spend: 7.9 }, { name: "Cummins India", spend: 6.8 }, { name: "Ashok Leyland", spend: 5.1 }, { name: "Parner Sugars", spend: 3.6 },
  ]),
  Ahmednagar: district("Ahilyanagar", 84.6, 5.9, 88, 102, 36, 62000, sectors(25, 18, 21, 14, 13), [
    { name: "Kinetic Group", spend: 7.9 }, { name: "Cummins India", spend: 6.8 }, { name: "Ashok Leyland", spend: 5.1 }, { name: "Parner Sugars", spend: 3.6 },
  ]),
  Solapur: district("Solapur", 68.9, 5.4, 72, 89, 31, 54000, sectors(26, 19, 20, 12, 14), [
    { name: "NTPC", spend: 11.2 }, { name: "Balaji Amines", spend: 4.8 }, { name: "Precision Camshafts", spend: 3.4 }, { name: "Laxmi Organic", spend: 2.9 },
  ]),
  Satara: district("Satara", 62.3, 6.1, 66, 78, 28, 48000, sectors(24, 18, 22, 15, 12), [
    { name: "Cooper Corporation", spend: 5.6 }, { name: "Bharat Forge", spend: 4.9 }, { name: "Kirloskar Oil Engines", spend: 4.2 }, { name: "Suzlon Energy", spend: 3.1 },
  ]),
  Sangli: district("Sangli", 52.8, 5.6, 58, 71, 26, 42000, sectors(25, 17, 21, 14, 14), [
    { name: "Ugar Sugar", spend: 4.2 }, { name: "Serum Institute", spend: 3.8 }, { name: "Rajarambapu Group", spend: 3.1 }, { name: "Sanmati Engineers", spend: 2.2 },
  ]),
  Jalgaon: district("Jalgaon", 58.4, 6.8, 61, 74, 27, 45000, sectors(27, 18, 19, 13, 14), [
    { name: "Jain Irrigation", spend: 9.6 }, { name: "Raymond UCO", spend: 3.8 }, { name: "Supreme Industries", spend: 3.2 }, { name: "WNS Global", spend: 2.4 },
  ]),
  Dhule: district("Dhule", 28.6, 4.8, 31, 42, 16, 21000, sectors(28, 19, 20, 12, 12), [
    { name: "Deesan Group", spend: 4.6 }, { name: "Shirpur Gold", spend: 3.2 }, { name: "VIP Industries", spend: 2.4 }, { name: "MSEB Holding", spend: 1.6 },
  ]),
  Nandurbar: district("Nandurbar", 18.2, 4.1, 21, 31, 12, 18000, sectors(31, 22, 18, 14, 15), [
    { name: "NTPC", spend: 3.8 }, { name: "Suzlon Foundation", spend: 2.1 }, { name: "Tata Trusts", spend: 1.9 }, { name: "Bank of Maharashtra", spend: 1.2 },
  ]),
  Buldhana: district("Buldhana", 26.4, 4.6, 29, 39, 15, 22000, sectors(28, 19, 21, 13, 14), [
    { name: "Buldana Urban", spend: 3.9 }, { name: "Khamgaon Oil", spend: 2.2 }, { name: "Bajaj Finserv", spend: 1.8 }, { name: "Jindal Saw", spend: 1.4 },
  ]),
  Akola: district("Akola", 34.6, 5.1, 38, 51, 19, 28000, sectors(27, 19, 21, 12, 13), [
    { name: "Ruchi Soya", spend: 4.8 }, { name: "Simplex Mills", spend: 2.4 }, { name: "Berar Finance", spend: 1.8 }, { name: "Shree Renuka", spend: 1.2 },
  ]),
  Washim: district("Washim", 14.8, 3.8, 16, 24, 9, 12000, sectors(30, 22, 20, 12, 16), [
    { name: "Maha Transco", spend: 2.1 }, { name: "Mahindra Agri", spend: 1.4 }, { name: "SBI Foundation", spend: 1.1 }, { name: "Adani Foundation", spend: 0.9 },
  ]),
  Amravati: district("Amravati", 48.2, 5.4, 52, 68, 25, 38000, sectors(26, 18, 20, 15, 13), [
    { name: "RattanIndia Power", spend: 7.2 }, { name: "Finolex Cables", spend: 3.4 }, { name: "Raymond", spend: 2.8 }, { name: "Maharashtra Feeds", spend: 1.9 },
  ]),
  Yavatmal: district("Yavatmal", 38.9, 5.3, 42, 56, 21, 32000, sectors(29, 19, 20, 14, 15), [
    { name: "Raymond Luxury", spend: 5.6 }, { name: "Grasim Industries", spend: 3.2 }, { name: "Jindal Poly", spend: 2.4 }, { name: "Pusad Sugars", spend: 1.8 },
  ]),
  Wardha: district("Wardha", 32.1, 5.0, 35, 48, 18, 26000, sectors(27, 19, 21, 14, 13), [
    { name: "Uttam Galva", spend: 5.2 }, { name: "Lloyds Steel", spend: 4.1 }, { name: "Bajaj Auto", spend: 3.2 }, { name: "Wardha Power", spend: 2.4 },
  ]),
  Bhandara: district("Bhandara", 24.2, 4.5, 27, 36, 14, 19000, sectors(27, 20, 21, 13, 12), [
    { name: "Sunflag Iron & Steel", spend: 4.8 }, { name: "Ordnance Factory", spend: 2.9 }, { name: "Bhandara Sugars", spend: 1.6 }, { name: "MOIL", spend: 1.4 },
  ]),
  Gondia: district("Gondia", 22.8, 4.4, 25, 34, 13, 18000, sectors(28, 21, 20, 14, 13), [
    { name: "Adani Power Maharashtra", spend: 6.2 }, { name: "Gondia Rice Mills", spend: 2.1 }, { name: "MSEB Holding", spend: 1.4 }, { name: "Birla Sun Life", spend: 1.1 },
  ]),
  Chandrapur: district("Chandrapur", 112.4, 6.7, 118, 108, 37, 72000, sectors(24, 21, 18, 16, 11), [
    { name: "Western Coalfields", spend: 21.4 }, { name: "Chandrapur Super Thermal", spend: 18.2 }, { name: "ACC Cement", spend: 14.6 }, { name: "Ballarpur Industries", spend: 8.9 },
  ]),
  Gadchiroli: district("Gadchiroli", 42.6, 5.8, 46, 58, 22, 34000, sectors(28, 22, 19, 17, 14), [
    { name: "Lloyds Metals & Energy", spend: 12.8 }, { name: "MOIL Limited", spend: 4.2 }, { name: "Ballarpur Paper", spend: 3.1 }, { name: "State Mineral Corp", spend: 2.4 },
  ]),
  Jalna: district("Jalna", 44.8, 5.2, 48, 62, 23, 36000, sectors(27, 18, 20, 14, 13), [
    { name: "Kalika Steel", spend: 6.8 }, { name: "SRJ Peety Steels", spend: 5.4 }, { name: "Metarolls", spend: 3.9 }, { name: "Mahyco Seeds", spend: 3.2 },
  ]),
  Parbhani: district("Parbhani", 22.4, 4.3, 25, 35, 13, 18000, sectors(28, 20, 21, 12, 12), [
    { name: "Gangakhed Sugar", spend: 3.4 }, { name: "Parbhani Dal Mills", spend: 1.8 }, { name: "SBI Foundation", spend: 1.2 }, { name: "MSEDCL", spend: 0.9 },
  ]),
  Hingoli: district("Hingoli", 16.2, 3.9, 18, 26, 10, 13000, sectors(29, 21, 22, 11, 14), [
    { name: "Hingoli Agri", spend: 2.1 }, { name: "Kalyani Steels", spend: 1.4 }, { name: "Bank of India", spend: 1.1 }, { name: "Maha Transco", spend: 0.8 },
  ]),
  Nanded: district("Nanded", 46.5, 5.3, 50, 64, 24, 38000, sectors(27, 18, 21, 13, 14), [
    { name: "Bhaurao Chavan Sugar", spend: 5.8 }, { name: "Marathwada Gramin", spend: 2.9 }, { name: "Shree Datta Sugars", spend: 2.2 }, { name: "Cipla", spend: 1.8 },
  ]),
  Beed: district("Beed", 28.4, 4.7, 31, 42, 16, 23000, sectors(29, 20, 20, 13, 15), [
    { name: "Vaidyanath Sugar", spend: 3.9 }, { name: "Pannageshwar Sugars", spend: 2.4 }, { name: "Tata Trusts", spend: 1.8 }, { name: "MSEDCL", spend: 1.2 },
  ]),
  Latur: district("Latur", 31.2, 4.9, 34, 46, 17, 25000, sectors(28, 20, 21, 12, 11), [
    { name: "Manjara Sugars", spend: 3.8 }, { name: "Kirloskar Brothers", spend: 2.9 }, { name: "Latur Dal Mills", spend: 1.8 }, { name: "SBI Foundation", spend: 1.3 },
  ]),
  Dharashiv: district("Dharashiv", 19.6, 4.2, 22, 32, 12, 16000, sectors(28, 21, 22, 10, 10), [
    { name: "Terna Group", spend: 2.4 }, { name: "NTPC", spend: 1.9 }, { name: "Dharashiv Sugars", spend: 1.2 }, { name: "MSEDCL", spend: 0.8 },
  ]),
  Osmanabad: district("Dharashiv", 19.6, 4.2, 22, 32, 12, 16000, sectors(28, 21, 22, 10, 10), [
    { name: "Terna Group", spend: 2.4 }, { name: "NTPC", spend: 1.9 }, { name: "Dharashiv Sugars", spend: 1.2 }, { name: "MSEDCL", spend: 0.8 },
  ]),
};

// Aliases: GeoJSON files differ on renamed districts.
export const DISTRICT_ALIASES: Record<string, string> = {
  "Aurangabad": "Chhatrapati Sambhajinagar",
  "Sambhaji Nagar": "Chhatrapati Sambhajinagar",
  "Sambhajinagar": "Chhatrapati Sambhajinagar",
  "Chhatrapati Sambhaji Nagar": "Chhatrapati Sambhajinagar",
  "Osmanabad": "Dharashiv",
  "Ahmednagar": "Ahilyanagar",
  "Ahmadnagar": "Ahilyanagar",
  "Bid": "Beed",
  "Gondiya": "Gondia",
  "Raigarh": "Raigad",
  "Mumbai": "Mumbai City",
};

export function resolveDistrict(rawName: string): DistrictCsr | undefined {
  const trimmed = rawName.trim();
  return districtCsrData[trimmed] ?? districtCsrData[DISTRICT_ALIASES[trimmed] ?? ""];
}

export const stateTotals = (() => {
  const all = Object.values(districtCsrData);
  const totalSpend = all.reduce((sum, d) => sum + d.csrSpend, 0);
  const totalCompanies = all.reduce((sum, d) => sum + d.companies, 0);
  const top = all.reduce((max, d) => (d.csrSpend > max.csrSpend ? d : max), all[0]);
  return {
    totalSpend: Number(totalSpend.toFixed(1)),
    totalCompanies,
    totalDistricts: 36,
    topDistrict: top.name,
    totalSectors: 9,
  };
})();
