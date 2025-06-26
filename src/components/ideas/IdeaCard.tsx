import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageSquare, Bookmark, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface IdeaCardProps {
  idea: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    author: {
      name: string;
      avatar: string;
    };
    likes: number;
    comments: number;
    createdAt: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
  };
}

const IdeaCard = ({ idea }: IdeaCardProps) => {
  const [isLiked, setIsLiked] = useState(idea.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(idea.isBookmarked || false);
  const [likesCount, setLikesCount] = useState(typeof idea.likes === 'number' && !isNaN(idea.likes) ? idea.likes : 0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  return (
    <Card className="glass-card hover:bg-white/10 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={idea.author?.avatar || ''} alt={idea.author?.name || ''} />
              <AvatarFallback>{idea.author?.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{idea.author?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-400">{idea.createdAt}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className={`transition-colors ${isBookmarked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {idea.id ? (
          <Link to={`/idea/${idea.id}`} className="block">
            <h3 className="font-space font-semibold text-lg mb-2 group-hover:gradient-text transition-all">
              {idea.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
              {idea.description}
            </p>
          </Link>
        ) : (
          <>
            <h3 className="font-space font-semibold text-lg mb-2 group-hover:gradient-text transition-all">
              {idea.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
              {idea.description}
            </p>
          </>
        )}
        
        <div className="flex flex-wrap gap-2 mt-4">
          {idea.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center space-x-1 transition-colors ${
                isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{typeof likesCount === 'number' && !isNaN(likesCount) ? likesCount : 0}</span>
            </Button>
            
            {idea.id && (
              <Link to={`/idea/${idea.id}`}>
                <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{typeof idea.comments === 'number' && !isNaN(idea.comments) ? idea.comments : 0}</span>
                </Button>
              </Link>
            )}
          </div>

          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white transition-colors">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default IdeaCard;
