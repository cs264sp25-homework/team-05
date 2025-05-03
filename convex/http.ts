import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/google-notifications",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const resourceId = req.headers.get("X-Goog-Resource-ID");

        // console.log('Header:', req.headers);
        // console.log('Resource ID:', resourceId);

        //if resourceId Id is in db and it belongs to current user than fetch the events
        const channel = await ctx.runQuery(api.calendarEvents.getWatchChannelByResourceId, {resourceId: resourceId as string});
        if (!channel) {
            console.log("Channel not found");
            return new Response("Channel not found", { status: 404 });
        }
        // const user_id = await ctx.auth.getUserIdentity();
        // if (!user_id) {
        //     console.log("User not found");
        //     return new Response("User not found", { status: 404 });
        // }

        const updatedEvents = await ctx.runAction(api.google.listGoogleCalendarEvents, {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            userId: channel.token,
        })

        await ctx.runMutation(api.calendarEvents.bulkInsertCalendarEvent, {
            userId: channel.userId,
            events: updatedEvents.map((event: any) => ({
                eventId: event.id,
                summary: event.summary,
                start: {
                    date: event.start.date || '',
                    dateTime: event.start.dateTime || '',
                    timeZone: event.start.timeZone || '',
                },
                end:{
                    date: event.end.date || '',
                    dateTime: event.end.dateTime || '',
                    timeZone: event.end.timeZone || '',
                },
                description: event.description,
                location: event.location,
                recurrence: event.recurrence,
                colorId: event.colorId,
                htmlLink: event.htmlLink,
                created: event.created,
                updated: event.updated,
                reminders: event.reminders,
            })),
        })
        // await ctx.runMutation(internal.calendar.insertCalendarEventUpdateSignal, {
        //     resourceId: resourceId as string,
        // })
      
        return new Response("OK", { status: 200 });
    }),
})

export default http;