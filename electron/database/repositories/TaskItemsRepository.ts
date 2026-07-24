/**
 * Task Items Repository
 * Manages individual items/boxes for goods tasks with todo-style tracking
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

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

export interface CreateTaskItemInput {
  id: string;
  task_id: string;
  item_name: string;
  description?: string;
  notes?: string;
}

export interface UpdateTaskItemInput {
  item_name?: string;
  description?: string;
  is_delivered?: number;
  delivered_at?: string;
  notes?: string;
}

export class TaskItemsRepository extends BaseRepository<TaskItem> {
  constructor(db: Database) {
    super(db, 'goods_task_items');
  }

  /**
   * Get all items for a task
   */
  async getByTaskId(taskId: string): Promise<TaskItem[]> {
    return this.getAll({
      filters: { task_id: taskId },
      sort: { field: 'created_at', order: 'ASC' },
    });
  }

  /**
   * Get delivered items count for a task
   */
  async getDeliveredCount(taskId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM goods_task_items WHERE task_id = ? AND is_delivered = 1`;
    const stmt = this.db.prepare(sql);
    const result = stmt.get(taskId) as { count: number };
    return result.count || 0;
  }

  /**
   * Get total items count for a task
   */
  async getTotalCount(taskId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM goods_task_items WHERE task_id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.get(taskId) as { count: number };
    return result.count || 0;
  }

  /**
   * Mark item as delivered
   */
  async markAsDelivered(id: string): Promise<boolean> {
    return this.update(id, {
      is_delivered: 1,
      delivered_at: new Date().toISOString(),
    });
  }

  /**
   * Mark item as not delivered (uncheck)
   */
  async markAsNotDelivered(id: string): Promise<boolean> {
    return this.update(id, {
      is_delivered: 0,
      delivered_at: undefined,
    });
  }

  /**
   * Toggle delivery status
   */
  async toggleDeliveryStatus(id: string): Promise<boolean> {
    const item = await this.getById(id);
    if (!item) return false;

    if (item.is_delivered === 1) {
      return this.markAsNotDelivered(id);
    } else {
      return this.markAsDelivered(id);
    }
  }

  /**
   * Delete all items for a task
   */
  async deleteByTaskId(taskId: string): Promise<number> {
    const sql = `DELETE FROM goods_task_items WHERE task_id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(taskId);
    return result.changes;
  }

  /**
   * Create item (override to handle default values)
   */
  async create(input: CreateTaskItemInput): Promise<string> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO goods_task_items (id, task_id, item_name, description, is_delivered, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `;
    
    const stmt = this.db.prepare(sql);
    stmt.run(
      input.id,
      input.task_id,
      input.item_name,
      input.description || null,
      input.notes || null,
      now,
      now
    );

    return input.id;
  }

  /**
   * Update item
   */
  async update(id: string, input: UpdateTaskItemInput): Promise<boolean> {
    const item = await this.getById(id);
    if (!item) return false;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.item_name !== undefined) {
      updates.push('item_name = ?');
      values.push(input.item_name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.is_delivered !== undefined) {
      updates.push('is_delivered = ?');
      values.push(input.is_delivered);
    }
    if (input.delivered_at !== undefined) {
      updates.push('delivered_at = ?');
      values.push(input.delivered_at);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    if (updates.length === 0) return true;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `UPDATE goods_task_items SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...values);

    return result.changes > 0;
  }
}
