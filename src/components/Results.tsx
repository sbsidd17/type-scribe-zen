
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  BarChart3,
  Download,
  Share2,
  History,
  Keyboard,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Leaderboard } from './Leaderboard';

interface TestResults {
  wpm: number;
  grossWpm: number;
  accuracy: number;
  totalWords: number;
  typedWords: number;
  correctWords: number;
  incorrectWords: number;
  totalKeystrokes: number;
  typedKeystrokes: number;
  correctKeystrokes: number;
  keystrokeAccuracy?: number;
  errors: number;
  timeTaken: number;
  totalTime: number;
  testTitle: string;
  language: string;
  testId?: string;
  originalText?: string;
  typedText?: string;
  typedWordsArray?: string[];
  wrongWordIndices?: number[];
}

interface ResultsProps {
  results: TestResults | null;
}

const Results = ({ results }: ResultsProps) => {
  const [showAllResults, setShowAllResults] = React.useState(false);
  
  const { data: { user } = {} } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    },
  });

  // Fetch user's test history - always fetch when component mounts
  const { data: testHistory = [], isLoading, refetch } = useQuery({
    queryKey: ['test-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          typing_tests(title, language, category, difficulty)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching test history:', error);
        return [];
      }
      return data || [];
    }
  });

  const handleShowAllResults = () => {
    setShowAllResults(true);
    refetch();
  };

  if (!results && !showAllResults) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete a typing test to see your detailed results here.
          </p>
          <Button 
            variant="outline" 
            onClick={handleShowAllResults}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View All Results
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showAllResults) {
  return (
    <Tabs defaultValue="history" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="history">
          <History className="w-4 h-4 mr-2" />
          My History
        </TabsTrigger>
        <TabsTrigger value="leaderboard">
          <Trophy className="w-4 h-4 mr-2" />
          Leaderboard
        </TabsTrigger>
      </TabsList>

      <TabsContent value="history" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Test History
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={() => setShowAllResults(false)}
              disabled={!results}
            >
              Back to Latest Results
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Loading test history...</div>
              </div>
            ) : testHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <h3 className="text-lg font-semibold mb-2">No Test History</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Complete some tests to see your history here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {Math.max(...testHistory.map((t: any) => t.wpm))}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Best WPM</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {(testHistory.reduce((sum: number, t: any) => sum + t.accuracy, 0) / testHistory.length).toFixed(1)}%
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">Avg Accuracy</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {testHistory.length}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Total Tests</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4 text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {Math.round(testHistory.reduce((sum: number, t: any) => sum + t.time_taken, 0) / 60)}m
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Practice Time</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Test History Cards */}
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {testHistory.map((test: any, index: number) => {
                      const isTopPerformer = test.wpm >= Math.max(...testHistory.map((t: any) => t.wpm)) * 0.9;
                      return (
                        <Card key={test.id} className={`transition-all hover:shadow-lg ${isTopPerformer ? 'border-yellow-400 dark:border-yellow-600' : ''}`}>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-sm">
                                    #{index + 1}
                                  </div>
                                  <h4 className="font-semibold text-lg">{test.typing_tests?.title || 'Unknown Test'}</h4>
                                  {isTopPerformer && <Trophy className="h-4 w-4 text-yellow-500" />}
                                </div>
                                
                                <div className="flex gap-2 mb-3">
                                  <Badge variant="outline" className="text-xs">
                                    {test.typing_tests?.language === 'hindi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {test.typing_tests?.difficulty}
                                  </Badge>
                                  {test.typing_tests?.category && (
                                    <Badge variant="secondary" className="text-xs">
                                      {test.typing_tests?.category}
                                    </Badge>
                                  )}
                                </div>

                                 <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                                   <div className="flex items-center gap-2">
                                     <Zap className="h-4 w-4 text-blue-500" />
                                     <div>
                                       <div className="font-bold text-lg">{Math.round(test.wpm)}</div>
                                       <div className="text-xs text-gray-500">Net WPM</div>
                                     </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-2">
                                     <BarChart3 className="h-4 w-4 text-purple-500" />
                                     <div>
                                       <div className="font-bold text-lg">{Math.round(test.gross_wpm || 0)}</div>
                                       <div className="text-xs text-gray-500">Gross WPM</div>
                                     </div>
                                   </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-green-500" />
                                    <div>
                                      <div className="font-bold text-lg">{test.accuracy.toFixed(1)}%</div>
                                      <div className="text-xs text-gray-500">Accuracy</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <div>
                                      <div className="font-bold">
                                        {test.time_taken >= 60 
                                          ? `${Math.floor(test.time_taken / 60)}:${(test.time_taken % 60).toString().padStart(2, '0')}`
                                          : `${test.time_taken}s`
                                        }
                                      </div>
                                      <div className="text-xs text-gray-500">Time</div>
                                    </div>
                                  </div>
                                  
                                   <div className="flex items-center gap-2">
                                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                     <div>
                                       <div className="font-bold">{test.correct_words_count || 0}</div>
                                       <div className="text-xs text-gray-500">Correct Words</div>
                                     </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-2">
                                     <XCircle className="h-4 w-4 text-red-500" />
                                     <div>
                                       <div className="font-bold">{test.incorrect_words || 0}</div>
                                       <div className="text-xs text-gray-500">Wrong Words</div>
                                     </div>
                                   </div>
                                </div>
                              </div>

                              <div className="text-right text-sm text-gray-500">
                                <div className="font-medium">
                                  {new Date(test.completed_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs">
                                  {new Date(test.completed_at).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress bars */}
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-20">Accuracy</span>
                                <Progress value={test.accuracy} className="h-2 flex-1" />
                                <span className="text-xs font-medium w-12 text-right">{test.accuracy.toFixed(1)}%</span>
                              </div>
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-gray-500 w-20">Completion</span>
                                 <Progress 
                                   value={100} 
                                   className="h-2 flex-1" 
                                 />
                                 <span className="text-xs font-medium w-12 text-right">100%</span>
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leaderboard">
        <Leaderboard currentUserId={user?.id} />
      </TabsContent>
    </Tabs>
  );
  }

  if (!results) {
    return null;
  }

  const getPerformanceLevel = (wpm: number) => {
    if (wpm >= 80) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    if (wpm >= 60) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (wpm >= 40) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (wpm >= 20) return { level: 'Beginner', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { level: 'Novice', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
  };

  const performance = getPerformanceLevel(results.wpm);

  // Render paragraph with colored words
  const renderColoredParagraph = () => {
    if (!results.originalText) return null;
    
    const originalWords = results.originalText.split(' ');
    const wrongIndices = new Set(results.wrongWordIndices || []);
    
    return (
      <div className="flex flex-wrap gap-1 text-base leading-relaxed">
        {originalWords.map((word, index) => {
          const isWrong = wrongIndices.has(index);
          return (
            <span
              key={index}
              className={isWrong ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const errorRate = results.typedKeystrokes > 0 ? 
    Math.round((results.errors / results.typedKeystrokes) * 100) : 0;
  
  const keystrokeAccuracy = results.keystrokeAccuracy || 
    (results.typedKeystrokes > 0 ? Math.round((results.correctKeystrokes / results.typedKeystrokes) * 100) : 0);

  const shareResults = () => {
    const text = `I just completed a typing test!\n🚀 Speed: ${results.wpm} WPM\n🎯 Accuracy: ${results.accuracy}%\n⏱️ Time: ${formatTime(results.timeTaken)}\n\nTry it yourself!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Typing Test Results',
        text: text,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Results copied to clipboard!",
        description: "Share your results with friends."
      });
    }
  };

  const downloadResults = () => {
    const data = {
      testTitle: results.testTitle,
      language: results.language,
      wpm: results.wpm,
      grossWpm: results.grossWpm,
      accuracy: results.accuracy,
      keystrokeAccuracy: keystrokeAccuracy,
      timeTaken: formatTime(results.timeTaken),
      errors: results.errors,
      date: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typing-test-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Current Test Results Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Test Results
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shareResults}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={downloadResults}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Badge */}
          <div className="flex justify-center">
            <Badge className={`${performance.bg} ${performance.color} px-6 py-2 text-lg font-bold border-2`}>
              {performance.level} Typist
            </Badge>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{results.wpm}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Net WPM</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{results.grossWpm}</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Gross WPM</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <div className="text-3xl font-bold text-green-700 dark:text-green-300">{results.accuracy.toFixed(1)}%</div>
                <div className="text-sm text-green-600 dark:text-green-400">Accuracy</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatTime(results.timeTaken)}</div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Time Taken</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-xl font-bold">{results.correctWords}</div>
              <div className="text-xs text-muted-foreground">Correct Words</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <div className="text-xl font-bold">{results.incorrectWords}</div>
              <div className="text-xs text-muted-foreground">Incorrect Words</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <Keyboard className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-xl font-bold">{keystrokeAccuracy}%</div>
              <div className="text-xs text-muted-foreground">Keystroke Accuracy</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <FileText className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-xl font-bold">{results.typedWords}/{results.totalWords}</div>
              <div className="text-xs text-muted-foreground">Words Typed</div>
            </div>
          </div>

          {/* Colored Paragraph Display */}
          {results.originalText && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Test Text Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 w-full rounded-md border p-4">
                  {renderColoredParagraph()}
                </ScrollArea>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span className="text-muted-foreground">Correct words</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-muted-foreground">Wrong words</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View History Button */}
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleShowAllResults}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              View Test History & Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.testId && results.testId !== 'custom-text' && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Top Performers for this Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Leaderboard testId={results.testId} currentUserId={user?.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Results;
