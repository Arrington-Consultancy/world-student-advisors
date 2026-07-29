import { useEffect, useState } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function InternationalPhoneInput({ value, onChange, error }: InternationalPhoneInputProps) {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://ipapi.co/json/")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.country_code && typeof d.country_code === "string") {
          setDetectedCountry(d.country_code.toLowerCase());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-wsa-navy mb-1.5">
        Phone / WhatsApp
      </label>
      <PhoneInput
        key={detectedCountry ?? "gb"}
        defaultCountry={detectedCountry ?? "gb"}
        value={value}
        onChange={(phone) => onChange(phone)}
        inputClassName="!w-full !px-4 !py-3 !border-border !bg-white focus:!outline-none focus:!ring-2 focus:!ring-wsa-red/20 focus:!border-wsa-red !transition-colors !text-sm !h-auto"
        countrySelectorStyleProps={{
          buttonClassName: "!px-3 !py-3 !border-border !bg-white !h-auto",
        }}
        className={`!w-full ${error ? "[&_input]:!border-red-400 [&_button]:!border-red-400" : ""}`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <p className="text-xs text-muted-foreground mt-1">Include country code. Works for both phone and WhatsApp.</p>
    </div>
  );
}
