import { cn } from "@/lib/utils";

const DEBUG = false;

function App() {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-screen gap-5",
        {
          "border-2 border-red-500": DEBUG,
        },
      )}
    >
      <div
        className={cn(
          "flex items-center justify-start font-semibold text-xl3",
          {
            "border-2 border-blue-500": DEBUG,
          },
        )}
      >
      </div>
      <div className="max-w-md">
        Hello World!
      </div>
    </div>
  )
}

export default App
