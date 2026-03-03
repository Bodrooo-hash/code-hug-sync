import { useQuery } from "@tanstack/react-query";
import { fetchUsers, type Bitrix24User } from "@/lib/bitrix24";

export function useBitrix24Users() {
  return useQuery<Bitrix24User[]>({ queryKey: ["bitrix24-users"], queryFn: fetchUsers, staleTime: 10 * 60 * 1000, retry: 1 });
}
