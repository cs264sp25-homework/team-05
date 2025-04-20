import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/hooks/use-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { toast } from "sonner";

const JoinGroupPage = () => {
  const { params, navigate } = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const inviteCode = params.inviteCode as string;

  const joinGroup = useMutation(api.groups.joinGroup);

  const handleJoinGroup = async () => {
    if (!inviteCode) return;

    setIsJoining(true);
    try {
      await joinGroup({ inviteCode });
      toast.success("Successfully joined the group!");
      navigate("groups");
    } catch (error) {
      toast.error("Failed to join group. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  if (!inviteCode) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This invite link appears to be invalid or has expired.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate("groups")}
            >
              Go to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Join Group
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            You've been invited to join a group. Click below to accept the
            invitation.
          </p>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate("groups")}>
              Cancel
            </Button>
            <Button onClick={handleJoinGroup} disabled={isJoining}>
              {isJoining ? "Joining..." : "Join Group"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGroupPage; 