// Seed script: wipes the target DB and populates it with demo MVA case data.
// Usage: DATABASE_URL=postgres://... node seed.mjs   (or set DATABASE_URL in .env)
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL || "postgresql://dev:dev@localhost:5432/mva-manager";
const client = new Client({ connectionString });
await client.connect();

// Helper: run SQL and return rows
const q = (sql, params) => client.query(sql, params).then(r => r.rows);
const insert = (sql, params) => client.query(sql, params).then(r => r.rows[0]);

// ── Wipe everything (cascade from events clears most, then users/sessions) ──
await q("DELETE FROM events");
console.log("Cleared database");

// ── User (needed for document uploads) ──
const [user] = await q(`
  INSERT INTO users (email, name) VALUES ('demo@example.com', 'Demo User')
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
`);

// ── Event ──
const event = await insert(`
  INSERT INTO events (title, date, notes, address, city, state, zip)
  VALUES ('Johnson v. Martinez', '2025-09-14',
    'Multi-vehicle collision on Highway 101 near Millbrae exit. Patient was rear-ended at approximately 45mph while stopped in traffic. Police report #2025-SF-094821.',
    '101 Southbound near Millbrae Ave', 'Millbrae', 'CA', '94030')
  RETURNING id
`);
const eid = event.id;
console.log("Created event:", eid);

// ── Person Roles ──
const roles = {};
for (const [title, color] of [
  ["Patient", "#ef4444"],
  ["Attending Physician", "#3b82f6"],
  ["Chiropractor", "#8b5cf6"],
  ["Physical Therapist", "#06b6d4"],
  ["Attorney", "#f59e0b"],
  ["Insurance Adjuster", "#6b7280"],
  ["Radiologist", "#ec4899"],
  ["Surgeon", "#14b8a6"],
]) {
  const r = await insert(`INSERT INTO person_roles (event_id, title, color) VALUES ($1, $2, $3) RETURNING id`, [eid, title, color]);
  roles[title] = r.id;
}
console.log("Created person roles");

// ── Locations ──
const locs = {};
for (const [title, address, city, state, zip] of [
  ["Bayview Medical Center", "450 Sutter St", "San Francisco", "CA", "94108"],
  ["Rodriguez Chiropractic", "1200 Market St", "San Francisco", "CA", "94102"],
  ["Pacific Physical Therapy", "800 Howard St", "San Francisco", "CA", "94103"],
  ["Williams & Associates Law", "101 California St Ste 2800", "San Francisco", "CA", "94111"],
  ["Bay Area Imaging Center", "2100 Webster St", "San Francisco", "CA", "94115"],
  ["SF Orthopedic Institute", "1635 Divisadero St Ste 600", "San Francisco", "CA", "94115"],
  ["Peninsula Spine Center", "1900 El Camino Real", "Burlingame", "CA", "94010"],
  ["State Farm - Regional Office", "3400 Hillview Ave", "Palo Alto", "CA", "94304"],
]) {
  const r = await insert(`INSERT INTO locations (event_id, title, address, city, state, zip) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [eid, title, address, city, state, zip]);
  locs[title] = r.id;
}
console.log("Created locations");

// ── Organizations ──
const orgs = {};
for (const [name, phone, email, color, locNames] of [
  ["Bayview Medical Center", "(415) 555-2800", "intake@bayviewmed.com", "#3b82f6", ["Bayview Medical Center"]],
  ["Rodriguez Chiropractic", "(415) 555-1200", "office@rodriguezchiro.com", "#8b5cf6", ["Rodriguez Chiropractic"]],
  ["Pacific Physical Therapy", "(415) 555-0880", "info@pacificpt.com", "#06b6d4", ["Pacific Physical Therapy"]],
  ["Williams & Associates", "(415) 555-0101", "rwilliams@williamslaw.com", "#f59e0b", ["Williams & Associates Law"]],
  ["Bay Area Imaging", "(415) 555-2100", "scheduling@bayimaging.com", "#ec4899", ["Bay Area Imaging Center"]],
  ["SF Orthopedic Institute", "(415) 555-1635", "appointments@sforthopedic.com", "#14b8a6", ["SF Orthopedic Institute"]],
  ["Peninsula Spine Center", "(650) 555-1900", "info@peninsulaspine.com", "#10b981", ["Peninsula Spine Center"]],
  ["State Farm Insurance", "(650) 555-3400", "claims@statefarm.example.com", "#6b7280", ["State Farm - Regional Office"]],
]) {
  const r = await insert(`INSERT INTO organizations (event_id, name, phone, email, color) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [eid, name, phone, email, color]);
  orgs[name] = r.id;
  for (const ln of locNames) {
    await q(`INSERT INTO organization_locations (organization_id, location_id) VALUES ($1,$2)`, [r.id, locs[ln]]);
  }
}
console.log("Created organizations");

