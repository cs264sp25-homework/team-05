import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useQueryAssistantsAccess() {

  const assistantsYouHaveAccessTo = useQuery(api.assistant_access.getAssistantsYouHaveAccessTo, {});

  console.log("The assistants you have access to", assistantsYouHaveAccessTo);

  return {
    data: assistantsYouHaveAccessTo,
    loading: assistantsYouHaveAccessTo === undefined,
    error: assistantsYouHaveAccessTo === null,
  };
}