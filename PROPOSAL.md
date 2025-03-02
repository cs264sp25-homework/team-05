# Project Proposal

We are building an AI-powered cursor-like web application for Google Calendar. The app will allow users to schedule events and tasks for themselves along with a group of other users, while also getting tips and advice on creating an optimized schedule from a chat feature.

## Functional Requirements

### Primary Features (Must Have)

As a user, I want to:
1. Create an account and sign in using Google so that I can securely access my calendar and scheduling features
2. Connect my Google Calendar to the application so that I can synchronize my events and tasks seamlessly
3. See a visual display of my Google Calendar within the application so that I can manage my schedule efficiently
4. Create, update, delete, and retrieve calendar events and tasks so that I can manage my schedule flexibly
5. Have a chat panel where I can interact with the AI to manage my schedule more efficiently
6. Create events and tasks using the chatbot so that I can schedule items efficiently, with an option to accept or decline before they are added
7. Edit events and tasks through the chatbot by modifying details like time, day, title, and color, with an option to accept or decline changes before they are applied
8. Resolve schedule conflicts by having the chatbot reschedule existing events when something new comes up so that I don’t have overlapping commitments
9. Create groups of people who need to meet as a team, allowing the chatbot to access general availability of members while keeping private details secure
10. Schedule group meetings by analyzing team members' calendars and suggesting a time that works for everyone, with an option for all members to accept before adding it to their schedules
11. Chat with the AI that can take natural language input, such as “I am not a morning person, how can I schedule my afternoon for the following events…” and adjust my schedule accordingly
    

### Secondary Features (Should Have)

As a user, I want to:
1. Sort my events and tasks based on priority so that I can focus on the most important tasks first
2. Have the AI analyze my deadlines, task importance, and past behavior so that it can suggest the best order for completing my tasks
3. Have the AI to provide best practices for scheduling so that I can optimize my time management
4. Have the AI suggest how to schedule my day or week so that I can manage my time effectively


### Tertiary Features (Nice to Have)

As a user, I want to:
1. Create event and task templates so that I can quickly add commonly scheduled activities without re-entering details
2. Categorize events and tasks using tags so that I can filter and organize them easily
3. Receive push notifications for upcoming events and tasks so that I don’t miss important commitments
4. Receive analytics on how much time I spend on certain tasks and events so that I can optimize my scheduling habits
5. Have the AI to analyze my deadlines, task importance, and past user behavior to suggest an optimal order for completing tasks
6. Have the option to switch between different AI models (OpenAI and Ollama) so that I can choose the assistant that best fits my needs

### Won't Have Features

As a user, I want to:
1. Integrate calendars from Apple and Microsoft so that I can manage all my schedules in one place
2. Have the AI to join my meetings and take notes so that I can focus on discussions without worrying about documentation

### Tech Stack

- Frontend: Vite, React.js, 
- Backend: Convex 
- APIs: Google Calendar API, OpenAI, Ollama (if time permits)

## Roadmap
### SPRINT 1
#### Week 8
1. Set up project repository with React, Vite, TailwindCSS, and Shadcn UI
    - Create project structure
2. Implement user authentication system (Primary Feature #1)
    - Integrate Google Sign-In
    - Create sign-out functionality
3. Setup Google Calendar API to fetch and display calendars
    - View same events/tasks you would see in Google Calendar
4. Design and implement database schema
    - Design schema for events, groups/teams, message, chat and potentially more
5. Develop UI component library
    - Collect reusable components like buttons, dialogs, inputs, etc.

Deliverables:
- GitHub repository with CI/CD setup
- Database schema setup
- Being able to sign in using Google account


#### Week 10
1. CRUD Operations on Events/Tasks
    - Build necessary components to test functionality
    - Integrate with Convex functions
    - Test in dashboard
2. Set up UI and functionality for the AI chatbot  
    - Develop UI to mimic existing chabots to increase usability
3. Converse with an AI assistant through chat that can:
    - Take in natural language such as “I am not a morning person, how can I schedule my afternoon for the following events…” and schedule accordingly
    - Offer good scheduling practices to the user
4. Allow the AI bot to create tasks and events based on the user’s prompt
    - Integrate with Convex functions

Deliverables: 
- CRUD operations for events
- UI for chatbot
- Basic integration with AI

#### Week 11
1. Allow the AI bot to edit/delete events from the user’s calendar
2. Resolve schedule conflicts using the ChatBot, if something new comes up it will move an event to another time, while slotting this new event in.
3. Sprint 1 Wrap Up (testing, etc)

Deliverables: 
- Delete/edit events with AI
- Resolve conflicts
- Sprint progress report

### SPRINT 2
#### Week 12
1. Create groups of people who need to meet as part of a team, giving access to each team member’s calendar to our chatbot to ask questions about the team’s availability.
    - The Chatbot will be prompt engineered to only share general information about a team member’s availability, and not anything private. 
2. Crud operations on groups,(adding, removing, and editing people)

Deliverables:
- Make and manage groups/teams
- Allow the AI to add 

#### Week 13
1. Allow the AI bot to schedule group meetings, having the assistant read the schedules of multiple people in a group and suggesting a time to meet. If everyone accepts the suggestion, it will get added to their calendars.
   - Prompt AI to fetch current user and other people within the group's schedules and parse for conflicts. Suggest time(s) for a meeting to be sent as an invite to the group members
2. Start Ollama and Gemini integration
   -Frontend/UI: Settings option to alternate between Ollama, Gemini, and OpenAI integration
    - Create logic for Ollama and Gemini to handle the same tasks as OpenAI
3. Event/task tags 
    -UI design to add tags to event/tasks
    -Database to store events/tasks by tags
    -Allow users to add, edit, delete tags

Deliverables:
- Build foundation for Ollama and Gemini integration
- AI interacting with group/team events to help coordinate

#### Week 14
1. Wrap up Ollama and Gemini integration
    -Test Ollama and Gemini Integration, test task performance
2. Provide analytics on how much time is devoted to each task/event (e.g. “Over the last two weeks you spent an average of X hours in the Gym”)
    -Store data based on tasks/events tags and based on event/task names
3. The AI can analyze deadlines, task importance, and past user behavior to suggest an optimal order for completing tasks.
   -Rank task importance based on deadlines by week
    -Return to user which tasks are importance based on deadline
4. Final deployment and project wrap-up
   -Stress testing features
    -Go through each user story testing the application


Deliverables
- Finish Ollama and Gemini integration
- Testing
- Ensure smooth deployment
- Analytics

## Key Milestones
1. March 14: Project infrastructure complete with authentication and Google Calendar API implemented
2. March 28: Core calendar completed with basic AI integration
3. April 4: AI capability of editing calendar autonomously, Sprint 1 completed
4. April 11: Networking integration, groups implemented
5. April 18: AI scheduling group events, Ollama/Gemini integration
6. April 25: AI-powered analytics, suggestions, final deployment
7. April 28: Final project submission and demonstration
