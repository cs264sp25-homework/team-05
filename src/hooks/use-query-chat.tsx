import { ChatType } from "@/types/chat";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";

export function useQueryChat(chatId: string) {

  const chat = useQuery(api.chats.getOne, {
    chatId: chatId as Id<"chats">,
  });

  return {
    data: chat as ChatType,
    loading: chat === undefined,
    error: chat === null,
  };
}
