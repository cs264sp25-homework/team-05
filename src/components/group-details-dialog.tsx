import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, UserMinus, Mail, Link as LinkIcon, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface GroupDetailsDialogProps {
  groupId: Id<"groups"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName?: string;
  groupDescription?: string;
  groupRole?: string;
  groupInviteCode?: string;
}

interface Member {
  userId: string;
  groupId: Id<"groups">;
  role: string;
  joinedAt: number;
  name: string;
  email: string;
  pictureUrl: string | null;
  isCurrentUser: boolean;
}

interface Members { 
  members: Member[];
  currentUserRole: string;
}

const GroupDetailsDialog = ({
  groupId,
  open,
  onOpenChange,
  groupName,
  groupDescription,
  groupRole,
  groupInviteCode,
}: GroupDetailsDialogProps) => {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isLeaveGroupAlertOpen, setIsLeaveGroupAlertOpen] = useState(false);
  const [membersWithProfiles, setMembersWithProfiles] = useState<Members|null>(null);
  
  // First get basic member info
  const groupMembersResult = useQuery(api.groups.getGroupMembers, 
    groupId ? { groupId } : "skip"
  );
  
  // Then use action to get enriched profiles
  const enrichProfiles = useAction(api.groups.enrichGroupMemberProfiles)
  

  const currentUserRole = membersWithProfiles?.currentUserRole || groupMembersResult?.currentUserRole;
  const members = membersWithProfiles?.members || groupMembersResult?.members || [];
  
  // When the dialog opens or we force a refresh, load enriched profiles
  useEffect(() => {
    async function loadEnrichedProfiles() {
      if (groupId && open && groupMembersResult) {
        setIsLoadingProfiles(true);
        try {
          const enrichedData = await enrichProfiles({groupId});
          setMembersWithProfiles(enrichedData);
        } catch (error) {
          toast.error("Failed to load complete member profiles");
          console.error("Error loading profiles:", error);
        } finally {
          setIsLoadingProfiles(false);
        }
      }
    }
    
    loadEnrichedProfiles();
  }, [groupId, open, groupMembersResult, loadAttempt]);

  const removeMember = useMutation(api.groups.removeMember);
  const deleteGroup = useMutation(api.groups.deleteGroup);
  const leaveGroup = useMutation(api.groups.leaveGroup);

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    
    try {
      await removeMember({ groupId, userId });
      toast.success("Member removed successfully");

      // Force refresh of member list
      setLoadAttempt(prev => prev + 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    
    try {
      await deleteGroup({ groupId });
      toast.success("Group deleted successfully");
      onOpenChange(false);
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group");
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    
    try {
      await leaveGroup({ groupId });
      toast.success("You have left the group");
      onOpenChange(false);
      // Reload the page after a short delay to update the UI
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to leave the group");
    }
  };

  const copyInviteLink = () => {
    if (!groupInviteCode) return;
    
    const inviteLink = `${window.location.origin}/team-05/join-group/${groupInviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard");
  };

  const isAdmin = groupRole === "admin" || currentUserRole === "admin";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{groupName || "Group Details"}</DialogTitle>
            <DialogDescription>{groupDescription || "View details about this group"}</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">Group Members</h3>
              {(!groupMembersResult && !membersWithProfiles) ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {member.pictureUrl ? (
                          <Avatar>
                            <AvatarImage src={member.pictureUrl} />
                            <AvatarFallback>{member.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar>
                            <AvatarFallback>{member.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {member.name || member.userId.substring(0, 8)}
                            {member.isCurrentUser && " (You)"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email || "Email loading..."}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        {currentUserRole === "admin" && !member.isCurrentUser && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-1"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this member from the group?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.userId)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoadingProfiles && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading complete profiles...
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {groupInviteCode && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Invite Link</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyInviteLink}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {isAdmin ? (
              <Button
                variant="destructive"
                onClick={() => setIsDeleteAlertOpen(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsLeaveGroupAlertOpen(true)}
                className="w-full sm:w-auto"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Leave Group
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert dialog for group deletion */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? All data associated with this group will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert dialog for leaving group */}
      <AlertDialog
        open={isLeaveGroupAlertOpen}
        onOpenChange={setIsLeaveGroupAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You will need a new invitation to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GroupDetailsDialog; 