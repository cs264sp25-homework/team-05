import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type NormalizedEvent = {
  id: string | null | undefined,
  summary: string,
  start: {
    dateTime: string,
    isAllDay: boolean
  },
  end: {
    dateTime: string,
    isAllDay: boolean
  },
  status: string,
  _normalized: boolean,
  user?: string,
  userId?: string,
};

// Generate a random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Create a new group
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const inviteCode = generateInviteCode();

    // 1. Create the group FIRST to get the groupId
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      inviteCode,
      chatId: undefined, // chatId will be added later
      createdAt: Date.now(),
    });

    // 2. Create a chat for the group, including the groupId
    const chatId = await ctx.db.insert("chats", {
      title: `${args.name} Group Chat`, 
      description: args.description,
      messageCount: 0,
      pageCount: 0, // Typically starts at 0 files/pages
      groupId: groupId, // <-- STORE THE GROUP ID HERE
      assistantId: "default",
    });
    
    // 3. Update the group document with the chatId
    await ctx.db.patch(groupId, { chatId: chatId });

    // Add creator as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });

    return { groupId, inviteCode };
  },
});

// Get a specific group
export const getGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of the group
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this group");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    return {
      ...group,
      role: membership.role,
    };
  },
});

// Join a group using invite code
export const joinGroup = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find the group by invite code
    const group = await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!group) {
      throw new Error("Invalid invite code");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", group._id).eq("userId", userId)
      )
      .first();

    if (existingMember) {
      throw new Error("Already a member of this group");
    }

    // Add user as member
    await ctx.db.insert("groupMembers", {
      groupId: group._id,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return group._id;
  },
});

// Get all groups for a user
export const getUserGroups = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

    const userId = args.userId;

    // Get all group memberships for the user
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get the group details for each membership and filter out any deleted groups
    const groups = (await Promise.all(
      memberships.map(async (membership) => {
        try {
          const group = await ctx.db.get(membership.groupId);
          if (!group) {
            return null; // Group was deleted
          }
          return {
            ...group,
            _id: membership.groupId, // Ensure we include the group ID
            role: membership.role,
          };
        } catch (error) {
          console.error("Error fetching group:", error);
          return null;
        }
      })
    )).filter((group): group is NonNullable<typeof group> => group !== null);

    return groups;
  },
});

// Get basic group members info - without profiles
export const getGroupMembers = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of the group
    const currentUserMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", identity.subject)
      )
      .first();

    if (!currentUserMembership) {
      throw new Error("Not a member of this group");
    }

    // Get all members of the group
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const membersWithBasicInfo = members.map(member => {
      const isCurrentUser = member.userId === identity.subject;
      return {
        ...member,
        name: isCurrentUser ? (identity.name || member.userId.substring(0, 8)) : member.userId.substring(0, 8),
        email: isCurrentUser ? (identity.email || "Email unavailable") : "Loading...",
        pictureUrl: isCurrentUser ? identity.pictureUrl : null,
        isCurrentUser
      };
    });

    return {
      members: membersWithBasicInfo,
      currentUserRole: currentUserMembership.role
    };
  },
});

// Internal version of getGroupMembers that doesn't require authentication
// This is ONLY for internal actions/queries like openai.getGroupAvailability
export const internalGetGroupMembers = internalQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Get all members of the group
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const membersWithBasicInfo = members.map(member => {
      return {
        ...member,
        name: member.userId.substring(0, 8),
        email: "Email unavailable",
        pictureUrl: null,
        isCurrentUser: false
      };
    });

    return {
      members: membersWithBasicInfo,
      currentUserRole: "internal"
    };
  },
});

export const getGroupEvents = action({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    groupId: v.any(),
  },
  handler: async (ctx, args) => {
    const groupMembersResponse = await ctx.runQuery(internal.groups.internalGetGroupMembers, {
      groupId: args.groupId
    });
    if (!groupMembersResponse || !groupMembersResponse.members || groupMembersResponse.members.length === 0) {
      console.error(`[ERROR] No members found in group ${args.groupId}`);
      throw new Error("No members found in the group");
    }
    const events: NormalizedEvent[] = [];
    const memberEvents = await Promise.all(groupMembersResponse.members.map(async (member) => {
        const events = await ctx.runAction(api.google.listGoogleCalendarEvents,
          {startDate: args.startDate, 
            endDate: args.endDate,
            userId: member.userId
          })
        return {
          events: events,
          userId: member.userId,
          user: member.name,
        }}
        ));
    memberEvents.forEach((member) => {
      if (member) {
      member.events.forEach((event: NormalizedEvent | null) => {
          if (event) {
            console.log(event)
          events.push({
            ...event,
            userId: member.userId,
            user: member.user,
          })
        }
        })
      }
    })
    return events;
  }
})

