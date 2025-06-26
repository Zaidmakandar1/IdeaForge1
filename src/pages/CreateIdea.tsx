import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Zap, FileText, Plus, X, Sparkles } from 'lucide-react';
import { createIdea } from '@/services/api';
import axios from 'axios';

const CreateIdea = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual idea form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI generation state
  const [prompt, setPrompt] = useState('');
  const [aiIdeas, setAiIdeas] = useState<{ title: string; description: string; tags: string[] }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const submitIdea = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and description for your idea.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createIdea({
        title,
        description,
        tags,
        category: "General"
      });
      toast({
        title: "Idea Created!",
        description: "Your idea has been posted to the community.",
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create idea. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Generation
  const generateAIIdea = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setAiIdeas([]);
    setSelectedIdea(null);
    try {
      const res = await axios.post('/api/ai/generate-idea', { prompt });
      setAiIdeas(res.data.ideas || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate ideas with AI.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Only show ideas that have a title and description
  const filteredAIIdeas = aiIdeas.filter(idea => idea.title && idea.description).slice(0, 7);

  const useAIIdea = (idea: { title: string; description: string; tags: string[] }) => {
    setTitle(idea.title);
    setDescription(idea.description);
    setTags(idea.tags);
    setActiveTab('manual');
  };

  const promptSuggestions = [
    "💡 Business idea for students",
    "🚀 Startup in AI",
    "🌍 Sustainable technology",
    "🎨 Creative platform",
    "🏥 Healthcare innovation",
    "📚 Educational tool"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-space font-bold gradient-text mb-4">
              Create Your Next Big Idea
            </h1>
            <p className="text-gray-300 text-lg">
              Share your innovation with the world or let AI help you brainstorm something amazing.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass bg-white/5">
              <TabsTrigger value="manual" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Manual Entry</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Generate with AI</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Create Your Idea</span>
                  </CardTitle>
                  <CardDescription>
                    Share your innovative concept with the IdeaForge community.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Idea Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter a compelling title for your idea..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="glass border-white/20 focus:border-white/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your idea in detail. What problem does it solve? How does it work? What makes it unique?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                      className="glass border-white/20 focus:border-white/40 resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Tags</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        className="glass border-white/20 focus:border-white/40"
                      />
                      <Button onClick={addTag} variant="outline" className="glass border-white/20">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-white/10 text-white border-white/20 flex items-center space-x-1"
                        >
                          <span>#{tag}</span>
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:bg-white/20 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Add up to 10 tags to help others discover your idea.
                    </p>
                  </div>

                  <Button
                    onClick={submitIdea}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Idea'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ai" className="mt-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>AI Idea Generator</span>
                  </CardTitle>
                  <CardDescription>
                    Describe what kind of idea you're looking for and let our AI help you brainstorm.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="prompt">Describe your idea concept</Label>
                    <Textarea
                      id="prompt"
                      placeholder="E.g., 'I want to create an app that helps college students manage their finances' or 'I'm looking for a sustainable business idea for my local community'"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="glass border-white/20 focus:border-white/40 resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Quick Suggestions</Label>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => setPrompt(suggestion)}
                          className="glass border-white/20 hover:bg-white/10 text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={generateAIIdea}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>Generate Idea</span>
                      </div>
                    )}
                  </Button>
                  {filteredAIIdeas.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold gradient-text">AI Generated Ideas</h3>
                      <ul className="space-y-2">
                        {filteredAIIdeas.map((idea, idx) => (
                          <li key={idx} className="bg-white/5 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="mb-2 md:mb-0">
                              <span className="text-gray-200 font-bold block">{idea.title}</span>
                              {idea.description && <span className="text-gray-300 block mt-1">{idea.description}</span>}
                              {idea.tags && idea.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {idea.tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="bg-white/10 text-white border-white/20">#{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button size="sm" onClick={() => useAIIdea(idea)} className="ml-0 md:ml-4 mt-2 md:mt-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                              Use This Idea
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CreateIdea;
