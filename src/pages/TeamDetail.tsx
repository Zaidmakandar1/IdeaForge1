import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/config/api';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get(`/teams/${id}`);
        setTeam(res.data);
      } catch (err) {
        setError('Team not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!team) return <div className="p-8 text-center">Team not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl font-space font-bold gradient-text">
              {team.name}
            </CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-gray-400 text-sm">
                Created by: {team.creator?.name || 'Unknown'}
              </span>
              <span className="text-gray-400 text-sm">
                on {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4 leading-relaxed">{team.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {team.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                  #{tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-gray-400 text-sm">
                {team.members?.length || 0} members
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              {team.members?.map((member, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.avatar || '/default-avatar.png'} alt={member.user?.name || 'User'} />
                    <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-gray-300 text-sm">{member.user?.name || 'User'}</span>
                  <span className="text-xs text-gray-400">{member.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDetail; 