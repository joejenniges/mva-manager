import type { RecurrenceRule, RecurrencePreset } from "../utils/recurrence";
import { getPresetOptions, defaultRecurrenceRule } from "../utils/recurrence";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  startDate: string;
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
}

export default function RecurrenceSelector({ startDate, value, onChange }: Props) {
  const presetOptions = getPresetOptions(startDate);

  function handlePresetChange(preset: RecurrencePreset) {
    const startD = new Date(startDate);
    const base = defaultRecurrenceRule();

    if (preset === "none") {
      onChange({ ...base, preset: "none" });
    } else if (preset === "daily") {
      onChange({ ...base, preset: "daily", unit: "day", interval: 1 });
    } else if (preset === "weekly") {
      onChange({ ...base, preset: "weekly", unit: "week", interval: 1, weekdays: [startD.getDay()] });
    } else if (preset === "monthly-ordinal") {
      onChange({ ...base, preset: "monthly-ordinal", unit: "month", interval: 1 });
    } else if (preset === "annually") {
      onChange({ ...base, preset: "annually", unit: "year", interval: 1 });
    } else if (preset === "custom") {
      // Carry forward current settings into custom mode
      onChange({ ...value, preset: "custom" });
    }
  }

  function update(partial: Partial<RecurrenceRule>) {
    onChange({ ...value, ...partial });
  }

  function toggleWeekday(wd: number) {
    const current = value.weekdays;
    if (current.includes(wd)) {
      // Prevent deselecting the last one
      if (current.length <= 1) return;
      update({ weekdays: current.filter((d) => d !== wd) });
    } else {
      update({ weekdays: [...current, wd].sort((a, b) => a - b) });
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm text-gray-400">Recurrence</label>
      <select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value as RecurrencePreset)}
        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
      >
        {presetOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {value.preset === "custom" && (
        <div className="mt-3 space-y-3 rounded border border-gray-700 bg-gray-800/50 p-3">
          {/* Repeat every N unit */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Repeat every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={value.interval}
              onChange={(e) => update({ interval: Math.max(1, Math.min(99, parseInt(e.target.value) || 1)) })}
              className="w-16 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-center text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={value.unit}
              onChange={(e) => {
                const unit = e.target.value as RecurrenceRule["unit"];
                const updates: Partial<RecurrenceRule> = { unit };
                // Initialize weekdays when switching to week
                if (unit === "week" && value.weekdays.length === 0) {
                  updates.weekdays = [new Date(startDate).getDay()];
                }
                update(updates);
              }}
              className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="day">day{value.interval > 1 ? "s" : ""}</option>
              <option value="week">week{value.interval > 1 ? "s" : ""}</option>
              <option value="month">month{value.interval > 1 ? "s" : ""}</option>
              <option value="year">year{value.interval > 1 ? "s" : ""}</option>
            </select>
          </div>

          {/* Weekday toggles (only for week unit) */}
          {value.unit === "week" && (
            <div>
              <span className="mb-1 block text-sm text-gray-400">Repeat on</span>
              <div className="flex gap-1">
                {WEEKDAY_SHORT.map((label, idx) => {
                  const selected = value.weekdays.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ends */}
          <div>
            <span className="mb-1 block text-sm text-gray-400">Ends</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  name="recurrence-ends"
                  checked={value.ends === "on"}
                  onChange={() => update({ ends: "on" })}
                  className="accent-blue-600"
                />
                On
                <input
                  type="date"
                  value={value.endDate}
                  disabled={value.ends !== "on"}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none disabled:opacity-40"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  name="recurrence-ends"
                  checked={value.ends === "after"}
                  onChange={() => update({ ends: "after" })}
                  className="accent-blue-600"
                />
                After
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={value.endCount}
                  disabled={value.ends !== "after"}
                  onChange={(e) => update({ endCount: Math.max(1, Math.min(52, parseInt(e.target.value) || 1)) })}
                  className="w-16 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-center text-sm text-gray-100 focus:border-blue-500 focus:outline-none disabled:opacity-40"
                />
                <span className={value.ends !== "after" ? "opacity-40" : ""}>occurrences</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
