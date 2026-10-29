import { useState } from 'react';
import { View } from 'react-native';
import { formatStart } from '@/lib/dates';
import {
  assignmentsFor, periodOf, sectionCandidates, shiftsForPeriod,
  type Assignment, type Period, type ScheduleData,
} from '@/lib/schedule';
import { Body, Button, Label, Row, Select } from '@/ui';
import { colors } from '@/ui/theme';

/**
 * Add or edit one assignment: Available / Others / Shift / Role dropdowns.
 * `period` limits the shift list to one section; null (daily "+ Add Shift") offers every shift.
 */
export function InlineShiftForm({
  data, date, period, initial, onSave, onCancel,
}: {
  data: ScheduleData;
  date: string;
  period: Period | null;
  initial?: Assignment;
  onSave: (a: Omit<Assignment, 'id'>) => void;
  onCancel: () => void;
}) {
  const shifts = period ? shiftsForPeriod(data, date, period) : [...data.shiftTypes].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const [shiftId, setShiftId] = useState(initial?.shiftTypeId ?? shifts[0]?.id ?? '');
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? '');
  const [roleId, setRoleId] = useState(initial?.roleId ?? '');
  const [error, setError] = useState('');

  const shift = data.shiftTypes.find((s) => s.id === shiftId);
  const effPeriod = shift ? periodOf(shift, data.store, date) : (period ?? 'morning');
  // Ignore the row being edited when listing who is already in the section.
  const others = { ...data, assignments: data.assignments.filter((a) => a.id !== initial?.id) };
  const groups = sectionCandidates(others, date, effPeriod);
  const inAvailable = groups.available.some((e) => e.id === employeeId);
  const toOptions = (list: { id: string; name: string }[]) => list.map((e) => ({ label: e.name, value: e.id }));

  const save = () => {
    if (assignmentsFor(others, date, effPeriod).some((a) => a.employeeId === employeeId)) {
      setError('Already on this section.');
      return;
    }
    onSave({ employeeId, shiftTypeId: shiftId, roleId: roleId || null, date });
  };

  if (shifts.length === 0) {
    return <Body style={{ color: colors.muted }}>No {period ?? ''} shifts. Add shift hours in Settings.</Body>;
  }
  return (
    <View style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, gap: 8 }}>
      <Label>Available</Label>
      <Select
        value={inAvailable ? employeeId : ''}
        onChange={setEmployeeId}
        placeholder="Select employee"
        options={toOptions(groups.available)}
      />
      <Label>Others</Label>
      <Select
        value={!inAvailable && groups.others.some((e) => e.id === employeeId) ? employeeId : ''}
        onChange={setEmployeeId}
        placeholder="Select employee"
        options={toOptions(groups.others)}
      />
      <Label>Shift</Label>
      <Select
        value={shiftId}
        onChange={setShiftId}
        options={shifts.map((s) => ({ label: `${s.name} (${formatStart(s.startTime)})`, value: s.id }))}
      />
      <Label>Role</Label>
      <Select value={roleId} onChange={setRoleId} placeholder="No role" options={data.roles.map((r) => ({ label: r.name, value: r.id }))} />
      {!!error && <Body style={{ color: colors.unavailableText }}>{error}</Body>}
      <Row>
        <Button title="Save" small onPress={save} disabled={!employeeId || !shiftId} />
        <Button title="Cancel" small color="grey" onPress={onCancel} />
      </Row>
    </View>
  );
}
