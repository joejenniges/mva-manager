import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportAppointment {
  id: string;
  datetime: string;
  title: string | null;
  drivingDistanceMiles: string | null;
  drivingDistanceRoundTrip: boolean;
  insuranceStatus: string | null;
  patient: { id: string; name: string; color: string | null } | null;
  organization: { id: string; name: string; color: string | null } | null;
  location: { id: string; title: string; city: string | null; state: string | null } | null;
  costItems: { id: string; description: string | null; billingCode: string | null; amount: string; type: string }[];
}

export interface ReportConfig {
  appointments: ReportAppointment[];
  includeCharges: boolean;
  groupByOrganization: boolean;
  includeMileage: boolean;
  mileageRate: number;
}

// WHY: Integer cents to avoid IEEE 754 float drift -- same pattern as AppointmentsPage.
function toCents(amount: string | number): number {
  return Math.round(parseFloat(String(amount)) * 100);
}

function formatDollars(cents: number): string {
  const val = (cents / 100).toFixed(2);
  return cents < 0 ? `-$${Math.abs(cents / 100).toFixed(2)}` : `$${val}`;
}

function formatDate(datetime: string): string {
  return new Date(datetime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLocation(loc: ReportAppointment["location"]): string {
  if (!loc) return "-";
  const parts = [loc.title];
  if (loc.city && loc.state) parts.push(`${loc.city}, ${loc.state}`);
  else if (loc.city) parts.push(loc.city);
  return parts.join(" - ");
}

function formatInsuranceStatus(status: string | null): string {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface CostSummary {
  chargesCents: number;
  paymentsCents: number;
  mileageCents: number;
}

function computeCosts(
  appt: ReportAppointment,
  includeMileage: boolean,
  mileageRate: number,
): CostSummary {
  let chargesCents = 0;
  let paymentsCents = 0;
  for (const item of appt.costItems) {
    const cents = toCents(item.amount);
    if (item.type === "charge") chargesCents += cents;
    else paymentsCents += cents;
  }
  let mileageCents = 0;
  if (includeMileage && appt.drivingDistanceMiles) {
    const miles = parseFloat(appt.drivingDistanceMiles);
    const totalMiles = appt.drivingDistanceRoundTrip ? miles * 2 : miles;
    mileageCents = Math.round(totalMiles * mileageRate * 100);
  }
  return { chargesCents, paymentsCents, mileageCents };
}

type GroupedAppointments = Map<string, { label: string; appointments: ReportAppointment[] }>;

function groupByPatient(appointments: ReportAppointment[]): GroupedAppointments {
  const groups: GroupedAppointments = new Map();
  for (const appt of appointments) {
    const key = appt.patient?.id || "__none__";
    const label = appt.patient?.name || "No Patient";
    if (!groups.has(key)) groups.set(key, { label, appointments: [] });
    groups.get(key)!.appointments.push(appt);
  }
  return groups;
}

function groupByOrg(appointments: ReportAppointment[]): GroupedAppointments {
  const groups: GroupedAppointments = new Map();
  for (const appt of appointments) {
    const key = appt.organization?.id || "__none__";
    const label = appt.organization?.name || "No Organization";
    if (!groups.has(key)) groups.set(key, { label, appointments: [] });
    groups.get(key)!.appointments.push(appt);
  }
  return groups;
}

const COLORS = {
  headerBg: [37, 99, 235] as [number, number, number],     // blue-600
  headerText: [255, 255, 255] as [number, number, number],
  subHeaderBg: [55, 65, 81] as [number, number, number],    // gray-700
  subHeaderText: [209, 213, 219] as [number, number, number], // gray-300
  totalBg: [31, 41, 55] as [number, number, number],        // gray-800
  totalText: [243, 244, 246] as [number, number, number],   // gray-100
  mileageText: [107, 114, 128] as [number, number, number], // gray-500
  bodyText: [17, 24, 39] as [number, number, number],       // gray-900
};

export function generateReport(config: ReportConfig): Uint8Array {
  const { appointments, includeCharges, groupByOrganization, includeMileage, mileageRate } = config;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Appointment Report", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const dates = appointments.map((a) => new Date(a.datetime).getTime());
  const minDate = dates.length ? formatDate(new Date(Math.min(...dates)).toISOString()) : "";
  const maxDate = dates.length ? formatDate(new Date(Math.max(...dates)).toISOString()) : "";
  const dateRange = minDate === maxDate ? minDate : `${minDate} - ${maxDate}`;
  doc.text(`Generated: ${formatDate(new Date().toISOString())}  |  ${dateRange}`, 14, 24);

  const options: string[] = [];
  if (includeCharges) options.push("Charges/Payments included");
  if (groupByOrganization) options.push("Grouped by organization");
  if (includeMileage) options.push(`Mileage @ $${mileageRate.toFixed(3)}/mi`);
  if (options.length) doc.text(options.join("  |  "), 14, 28);

  doc.setTextColor(0);
  let startY = options.length ? 33 : 29;

  // --- Grand totals accumulators ---
  let grandChargesCents = 0;
  let grandPaymentsCents = 0;
  let grandMileageCents = 0;

  const patientGroups = groupByPatient(appointments);

  for (const [, patientGroup] of patientGroups) {
    // Patient header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.headerBg);

    // Check if we have enough space for the header + at least a few rows
    if (startY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      startY = 14;
    }

    doc.text(patientGroup.label, 14, startY);
    startY += 4;

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    if (groupByOrganization) {
      // Sub-group by organization within this patient
      const orgGroups = groupByOrg(patientGroup.appointments);
      let patientChargesCents = 0;
      let patientPaymentsCents = 0;
      let patientMileageCents = 0;

      for (const [, orgGroup] of orgGroups) {
        startY = renderOrgHeader(doc, orgGroup.label, startY);
        const result = renderAppointmentTable(doc, orgGroup.appointments, {
          includeCharges, includeMileage, mileageRate, startY, pageWidth,
          footLabel: `${orgGroup.label} Subtotal`,
        });
        startY = result.finalY + 4; // extra gap after org subtotal before next org header
        patientChargesCents += result.chargesCents;
        patientPaymentsCents += result.paymentsCents;
        patientMileageCents += result.mileageCents;
      }

      // Patient total as a standalone summary row
      startY = renderSummaryRow(doc, `${patientGroup.label} Total`, patientChargesCents, patientPaymentsCents, includeCharges, startY, pageWidth);
      grandChargesCents += patientChargesCents;
      grandPaymentsCents += patientPaymentsCents;
      grandMileageCents += patientMileageCents;
    } else {
      // No org grouping -- table with patient total as footer
      const result = renderAppointmentTable(doc, patientGroup.appointments, {
        includeCharges, includeMileage, mileageRate, startY, pageWidth,
        footLabel: `${patientGroup.label} Total`,
      });
      startY = result.finalY;
      grandChargesCents += result.chargesCents;
      grandPaymentsCents += result.paymentsCents;
      grandMileageCents += result.mileageCents;
    }

    startY += 6; // spacing between patient groups
  }

  // --- Grand Total ---
  renderSummaryRow(doc, "Grand Total", grandChargesCents, grandPaymentsCents, includeCharges, startY, pageWidth, true);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

function renderOrgHeader(doc: jsPDF, label: string, y: number): number {
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 14;
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.subHeaderBg);
  doc.text(`  ${label}`, 14, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  return y + 3;
}

interface TableResult {
  finalY: number;
  chargesCents: number;
  paymentsCents: number;
  mileageCents: number;
}

function renderAppointmentTable(
  doc: jsPDF,
  appointments: ReportAppointment[],
  opts: {
    includeCharges: boolean;
    includeMileage: boolean;
    mileageRate: number;
    startY: number;
    pageWidth: number;
    footLabel?: string;
  },
): TableResult {
  let totalChargesCents = 0;
  let totalPaymentsCents = 0;
  let totalMileageCents = 0;

  // Compute costs for all appointments first
  for (const appt of appointments) {
    const costs = computeCosts(appt, opts.includeMileage, opts.mileageRate);
    totalChargesCents += costs.chargesCents + costs.mileageCents;
    totalPaymentsCents += costs.paymentsCents;
    totalMileageCents += costs.mileageCents;
  }

  const totalBalanceCents = totalChargesCents - totalPaymentsCents;
  const footStyles = { fillColor: COLORS.totalBg, textColor: COLORS.totalText, fontStyle: "bold" as const, fontSize: 8 };

  if (opts.includeCharges) {
    const head = [["Date", "Location", "Organization", "Insurance", "Description", "Code", "Amount", "Type"]];
    const body: any[][] = [];

    for (const appt of appointments) {
      const costs = computeCosts(appt, opts.includeMileage, opts.mileageRate);
      const balanceCents = costs.chargesCents + costs.mileageCents - costs.paymentsCents;

      body.push([
        { content: formatDate(appt.datetime), styles: { fontStyle: "bold" } },
        { content: formatLocation(appt.location), styles: { fontStyle: "bold" } },
        { content: appt.organization?.name || "-", styles: { fontStyle: "bold" } },
        { content: formatInsuranceStatus(appt.insuranceStatus), styles: { fontStyle: "bold" } },
        { content: "", styles: { fontStyle: "bold" } },
        { content: "", styles: { fontStyle: "bold" } },
        { content: formatDollars(costs.chargesCents + costs.mileageCents), styles: { fontStyle: "bold", halign: "right" } },
        { content: `Bal: ${formatDollars(balanceCents)}`, styles: { fontStyle: "bold", halign: "right" } },
      ]);

      for (const item of appt.costItems) {
        body.push([
          "", "", "", "",
          { content: item.description || "-", styles: { fontSize: 7 } },
          { content: item.billingCode || "", styles: { fontSize: 7 } },
          { content: formatDollars(toCents(item.amount)), styles: { fontSize: 7, halign: "right" } },
          { content: item.type, styles: { fontSize: 7, halign: "right" } },
        ]);
      }

      if (opts.includeMileage && appt.drivingDistanceMiles) {
        const miles = parseFloat(appt.drivingDistanceMiles);
        const totalMiles = appt.drivingDistanceRoundTrip ? miles * 2 : miles;
        body.push([
          "", "", "", "",
          { content: `Mileage: ${totalMiles.toFixed(1)} mi @ $${opts.mileageRate.toFixed(3)}/mi`, styles: { fontSize: 7, textColor: COLORS.mileageText } },
          "",
          { content: formatDollars(costs.mileageCents), styles: { fontSize: 7, halign: "right", textColor: COLORS.mileageText } },
          { content: "mileage", styles: { fontSize: 7, halign: "right", textColor: COLORS.mileageText } },
        ]);
      }
    }

    const foot = opts.footLabel ? [[
      { content: opts.footLabel, colSpan: 6, styles: footStyles },
      { content: formatDollars(totalChargesCents), styles: { ...footStyles, halign: "right" as const } },
      { content: formatDollars(totalBalanceCents), styles: { ...footStyles, halign: "right" as const } },
    ]] : undefined;

    autoTable(doc, {
      startY: opts.startY,
      head, body, foot,
      theme: "grid",
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.headerText, fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: COLORS.bodyText },
      footStyles: { fillColor: COLORS.totalBg, textColor: COLORS.totalText, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        6: { cellWidth: 22, halign: "right" },
        7: { cellWidth: 22, halign: "right" },
      },
      margin: { left: 14, right: 14 },
      showHead: "everyPage",
      showFoot: "lastPage",
    });
  } else {
    const head = [["Date", "Location", "Organization", "Insurance", "Charges", "Payments", "Balance"]];
    const body: any[][] = [];

    for (const appt of appointments) {
      const costs = computeCosts(appt, opts.includeMileage, opts.mileageRate);
      const totalCharge = costs.chargesCents + costs.mileageCents;
      const balanceCents = totalCharge - costs.paymentsCents;

      body.push([
        formatDate(appt.datetime),
        formatLocation(appt.location),
        appt.organization?.name || "-",
        formatInsuranceStatus(appt.insuranceStatus),
        { content: formatDollars(totalCharge), styles: { halign: "right" } },
        { content: formatDollars(costs.paymentsCents), styles: { halign: "right" } },
        { content: formatDollars(balanceCents), styles: { halign: "right" } },
      ]);
    }

    const foot = opts.footLabel ? [[
      { content: opts.footLabel, colSpan: 4, styles: footStyles },
      { content: formatDollars(totalChargesCents), styles: { ...footStyles, halign: "right" as const } },
      { content: formatDollars(totalPaymentsCents), styles: { ...footStyles, halign: "right" as const } },
      { content: formatDollars(totalBalanceCents), styles: { ...footStyles, halign: "right" as const } },
    ]] : undefined;

    autoTable(doc, {
      startY: opts.startY,
      head, body, foot,
      theme: "grid",
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.headerText, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: COLORS.bodyText },
      footStyles: { fillColor: COLORS.totalBg, textColor: COLORS.totalText, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 24, halign: "right" },
        6: { cellWidth: 24, halign: "right" },
      },
      margin: { left: 14, right: 14 },
      showHead: "everyPage",
      showFoot: "lastPage",
    });
  }

  const lastTable = (doc as any).lastAutoTable as { finalY: number } | undefined;
  const finalY = lastTable?.finalY ?? opts.startY + 10;

  return { finalY: finalY + 2, chargesCents: totalChargesCents, paymentsCents: totalPaymentsCents, mileageCents: totalMileageCents };
}

// WHY: Uses autoTable for summary rows so columns align with the data table above.
function renderSummaryRow(
  doc: jsPDF,
  label: string,
  chargesCents: number,
  paymentsCents: number,
  includeCharges: boolean,
  y: number,
  _pageWidth: number,
  isGrandTotal = false,
): number {
  if (y > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 14;
  }

  const balanceCents = chargesCents - paymentsCents;
  const bg = isGrandTotal ? COLORS.headerBg : COLORS.totalBg;
  const text = isGrandTotal ? COLORS.headerText : COLORS.totalText;
  const fontSize = isGrandTotal ? 9 : 8;
  const cellStyles = { fillColor: bg, textColor: text, fontStyle: "bold" as const, fontSize };

  // WHY: No columnStyles here -- colSpan + explicit widths causes jsPDF.rect
  // to receive invalid dimensions. The label cell spans most columns via colSpan,
  // and the value cells get fixed widths via per-cell styles.
  const valWidth = 24;
  if (includeCharges) {
    autoTable(doc, {
      startY: y,
      body: [[
        { content: label, colSpan: 6, styles: cellStyles },
        { content: formatDollars(chargesCents), styles: { ...cellStyles, halign: "right" as const, cellWidth: valWidth } },
        { content: formatDollars(balanceCents), styles: { ...cellStyles, halign: "right" as const, cellWidth: valWidth } },
      ]],
      theme: "grid",
      margin: { left: 14, right: 14 },
      showHead: false,
    });
  } else {
    autoTable(doc, {
      startY: y,
      body: [[
        { content: label, colSpan: 4, styles: cellStyles },
        { content: formatDollars(chargesCents), styles: { ...cellStyles, halign: "right" as const, cellWidth: valWidth } },
        { content: formatDollars(paymentsCents), styles: { ...cellStyles, halign: "right" as const, cellWidth: valWidth } },
        { content: formatDollars(balanceCents), styles: { ...cellStyles, halign: "right" as const, cellWidth: valWidth } },
      ]],
      theme: "grid",
      margin: { left: 14, right: 14 },
      showHead: false,
    });
  }

  const lastTable = (doc as any).lastAutoTable as { finalY: number } | undefined;
  return (lastTable?.finalY ?? y + 8) + 2;
}
