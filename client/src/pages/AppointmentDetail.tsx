import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import TagBadge from "../components/TagBadge";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StatusBadge";
import BillingSummaryStrip from "../components/BillingSummaryStrip";
import CostTable from "../components/CostTable";
import AddCostItemForm from "../components/AddCostItemForm";
import CopyCostsModal from "../components/CopyCostsModal";
import CollapsibleMap from "../components/CollapsibleMap";
import AppointmentDocuments from "../components/AppointmentDocuments";
import DocumentViewer from "../components/DocumentViewer";
import { useToast } from "../components/Toast";
import { getVisitStatus, calculateBalance } from "../utils/appointmentStatus";
import useHotkeys from "../hooks/useHotkeys";
import type { AddCostItemFormHandle } from "../components/AddCostItemForm";
import type { AppointmentDocumentsHandle } from "../components/AppointmentDocuments";

interface AppointmentFull {
  id: string;
  title: string | null;
  datetime: string;
  notes: string | null;
  drivingDistanceMiles: string | null;
  drivingDistanceRoundTrip: boolean;
  insuranceStatus: string | null;
  organization: { id: string; name: string; color: string | null } | null;
  location: { id: string; title: string; address: string | null; city: string | null; state: string | null; zip: string | null; lat: string | null; lng: string | null } | null;
  patient: { id: string; name: string; color: string | null } | null;
  appointmentProviders: { personId: string; person: { id: string; name: string; color: string | null } }[];
  appointmentActivities: { activityId: string; activity: { id: string; title: string; color: string } }[];
  costItems: { id: string; description: string | null; billingCode: string | null; amount: string; type: string }[];
}

