import type { ProfileEntity, ProfileUpdateInput } from '@/lib/calc/types';
import { profileRowToEntity } from '@/lib/supabase/adapters';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdateRow = Database['public']['Tables']['profiles']['Update'];

function toProfileUpdateRow(data: ProfileUpdateInput): ProfileUpdateRow {
  const row: ProfileUpdateRow = {
    updated_at: new Date().toISOString(),
  };

  if (data.displayName !== undefined) row.display_name = data.displayName;
  if (data.companyName !== undefined) row.company_name = data.companyName;
  if (data.role !== undefined) row.role = data.role;

  return row;
}

function isProfileEntity(profile: ProfileEntity | null): profile is ProfileEntity {
  return profile !== null;
}

export async function getProfile(userId: string): Promise<ProfileEntity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return profileRowToEntity(data);
}

export async function updateProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update(toProfileUpdateRow(data))
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export async function getAllProfiles(): Promise<ProfileEntity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: ProfileRow) => profileRowToEntity(row)).filter(isProfileEntity);
}
