import { z } from "zod";
import { useRouter } from "@/hooks/use-router";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";
import AssistantForm from "@/components/assistants/assistant-form";
import { useMutationAssistants } from "@/hooks/use-mutation-assistants";
import { formSchema } from "@/components/assistants/form-config";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";

const DEBUG = false;

const AddAssistantPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { navigate } = useRouter();
  const { add: createAssistant } = useMutationAssistants();
  const fetchEvents = useAction(api.google.listGoogleCalendarEvents);
  const { userId } = useAuth();

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    console.log("These are hte values", values);

    let nextWeeksEvents = null;

    if (values.numWeeks === 1) {
      // fetch current date
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 7);
      const startDateString = startDate.toISOString();
      const endDateString = endDate.toISOString();
      console.log("Start date", startDateString);
      console.log("End date", endDateString);

      nextWeeksEvents = await fetchEvents({
        startDate: startDateString,
        endDate: endDateString,
        userId: userId,
      })
    } else if (values.numWeeks === 2) {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 14);
      const startDateString = startDate.toISOString();
      const endDateString = endDate.toISOString();

      console.log("Start date", startDateString);
      console.log("End date", endDateString);
      nextWeeksEvents = await fetchEvents({
        startDate: startDateString,
        endDate: endDateString,
        userId: userId,
      })
    }

    console.log("Next weeks events", nextWeeksEvents);

    // if (values) {
    //   console.log("Early exit");
    //   return
    // }

    // pass nextWeeksEvents to the createAssistant function


    // const createValues = {
    //   name: values.name,
    //   description: values.description,
    //   instructions: values.instructions,
    //   model: values.model,
    //   temperature: values.temperature,
    //   openaiAssistantId: values.openaiAssistantId,
    //   metadata: values.metadata,
    //   tools: values.tools,
    //   numWeeks: values.numWeeks,
    // }

    // add the nextWeeksEvents to the values object
    const createValues = {
      ...values,
      nextWeeksEvents: nextWeeksEvents,
    };
    
    const assistantId = await createAssistant(createValues);


    if (assistantId) {
      setLoading(false);
      navigate("assistants");
    }
  };

  const handleCancel = () => {
    navigate("assistants");
  };

  return (
    <ScrollArea
      className={cn("p-1 md:p-2 lg:p-4 h-full", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      {loading ? (
        <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          <p className="ml-3">Creating assistant, one moment...</p>
      </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Add New Assistant</h2>
          </div>

          <AssistantForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Create Assistant"
          />
        </>
      )}
      
    </ScrollArea>
  );
};

export default AddAssistantPage;