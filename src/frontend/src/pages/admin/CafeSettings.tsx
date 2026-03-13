import { Save, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export interface CafeSettingsData {
  name: string;
  address: string;
  phone: string;
}

const STORAGE_KEY = "cafe_settings";

export function loadCafeSettings(): CafeSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CafeSettingsData;
  } catch {
    // ignore
  }
  return { name: "Delicious Cafe", address: "", phone: "" };
}

export function saveCafeSettings(data: CafeSettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function CafeSettings() {
  const [form, setForm] = useState<CafeSettingsData>(loadCafeSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(loadCafeSettings());
  }, []);

  function handleChange(field: keyof CafeSettingsData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      saveCafeSettings(form);
      setSaved(true);
      toast.success("Cafe settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Cafe Settings</CardTitle>
              <CardDescription>
                These details appear on every printed receipt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="cafe-name">Cafe Name</Label>
            <Input
              id="cafe-name"
              data-ocid="settings.name.input"
              placeholder="e.g. Delicious Cafe"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cafe-address">Address</Label>
            <Input
              id="cafe-address"
              data-ocid="settings.address.input"
              placeholder="e.g. 123 Main Street, City"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cafe-phone">Phone Number</Label>
            <Input
              id="cafe-phone"
              data-ocid="settings.phone.input"
              placeholder="e.g. +1 (555) 123-4567"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          {saved && (
            <p
              data-ocid="settings.success_state"
              className="text-sm text-emerald-600 font-medium"
            >
              ✓ Settings saved
            </p>
          )}

          <Button
            data-ocid="settings.save.button"
            className="w-full"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <span
                data-ocid="settings.loading_state"
                className="flex items-center gap-2"
              >
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
