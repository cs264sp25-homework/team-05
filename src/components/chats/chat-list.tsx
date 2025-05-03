import { useQueryChats } from "@/hooks/use-query-chats";
import Chat from "./chat";
import Loading from "@/components/loading";
import Empty from "@/components/empty";
import { Authenticated } from "convex/react";
import { useUser } from "@clerk/clerk-react";

const ChatList: React.FC = () => {

  const { user } = useUser();

  if (!user || !user.id) {
    return <Loading />;
  }

  const { data: chats, loading, error } = useQueryChats(user.id);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Empty message="Error loading chats" />;
  }

  if (chats && chats.length === 0) {
    return <Empty message="No chats found. Create one to get started!" />;
  }

  return (
    <Authenticated>
    <div aria-label="Chat list" className="flex flex-col gap-2">
      {chats &&
        chats.map(({ _id, title, description, messageCount, pageCount, groupId }) => (
          <div key={_id} role="listitem">
            <Chat
              _id={_id}
              title={title}
              description={description}
              messageCount={messageCount || 0}
              pageCount={pageCount || 0}
              groupId={groupId}
            />
          </div>
        ))}
    </div>
    </Authenticated>
  );
};

export default ChatList;
