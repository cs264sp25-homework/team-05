import { useEffect, useState } from "react";
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
  const { isSignedIn, user } = useUser();
  const { navigate } = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false);
  const { inviteCode } = useParams({ from: "/join-group/$inviteCode" });

  const joinGroup = useMutation(api.groups.joinGroup);

  useEffect(() => {
    // Check for Google Calendar access when user is signed in
    if (isSignedIn) {
      checkCalendarAccess();
    }
  }, [isSignedIn]);

  const checkCalendarAccess = async () => {
    try {
      // You'll need to implement this function to check if the user has granted calendar access
      // This could be stored in your database or checked through the Google Calendar API
      const hasAccess = await user?.publicMetadata?.hasCalendarAccess;
      setHasCalendarAccess(!!hasAccess);
    } catch (error) {
      console.error("Error checking calendar access:", error);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode || !isSignedIn) return;

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
              : !hasCalendarAccess
              ? "Grant calendar access to continue"
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
          ) : !hasCalendarAccess ? (
            <div className="text-center">
              <Button
                onClick={() => {
                  // Implement calendar authorization flow
                  // This should redirect to Google OAuth
                  window.location.href = "/api/auth/google";
                }}
              >
                Connect Google Calendar
              </Button>
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