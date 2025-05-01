import { z } from "zod";
import ChatForm from "@/components/chats/chat-form";
import { formSchema } from "@/components/chats/form-config";
import DeleteConfirmation from "@/components/delete-confirmation-dialog";
import Empty from "@/components/empty";
import Loading from "@/components/loading";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMutationChat } from "@/hooks/use-mutation-chat";
import { useQueryChat } from "@/hooks/use-query-chat";
import { useRouter } from "@/hooks/use-router";
import { cn } from "@/lib/utils";

const DEBUG = false;

interface EditChatPageProps {
  chatId: string;
}

const EditChatPage: React.FC<EditChatPageProps> = ({ chatId }) => {
  const { navigate } = useRouter();
  const { data: chat, loading, error } = useQueryChat(chatId);
  const { edit: editChat, delete: deleteChat } = useMutationChat(chatId);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const success = await editChat(values);
    if (success) {
      navigate("chats");
    }
  };

  const handleCancel = () => {
    navigate("chats");
  };

  const handleDelete = async () => {
    const success = await deleteChat();
    if (success) {
      navigate("chats");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Empty message="Error loading chat" />;
  }

  const initialValues = {
    title: chat.title || "",
    description: chat.description ?? undefined,
    assistantId: chat.assistantId || "default",
  };

  return (
    <ScrollArea
      className={cn("p-1 md:p-2 lg:p-4 h-full", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Edit Chat</h2>
      </div>

      <ChatForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialValues={initialValues}
        submitLabel="Save Changes"
      />

      <div className="relative my-4">
        <Separator />
        <span className="absolute inset-0 flex justify-center items-center px-2 text-sm">
          Or
        </span>
      </div>

      <div className="flex justify-center p-2">
        <DeleteConfirmation onDelete={handleDelete} name="Chat" />
      </div>
    </ScrollArea>
  );
};

export default EditChatPage;
