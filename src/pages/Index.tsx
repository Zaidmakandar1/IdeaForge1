import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navigation from '@/components/layout/Navigation';
import { ArrowDown, CheckCircle, Users, Lightbulb, MessageSquare, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, isLoading } = useAuth();
  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const features = [
    {
      icon: <Zap className="h-8 w-8" />,
      title: "AI-Powered Idea Generation",
      description: "Generate innovative ideas instantly with our advanced AI assistant that understands your vision."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Collaboration",
      description: "Form teams, share ideas, and collaborate in real-time with built-in chat and project management."
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Community Engagement",
      description: "Join communities, discover trending ideas, and connect with like-minded innovators worldwide."
    },
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: "Smart Idea Curation",
      description: "Our intelligent system helps you discover relevant ideas and connects you with potential collaborators."
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Generate or Create",
      description: "Use our AI to generate ideas or manually create your own innovative concepts"
    },
    {
      step: "02",
      title: "Share & Collaborate",
      description: "Post your ideas to the community and start building your team"
    },
    {
      step: "03",
      title: "Build Together",
      description: "Work with your team in real-time using our collaborative tools and chat system"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-teal-500/20" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-space font-bold mb-6 leading-tight">
              <span className="gradient-text">Forge Ideas</span>
              <br />
              <span className="text-white">Build the Future</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              The ultimate collaborative platform where AI meets human creativity. 
              Generate ideas, form teams, and bring innovations to life together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 animate-glow"
                >
                  Generate Your First Idea
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-4 glass border-white/20 hover:bg-white/10"
                >
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowDown className="h-6 w-6 text-gray-400" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-space font-bold mb-6 gradient-text">
              Powerful Features for Innovation
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to turn ideas into reality, from AI generation to team collaboration.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card hover:bg-white/10 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-4 group-hover:scale-110 transition-transform">
                    <div className="text-indigo-400">{feature.icon}</div>
                  </div>
                  <h3 className="font-space font-semibold text-xl mb-3">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-teal-500/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-space font-bold mb-6 gradient-text">
              How IdeaForge Works
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From idea to execution in three simple steps. Join thousands of innovators already building the future.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl mb-6">
                  {step.step}
                </div>
                <h3 className="font-space font-semibold text-xl mb-3">{step.title}</h3>
                <p className="text-gray-300 leading-relaxed">{step.description}</p>
                
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 transform -translate-x-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="glass-card p-8 md:p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-space font-bold mb-6 gradient-text">
              Ready to Start Building?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of innovators, entrepreneurs, and creators who are already using IdeaForge to bring their ideas to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  Start Free Today
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-4 glass border-white/20 hover:bg-white/10"
                >
                  Explore Ideas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; 2024 IdeaForge. All rights reserved. Built for innovators, by innovators.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
