import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useQueryAssistants() {

  // get rid of the parameter
  // have it call an internal function to get the user id
  // use that and return the assistants

  const assistants = useQuery(api.assistants.getAll, {});

  return {
    data: assistants,
    loading: assistants === undefined,
    error: assistants === null,
  };
}