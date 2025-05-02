import { UpdateChatType } from "@/types/chat";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

export function useMutationChat(chatId: string) {
  const updateMutation = useMutation(api.chats.update);
  const deleteMutation = useMutation(api.chats.remove);

  const editChat = async (chat: UpdateChatType): Promise<boolean> => {
    try {
      await updateMutation({
        ...chat,
        assistantId:
          chat.assistantId === undefined
            ? undefined
            : chat.assistantId === "default"
            ? "default"
            : (chat.assistantId as Id<"assistants">),
        chatId: chatId as Id<"chats">,
      });
      return true;
    } catch (error) {
      toast((error as Error).message || "Please try again later");
      return false;
    }
  };

  const deleteChat = async (): Promise<boolean> => {
    try {
      await deleteMutation({
        chatId: chatId as Id<"chats">,
      });
      return true;
    } catch (error) {
      toast((error as Error).message || "Please try again later");
      return false;
    }
  };

  return {
    edit: editChat,
    delete: deleteChat,
  };
}
