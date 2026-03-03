import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/bitrix24";

export interface CurrentUser { ID: string; NAME: string; LAST_NAME: string; PERSONAL_PHOTO?: string; }

export function useBitrix24Profile() {
  return useQuery<CurrentUser>({ queryKey: ["bitrix24-profile"], queryFn: async () => { const raw = await fetchUserProfile(); return raw as unknown as CurrentUser; }, staleTime: 30 * 60 * 1000, retry: 1 });
}
