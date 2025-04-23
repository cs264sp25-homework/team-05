import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import {listGoogleCalendarEvents} from "convex/google";

export const PostSignInSync = () => {
  const { user } = useUser();
  const onSignIn = useMutation(api.onSignIn);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const clerkId = user.id;
      const email = user.primaryEmailAddress?.emailAddress ?? "";

      // Replace with real data from Google Calendar API
    const { calendars } = await listGoogleCalendarEvents({
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
    });

      await onSignIn({ clerkId, email, calendars });
    })();
  }, [user]);

  return null;
};
