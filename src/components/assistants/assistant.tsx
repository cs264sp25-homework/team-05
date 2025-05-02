import { AssistantType } from "@/types/assistant";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/hooks/use-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Id } from "convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-react";

const DEBUG = false;

const Assistant: React.FC<Partial<AssistantType>> = ({
  _id,
  name,
  description,
  model,
}) => {

  const authorizedEmails = useQuery(api.assistant_access.getAssistantAccess, {
    assistantId: _id as Id<"assistants">,
  }) ?? [];

  console.log("authorizedEmails", authorizedEmails);

  const { user } = useUser();
  const currentEmail = user?.emailAddresses[0]?.emailAddress;

  localStorage.setItem("currentEmail", currentEmail as string);
  

  const giveAccessMutation = useMutation(api.assistant_access.giveAccess);
  const revokeAccessMutation = useMutation(api.assistant_access.revokeAccess);
  

  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    console.log("in the useeffect");
    if (authorizedEmails && currentEmail) {
      console.log("in the if ");
      const authorizedEmailsFiltered = (authorizedEmails).filter((email) => email !== currentEmail);
      setItems(authorizedEmailsFiltered);
    }
  }, [authorizedEmails, currentEmail]);

  const handleAddItem = () => {
    if (newItem.trim() === "") return;
    setItems((prev) => [...prev, newItem]);
    setNewItem(""); // Clear input
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleSubmit = () => {
    // Get the items that weren't initially part of authorizedEmailsFiltered
    const newItems = items.filter((item) => !authorizedEmails.includes(item));

    if (!_id) {
      return;
    }

    // Call the API to give access to these items
    newItems.forEach(async (item) => {
      await giveAccessMutation({
        assistantId: _id as Id<"assistants">,
        userEmail: item,
        owner: false,
      });
    });

    // Close the dialog
    setOpen(false);
  }

  const handleRevokeAccess = async (item: string) => {
    if (!_id) {
      console.log("Assistant ID is not defined");
      return;
    }

    console.log("Revoke access for email:", item);


    await revokeAccessMutation({
      assistantId: _id as Id<"assistants">,
      userEmail: item as string, 
    });
  };



  return (
    <AspectRatio
      ratio={16 / 9}
      className={cn("w-full border rounded-xl p-2", "hover:bg-secondary", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div className="flex flex-col h-full">
        {/* Header section */}
        <div className="flex items-center justify-between">
          {/* model */}
          <div className="flex items-center justify-center gap-1">
            <div className="p-1 text-muted-foreground font-light text-sm">
              {model}
            </div>
          </div>

          {/* Edit and Lock buttons */}
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"icon"}
                  onClick={() =>
                    navigate("editAssistant", { assistantId: _id })
                  }
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit assistant</p>
              </TooltipContent>
            </Tooltip>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant={"ghost"} size={"icon"}>
                  <Lock className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Share Your Assistant</DialogTitle>
                  <DialogDescription>
                    Give access to your assistant to other users.
                  </DialogDescription>
                </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Type something..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAddItem}>Add</Button>
        </div>

        <div className="mt-2 space-y-1 overflow-y-auto max-h-40">
          {items.map((item, index) => (
            <div key={index} className="p-1 border rounded bg-muted flex items-center justify-between">
              <span>{item}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={async () => {
                  setItems((prev) => prev.filter((_, i) => i !== index))
                  handleRevokeAccess(item);
                }

                }
                aria-label="Remove"
              >
                ×
              </Button>
            </div>
          ))}
        </div>


                <DialogFooter>
                  <Button type="submit" onClick={handleSubmit}>Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="p-1">{name}</div>
        <div className="flex-1 p-1 text-muted-foreground">{description}</div>


        {DEBUG && <Badge>{_id}</Badge>}
      </div>
    </AspectRatio>
  );
};

export default Assistant;