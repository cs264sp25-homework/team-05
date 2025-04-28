import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "@tanstack/react-router";
import { Id } from "../../../convex/_generated/dataModel";

const GroupChatPage = () => {
  // Extract groupId directly from URL params using TanStack Router
  const params = useParams({ from: "/groups/$groupId/chat" });
  const rawGroupId = params.groupId;
  
  // Store the properly typed groupId
  const [groupId, setGroupId] = useState<Id<"groups"> | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert and validate the groupId when component mounts
  useEffect(() => {
    if (rawGroupId) {
      try {
        // Attempt to use the groupId - this should be a valid Convex ID
        const typedGroupId = rawGroupId as Id<"groups">;
        setGroupId(typedGroupId);
        console.log(`[DEBUG] GroupChatPage - Valid groupId set: ${typedGroupId}`);
      } catch (error) {
        console.error(`[ERROR] Invalid groupId format: ${rawGroupId}`, error);
        toast.error("Invalid group ID format. Please navigate to a valid group.");
      }
    } else {
      console.error("[ERROR] GroupChatPage - No groupId in URL params");
      toast.error("Missing group information. Please navigate to a valid group chat.");
    }
  }, [rawGroupId]);

  // Only query the group if we have a valid groupId
  const group = useQuery(
    api.groups.getGroup, 
    groupId ? { groupId } : "skip"
  );
  
  const messages = useQuery(
    api.messages.getMessages,
    group?.chatId ? { chatId: group.chatId } : "skip"
  );

   const members = useQuery(
     api.groups.getGroupMembers,
     groupId ? { groupId } : "skip"
   )
  
  const sendMessage = useMutation(api.messages.sendMessage);

  // Debug log for messages and their groupIds
  useEffect(() => {
    if (messages?.length) {
      const hasGroupId = messages.some(msg => msg.groupId);
      console.log(`[DEBUG] Messages have groupId: ${hasGroupId}`);
      if (!hasGroupId && groupId) {
        console.log(`[WARN] Messages don't have groupId despite group context: ${groupId}`);
      }
    }
  }, [messages, groupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputRef.current?.value;
    
    // Extra validation
    if (!content?.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    if (!group?.chatId) {
      toast.error("Chat not found. Please try again.");
      return;
    }
    
    if (!groupId) {
      toast.error("Group information missing. Please refresh the page.");
      return;
    }

    try {
      console.log(`[DEBUG] Sending message with explicit groupId: ${groupId}`);
      
      await sendMessage({
        chatId: group.chatId,
        content,
        groupId, // Pass groupId for group context
      });
      
      inputRef.current.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  if (!group) {
    return <div className="flex flex-col items-center justify-center h-full">
      <p>Loading group data...</p>
      <p className="text-xs text-gray-500 mt-2">Group ID: {groupId || rawGroupId || "Not found"}</p>
    </div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-4 border-b">
        <h2 className="text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-gray-500">{group.description}</p>
        <p className="text-xs text-gray-400">Group ID: {String(groupId)}</p>
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
              <p className="text-xs text-gray-400 mt-1">
                {message.groupId ? `Group context: ${message.groupId}` : 'No group context'}
              </p>
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

export default GroupChatPage; 