export const createGroupEvent = action({
  args: {
    event: v.object({
      summary: v.string(),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      colorId: v.optional(v.string()),
      start: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      end: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      recurrence: v.optional(v.array(v.string())), 
      reminders: v.optional(v.object({
        useDefault: v.boolean(),
        overrides: v.optional(v.array(v.object({
          method: v.string(),
          minutes: v.number(),
        }))),
      })),
    }),
    groupId: v.any(),
  },
  handler: async (ctx, args) => {
    const groupMembersResponse = await ctx.runQuery(internal.groups.internalGetGroupMembers, {
      groupId: args.groupId
    });
    if (!groupMembersResponse || !groupMembersResponse.members || groupMembersResponse.members.length === 0) {
      console.error(`[ERROR] No members found in group ${args.groupId}`);
      throw new Error("No members found in the group");
    }
    await Promise.all(groupMembersResponse.members.map(async (member) => {
      console.log(`Scheduling for member ${member.userId}...`)
        const result = await ctx.runAction(api.google.createGoogleCalendarEvent, {
          event: args.event, 
          userId: member.userId});
        console.log(result);
    }))
  }
})

// Action to fetch enriched group member profiles
export const enrichGroupMemberProfiles = action({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args): Promise<{
    members: Array<{
      userId: string;
      groupId: Id<"groups">;
      role: string;
      joinedAt: number;
      name: string;
      email: string;
      pictureUrl: string | null;
      isCurrentUser: boolean;
    }>;
    currentUserRole: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // First, get the user membership using a query
    const membershipResult: {
      members: Array<any>;
      currentUserRole: string;
    } = await ctx.runQuery(api.groups.getGroupMembers, {
      groupId: args.groupId
    });
    
    if (!membershipResult) {
      throw new Error("Not a member of this group");
    }
    
    const members: Array<any> = membershipResult.members;
    const currentUserRole: string = membershipResult.currentUserRole;

    // Extract userIds for profile fetch
    const userIds = members.map((member: any) => member.userId);
    
    console.log(`[DEBUG] Enriching profiles for ${userIds.length} members in group ${args.groupId}`);
    
    // Fetch all user profiles using the action
    const userProfiles = await ctx.runAction(
      internal.user_details.getUserProfiles, 
      { userIds }
    );
    
    // Create a lookup map
    const profileMap: Record<string, any> = {};
    for (const profile of userProfiles) {
      profileMap[profile.userId] = profile;
    }
    
    // Merge member data with profiles
    const enrichedMembers = members.map((member: any) => {
      const profile = profileMap[member.userId];
      const isCurrentUser = member.userId === identity.subject;
      
      return {
        userId: member.userId,
        groupId: member.groupId,
        role: member.role,
        joinedAt: member.joinedAt,
        name: profile?.name || (isCurrentUser ? identity.name : member.userId.substring(0, 8)),
        email: profile?.email || (isCurrentUser ? identity.email : "Email unavailable"),
        pictureUrl: profile?.imageUrl || (isCurrentUser ? identity.pictureUrl : null),
        isCurrentUser
      };
    });
    
    return {
      members: enrichedMembers,
      currentUserRole
    };
  },
});

// Remove a member from a group
export const removeMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if current user is an admin of the group
    const adminMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", identity.subject)
      )
      .first();

    if (!adminMembership || adminMembership.role !== "admin") {
      throw new Error("Only group admins can remove members");
    }

    // Cannot remove yourself as admin
    if (args.userId === identity.subject) {
      throw new Error("You cannot remove yourself from the group");
    }

    // Check if member to remove exists
    const memberToRemove = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .first();

    if (!memberToRemove) {
      throw new Error("Member not found in this group");
    }

    // Remove the member
    await ctx.db.delete(memberToRemove._id);

    return true;
  },
});

// Delete an entire group
export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if current user is an admin of the group
    const adminMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", identity.subject)
      )
      .first();

    if (!adminMembership || adminMembership.role !== "admin") {
      throw new Error("Only group admins can delete the group");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // First, delete all members
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete the group's chat if it exists
    if (group.chatId) {
      await ctx.db.delete(group.chatId);
    }

    // Finally, delete the group itself
    await ctx.db.delete(args.groupId);

    return true;
  },
});

// Allow a user to leave a group
export const leaveGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if the user is in the group
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("You are not a member of this group");
    }

    // Check if the user is the last admin
    if (membership.role === "admin") {
      const admins = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      
      if (admins.length <= 1) {
        throw new Error("You are the last admin. Please appoint another admin or delete the group.");
      }
    }

    // Remove the user from the group
    await ctx.db.delete(membership._id);

    return true;
  },
});

// Internal query to get group members directly (no auth check)
export const getGroupMembersInternal = internalQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Get all members of the group directly
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Add basic information to each member
    const membersWithBasicInfo = members.map(member => {
      return {
        ...member,
        name: member.userId.substring(0, 8), // Simple name based on userId
        email: "Member",
        pictureUrl: null,
      };
    });

    return membersWithBasicInfo;
  },
}); 