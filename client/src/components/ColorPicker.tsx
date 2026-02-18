interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {/* <div
        className="h-8 w-8 shrink-0 rounded border border-gray-700"
        style={{ backgroundColor: value }}
      /> */}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-gray-700 bg-gray-800"
      />
    </div>
  );
}
