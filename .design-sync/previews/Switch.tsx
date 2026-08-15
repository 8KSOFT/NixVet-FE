import { Switch, Label } from "nixvet-ui";

export const States = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <Switch id="notify-on" defaultChecked />
      <Label htmlFor="notify-on">Notificar por e-mail</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch id="notify-off" />
      <Label htmlFor="notify-off">Notificar por WhatsApp</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch id="notify-disabled" disabled />
      <Label htmlFor="notify-disabled">Notificar por SMS (indisponível)</Label>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-4">
    <Switch size="sm" defaultChecked />
    <Switch size="default" defaultChecked />
  </div>
);
