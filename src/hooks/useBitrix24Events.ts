import { useQuery } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { fetchCalendarEvents, fetchUsers, mapBitrix24Events } from "@/lib/bitrix24";
import type { CalendarEvent } from "@/components/EventCalendar";

export function useBitrix24Events(currentMonth: Date) {
  const from = subMonths(startOfMonth(currentMonth), 1);
  const to = addMonths(endOfMonth(currentMonth), 1);

  return useQuery<CalendarEvent[]>({
    queryKey: ["bitrix24-events", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const [raw, users] = await Promise.all([fetchCalendarEvents(from, to), fetchUsers()]);
      const usersMap = new Map(users.map((u) => [u.ID, u]));
      const missingCreatorIds = raw.map((e) => e.CREATED_BY).filter((id): id is string => !!id && !usersMap.has(id));
      const uniqueMissing = [...new Set(missingCreatorIds)];
      if (uniqueMissing.length > 0) {
        try { const { fetchUsersByIds } = await import("@/lib/bitrix24"); const extra = await fetchUsersByIds(uniqueMissing); extra.forEach((u) => usersMap.set(u.ID, u)); } catch {}
      }
      return mapBitrix24Events(raw, usersMap);
    },
    staleTime: 5 * 60 * 1000, retry: 1,
  });
}
