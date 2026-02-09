'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// ============================================================================
// SCHEDULE CONFIRMATION COMPONENT
// Displayed when orders are disabled by schedule (outside working hours).
// Requires customer to confirm next-day delivery before placing order.
// ============================================================================

export interface ScheduleConfirmationProps {
  t: (key: string) => string;
  scheduleConfirmChecked: boolean;
  onScheduleConfirmChange: (checked: boolean) => void;
  scheduleNotes: string;
  onScheduleNotesChange: (notes: string) => void;
}

export function ScheduleConfirmation({
  t,
  scheduleConfirmChecked,
  onScheduleConfirmChange,
  scheduleNotes,
  onScheduleNotesChange,
}: ScheduleConfirmationProps) {
  return (
    <div className="mt-3 p-3 border rounded-md bg-yellow-50 border-yellow-200 space-y-3">
      <p className="text-sm text-yellow-900 font-medium">
        {t('checkout.ordersDisabledScheduleMessage')}
      </p>

      <label className="flex items-start gap-2">
        <Checkbox
          checked={scheduleConfirmChecked}
          onCheckedChange={(v: any) => onScheduleConfirmChange(Boolean(v))}
        />
        <span className="text-sm text-yellow-900">
          {t('checkout.scheduleConfirmLabel') ||
            'I agree this order can be delivered tomorrow during working hours (9:30am - 9:00pm).'}
        </span>
      </label>

      <div>
        <Label
          htmlFor="schedule_notes_inline"
          className="text-xs text-yellow-900"
        >
          {t('checkout.scheduleNotesLabel') || 'Notes'} (
          {t('common.optional') || 'Optional'})
        </Label>
        <textarea
          id="schedule_notes_inline"
          rows={3}
          value={scheduleNotes}
          onChange={e => onScheduleNotesChange(e.target.value)}
          placeholder={
            t('checkout.scheduleNotesPlaceholder') ||
            'Optional notes about delivery'
          }
          className="mt-1 w-full px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>
    </div>
  );
}

export default ScheduleConfirmation;
