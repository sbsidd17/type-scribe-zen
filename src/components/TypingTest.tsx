import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Clock, Target, Zap, XCircle, RotateCcw, Settings, Keyboard, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import CustomTextTest from './CustomTextTest';

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
  const [wrongWords, setWrongWords] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [typedKeystrokes, setTypedKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<TypingTest | null>(currentTest);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categorizedTests, setCategorizedTests] = useState<Record<string, TypingTest[]>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [testSettings, setTestSettings] = useState(settings);
  const [showCustomTextOption, setShowCustomTextOption] = useState(false);
  const [customTextMode, setCustomTextMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);

  // Fetch available tests and organize by category
  const { data: availableTests = [] } = useQuery({
    queryKey: ['typing-tests', selectedLanguage],
    queryFn: async () => {
      if (!selectedLanguage) return [];
      const { data, error } = await supabase
        .from('typing_tests')
        .select('*')
        .eq('language', selectedLanguage)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TypingTest[];
    },
    enabled: !!selectedLanguage
  });

  // Organize tests by category
  useEffect(() => {
    if (availableTests.length > 0) {
      const grouped = availableTests.reduce((acc, test) => {
        if (!acc[test.category]) {
          acc[test.category] = [];
        }
        acc[test.category].push(test);
        return acc;
      }, {} as Record<string, TypingTest[]>);
      
      setCategorizedTests(grouped);
    }
  }, [availableTests]);

  useEffect(() => {
    if (currentTest) {
      setSelectedTest(currentTest);
    }
  }, [currentTest]);

  useEffect(() => {
    if (selectedTest) {
      const testWords = selectedTest.content.split(' ');
      setWords(testWords);
      // time_limit is already in seconds from database
      setTimeLeft(selectedTest.time_limit);
      // Calculate total keystrokes from test content (all characters including spaces)
      const totalChars = selectedTest.content.length;
      setTotalKeystrokes(totalChars);
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

  // Auto-scroll to current word (vertical scrolling only)
  useEffect(() => {
    if (currentWordRef.current && displayRef.current && isActive) {
      const wordElement = currentWordRef.current;
      const containerElement = displayRef.current;
      
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      
      // Only calculate vertical scrolling
      if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
        // Scroll to keep the current word visible in the middle of the container
        wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentWordIndex, isActive]);

  const resetTest = () => {
    setIsActive(false);
    setIsFinished(false);
    setUserInput('');
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setWrongWords(new Set());
    setStartTime(null);
    setTypedKeystrokes(0);
    setCorrectKeystrokes(0);
    setShowSettings(true);
    if (selectedTest) {
      // time_limit is already in seconds from database
      setTimeLeft(selectedTest.time_limit);
      // Recalculate total keystrokes from test content
      const totalChars = selectedTest.content.length;
      setTotalKeystrokes(totalChars);
    }
  };

  const startTest = () => {
    if (!isActive && !isFinished) {
      setIsActive(true);
      setStartTime(new Date());
      setShowSettings(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Block problematic keyboard shortcuts during test
    if (isActive || isFinished) {
      // Block Ctrl/Cmd + C, V, X, A, U, R, F, etc.
      if ((e.ctrlKey || e.metaKey) && (
        e.key === 'c' || e.key === 'v' || e.key === 'x' || 
        e.key === 'a' || e.key === 'u' || e.key === 'r' || 
        e.key === 'f' || e.key === 's' || e.key === 'p' ||
        e.key === 'z' || e.key === 'y'
      )) {
        e.preventDefault();
        return;
      }
      
      // Block F5 refresh
      if (e.key === 'F5') {
        e.preventDefault();
        return;
      }
    }
    
    if (!isActive && e.key !== 'Tab') {
      startTest();
    }
    
    // Only count typed keystrokes, totalKeystrokes is calculated from test content
    setTypedKeystrokes(prev => prev + 1);

    if (e.key === ' ') {
      e.preventDefault();
      
      const currentTypedWords = userInput.trim().split(' ');
      const expectedWord = words[currentWordIndex];
      const typedWord = currentTypedWords[currentWordIndex] || '';
      
      if (typedWord !== expectedWord) {
        setWrongWords(prev => new Set([...prev, currentWordIndex]));
      } else {
        setCorrectKeystrokes(prev => prev + typedWord.length + 1); // +1 for space
      }
      
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setUserInput(prev => prev + ' ');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Handle Hindi special characters input (including Alt key combinations)
    if (selectedTest?.language === 'hindi' && e.nativeEvent instanceof InputEvent) {
      // Allow all input methods including IME and Alt key combinations
      // This ensures special Hindi characters work properly
    }
    
    if (value.includes(' ') && !userInput.includes(' ')) {
      return;
    }
    
    if (!isActive && value.length > 0) {
      startTest();
    }

    // Handle backspace restrictions - check before processing
    if (value.length < userInput.length) {
      if (testSettings.backspaceMode === 'disabled') {
        return;
      } else if (testSettings.backspaceMode === 'word') {
        // Allow deletion only within the current word
        const currentWordStart = userInput.lastIndexOf(' ') + 1;
        if (value.length < currentWordStart) {
          return;
        }
      }
    }

    setUserInput(value);
    
    const typedWords = value.split(' ');
    const currentTypedWord = typedWords[currentWordIndex] || '';
    const expectedWord = words[currentWordIndex] || '';
    
    let correctCount = 0;
    const newWrongWords = new Set<number>();
    
    for (let i = 0; i < Math.min(currentTypedWord.length, expectedWord.length); i++) {
      if (currentTypedWord[i] === expectedWord[i]) {
        correctCount++;
      }
    }
    
    for (let i = 0; i < currentWordIndex; i++) {
      const typedWord = typedWords[i] || '';
      const expectedWordAtIndex = words[i] || '';
      
      if (typedWord === expectedWordAtIndex) {
        correctCount += typedWord.length + 1; // +1 for space
      } else {
        newWrongWords.add(i);
      }
    }
    
    if (currentTypedWord.length > 0 && currentTypedWord !== expectedWord.substring(0, currentTypedWord.length)) {
      newWrongWords.add(currentWordIndex);
    }
    
    setCorrectKeystrokes(correctCount);
    setWrongWords(newWrongWords);
    
    if (currentWordIndex >= words.length - 1 && currentTypedWord === expectedWord) {
      handleTestComplete();
    }
  };

  const handleTestComplete = useCallback(async () => {
    if (isFinished) return;
    
    setIsActive(false);
    setIsFinished(true);
    
    const endTime = new Date();
    // time_limit is already in seconds
    const timeTaken = startTime ? (endTime.getTime() - startTime.getTime()) / 1000 : selectedTest?.time_limit || 60;
    
    const typedWords = userInput.trim().split(' ').filter(word => word.length > 0);
    const totalTypedChars = typedWords.join('').length;
    const correctWords = typedWords.filter((word, index) => word === words[index]).length;
    const incorrectWords = typedWords.length - correctWords;
    
    // Calculate accuracy based on actual keystrokes (character-level accuracy)
    const accuracy = typedKeystrokes > 0 ? (correctWords / typedWords.length) * 100 : 0;
    
    const wpm = Math.round((correctWords) / (timeTaken / 60));
    const grossWpm = Math.round((typedWords.length) / (timeTaken / 60));
    
    const keystrokeAccuracy = typedKeystrokes > 0 ? (correctKeystrokes / typedKeystrokes) * 100 : 0;
    
    // Calculate wrong keystrokes
    const wrongKeystrokes = typedKeystrokes - correctKeystrokes;

    const results = {
      wpm,
      grossWpm,
      accuracy: Math.round(accuracy * 100) / 100,
      totalWords: words.length,
      typedWords: typedWords.length,
      correctWords,
      incorrectWords,
      totalKeystrokes,
      typedKeystrokes,
      correctKeystrokes,
      keystrokeAccuracy: Math.round(keystrokeAccuracy * 100) / 100,
      errors: wrongWords.size,
      timeTaken: Math.round(timeTaken),
      totalTime: selectedTest?.time_limit || 60,
      testTitle: selectedTest?.title || 'Unknown Test',
      language: selectedTest?.language || 'english',
      testId: selectedTest?.id,
      originalText: words.join(' '),
      typedText: userInput,
      wrongWordIndices: Array.from(wrongWords)
    };
    // Check if qualifies for leaderboard (85%+ accuracy AND 10min+ OR 400+ words)
    const qualifiesForLeaderboard = keystrokeAccuracy >= 85 && (timeTaken >= 600 || typedWords.length >= 400);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedTest && selectedTest.id !== 'custom-text') {
        const { error: insertError } = await supabase.from('test_results').insert([{
          user_id: user.id,
          test_id: selectedTest.id,
          wpm: results.wpm,
          gross_wpm: results.grossWpm,
          accuracy: results.accuracy,
          total_words: results.totalWords,
          typed_words: results.typedWords,
          correct_words_count: results.correctWords,
          incorrect_words: results.incorrectWords,
          total_keystrokes: results.totalKeystrokes,
          correct_keystrokes: results.correctKeystrokes,
          wrong_keystrokes: wrongKeystrokes,
          errors: results.errors,
          time_taken: results.timeTaken
        }]);
        
        if (insertError) {
          console.error('Error saving results:', insertError);
          toast({
            title: "Error saving results",
            description: "Your results couldn't be saved. Please try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Results saved!",
            description: qualifiesForLeaderboard 
              ? "🎉 You qualified for the leaderboard!" 
              : "Test results saved successfully!",
          });
          
          if (qualifiesForLeaderboard) {
            setCurrentTestId(selectedTest.id);
            setShowLeaderboard(true);
          }
        }
      } else if (selectedTest?.id === 'custom-text') {
        toast({
          title: "Custom text completed!",
          description: "Custom text results are not saved to history.",
        });
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }
    
    onComplete(results);
  }, [isFinished, startTime, userInput, words, totalKeystrokes, typedKeystrokes, correctKeystrokes, selectedTest, onComplete, wrongWords, currentWordIndex]);

  const renderText = () => {
    if (!selectedTest) return null;
    
    return words.map((word, wordIndex) => {
      const typedWords = userInput.split(' ');
      const typedWord = typedWords[wordIndex] || '';
      
      let wordClassName = 'inline-block mr-2 mb-1 px-1 py-0.5 rounded ';
      
      if (wordIndex < currentWordIndex) {
        if (testSettings.showErrors) {
          if (typedWord === word) {
            wordClassName += 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
          } else {
            wordClassName += 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
          }
        } else {
          wordClassName += 'text-gray-900 dark:text-gray-100';
        }
      } else if (wordIndex === currentWordIndex) {
        if (testSettings.highlightText && isActive) {
          wordClassName += 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 border-2 border-blue-400';
        } else {
          wordClassName += 'text-gray-900 dark:text-gray-100';
        }
      } else {
        wordClassName += 'text-gray-500 dark:text-gray-400';
      }
      
      return (
        <span 
          key={wordIndex} 
          className={wordClassName}
          ref={wordIndex === currentWordIndex ? currentWordRef : null}
        >
          {word}
        </span>
      );
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const progress = selectedTest ? ((currentWordIndex + (userInput.split(' ')[currentWordIndex]?.length || 0) / (words[currentWordIndex]?.length || 1)) / words.length) * 100 : 0;
  const wpm = startTime && correctKeystrokes > 0 ? 
    Math.round(((correctKeystrokes / 5) / ((Date.now() - startTime.getTime()) / 1000 / 60))) : 0;

  // Custom Text Mode
  if (customTextMode) {
    return (
      <CustomTextTest 
        onStartTest={(customTest) => {
          const customTypingTest: TypingTest = {
            id: 'custom-text',
            title: 'Custom Text Practice',
            content: customTest.content,
            language: 'english',
            difficulty: 'medium',
            category: 'Custom',
            time_limit: customTest.time_limit
          };
          setSelectedTest(customTypingTest);
          setCustomTextMode(false);
        }}
        onBack={() => setCustomTextMode(false)}
      />
    );
  }

  // Language Selection Step  
  if (!selectedLanguage && !currentTest) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">Choose Your Language</CardTitle>
          <p className="text-muted-foreground mt-2">Select your preferred typing language or use custom text</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Custom Text Option */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary mb-4"
            onClick={() => setCustomTextMode(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">Custom Text</h3>
                  <p className="text-sm text-muted-foreground">Practice with your own text</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or choose a language</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary"
              onClick={() => setSelectedLanguage('english')}
            >
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🇬🇧</div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">English</h3>
                <p className="text-muted-foreground">Type in English language</p>
              </CardContent>
            </Card>
            <Card 
              className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary"
              onClick={() => setSelectedLanguage('hindi')}
            >
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🇮🇳</div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">हिंदी</h3>
                <p className="text-muted-foreground">हिंदी में टाइप करें</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter tests by selected language
  const languageFilteredTests = availableTests?.filter(
    test => test.language === selectedLanguage
  ) || [];

  // Get categories for selected language
  const availableCategories = Array.from(
    new Set(languageFilteredTests.map(test => test.category))
  ).filter(Boolean);

  // Category Selection Step
  if (selectedLanguage && !selectedCategory && !currentTest) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">
            {selectedLanguage === 'hindi' ? 'श्रेणी चुनें' : 'Choose Category'}
          </CardTitle>
          <p className="text-muted-foreground mt-2">Select a test category</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedLanguage === 'hindi' ? '🇮🇳' : '🇬🇧'}</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedLanguage === 'hindi' ? 'हिंदी' : 'English'}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedLanguage(null);
                setSelectedCategory('');
                setSelectedTest(null);
              }}
            >
              ← Change Language
            </Button>
          </div>
          
          {availableCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No categories available for this language</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCategories.map(category => {
                const testsCount = languageFilteredTests.filter(t => t.category === category).length;
                return (
                  <Card 
                    key={category}
                    className="group cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300 border-2 hover:border-primary"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <CardContent className="p-6 text-center">
                      <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">{category}</h3>
                      <Badge variant="outline" className="text-sm">
                        {testsCount} {testsCount === 1 ? 'test' : 'tests'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Test Selection Step
  const categoryTests = languageFilteredTests.filter(
    test => test.category === selectedCategory
  );

  if (selectedLanguage && selectedCategory && !selectedTest) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">
            {selectedLanguage === 'hindi' ? 'टेस्ट चुनें' : 'Choose Your Test'}
          </CardTitle>
          <p className="text-muted-foreground mt-2">Select a typing test to begin</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-2xl">{selectedLanguage === 'hindi' ? '🇮🇳' : '🇬🇧'}</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedLanguage === 'hindi' ? 'हिंदी' : 'English'}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="text-base px-3 py-1">{selectedCategory}</Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedCategory('');
                setSelectedTest(null);
              }}
            >
              ← Change Category
            </Button>
          </div>
          
          {categoryTests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No tests available in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryTests.map((test) => (
                <Card 
                  key={test.id} 
                  className="group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-2 hover:border-primary"
                  onClick={() => setSelectedTest(test)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{test.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {test.content.substring(0, 180)}...
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="capitalize">{test.difficulty}</Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(test.time_limit / 60)}:{(test.time_limit % 60).toString().padStart(2, '0')}
                          </Badge>
                          <Badge variant="outline">
                            {test.content.split(' ').length} words
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Panel - Show before test starts */}
      {showSettings && !isActive && !isFinished && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Configure Your Test</CardTitle>
            <p className="text-muted-foreground mt-2">Customize your typing experience</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLanguage(null);
                    setSelectedCategory('');
                    setSelectedTest(null);
                  }}
                  className="flex items-center gap-1 h-8"
                >
                  <span className="text-xl">{selectedLanguage === 'hindi' ? '🇮🇳' : '🇬🇧'}</span>
                  <Badge variant="secondary" className="text-sm px-2 py-1">
                    {selectedLanguage === 'hindi' ? 'हिंदी' : 'English'}
                  </Badge>
                </Button>
                <span className="text-muted-foreground">→</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedTest(null);
                  }}
                  className="h-8"
                >
                  <Badge variant="secondary" className="text-sm px-2 py-1">{selectedCategory}</Badge>
                </Button>
                <span className="text-muted-foreground">→</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTest(null);
                  }}
                  className="h-8"
                >
                  <Badge variant="secondary" className="text-sm px-2 py-1">{selectedTest.title}</Badge>
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedTest(null);
                }}
              >
                ← Change Test
              </Button>
            </div>

            {/* Display Settings */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                  <Settings className="h-5 w-5" />
                  Display Settings
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <Label htmlFor="highlight-text" className="font-medium cursor-pointer">
                        Highlight Current Text
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">Highlight the word you're typing</p>
                    </div>
                    <Switch
                      id="highlight-text"
                      checked={testSettings.highlightText}
                      onCheckedChange={(checked) => 
                        setTestSettings({...testSettings, highlightText: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <Label htmlFor="show-errors" className="font-medium cursor-pointer">
                        Show Typing Errors
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">Display mistakes in real-time</p>
                    </div>
                    <Switch
                      id="show-errors"
                      checked={testSettings.showErrors}
                      onCheckedChange={(checked) => 
                        setTestSettings({...testSettings, showErrors: checked})
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Input Settings */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                  <Keyboard className="h-5 w-5" />
                  Input Settings
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="backspace-mode" className="font-medium">
                    Backspace Behavior
                  </Label>
                  <Select
                    value={testSettings.backspaceMode}
                    onValueChange={(value: 'full' | 'word' | 'disabled') => 
                      setTestSettings({...testSettings, backspaceMode: value})
                    }
                  >
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="Select backspace mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">✓ Full correction allowed</SelectItem>
                      <SelectItem value="word">⚡ Word-level correction</SelectItem>
                      <SelectItem value="disabled">🚫 Backspace disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose how backspace works during the test</p>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={startTest} 
              size="lg" 
              className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
            >
              🚀 Start Test Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Test Statistics - Show during and after test */}
      {(isActive || isFinished) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">remaining</div>
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
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{wrongWords.size}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Wrong Words</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Test Card - Show during and after test */}
      {(isActive || isFinished) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedTest.title}
                <Badge>{selectedTest.language === 'hindi' ? 'हिंदी' : 'English'}</Badge>
                <Badge variant="outline">{selectedTest.difficulty}</Badge>
                <Badge variant="outline">{selectedTest.category}</Badge>
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
            <div 
              ref={displayRef}
              className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-y-auto h-40 min-h-0 text-lg leading-relaxed ${
                selectedTest.language === 'hindi' ? 'font-mangal' : 'font-mono'
              }`}
              style={selectedTest.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
            >
              {renderText()}
            </div>

            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyDownCapture={(e) => {
                  // Prevent all backspace behavior at the browser level when restricted
                  if (e.key === 'Backspace') {
                    if (testSettings.backspaceMode === 'disabled') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (testSettings.backspaceMode === 'word') {
                      const currentWordStart = userInput.lastIndexOf(' ') + 1;
                      const cursorPosition = textareaRef.current?.selectionStart || 0;
                      if (cursorPosition <= currentWordStart) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }
                  }
                }}
                disabled={isFinished}
                placeholder={isActive ? "Type the text above. Press space to move to next word..." : "Click here and start typing to begin the test"}
                className={`w-full h-32 p-4 border rounded-lg resize-none text-lg 
                  ${selectedTest.language === 'hindi' ? 'font-mangal' : 'font-mono'}
                  ${isFinished ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'} 
                  border-gray-300 dark:border-gray-600 
                  focus:border-blue-500 dark:focus:border-blue-400 
                  focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400
                  placeholder:text-gray-500 dark:placeholder:text-gray-400`}
                style={selectedTest.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                inputMode={selectedTest.language === 'hindi' ? 'text' : 'text'}
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Word {currentWordIndex + 1} of {words.length} | {wrongWords.size} wrong words
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
      )}
    </div>
  );
};

export default TypingTest;
