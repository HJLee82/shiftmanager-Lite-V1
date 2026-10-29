import { EmployeeForm } from '@/components/EmployeeForm';
import { useStoreData } from '@/lib/queries';
import { Loading } from '@/ui';

export default function NewEmployee() {
  const { data } = useStoreData();
  return data ? <EmployeeForm data={data} /> : <Loading />;
}
