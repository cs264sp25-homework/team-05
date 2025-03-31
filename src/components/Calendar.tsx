import { useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

export default function Calendar() {
  const { events, isLoading, error, addEvent } = useGoogleCalendar()

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