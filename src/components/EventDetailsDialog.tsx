import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { EventDialog } from "./EventDialog"

interface EventDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  event: any
  onDelete: () => void
  onUpdate: (eventDetails: any) => void
}

export function EventDetailsDialog({ isOpen, onClose, event, onDelete, onUpdate }: EventDetailsDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false)

  if (isEditMode) {
    const formattedEventData = {
      summary: event.title,
      description: event.extendedProps?.description || '',
      location: event.extendedProps?.location || '',
      start: {
        dateTime: new Date(event.startStr).toISOString().slice(0, 16),
      },
      end: {
        dateTime: new Date(event.endStr).toISOString().slice(0, 16),
      },
      recurrence: event.extendedProps?.recurrence || [],
      colorId: event.extendedProps?.colorId || ''
    };

    return (
      <EventDialog
        isOpen={true}
        onClose={() => setIsEditMode(false)}
        onSubmit={(updatedEvent) => {
          onUpdate(updatedEvent)
          setIsEditMode(false)
          onClose()
        }}
        selectedDate={new Date(event.start)}
        initialData={formattedEventData}
        mode="edit"
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Time</h4>
            <p>
              {new Date(event?.start).toLocaleString()} - {new Date(event?.end).toLocaleString()}
            </p>
          </div>
          {event?.description && (
            <div>
              <h4 className="font-semibold">Description</h4>
              <p>{event.description}</p>
            </div>
          )}
          {event?.location && (
            <div>
              <h4 className="font-semibold">Location</h4>
              <p>{event.location}</p>
            </div>
          )}
          {event?.recurrence && (
            <div>
              <h4 className="font-semibold">Repeats</h4>
              <p>{event.recurrence[0].replace('RRULE:', '').toLowerCase()}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditMode(true)}>
              Edit
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 