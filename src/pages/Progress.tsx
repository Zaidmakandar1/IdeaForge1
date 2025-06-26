import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { getProfile, getUserStats, getIdeas } from '@/services/api';
import Navigation from '@/components/layout/Navigation';

const Progress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myIdeas, setMyIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    Promise.all([
      getProfile(),
      getUserStats(),
      getIdeas()
    ])
      .then(([profileRes, statsRes, ideasRes]) => {
        setMyIdeas((ideasRes.data || []).filter(i => {
          if (typeof i.owner === 'object' && i.owner !== null) {
            return i.owner._id === profileRes.data._id;
          }
          return i.owner === profileRes.data._id;
        }));
      })
      .catch(() => setError('Failed to load progress'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const totalIdeas = myIdeas.length;
  const completedIdeas = myIdeas.filter(i => i.progress === 100).length;
  const inProgressIdeas = myIdeas.filter(i => i.progress > 0 && i.progress < 100).length;
  const progressData = myIdeas.map((idea, idx) => ({
    x: idx + 1,
    y: idea.progress || 0,
    z: 50,
    name: idea.title,
  }));

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-900/40 to-green-800/10 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-green-400 text-lg font-bold">Total Ideas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-300">{totalIdeas}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/10 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 text-lg font-bold">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-300">{completedIdeas}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/10 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-yellow-400 text-lg font-bold">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-300">{inProgressIdeas}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/10 border-0 shadow-lg flex flex-col items-center justify-center">
              <CardHeader>
                <CardTitle className="text-purple-400 text-lg font-bold">Progress</CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          </div>
          <Card className="mb-8 bg-gradient-to-br from-gray-900/40 to-gray-800/10 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-purple-400 text-lg font-bold">Idea Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis type="number" dataKey="x" name="Idea" tick={false} />
                    <YAxis type="number" dataKey="y" name="Progress" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, props) => name === 'y' ? `${value}%` : value} labelFormatter={(_, payload) => payload && payload[0] && payload[0].payload.name} />
                    <Scatter name="Progress" data={progressData} fill="#a78bfa" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-gray-400 mt-2">Each bubble represents an idea. Y-axis shows progress (%)</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Progress; 