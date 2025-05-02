import { Route, useParams } from "@tanstack/react-router";
import { rootRoute } from "./root";
import HomePage from "./pages/home-page";
import ListChatsPage from "./pages/chats/list-chats-page";
import AddChatPage from "./pages/chats/add-chat-page";
import EditChatPage from "./pages/chats/edit-chat-page";
import GroupsPage from "./pages/groups/groups-page";
import JoinGroupPage from "./pages/join-group/[inviteCode]";
import GroupChatPage from "./pages/groups/group-chat-page";
import { Toaster } from "sonner";
import Layout from "./components/layout";
import Calendar from "./components/Calendar";
import Empty from "./components/empty";
import ChatMessagesPage from "./pages/chats/chat-messages-page";

export const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

export const listChatsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/chats",
  component: () => (
    <Layout
      leftPanelContent={<ListChatsPage />}
      middlePanelContent={<Empty message="Select a chat to view its messages." />}
      rightPanelContent={<Calendar />}
    />
  ),
});

export const addChatRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/chats/add",
  component: () => (
    <Layout
      leftPanelContent={<ListChatsPage />}
      middlePanelContent={<AddChatPage />}
      rightPanelContent={<Calendar />}
    />
  ),
});

export const editChatRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/chats/$chatId/edit",
  component: () => {
    const {chatId} = useParams({strict: false})
    return <Layout
      leftPanelContent={<ListChatsPage />}
      middlePanelContent={<EditChatPage chatId={chatId ?? ""} />}
      rightPanelContent={<Calendar />}
    />
},
});

export const chatMessagesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/chats/$chatId/messages",
  component: () => (
      <Layout
      leftPanelContent={<ListChatsPage />}
      middlePanelContent={<ChatMessagesPage />}
      rightPanelContent={<Calendar />}
    />
  ),
});

export const groupsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/groups",
  component: () => (
    <Layout
      leftPanelContent={<GroupsPage />}
      middlePanelContent={null}
      rightPanelContent={<Calendar />}
    />
  ),
});

export const joinGroupRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/join-group/$inviteCode",
  component: JoinGroupPage,
});

export const groupChatRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/groups/$groupId/chat",
  component: () => (
    <Layout
      leftPanelContent={<GroupsPage />}
      middlePanelContent={<GroupChatPage />}
      rightPanelContent={<Calendar />}
    />
  ),
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  listChatsRoute,
  addChatRoute,
  editChatRoute,
  chatMessagesRoute,
  groupsRoute,
  joinGroupRoute,
  groupChatRoute,
]);

function App() {
  return (
    <>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;