
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Trophy, TrendingUp, Clock, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
}

const UserProfile = ({ user, onSignOut }: UserProfileProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch user's test results
  const { data: results = [] } = useQuery({
    queryKey: ['user-results', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          typing_tests (title, language, difficulty)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account."
      });
      onSignOut();
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Calculate statistics
  const totalTests = results.length;
  const averageWPM = totalTests > 0 ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / totalTests) : 0;
  const averageAccuracy = totalTests > 0 ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests) : 0;
  const bestWPM = totalTests > 0 ? Math.max(...results.map(r => r.wpm)) : 0;
  const totalTimeSpent = results.reduce((sum, r) => sum + r.time_taken, 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile?.full_name || 'User'}</h2>
                <p className="text-gray-600 dark:text-gray-400">{profile?.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={profile?.role === 'admin' ? 'default' : 'outline'}>
                    {profile?.role || 'user'}
                  </Badge>
                  {totalTests > 0 && (
                    <Badge variant="outline">
                      {totalTests} test{totalTests !== 1 ? 's' : ''} completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {totalTests > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{bestWPM}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Best WPM</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{averageWPM}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average WPM</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{averageAccuracy}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Accuracy</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}m</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Practice Time</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Tests Completed Yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Take your first typing test to see your results here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.slice(0, 5).map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{result.typing_tests?.title || 'Unknown Test'}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">
                        {result.typing_tests?.language === 'hindi' ? 'हिंदी' : 'English'}
                      </Badge>
                      <Badge variant="outline">{result.typing_tests?.difficulty}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{result.wpm} WPM</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.accuracy}% accuracy
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {results.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Results ({results.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
