import ChatList from "@/components/chats/chat-list";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "@/hooks/use-router";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

const DEBUG = false;

const ListChatsPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <ScrollArea
      className={cn("p-1 md:p-2 lg:p-4 h-full", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div
        className={cn("flex items-center justify-between mb-6", {
          "border-2 border-blue-500": DEBUG,
        })}
      >
        <h2
          className={cn("text-2xl font-bold", {
            "border-2 border-green-500": DEBUG,
          })}
        >
          Chats
        </h2>
        <Button variant="outline" size="sm" onClick={() => navigate("addChat")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ChatList />
    </ScrollArea>
  );
};

export default ListChatsPage;
