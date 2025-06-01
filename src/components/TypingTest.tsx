
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Zap, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface TypingTest {
  id: string;
  title: string;
  content: string;
  language: 'english' | 'hindi';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  time_limit: number;
}

interface TestSettings {
  highlightText: boolean;
  showErrors: boolean;
  backspaceMode: 'full' | 'word' | 'disabled';
  timeLimit: number;
  language: 'english' | 'hindi';
}

interface TypingTestProps {
  settings: TestSettings;
  onComplete: (results: any) => void;
  currentTest: TypingTest | null;
}

const TypingTest = ({ settings, onComplete, currentTest }: TypingTestProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [userInput, setUserInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [errors, setErrors] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<TypingTest | null>(currentTest);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Fetch available tests
  const { data: availableTests = [] } = useQuery({
    queryKey: ['typing-tests', settings.language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('typing_tests')
        .select('*')
        .eq('language', settings.language)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TypingTest[];
    }
  });

  useEffect(() => {
    if (currentTest) {
      setSelectedTest(currentTest);
    } else if (availableTests.length > 0 && !selectedTest) {
      setSelectedTest(availableTests[0]);
    }
  }, [currentTest, availableTests, selectedTest]);

  useEffect(() => {
    if (selectedTest) {
      const testWords = selectedTest.content.split(' ');
      setWords(testWords);
      setTimeLeft(selectedTest.time_limit);
      resetTest();
    }
  }, [selectedTest]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTestComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const resetTest = () => {
    setIsActive(false);
    setIsFinished(false);
    setUserInput('');
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setErrors([]);
    setStartTime(null);
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    if (selectedTest) {
      setTimeLeft(selectedTest.time_limit);
    }
  };

  const startTest = () => {
    if (!isActive && !isFinished) {
      setIsActive(true);
      setStartTime(new Date());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    if (!isActive && value.length > 0) {
      startTest();
    }

    setTotalKeystrokes(prev => prev + 1);
    
    // Handle backspace restrictions
    if (value.length < userInput.length) {
      if (settings.backspaceMode === 'disabled') {
        return;
      } else if (settings.backspaceMode === 'word') {
        const currentWordStart = words.slice(0, currentWordIndex).join(' ').length;
        if (currentWordIndex > 0) {
          if (value.length < currentWordStart + 1) {
            return;
          }
        }
      }
    }

    setUserInput(value);
    
    // Calculate current position
    const fullText = words.join(' ');
    let charIndex = 0;
    let wordIndex = 0;
    
    for (let i = 0; i < value.length; i++) {
      if (charIndex < fullText.length) {
        if (value[i] === fullText[charIndex]) {
          setCorrectKeystrokes(prev => prev + 1);
        } else {
          setErrors(prev => [...prev, charIndex]);
        }
        charIndex++;
      }
    }
    
    // Update word index
    let tempWordIndex = 0;
    let tempCharCount = 0;
    for (let i = 0; i < words.length; i++) {
      if (tempCharCount + words[i].length >= value.length) {
        tempWordIndex = i;
        break;
      }
      tempCharCount += words[i].length + 1; // +1 for space
    }
    
    setCurrentWordIndex(tempWordIndex);
    setCurrentCharIndex(value.length);
    
    // Auto-scroll
    if (displayRef.current && textareaRef.current) {
      const lines = Math.floor(value.length / 80); // Approximate characters per line
      const scrollPosition = lines * 24; // Approximate line height
      displayRef.current.scrollTop = scrollPosition;
    }
  };

  const handleTestComplete = useCallback(async () => {
    if (isFinished) return;
    
    setIsActive(false);
    setIsFinished(true);
    
    const endTime = new Date();
    const timeTaken = startTime ? (endTime.getTime() - startTime.getTime()) / 1000 : selectedTest?.time_limit || 60;
    const fullText = words.join(' ');
    const typedText = userInput.trim();
    
    // Calculate metrics
    const totalWords = typedText.split(' ').length;
    const correctChars = typedText.split('').filter((char, index) => char === fullText[index]).length;
    const totalChars = typedText.length;
    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;
    const wpm = Math.round((correctChars / 5) / (timeTaken / 60));
    const grossWpm = Math.round((totalChars / 5) / (timeTaken / 60));
    const errorCount = totalChars - correctChars;
    
    const results = {
      wpm,
      grossWpm,
      accuracy: Math.round(accuracy * 100) / 100,
      totalWords: words.length,
      typedWords: totalWords,
      correctWords: Math.floor(correctChars / 5),
      incorrectWords: totalWords - Math.floor(correctChars / 5),
      totalKeystrokes,
      correctKeystrokes,
      errors: errorCount,
      timeTaken: Math.round(timeTaken),
      totalTime: selectedTest?.time_limit || 60,
      testTitle: selectedTest?.title || 'Unknown Test',
      language: selectedTest?.language || 'english'
    };

    // Save results to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedTest) {
        await supabase.from('test_results').insert([{
          user_id: user.id,
          test_id: selectedTest.id,
          wpm: results.wpm,
          gross_wpm: results.grossWpm,
          accuracy: results.accuracy,
          total_words: results.totalWords,
          typed_words: results.typedWords,
          correct_words: results.correctWords,
          incorrect_words: results.incorrectWords,
          total_keystrokes: results.totalKeystrokes,
          correct_keystrokes: results.correctKeystrokes,
          errors: results.errors,
          time_taken: results.timeTaken
        }]);
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }
    
    onComplete(results);
  }, [isFinished, startTime, userInput, words, totalKeystrokes, correctKeystrokes, selectedTest, onComplete]);

  const renderText = () => {
    if (!selectedTest) return null;
    
    const fullText = selectedTest.content;
    const chars = fullText.split('');
    
    return chars.map((char, index) => {
      let className = 'text-gray-500 dark:text-gray-400';
      
      if (index < userInput.length) {
        if (userInput[index] === char) {
          className = 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
        } else {
          className = settings.showErrors 
            ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' 
            : 'text-gray-700 dark:text-gray-300';
        }
      } else if (index === userInput.length && settings.highlightText && isActive) {
        className = 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100';
      }
      
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  const progress = selectedTest ? (userInput.length / selectedTest.content.length) * 100 : 0;
  const wpm = startTime && userInput.length > 0 ? 
    Math.round(((userInput.length / 5) / ((Date.now() - startTime.getTime()) / 1000 / 60))) : 0;

  if (!selectedTest) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            {availableTests.length === 0 ? 'No tests available for this language' : 'Loading test...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Selection */}
      {!currentTest && availableTests.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTests.map((test) => (
                <div 
                  key={test.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTest?.id === test.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedTest(test)}
                >
                  <h3 className="font-semibold">{test.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{test.difficulty}</Badge>
                    <Badge variant="outline">{test.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {test.time_limit}s • {test.content.split(' ').length} words
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{timeLeft}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">seconds</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{wpm}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">WPM</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{errors.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Test Text Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {selectedTest.title}
              <Badge>{selectedTest.language === 'hindi' ? 'हिंदी' : 'English'}</Badge>
              <Badge variant="outline">{selectedTest.difficulty}</Badge>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetTest}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text Display */}
          <div 
            ref={displayRef}
            className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg h-32 overflow-y-auto text-lg leading-relaxed ${
              selectedTest.language === 'hindi' ? 'font-mangal' : 'font-mono'
            }`}
            style={selectedTest.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
          >
            {renderText()}
          </div>

          {/* Typing Area */}
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInputChange}
              disabled={isFinished}
              placeholder={isActive ? "Start typing..." : "Click here and start typing to begin the test"}
              className={`w-full h-32 p-4 border rounded-lg resize-none text-lg ${
                selectedTest.language === 'hindi' ? 'font-mangal' : 'font-mono'
              } ${isFinished ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              style={selectedTest.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
            />
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {userInput.length} / {selectedTest.content.length} characters
              </div>
              
              {isActive && (
                <Button onClick={handleTestComplete} variant="outline">
                  Submit Test
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TypingTest;
