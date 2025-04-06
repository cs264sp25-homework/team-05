import { MessageType } from "@/types/message";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";

export function useQueryMessage(messageId: string) {
  const message = useQuery(api.messages.getOne, {
    messageId: messageId as Id<"messages">,
  });

  return {
    data: message as MessageType,
    loading: message === undefined,
    error: message === null,
  };
}
