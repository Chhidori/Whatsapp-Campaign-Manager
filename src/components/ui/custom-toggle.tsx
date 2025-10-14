'use client';

interface CustomToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export default function CustomToggle({ 
  checked = false, 
  onCheckedChange, 
  disabled = false,
  label
}: CustomToggleProps) {
  const handleToggle = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <label className="inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={handleToggle}
        disabled={disabled}
        className="sr-only peer" 
      />
      <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${
        checked ? 'peer-checked:bg-black dark:peer-checked:bg-black' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
      <span className={`ms-3 text-sm font-medium text-gray-900 dark:text-gray-300 ${disabled ? 'opacity-50' : ''}`}>
        {label}
      </span>
    </label>
  );
}