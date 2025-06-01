
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  BarChart3,
  Download,
  Share2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TestResults {
  wpm: number;
  grossWpm: number;
  accuracy: number;
  totalWords: number;
  typedWords: number;
  correctWords: number;
  incorrectWords: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errors: number;
  timeTaken: number;
  totalTime: number;
  testTitle: string;
  language: string;
}

interface ResultsProps {
  results: TestResults | null;
}

const Results = ({ results }: ResultsProps) => {
  if (!results) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Complete a typing test to see your detailed results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceLevel = (wpm: number) => {
    if (wpm >= 80) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    if (wpm >= 60) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (wpm >= 40) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (wpm >= 20) return { level: 'Beginner', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { level: 'Novice', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' };
  };

  const performance = getPerformanceLevel(results.wpm);

  const shareResults = () => {
    const text = `I just completed a typing test!\n🚀 Speed: ${results.wpm} WPM\n🎯 Accuracy: ${results.accuracy}%\n⏱️ Time: ${results.timeTaken}s\n\nTry it yourself!`;
    
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
      accuracy: results.accuracy,
      timeTaken: results.timeTaken,
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
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Test Completed!</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline">{results.testTitle}</Badge>
            <Badge>{results.language === 'hindi' ? 'हिंदी' : 'English'}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${performance.bg} ${performance.color} mb-3`}>
              {performance.level}
            </div>
            <div className="text-3xl font-bold mb-1">{results.wpm}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Zap className="h-4 w-4" />
              Words Per Minute
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold mb-1 text-green-600">{results.accuracy}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Target className="h-4 w-4" />
              Accuracy
            </div>
            <Progress value={results.accuracy} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold mb-1">{results.timeTaken}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              Time Taken
            </div>
            <div className="text-xs text-gray-500 mt-1">
              out of {results.totalTime}s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold mb-1">{results.grossWpm}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Gross WPM
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Words Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Words Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Words in Test</span>
              <span className="font-semibold">{results.totalWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Words Typed</span>
              <span className="font-semibold">{results.typedWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600 dark:text-green-400">Correct Words</span>
              <span className="font-semibold text-green-600">{results.correctWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600 dark:text-red-400">Incorrect Words</span>
              <span className="font-semibold text-red-600">{results.incorrectWords}</span>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span>{Math.round((results.typedWords / results.totalWords) * 100)}%</span>
              </div>
              <Progress value={(results.typedWords / results.totalWords) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Keystroke Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-blue-500" />
              Keystroke Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Keystrokes</span>
              <span className="font-semibold">{results.totalKeystrokes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-600 dark:text-green-400">Correct Keystrokes</span>
              <span className="font-semibold text-green-600">{results.correctKeystrokes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600 dark:text-red-400">Errors</span>
              <span className="font-semibold text-red-600">{results.errors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Error Rate</span>
              <span className="font-semibold">
                {results.totalKeystrokes > 0 ? 
                  Math.round((results.errors / results.totalKeystrokes) * 100) : 0}%
              </span>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Keystroke Accuracy</span>
                <span>
                  {results.totalKeystrokes > 0 ? 
                    Math.round((results.correctKeystrokes / results.totalKeystrokes) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={results.totalKeystrokes > 0 ? 
                  (results.correctKeystrokes / results.totalKeystrokes) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Speed Analysis</h4>
              <ul className="space-y-1 text-sm">
                {results.wpm >= 40 && (
                  <li className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Good typing speed achieved!
                  </li>
                )}
                {results.wpm < 40 && (
                  <li className="flex items-center gap-2 text-yellow-600">
                    <Target className="h-4 w-4" />
                    Practice more to improve speed
                  </li>
                )}
                {results.accuracy >= 95 && (
                  <li className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Excellent accuracy!
                  </li>
                )}
                {results.accuracy < 95 && (
                  <li className="flex items-center gap-2 text-yellow-600">
                    <Target className="h-4 w-4" />
                    Focus on accuracy improvement
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Recommendations</h4>
              <ul className="space-y-1 text-sm">
                {results.errors > 10 && (
                  <li className="text-gray-600 dark:text-gray-400">
                    • Practice with error highlighting enabled
                  </li>
                )}
                {results.wpm < 30 && (
                  <li className="text-gray-600 dark:text-gray-400">
                    • Focus on finger placement and posture
                  </li>
                )}
                <li className="text-gray-600 dark:text-gray-400">
                  • Regular practice improves muscle memory
                </li>
                <li className="text-gray-600 dark:text-gray-400">
                  • Try different difficulty levels
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={shareResults} className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Results
            </Button>
            <Button variant="outline" onClick={downloadResults} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Results
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Take Another Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;
