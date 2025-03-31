import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

export default function Calendar() {
  const { events, isLoading, error, addEvent, loadEvents } = useGoogleCalendar()
  const [currentViewDates, setCurrentViewDates] = useState({
    start: new Date().toISOString(),
    end: new Date().toISOString()
  });

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

  const handleEventAdd = async (info: any) => {
    try {
      await addEvent({
        title: info.event.title,
        start: info.event.start.toISOString(),
        end: info.event.end.toISOString(),
        allDay: info.event.allDay
      })
    } catch (error) {
      console.error('Error adding event:', error)
    }
  }

  return (
    <div className="h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          Loading...
        </div>
      )}
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
        eventAdd={handleEventAdd}
        datesSet={handleDatesSet}
        eventClick={(info) => {
          info.jsEvent.preventDefault()
          if (info.event.url) {
            window.open(info.event.url)
          }
        }}
      />
    </div>
  )
} 