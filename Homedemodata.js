/**
 * Demo view data for HomePage, projected from the ERD's courses, units,
 * laptop_models, student_verifications, and users collections. The *Id
 * properties are API-facing names for each MongoDB document's _id. Units
 * include a populated model and only listing fields needed by the storefront.
 *
 * The backend seed maps these storefront examples into ERD-shaped course,
 * laptop_model, acquisition, and unit documents. Leave photoUrl empty to see
 * the photo placeholder.
 *
 * 30 demo laptops (u1 to u30). Besides the storefront fields, each unit carries
 * a few back-office fields that only the seed reads: `batch` (which acquisition
 * it came from), `costBasis`, `cosmeticNotes`, `batteryHealthPct`, `accessories`,
 * `osInstalled`, and an optional `repair`. Status mix: 17 available, 2 reserved,
 * 7 sold, 2 awaiting inspection, 1 in repair, 1 ready (not yet listed).
 */

export const demoUser = { fullName: "Juan Dela Cruz", role: "buyer" };

export const demoVerification = { verifStatus: "approved", expiresAt: "2027-06-30" };

export const demoCourses = [
  {
    courseId: "c1",
    courseCode: "BSCE",
    courseName: "Civil Engineering",
    requirements: {
      minRamGb: 16,
      minStorageGb: 512,
      minCpuTier: 3,
      gpuRequired: true,
      minBatteryHours: 4,
      reqNotes: "AutoCAD and 3D drawing need strong graphics and plenty of memory.",
    },
  },
  {
    courseId: "c2",
    courseCode: "BSIT",
    courseName: "Information Technology",
    requirements: {
      minRamGb: 8,
      minStorageGb: 256,
      minCpuTier: 2,
      gpuRequired: false,
      minBatteryHours: 5,
      reqNotes: "Coding, virtual machines, and web development.",
    },
  },
  {
    courseId: "c3",
    courseCode: "BSBA",
    courseName: "Business Administration",
    requirements: {
      minRamGb: 8,
      minStorageGb: 256,
      minCpuTier: 1,
      gpuRequired: false,
      minBatteryHours: 6,
      reqNotes: "Documents, spreadsheets, presentations, and video calls.",
    },
  },
  {
    courseId: "c4",
    courseCode: "BMMA",
    courseName: "Multimedia Arts",
    requirements: {
      minRamGb: 16,
      minStorageGb: 512,
      minCpuTier: 3,
      gpuRequired: true,
      minBatteryHours: 4,
      reqNotes: "Photo editing, video editing, and design software.",
    },
  },
];

// Reserved units stay reserved for a week after the seed runs (the API releases
// them once reserveUntil passes).
const reserveUntilDefault = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const unit = (id, grade, hrs, status, specs, listing, model, extra = {}) => ({
  unitId: id,
  modelId: model.modelId,
  conditionGrade: grade,
  estimatedBatteryHrs: hrs,
  unitStatus: status,
  reserveUntil: status === "reserved" ? reserveUntilDefault() : null,
  actualSpecs: specs,
  listing: { photos: [{ photoUrl: "", isPrimary: true }], ...listing },
  model,
  ...extra,
});

// Compact helpers so each laptop below reads as one block.
const S = (ram, storage, type = "SSD") => ({ actualRamGb: ram, actualStorageGb: storage, actualStorageType: type });
const L = (price, studentPrice, listedAt, warrantyMonths) => ({ price, studentPrice, listedAt, warrantyMonths });
const UNLISTED = { price: undefined, studentPrice: undefined, listedAt: undefined, warrantyMonths: undefined };
const M = (id, brand, modelName, msrp, specs) => ({ modelId: id, brand, modelName, msrp, specs });