// ── Persons ──
const persons = {};
for (const [name, phone, email, isPatient, color, roleNames, orgName] of [
  ["Sarah Johnson", "(415) 555-8832", "sarah.johnson@email.com", true, "#ef4444", ["Patient"], null],
  ["Dr. Michael Chen", "(415) 555-2801", "mchen@bayviewmed.com", false, "#3b82f6", ["Attending Physician"], "Bayview Medical Center"],
  ["Dr. Emily Rodriguez", "(415) 555-1201", "emily@rodriguezchiro.com", false, "#8b5cf6", ["Chiropractor"], "Rodriguez Chiropractic"],
  ["James Park, DPT", "(415) 555-0881", "jpark@pacificpt.com", false, "#06b6d4", ["Physical Therapist"], "Pacific Physical Therapy"],
  ["Robert Williams, Esq.", "(415) 555-0102", "rwilliams@williamslaw.com", false, "#f59e0b", ["Attorney"], "Williams & Associates"],
  ["Lisa Thompson", "(650) 555-3401", "lthompson@statefarm.example.com", false, "#6b7280", ["Insurance Adjuster"], "State Farm Insurance"],
  ["Dr. Anika Patel", "(415) 555-2101", "apatel@bayimaging.com", false, "#ec4899", ["Radiologist"], "Bay Area Imaging"],
  ["Dr. Kevin O'Brien", "(415) 555-1636", "kobrien@sforthopedic.com", false, "#14b8a6", ["Surgeon", "Attending Physician"], "SF Orthopedic Institute"],
  ["Dr. Rachel Kim", "(650) 555-1901", "rkim@peninsulaspine.com", false, "#10b981", ["Attending Physician"], "Peninsula Spine Center"],
]) {
  const r = await insert(`INSERT INTO persons (event_id, name, phone, email, is_patient, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [eid, name, phone, email, isPatient, color]);
  persons[name] = r.id;
  for (const rn of roleNames) {
    await q(`INSERT INTO person_person_roles (person_id, person_role_id) VALUES ($1,$2)`, [r.id, roles[rn]]);
  }
  if (orgName) {
    await q(`INSERT INTO organization_persons (organization_id, person_id) VALUES ($1,$2)`, [orgs[orgName], r.id]);
  }
}
console.log("Created persons");

// ── Activities ──
const acts = {};
for (const [title, color] of [
  ["Initial Consultation", "#3b82f6"],
  ["Follow-Up Visit", "#06b6d4"],
  ["X-Ray", "#f59e0b"],
  ["MRI", "#ec4899"],
  ["Physical Therapy", "#10b981"],
  ["Chiropractic Adjustment", "#8b5cf6"],
  ["Legal Consultation", "#f59e0b"],
  ["Injection Therapy", "#ef4444"],
  ["Orthopedic Evaluation", "#14b8a6"],
  ["Nerve Conduction Study", "#6366f1"],
]) {
  const r = await insert(`INSERT INTO activities (event_id, title, color) VALUES ($1,$2,$3) RETURNING id`, [eid, title, color]);
  acts[title] = r.id;
}
console.log("Created activities");

// ── Document Types ──
const docTypes = {};
for (const [title, color] of [
  ["Medical Record", "#3b82f6"],
  ["Billing Statement", "#f59e0b"],
  ["Insurance Claim", "#6b7280"],
  ["Legal Correspondence", "#f59e0b"],
  ["Imaging Report", "#ec4899"],
  ["Police Report", "#ef4444"],
  ["Prescription", "#10b981"],
]) {
  const r = await insert(`INSERT INTO document_types (event_id, title, color) VALUES ($1,$2,$3) RETURNING id`, [eid, title, color]);
  docTypes[title] = r.id;
}
console.log("Created document types");

// ── Appointments ──
// Realistic timeline: accident Sep 14 2025, appointments from Sep-Dec 2025
const appts = [];
const appointmentData = [
  // ER visit day-of
  { title: "Emergency Room Visit", dt: "2025-09-14T14:30:00", org: "Bayview Medical Center", loc: "Bayview Medical Center", patient: "Sarah Johnson", activities: ["Initial Consultation", "X-Ray"], charges: [["ER Visit", "99285", 2850], ["Cervical X-Ray", "72052", 385], ["Lumbar X-Ray", "72114", 420]], payments: [["Insurance Payment", 1800]], notes: "Patient presented with neck pain, lower back pain, and headache following rear-end collision. X-rays negative for fractures. Prescribed muscle relaxants and referred to chiro and PT." },
  // Attorney meeting
  { title: "Initial Legal Consultation", dt: "2025-09-18T10:00:00", org: "Williams & Associates", loc: "Williams & Associates Law", patient: "Sarah Johnson", activities: ["Legal Consultation"], charges: [], payments: [], notes: "Case review. Signed retainer agreement. Attorney will send letter of representation to State Farm." },
  // Chiro starts
  { title: "Chiropractic Evaluation", dt: "2025-09-21T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Initial Consultation", "Chiropractic Adjustment"], charges: [["Chiro Eval", "99203", 250], ["Spinal Manipulation", "98941", 85]], payments: [], notes: "Cervical and lumbar subluxation. Significant muscle spasm. Treatment plan: 3x/week for 4 weeks, then reassess." },
  { title: "Chiropractic Treatment", dt: "2025-09-23T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-09-25T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  // PT starts
  { title: "PT Evaluation", dt: "2025-09-24T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Initial Consultation", "Physical Therapy"], charges: [["PT Eval", "97161", 320], ["Therapeutic Exercise", "97110", 95]], payments: [], notes: "ROM significantly limited in cervical flexion/extension. Core weakness. Treatment plan: 2x/week for 6 weeks." },
  { title: "Physical Therapy Session", dt: "2025-09-29T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  // More chiro
  { title: "Chiropractic Treatment", dt: "2025-09-28T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-09-30T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  // October
  { title: "Chiropractic Treatment", dt: "2025-10-02T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Physical Therapy Session", dt: "2025-10-01T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "MRI - Cervical Spine", dt: "2025-10-05T08:00:00", org: "Bay Area Imaging", loc: "Bay Area Imaging Center", patient: "Sarah Johnson", activities: ["MRI"], charges: [["MRI Cervical w/o Contrast", "72141", 1850]], payments: [["Insurance Payment", 950]], notes: "Findings: C4-C5 disc herniation with mild foraminal stenosis. C5-C6 disc bulge. No cord compression." },
  { title: "MRI - Lumbar Spine", dt: "2025-10-05T09:00:00", org: "Bay Area Imaging", loc: "Bay Area Imaging Center", patient: "Sarah Johnson", activities: ["MRI"], charges: [["MRI Lumbar w/o Contrast", "72148", 1850]], payments: [["Insurance Payment", 950]], notes: "Findings: L4-L5 disc protrusion. L5-S1 annular tear. Mild bilateral foraminal narrowing." },
  { title: "Follow-Up with Dr. Chen", dt: "2025-10-08T11:00:00", org: "Bayview Medical Center", loc: "Bayview Medical Center", patient: "Sarah Johnson", activities: ["Follow-Up Visit"], charges: [["Office Visit", "99214", 285]], payments: [], notes: "Reviewed MRI results. Referred to orthopedic surgeon for evaluation of cervical disc herniation. Continued PT and chiro." },
  { title: "Chiropractic Treatment", dt: "2025-10-07T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Physical Therapy Session", dt: "2025-10-06T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: "Patient reports 40% improvement in ROM. Continued core stabilization." },
  { title: "Chiropractic Treatment", dt: "2025-10-09T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Orthopedic Evaluation", dt: "2025-10-12T10:00:00", org: "SF Orthopedic Institute", loc: "SF Orthopedic Institute", patient: "Sarah Johnson", activities: ["Orthopedic Evaluation", "Initial Consultation"], charges: [["Ortho Consult", "99244", 475]], payments: [], notes: "Dr. O'Brien reviewed MRI. Recommends conservative treatment for 8 more weeks. If symptoms persist, consider epidural injections or surgical consult." },
  { title: "Physical Therapy Session", dt: "2025-10-13T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-10-14T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: "Reduced to 2x/week." },
  { title: "Chiropractic Treatment", dt: "2025-10-16T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Physical Therapy Session", dt: "2025-10-15T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-10-21T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Physical Therapy Session", dt: "2025-10-20T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Legal Status Update", dt: "2025-10-22T15:00:00", org: "Williams & Associates", loc: "Williams & Associates Law", patient: "Sarah Johnson", activities: ["Legal Consultation"], charges: [], payments: [], notes: "State Farm acknowledged claim. Liability accepted. Demand package being prepared once treatment concludes." },
  // November - treatment winds down
  { title: "Nerve Conduction Study", dt: "2025-11-03T10:00:00", org: "Peninsula Spine Center", loc: "Peninsula Spine Center", patient: "Sarah Johnson", activities: ["Nerve Conduction Study"], charges: [["NCS/EMG Upper", "95907", 680], ["NCS/EMG Lower", "95913", 680]], payments: [], notes: "Mild right C6 radiculopathy. No evidence of peripheral neuropathy. Consistent with MRI findings." },
  { title: "Physical Therapy Session", dt: "2025-11-03T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-11-04T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: "Reduced to 1x/week maintenance." },
  { title: "Epidural Injection - Cervical", dt: "2025-11-10T07:30:00", org: "SF Orthopedic Institute", loc: "SF Orthopedic Institute", patient: "Sarah Johnson", activities: ["Injection Therapy"], charges: [["Cervical Epidural", "62321", 2200], ["Fluoroscopy Guidance", "77003", 450]], payments: [], notes: "C5-C6 interlaminar epidural steroid injection under fluoroscopic guidance. Patient tolerated well. Follow up in 2 weeks." },
  { title: "Physical Therapy Session", dt: "2025-11-10T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-11-11T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  { title: "Injection Follow-Up", dt: "2025-11-24T10:00:00", org: "SF Orthopedic Institute", loc: "SF Orthopedic Institute", patient: "Sarah Johnson", activities: ["Follow-Up Visit"], charges: [["Office Visit", "99214", 285]], payments: [], notes: "Patient reports 60% improvement in neck pain. Arm radiculopathy resolved. Continue PT. May need second injection if symptoms plateau." },
  { title: "Physical Therapy Session", dt: "2025-11-17T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy"], charges: [["Therapeutic Exercise", "97110", 95], ["Manual Therapy", "97140", 95]], payments: [], notes: null },
  { title: "Chiropractic Treatment", dt: "2025-11-18T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment"], charges: [["Spinal Manipulation", "98941", 85]], payments: [], notes: null },
  // December - wrapping up
  { title: "Physical Therapy Discharge", dt: "2025-12-01T14:00:00", org: "Pacific Physical Therapy", loc: "Pacific Physical Therapy", patient: "Sarah Johnson", activities: ["Physical Therapy", "Follow-Up Visit"], charges: [["PT Discharge Eval", "97164", 320]], payments: [], notes: "ROM 85% of baseline. Core strength improved significantly. Discharged from PT. Home exercise program provided." },
  { title: "Chiropractic Discharge", dt: "2025-12-02T09:00:00", org: "Rodriguez Chiropractic", loc: "Rodriguez Chiropractic", patient: "Sarah Johnson", activities: ["Chiropractic Adjustment", "Follow-Up Visit"], charges: [["Final Visit", "99214", 165]], payments: [], notes: "Maximum medical improvement reached for chiropractic care. Discharged. PRN visits as needed." },
  { title: "Final Orthopedic Follow-Up", dt: "2025-12-08T10:00:00", org: "SF Orthopedic Institute", loc: "SF Orthopedic Institute", patient: "Sarah Johnson", activities: ["Follow-Up Visit"], charges: [["Office Visit", "99214", 285]], payments: [], notes: "Patient at MMI. Permanent impairment rating: 8% whole person. Restrictions: avoid heavy lifting >30lbs. Narrative report to be prepared for attorney." },
  { title: "Final Legal Review", dt: "2025-12-15T14:00:00", org: "Williams & Associates", loc: "Williams & Associates Law", patient: "Sarah Johnson", activities: ["Legal Consultation"], charges: [], payments: [], notes: "All medical records collected. Demand package total: $18,245 in medical specials. Preparing demand letter to State Farm." },
];

for (const a of appointmentData) {
  const appt = await insert(`
    INSERT INTO appointments (event_id, title, datetime, notes, organization_id, location_id, patient_person_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
  `, [eid, a.title, a.dt, a.notes, orgs[a.org], locs[a.loc], persons[a.patient]]);
  appts.push(appt.id);

  for (const act of a.activities) {
    await q(`INSERT INTO appointment_activities (appointment_id, activity_id) VALUES ($1, $2)`, [appt.id, acts[act]]);
  }
  for (const [desc, code, amt] of a.charges) {
    await q(`INSERT INTO appointment_cost_items (appointment_id, description, billing_code, amount, type) VALUES ($1,$2,$3,$4,'charge')`,
      [appt.id, desc, code, amt]);
  }
  for (const [desc, amt] of a.payments) {
    await q(`INSERT INTO appointment_cost_items (appointment_id, description, amount, type) VALUES ($1,$2,$3,'payment')`,
      [appt.id, desc, amt]);
  }
}
console.log(`Created ${appts.length} appointments`);

// ── Appointment Templates ──
for (const [name, org, loc, actNames] of [
  ["Chiro Visit", "Rodriguez Chiropractic", "Rodriguez Chiropractic", ["Chiropractic Adjustment"]],
  ["PT Session", "Pacific Physical Therapy", "Pacific Physical Therapy", ["Physical Therapy"]],
  ["Follow-Up - Bayview", "Bayview Medical Center", "Bayview Medical Center", ["Follow-Up Visit"]],
]) {
  const t = await insert(`INSERT INTO appointment_templates (event_id, name, organization_id, location_id) VALUES ($1,$2,$3,$4) RETURNING id`,
    [eid, name, orgs[org], locs[loc]]);
  for (const an of actNames) {
    await q(`INSERT INTO appointment_template_activities (template_id, activity_id) VALUES ($1,$2)`, [t.id, acts[an]]);
  }
}
console.log("Created appointment templates");

// ── Documents (stubs - no actual files, but shows in the UI) ──
for (const [title, filename, mime, size, typeName, apptIndices] of [
  ["Police Report - Highway 101 Collision", "police-report-2025-SF-094821.pdf", "application/pdf", 284500, "Police Report", [0]],
  ["ER Discharge Summary", "er-discharge-2025-09-14.pdf", "application/pdf", 156200, "Medical Record", [0]],
  ["Cervical X-Ray Report", "xray-cervical-2025-09-14.pdf", "application/pdf", 89400, "Imaging Report", [0]],
  ["Lumbar X-Ray Report", "xray-lumbar-2025-09-14.pdf", "application/pdf", 91200, "Imaging Report", [0]],
  ["MRI Cervical Spine Report", "mri-cervical-2025-10-05.pdf", "application/pdf", 342800, "Imaging Report", [11]],
  ["MRI Lumbar Spine Report", "mri-lumbar-2025-10-05.pdf", "application/pdf", 358100, "Imaging Report", [12]],
  ["Chiropractic Treatment Plan", "chiro-tx-plan-rodriguez.pdf", "application/pdf", 124600, "Medical Record", [2]],
  ["PT Evaluation Report", "pt-eval-pacific-2025-09-24.pdf", "application/pdf", 98700, "Medical Record", [5]],
  ["Orthopedic Consult Report", "ortho-consult-obrien-2025-10-12.pdf", "application/pdf", 178400, "Medical Record", [17]],
  ["Nerve Conduction Study Results", "ncs-emg-peninsula-2025-11-03.pdf", "application/pdf", 145600, "Medical Record", [25]],
  ["Letter of Representation", "lor-williams-2025-09-18.pdf", "application/pdf", 67200, "Legal Correspondence", [1]],
  ["Bayview Medical Billing", "billing-bayview-2025-10.pdf", "application/pdf", 45800, "Billing Statement", [0, 13]],
  ["Rodriguez Chiro Billing", "billing-rodriguez-chiro.pdf", "application/pdf", 52100, "Billing Statement", [2, 3, 4]],
  ["Pacific PT Billing", "billing-pacific-pt.pdf", "application/pdf", 48900, "Billing Statement", [5, 6]],
  ["Bay Area Imaging Billing", "billing-bay-imaging.pdf", "application/pdf", 38200, "Billing Statement", [11, 12]],
  ["Epidural Injection Report", "injection-report-2025-11-10.pdf", "application/pdf", 112300, "Medical Record", [28]],
  ["PT Discharge Summary", "pt-discharge-2025-12-01.pdf", "application/pdf", 87600, "Medical Record", [34]],
  ["Impairment Rating Report", "impairment-rating-obrien.pdf", "application/pdf", 234500, "Medical Record", [36]],
  ["Demand Letter Draft", "demand-letter-draft.pdf", "application/pdf", 189200, "Legal Correspondence", [37]],
  ["State Farm Claim Acknowledgment", "statefarm-ack-2025-10.pdf", "application/pdf", 34100, "Insurance Claim", [24]],
]) {
  const doc = await insert(`
    INSERT INTO documents (event_id, title, original_filename, stored_filename, mime_type, file_size, document_type_id, uploaded_by_user_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
  `, [eid, title, filename, `seed-${filename}`, mime, size, docTypes[typeName], user.id]);
  for (const idx of apptIndices) {
    if (appts[idx]) {
      await q(`INSERT INTO document_appointments (document_id, appointment_id) VALUES ($1,$2)`, [doc.id, appts[idx]]);
    }
  }
}
console.log("Created documents");

console.log("\nSeed complete!");
await client.end();
