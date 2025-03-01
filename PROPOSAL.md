# Project Proposal

We are building an AI-powered cursor-like extension for Google Calendar. The extension will allow users to schedule events and tasks, while also getting tips and advice on creating an optimized schedule from a chat feature.

## Functional Requirements

### Primary Features (Must Have)

As a user, I want to:
    1. Create an account and sign in using Google so that I can securely access my calendar and scheduling features
    2. Connect my Google Calendar to the application so that I can synchronize my events and tasks seamlessly
    3. See a visual display of my Google Calendar within the application so that I can manage my schedule efficiently
    4. Create, update, delete, and retrieve calendar events and tasks so that I can manage my schedule flexibly
    5. Have a chat panel where I can interact with an AI assistant to manage my schedule more efficiently

### Secondary Features (Should Have)

As a user, I want to:
    1. Sort my events and tasks based on priority so that I can focus on the most important tasks first


### Tertiary Features (Nice to Have)

As a user, I want to:
    1. Create event and task templates so that I can quickly add commonly scheduled activities without re-entering details
    2. Categorize events and tasks using tags so that I can filter and organize them easily
    3. Receive push notifications for upcoming events and tasks so that I don’t miss important commitments

### Won't Have Features

As a user, I want to:
    1. Integrate calendars from Apple and Microsoft so that I can manage all my schedules in one place


### AI Features

- Create events/tasks in your schedule using the ChatBot, with an accept/decline feature before creating it.
- Edit events/tasks in your schedule (time, day, title, color-code, etc.) using the ChatBot, with an accept/decline feature before creating it.
- Resolve schedule conflicts using the ChatBot, if something new comes up it will move an event to another time, while slotting this new event in.
- Offer suggestions on how to schedule your day/week
- Create groups of people who need to meet as part of a team, giving access to each team member’s calendar to our chatbot to ask questions/schedule events as part of all members of the team.
    -The Chatbot will be prompt engineered to only share general information about a team member’s availability, and not anything private. 

- Schedule group meetings, having the assistant read the schedules of multiple people in a group and suggesting a time to meet. If everyone accepts the suggestion, it will get added to their calendars.
- The AI can analyze deadlines, task importance, and past user behavior to suggest an optimal order for completing tasks.
- Converse with an AI assistant through chat that can:
- Take in natural language such as “I am not a morning person, how can I schedule my afternoon for the following events…” and schedule accordingly
- Offer good scheduling practices to the user

The following features could be implemented, if time permits:

- Provide analytics on how much time you devote to certain tasks/events
- The AI can analyze deadlines, task importance, and past user behavior to suggest an optimal order for completing tasks.
-Giving the user the option to switch between OpenAI and Ollama


The following features would be nice to have but won’t be implemented:

- Join meetings and assist user by taking notes

### Tech Stack

Frontend: Vite, React.js, 
Backend: Convex 
APIs: Google Calendar API, OpenAI, Ollama(if time permits)

## Project Roadmap
TBD
