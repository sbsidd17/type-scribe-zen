import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit, Plus, Save, X, Users, CheckCircle, XCircle, Ban, UserCheck, History, Download, CalendarIcon, FileText } from 'lucide-react';
import { NoticeManager } from './NoticeManager';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportUserTestHistory, exportTopUsersByDate, exportAllTimeTopUsers, exportPerTestTopUsers } from '@/utils/pdfExport';

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
  const [newTest, setNewTest] = useState({
    title: '',
    content: '',
    language: 'english' as 'english' | 'hindi',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
    time_limit: 0 // Time in minutes
  });

  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTest, setEditingTest] = useState<TypingTest | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    language: 'english' as 'english' | 'hindi',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
    time_limit: 0
  });

  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string | null>(null);
  const [selectedDateForReport, setSelectedDateForReport] = useState<Date>();
  const [selectedTestForReport, setSelectedTestForReport] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch all tests for admin view
  const { data: tests = [], refetch: refetchTests } = useQuery({
    queryKey: ['admin-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('typing_tests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TypingTest[];
    }
  });

  // Get unique categories
  const categories = Array.from(new Set(tests.map(test => test.category))).filter(Boolean);

  // Fetch all users for admin management
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch test counts for each user
      const usersWithCounts = await Promise.all(
        data.map(async (user) => {
          const { count } = await supabase
            .from('test_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          return { ...user, test_count: count || 0 };
        })
      );
      
      return usersWithCounts;
    }
  });

  // Fetch test history for selected user
  const { data: userTestHistory = [] } = useQuery({
    queryKey: ['user-test-history', selectedUserForHistory],
    queryFn: async () => {
      if (!selectedUserForHistory) return [];
      
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          typing_tests (
            title,
            category,
            language
          )
        `)
        .eq('user_id', selectedUserForHistory)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserForHistory
  });

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${status === 'active' ? 'approved' : status === 'restricted' ? 'restricted' : 'updated'} successfully`,
      });
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!newTest.title || !newTest.content || !newTest.category) {
        throw new Error('Please fill in all required fields');
      }

      const { data, error } = await supabase
        .from('typing_tests')
        .insert([{
          title: newTest.title,
          content: newTest.content.trim(),
          language: newTest.language,
          difficulty: newTest.difficulty,
          category: newTest.category.trim(),
          time_limit: newTest.time_limit * 60 // Convert minutes to seconds
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test created successfully!",
      });

      // Reset form
      setNewTest({
        title: '',
        content: '',
        language: 'english',
        difficulty: 'medium',
        category: '',
        time_limit: 1
      });

      // Refresh data
      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });

      if (onTestCreated) {
        onTestCreated(data as TypingTest);
      }
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      const { error } = await supabase
        .from('typing_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test deleted successfully!",
      });

      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (testId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('typing_tests')
        .update({ is_active: !isActive })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Test ${!isActive ? 'activated' : 'deactivated'} successfully!`,
      });

      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error updating test:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      // Create a placeholder test with the new category
      const { error } = await supabase
        .from('typing_tests')
        .insert([{
          title: `Sample ${newCategory} Test`,
          content: 'This is a sample test for the new category. You can edit or delete this test.',
          language: 'english',
          difficulty: 'medium',
          category: newCategory.trim(),
          time_limit: 60,
          is_active: false
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully!",
      });

      setNewCategory('');
      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async (oldCategory: string) => {
    if (!editCategoryName.trim() || editCategoryName === oldCategory) {
      setEditingCategory(null);
      setEditCategoryName('');
      return;
    }

    try {
      const { error } = await supabase
        .from('typing_tests')
        .update({ category: editCategoryName.trim() })
        .eq('category', oldCategory);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category updated successfully!",
      });

      setEditingCategory(null);
      setEditCategoryName('');
      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (category: string) => {
    try {
      const { error } = await supabase
        .from('typing_tests')
        .delete()
        .eq('category', category);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category and all its tests deleted successfully!",
      });

      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTest = (test: TypingTest) => {
    setEditingTest(test);
    setEditForm({
      title: test.title,
      content: test.content,
      language: test.language,
      difficulty: test.difficulty,
      category: test.category,
      time_limit: Math.floor(test.time_limit / 60) // Convert seconds to minutes
    });
  };

  const handleCancelEdit = () => {
    setEditingTest(null);
    setEditForm({
      title: '',
      content: '',
      language: 'english',
      difficulty: 'medium',
      category: '',
      time_limit: 0
    });
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;
    setIsSubmitting(true);

    try {
      if (!editForm.title || !editForm.content || !editForm.category) {
        throw new Error('Please fill in all required fields');
      }

      const { error } = await supabase
        .from('typing_tests')
        .update({
          title: editForm.title,
          content: editForm.content.trim(),
          language: editForm.language,
          difficulty: editForm.difficulty,
          category: editForm.category.trim(),
          time_limit: editForm.time_limit * 60 // Convert minutes to seconds
        })
        .eq('id', editingTest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test updated successfully!",
      });

      handleCancelEdit();
      refetchTests();
      queryClient.invalidateQueries({ queryKey: ['typing-tests'] });
    } catch (error: any) {
      console.error('Error updating test:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // Fetch leaderboard data for reports with additional data
  const { data: allTimeTopUsers = [] } = useQuery({
    queryKey: ['all-time-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { p_test_id: null });
      if (error) throw error;
      
      // Fetch additional data (completed_at and language) for each result
      if (data && data.length > 0) {
        const resultIds = data.map((item: any) => item.result_id);
        const { data: additionalData, error: additionalError } = await supabase
          .from('test_results')
          .select(`
            id,
            completed_at,
            typing_tests!inner(language)
          `)
          .in('id', resultIds);
        
        if (!additionalError && additionalData) {
          // Merge additional data with leaderboard data
          return data.map((item: any) => {
            const additional = additionalData.find((ad: any) => ad.id === item.result_id);
            return {
              ...item,
              completed_at: additional?.completed_at,
              language: additional?.typing_tests?.language || 'english'
            };
          });
        }
      }
      
      return data || [];
    }
  });

  // Fetch leaderboard data for specific test with additional data
  const { data: testTopUsers = [] } = useQuery({
    queryKey: ['test-leaderboard', selectedTestForReport],
    queryFn: async () => {
      if (!selectedTestForReport) return [];
      const { data, error } = await supabase.rpc('get_leaderboard', { p_test_id: selectedTestForReport });
      if (error) throw error;
      
      // Fetch additional data (completed_at and language) for each result
      if (data && data.length > 0) {
        const resultIds = data.map((item: any) => item.result_id);
        const { data: additionalData, error: additionalError } = await supabase
          .from('test_results')
          .select(`
            id,
            completed_at,
            typing_tests!inner(language)
          `)
          .in('id', resultIds);
        
        if (!additionalError && additionalData) {
          // Merge additional data with leaderboard data
          return data.map((item: any) => {
            const additional = additionalData.find((ad: any) => ad.id === item.result_id);
            return {
              ...item,
              completed_at: additional?.completed_at,
              language: additional?.typing_tests?.language || 'english'
            };
          });
        }
      }
      
      return data || [];
    },
    enabled: !!selectedTestForReport
  });

  const handleExportUserHistory = (userName: string) => {
    if (userTestHistory.length === 0) {
      toast({
        title: 'No Data',
        description: 'No test history available to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportUserTestHistory(userName, userTestHistory);
      toast({
        title: 'Success',
        description: 'User test history exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to export test history',
        variant: 'destructive',
      });
    }
  };

  const handleExportAllTimeTopUsers = () => {
    if (allTimeTopUsers.length === 0) {
      toast({
        title: 'No Data',
        description: 'No leaderboard data available to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportAllTimeTopUsers(allTimeTopUsers);
      toast({
        title: 'Success',
        description: 'All-time top users report exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const handleExportDateTopUsers = async () => {
    if (!selectedDateForReport) {
      toast({
        title: 'Error',
        description: 'Please select a date first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dateStr = format(selectedDateForReport, 'yyyy-MM-dd');
      
      // Fetch top users for the selected date with language
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          id,
          user_id,
          wpm,
          accuracy,
          time_taken,
          total_words,
          completed_at,
          test_id,
          profiles!inner(full_name, email),
          typing_tests!inner(language)
        `)
        .gte('completed_at', `${dateStr}T00:00:00`)
        .lte('completed_at', `${dateStr}T23:59:59`)
        .gte('accuracy', 85)
        .order('wpm', { ascending: false });

      if (error) throw error;

      // Filter and format the data
      const topUsers = data
        .filter((result: any) => 
          result.time_taken >= 600 || (result.total_words || 0) >= 400
        )
        .map((result: any) => ({
          result_id: result.id,
          user_id: result.user_id,
          wpm: result.wpm,
          accuracy: result.accuracy,
          time_taken: result.time_taken,
          total_words: result.total_words || 0,
          completed_at: result.completed_at,
          language: result.typing_tests?.language || 'english',
          display_name: result.profiles?.full_name || 
                       result.profiles?.email?.split('@')[0] || 
                       'Anonymous'
        }))
        .slice(0, 100);

      if (topUsers.length === 0) {
        toast({
          title: 'No Data',
          description: 'No qualified users found for this date',
          variant: 'destructive',
        });
        return;
      }

      exportTopUsersByDate(dateStr, topUsers);
      toast({
        title: 'Success',
        description: 'Date-wise top users report exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const handleExportTestTopUsers = async () => {
    if (!selectedTestForReport) {
      toast({
        title: 'Error',
        description: 'Please select a test first',
        variant: 'destructive',
      });
      return;
    }

    if (testTopUsers.length === 0) {
      toast({
        title: 'No Data',
        description: 'No leaderboard data available for this test',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Fetch test details
      const { data: testData, error } = await supabase
        .from('typing_tests')
        .select('title, content')
        .eq('id', selectedTestForReport)
        .single();

      if (error) throw error;

      exportPerTestTopUsers(testData.title, testData.content, testTopUsers);
      toast({
        title: 'Success',
        description: 'Test top users report exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create-test" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="create-test">Create Test</TabsTrigger>
              <TabsTrigger value="manage-tests">Manage Tests</TabsTrigger>
              <TabsTrigger value="manage-categories">Manage Categories</TabsTrigger>
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="notices">Manage Notices</TabsTrigger>
            </TabsList>

            <TabsContent value="create-test">
              <form onSubmit={handleCreateTest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Test Title *</Label>
                    <Input
                      id="title"
                      value={newTest.title}
                      onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                      placeholder="Enter test title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={newTest.category}
                      onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={newTest.language} onValueChange={(value: 'english' | 'hindi') => setNewTest({ ...newTest, language: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={newTest.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setNewTest({ ...newTest, difficulty: value })}>
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
                    <Label htmlFor="time_limit">Time Limit (minutes) *</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      min="1"
                      max="60"
                      value={newTest.time_limit}
                      onChange={(e) => setNewTest({ ...newTest, time_limit: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Test Content *</Label>
                  <Textarea
                    id="content"
                    value={newTest.content}
                    onChange={(e) => setNewTest({ ...newTest, content: e.target.value })}
                    placeholder="Enter the text for typing test"
                    className="min-h-[200px]"
                    required
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Words: {newTest.content.split(' ').filter(word => word.length > 0).length}
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Creating...' : 'Create Test'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="manage-tests">
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Tests: {tests.length} | Active: {tests.filter(t => t.is_active).length}
                </div>
                
                {editingTest ? (
                  <Card className="p-6 border-2 border-primary">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Edit Test</h3>
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-title">Test Title *</Label>
                          <Input
                            id="edit-title"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            placeholder="Enter test title"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-category">Category *</Label>
                          <Input
                            id="edit-category"
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            placeholder="Enter category name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-language">Language</Label>
                          <Select value={editForm.language} onValueChange={(value: 'english' | 'hindi') => setEditForm({ ...editForm, language: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="hindi">Hindi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-difficulty">Difficulty</Label>
                          <Select value={editForm.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setEditForm({ ...editForm, difficulty: value })}>
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
                          <Label htmlFor="edit-time-limit">Time Limit (minutes) *</Label>
                          <Input
                            id="edit-time-limit"
                            type="number"
                            min="1"
                            max="60"
                            value={editForm.time_limit}
                            onChange={(e) => setEditForm({ ...editForm, time_limit: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-content">Test Content *</Label>
                        <Textarea
                          id="edit-content"
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          placeholder="Enter the text for typing test"
                          className="min-h-[200px]"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Words: {editForm.content.split(' ').filter(word => word.length > 0).length}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleUpdateTest} disabled={isSubmitting} className="flex-1">
                          {isSubmitting ? 'Updating...' : 'Update Test'}
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {tests.map((test) => (
                      <Card key={test.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{test.title}</h3>
                              <Badge variant="outline">{test.language}</Badge>
                              <Badge variant="outline">{test.difficulty}</Badge>
                              <Badge variant="outline">{test.category}</Badge>
                              <Badge variant={test.is_active ? "default" : "secondary"}>
                                {test.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {test.content.substring(0, 100)}...
                            </p>
                            <div className="text-xs text-gray-500">
                              Time: {formatTime(test.time_limit)} | Words: {test.content.split(' ').length}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTest(test)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant={test.is_active ? "secondary" : "default"}
                              onClick={() => handleToggleActive(test.id, test.is_active)}
                            >
                              {test.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{test.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTest(test.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manage-categories">
              <div className="space-y-6">
                {/* Create New Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter category name"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                      />
                      <Button onClick={handleCreateCategory} disabled={!newCategory.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Existing Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {editingCategory === category ? (
                              <Input
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditCategory(category);
                                  if (e.key === 'Escape') {
                                    setEditingCategory(null);
                                    setEditCategoryName('');
                                  }
                                }}
                                autoFocus
                                className="w-48"
                              />
                            ) : (
                              <>
                                <span className="font-medium capitalize">{category}</span>
                                <Badge variant="secondary">
                                  {tests.filter(t => t.category === category).length} tests
                                </Badge>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {editingCategory === category ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(null);
                                    setEditCategoryName('');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(category);
                                    setEditCategoryName(category);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the "{category}" category? This will also delete all tests in this category. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCategory(category)}>
                                        Delete Category
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {categories.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No categories found. Create your first category above.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users">
              <div className="space-y-6">
                {/* Top Users Reports Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generate Top Users Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* All-Time Top Users */}
                      <Card className="p-4">
                        <h3 className="font-semibold mb-2">All-Time Top Users</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export leaderboard of top performing users across all tests
                        </p>
                        <Button 
                          onClick={handleExportAllTimeTopUsers}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export All-Time Report
                        </Button>
                      </Card>

                      {/* Date-Wise Top Users */}
                      <Card className="p-4">
                        <h3 className="font-semibold mb-2">Date-Wise Top Users</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export leaderboard for a specific date
                        </p>
                        <div className="space-y-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !selectedDateForReport && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDateForReport ? format(selectedDateForReport, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={selectedDateForReport}
                                onSelect={setSelectedDateForReport}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Button 
                            onClick={handleExportDateTopUsers}
                            disabled={!selectedDateForReport}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Date Report
                          </Button>
                        </div>
                      </Card>

                      {/* Per-Test Top Users */}
                      <Card className="p-4">
                        <h3 className="font-semibold mb-2">Per-Test Top Users</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export leaderboard for a specific test with test details
                        </p>
                        <div className="space-y-2">
                          <Select value={selectedTestForReport || ''} onValueChange={setSelectedTestForReport}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a test" />
                            </SelectTrigger>
                            <SelectContent>
                              {tests.filter(t => t.is_active).map((test) => (
                                <SelectItem key={test.id} value={test.id}>
                                  {test.title} ({test.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={handleExportTestTopUsers}
                            disabled={!selectedTestForReport}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Test Report
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tests Completed</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {getInitials(user.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.full_name || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    user.status === 'active' ? 'default' :
                                    user.status === 'restricted' ? 'destructive' :
                                    'secondary'
                                  }
                                >
                                  {user.status || 'active'}
                                </Badge>
                              </TableCell>
                              <TableCell>{user.test_count || 0}</TableCell>
                              <TableCell>
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedUserForHistory(user.id)}
                                        title="View Test History"
                                      >
                                        <History className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh]">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <History className="h-5 w-5" />
                                            Test History - {user.full_name || 'Unknown'}
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleExportUserHistory(user.full_name || 'Unknown')}
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export PDF
                                          </Button>
                                        </DialogTitle>
                                      </DialogHeader>
                                      <ScrollArea className="h-[60vh] pr-4">
                                        {userTestHistory.length > 0 ? (
                                          <div className="space-y-4">
                                            {userTestHistory.map((result: any) => (
                                              <Card key={result.id}>
                                                <CardContent className="pt-6">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                      <h3 className="font-semibold text-lg mb-2">
                                                        {result.typing_tests?.title || 'Unknown Test'}
                                                      </h3>
                                                      <div className="space-y-1 text-sm text-muted-foreground">
                                                        <p>Category: {result.typing_tests?.category || 'N/A'}</p>
                                                        <p>Language: {result.typing_tests?.language || 'N/A'}</p>
                                                        <p>Completed: {new Date(result.completed_at).toLocaleString()}</p>
                                                      </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <p className="text-sm text-muted-foreground">WPM</p>
                                                        <p className="text-2xl font-bold text-primary">{Number(result.wpm).toFixed(1)}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-sm text-muted-foreground">Accuracy</p>
                                                        <p className="text-2xl font-bold text-primary">{Number(result.accuracy).toFixed(1)}%</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-sm text-muted-foreground">Time</p>
                                                        <p className="text-lg font-semibold">{formatTime(result.time_taken)}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-sm text-muted-foreground">Words</p>
                                                        <p className="text-lg font-semibold">{result.total_words || 0}</p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                      <p className="text-muted-foreground">Correct Words</p>
                                                      <p className="font-medium text-green-600">{result.correct_words_count || 0}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-muted-foreground">Incorrect Words</p>
                                                      <p className="font-medium text-red-600">{result.incorrect_words || 0}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-muted-foreground">Gross WPM</p>
                                                      <p className="font-medium">{result.gross_wpm ? Number(result.gross_wpm).toFixed(1) : 'N/A'}</p>
                                                    </div>
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-center py-8 text-muted-foreground">
                                            No test history found for this user
                                          </div>
                                        )}
                                      </ScrollArea>
                                    </DialogContent>
                                  </Dialog>
                                  {user.status !== 'active' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                      title="Approve User"
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                  )}
                                  {user.status !== 'restricted' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateUserStatus(user.id, 'restricted')}
                                      title="Restrict User"
                                    >
                                      <Ban className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="destructive" title="Delete User">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {user.full_name || 'this user'}? 
                                          This will permanently delete their profile and all associated data. 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                          Delete User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {users.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No users found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notices">
              <NoticeManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
