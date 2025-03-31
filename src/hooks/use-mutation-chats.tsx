import { CreateChatType } from "@/types/chat";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useMutationChats() {
  const createMutation = useMutation(api.chats.create);

  const createChat = async (chat: CreateChatType): Promise<string | null> => {
    try {
      const chatId = await createMutation({
        ...chat,
      });
      return chatId as string;
    } catch (error) {
      toast.error((error as Error).message || "Please try again later");
      return null;
    }
  };

  return {
    add: createChat,
  };
}