const INSURANCE_OPTIONS = [
  { value: "", label: "None" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "denied", label: "Denied" },
  { value: "paid", label: "Paid" },
] as const;

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appt, setAppt] = useState<AppointmentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [insuranceDropdownOpen, setInsuranceDropdownOpen] = useState(false);
  const [insuranceHighlight, setInsuranceHighlight] = useState(-1);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [copyCostsOpen, setCopyCostsOpen] = useState(false);

  useHotkeys({
    Escape: () => {
      if (insuranceDropdownOpen) {
        setInsuranceDropdownOpen(false);
        return;
      }
      if (viewingDoc) {
        setViewingDoc(null);
        return;
      }
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate("/appointments");
    },
    e: () => navigate(`/appointments/${id}/edit`),
    i: () => {
      setInsuranceHighlight(
        INSURANCE_OPTIONS.findIndex((opt) => (appt?.insuranceStatus || "") === opt.value)
      );
      setInsuranceDropdownOpen((v) => !v);
    },
    c: () => costFormRef.current?.focusDescription("charge"),
    p: () => costFormRef.current?.focusDescription("payment"),
    u: () => docsRef.current?.openFileDialog(),
    a: () => docsRef.current?.openPicker(),
  });

  const costFormRef = useRef<AddCostItemFormHandle>(null);
  const docsRef = useRef<AppointmentDocumentsHandle>(null);

  const loadAppt = useCallback(() => {
    if (!id) return;
    api<AppointmentFull>(`/api/v1/appointments/${id}`)
      .then(setAppt)
      .catch(() => navigate("/appointments"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(loadAppt, [loadAppt]);

  async function handleDelete() {
    if (!deleting) { setDeleting(true); return; }
    try {
      await api(`/api/v1/appointments/${id}`, { method: "DELETE" });
      toast("Appointment deleted", "success");
      navigate("/appointments");
    } catch {
      toast("Failed to delete appointment", "error");
      setDeleting(false);
    }
  }

  async function handleInsuranceStatusChange(status: string | null) {
    setInsuranceDropdownOpen(false);
    try {
      await api(`/api/v1/appointments/${id}`, {
        method: "PATCH",
        body: { insuranceStatus: status },
      });
      setAppt((prev) => prev ? { ...prev, insuranceStatus: status } : prev);
      toast("Insurance status updated", "success");
    } catch {
      toast("Failed to update insurance status", "error");
    }
  }

  async function handleDeleteCostItem(itemId: string) {
    await api(`/api/v1/appointments/cost-items/${itemId}`, { method: "DELETE" });
    loadAppt();
  }

  if (loading) return <Spinner className="py-12" />;
  if (!appt) return null;

  const dt = new Date(appt.datetime);
  const visitStatus = getVisitStatus(appt.datetime, appt.costItems);
  const { balance, charges } = calculateBalance(appt.costItems);

  return (
    <div className={`flex gap-6 ${viewingDoc ? "" : "justify-center"}`}>
    <div className={`space-y-6 ${viewingDoc ? "min-w-0 flex-1" : "w-full max-w-3xl"}`}>
      {/* [A] Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/appointments")} className="text-gray-400 hover:text-gray-200" title="Back to appointments">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-2xl font-semibold text-gray-100">{appt.title || "Untitled Appointment"}</h2>
          </div>
          <p className="mt-1 text-gray-400">
            {dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" at "}
            {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={visitStatus} />
            {charges > 0 && (
              <span className={`text-xs font-medium ${balance > 0 ? "text-red-400" : "text-green-500"}`}>
                {balance > 0 ? `$${balance.toFixed(2)} outstanding` : "Paid in Full"}
              </span>
            )}
            {/* Insurance status badge with inline dropdown */}
            <div className="relative">
              <StatusBadge
                status={appt.insuranceStatus as any || "pending"}
                className={appt.insuranceStatus ? "" : "hidden"}
                onClick={() => setInsuranceDropdownOpen((v) => !v)}
              />
              {!appt.insuranceStatus && (
                <button
                  onClick={() => setInsuranceDropdownOpen((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  + Insurance
                </button>
              )}
              {insuranceDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setInsuranceDropdownOpen(false)} />
                  <div
                    className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-lg"
                    tabIndex={-1}
                    ref={(el) => el?.focus()}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setInsuranceHighlight((h) => Math.min(h + 1, INSURANCE_OPTIONS.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setInsuranceHighlight((h) => Math.max(h - 1, 0));
                      } else if (e.key === "Enter" && insuranceHighlight >= 0) {
                        e.preventDefault();
                        handleInsuranceStatusChange(INSURANCE_OPTIONS[insuranceHighlight].value || null);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setInsuranceDropdownOpen(false);
                      }
                    }}
                    onBlur={(e) => {
                      // Close if focus leaves the dropdown entirely
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setInsuranceDropdownOpen(false);
                      }
                    }}
                  >
                    {INSURANCE_OPTIONS.map((opt, idx) => (
                      <button
                        key={opt.value}
                        onClick={() => handleInsuranceStatusChange(opt.value || null)}
                        className={`block w-full px-4 py-1.5 text-left text-sm ${
                          idx === insuranceHighlight ? "bg-gray-700" : "hover:bg-gray-700"
                        } ${
                          (appt.insuranceStatus || "") === opt.value ? "text-blue-400" : "text-gray-300"
                        }`}
                        onMouseEnter={() => setInsuranceHighlight(idx)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/appointments/${id}/edit`}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Edit
            <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">E</kbd>
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-gray-700"
          >
            {deleting ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>

      {/* [B] Visit Details - single card, compact grid */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Organization" value={appt.organization ? <ColorName name={appt.organization.name} color={appt.organization.color} /> : null} />
          <DetailRow
            label="Location"
            value={appt.location ? (
              <div>
                <div>{appt.location.title}</div>
                {appt.location.address && (
                  <div className="text-xs text-gray-500">
                    {[appt.location.address, appt.location.city, appt.location.state, appt.location.zip].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            ) : null}
          />
          <DetailRow label="Patient" value={appt.patient ? <ColorName name={appt.patient.name} color={appt.patient.color} /> : null} />
          <DetailRow
            label="Providers"
            value={appt.appointmentProviders.length > 0
              ? <div className="flex flex-wrap gap-x-3 gap-y-1">{appt.appointmentProviders.map((ap) => <ColorName key={ap.personId} name={ap.person.name} color={ap.person.color} />)}</div>
              : null}
          />
          {appt.appointmentActivities.length > 0 && (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-gray-500">Activities</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {appt.appointmentActivities.map((aa) => (
                  <TagBadge key={aa.activityId} label={aa.activity.title} color={aa.activity.color} />
                ))}
              </div>
            </div>
          )}
          {appt.drivingDistanceMiles && (
            <DetailRow
              label="Distance"
              value={(() => {
                const oneWay = parseFloat(appt.drivingDistanceMiles);
                const display = appt.drivingDistanceRoundTrip ? (oneWay * 2).toFixed(2) : oneWay.toFixed(2);
                return `${display} mi${appt.drivingDistanceRoundTrip ? " (round trip)" : " (one way)"}`;
              })()}
            />
          )}
        </div>
      </div>

      {/* [C] Map toggle */}
      {appt.location?.lat && appt.location?.lng && (
        <CollapsibleMap
          lat={parseFloat(appt.location.lat)}
          lng={parseFloat(appt.location.lng)}
          label={appt.location.title}
        />
      )}

      {/* [D] Billing summary */}
      <BillingSummaryStrip items={appt.costItems} />

      {/* [E] Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => costFormRef.current?.scrollIntoView("charge")}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          + Add Charge
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">C</kbd>
        </button>
        <button
          onClick={() => costFormRef.current?.scrollIntoView("payment")}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          + Record Payment
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">P</kbd>
        </button>
        {appt.organization && (
          <button
            onClick={() => setCopyCostsOpen(true)}
            className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
          >
            Copy Charges
          </button>
        )}
        <button
          onClick={() => docsRef.current?.scrollIntoView()}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          + Upload Document
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">U</kbd>
        </button>
        <button
          onClick={() => docsRef.current?.openPicker()}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
        >
          + Attach Document
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">A</kbd>
        </button>
      </div>

      {/* [F] Cost items table */}
      <CostTable items={appt.costItems} onDelete={handleDeleteCostItem} />

      {/* [G] Add item form */}
      <AddCostItemForm ref={costFormRef} appointmentId={appt.id} onAdded={loadAppt} />

      {/* Copy costs modal */}
      {copyCostsOpen && appt.organization && (
        <CopyCostsModal
          appointmentId={appt.id}
          organizationId={appt.organization.id}
          onCopied={loadAppt}
          onClose={() => setCopyCostsOpen(false)}
        />
      )}

      {/* [H] Documents */}
      <AppointmentDocuments ref={docsRef} appointmentId={appt.id} appointment={appt} onViewDocument={setViewingDoc} />

      {/* [I] Notes - conditional, at bottom */}
      {appt.notes && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="mb-1 text-xs uppercase text-gray-500">Notes</div>
          <div className="whitespace-pre-wrap text-sm text-gray-300">{appt.notes}</div>
        </div>
      )}
    </div>

    {/* Side panel document viewer */}
    {viewingDoc && (
      <div className="sticky top-0 flex h-[calc(100vh-5rem)] w-[45%] flex-shrink-0 flex-col rounded-lg border border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h3 className="min-w-0 truncate text-sm font-medium text-gray-100">
            {viewingDoc.title || viewingDoc.originalFilename}
          </h3>
          <button
            onClick={() => setViewingDoc(null)}
            className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <DocumentViewer
            documentId={viewingDoc.id}
            mimeType={viewingDoc.mimeType}
            title={viewingDoc.title}
            fillHeight
          />
        </div>
      </div>
    )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-200">
        {value || <span className="text-gray-600">Not set</span>}
      </div>
    </div>
  );
}

function ColorName({ name, color }: { name: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {color && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      {name}
    </span>
  );
}
