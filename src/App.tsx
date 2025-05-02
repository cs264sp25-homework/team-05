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
import ListAssistantsPage from "./pages/assistants/list-assistant-page";
import AddAssistantPage from "./pages/assistants/add-assistant-page";
import EditAssistantPage from "./pages/assistants/edit-assistant-page";
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

export const assistantsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/assistants",
  component: () => {
    return <Layout
      leftPanelContent={<ListAssistantsPage/>}
      middlePanelContent={<Empty message="Select an assistant to view its messages." />}
      rightPanelContent={null}
    />
},
});
  
export const addAssistantRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/assistants/add",
  component: () => {
    return <Layout
      leftPanelContent={<ListChatsPage />}
      middlePanelContent={<AddAssistantPage />}
      rightPanelContent={null}
    />
},
});
  
export const editAssistantRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/assistants/$assistantId/edit",
  component: () => {
    const {assistantId} = useParams({strict: false})
    return <Layout
      leftPanelContent={<ListAssistantsPage />}
      middlePanelContent={<EditAssistantPage assistantId={params.assistantId as string} />}
      rightPanelContent={null}
    />
},
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
  assistantsRoute,
  addAssistantRoute,
  editAssistantRoute,
]);

function App() {
  return (
    <>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;