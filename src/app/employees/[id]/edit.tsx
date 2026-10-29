import { useLocalSearchParams } from 'expo-router';
import { EmployeeForm } from '@/components/EmployeeForm';
import { useStoreData } from '@/lib/queries';
import { Loading, Muted, Screen } from '@/ui';

export default function EditEmployee() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStoreData();
  if (!data) return <Loading />;
  const employee = data.employees.find((e) => e.id === id);
  return employee ? <EmployeeForm data={data} employee={employee} /> : <Screen><Muted>Employee not found.</Muted></Screen>;
}
