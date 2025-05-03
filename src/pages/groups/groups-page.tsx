import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Link as LinkIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, useUser } from "@clerk/clerk-react";
import GroupDetailsDialog from "@/components/group-details-dialog";
import { Id } from "../../../convex/_generated/dataModel";

const GroupsContent = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [showInviteCode, setShowInviteCode] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: Id<"groups">;
    name: string;
    inviteCode: string;
    description: string;
    role: string;
  } | null>(null);

  const { user } = useUser();
  if (!user) {
    console.log("ajeoaiwefoawefawoei")
  }

  const groups = useQuery(api.groups.getUserGroups, user?.id ? {userId: user.id} : "skip");
  const createGroup = useMutation(api.groups.createGroup);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { inviteCode } = await createGroup(newGroup);
      setNewGroup({ name: "", description: "" });
      setIsCreateOpen(false);
      setShowInviteCode(inviteCode);
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error("Failed to create group. Please try again.");
    }
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup({
      id: group._id,
      name: group.name,
      inviteCode: group.inviteCode,
      description: group.description,
      role: group.role
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Groups</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.reload();
              toast.info("Refreshing groups...");
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a group to coordinate schedules with your team.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Group Name</label>
                  <Input
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    placeholder="Enter group description"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showInviteCode && (
        <Card className="mb-8 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <LinkIcon className="w-5 h-5 mr-2" />
              Invite Link Generated
            </CardTitle>
            <CardDescription>
              Share this link with others to invite them to your group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <code className="bg-white px-4 py-2 rounded-md flex-1">
                {`${window.location.origin}/team-05/join-group/${showInviteCode}`}
              </code>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/team-05/join-group/${showInviteCode}`
                  );
                  toast.success("Invite link copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {groups === undefined ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading groups...</p>
        </div>
      ) : groups === null ? (
        <div className="text-center py-8">
          <p className="text-red-500">Error loading groups. Please try refreshing the page.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven't joined any groups yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card 
              key={group._id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleGroupClick(group)}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {group.name}
                </CardTitle>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Role: {group.role}
                  </span>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      navigator.clipboard.writeText(
                        `${window.location.origin}/team-05/join-group/${group.inviteCode}`
                      );
                      toast.success("Invite link copied to clipboard");
                    }}
                  >
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Group details dialog */}
      <GroupDetailsDialog
        groupId={selectedGroup?.id || null}
        groupName={selectedGroup?.name}
        groupDescription={selectedGroup?.description}
        groupRole={selectedGroup?.role}
        groupInviteCode={selectedGroup?.inviteCode}
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
      />
    </div>
  );
};

const GroupsPage = () => {
  return (
    <>
      <Authenticated>
        <GroupsContent />
      </Authenticated>
      <Unauthenticated>
        <div className="container mx-auto py-8 text-center">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to view and manage your groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </>
  );
};

export default GroupsPage; 