import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useQueryChats() {
  const chats = useQuery(api.chats.getAll, {});

  return {
    data: chats,
    loading: chats === undefined,
    error: chats === null,
  };
}
