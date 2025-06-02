import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save, X, Settings, FileText, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TypingTest {
  id: string;
  title: string;
  content: string;
  language: 'english' | 'hindi';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  time_limit: number;
  is_active: boolean;
  created_at: string;
}

interface AdminPanelProps {
  onTestCreated?: (test: TypingTest) => void;
}

const AdminPanel = ({ onTestCreated }: AdminPanelProps) => {
  // Test form state
  const [newTest, setNewTest] = useState({
    title: '',
    content: '',
    language: 'english' as 'english' | 'hindi',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
    timeInMinutes: 1 // Changed to minutes
  });

  // Category management state
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Edit state
  const [editingTest, setEditingTest] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TypingTest | null>(null);
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all tests
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['admin-typing-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('typing_tests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TypingTest[];
    }
  });

  // Extract unique categories from tests
  React.useEffect(() => {
    if (tests.length > 0) {
      const uniqueCategories = [...new Set(tests.map(test => test.category))];
      setCategories(uniqueCategories);
    }
  }, [tests]);

  // Create new test
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Convert minutes to seconds for storage
      const timeInSeconds = newTest.timeInMinutes * 60;

      const { data, error } = await supabase
        .from('typing_tests')
        .insert([{
          title: newTest.title,
          content: newTest.content,
          language: newTest.language,
          difficulty: newTest.difficulty,
          category: newTest.category,
          time_limit: timeInSeconds,
          created_by: user.id,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Test created successfully!",
        description: `"${newTest.title}" has been added to the typing tests.`
      });

      // Reset form
      setNewTest({
        title: '',
        content: '',
        language: 'english',
        difficulty: 'medium',
        category: '',
        timeInMinutes: 1
      });

      // Refresh tests
      queryClient.invalidateQueries({ queryKey: ['admin-typing-tests'] });
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });

      if (onTestCreated) {
        onTestCreated(data);
      }

    } catch (error: any) {
      console.error('Error creating test:', error);
      toast({
        title: "Error creating test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete test
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${testTitle}"?`)) return;

    try {
      const { error } = await supabase
        .from('typing_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Test deleted successfully!",
        description: `"${testTitle}" has been removed.`
      });

      queryClient.invalidateQueries({ queryKey: ['admin-typing-tests'] });
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });

    } catch (error: any) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error deleting test",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Start editing test
  const startEditing = (test: TypingTest) => {
    setEditingTest(test.id);
    setEditForm({
      ...test,
      time_limit: test.time_limit // Keep in seconds for editing
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTest(null);
    setEditForm(null);
  };

  // Update test
  const handleUpdateTest = async () => {
    if (!editForm) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('typing_tests')
        .update({
          title: editForm.title,
          content: editForm.content,
          language: editForm.language,
          difficulty: editForm.difficulty,
          category: editForm.category,
          time_limit: editForm.time_limit,
          is_active: editForm.is_active
        })
        .eq('id', editForm.id);

      if (error) throw error;

      toast({
        title: "Test updated successfully!",
        description: `"${editForm.title}" has been updated.`
      });

      setEditingTest(null);
      setEditForm(null);
      queryClient.invalidateQueries({ queryKey: ['admin-typing-tests'] });
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });

    } catch (error: any) {
      console.error('Error updating test:', error);
      toast({
        title: "Error updating test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add new category
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
      toast({
        title: "Category added!",
        description: `"${newCategory.trim()}" is now available for tests.`
      });
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Check if any tests use this category
    const testsWithCategory = tests.filter(test => test.category === categoryToDelete);
    
    if (testsWithCategory.length > 0) {
      toast({
        title: "Cannot delete category",
        description: `${testsWithCategory.length} test(s) are using this category. Please reassign or delete those tests first.`,
        variant: "destructive"
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${categoryToDelete}"?`)) {
      setCategories(categories.filter(cat => cat !== categoryToDelete));
      toast({
        title: "Category deleted!",
        description: `"${categoryToDelete}" has been removed.`
      });
    }
  };

  // Format time for display (convert seconds to minutes)
  const formatTimeForDisplay = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">Loading admin panel...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Admin Panel
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            Manage typing tests and categories
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Test
          </TabsTrigger>
        </TabsList>

        {/* Test Management Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Existing Tests ({tests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tests created yet. Create your first test!
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className={`p-4 border rounded-lg ${
                        test.is_active ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      {editingTest === test.id ? (
                        // Edit form
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-title">Title</Label>
                              <Input
                                id="edit-title"
                                value={editForm?.title || ''}
                                onChange={(e) => setEditForm(prev => prev ? {...prev, title: e.target.value} : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-category">Category</Label>
                              <Select
                                value={editForm?.category || ''}
                                onValueChange={(value) => setEditForm(prev => prev ? {...prev, category: value} : null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="edit-language">Language</Label>
                              <Select
                                value={editForm?.language || ''}
                                onValueChange={(value: 'english' | 'hindi') => 
                                  setEditForm(prev => prev ? {...prev, language: value} : null)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="english">English</SelectItem>
                                  <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="edit-difficulty">Difficulty</Label>
                              <Select
                                value={editForm?.difficulty || ''}
                                onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                                  setEditForm(prev => prev ? {...prev, difficulty: value} : null)
                                }
                              >
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
                            <div>
                              <Label htmlFor="edit-time">Time (minutes)</Label>
                              <Input
                                id="edit-time"
                                type="number"
                                min="1"
                                max="60"
                                value={Math.floor((editForm?.time_limit || 60) / 60)}
                                onChange={(e) => {
                                  const minutes = parseInt(e.target.value) || 1;
                                  setEditForm(prev => prev ? {...prev, time_limit: minutes * 60} : null);
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="edit-content">Content</Label>
                            <Textarea
                              id="edit-content"
                              value={editForm?.content || ''}
                              onChange={(e) => setEditForm(prev => prev ? {...prev, content: e.target.value} : null)}
                              rows={6}
                              className={`${editForm?.language === 'hindi' ? 'font-mangal' : ''}`}
                              style={editForm?.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="edit-active"
                                checked={editForm?.is_active || false}
                                onChange={(e) => setEditForm(prev => prev ? {...prev, is_active: e.target.checked} : null)}
                              />
                              <Label htmlFor="edit-active">Active</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleUpdateTest}
                                disabled={isUpdating}
                                className="flex items-center gap-2"
                              >
                                <Save className="h-4 w-4" />
                                {isUpdating ? 'Saving...' : 'Save'}
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={cancelEditing}
                                className="flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display view
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold">{test.title}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant={test.is_active ? "default" : "secondary"}>
                                  {test.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline">{test.language === 'hindi' ? 'हिंदी' : 'English'}</Badge>
                                <Badge variant="outline">{test.difficulty}</Badge>
                                <Badge variant="outline">{test.category}</Badge>
                                <Badge variant="outline">{formatTimeForDisplay(test.time_limit)}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(test)}
                                className="flex items-center gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTest(test.id, test.title)}
                                className="flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {test.content.length > 150 ? test.content.substring(0, 150) + '...' : test.content}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {new Date(test.created_at).toLocaleDateString()} • 
                            {test.content.split(' ').length} words
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Management Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add or remove test categories
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new category */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Existing categories */}
              <div className="space-y-2">
                <Label>Existing Categories</Label>
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm">No categories created yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categories.map((category) => {
                      const testCount = tests.filter(test => test.category === category).length;
                      return (
                        <div 
                          key={category} 
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                        >
                          <div>
                            <span className="font-medium capitalize">{category}</span>
                            <div className="text-xs text-gray-500">{testCount} test(s)</div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={testCount > 0}
                            title={testCount > 0 ? "Cannot delete category with existing tests" : "Delete category"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Test Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Typing Test</CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                Add a new typing test for users to practice with
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Test Title *</Label>
                    <Input
                      id="title"
                      value={newTest.title}
                      onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                      placeholder="e.g., Basic English Paragraph"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={newTest.category}
                      onValueChange={(value) => setNewTest({ ...newTest, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select or type category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Or enter new category"
                      value={newTest.category}
                      onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="language">Language *</Label>
                    <Select
                      value={newTest.language}
                      onValueChange={(value: 'english' | 'hindi') => setNewTest({ ...newTest, language: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty *</Label>
                    <Select
                      value={newTest.difficulty}
                      onValueChange={(value: 'easy' | 'medium' | 'hard') => setNewTest({ ...newTest, difficulty: value })}
                      required
                    >
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
                  <div>
                    <Label htmlFor="time">Time Limit (minutes) *</Label>
                    <Input
                      id="time"
                      type="number"
                      min="1"
                      max="60"
                      value={newTest.timeInMinutes}
                      onChange={(e) => setNewTest({ ...newTest, timeInMinutes: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Test Content *</Label>
                  <Textarea
                    id="content"
                    value={newTest.content}
                    onChange={(e) => setNewTest({ ...newTest, content: e.target.value })}
                    placeholder="Enter the text that users will type..."
                    rows={8}
                    required
                    className={`${newTest.language === 'hindi' ? 'font-mangal' : ''}`}
                    style={newTest.language === 'hindi' ? { fontFamily: 'Noto Sans Devanagari, Mangal, serif' } : {}}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Word count: {newTest.content.split(' ').filter(word => word.length > 0).length}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Test
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
