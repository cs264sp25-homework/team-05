import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useQueryChats(userId: string) {
  // If userId is not provided, return undefined
  if (!userId) {
    console.log("User ID is not provided");
  }

  const chats = useQuery(api.chats.getAll, { userId });

  return {
    data: chats,
    loading: chats === undefined,
    error: chats === null,
  };
}
