import { useState } from "react";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useRouter } from "@/hooks/use-router";
import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { useParams } from "@tanstack/react-router";

const JoinGroupPage = () => {
  const { isSignedIn } = useUser();
  const { navigate } = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const { inviteCode } = useParams({ from: "/join-group/$inviteCode" });

  const joinGroup = useMutation(api.groups.joinGroup);

  const handleJoinGroup = async () => {
    if (!inviteCode || !isSignedIn) return;

    setIsJoining(true);
    try {
      await joinGroup({ inviteCode });
      toast.success("Successfully joined the group!");
      // Add a small delay to allow the backend to update
      setTimeout(() => {
        navigate("groups");
      }, 1000);
    } catch (error: any) {
      console.error("Error joining group:", error);
      toast.error(error?.message || "Failed to join group. Please try again.");
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
              onClick={() => navigate("/")}
            >
              Go to Home
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
          <CardDescription>
            {!isSignedIn
              ? "Sign in to join this group"
              : "You've been invited to join a group"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSignedIn ? (
            <div className="text-center">
              <SignInButton mode="modal">
                <Button>Sign In to Continue</Button>
              </SignInButton>
            </div>
          ) : (
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button onClick={handleJoinGroup} disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Group"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGroupPage; 