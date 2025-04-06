import { ChatType } from "@/types/chat";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/hooks/use-router";

const DEBUG = false;

const Chat: React.FC<Partial<ChatType>> = ({
  _id,
  title,
  description,
  messageCount = 0,
  pageCount = 0,
}) => {
  const { navigate } = useRouter();

  return (
    <AspectRatio
      ratio={16 / 9}
      className={cn("w-full border rounded-xl p-2", "hover:bg-secondary", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-1">
            <div
              className={cn("p-1 text-muted-foreground font-light text-sm", {
                "border-2 border-blue-500": DEBUG,
              })}
            >
              {messageCount}
              {messageCount == 1 ? " message" : " messages"}
            </div>
            <div
              className={cn("p-1 text-muted-foreground font-light text-sm", {
                "border-2 border-blue-500": DEBUG,
              })}
            >
              {"/"}
            </div>
            <div
              className={cn("p-1 text-muted-foreground font-light text-sm", {
                "border-2 border-blue-500": DEBUG,
              })}
            >
              {pageCount}
              {pageCount == 1 ? " file" : " files"}
            </div>
          </div>
          <div
            className={cn("flex justify-end", {
              "border-2 border-blue-500": DEBUG,
            })}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  onClick={() => navigate("editChat", { chatId: _id })}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit chat</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  onClick={() => navigate("messages", { chatId: _id })}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show messages</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div
          className={cn("p-1", {
            "border-2 border-green-500": DEBUG,
          })}
        >
          {title}
        </div>
        <div
          className={cn("flex-1 p-1 text-muted-foreground", {
            "border-2 border-green-500": DEBUG,
          })}
        >
          {description}
        </div>
        <div
          className={cn("p-1", {
            "border-2 border-green-500": DEBUG,
          })}
        ></div>
        {DEBUG && <Badge>{_id}</Badge>}
      </div>
    </AspectRatio>
  );
};

export default Chat;
