import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useQueryChats(userId: any) {
  const chats = useQuery(api.chats.getAll, {userId: userId});

  return {
    data: chats,
    loading: chats === undefined,
    error: chats === null,
  };
}
