import { MessageType } from "@/types/message";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";

export function useQueryMessages(chatId: string) {
  const messages = useQuery(api.messages.getAll, {
    chatId: chatId as Id<"chats">,
  });

  return {
    data: messages?.reverse() as MessageType[],
    loading: messages === undefined, 
    error: messages === null, 
  };
}
