import { cn } from "@/lib/utils";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const DEBUG = false;

interface LayoutProps {
  leftPanelContent: React.ReactNode;
  middlePanelContent: React.ReactNode;
  rightPanelContent: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  leftPanelContent,
  middlePanelContent,
  rightPanelContent,
  className,
}) => {
  return (
    <main
      className={cn(
        "flex min-h-screen w-full antialiased scroll-smooth",
        className,
        {
          "border-2 border-red-500": DEBUG,
        },
      )}
    >
      <div
        className={cn("flex flex-col px-2 w-full", {
          "border-2 border-purple-500": DEBUG,
        })}
      >
        <Header />
        <ResizablePanelGroup
          autoSaveId="layout"
          direction="horizontal"
          className={cn("flex-1", {
            "border-2 border-pink-500 ": DEBUG,
          })}
        >
          {leftPanelContent && (
            <ResizablePanel
              className={cn({
                "border-2 border-blue-500": DEBUG,
              })}
              minSize={30}
              order={1}
              collapsedSize={0}
              collapsible={true}
              id="left-panel"
            >
              {leftPanelContent}
            </ResizablePanel>
          )}
          {leftPanelContent && (middlePanelContent || rightPanelContent) && (
            <ResizableHandle withHandle />
          )}
          {middlePanelContent && (
            <ResizablePanel
              minSize={30}
              className={cn({
                "border-2 border-green-500": DEBUG,
              })}
              order={2}
              id="middle-panel"
            >
              {middlePanelContent}
            </ResizablePanel>
          )}
          {(leftPanelContent || middlePanelContent) && rightPanelContent && (
            <ResizableHandle withHandle />
          )}
          {rightPanelContent && (
            <ResizablePanel
              minSize={30}
              className={cn({
                "border-2 border-yellow-500": DEBUG,
              })}
              order={3}
              collapsedSize={0}
              collapsible={true}
              id="right-panel"
            >
              {rightPanelContent}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
        <Footer />
      </div>
    </main>
  );
};

export default Layout;
