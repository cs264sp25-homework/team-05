import { Button } from "@/components/ui/button";
import { useRouter } from "@/hooks/use-router";
import { cn } from "@/lib/utils";

const DEBUG = false;

const NotFoundPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div
      className={cn("flex flex-col items-center justify-center h-full gap-12", {
        "border-2 border-red-500": DEBUG,
      })}
    >
      <div
        className={cn("flex flex-col items-center gap-6 p-4", {
          "border-2 border-blue-500": DEBUG,
        })}
      >
        <p
          className={cn("font-bold text-muted-foreground", {
            "border-2 border-green-500": DEBUG,
          })}
        >
          404
        </p>
        <h1
          className={cn("text-6xl font-semibold", {
            "border-2 border-yellow-500": DEBUG,
          })}
        >
          Page not found
        </h1>
        <p
          className={cn("text-xl text-muted-foreground max-w-lg text-center", {
            "border-2 border-purple-500": DEBUG,
          })}
        >
          Sorry, we couldn't find the page you're looking for. Please check the
          URL or navigate back home.
        </p>
      </div>
      <Button onClick={() => navigate("home")}>Go to homepage</Button>
    </div>
  );
};

export default NotFoundPage;
