import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { EventDialog } from '@/components/EventDialog'
import { Button } from './ui/button'
import { EventDetailsDialog } from '@/components/EventDetailsDialog'
import { useAuth } from '@clerk/clerk-react'

export default function Calendar() {
  const { events, isLoading, error, addEvent, updateEvent, deleteEvent, loadEvents } = useGoogleCalendar()
  const [currentViewDates, setCurrentViewDates] = useState({
    start: new Date().toISOString(),
    end: new Date().toISOString()
  });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // const { userId } = useAuth();

  // if (!userId) {
  //   return;
  // }

  // localStorage.setItem("user_id", userId);

  // console.log("This is the userID: ", userId);

  const handleDatesSet = (arg: any) => {
    const newStart = arg.start.toISOString();
    const newEnd = arg.end.toISOString();
    
    // Only reload if dates have changed
    if (newStart !== currentViewDates.start || newEnd !== currentViewDates.end) {
      setCurrentViewDates({ start: newStart, end: newEnd });
      loadEvents(newStart, newEnd);
    }
  };

  // Initial load
  useEffect(() => {
    loadEvents(currentViewDates.start, currentViewDates.end);
  }, []);

  if (error) {
    return <div className="text-red-500">Error loading calendar: {error.message}</div>
  }

  const handleSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.start);
    setIsEventDialogOpen(true);
    selectInfo.view.calendar.unselect(); // Clear the selection
  };

  const handleEventAdd = async (eventDetails: any) => {
    try {
      await addEvent({
        title: eventDetails.summary,
        start: eventDetails.start.dateTime,
        end: eventDetails.end.dateTime,
        allDay: false
      })
    } catch (error) {
      console.error('Error adding event:', error)
    }
  }

  const handleEventChange = async (info: any) => {
    try {
      await updateEvent(info.event.id, {
        title: info.event.title,
        start: info.event.start.toISOString(),
        end: info.event.end.toISOString(),
        allDay: info.event.allDay
      });
    } catch (error) {
      console.error('Error updating event:', error);
      info.revert();
    }
  };

  const handleEventClick = (info: any) => {
    if (info.event.url) {
      info.jsEvent.preventDefault()
      window.open(info.event.url)
      return
    }
    setSelectedEvent(info.event)
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          Loading...
        </div>
      )}
      <div className="mb-4">
        <Button onClick={() => setIsEventDialogOpen(true)}>
          Add Event
        </Button>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        events={events}
        select={handleSelect}
        eventChange={handleEventChange}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        eventContent={(arg) => (
          <div className={`flex items-center justify-between w-full px-1 ${
            arg.view.type === 'dayGridMonth' ? 'truncate max-w-full' : 'w-full'
          }`}>
            <span className="truncate block">{arg.event.title}</span>
            {(arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button 
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ×
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await deleteEvent(arg.event.id);
                        } catch (error) {
                          console.error('Error deleting event:', error);
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
        eventClassNames="truncate"
        dayCellClassNames="overflow-hidden"
        height="auto"
        dayMaxEventRows={3}
        views={{
          dayGridMonth: {
            eventMaxStack: 3,
            dayMaxEvents: 3,
          }
        }}
      />
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        onSubmit={handleEventAdd}
        selectedDate={selectedDate}
      />
      {selectedEvent && (
        <EventDetailsDialog
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false)
            setSelectedEvent(null)
          }}
          event={selectedEvent}
          onDelete={async () => {
            try {
              await deleteEvent(selectedEvent.id)
              setIsDetailsDialogOpen(false)
              setSelectedEvent(null)
            } catch (error) {
              console.error('Error deleting event:', error)
            }
          }}
          onUpdate={async (updatedEvent) => {
            try {
              await updateEvent(selectedEvent.id, {
                title: updatedEvent.summary,
                start: updatedEvent.start.dateTime,
                end: updatedEvent.end.dateTime,
                description: updatedEvent.description,
                location: updatedEvent.location,
                // ... other fields ...
              })
            } catch (error) {
              console.error('Error updating event:', error)
            }
          }}
        />
      )}
    </div>
  )
} 