export interface DistrictData {
  district: string;
  talukas: string[];
}

export const maharashtraDistricts: DistrictData[] = [
  {
    district: "Pune",
    talukas: ["Haveli", "Mulshi", "Maval", "Shirur", "Baramati", "Indapur", "Khed", "Junner", "Ambegaon", "Purandhar", "Bhor", "Velhe", "Daund"]
  },
  {
    district: "Nagpur",
    talukas: ["Nagpur Rural", "Nagpur Urban", "Kamptee", "Ramtek", "Hingna", "Katol", "Kalmeshwar", "Savner", "Parseoni", "Mauda", "Umred", "Bhiwapur", "Kuhi"]
  },
  {
    district: "Thane",
    talukas: ["Thane", "Kalyan", "Murbad", "Bhiwandi", "Shahapur", "Ulhasnagar", "Ambernath"]
  },
  {
    district: "Gadchiroli",
    talukas: ["Gadchiroli", "Dhanora", "Chamorshi", "Mulchera", "Aheri", "Sironcha", "Etapalli", "Bhamragad", "Kurkheda", "Korchi", "Armori", "Desaiganj"]
  },
  {
    district: "Mumbai Suburban",
    talukas: ["Andheri", "Borivali", "Kurla"]
  },
  {
    district: "Nashik",
    talukas: ["Nashik", "Sinnar", "Igatpuri", "Dindori", "Peth", "Trimbakeshwar", "Kalwan", "Surgana", "Baglan", "Malegaon", "Chandwad", "Nandgaon", "Yeola", "Niphad", "Deola"]
  },
  {
    district: "Aurangabad",
    talukas: ["Aurangabad", "Kannad", "Soegaon", "Sillod", "Phulambri", "Khuldabad", "Vaijapur", "Gangapur", "Paithan"]
  },
  {
    district: "Amravati",
    talukas: ["Amravati", "Bhatkuli", "Nandgaon Khandeshwar", "Dharni", "Chikhaldara", "Achalpur", "Chandurbazar", "Morshi", "Warud", "Daryapur", "Anjangaon Surji", "Chandur Railway", "Dhamangaon Railway", "Teosa"]
  },
  {
    district: "Kolhapur",
    talukas: ["Karvir", "Panhala", "Shahuwadi", "Kagal", "Hatkanangle", "Shirol", "Radhanagari", "Gaganbawada", "Bhudaragad", "Ajara", "Gadhinglaj", "Chandgad"]
  }
];

export const focusAreasList = [
  "Education & Literacy",
  "Healthcare & Sanitation",
  "Environmental Sustainability",
  "Rural Development",
  "Women Empowerment",
  "Skill Development",
  "Water Conservation",
  "Disaster Management",
  "Animal Welfare"
];

export const sdgGoalsList = [
  "SDG 1: No Poverty",
  "SDG 2: Zero Hunger",
  "SDG 3: Good Health and Well-being",
  "SDG 4: Quality Education",
  "SDG 5: Gender Equality",
  "SDG 6: Clean Water and Sanitation",
  "SDG 7: Affordable and Clean Energy",
  "SDG 8: Decent Work and Economic Growth",
  "SDG 9: Industry, Innovation, and Infrastructure",
  "SDG 10: Reduced Inequality",
  "SDG 11: Sustainable Cities and Communities",
  "SDG 13: Climate Action",
  "SDG 15: Life on Land"
];
