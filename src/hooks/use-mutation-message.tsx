import { UpdateMessageType } from "@/types/message";
import { toast } from "sonner";

export function useMutationMessage(messageId: string) {
  const editMessage = async (message: UpdateMessageType): Promise<boolean> => {
    try {
      console.log(`Trying to update ${messageId}`, message);
      throw new Error("Edit message not implemented");
    } catch (error) {
      toast.error((error as Error).message || "Please try again later");
      return false;
    }
  };

  // TODO: We may want to remove this feature!
  const deleteMessage = async (): Promise<boolean> => {
    try {
      console.log(`Trying to delete ${messageId}`);
      throw new Error("Delete message not implemented");
    } catch (error) {
      toast.error((error as Error).message || "Please try again later");
      return false;
    }
  };

  return {
    edit: editMessage,
    delete: deleteMessage,
  };
}
