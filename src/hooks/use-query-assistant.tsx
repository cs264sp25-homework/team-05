import { AssistantType } from "@/types/assistant";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";

export function useQueryAssistant(assistantId: string) {
  const assistant = useQuery(api.assistants.getOne, {
    assistantId: assistantId as Id<"assistants">,
  });

  return {
    data: assistant as AssistantType,
    loading: assistant === undefined,
    error: assistant === null,
  };
}