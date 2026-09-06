export const components = [
  { id: 1, category: "CPU", name: "AMD Ryzen 5 7600", brand: "AMD", price: 18000, power: 65, socket: "AM5" },
  { id: 2, category: "CPU", name: "AMD Ryzen 7 7700", brand: "AMD", price: 28000, power: 65, socket: "AM5" },
  { id: 3, category: "CPU", name: "Intel Core i5-14600K", brand: "Intel", price: 30000, power: 125, socket: "LGA1700" },

  { id: 4, category: "Motherboard", name: "B650 Gaming Motherboard", brand: "MSI", price: 16000, power: 50, socket: "AM5", ramType: "DDR5" },
  { id: 5, category: "Motherboard", name: "Z790 Gaming Motherboard", brand: "ASUS", price: 22000, power: 60, socket: "LGA1700", ramType: "DDR5" },

  { id: 6, category: "RAM", name: "16GB DDR5 5600MHz", brand: "Corsair", price: 5000, power: 5, ramType: "DDR5" },
  { id: 7, category: "RAM", name: "32GB DDR5 6000MHz", brand: "Kingston", price: 10000, power: 8, ramType: "DDR5" },

  { id: 8, category: "GPU", name: "GeForce RTX 4060", brand: "NVIDIA", price: 30000, power: 115 },
  { id: 9, category: "GPU", name: "GeForce RTX 4070", brand: "NVIDIA", price: 55000, power: 200 },

  { id: 10, category: "Storage", name: "1TB NVMe SSD", brand: "Samsung", price: 7000, power: 8 },
  { id: 11, category: "Storage", name: "2TB NVMe SSD", brand: "WD", price: 12000, power: 10 },

  { id: 12, category: "PSU", name: "650W Gold PSU", brand: "Corsair", price: 9000, power: 0, wattage: 650 },
  { id: 13, category: "PSU", name: "750W Gold PSU", brand: "Cooler Master", price: 12000, power: 0, wattage: 750 },

  { id: 14, category: "Case", name: "Mid Tower Case", brand: "NZXT", price: 5000, power: 5 }
];

export const categories = ["All", "CPU", "Motherboard", "RAM", "GPU", "Storage", "PSU", "Case"];
