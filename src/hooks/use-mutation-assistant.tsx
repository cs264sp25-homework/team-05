import { UpdateAssistantType } from "@/types/assistant";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

export function useMutationAssistant(assistantId: string) {
  const updateMutation = useMutation(api.assistants.update);
  const deleteMutation = useMutation(api.assistants.remove);

  const editAssistant = async (
    assistant: UpdateAssistantType,
  ): Promise<boolean> => {
    try {
      const { openaiAssistantId, ...rest } = assistant;
      await updateMutation({
        ...rest,
        assistantId: assistantId as Id<"assistants">,
        name: assistant.name as string,
        instructions: assistant.instructions as string,
        model: assistant.model as string,
        numWeeks: (assistant.numWeeks ?? 1) as 1 | 2, 
        owner: assistant.owner as string,
      });
      toast.success("Assistant updated successfully");
      return true;
    } catch (error) {
      toast((error as Error).message || "Please try again later");
      return false;
    }
  };

  const deleteAssistant = async (): Promise<boolean> => {
    try {
      await deleteMutation({
        assistantId: assistantId as Id<"assistants">,
      });
      toast.success("Assistant deleted successfully");
      return true;
    } catch (error) {
      toast((error as Error).message || "Please try again later");
      return false;
    }
  };

  return {
    edit: editAssistant,
    delete: deleteAssistant,
  };
}