import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "@/hooks/use-router";

const ChatMessagesPage = () => {
  const { params } = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatId = params.chatId as string;

  const chat = useQuery(api.chats.get, { chatId });
  const messages = useQuery(api.messages.getMessages, {
    chatId,
  });
  const sendMessage = useMutation(api.messages.sendMessage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputRef.current?.value;
    if (!content?.trim() || !chatId) return;

    try {
      await sendMessage({
        chatId,
        content,
      });
      inputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    }
  };

  if (!chat) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-4 border-b">
        <h2 className="text-xl font-semibold">{chat.title}</h2>
        <p className="text-sm text-gray-500">{chat.description}</p>
      </div>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages?.map((message) => (
            <Card
              key={message._id}
              className={`p-3 max-w-[80%] ${
                message.role === "assistant"
                  ? "ml-0 bg-blue-50"
                  : "ml-auto bg-gray-50"
              }`}
            >
              <p className="text-sm">
                {message.role === "assistant" ? "AI Assistant" : "You"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
            </Card>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="flex-none p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            className="flex-grow"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  );
};

export default ChatMessagesPage; 