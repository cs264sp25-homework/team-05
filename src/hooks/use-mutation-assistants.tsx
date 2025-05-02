import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CreateAssistantType } from "@/types/assistant";

export function useMutationAssistants() {
  const createMutation = useMutation(api.assistants.create);

  const createAssistant = async (
    assistant: CreateAssistantType,
  ): Promise<string | null> => {
    try {
      const assistantId = await createMutation({
        ...assistant,
        owner: "default",
      });
      toast.success("Assistant created successfully");
      return assistantId as string;
    } catch (error) {
      toast.error((error as Error).message || "Please try again later");
      return null;
    }
  };

  return {
    add: createAssistant,
  };
}