export const demoUnits = [
  /* ---------- Batch 1: corporate surplus (business-class and workstations) ---------- */
  unit("u1", "A", 9, "available", S(16, 512), L(28500, 26500, "2026-10-30", 6),
    M("m1", "Dell", "Latitude 7420", 89000, { cpuName: "Core i7-1185G7", cpuTier: 3, gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.36, designBatteryHrs: 12, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 16500, batteryHealthPct: 91, osInstalled: "Windows 11 Pro", cosmeticNotes: "Like new; faint wear on the palm rest.", accessories: ["Original charger"] }),
  unit("u2", "B", 7, "available", S(16, 512), L(24900, 22900, "2026-10-28", 6),
    M("m2", "Lenovo", "ThinkPad T14 Gen 2", 72000, { cpuName: "Core i5-1135G7", cpuTier: 2, gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.47, designBatteryHrs: 14, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 14800, batteryHealthPct: 84, osInstalled: "Windows 11 Pro", cosmeticNotes: "Light scratches on the lid.", accessories: ["Original charger"] }),
  unit("u3", "A", 6, "available", S(32, 1024), L(47500, 44900, "2026-10-29", 12),
    M("m3", "Dell", "Precision 5550", 165000, { cpuName: "Core i7-10850H", cpuTier: 4, gpu: "NVIDIA Quadro T2000", screenSizeIn: 15.6, weightKg: 1.8, designBatteryHrs: 9, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 29500, batteryHealthPct: 80, osInstalled: "Windows 11 Pro", cosmeticNotes: "Clean chassis; minor keycap shine.", accessories: ["Original charger", "Laptop sleeve"] }),
  unit("u4", "B", 5, "available", S(16, 512), L(38900, 36500, "2026-10-25", 6),
    M("m4", "HP", "ZBook Firefly 15 G8", 118000, { cpuName: "Core i7-1165G7", cpuTier: 3, gpu: "NVIDIA T500", screenSizeIn: 15.6, weightKg: 1.7, designBatteryHrs: 10, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 23800, batteryHealthPct: 78, osInstalled: "Windows 11 Pro", cosmeticNotes: "Small dent on the bottom corner.", accessories: ["Original charger"] }),
  unit("u5", "A", 10, "available", S(16, 512), L(32900, 30900, "2026-11-01", 12),
    M("m5", "Lenovo", "ThinkPad X1 Carbon Gen 9", 135000, { cpuName: "Core i7-1165G7", cpuTier: 3, gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.13, designBatteryHrs: 16, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 20500, batteryHealthPct: 93, osInstalled: "Windows 11 Pro", cosmeticNotes: "Excellent condition.", accessories: ["Original charger", "Laptop sleeve"] }),
  unit("u11", "A", 8, "available", S(16, 512), L(36500, 34500, "2026-11-03", 12),
    M("m11", "Dell", "Latitude 7430", 105000, { cpuName: "Core i7-1265U", cpuTier: 3, gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.37, designBatteryHrs: 14, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 22000, batteryHealthPct: 92, osInstalled: "Windows 11 Pro", cosmeticNotes: "No visible marks.", accessories: ["Original charger"] }),
  unit("u12", "A", 9, "available", S(16, 512), L(30500, 28500, "2026-11-04", 12),
    M("m12", "HP", "EliteBook 840 G8", 98000, { cpuName: "Core i7-1165G7", cpuTier: 3, gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.36, designBatteryHrs: 13, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 18500, batteryHealthPct: 89, osInstalled: "Windows 11 Pro", cosmeticNotes: "Very light wear on the keyboard deck.", accessories: ["Original charger"] }),
  unit("u20", "B", 5, "available", S(32, 1024), L(52900, 49900, "2026-11-05", 12),
    M("m20", "Dell", "Precision 7540", 190000, { cpuName: "Core i7-9850H", cpuTier: 4, gpu: "NVIDIA Quadro T2000", screenSizeIn: 15.6, weightKg: 2.6, designBatteryHrs: 6, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 33000, batteryHealthPct: 75, osInstalled: "Windows 11 Pro", cosmeticNotes: "Scuffs on the corners from transport.", accessories: ["Original charger"] }),
  unit("u21", "A", 7, "available", S(16, 512), L(42500, 39900, "2026-11-06", 12),
    M("m21", "Lenovo", "ThinkPad P15s Gen 2", 125000, { cpuName: "Core i7-1165G7", cpuTier: 3, gpu: "NVIDIA T500", screenSizeIn: 15.6, weightKg: 1.9, designBatteryHrs: 10, os: "Windows 11 Pro" }),
    { batch: 1, costBasis: 27500, batteryHealthPct: 90, osInstalled: "Windows 11 Pro", cosmeticNotes: "Clean; no dents or scratches.", accessories: ["Original charger", "Laptop sleeve"] }),
  unit("u22", "B", 5, "available", S(16, 512), L(34900, 32500, "2026-11-07", 6),
    M("m22", "HP", "ZBook Studio G5", 150000, { cpuName: "Core i7-8750H", cpuTier: 4, gpu: "NVIDIA Quadro P1000", screenSizeIn: 15.6, weightKg: 2.0, designBatteryHrs: 8, os: "Windows 10 Pro" }),
    { batch: 1, costBasis: 21000, batteryHealthPct: 74, osInstalled: "Windows 10 Pro", cosmeticNotes: "Light scratches on the base.", accessories: ["Original charger"],
      repair: { partReplaced: "Cooling fan", partCost: 900, laborCost: 300, repairNotes: "Replaced noisy fan and re-pasted the CPU." } }),
  unit("u23", "A", 7, "available", S(16, 512), L(45900, 43500, "2026-11-08", 12),
    M("m23", "Dell", "XPS 15 9500", 140000, { cpuName: "Core i7-10750H", cpuTier: 4, gpu: "NVIDIA GeForce GTX 1650 Ti", screenSizeIn: 15.6, weightKg: 2.0, designBatteryHrs: 10, os: "Windows 11 Home" }),
    { batch: 1, costBasis: 29500, batteryHealthPct: 88, osInstalled: "Windows 11 Home", cosmeticNotes: "Excellent condition; screen is spotless.", accessories: ["Original charger", "Laptop sleeve"] }),

  /* ---------- Batch 2: refurbished stock (everyday and budget laptops) ---------- */
  unit("u6", "C", 4, "available", S(8, 256), L(12500, 11500, "2026-10-20", 3),
    M("m6", "Dell", "Latitude 5490", 62000, { cpuName: "Core i5-8350U", cpuTier: 2, gpu: "Intel UHD 620", screenSizeIn: 14, weightKg: 1.56, designBatteryHrs: 10, os: "Windows 10 Pro" }),
    { batch: 2, costBasis: 6800, batteryHealthPct: 68, osInstalled: "Windows 10 Pro", cosmeticNotes: "Visible scuffs on the lid and bezel; one rubber foot missing.", accessories: ["Charger (third-party)"],
      repair: { partReplaced: "Battery pack", partCost: 1800, laborCost: 300, repairNotes: "Swapped worn battery; capacity now acceptable." } }),
  unit("u7", "B", 8, "available", S(8, 256), L(16900, 15500, "2026-10-27", 6),
    M("m7", "HP", "EliteBook 840 G6", 78000, { cpuName: "Core i5-8365U", cpuTier: 2, gpu: "Intel UHD 620", screenSizeIn: 14, weightKg: 1.48, designBatteryHrs: 14, os: "Windows 11 Pro" }),
    { batch: 2, costBasis: 9800, batteryHealthPct: 82, osInstalled: "Windows 11 Pro", cosmeticNotes: "Light wear on the keyboard deck.", accessories: ["Original charger"] }),
  unit("u9", "A", 11, "available", S(8, 512), L(19500, null, "2026-10-31", 6),
    M("m9", "Lenovo", "ThinkPad L14 Gen 1", 58000, { cpuName: "Ryzen 5 PRO 4650U", cpuTier: 2, gpu: "Radeon Graphics", screenSizeIn: 14, weightKg: 1.6, designBatteryHrs: 13, os: "Windows 11 Pro" }),
    { batch: 2, costBasis: 11500, batteryHealthPct: 90, osInstalled: "Windows 11 Pro", cosmeticNotes: "Near mint; no visible marks.", accessories: ["Original charger"] }),
  unit("u10", "C", 6, "available", S(16, 256), L(17500, 16200, "2026-10-18", 3),
    M("m10", "HP", "ProBook 450 G8", 54000, { cpuName: "Core i5-1135G7", cpuTier: 2, gpu: "Intel Iris Xe", screenSizeIn: 15.6, weightKg: 1.74, designBatteryHrs: 10, os: "Windows 11 Pro" }),
    { batch: 2, costBasis: 10200, batteryHealthPct: 72, osInstalled: "Windows 11 Pro", cosmeticNotes: "Worn keycaps and scuffed corners.", accessories: ["Original charger"] }),
  unit("u13", "C", 5, "sold", S(8, 256), L(13500, 12500, "2026-10-02", 3),
    M("m13", "Lenovo", "ThinkPad T480", 70000, { cpuName: "Core i5-8350U", cpuTier: 2, gpu: "Intel UHD 620", screenSizeIn: 14, weightKg: 1.58, designBatteryHrs: 15, os: "Windows 10 Pro" }),
    { batch: 2, costBasis: 6200, batteryHealthPct: 70, osInstalled: "Windows 10 Pro", cosmeticNotes: "Shiny keys and a few chips on the palm rest.", accessories: ["Original charger"],
      repair: { partReplaced: "Battery pack", partCost: 1600, laborCost: 300, repairNotes: "Replaced external battery." } }),
  unit("u14", "B", 6, "sold", S(8, 256), L(15900, 14500, "2026-10-05", 6),
    M("m14", "Lenovo", "ThinkPad E14 Gen 2 AMD", 45000, { cpuName: "Ryzen 5 4500U", cpuTier: 2, gpu: "Radeon Graphics", screenSizeIn: 14, weightKg: 1.64, designBatteryHrs: 11, os: "Windows 11 Home" }),
    { batch: 2, costBasis: 9400, batteryHealthPct: 80, osInstalled: "Windows 11 Home", cosmeticNotes: "Minor scratches on the lid.", accessories: ["Original charger"] }),
  unit("u15", "C", 5, "sold", S(8, 256), L(12900, 11900, "2026-09-20", 3),
    M("m15", "Dell", "Latitude 3520", 40000, { cpuName: "Core i3-1115G4", cpuTier: 1, gpu: "Intel UHD Graphics", screenSizeIn: 15.6, weightKg: 1.79, designBatteryHrs: 8, os: "Windows 11 Pro" }),
    { batch: 2, costBasis: 7600, batteryHealthPct: 73, osInstalled: "Windows 11 Pro", cosmeticNotes: "Scratches on the lid and a small crack near the hinge cover.", accessories: ["Original charger"] }),
  unit("u16", "B", 7, "sold", S(8, 256), L(14500, 13500, "2026-09-28", 6),
    M("m16", "HP", "ProBook 440 G8", 42000, { cpuName: "Core i3-1115G4", cpuTier: 1, gpu: "Intel UHD Graphics", screenSizeIn: 14, weightKg: 1.4, designBatteryHrs: 10, os: "Windows 11 Pro" }),
    { batch: 2, costBasis: 8800, batteryHealthPct: 83, osInstalled: "Windows 11 Pro", cosmeticNotes: "Light wear on the corners.", accessories: ["Original charger"] }),
  unit("u17", "B", 6, "sold", S(8, 512), L(16500, 15200, "2026-10-08", 6),
    M("m17", "Acer", "Aspire 5 A515-56", 38000, { cpuName: "Core i5-1135G7", cpuTier: 2, gpu: "Intel Iris Xe", screenSizeIn: 15.6, weightKg: 1.7, designBatteryHrs: 8, os: "Windows 11 Home" }),
    { batch: 2, costBasis: 9900, batteryHealthPct: 81, osInstalled: "Windows 11 Home", cosmeticNotes: "Small scratches on the palm rest.", accessories: ["Original charger"] }),
  unit("u18", "C", 4, "sold", S(8, 256), L(11500, 10500, "2026-09-15", 3),
    M("m18", "ASUS", "VivoBook 15 X515", 30000, { cpuName: "Core i3-1005G1", cpuTier: 1, gpu: "Intel UHD Graphics", screenSizeIn: 15.6, weightKg: 1.8, designBatteryHrs: 6, os: "Windows 11 Home" }),
    { batch: 2, costBasis: 6000, batteryHealthPct: 69, osInstalled: "Windows 11 Home", cosmeticNotes: "Scuffed lid; worn trackpad coating.", accessories: ["Original charger"] }),
  unit("u19", "B", 5, "sold", S(8, 512), L(15500, 14500, "2026-07-10", 3),
    M("m19", "Dell", "Inspiron 15 3511", 44000, { cpuName: "Core i5-1135G7", cpuTier: 2, gpu: "Intel Iris Xe", screenSizeIn: 15.6, weightKg: 1.8, designBatteryHrs: 7, os: "Windows 11 Home" }),
    { batch: 2, costBasis: 9200, batteryHealthPct: 78, osInstalled: "Windows 11 Home", cosmeticNotes: "Light scratches on the bottom case.", accessories: ["Original charger"] }),

  /* ---------- Batch 3: trade-ins (gaming-class laptops and unprocessed stock) ---------- */
  unit("u8", "B", 8, "reserved", S(16, 512), L(21900, 20500, "2026-10-22", 6),
    M("m8", "Acer", "TravelMate P2", 48000, { cpuName: "Core i5-1135G7", cpuTier: 2, gpu: "Intel Iris Xe", screenSizeIn: 15.6, weightKg: 1.8, designBatteryHrs: 12, os: "Windows 11 Pro" }),
    { batch: 3, costBasis: 13200, batteryHealthPct: 85, osInstalled: "Windows 11 Pro", cosmeticNotes: "Scratches near the trackpad.", accessories: ["Original charger"] }),
  unit("u24", "B", 5, "reserved", S(16, 512), L(33900, 31900, "2026-11-02", 6),
    M("m24", "Lenovo", "Legion 5 15ARH05", 62000, { cpuName: "Ryzen 5 4600H", cpuTier: 3, gpu: "NVIDIA GeForce GTX 1650 Ti", screenSizeIn: 15.6, weightKg: 2.3, designBatteryHrs: 6, os: "Windows 11 Home" }),
    { batch: 3, costBasis: 21500, batteryHealthPct: 81, osInstalled: "Windows 11 Home", cosmeticNotes: "Light wear on the keyboard; clean screen.", accessories: ["Original charger"] }),
  unit("u25", "B", 4, "available", S(16, 512), L(31500, 29900, "2026-11-09", 6),
    M("m25", "ASUS", "TUF Gaming A15 FA506", 60000, { cpuName: "Ryzen 7 4800H", cpuTier: 3, gpu: "NVIDIA GeForce GTX 1650", screenSizeIn: 15.6, weightKg: 2.3, designBatteryHrs: 6, os: "Windows 11 Home" }),
    { batch: 3, costBasis: 19800, batteryHealthPct: 79, osInstalled: "Windows 11 Home", cosmeticNotes: "Minor scuffs on the lid.", accessories: ["Original charger"] }),
  unit("u26", "B", 4, "available", S(16, 512), L(32900, 30900, "2026-11-10", 6),
    M("m26", "Acer", "Nitro 5 AN515-55", 64000, { cpuName: "Core i7-10750H", cpuTier: 3, gpu: "NVIDIA GeForce GTX 1650 Ti", screenSizeIn: 15.6, weightKg: 2.3, designBatteryHrs: 6, os: "Windows 11 Home" }),
    { batch: 3, costBasis: 20800, batteryHealthPct: 80, osInstalled: "Windows 11 Home", cosmeticNotes: "Light scratches on the palm rest.", accessories: ["Original charger"] }),
  unit("u27", "C", 3, "in_repair", S(16, 512), UNLISTED,
    M("m27", "HP", "Pavilion Gaming 15", 48000, { cpuName: "Ryzen 5 4600H", cpuTier: 3, gpu: "NVIDIA GeForce GTX 1650", screenSizeIn: 15.6, weightKg: 2.2, designBatteryHrs: 6, os: "Windows 11 Home" }),
    { batch: 3, costBasis: 15500, batteryHealthPct: 66, osInstalled: "Windows 11 Home", cosmeticNotes: "Worn finish on the palm rest; several keys unresponsive.", accessories: ["Original charger"],
      repair: { partReplaced: "Keyboard assembly", partCost: 1400, laborCost: 500, repairNotes: "Replacement keyboard ordered; unit is waiting for the part." } }),
  unit("u28", "A", 12, "ready", S(16, 512), UNLISTED,
    M("m28", "Lenovo", "ThinkPad X13 Gen 2", 95000, { cpuName: "Ryzen 7 PRO 5850U", cpuTier: 3, gpu: "Radeon Graphics", screenSizeIn: 13.3, weightKg: 1.28, designBatteryHrs: 15, os: "Windows 11 Pro" }),
    { batch: 3, costBasis: 21000, batteryHealthPct: 94, osInstalled: "Windows 11 Pro", cosmeticNotes: "Excellent condition; ready to be priced and listed.", accessories: ["Original charger"] }),
  unit("u29", "B", null, "awaiting_inspection", S(16, 256), UNLISTED,
    M("m29", "Dell", "Latitude 5400", 66000, { cpuName: "Core i5-8365U", cpuTier: 2, gpu: "Intel UHD 620", screenSizeIn: 14, weightKg: 1.5, designBatteryHrs: 12, os: "Windows 10 Pro" }),
    { batch: 3, costBasis: 11800, batteryHealthPct: null, osInstalled: "", cosmeticNotes: "", accessories: [] }),
  unit("u30", "B", null, "awaiting_inspection", S(16, 512), UNLISTED,
    M("m30", "HP", "EliteBook 830 G7", 88000, { cpuName: "Core i7-10610U", cpuTier: 3, gpu: "Intel UHD Graphics", screenSizeIn: 13.3, weightKg: 1.26, designBatteryHrs: 14, os: "Windows 10 Pro" }),
    { batch: 3, costBasis: 17500, batteryHealthPct: null, osInstalled: "", cosmeticNotes: "", accessories: [] }),
];

// Models that exist in the catalog but have no units yet: they are used by the
// batches that are still on order or received-but-not-split.
export const demoCatalogOnlyModels = [
  M("m31", "Lenovo", "ThinkPad E14 Gen 3", 52000, { cpuName: "Core i5-1135G7", cpuTier: 2, ramGb: 8, storageGb: 256, storageType: "SSD", gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.64, designBatteryHrs: 10, os: "Windows 11 Pro" }),
  M("m32", "Dell", "Latitude 5420", 78000, { cpuName: "Core i5-1145G7", cpuTier: 2, ramGb: 16, storageGb: 256, storageType: "SSD", gpu: "Intel Iris Xe", screenSizeIn: 14, weightKg: 1.4, designBatteryHrs: 12, os: "Windows 11 Pro" }),
  M("m33", "HP", "ProBook 430 G8", 46000, { cpuName: "Core i5-1135G7", cpuTier: 2, ramGb: 8, storageGb: 256, storageType: "SSD", gpu: "Intel Iris Xe", screenSizeIn: 13.3, weightKg: 1.28, designBatteryHrs: 10, os: "Windows 11 Pro" }),
];
