
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TypingTest {
  id: string;
  title: string;
  content: string;
  language: 'english' | 'hindi';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  time_limit: number;
  created_at: string;
}

const AdminPanel = ({ onTestCreated }: { onTestCreated: (test: TypingTest) => void }) => {
  const [newTest, setNewTest] = useState({
    title: '',
    content: '',
    language: 'english' as 'english' | 'hindi',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: 60,
    category: 'general'
  });

  const queryClient = useQueryClient();

  // Fetch typing tests
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['typing-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('typing_tests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TypingTest[];
    }
  });

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async (testData: typeof newTest) => {
      const { data, error } = await supabase
        .from('typing_tests')
        .insert([{
          title: testData.title,
          content: testData.content,
          language: testData.language,
          difficulty: testData.difficulty,
          time_limit: testData.timeLimit,
          category: testData.category
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
      setNewTest({
        title: '',
        content: '',
        language: 'english',
        difficulty: 'medium',
        timeLimit: 60,
        category: 'general'
      });
      toast({
        title: "Success",
        description: "Typing test created successfully!"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create test: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('typing_tests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
      toast({
        title: "Test Deleted",
        description: "Typing test has been removed"
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setNewTest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveTest = () => {
    if (!newTest.title || !newTest.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createTestMutation.mutate(newTest);
  };

  const handleUseTest = (test: TypingTest) => {
    onTestCreated(test);
    toast({
      title: "Test Loaded",
      description: `"${test.title}" is now ready for use`
    });
  };

  const handleDeleteTest = (id: string) => {
    deleteTestMutation.mutate(id);
  };

  const handleEditTest = (test: TypingTest) => {
    setNewTest({
      title: test.title,
      content: test.content,
      language: test.language,
      difficulty: test.difficulty,
      timeLimit: test.time_limit,
      category: test.category
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Test
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manage Tests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Typing Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Advanced English Typing"
                    value={newTest.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newTest.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="literature">Literature</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="quotes">Quotes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={newTest.language} onValueChange={(value) => handleInputChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={newTest.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Default Time Limit (seconds)</Label>
                  <Select 
                    value={newTest.timeLimit.toString()} 
                    onValueChange={(value) => handleInputChange('timeLimit', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="180">3 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Test Content *</Label>
                <Textarea
                  id="content"
                  placeholder={newTest.language === 'hindi' 
                    ? "यहाँ हिंदी टेक्स्ट लिखें..." 
                    : "Enter the text for typing test here..."
                  }
                  value={newTest.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`min-h-[200px] ${newTest.language === 'hindi' ? 'font-mangal' : ''}`}
                  style={newTest.language === 'hindi' ? { fontFamily: 'Mangal, serif' } : {}}
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {newTest.content.length} characters, {newTest.content.split(' ').length} words
                </div>
              </div>

              {newTest.content && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${
                    newTest.language === 'hindi' ? 'font-mangal' : 'font-mono'
                  }`}
                  style={newTest.language === 'hindi' ? { fontFamily: 'Mangal, serif' } : {}}>
                    {newTest.content.substring(0, 200)}
                    {newTest.content.length > 200 && '...'}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={handleSaveTest} 
                  className="flex items-center gap-2"
                  disabled={createTestMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {createTestMutation.isPending ? 'Saving...' : 'Save Test'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setNewTest({
                    title: '',
                    content: '',
                    language: 'english',
                    difficulty: 'medium',
                    timeLimit: 60,
                    category: 'general'
                  })}
                >
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Saved Typing Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading tests...</div>
              ) : tests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Tests Created</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first typing test to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.map((test) => (
                    <div key={test.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{test.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">
                              {test.language === 'hindi' ? 'हिंदी' : 'English'}
                            </Badge>
                            <Badge className={getDifficultyColor(test.difficulty)}>
                              {test.difficulty}
                            </Badge>
                            <Badge variant="outline">{test.category}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUseTest(test)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Use
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTest(test)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteTest(test.id)}
                            className="flex items-center gap-1"
                            disabled={deleteTestMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className={`text-sm text-gray-600 dark:text-gray-400 ${
                        test.language === 'hindi' ? 'font-mangal' : ''
                      }`}
                      style={test.language === 'hindi' ? { fontFamily: 'Mangal, serif' } : {}}>
                        {test.content.substring(0, 150)}
                        {test.content.length > 150 && '...'}
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                        <span>{test.content.split(' ').length} words</span>
                        <span>Default: {test.time_limit}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
