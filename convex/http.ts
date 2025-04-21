import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/google-notifications",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const resourceId = req.headers.get("X-Goog-Resource-ID");

        console.log('Header:', req.headers);
        console.log('Resource ID:', resourceId);

        //if resourceId Id is in db and it belongs to current user than fetch the events
        const channel = await ctx.runQuery(api.calendar.getChannel, {resourceId: resourceId as string});
        if (!channel) {
            console.log("Channel not found");
            return new Response("Channel not found", { status: 404 });
        }
        // const user_id = await ctx.auth.getUserIdentity();
        // if (!user_id) {
        //     console.log("User not found");
        //     return new Response("User not found", { status: 404 });
        // }
        await ctx.runAction(api.google.listGoogleCalendarEvents, {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
        })

        // await ctx.runMutation(internal.calendar.insertCalendarEventUpdateSignal, {
        //     resourceId: resourceId as string,
        // })
      
        return new Response("OK", { status: 200 });
    }),
})

export default http;