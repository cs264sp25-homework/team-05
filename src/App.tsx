import { SignInButton, SignOutButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "@/hooks/use-router";
import GoogleCalendarEvents from "./components/testclerk";
import HomePage from "@/pages/home-page";
import NotFoundPage from "./pages/not-found-page";
import Layout from "./components/layout";
import Empty from "./components/empty";
import ListChatsPage from "./pages/chats/list-chats-page";
import AddChatPage from "./pages/chats/add-chat-page";
import EditChatPage from "./pages/chats/edit-chat-page";
import MessagesPage from "./pages/messages/messages-page";


function App() {
  const { currentRoute, params } = useRouter();
  console.log(currentRoute);

  if (!currentRoute) {
    return <NotFoundPage />;
  }


  if (currentRoute === "home") {
    return <HomePage />;
  }
  const renderContent = () => {
    switch(currentRoute) {
      case "chats":
        return {
          left: <ListChatsPage />,
          middle: <Empty message="Select a chat to view its messages." />,
          right: null,
        }
        case "addChat":
          return {
            left: <ListChatsPage />,
            middle: <AddChatPage />,
            right: null,
          };
        case "editChat":
          return {
            left: <ListChatsPage />,
            middle: <EditChatPage chatId={params.chatId as string} />,
            right: null,
          };
        case "messages":
          return {
            left: <ListChatsPage />,
            middle: <MessagesPage chatId={params.chatId as string} />,
            right: null,
          };
    }
  }

  const { left, middle, right } = renderContent();

  return (
    <Layout
      leftPanelContent={left}
      middlePanelContent={middle}
      rightPanelContent={right}
      className="h-screen"
    />

  );
}


// https://www.googleapis.com/auth/calendar.readonly




// function Content() {
//   return <div>Authenticated content</div>;
// }

export default App;