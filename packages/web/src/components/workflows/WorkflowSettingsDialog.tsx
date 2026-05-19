import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const inputClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent';

const selectClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';

const labelClass = 'text-[10px] text-text-tertiary uppercase tracking-wide';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export interface WorkflowSettings {
  effort?: 'low' | 'medium' | 'high' | 'max';
  thinking?:
    | { type: 'adaptive' }
    | { type: 'enabled'; budgetTokens?: number }
    | { type: 'disabled' };
  sandbox?: { enabled?: boolean };
  betas?: string[];
  fallbackModel?: string;
}

export interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: WorkflowSettings;
  onSettingsChange: (settings: WorkflowSettings) => void;
}

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: WorkflowSettingsDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Workflow Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Effort (default for all nodes)">
            <select
              value={settings.effort ?? ''}
              onChange={(e): void => {
                onSettingsChange({
                  ...settings,
                  effort: (e.target.value || undefined) as WorkflowSettings['effort'],
                });
              }}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="max">max</option>
            </select>
          </Field>

          <Field label="Thinking">
            <select
              value={settings.thinking ? (settings.thinking as { type: string }).type : ''}
              onChange={(e): void => {
                const val = e.target.value;
                if (!val) {
                  onSettingsChange({ ...settings, thinking: undefined });
                } else if (val === 'adaptive') {
                  onSettingsChange({ ...settings, thinking: { type: 'adaptive' } });
                } else if (val === 'enabled') {
                  onSettingsChange({ ...settings, thinking: { type: 'enabled' } });
                } else {
                  onSettingsChange({ ...settings, thinking: { type: 'disabled' } });
                }
              }}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="adaptive">adaptive</option>
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </Field>

          <Field label="Sandbox">
            <select
              value={settings.sandbox?.enabled ? 'enabled' : ''}
              onChange={(e): void => {
                onSettingsChange({
                  ...settings,
                  sandbox: e.target.value === 'enabled' ? { enabled: true } : undefined,
                });
              }}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="enabled">Enabled</option>
            </select>
          </Field>

          <Field label="Betas">
            <input
              type="text"
              value={settings.betas?.join(', ') ?? ''}
              onChange={(e): void => {
                const val = e.target.value.trim();
                onSettingsChange({
                  ...settings,
                  betas: val
                    ? val
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                    : undefined,
                });
              }}
              placeholder="beta-feature-1, beta-feature-2"
              className={inputClass}
            />
          </Field>

          <Field label="Fallback Model">
            <input
              type="text"
              value={settings.fallbackModel ?? ''}
              onChange={(e): void => {
                onSettingsChange({
                  ...settings,
                  fallbackModel: e.target.value || undefined,
                });
              }}
              placeholder="Model to use if primary fails"
              className={inputClass}
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
