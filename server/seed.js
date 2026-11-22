import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { demoCourses, demoUnits as allDemoUnits } from "../Homedemodata.js";

// Local test set: 20 laptops only. Change this number to load more or fewer demo units.
const DEMO_UNIT_LIMIT = 20;
// Keeps units u1 to u20 (the orders and warranties in this seed use u13 to u19).
const demoUnits = allDemoUnits.filter((unit) => Number(unit.unitId.slice(1)) <= DEMO_UNIT_LIMIT);
const demoCatalogOnlyModels = [];
import {
  Acquisition, AuditLog, Cart, Course, LaptopModel, Order, PasswordReset,
  StudentVerification, Supplier, Unit, User, Warranty,
} from "./models.js";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)), override: true });

/* ---------- demo accounts (demo only; change before sharing the database) ---------- */
const ADMIN = { fullName: "ByteBud Admin", email: "admin@bytebud.com", phone: "", password: "Admin123!", role: "admin" };
const STAFF = { fullName: "Rina Velasco", email: "staff@bytebud.com", phone: "09171234567", password: "Staff123!", role: "staff" };
const BUYERS = {
  juan: { fullName: "Juan Dela Cruz", email: "juan@bytebud.com", phone: "09181234567", password: "Buyer123!" }, // verified student
  maria: { fullName: "Maria Santos", email: "maria@bytebud.com", phone: "09191234567", password: "Buyer123!" }, // verification pending
  pedro: { fullName: "Pedro Reyes", email: "pedro@bytebud.com", phone: "09201234567", password: "Buyer123!" }, // verification rejected
  ana: { fullName: "Ana Lim", email: "ana@bytebud.com", phone: "", password: "Buyer123!", isActive: false }, // deactivated account
};

// 1x1 PNG used as a placeholder proof-of-enrolment image.
const PROOF_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const SUPPLIERS = [
  { companyName: "Cebu Corporate Surplus Trading", supplierType: "corporate", contact: { contactPerson: "Marco Villanueva", contactEmail: "marco@cebusurplus.example", contactPhone: "09175550101" } },
  { companyName: "Davao PC Refurbishers", supplierType: "refurbisher", contact: { contactPerson: "Liza Montano", contactEmail: "orders@davaorefurb.example", contactPhone: "09175550102" } },
  { companyName: "Walk-in Trade-ins", supplierType: "individual", contact: { contactPerson: "Various sellers", contactEmail: "", contactPhone: "" } },
];

// batch numbers match `batch` in Homedemodata.js. Batches 4 and 5 have no units yet.
const ACQUISITIONS = [
  { batch: 1, supplier: 0, invoiceNo: "ACQ-2026-001", sourceType: "corporate_surplus", acqStatus: "split", acquiredAt: "2026-08-18T00:00:00.000Z" },
  { batch: 2, supplier: 1, invoiceNo: "ACQ-2026-002", sourceType: "refurbished", acqStatus: "split", acquiredAt: "2026-09-05T00:00:00.000Z" },
  { batch: 3, supplier: 2, invoiceNo: "ACQ-2026-003", sourceType: "trade_in", acqStatus: "split", acquiredAt: "2026-10-12T00:00:00.000Z" },
  { batch: 4, supplier: 0, invoiceNo: "ACQ-2026-004", sourceType: "corporate_surplus", acqStatus: "received", acquiredAt: "2026-11-12T00:00:00.000Z",
    items: [{ modelId: "m31", quantity: 5, unitCost: 14500 }, { modelId: "m32", quantity: 4, unitCost: 19800 }] },
  { batch: 5, supplier: 1, invoiceNo: "ACQ-2026-005", sourceType: "refurbished", acqStatus: "ordered", acquiredAt: null,
    items: [{ modelId: "m33", quantity: 8, unitCost: 11800 }] },
];

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * DAY);
const daysFromNow = (n) => new Date(now.getTime() + n * DAY);
const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; };
const hasDedicatedGpu = (gpu) => !!gpu && !/integrated|none|n\/a|uhd|iris|radeon graphics|vega/i.test(gpu);

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing. Add it to server/.env.");
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB:", mongoose.connection.name);

