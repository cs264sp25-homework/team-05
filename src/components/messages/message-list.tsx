import { useQueryMessages } from "@/hooks/use-query-messages";
import { useCallback, useEffect, useRef, useState } from "react";
import Loading from "@/components/loading";
import Empty from "@/components/empty";
import Message from "@/components/messages/message";
import { cn } from "@/lib/utils";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

interface MessageListProps {
  chatId: string;
}

const MessageList: React.FC<MessageListProps> = ({ chatId }) => {
  const firstMessageId = useRef<string | null>(null);
  const lastMessageId = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopValue = useRef(0);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const [scrollDirection, setScrollDirection] = useState<"down" | "up" | null>(
    null,
  );

  const {
    data: messages, // array of messages
    loading, // boolean indicating if the messages are being loaded for the first time
    error, // boolean indicating if there's an error loading messages
  } = useQueryMessages(chatId);

  const scrollToMessage = useCallback(
    (
      messageId: string | null,
      block: "start" | "center" | "end" | "nearest" = "end",
    ) => {
      if (!messageId) return;
      const messageElement = document.querySelector(
        `[data-message-id="${messageId}"]`,
      );

      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: "smooth",
          block,
          inline: "nearest",
        });
      }
    },
    [],
  );

  useEffect(
    () => {
      // when messages change, we might want to scroll to the bottom
      if (!messages || messages.length <= 0) return;

      // if we never stored the last or first message id, store it
      if (!lastMessageId.current || !firstMessageId.current) {
        lastMessageId.current = messages[messages.length - 1]._id;
        firstMessageId.current = messages[0]._id;
        scrollToMessage(lastMessageId.current);
        return;
      }

      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage._id !== lastMessageId.current) {
        // if the last message is new, scroll to the bottom
        lastMessageId.current = lastMessage._id;
        scrollToMessage(lastMessageId.current);
      } else if (firstMessage._id !== firstMessageId.current) {
        // if the first message is new, user loaded earlier messages
        // scroll so what used to be the first message is still visible
        const oldFirstMessageId = firstMessageId.current;
        firstMessageId.current = firstMessage._id;
        scrollToMessage(oldFirstMessageId, "center");
      } else {
        // if the first and last message are as before, the last message is being
        // updated by the AI, so we should scroll to the bottom
        // unless the user is scrolling up or down
        if (!isUserScrolling.current && scrollDirection !== "up") {
          scrollToMessage(lastMessageId.current);
        }
      }
    },
    // Do not add isUserScrolling or scrollDirection to the dependencies!
    [messages, scrollToMessage],
  );

  // TODO: should we debounce this?
  const handleOnScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    isUserScrolling.current = true;

    if (scrollTopValue.current < e.currentTarget.scrollTop) {
      setScrollDirection("down");
    } else {
      setScrollDirection("up");
    }

    scrollTopValue.current = e.currentTarget.scrollTop;

    // Set a new timeout to reset isUserScrolling
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 150); // 150ms
  };

  if (loading) return <Loading />;
  if (error) return <Empty message="Error loading messages" />;
  if (messages.length === 0) return <Empty message="What can I help with?" />;

  const latestMessageId = messages[messages.length - 1]._id;

  let eventDetails = null;
  let scrollTime = "12:00:00";
  if (messages[messages.length - 1].content.includes('has been successfully created')) {
    const titleMatch = messages[messages.length - 1].content.match(/"([^"]+)"/);
    const dateMatch = messages[messages.length - 1].content.match(/for ([A-Za-z]+ \d+, \d{4})/);
    const timeMatch = messages[messages.length - 1].content.match(/from (\d+:\d+ [AP]M) to (\d+:\d+ [AP]M)/);

    console.log(messages[messages.length - 1].content);
    // Extract the Google Calendar URL from the message content
    const urlMatch = messages[messages.length - 1].content.match(/\[here\]\((https?:\/\/[^\s]+)\)/)?.[1];

    console.log(urlMatch)

    //console.log("URL Match:", urlMatch![0]);
    
    if (titleMatch && dateMatch && timeMatch) {
      const title = titleMatch[1];
      const startTime = timeMatch[1];
      const endTime = timeMatch[2];
      
      const startDateTime = new Date(`${dateMatch[1]} ${startTime}`);

      scrollTime = startTime;
      console.log("this is the scorll time", startDateTime);

      // extract the time from startDateTime
      const startHours = startDateTime.getHours();
      console.log("this is the start hours", startHours);

      scrollTime = startHours.toString() + ":00:00";

      const endDateTime = new Date(`${dateMatch[1]} ${endTime}`);

      
      
      eventDetails = {
        title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        url: urlMatch,
      };
    }
  }


  
  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-y-auto scroll-smooth")}
      onScroll={handleOnScroll}
    >
      {messages.map((message) => {
        // Parse event details if it's a calendar event message

        return (
          <div key={message._id} data-message-id={message._id}>
            <Message message={message} />
            {message._id === messages[messages.length - 1]._id && 
             message.content.includes('calendar') && eventDetails && (
              <div className="flex justify-center items-center w-full">
                <div className="h-[500px] w-[600px]">
                  <FullCalendar
                    headerToolbar={{
                      start: '',
                      center: '',
                      right: '',
                    }}
                    plugins={[timeGridPlugin]}
                    initialView="timeGridDay"
                    weekends={true}
                    scrollTime={scrollTime}
                    slotDuration="00:30:00"
                    events={[eventDetails]}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;


