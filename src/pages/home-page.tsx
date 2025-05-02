import { SignInButton, UserButton } from "@clerk/clerk-react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import Calendar from "@/components/Calendar";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, MessageSquare, Users, Brain, Clock, CheckCircle } from "lucide-react";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";

const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const { isLoading, isAuthenticated} = useStoreUserEffect();

  const features = [
    {
      icon: <CalendarIcon className="w-6 h-6" />,
      title: "Smart Calendar Integration",
      description: "Seamlessly connect with Google Calendar and manage your schedule efficiently"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "AI-Powered Chat",
      description: "Natural language interface to create, edit, and manage your events"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Coordination",
      description: "Schedule group meetings and coordinate with team members effortlessly"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Intelligent Scheduling",
      description: "AI analyzes your preferences and optimizes your schedule automatically"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Conflict Resolution",
      description: "Smart handling of schedule conflicts with intelligent rescheduling"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Task Management",
      description: "Prioritize and organize tasks with AI-powered suggestions"
    }
  ];

  return (
    <div className="min-h-svh bg-gradient-to-b from-gray-50 to-white">
      {/* <Authenticated>
        {/* <PostSignInSync /> */}
        {/* <div className="w-full max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => navigate("chats")} className="bg-blue-600 hover:bg-blue-700">
              Open Chat Interface
            </Button>
            <UserButton />
          </div>
          <div className="h-[800px]">
            <Calendar />
          </div>
        </div>
      </Authenticated> */} 

      {isLoading ? (
        <>Loading...</>
      ): !isAuthenticated ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center py-20"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Your AI-Powered Calendar Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your schedule with intelligent scheduling, team coordination, and AI-powered task management.
            </p>
            <SignInButton mode="modal">
              <Button className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                Get Started
              </Button>
            </SignInButton>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center py-16"
          >
          </motion.div>
        </div>

      ) : (
        <div className="w-full max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => navigate("chats")} className="bg-blue-600 hover:bg-blue-700">
              Open Chat Interface
            </Button>
            <UserButton />
          </div>
          <div className="h-[800px]">
            <Calendar />
          </div>
        </div>
      )}

      {/* <Unauthenticated>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> */}
          {/* Hero Section */}
          {/* <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center py-20"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Your AI-Powered Calendar Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your schedule with intelligent scheduling, team coordination, and AI-powered task management.
            </p>
            <SignInButton mode="modal">
              <Button className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                Get Started
              </Button>
            </SignInButton>
          </motion.div> */}

          {/* Features Grid */}
          {/* <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div> */}

          {/* CTA Section */}
          {/* <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center py-16"
          >
          </motion.div>
        </div>
      </Unauthenticated> */}
    </div>
  );
}

export default HomePage;