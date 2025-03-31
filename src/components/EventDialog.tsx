import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"

interface EventDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (event: any) => void
  selectedDate?: Date
}

const REPEAT_OPTIONS = [
  { value: "NONE", label: "Does not repeat" },
  { value: "RRULE:FREQ=DAILY", label: "Daily" },
  { value: "RRULE:FREQ=WEEKLY", label: "Weekly" },
  { value: "RRULE:FREQ=MONTHLY", label: "Monthly" },
  { value: "RRULE:FREQ=YEARLY", label: "Yearly" },
];

const COLOR_OPTIONS = [
  { id: "1", name: "Lavender" },
  { id: "2", name: "Sage" },
  { id: "3", name: "Grape" },
  { id: "4", name: "Flamingo" },
  { id: "5", name: "Banana" },
  { id: "6", name: "Tangerine" },
  { id: "7", name: "Peacock" },
  { id: "8", name: "Graphite" },
  { id: "9", name: "Blueberry" },
  { id: "10", name: "Basil" },
  { id: "11", name: "Tomato" },
];

export function EventDialog({ isOpen, onClose, onSubmit, selectedDate }: EventDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startDate, setStartDate] = useState(
    selectedDate 
      ? new Date(selectedDate.setMinutes(0)).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [endDate, setEndDate] = useState(
    selectedDate 
      ? new Date(selectedDate.setMinutes(60)).toISOString().slice(0, 16)
      : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  )
  const [recurrence, setRecurrence] = useState("")
  const [colorId, setColorId] = useState("")
  const [useDefaultReminders, setUseDefaultReminders] = useState(true)
  const [customReminder, setCustomReminder] = useState(30) // minutes before

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const eventData = {
      summary: title,
      description,
      location,
      start: {
        dateTime: new Date(startDate).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(endDate).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      ...(recurrence !== "NONE" && { recurrence: [recurrence] }),
      ...(colorId && { colorId }),
      reminders: {
        useDefault: useDefaultReminders,
        ...((!useDefaultReminders && customReminder) && {
          overrides: [
            {
              method: 'popup',
              minutes: customReminder
            }
          ]
        })
      }
    }
    
    onSubmit(eventData)
    setTitle("")
    setDescription("")
    setLocation("")
    setRecurrence("NONE")
    setColorId("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start">Start Time</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Time</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repeat">Repeat</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>
              <SelectContent>
                {REPEAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select value={colorId} onValueChange={setColorId}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color.id} value={color.id}>
                    {color.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminders">Use Default Reminders</Label>
              <Switch
                id="reminders"
                checked={useDefaultReminders}
                onCheckedChange={setUseDefaultReminders}
              />
            </div>
            {!useDefaultReminders && (
              <div className="mt-2">
                <Label htmlFor="customReminder">Reminder (minutes before)</Label>
                <Input
                  id="customReminder"
                  type="number"
                  value={customReminder}
                  onChange={(e) => setCustomReminder(Number(e.target.value))}
                  min={0}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 