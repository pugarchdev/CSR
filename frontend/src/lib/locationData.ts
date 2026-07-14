export interface DistrictInfo {
  name: string;
  cities: string[];
  talukas: string[];
}

export interface StateInfo {
  name: string;
  districts: DistrictInfo[];
}

export const locationData: StateInfo[] = [
  {
    name: "Maharashtra",
    districts: [
      {
        name: "Pune",
        cities: ["Pune City", "Pimpri-Chinchwad", "Lonavala", "Baramati", "Shirur", "Chakan"],
        talukas: ["Haveli", "Mulshi", "Maval", "Shirur", "Baramati", "Indapur", "Khed", "Junner", "Ambegaon", "Purandhar", "Bhor", "Velhe", "Daund"]
      },
      {
        name: "Nagpur",
        cities: ["Nagpur City", "Kamptee", "Umred", "Katol"],
        talukas: ["Nagpur Rural", "Nagpur Urban", "Kamptee", "Ramtek", "Hingna", "Katol", "Kalmeshwar", "Savner", "Parseoni", "Mauda", "Umred", "Bhiwapur", "Kuhi"]
      },
      {
        name: "Thane",
        cities: ["Thane City", "Kalyan-Dombivli", "Ulhasnagar", "Ambarnath", "Bhiwandi", "Mira-Bhayandar"],
        talukas: ["Thane", "Kalyan", "Murbad", "Bhiwandi", "Shahapur", "Ulhasnagar", "Ambernath"]
      },
      {
        name: "Mumbai City",
        cities: ["Mumbai City"],
        talukas: ["Mumbai City"]
      },
      {
        name: "Mumbai Suburban",
        cities: ["Andheri", "Borivali", "Kurla", "Bandra", "Ghatkopar"],
        talukas: ["Andheri", "Borivali", "Kurla"]
      },
      {
        name: "Nashik",
        cities: ["Nashik City", "Malegaon", "Manmad", "Sinnar"],
        talukas: ["Nashik", "Sinnar", "Igatpuri", "Dindori", "Peth", "Trimbakeshwar", "Kalwan", "Surgana", "Baglan", "Malegaon", "Chandwad", "Nandgaon", "Yeola", "Niphad", "Deola"]
      },
      {
        name: "Aurangabad",
        cities: ["Aurangabad City", "Vaijapur", "Kannad", "Sillod"],
        talukas: ["Aurangabad", "Kannad", "Soegaon", "Sillod", "Phulambri", "Khuldabad", "Vaijapur", "Gangapur", "Paithan"]
      },
      {
        name: "Amravati",
        cities: ["Amravati City", "Achalpur", "Morshi"],
        talukas: ["Amravati", "Bhatkuli", "Nandgaon Khandeshwar", "Dharni", "Chikhaldara", "Achalpur", "Chandurbazar", "Morshi", "Warud", "Daryapur", "Anjangaon Surji", "Chandur Railway", "Dhamangaon Railway", "Teosa"]
      },
      {
        name: "Kolhapur",
        cities: ["Kolhapur City", "Ichalkaranji", "Kagal"],
        talukas: ["Karvir", "Panhala", "Shahuwadi", "Kagal", "Hatkanangle", "Shirol", "Radhanagari", "Gaganbawada", "Bhudaragad", "Ajara", "Gadhinglaj", "Chandgad"]
      },
      {
        name: "Gadchiroli",
        cities: ["Gadchiroli", "Desaiganj", "Aheri"],
        talukas: ["Gadchiroli", "Dhanora", "Chamorshi", "Mulchera", "Aheri", "Sironcha", "Etapalli", "Bhamragad", "Kurkheda", "Korchi", "Armori", "Desaiganj"]
      },
      {
        name: "Ahmednagar",
        cities: ["Ahmednagar City", "Sangamner", "Kopargaon", "Shrirampur"],
        talukas: ["Nagar", "Rahuri", "Sangamner", "Kopargaon", "Shrirampur", "Nevasa", "Shevgaon", "Pathardi", "Parner", "Akole", "Jamkhed", "Karjat", "Shrigonda", "Rahata"]
      },
      {
        name: "Akola",
        cities: ["Akola City", "Akot"],
        talukas: ["Akola", "Akot", "Telhara", "Balapur", "Patur", "Barshitakli", "Murtizapur"]
      },
      {
        name: "Beed",
        cities: ["Beed City", "Parli", "Ambejogai"],
        talukas: ["Beed", "Ashti", "Gevrai", "Kaij", "Majalgaon", "Parli", "Patoda", "Shirur", "Wadwani", "Ambajogai", "Dharur"]
      },
      {
        name: "Bhandara",
        cities: ["Bhandara City", "Tumsar"],
        talukas: ["Bhandara", "Tumsar", "Pawni", "Mohadi", "Sakoli", "Lakhani", "Lakhandur"]
      },
      {
        name: "Buldhana",
        cities: ["Buldhana City", "Khamgaon", "Malkapur", "Shegaon"],
        talukas: ["Buldhana", "Chikhli", "Deulgaon Raja", "Jalgaon Jamod", "Sangrampur", "Malkapur", "Motala", "Nandura", "Khamgaon", "Shegaon", "Mehkar", "Sindkhed Raja", "Lonar"]
      },
      {
        name: "Chandrapur",
        cities: ["Chandrapur City", "Ballarpur", "Warora"],
        talukas: ["Chandrapur", "Bhadravati", "Warora", "Chimur", "Nagbhid", "Brahmapuri", "Sindewahi", "Mul", "Sawali", "Gondpipri", "Korpana", "Rajura", "Jiwanati", "Ballarpur", "Pombhurna"]
      },
      {
        name: "Dhule",
        cities: ["Dhule City", "Shirpur", "Dondaicha"],
        talukas: ["Dhule", "Sakri", "Sindkhede", "Shirpur"]
      },
      {
        name: "Gondia",
        cities: ["Gondia City", "Tirora"],
        talukas: ["Gondia", "Tirora", "Goregaon", "Arjuni Morgaon", "Amgaon", "Salekasa", "Sadak Arjuni", "Deori"]
      },
      {
        name: "Hingoli",
        cities: ["Hingoli City", "Basmath"],
        talukas: ["Hingoli", "Kalamnuri", "Sengaon", "Basmath", "Aundha Nagnath"]
      },
      {
        name: "Jalgaon",
        cities: ["Jalgaon City", "Bhusawal", "Chalisgaon", "Amalner"],
        talukas: ["Jalgaon", "Jamner", "Erandol", "Dharangaon", "Bhadgaon", "Chalisgaon", "Pachora", "Bhusawal", "Yawal", "Raver", "Muktainagar", "Bodwad", "Amalner", "Chopda", "Parola"]
      },
      {
        name: "Jalna",
        cities: ["Jalna City", "Ambad", "Bhokardan"],
        talukas: ["Jalna", "Badnapur", "Bhokardan", "Jafrabad", "Ambad", "Ghansawangi", "Partur", "Mantha"]
      },
      {
        name: "Latur",
        cities: ["Latur City", "Udgir", "Ausa"],
        talukas: ["Latur", "Renapur", "Ahmedpur", "Jalkot", "Chakur", "Shirur Anantpal", "Ausa", "Nilanga", "Udgir", "Deoni"]
      },
      {
        name: "Nanded",
        cities: ["Nanded-Waghala", "Degloor", "Loha"],
        talukas: ["Nanded", "Ardhapur", "Bhokar", "Mudkhed", "Hadgaon", "Himayatnagar", "Kinwat", "Mahoor", "Loha", "Kandhar", "Mukhed", "Degloor", "Biloli", "Dharmabad", "Naigaon", "Umri"]
      },
      {
        name: "Nandurbar",
        cities: ["Nandurbar City", "Shahada"],
        talukas: ["Nandurbar", "Navapur", "Shahada", "Taloda", "Akkalkuwa", "Akrani"]
      },
      {
        name: "Osmanabad",
        cities: ["Osmanabad City", "Tuljapur", "Omerga"],
        talukas: ["Osmanabad", "Tuljapur", "Bhumi", "Paranda", "Washi", "Kalamb", "Omerga", "Lohara"]
      },
      {
        name: "Palghar",
        cities: ["Palghar City", "Virar", "Vasai", "Dahanu"],
        talukas: ["Palghar", "Vasai", "Dahanu", "Talasari", "Jawhar", "Mokhada", "Wada", "Vikramgad"]
      },
      {
        name: "Parbhani",
        cities: ["Parbhani City", "Gangakhed", "Sailu"],
        talukas: ["Parbhani", "Jintur", "Sailu", "Manwath", "Pathri", "Sonpeth", "Gangakhed", "Palam", "Purna"]
      },
      {
        name: "Raigad",
        cities: ["Alibag", "Panvel", "Khopoli", "Karjat", "Pen", "Mahad"],
        talukas: ["Pen", "Alibag", "Murud", "Panvel", "Urana", "Karjat", "Khalapur", "Mangaon", "Tala", "Roha", "Sudhagad", "Mahad", "Poladpur", "Shrivardhan", "Mhasala"]
      },
      {
        name: "Ratnagiri",
        cities: ["Ratnagiri City", "Chiplun", "Dapoli"],
        talukas: ["Ratnagiri", "Sangameshwar", "Lanja", "Rajapur", "Chiplun", "Guhagar", "Dapoli", "Mandangad", "Khed"]
      },
      {
        name: "Sangli",
        cities: ["Sangli City", "Miraj", "Vita", "Islampur"],
        talukas: ["Miraj", "Tasgaon", "Khanapur", "Atpadi", "Kavathemahankal", "Jat", "Walwa", "Shirala", "Kadegaon", "Palus"]
      },
      {
        name: "Satara",
        cities: ["Satara City", "Karad", "Phaltan", "Wai"],
        talukas: ["Satara", "Koregaon", "Wai", "Mahabaleshwar", "Khandala", "Phaltan", "Man", "Khatav", "Karad", "Patan", "Jaoli"]
      },
      {
        name: "Sindhudurg",
        cities: ["Sawantwadi", "Malvan", "Kudal"],
        talukas: ["Sawantwadi", "Kudal", "Vengurla", "Malvan", "Devgad", "Kankavali", "Vaibhavwadi", "Dodamarg"]
      },
      {
        name: "Solapur",
        cities: ["Solapur City", "Pandharpur", "Barshi"],
        talukas: ["Solapur North", "Solapur South", "Akkalkot", "South Solapur", "Barshi", "Mohol", "Madha", "Karmala", "Sangola", "Malshiras", "Pandharpur", "Mangalvedhe"]
      },
      {
        name: "Wardha",
        cities: ["Wardha City", "Hinganghat", "Arvi"],
        talukas: ["Wardha", "Deoli", "Seloo", "Arvi", "Ashti", "Karanja", "Hinganghat", "Samudrapur"]
      },
      {
        name: "Washim",
        cities: ["Washim City", "Karanja"],
        talukas: ["Washim", "Risod", "Malegaon", "Mangrulpir", "Karanja", "Manora"]
      },
      {
        name: "Yavatmal",
        cities: ["Yavatmal City", "Pusad", "Wani"],
        talukas: ["Yavatmal", "Babhulgaon", "Kalamb", "Darwha", "Digras", "Pusad", "Umarkhed", "Mahagaon", "Kelapur", "Ghatanji", "Wani", "Maregaon", "Zari Jamani", "Ralegaon", "Ner", "Arni"]
      }
    ]
  },
  {
    name: "Gujarat",
    districts: [
      {
        name: "Ahmedabad",
        cities: ["Ahmedabad City", "Bavla", "Sanand"],
        talukas: ["Ahmedabad City", "Bavla", "Daskroi", "Detroj-Rampura", "Dhandhuka", "Dholera", "Dholka", "Mandal", "Sanand", "Viramgam"]
      },
      {
        name: "Surat",
        cities: ["Surat City", "Vyara", "Bardoli"],
        talukas: ["Bardoli", "Choryasi", "Kamrej", "Mahuva", "Mandvi", "Mangrol", "Olpad", "Palasana", "Surat City", "Umarpada"]
      },
      {
        name: "Vadodara",
        cities: ["Vadodara City", "Dabhoi", "Padra"],
        talukas: ["Vadodara", "Dabhoi", "Karjan", "Padra", "Savli", "Sinor", "Waghodia"]
      },
      {
        name: "Rajkot",
        cities: ["Rajkot City", "Gondal", "Jetpur"],
        talukas: ["Rajkot City", "Gondal", "Jetpur", "Dhoraji", "Kotda Sangani", "Lodhika", "Paddhari", "Jasdan", "Vinchhiya", "Upleta"]
      }
    ]
  },
  {
    name: "Karnataka",
    districts: [
      {
        name: "Bengaluru Urban",
        cities: ["Bengaluru", "Yelahanka", "Anekal"],
        talukas: ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal", "Yelahanka"]
      },
      {
        name: "Mysore",
        cities: ["Mysore City", "Hunsur", "Nanjangud"],
        talukas: ["Mysore", "Hunsur", "KR Nagar", "Nanjangud", "HD Kote", "T Narasipura", "Piriyapatna", "Saragur"]
      },
      {
        name: "Dharwad",
        cities: ["Hubli", "Dharwad", "Kundgol"],
        talukas: ["Dharwad", "Hubli", "Hubli Rural", "Kundgol", "Navalgund", "Kalghatgi", "Alnavar", "Annigeri"]
      }
    ]
  },
  {
    name: "Delhi",
    districts: [
      {
        name: "New Delhi",
        cities: ["New Delhi City", "Chanakyapuri", "Connaught Place"],
        talukas: ["Chanakyapuri", "Connaught Place", "Parliament Street"]
      },
      {
        name: "South Delhi",
        cities: ["Saket", "Hauz Khas", "Mehrauli"],
        talukas: ["Saket", "Hauz Khas", "Mehrauli"]
      }
    ]
  }
];

export const allStatesList = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
  "Delhi",
  "Puducherry",
  "Ladakh",
  "Jammu and Kashmir"
];
