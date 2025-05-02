import { z } from "zod";
import AssistantForm from "@/components/assistants/assistant-form";

import DeleteConfirmation from "@/components/delete-confirmation-dialog";
import Empty from "@/components/empty";
import Loading from "@/components/loading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useRouter } from "@/hooks/use-router";
import { cn } from "@/lib/utils";
import { useQueryAssistant } from "@/hooks/use-query-assistant";
import { useMutationAssistant } from "@/hooks/use-mutation-assistant";
import { formSchema } from "@/components/assistants/form-config";

const DEBUG = false;

interface EditAssistantPageProps {
  assistantId: string;
}

const EditAssistantPage: React.FC<EditAssistantPageProps> = ({
  assistantId,
}) => {
  const { navigate } = useRouter();
  const { data: assistant, loading, error } = useQueryAssistant(assistantId);
  const { edit: editAssistant, delete: deleteAssistant } =
    useMutationAssistant(assistantId);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const success = await editAssistant(values);
    if (success) {
      navigate("assistants");
    }
  };

  const handleCancel = () => {
    navigate("assistants");
  };

  const handleDelete = async () => {
    const success = await deleteAssistant();
    if (success) {
      navigate("assistants");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Empty message="Error loading assistant" />;
  }

  const initialValues = {
    name: assistant.name || "",
    description: assistant.description ?? undefined,
    instructions: assistant.instructions || "",
    model: assistant.model || "",
    temperature: assistant.temperature ?? undefined,
    openaiAssistantId: assistant.openaiAssistantId || "",
    tools: assistant.tools ?? [],
    numWeeks: assistant.numWeeks || 1,
  };

  return (
    <ScrollArea
      className={cn("p-1 md:p-2 lg:p-4 h-full", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Edit Assistant</h2>
      </div>

      <AssistantForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialValues={initialValues}
        submitLabel="Save Changes"
        isEditing={true}
      />

      <div className="relative my-4">
        <Separator />
        <span className="absolute inset-0 flex justify-center items-center px-2 text-sm">
          Or
        </span>
      </div>

      <div className="flex justify-center p-2">
        <DeleteConfirmation onDelete={handleDelete} name="Assistant" />
      </div>
    </ScrollArea>
  );
};

export default EditAssistantPage;