const upsert = (Model, filter, set) =>
  Model.findOneAndUpdate(filter, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true });

try {
  /* ---------- users ---------- */
  const ensureUser = async ({ password, ...fields }) => {
    let user = await User.findOne({ email: fields.email });
    if (!user) {
      user = await User.create({ ...fields, passwordHash: await bcrypt.hash(password, 10) });
      console.log(`Demo ${fields.role || "buyer"} account created: ${fields.email}`);
    }
    return user;
  };
  const admin = await ensureUser(ADMIN);
  const staff = await ensureUser(STAFF);
  const buyers = {};
  for (const [key, buyer] of Object.entries(BUYERS)) buyers[key] = await ensureUser({ ...buyer, role: "buyer" });

  /* ---------- suppliers ---------- */
  const suppliers = [];
  for (const supplier of SUPPLIERS) suppliers.push(await upsert(Supplier, { companyName: supplier.companyName }, supplier));

  /* ---------- courses ---------- */
  const courses = [];
  for (const course of demoCourses) {
    courses.push(await upsert(Course, { courseCode: course.courseCode }, { courseName: course.courseName, requirements: course.requirements }));
  }

  /* ---------- laptop models (30 with units, 3 catalog-only) ---------- */
  const modelsByDemoId = new Map();
  const allDemoModels = [...demoUnits.map((unit) => ({ ...unit.model, actual: unit.actualSpecs })), ...demoCatalogOnlyModels.map((model) => ({ ...model, actual: null }))];
  for (const demoModel of allDemoModels) {
    const specs = { ...demoModel.specs };
    if (demoModel.actual) {
      specs.ramGb = demoModel.actual.actualRamGb;
      specs.storageGb = demoModel.actual.actualStorageGb;
      specs.storageType = demoModel.actual.actualStorageType;
    }
    specs.hasDedicatedGpu = String(hasDedicatedGpu(specs.gpu));
    const saved = await upsert(LaptopModel, { brand: demoModel.brand, modelName: demoModel.modelName }, {
      brand: demoModel.brand, modelName: demoModel.modelName, msrp: demoModel.msrp, specs,
    });
    modelsByDemoId.set(demoModel.modelId, saved);
  }

  /* ---------- acquisitions ---------- */
  const acquisitionsByBatch = new Map();
  for (const plan of ACQUISITIONS) {
    let items = plan.items;
    if (!items) {
      // Group the batch's units by model: quantity = unit count, unitCost = that model's cost.
      const grouped = new Map();
      for (const unit of demoUnits.filter((u) => u.batch === plan.batch)) {
        const entry = grouped.get(unit.model.modelId) || { modelId: unit.model.modelId, quantity: 0, unitCost: unit.costBasis };
        entry.quantity += 1;
        grouped.set(unit.model.modelId, entry);
      }
      items = [...grouped.values()];
    }
    // Skip models that are not in this 20-laptop set (for example catalog-only models).
    items = items.filter((item) => modelsByDemoId.has(item.modelId));
    if (!items.length) continue;
    const acqItems = items.map((item) => ({ modelId: modelsByDemoId.get(item.modelId)._id, quantity: item.quantity, unitCost: item.unitCost }));
    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const saved = await upsert(Acquisition, { invoiceNo: plan.invoiceNo }, {
      supplierId: suppliers[plan.supplier]._id,
      recordedBy: admin._id,
      sourceType: plan.sourceType,
      invoiceNo: plan.invoiceNo,
      totalCost,
      acqStatus: plan.acqStatus,
      acquiredAt: plan.acquiredAt ? new Date(plan.acquiredAt) : null,
      acqItems,
    });
    acquisitionsByBatch.set(plan.batch, saved);
  }

  /* ---------- units (30) ---------- */
  const unitsByDemoId = new Map();
  for (const demo of demoUnits) {
    const laptopModel = modelsByDemoId.get(demo.model.modelId);
    const acquisition = acquisitionsByBatch.get(demo.batch);
    const inspectedAt = new Date(new Date(ACQUISITIONS.find((a) => a.batch === demo.batch).acquiredAt).getTime() + 5 * DAY);

    // Every unit past "awaiting inspection" has an inspection record. The in-repair unit failed its keyboard check.
    const inspections = [];
    if (demo.unitStatus !== "awaiting_inspection") {
      const failedKeyboard = demo.unitStatus === "in_repair";
      inspections.push({
        inspectedBy: staff._id,
        inspectedAt,
        dataWiped: true,
        wipeMethod: "NIST 800-88 Clear",
        screenOk: true,
        keyboardOk: !failedKeyboard,
        portsOk: true,
        batteryOk: true,
        passed: !failedKeyboard,
        inspectNotes: failedKeyboard ? "Several keys unresponsive. Needs a new keyboard before listing." : "Passed all checks.",
      });
    }
    const repairs = demo.repair
      ? [{ repairedBy: staff._id, repairedAt: new Date(inspectedAt.getTime() + 2 * DAY), ...demo.repair }]
      : [];

    const saved = await upsert(Unit, { serialNumber: `DEMO-${demo.unitId.toUpperCase()}` }, {
      serialNumber: `DEMO-${demo.unitId.toUpperCase()}`,
      modelId: laptopModel._id,
      acquisitionId: acquisition._id,
      costBasis: demo.costBasis,
      conditionGrade: demo.conditionGrade,
      cosmeticNotes: demo.cosmeticNotes,
      batteryHealthPct: demo.batteryHealthPct,
      estimatedBatteryHrs: demo.estimatedBatteryHrs,
      osInstalled: demo.osInstalled,
      accessories: demo.accessories,
      unitStatus: demo.unitStatus,
      reserveUntil: demo.reserveUntil ? new Date(demo.reserveUntil) : null,
      actualSpecs: demo.actualSpecs,
      listing: demo.listing,
      inspections,
      repairs,
    });
    unitsByDemoId.set(demo.unitId, saved);
  }

  /* ---------- student verifications ---------- */
  const verifications = {};
  verifications.juan = await upsert(StudentVerification, { userId: buyers.juan._id, schoolEmail: "juan.delacruz@cmu.edu.ph" }, {
    userId: buyers.juan._id, verifiedBy: staff._id, schoolEmail: "juan.delacruz@cmu.edu.ph", proofUrl: PROOF_PNG,
    verifStatus: "approved", remarks: "Enrolment certificate matches the school email.",
    submittedAt: daysAgo(60), verifiedAt: daysAgo(59), expiresAt: new Date("2027-06-30T00:00:00.000Z"),
  });
  verifications.maria = await upsert(StudentVerification, { userId: buyers.maria._id, schoolEmail: "maria.santos@ustp.edu.ph" }, {
    userId: buyers.maria._id, verifiedBy: null, schoolEmail: "maria.santos@ustp.edu.ph", proofUrl: PROOF_PNG,
    verifStatus: "pending", remarks: "", submittedAt: daysAgo(1), verifiedAt: null, expiresAt: null,
  });
  verifications.pedro = await upsert(StudentVerification, { userId: buyers.pedro._id, schoolEmail: "pedro.reyes@xu.edu.ph" }, {
    userId: buyers.pedro._id, verifiedBy: admin._id, schoolEmail: "pedro.reyes@xu.edu.ph", proofUrl: PROOF_PNG,
    verifStatus: "rejected", remarks: "Proof image is unreadable. Please upload a clear copy.",
    submittedAt: daysAgo(20), verifiedAt: daysAgo(19), expiresAt: null,
  });

  /* ---------- password resets (one used and expired token, for history) ---------- */
  const tokenHash = createHash("sha256").update("bytebud-demo-expired-reset-token").digest("hex");
  await PasswordReset.findOneAndUpdate({ tokenHash }, {
    $set: { userId: buyers.maria._id, tokenHash, resetExpiresAt: daysAgo(9), resetUsedAt: daysAgo(9) },
  }, { upsert: true, setDefaultsOnInsert: true });

  /* ---------- carts (the two reserved units are held in buyers' carts) ---------- */
  await upsert(Cart, { userId: buyers.juan._id }, { userId: buyers.juan._id, cartItems: [{ unitId: unitsByDemoId.get("u8")._id, addedAt: daysAgo(0) }] });
  await upsert(Cart, { userId: buyers.maria._id }, { userId: buyers.maria._id, cartItems: [{ unitId: unitsByDemoId.get("u20")._id, addedAt: daysAgo(0) }] });

  /* ---------- orders ---------- */
  const demoById = new Map(demoUnits.map((unit) => [unit.unitId, unit]));
  const ORDER_PLANS = [
    { no: "BB-DEMO-0001", buyer: "juan", units: ["u13", "u14"], created: 12, status: "picked_up", pickedUp: 10, method: "GCash", pay: "paid", ref: "GC-4821-7730" },
    { no: "BB-DEMO-0002", buyer: "maria", units: ["u15"], created: 40, status: "picked_up", pickedUp: 38, method: "Cash on pickup", pay: "paid" },
    { no: "BB-DEMO-0003", buyer: "pedro", units: ["u9"], created: 30, status: "cancelled", method: "GCash", pay: "pending" },
    { no: "BB-DEMO-0004", buyer: "juan", units: ["u16"], created: 3, status: "ready_for_pickup", pickup: 2, method: "Bank transfer", pay: "paid", ref: "BT-20261113-0098" },
    { no: "BB-DEMO-0005", buyer: "maria", units: ["u17"], created: 1, status: "pending", pickup: 5, method: "GCash", pay: "pending" },
    { no: "BB-DEMO-0006", buyer: "juan", units: ["u18"], created: 2, status: "confirmed", pickup: 4, method: "Cash on pickup", pay: "pending" },
    { no: "BB-DEMO-0007", buyer: "pedro", units: ["u19"], created: 107, status: "picked_up", pickedUp: 105, method: "Cash on pickup", pay: "paid" },
  ];
  const FLOW = ["pending", "confirmed", "ready_for_pickup", "picked_up"];
  const ordersByNo = new Map();
  for (const plan of ORDER_PLANS) {
    let order = await Order.findOne({ orderNo: plan.no });
    if (!order) {
      const buyer = buyers[plan.buyer];
      const verified = plan.buyer === "juan";
      const created = daysAgo(plan.created);
      const pickedUpAt = plan.pickedUp != null ? daysAgo(plan.pickedUp) : null;
      let subtotal = 0;
      let discountTotal = 0;
      const orderItems = plan.units.map((unitKey) => {
        const demo = demoById.get(unitKey);
        const unit = unitsByDemoId.get(unitKey);
        const price = demo.listing.price;
        const discount = verified && demo.listing.studentPrice != null ? Math.max(0, price - demo.listing.studentPrice) : 0;
        subtotal += price;
        discountTotal += discount;
        return {
          unitId: unit._id,
          priceAtSale: price,
          discountAmount: discount,
          returnDeadline: pickedUpAt ? new Date(pickedUpAt.getTime() + 14 * DAY) : null,
          snapshot: { snapBrand: demo.model.brand, snapModelName: demo.model.modelName, snapSerialNumber: unit.serialNumber, snapConditionGrades: demo.conditionGrade },
        };
      });
      const path = plan.status === "cancelled" ? ["pending", "cancelled"] : FLOW.slice(0, FLOW.indexOf(plan.status) + 1);
      const statusHistory = path.map((newStatus, index) => ({
        newStatus,
        changedAt: new Date(created.getTime() + index * 0.5 * DAY),
        changedBy: index === 0 ? buyer._id : staff._id,
      }));
      order = await Order.create({
        orderNo: plan.no,
        userId: buyer._id,
        verificationId: discountTotal > 0 ? verifications.juan._id : null,
        subtotal,
        discountTotal,
        total: subtotal - discountTotal,
        orderStatus: plan.status,
        pickupDate: pickedUpAt || (plan.pickup != null ? daysFromNow(plan.pickup) : null),
        pickedUpAt,
        payment: { method: plan.method, payStatus: plan.pay, reference: plan.ref || "", paidAt: plan.pay === "paid" ? created : null },
        statusHistory,
        orderItems,
        orderCreatedAt: created,
      });
    }
    ordersByNo.set(plan.no, order);
  }

  // One open return request (for the admin to resolve) and one already rejected.
  const returnTargets = [
    { no: "BB-DEMO-0001", unit: "u14", reason: "A cluster of dead pixels appeared on the screen after pickup.", returnStatus: "requested", requestedAt: daysAgo(2) },
    { no: "BB-DEMO-0002", unit: "u15", reason: "The laptop heats up and slows down during video calls.", returnStatus: "rejected", requestedAt: daysAgo(30), returnResolveAt: daysAgo(28), refundAmount: 0 },
  ];
  for (const target of returnTargets) {
    const order = ordersByNo.get(target.no);
    const unitId = unitsByDemoId.get(target.unit)._id;
    if (!order.returns.some((entry) => String(entry.returnUnitId) === String(unitId))) {
      order.returns.push({ returnUnitId: unitId, reason: target.reason, returnStatus: target.returnStatus, requestedAt: target.requestedAt, returnResolveAt: target.returnResolveAt || null, refundAmount: target.refundAmount || 0 });
      await order.save();
    }
  }

  /* ---------- warranties (picked-up orders only) ---------- */
  const WARRANTY_PLANS = [
    { no: "BB-DEMO-0001", unit: "u13", claim: { claimNo: "CL-DEMO-0001", claimType: "Battery", description: "Battery drains from 100% to 40% in under an hour.", claimStatus: "in_review", filedAt: daysAgo(3), handled: true } },
    { no: "BB-DEMO-0001", unit: "u14" },
    { no: "BB-DEMO-0002", unit: "u15", claim: { claimNo: "CL-DEMO-0002", claimType: "Keyboard", description: "Several keys intermittently stop responding.", claimStatus: "resolved", cost: 1900, filedAt: daysAgo(25), resolvedAt: daysAgo(20), resolution: "Keyboard replaced under warranty.", handled: true } },
    { no: "BB-DEMO-0007", unit: "u19", claim: { claimNo: "CL-DEMO-0003", claimType: "Screen", description: "The display flickers when the lid is moved.", claimStatus: "rejected", filedAt: daysAgo(100), resolvedAt: daysAgo(96), resolution: "Physical hinge damage is not covered by the warranty.", handled: true } },
  ];
  const warranties = [];
  for (const plan of WARRANTY_PLANS) {
    const order = ordersByNo.get(plan.no);
    const unit = unitsByDemoId.get(plan.unit);
    let warranty = await Warranty.findOne({ orderId: order._id, unitId: unit._id });
    if (!warranty) {
      const months = demoById.get(plan.unit).listing.warrantyMonths;
      const claims = plan.claim ? [{
        claimNo: plan.claim.claimNo, claimType: plan.claim.claimType, description: plan.claim.description,
        claimStatus: plan.claim.claimStatus, cost: plan.claim.cost || 0, filedAt: plan.claim.filedAt,
        claimResolvedAt: plan.claim.resolvedAt || null, resolution: plan.claim.resolution || "",
        handledBy: plan.claim.handled ? staff._id : null,
      }] : [];
      warranty = await Warranty.create({
        orderId: order._id, unitId: unit._id, userId: order.userId,
        startDate: order.pickedUpAt, endDate: addMonths(order.pickedUpAt, months),
        extensionMonths: 0, source: "purchase", claims,
        warrantyCreatedAt: order.pickedUpAt,
      });
    }
    warranties.push(warranty);
  }

  /* ---------- audit logs (admin activity history) ---------- */
  const auditEntries = [
    { action: "create", targetCollection: "users", doc: staff, at: daysAgo(70) },
    ...suppliers.map((doc, index) => ({ action: "create", targetCollection: "suppliers", doc, at: daysAgo(80 - index) })),
    ...[...acquisitionsByBatch.values()].map((doc, index) => ({ action: "create", targetCollection: "acquisitions", doc, at: daysAgo(75 - index * 10) })),
    ...[1, 2, 3].map((batch, index) => ({
      action: "update", targetCollection: "acquisitions", doc: acquisitionsByBatch.get(batch), at: daysAgo(68 - index * 12),
      changes: { before: { acqStatus: "received" }, after: { acqStatus: "split" } },
    })),
    { action: "update", targetCollection: "units", doc: unitsByDemoId.get("u1"), at: daysAgo(40), changes: { before: { unitStatus: "ready" }, after: { unitStatus: "available" } } },
    { action: "update", targetCollection: "units", doc: unitsByDemoId.get("u12"), at: daysAgo(6), changes: { before: { unitStatus: "awaiting_inspection" }, after: { unitStatus: "in_repair" } } },
    { action: "update", targetCollection: "student_verifications", doc: verifications.juan, at: daysAgo(59), changes: { before: { verifStatus: "pending" }, after: { verifStatus: "approved" } } },
    { action: "update", targetCollection: "student_verifications", doc: verifications.pedro, at: daysAgo(19), changes: { before: { verifStatus: "pending" }, after: { verifStatus: "rejected" } } },
    { action: "update", targetCollection: "orders", doc: ordersByNo.get("BB-DEMO-0002"), at: daysAgo(38), changes: { before: { orderStatus: "ready_for_pickup" }, after: { orderStatus: "picked_up" } } },
    { action: "update", targetCollection: "warranties", doc: warranties[2], at: daysAgo(20), changes: { before: { "claims.0.claimStatus": "in_review" }, after: { "claims.0.claimStatus": "resolved" } } },
    { action: "update", targetCollection: "users", doc: buyers.ana, at: daysAgo(15), changes: { before: { isActive: true }, after: { isActive: false } } },
  ];
  for (const entry of auditEntries) {
    const adminId = entry.targetCollection === "orders" || entry.targetCollection === "warranties" || entry.targetCollection === "units" ? staff._id : admin._id;
    await AuditLog.updateOne(
      { adminId, action: entry.action, targetCollection: entry.targetCollection, targetId: entry.doc._id },
      { $setOnInsert: { adminId, action: entry.action, targetCollection: entry.targetCollection, targetId: entry.doc._id, changes: entry.changes || { before: null, after: { created: true } }, logCreatedAt: entry.at } },
      { upsert: true, timestamps: false }
    );
  }

  /* ---------- clean up the older single-batch demo seed (zero-cost data) ---------- */
  const legacyAcquisition = await Acquisition.findOne({ invoiceNo: "DEMO-INITIAL-STOCK" });
  if (legacyAcquisition && !(await Unit.exists({ acquisitionId: legacyAcquisition._id }))) {
    await legacyAcquisition.deleteOne();
    await Supplier.deleteOne({ companyName: "ByteBud Demo Supplier" });
    console.log("Removed the old zero-cost DEMO-INITIAL-STOCK acquisition and demo supplier.");
  }

  /* ---------- summary ---------- */
  const countOf = async (Model) => Model.countDocuments();
  console.log("\nSeed complete. Collection counts:");
  for (const [label, Model] of [
    ["users", User], ["student_verifications", StudentVerification], ["password_resets", PasswordReset],
    ["suppliers", Supplier], ["acquisitions", Acquisition], ["laptop_models", LaptopModel], ["courses", Course],
    ["units", Unit], ["carts", Cart], ["orders", Order], ["warranties", Warranty], ["audit_logs", AuditLog],
  ]) console.log(`  ${label.padEnd(22)} ${await countOf(Model)}`);
  console.log(`\nCourses ready: ${courses.length}. Demo laptop units ready: ${demoUnits.length}.`);
  console.log("Demo logins (demo only): admin@bytebud.com / Admin123!, staff@bytebud.com / Staff123!, juan@bytebud.com / Buyer123! (verified student).");
  console.log("Demo acquisition costs and sales are sample data and should not be treated as real financial data.");
} finally {
  await mongoose.disconnect();
}
