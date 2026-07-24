/**
 * Goods Tasks Repository
 * Manages delivery tasks and tracking for goods module
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface GoodsTask {
  id: string;
  task_number: string;
  task_date: string;
  rider_id: string;
  rider_name: string;
  customer_id?: string;
  customer_name?: string;
  sale_id?: string;
  invoice_number?: string;
  pickup_address?: string;
  delivery_address: string;
  description?: string;
  amount: number;
  total_boxes: number;
  delivered_boxes: number;
  remaining_boxes: number;
  status: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  task_id: string;
  item_name: string;
  description?: string;
  is_delivered: number;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGoodsTaskInput {
  id: string;
  task_number: string;
  task_date: string;
  rider_id: string;
  rider_name: string;
  customer_id?: string;
  customer_name?: string;
  sale_id?: string;
  invoice_number?: string;
  pickup_address?: string;
  delivery_address: string;
  description?: string;
  amount?: number;
  total_boxes?: number;
  delivered_boxes?: number;
  remaining_boxes?: number;
  status?: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assigned_at?: string;
  notes?: string;
}

export interface CreateTaskItemInput {
  id: string;
  task_id: string;
  item_name: string;
  description?: string;
  notes?: string;
}

export interface UpdateGoodsTaskInput {
  task_date?: string;
  rider_id?: string;
  rider_name?: string;
  customer_id?: string;
  customer_name?: string;
  pickup_address?: string;
  delivery_address?: string;
  description?: string;
  amount?: number;
  total_boxes?: number;
  delivered_boxes?: number;
  remaining_boxes?: number;
  status?: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

export interface UpdateTaskItemInput {
  item_name?: string;
  description?: string;
  is_delivered?: number;
  delivered_at?: string;
  notes?: string;
}

export class GoodsTasksRepository extends BaseRepository<GoodsTask> {
  constructor(db: Database) {
    super(db, 'goods_tasks');
  }

  /**
   * Get all tasks with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<GoodsTask[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Create a new task
   */
  async create(data: CreateGoodsTaskInput): Promise<string> {
    const taskData = {
      ...data,
      amount: data.amount || 0,
      status: data.status || 'pending',
      priority: data.priority || 'normal',
      assigned_at: data.assigned_at || new Date().toISOString(),
    };

    await super.create(taskData);
    return data.id;
  }

  /**
   * Update task details
   */
  async update(id: string, data: UpdateGoodsTaskInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Delete task (hard delete - goods_tasks table doesn't support 'inactive' status)
   * Always uses hard delete regardless of soft parameter
   */
  async delete(id: string, soft = false): Promise<boolean> {
    // Force hard delete for goods_tasks table (status constraint doesn't allow 'inactive')
    return super.delete(id, false);
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: 'pending' | 'in_transit' | 'partially_delivered' | 'delivered' | 'cancelled'): Promise<boolean> {
    try {
      const updateData: any = { status };

      // Set timestamps based on status
      if (status === 'in_transit' && !updateData.started_at) {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'delivered' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      return this.update(id, updateData);
    } catch (error) {
      throw new Error(`Error updating task status: ${error}`);
    }
  }

  /**
   * Update task delivery progress
   * Auto-calculates remaining boxes and updates status
   */
  async updateDeliveryProgress(
    id: string,
    totalBoxes: number,
    deliveredBoxes: number
  ): Promise<boolean> {
    const remainingBoxes = totalBoxes - deliveredBoxes;
    
    let status: GoodsTask['status'];
    if (deliveredBoxes === 0) {
      status = 'pending';
    } else if (remainingBoxes === 0) {
      status = 'delivered';
    } else {
      status = 'partially_delivered';
    }

    return this.update(id, {
      total_boxes: totalBoxes,
      delivered_boxes: deliveredBoxes,
      remaining_boxes: remainingBoxes,
      status,
      ...(status === 'delivered' ? { completed_at: new Date().toISOString() } : {}),
    });
  }

  /**
   * Start a task (mark as in_transit)
   */
  async startTask(id: string): Promise<boolean> {
    return this.updateStatus(id, 'in_transit');
  }

  /**
   * Complete a task (mark as delivered)
   */
  async completeTask(id: string): Promise<boolean> {
    return this.updateStatus(id, 'delivered');
  }

  /**
   * Cancel a task
   */
  async cancelTask(id: string): Promise<boolean> {
    return this.updateStatus(id, 'cancelled');
  }

  /**
   * Get tasks by rider
   */
  async getByRider(riderId: string, options?: QueryOptions): Promise<GoodsTask[]> {
    return this.getAll({
      filters: { rider_id: riderId },
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get tasks by customer
   */
  async getByCustomer(customerId: string, options?: QueryOptions): Promise<GoodsTask[]> {
    return this.getAll({
      filters: { customer_id: customerId },
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get tasks by sale
   */
  async getBySale(saleId: string): Promise<GoodsTask[]> {
    return this.getManyByField('sale_id', saleId);
  }

  /**
   * Get tasks by status
   */
  async getByStatus(status: 'pending' | 'in_transit' | 'delivered' | 'cancelled', options?: QueryOptions): Promise<GoodsTask[]> {
    return this.getAll({
      filters: { status },
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(): Promise<GoodsTask[]> {
    return this.getByStatus('pending');
  }

  /**
   * Get in-transit tasks
   */
  async getInTransitTasks(): Promise<GoodsTask[]> {
    return this.getByStatus('in_transit');
  }

  /**
   * Get tasks by priority
   */
  async getByPriority(priority: 'low' | 'normal' | 'high' | 'urgent', options?: QueryOptions): Promise<GoodsTask[]> {
    return this.getAll({
      filters: { priority },
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get high priority pending tasks
   */
  async getHighPriorityPendingTasks(): Promise<GoodsTask[]> {
    try {
      const sql = `
        SELECT * FROM goods_tasks 
        WHERE status = 'pending' AND priority IN ('high', 'urgent')
        ORDER BY 
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
          END,
          task_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as GoodsTask[];
    } catch (error) {
      throw new Error(`Error fetching high priority pending tasks: ${error}`);
    }
  }

  /**
   * Get tasks by date range
   */
  async getTasksByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<GoodsTask[]> {
    return super.getByDateRange('task_date', startDate, endDate, {
      sort: { field: 'task_date', order: 'DESC' },
      ...options,
    });
  }

  /**
   * Get next task number
   */
  async getNextTaskNumber(): Promise<string> {
    try {
      const sql = `
        SELECT task_number 
        FROM goods_tasks 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get() as { task_number: string } | undefined;

      if (!result) {
        return 'TASK-0001';
      }

      // Extract number from task (assuming format TASK-XXXX)
      const match = result.task_number.match(/\d+$/);
      if (match) {
        const nextNum = parseInt(match[0]) + 1;
        return `TASK-${nextNum.toString().padStart(4, '0')}`;
      }

      return 'TASK-0001';
    } catch (error) {
      throw new Error(`Error generating next task number: ${error}`);
    }
  }

  /**
   * Get task summary for a date range
   */
  async getTaskSummary(startDate: string, endDate: string): Promise<{
    totalTasks: number;
    pendingTasks: number;
    inTransitTasks: number;
    deliveredTasks: number;
    cancelledTasks: number;
    totalAmount: number;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_tasks,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_tasks,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks,
          COALESCE(SUM(amount), 0) as total_amount
        FROM goods_tasks
        WHERE task_date >= ? AND task_date <= ?
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(startDate, endDate) as {
        total_tasks: number;
        pending_tasks: number;
        in_transit_tasks: number;
        delivered_tasks: number;
        cancelled_tasks: number;
        total_amount: number;
      };

      return {
        totalTasks: result.total_tasks,
        pendingTasks: result.pending_tasks,
        inTransitTasks: result.in_transit_tasks,
        deliveredTasks: result.delivered_tasks,
        cancelledTasks: result.cancelled_tasks,
        totalAmount: result.total_amount,
      };
    } catch (error) {
      throw new Error(`Error calculating task summary: ${error}`);
    }
  }

  /**
   * Get daily task report for a date range
   */
  async getDailyTaskReport(startDate: string, endDate: string): Promise<{
    date: string;
    totalTasks: number;
    deliveredTasks: number;
    totalAmount: number;
  }[]> {
    try {
      const sql = `
        SELECT 
          task_date as date,
          COUNT(*) as totalTasks,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredTasks,
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0) as totalAmount
        FROM goods_tasks
        WHERE task_date >= ? AND task_date <= ?
        GROUP BY task_date
        ORDER BY task_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(startDate, endDate) as {
        date: string;
        totalTasks: number;
        deliveredTasks: number;
        totalAmount: number;
      }[];
    } catch (error) {
      throw new Error(`Error generating daily task report: ${error}`);
    }
  }

  /**
   * Search tasks by task number, customer name, or description
   */
  async search(searchTerm: string): Promise<GoodsTask[]> {
    return super.search(searchTerm, ['task_number', 'customer_name', 'invoice_number', 'description'], {
      sort: { field: 'task_date', order: 'DESC' },
    });
  }

  /**
   * Get task by task number
   */
  async getByTaskNumber(taskNumber: string): Promise<GoodsTask | null> {
    return this.getByField('task_number', taskNumber);
  }

  /**
   * Get rider's current workload (active tasks)
   */
  async getRiderWorkload(riderId: string): Promise<{
    pendingCount: number;
    inTransitCount: number;
    totalActiveCount: number;
  }> {
    try {
      const sql = `
        SELECT 
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count
        FROM goods_tasks
        WHERE rider_id = ? AND status IN ('pending', 'in_transit')
      `;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(riderId) as {
        pending_count: number;
        in_transit_count: number;
      };

      return {
        pendingCount: result.pending_count,
        inTransitCount: result.in_transit_count,
        totalActiveCount: result.pending_count + result.in_transit_count,
      };
    } catch (error) {
      throw new Error(`Error calculating rider workload: ${error}`);
    }
  }

  /**
   * Assign task to a different rider
   */
  async reassignTask(taskId: string, newRiderId: string, newRiderName: string): Promise<boolean> {
    return this.update(taskId, {
      rider_id: newRiderId,
      rider_name: newRiderName,
    });
  }

  /**
   * Get overdue tasks (pending/in_transit but task_date is in the past)
   */
  async getOverdueTasks(): Promise<GoodsTask[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sql = `
        SELECT * FROM goods_tasks 
        WHERE status IN ('pending', 'in_transit') AND task_date < ?
        ORDER BY task_date ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all(today) as GoodsTask[];
    } catch (error) {
      throw new Error(`Error fetching overdue tasks: ${error}`);
    }
  }
}
