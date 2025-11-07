import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Trophy, Medal, Award, Zap, Target, Crown } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

interface LeaderboardProps {
  testId?: string;
  currentUserId?: string;
}

export const Leaderboard = ({ testId, currentUserId }: LeaderboardProps) => {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', testId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { 
        p_test_id: testId || null 
      });
      
      if (error) throw error;
      
      return data || [];
    },
  });

  const { data: userRank } = useQuery({
    queryKey: ['user-rank', testId, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;

      const qualified = leaderboard || [];
      const userIndex = qualified.findIndex(r => r.user_id === currentUserId);
      
      return userIndex >= 0 ? userIndex + 1 : null;
    },
    enabled: !!currentUserId && !!leaderboard,
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Trophy className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600">🥇 Champion</Badge>;
      case 1:
        return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500">🥈 Elite</Badge>;
      case 2:
        return <Badge className="bg-gradient-to-r from-amber-600 to-amber-700">🥉 Master</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Trophy className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">
            Top performers (85%+ accuracy, 10min+ or 400+ words)
          </p>
        </div>
      </div>

      {currentUserId && userRank && (
        <Card className="mb-4 p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">#{userRank}</span>
              </div>
              <div>
                <p className="font-semibold">Your Rank</p>
                <p className="text-sm text-muted-foreground">Keep practicing to climb higher!</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
           {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((result, index) => (
              <Card
                key={result.result_id}
                className={`p-4 transition-all hover:shadow-md ${
                  result.user_id === currentUserId
                    ? 'border-primary/50 bg-primary/5'
                    : index < 3
                    ? 'border-primary/20'
                    : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(index)}
                  </div>
                  
                   <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">
                        {result.display_name || 'Anonymous'}
                      </p>
                      {getRankBadge(index)}
                      {result.user_id === currentUserId && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="font-bold text-primary">{Math.round(result.wpm)} WPM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-green-500" />
                        <span>{result.accuracy.toFixed(1)}%</span>
                      </div>
                      <div className="text-muted-foreground">
                        {result.time_taken}s | {result.total_words || 0} words
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No qualified results yet. Be the first to rank!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Requirements: 85%+ accuracy and (10+ minutes or 400+ words)
              </p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
