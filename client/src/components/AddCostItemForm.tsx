import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { api } from "../api";
import type { PaginatedResponse } from "../types";

const TYPE_LABELS: Record<string, string> = {
  charge: "Charge",
  payment: "Payment",
  adjustment: "Adjustment",
  write_off: "Write-off",
  patient_payment: "Patient Payment",
};

interface ChargeCode {
  id: string;
  code: string;
  description: string;
}

export interface AddCostItemFormHandle {
  scrollIntoView: (defaultType?: string) => void;
  focusDescription: (defaultType?: string) => void;
}

interface Props {
  appointmentId: string;
  onAdded: () => void;
}

const AddCostItemForm = forwardRef<AddCostItemFormHandle, Props>(function AddCostItemForm({ appointmentId, onAdded }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const codeSearchRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [newItem, setNewItem] = useState({ description: "", billingCode: "", amount: "", type: "charge" });
  const [adding, setAdding] = useState(false);
  const [amountError, setAmountError] = useState(false);

  // Charge code dropdown state
  const [chargeCodes, setChargeCodes] = useState<ChargeCode[]>([]);
  const [codeSearch, setCodeSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Fetch charge codes once
  useEffect(() => {
    api<PaginatedResponse<ChargeCode>>("/api/v1/charge-codes?limit=100")
      .then((res) => setChargeCodes(res.data))
      .catch(() => {});
  }, []);

  // Filter charge codes by search
  const filtered = codeSearch
    ? chargeCodes.filter((cc) =>
        cc.code.toLowerCase().includes(codeSearch.toLowerCase()) ||
        cc.description.toLowerCase().includes(codeSearch.toLowerCase())
      )
    : chargeCodes;

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [codeSearch]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("[data-index]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, dropdownOpen]);

  useImperativeHandle(ref, () => ({
    scrollIntoView: (defaultType?: string) => {
      if (defaultType) setNewItem((prev) => ({ ...prev, type: defaultType }));
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    focusDescription: (defaultType?: string) => {
      if (defaultType) setNewItem((prev) => ({ ...prev, type: defaultType }));
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        codeSearchRef.current?.focus();
        setDropdownOpen(true);
      }, 100);
    },
  }));

  function selectChargeCode(cc: ChargeCode) {
    setNewItem((prev) => ({ ...prev, billingCode: cc.code, description: cc.description }));
    setCodeSearch(cc.code);
    setDropdownOpen(false);
    // Focus the amount field after selection
    setTimeout(() => amountRef.current?.focus(), 50);
  }

  function handleCodeSearchKeyDown(e: React.KeyboardEvent) {
    if (!dropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setDropdownOpen(true);
      e.preventDefault();
      return;
    }

    if (dropdownOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightIndex]) {
          selectChargeCode(filtered[highlightIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDropdownOpen(false);
      } else if (e.key === "Tab") {
        setDropdownOpen(false);
      }
    }
  }

  function handleAmountBlur() {
    if (!newItem.amount) { setAmountError(false); return; }
    const num = parseFloat(newItem.amount);
    if (isNaN(num)) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    setNewItem((prev) => ({ ...prev, amount: num.toFixed(2) }));
  }

  async function addItem() {
    if (!newItem.amount) return;
    const num = parseFloat(newItem.amount);
    if (isNaN(num)) { setAmountError(true); return; }

    setAdding(true);
    try {
      await api(`/api/v1/appointments/${appointmentId}/cost-items`, {
        body: {
          description: newItem.description || null,
          billingCode: newItem.billingCode || null,
          amount: num.toFixed(2),
          type: newItem.type,
        },
      });
      setNewItem({ description: "", billingCode: "", amount: "", type: "charge" });
      setCodeSearch("");
      setAmountError(false);
      onAdded();
      // Re-focus the code search for rapid entry
      setTimeout(() => {
        codeSearchRef.current?.focus();
        setDropdownOpen(true);
      }, 100);
    } catch {} finally {
      setAdding(false);
    }
  }

  function handleAmountKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          codeSearchRef.current && !codeSearchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={newItem.type}
          onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {/* Charge code searchable dropdown */}
        <div className="relative">
          <input
            ref={codeSearchRef}
            placeholder="Code"
            value={codeSearch}
            onChange={(e) => {
              setCodeSearch(e.target.value);
              setNewItem((prev) => ({ ...prev, billingCode: e.target.value }));
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={handleCodeSearchKeyDown}
            className="w-32 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm font-mono text-gray-100 focus:border-blue-500 focus:outline-none"
          />
          {dropdownOpen && filtered.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 top-full z-20 mt-1 max-h-48 w-72 overflow-y-auto rounded-md border border-gray-700 bg-gray-900 shadow-lg"
            >
              {filtered.map((cc, i) => (
                <div
                  key={cc.id}
                  data-index={i}
                  onMouseDown={(e) => { e.preventDefault(); selectChargeCode(cc); }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`flex cursor-pointer gap-2 px-3 py-1.5 text-sm ${
                    i === highlightIndex ? "bg-blue-600/30 text-gray-100" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="w-16 shrink-0 font-mono text-gray-400">{cc.code}</span>
                  <span className="truncate">{cc.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          ref={descriptionRef}
          placeholder="Description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <input
          ref={amountRef}
          placeholder="Amount"
          inputMode="decimal"
          value={newItem.amount}
          onChange={(e) => { setNewItem({ ...newItem, amount: e.target.value }); setAmountError(false); }}
          onBlur={handleAmountBlur}
          onKeyDown={handleAmountKeyDown}
          className={`w-28 rounded-md border bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none ${
            amountError ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-blue-500"
          }`}
        />
        <button
          onClick={addItem}
          disabled={adding || !newItem.amount}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Item
        </button>
      </div>
    </div>
  );
});

export default AddCostItemForm;
