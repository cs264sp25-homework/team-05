import React from "react";
import MessageInput from "@/components/messages/message-input";
import MessageList from "@/components/messages/message-list";
import { cn } from "@/lib/utils";

const DEBUG = false;

interface MessagesProps {
  chatId: string;
}

const MessagesPage: React.FC<MessagesProps> = ({ chatId }) => {
  return (
    <div
      className={cn("flex flex-col h-full p-4 mb-2 bg-background", {
        "border border-red-500": DEBUG,
      })}
    >
      <div
        className={cn("flex-1 overflow-auto mb-4", {
          "border border-blue-500": DEBUG,
        })}
      >
        <MessageList chatId={chatId} />
      </div>
      <MessageInput chatId={chatId} />
    </div>
  );
};

export default MessagesPage;
