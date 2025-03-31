import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
const eventSchema = z.object({
    summary: z.string().min(1, 'Event summary is required'),
    start: z.object({
        dateTime: z.string().transform((val) => new Date(val).toISOString()),
    }),
    end: z.object({
        dateTime: z.string().transform((val) => new Date(val).toISOString()),
    }),
    description: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CreateEventFormProps {
    onSubmit: (event: EventFormData) => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSubmit }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
    });

    const submitHandler = (data: EventFormData) => {
        onSubmit(data);
        reset();
    };

    return (
        <form onSubmit={handleSubmit(submitHandler)}>
            <div>
                <label htmlFor="eventSummary">Event Summary:</label>
                <input type="text" id="eventSummary" {...register('summary')} />
                {errors.summary && <p>{errors.summary.message}</p>}
            </div>
            <div>
                <label htmlFor="startDate">Start Date:</label>
                <input type="datetime-local" id="startDate" {...register('start.dateTime')} />
                {errors.start?.dateTime && <p>{errors.start.dateTime.message}</p>}
            </div>
            <div>
                <label htmlFor="endDate">End Date:</label>
                <input type="datetime-local" id="endDate" {...register('end.dateTime')} />
                {errors.end?.dateTime && <p>{errors.end.dateTime.message}</p>}
            </div>
            <div>
                <label htmlFor="description">Description (Optional):</label>
                <textarea id="description" {...register('description')} />
            </div>
            <button type="submit">Create Event</button>
        </form>
    );
};

export default CreateEventForm;
