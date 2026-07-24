import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Plus, Edit, CheckCircle, Truck, User, Trash2, Package, X, MapPin, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { useRiders, useCreateRider, useUpdateRider, useDeleteRider } from '@/hooks/useRiders';
import { useGoodsTasks, useCreateGoodsTask, useUpdateGoodsTask, useDeleteGoodsTask } from '@/hooks/useGoodsTasks';
import { 
  useTaskItems, 
  useCreateTaskItem, 
  useToggleTaskItemDelivery, 
  useDeleteTaskItem 
} from '@/hooks/useTaskItems';
import type { GoodsTask, Rider } from '@/types/api';

export default function GoodsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  // Fetch data from database
  const { data: ridersData, isLoading: ridersLoading } = useRiders();
  const { data: tasksData, isLoading: tasksLoading } = useGoodsTasks();
  
  const riders = ridersData || [];
  const tasks = tasksData || [];
  
  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('goods');
  
  // Mutations
  const createRider = useCreateRider();
  const updateRider = useUpdateRider();
  const deleteRider = useDeleteRider();
  const createTask = useCreateGoodsTask();
  const updateTask = useUpdateGoodsTask();
  const deleteTask = useDeleteGoodsTask();
  
  // Riders state
  const [riderDialogOpen, setRiderDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [riderToDelete, setRiderToDelete] = useState<{id: string, name: string, tasksCount: number} | null>(null);
  const [riderForm, setRiderForm] = useState({
    name: '',
    name_urdu: '',
    phone: '',
    email: '',
    vehicle_number: '',
    vehicle_type: '',
  });
  
  // Tasks state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GoodsTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    riderId: '',
    taskName: '',
    taskNumber: '',
  });

  // Boxes state
  const [totalBoxes, setTotalBoxes] = useState<number>(0);
  const [deliveredBoxes, setDeliveredBoxes] = useState<number>(0);
  const [remainingBoxes, setRemainingBoxes] = useState<number>(0);

  // Temporary items for new/edit task (before saving)
  const [tempItems, setTempItems] = useState<Array<{ id?: string; name: string; checked: boolean }>>([]);
  const [tempItemInput, setTempItemInput] = useState('');

  // Task Items state (for managing boxes/items)
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedTaskForItems, setSelectedTaskForItems] = useState<GoodsTask | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Fetch task items when a task is selected
  const { data: taskItemsData } = useTaskItems(selectedTaskForItems?.id || '', !!selectedTaskForItems);
  const taskItems = taskItemsData || [];

  // Task item mutations
  const createTaskItem = useCreateTaskItem();
  const toggleItemDelivery = useToggleTaskItemDelivery();
  const deleteTaskItem = useDeleteTaskItem();

  // Open Rider Dialog (for add or edit)
  const handleOpenRiderDialog = (rider?: Rider) => {
    if (rider) {
      setEditingRider(rider);
      setRiderForm({
        name: rider.name || '',
        name_urdu: rider.name_urdu || '',
        phone: rider.phone || '',
        email: rider.email || '',
        vehicle_number: rider.vehicle_number || '',
        vehicle_type: rider.vehicle_type || '',
      });
    } else {
      setEditingRider(null);
      setRiderForm({
        name: '',
        name_urdu: '',
        phone: '',
        email: '',
        vehicle_number: '',
        vehicle_type: '',
      });
    }
    setRiderDialogOpen(true);
  };

  // Add or Update Rider
  const handleSaveRider = () => {
    if (!riderForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter rider name',
        variant: 'destructive',
      });
      return;
    }
    
    if (editingRider) {
      // Update existing rider
      updateRider.mutate({
        id: editingRider.id,
        data: {
          name: riderForm.name.trim(),
          name_urdu: riderForm.name_urdu.trim() || undefined,
          phone: riderForm.phone.trim() || undefined,
          email: riderForm.email.trim() || undefined,
          vehicle_number: riderForm.vehicle_number.trim() || undefined,
          vehicle_type: riderForm.vehicle_type.trim() || undefined,
        }
      }, {
        onSuccess: () => {
          setRiderForm({
            name: '',
            name_urdu: '',
            phone: '',
            email: '',
            vehicle_number: '',
            vehicle_type: '',
          });
          setEditingRider(null);
          setRiderDialogOpen(false);
          toast({
            title: t('updatedSuccessfully'),
            description: `Rider "${riderForm.name}" updated`,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update rider',
            variant: 'destructive',
          });
        }
      });
    } else {
      // Create new rider
      createRider.mutate({
        id: `RDR-${Date.now()}`,
        name: riderForm.name.trim(),
        name_urdu: riderForm.name_urdu.trim() || undefined,
        phone: riderForm.phone.trim() || undefined,
        email: riderForm.email.trim() || undefined,
        vehicle_number: riderForm.vehicle_number.trim() || undefined,
        vehicle_type: riderForm.vehicle_type.trim() || undefined,
        status: 'active',
      }, {
        onSuccess: () => {
          setRiderForm({
            name: '',
            name_urdu: '',
            phone: '',
            email: '',
            vehicle_number: '',
            vehicle_type: '',
          });
          setRiderDialogOpen(false);
          toast({
            title: t('createdSuccessfully'),
            description: `Rider "${riderForm.name}" added`,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create rider',
            variant: 'destructive',
          });
        }
      });
    }
  };

  // Delete Rider - Open confirmation dialog
  const handleDeleteRider = async (riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;
    
    // Find rider's tasks
    const riderTasks = tasks.filter(task => task.rider_id === riderId);
    const tasksCount = riderTasks.length;
    
    setRiderToDelete({
      id: riderId,
      name: rider.name,
      tasksCount: tasksCount
    });
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete Rider
  const confirmDeleteRider = () => {
    if (!riderToDelete) return;
    
    deleteRider.mutate(riderToDelete.id, {
      onSuccess: () => {
        let successMessage = 'Rider deleted successfully';
        if (riderToDelete.tasksCount > 0) {
          successMessage = `Rider and ${riderToDelete.tasksCount} associated task(s) deleted successfully`;
        }
        
        toast({
          title: t('deletedSuccessfully'),
          description: successMessage,
        });
        setDeleteConfirmOpen(false);
        setRiderToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete rider',
          variant: 'destructive',
        });
        setDeleteConfirmOpen(false);
        setRiderToDelete(null);
      }
    });
  };

  // Handle Task Dialog Open
  const handleOpenTaskDialog = async (task?: GoodsTask) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        riderId: task.rider_id || '',
        taskName: task.customer_name || '',
        taskNumber: task.task_number || '',
      });
      
      // Load existing items for editing
      try {
        const response = await window.api.taskItems.byTask(task.id);
        if (response.success && response.data) {
          setTempItems(response.data.map(item => ({
            id: item.id,
            name: item.item_name,
            checked: !!item.is_delivered,
          })));
        }
      } catch (error) {
        console.error('Error loading task items:', error);
        setTempItems([]);
      }
      
      // Load boxes data from task
      setTotalBoxes(task.total_boxes || 0);
      setDeliveredBoxes(task.delivered_boxes || 0);
      setRemainingBoxes(task.remaining_boxes || 0);
    } else {
      setEditingTask(null);
      setTaskForm({
        riderId: '',
        taskName: '',
        taskNumber: '',
      });
      setTempItems([]);
      setTotalBoxes(0);
      setDeliveredBoxes(0);
      setRemainingBoxes(0);
    }
    setTempItemInput('');
    setTaskDialogOpen(true);
  };

  // Add temporary item to list (for new/edit tasks)
  const handleAddTempItem = () => {
    if (!tempItemInput.trim()) return;
    setTempItems([...tempItems, { name: tempItemInput.trim(), checked: false }]);
    setTempItemInput('');
  };

  // Remove temporary item from list
  const handleRemoveTempItem = (index: number) => {
    setTempItems(tempItems.filter((_, i) => i !== index));
  };

  // Toggle temporary item checkbox
  const handleToggleTempItem = (index: number) => {
    setTempItems(tempItems.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    ));
  };

  // Handle Items Dialog Open
  const handleOpenItemsDialog = (task: GoodsTask) => {
    setSelectedTaskForItems(task);
    setNewItemName('');
    setItemsDialogOpen(true);
  };

  // Add new item to task
  const handleAddItem = () => {
    if (!newItemName.trim() || !selectedTaskForItems) {
      toast({
        title: 'Error',
        description: 'Please enter an item name',
        variant: 'destructive',
      });
      return;
    }

    createTaskItem.mutate({
      id: `ITM-${Date.now()}`,
      task_id: selectedTaskForItems.id,
      item_name: newItemName.trim(),
    }, {
      onSuccess: () => {
        setNewItemName('');
        // Manually invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskItems'] });
        toast({
          title: 'Success',
          description: 'Item added successfully',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to add item',
          variant: 'destructive',
        });
      }
    });
  };

  // Toggle item delivery status
  const handleToggleItem = (itemId: string) => {
    toggleItemDelivery.mutate(itemId, {
      onSuccess: () => {
        // Manually invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskItems'] });
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update item',
          variant: 'destructive',
        });
      }
    });
  };

  // Delete item
  const handleDeleteItem = (itemId: string, taskId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteTaskItem.mutate({ id: itemId, taskId }, {
        onSuccess: () => {
          // Manually invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskItems'] });
          toast({
            title: 'Success',
            description: 'Item deleted successfully',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete item',
            variant: 'destructive',
          });
        }
      });
    }
  };

  // Save Task
  const handleSaveTask = () => {
    if (!taskForm.riderId || !taskForm.taskName.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const rider = riders.find(r => r.id === taskForm.riderId);
    if (!rider) return;

    if (editingTask) {
      // Auto-determine status based on boxes
      let newStatus: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled' = editingTask.status;
      if (remainingBoxes === 0 && totalBoxes > 0) {
        newStatus = 'delivered';
      } else if (deliveredBoxes > 0 && remainingBoxes > 0) {
        newStatus = 'in_transit';
      } else if (deliveredBoxes === 0) {
        newStatus = 'pending';
      }

      // Update existing task
      updateTask.mutate({
        id: editingTask.id,
        data: {
          rider_id: taskForm.riderId,
          rider_name: rider.name,
          customer_name: taskForm.taskName,
          task_number: taskForm.taskNumber,
          total_boxes: totalBoxes,
          delivered_boxes: deliveredBoxes,
          remaining_boxes: remainingBoxes,
          status: newStatus,
        }
      }, {
        onSuccess: async () => {
          // Handle item updates
          try {
            // Get current items from database
            const response = await window.api.taskItems.byTask(editingTask.id);
            const existingItems = response.success && response.data ? response.data : [];
            const existingItemIds = new Set(existingItems.map(item => item.id));
            
            // Add new items (items without id)
            const newItems = tempItems.filter(item => !item.id);
            for (const item of newItems) {
              await window.api.taskItems.create({
                id: `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                task_id: editingTask.id,
                item_name: item.name,
              });
            }
            
            // Delete removed items
            const currentItemIds = new Set(tempItems.filter(item => item.id).map(item => item.id));
            for (const existingItem of existingItems) {
              if (!currentItemIds.has(existingItem.id)) {
                await window.api.taskItems.delete(existingItem.id);
              }
            }
            
            // Update delivery status for existing items
            for (const item of tempItems.filter(item => item.id)) {
              const existingItem = existingItems.find(ei => ei.id === item.id);
              if (existingItem && !!existingItem.is_delivered !== item.checked) {
                await window.api.taskItems.toggleDelivery(item.id!);
              }
            }
          } catch (error: any) {
            console.error('Error updating items:', error);
          }
          
          // Manually invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskItems'] });
          
          setTaskDialogOpen(false);
          setEditingTask(null);
          setTempItems([]);
          setTempItemInput('');
          toast({
            title: t('updatedSuccessfully'),
            description: 'Task and items updated',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update task',
            variant: 'destructive',
          });
        }
      });
    } else {
      // Create new task
      const taskId = `TSK-${Date.now()}`;
      
      // Auto-determine initial status based on boxes
      let initialStatus: 'pending' | 'in_transit' | 'delivered' = 'pending';
      if (remainingBoxes === 0 && totalBoxes > 0) {
        initialStatus = 'delivered';
      } else if (deliveredBoxes > 0 && remainingBoxes > 0) {
        initialStatus = 'in_transit';
      }

      createTask.mutate({
        id: taskId,
        task_number: taskForm.taskNumber || taskId,
        task_date: new Date().toISOString().split('T')[0],
        rider_id: taskForm.riderId,
        rider_name: rider.name,
        customer_name: taskForm.taskName,
        delivery_address: '',
        amount: 0,
        total_boxes: totalBoxes,
        delivered_boxes: deliveredBoxes,
        remaining_boxes: remainingBoxes,
        status: initialStatus,
        priority: 'normal' as const,
      }, {
        onSuccess: async () => {
          // Create all temporary items for this task
          if (tempItems.length > 0) {
            try {
              for (const item of tempItems) {
                await window.api.taskItems.create({
                  id: `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  task_id: taskId,
                  item_name: item.name,
                });
              }
            } catch (error: any) {
              console.error('Error creating items:', error);
            }
          }
          
          // Manually invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
          queryClient.invalidateQueries({ queryKey: ['taskItems'] });
          
          setTaskDialogOpen(false);
          setTempItems([]);
          setTempItemInput('');
          toast({
            title: t('createdSuccessfully'),
            description: `Task created${tempItems.length > 0 ? ` with ${tempItems.length} items` : ''}`,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create task',
            variant: 'destructive',
          });
        }
      });
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(taskId, {
        onSuccess: () => {
          toast({
            title: t('deletedSuccessfully'),
            description: 'Task deleted',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete task',
            variant: 'destructive',
          });
        }
      });
    }
  };

  // Filter tasks by date range
  const filteredTasks = tasks.filter((task) => {
    if (dateRange.fromDate && dateRange.toDate) {
      const taskDate = new Date(task.created_at).toISOString().split('T')[0];
      if (taskDate < dateRange.fromDate || taskDate > dateRange.toDate) {
        return false;
      }
    }
    return true;
  });

  // Filter riders by date range
  const filteredRiders = riders.filter((rider) => {
    if (dateRange.fromDate && dateRange.toDate) {
      const riderDate = new Date(rider.created_at).toISOString().split('T')[0];
      if (riderDate < dateRange.fromDate || riderDate > dateRange.toDate) {
        return false;
      }
    }
    return true;
  });

  const activeTasks = filteredTasks.filter(t => t.status !== 'delivered');
  const completedTasks = filteredTasks.filter(t => t.status === 'delivered');

  if (ridersLoading || tasksLoading) {
    return (
      <MainLayout title={t('goods')}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('goods')}>
      <div className="space-y-6">
        <PageHeader title={t('goods')} description={t('goodsDescription')}>
          <Button variant="outline" size="sm" onClick={() => handleOpenRiderDialog()}>
            <User className="h-4 w-4 mr-2" />
            {t('addRider')}
          </Button>
          <Button onClick={() => handleOpenTaskDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addTask')}
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="stats-card border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalRiders')}</p>
                  <p className="text-2xl font-bold">{riders.length}</p>
                </div>
                <User className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="stats-card border-l-4 border-l-warning">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('activeTasks')}</p>
                  <p className="text-2xl font-bold">{activeTasks.length}</p>
                </div>
                <Truck className="h-8 w-8 text-warning opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="stats-card border-l-4 border-l-success">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('completedTasks')}</p>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter 
          onDateChange={setDateRange}
          defaultRange="last7days"
        />

        {/* Tabs for Goods and Riders */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 gap-1">
            <TabsTrigger 
              value="goods" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
            >
              {t('goods')}
            </TabsTrigger>
            <TabsTrigger 
              value="riders"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
            >
              Riders
            </TabsTrigger>
          </TabsList>

          {/* Goods Tab */}
          <TabsContent value="goods" className="space-y-4">

            {/* Tasks Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header hover:bg-table-header">
                      <TableHead>{t('riderName')}</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Customer Name</TableHead>
                      <TableHead className="text-center">{t('date')}</TableHead>
                      <TableHead className="text-center">Total Boxes</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                      <TableHead className="text-center">Remaining</TableHead>
                      <TableHead className="text-center">{t('status')}</TableHead>
                      <TableHead className="text-center">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t('noDataFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => {
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.rider_name || 'N/A'}</TableCell>
                            <TableCell>{task.customer_name || 'N/A'}</TableCell>
                            <TableCell className="text-center font-mono">{task.task_number || 'N/A'}</TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center font-mono">{task.total_boxes || 0}</TableCell>
                            <TableCell className="text-center font-mono text-success">{task.delivered_boxes || 0}</TableCell>
                            <TableCell className="text-center font-mono text-warning">{task.remaining_boxes || 0}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                task.status === 'delivered' ? 'badge-paid' : 
                                task.status === 'partially_delivered' ? 'badge-partial' : 
                                task.status === 'cancelled' ? 'badge-inactive' :
                                task.status === 'in_transit' ? 'badge-warning' :
                                'badge-due'
                              )}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleOpenTaskDialog(task)}
                                  title="Edit Task"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete Task"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Riders Tab */}
          <TabsContent value="riders" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header hover:bg-table-header">
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>Name (Urdu)</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>Vehicle Type</TableHead>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead className="text-center">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRiders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('noDataFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRiders.map((rider) => (
                        <TableRow key={rider.id}>
                          <TableCell className="font-medium">{rider.name}</TableCell>
                          <TableCell dir="rtl">{rider.name_urdu || '-'}</TableCell>
                          <TableCell>{rider.phone || '-'}</TableCell>
                          <TableCell>{rider.email || '-'}</TableCell>
                          <TableCell>{rider.vehicle_type || '-'}</TableCell>
                          <TableCell>{rider.vehicle_number || '-'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleOpenRiderDialog(rider)}
                                title="Edit Rider"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteRider(rider.id)}
                                title="Delete Rider"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rider Dialog */}
        <Dialog open={riderDialogOpen} onOpenChange={setRiderDialogOpen}>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRider ? t('edit') + ' Rider' : t('addRider')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('name')} *</Label>
                    <Input
                      value={riderForm.name}
                      onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })}
                      placeholder="Enter rider name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (Urdu)</Label>
                    <Input
                      value={riderForm.name_urdu}
                      onChange={(e) => setRiderForm({ ...riderForm, name_urdu: e.target.value })}
                      placeholder="نام درج کریں"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('phone')}</Label>
                    <Input
                      value={riderForm.phone}
                      onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value })}
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input
                      type="email"
                      value={riderForm.email}
                      onChange={(e) => setRiderForm({ ...riderForm, email: e.target.value })}
                      placeholder="rider@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Input
                      value={riderForm.vehicle_type}
                      onChange={(e) => setRiderForm({ ...riderForm, vehicle_type: e.target.value })}
                      placeholder="e.g., Motorcycle, Car, Van"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Number</Label>
                    <Input
                      value={riderForm.vehicle_number}
                      onChange={(e) => setRiderForm({ ...riderForm, vehicle_number: e.target.value })}
                      placeholder="e.g., ABC-123"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setRiderDialogOpen(false)} className="flex-1">
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleSaveRider} className="flex-1">
                    {t('save')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Delete Rider</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">This action cannot be undone</p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium mb-2">You are about to delete:</p>
                <p className="text-base font-semibold text-foreground">{riderToDelete?.name}</p>
                
                {riderToDelete && riderToDelete.tasksCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-destructive">Warning:</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This rider has <span className="font-bold text-foreground">{riderToDelete.tasksCount} task(s)</span> assigned.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          All {riderToDelete.tasksCount} task(s) will be <span className="font-bold text-destructive">permanently deleted</span> along with this rider.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setRiderToDelete(null);
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteRider} 
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {riderToDelete && riderToDelete.tasksCount > 0 ? 'All' : 'Rider'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>{editingTask ? t('edit') : t('addTask')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('selectRider')} *</Label>
                <Select value={taskForm.riderId} onValueChange={(value) => setTaskForm({ ...taskForm, riderId: value })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('selectRider')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {riders.map((rider) => (
                      <SelectItem key={rider.id} value={rider.id}>
                        {rider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label><MapPin className="h-4 w-4 inline mr-1" />Location *</Label>
                <Input
                  value={taskForm.taskName}
                  onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                  placeholder="e.g., Karachi, Lahore, Main Market"
                />
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={taskForm.taskNumber}
                  onChange={(e) => setTaskForm({ ...taskForm, taskNumber: e.target.value })}
                  placeholder="e.g., Ali Traders"
                />
              </div>

              {/* Boxes Section */}
              <div className="space-y-2 border-t pt-4">
                <Label>Add Items / Boxes (Optional)</Label>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Boxes */}
                  <div className="space-y-1">
                    <Label htmlFor="totalBoxes" className="text-xs">Total Boxes</Label>
                    <Input
                      id="totalBoxes"
                      type="number"
                      min="0"
                      value={totalBoxes}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = inputValue === '' ? 0 : Math.max(0, parseInt(inputValue, 10) || 0);
                        setTotalBoxes(value);
                        // Auto-calculate remaining
                        const remaining = value - deliveredBoxes;
                        setRemainingBoxes(Math.max(0, remaining));
                        // Ensure delivered doesn't exceed total
                        if (deliveredBoxes > value) {
                          setDeliveredBoxes(value);
                          setRemainingBoxes(0);
                        }
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>

                  {/* Delivered Boxes */}
                  <div className="space-y-1">
                    <Label htmlFor="deliveredBoxes" className="text-xs">Delivered Boxes</Label>
                    <Input
                      id="deliveredBoxes"
                      type="number"
                      min="0"
                      max={totalBoxes}
                      value={deliveredBoxes}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = inputValue === '' ? 0 : Math.max(0, parseInt(inputValue, 10) || 0);
                        // Prevent exceeding total
                        const delivered = Math.min(value, totalBoxes);
                        setDeliveredBoxes(delivered);
                        // Auto-calculate remaining
                        setRemainingBoxes(Math.max(0, totalBoxes - delivered));
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>

                  {/* Remaining Boxes (editable with manual override) */}
                  <div className="space-y-1">
                    <Label htmlFor="remainingBoxes" className="text-xs">Remaining Boxes</Label>
                    <Input
                      id="remainingBoxes"
                      type="number"
                      min="0"
                      value={remainingBoxes}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = inputValue === '' ? 0 : Math.max(0, parseInt(inputValue, 10) || 0);
                        setRemainingBoxes(value);
                        // Optional: Update delivered when remaining is manually changed
                        // Keep this disabled for now to allow full manual control
                      }}
                      placeholder="0"
                      className="h-9 bg-muted/50"
                    />
                  </div>
                </div>
                
                {/* Validation hints */}
                {deliveredBoxes > totalBoxes && (
                  <p className="text-xs text-destructive">
                    Delivered boxes cannot exceed total boxes
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="flex-1">
                  {t('cancel')}
                </Button>
                <Button onClick={handleSaveTask} className="flex-1">
                  {t('save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Items Dialog */}
        <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
          <DialogContent className="bg-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Manage Items - {selectedTaskForItems?.task_number}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Total Boxes</p>
                  <p className="text-2xl font-bold">{selectedTaskForItems?.total_boxes || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold text-success">{selectedTaskForItems?.delivered_boxes || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold text-warning">{selectedTaskForItems?.remaining_boxes || 0}</p>
                </div>
              </div>

              {/* Add New Item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter box/item name (e.g., Box 1, Package A)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Items List (Todo-style checklist) */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {taskItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No items added yet</p>
                    <p className="text-xs">Add boxes or items above to track delivery progress</p>
                  </div>
                ) : (
                  taskItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.is_delivered ? 'bg-success/10 border-success/20' : 'bg-background'
                      }`}
                    >
                      <Checkbox
                        checked={item.is_delivered === 1}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${item.is_delivered ? 'line-through text-muted-foreground' : ''}`}>
                          {item.item_name}
                        </p>
                        {item.delivered_at && (
                          <p className="text-xs text-muted-foreground">
                            Delivered: {new Date(item.delivered_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {item.is_delivered === 1 && (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteItem(item.id, item.task_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setItemsDialogOpen(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
