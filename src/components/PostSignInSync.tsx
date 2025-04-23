import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { getGoogleCalendarsAndEvents } from "@/lib/google"; // create this to fetch via accessToken

export const PostSignInSync = () => {
  const { user } = useUser();
  const onSignIn = useMutation(api.auth.onSignIn);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const clerkId = user.id;
      const email = user.primaryEmailAddress?.emailAddress ?? "";

      // Replace with real data from Google Calendar API
      const { calendars } = await getGoogleCalendarsAndEvents(); 

      await onSignIn({ clerkId, email, calendars });
    })();
  }, [user]);

  return null;
};
