import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStoreData } from '@/lib/queries';
import { useStore } from '@/lib/session';
import { photoUrl } from '@/lib/supabase';
import { Avatar, Body, Button, H1, Loading, Muted, Row, Screen, TextField } from '@/ui';
import { colors } from '@/ui/theme';

export default function Employees() {
  const { isAdmin } = useStore();
  const { data } = useStoreData();
  const [search, setSearch] = useState('');
  const list = data?.employees.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Employees</H1>
        {isAdmin && <Button title="+ Add Employee" color="green" onPress={() => router.push('/employees/new')} />}
      </Row>
      {(data?.employees.length ?? 0) > 5 && <TextField value={search} onChangeText={setSearch} placeholder="Search by name" />}
      {!list ? (
        <Loading />
      ) : list.length === 0 ? (
        <Muted>No employees yet.</Muted>
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push(`/employees/${e.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderWidth: 1, borderRadius: 10,
                borderColor: colors.border, backgroundColor: pressed ? colors.subtle : '#fff',
              })}
            >
              <Avatar name={e.name} url={photoUrl(e.photoPath)} />
              <Body style={{ flex: 1, fontSize: 16 }}>{e.name}</Body>
              <Text style={{ color: colors.faint, fontSize: 18 }}>→</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
