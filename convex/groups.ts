import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

    // Create a chat for the group
    const chatId = await ctx.db.insert("chats", {
      title: `${args.name} Group Chat`,
      description: args.description,
      messageCount: 0,
      pageCount: 1,
    });

    // Create the group
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      inviteCode,
      chatId,
      createdAt: Date.now(),
    });

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
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

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
      internal.users.getUserProfiles, 
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