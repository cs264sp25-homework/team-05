import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { EventDialog } from '@/components/EventDialog'
import { Button } from './ui/button'

export default function Calendar() {
  const { events, isLoading, error, addEvent, updateEvent, deleteEvent, loadEvents } = useGoogleCalendar()
  const [currentViewDates, setCurrentViewDates] = useState({
    start: new Date().toISOString(),
    end: new Date().toISOString()
  });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()

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

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.start)
    setIsEventDialogOpen(true)
  }

  const handleEventAdd = async (eventDetails: { title: string; start: string; end: string }) => {
    try {
      await addEvent({
        title: eventDetails.title,
        start: eventDetails.start,
        end: eventDetails.end,
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
      info.jsEvent.preventDefault();
      window.open(info.event.url);
      return;
    }
  };

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
        select={handleDateSelect}
        eventChange={handleEventChange}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        eventContent={(arg) => (
          <div className="flex items-center justify-between w-full px-1">
            <span>{arg.event.title}</span>
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
          </div>
        )}
      />
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        onSubmit={handleEventAdd}
        selectedDate={selectedDate}
      />
    </div>
  )
} 