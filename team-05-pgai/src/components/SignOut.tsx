import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
 



export function SignOut() {
  const { signOut } = useAuthActions();

  function handleSignOut(){
    signOut("google")
    .then(window.location.reload())
    }

  return (
    <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void handleSignOut("google")}
    >
      Sign Out
    </Button>
  );
}

export default SignOut;