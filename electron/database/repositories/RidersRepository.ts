/**
 * Riders Repository
 * Manages delivery riders/drivers for goods tracking module
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository, QueryOptions } from './BaseRepository';

export interface Rider {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRiderInput {
  id: string;
  name: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateRiderInput {
  name?: string;
  name_urdu?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export class RidersRepository extends BaseRepository<Rider> {
  constructor(db: Database) {
    super(db, 'riders');
  }

  /**
   * Get all riders with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<Rider[]> {
    const defaultOptions: QueryOptions = {
      sort: { field: 'name', order: 'ASC' },
      ...options,
    };
    return super.getAll(defaultOptions);
  }

  /**
   * Get active riders only
   */
  async getActiveRiders(): Promise<Rider[]> {
    return this.getAll({
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Create a new rider
   */
  async create(data: CreateRiderInput): Promise<string> {
    const riderData = {
      ...data,
      status: data.status || 'active',
    };

    await super.create(riderData);
    return data.id;
  }

  /**
   * Update rider details
   */
  async update(id: string, data: UpdateRiderInput): Promise<boolean> {
    return super.update(id, data);
  }

  /**
   * Search riders by name or phone
   */
  async search(searchTerm: string): Promise<Rider[]> {
    return super.search(searchTerm, ['name', 'name_urdu', 'phone', 'vehicle_number'], {
      filters: { status: 'active' },
      sort: { field: 'name', order: 'ASC' },
    });
  }

  /**
   * Get rider by phone number
   */
  async getByPhone(phone: string): Promise<Rider | null> {
    return this.getByField('phone', phone);
  }

  /**
   * Get rider with task statistics
   */
  async getWithTaskStats(id: string): Promise<Rider & {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inTransitTasks: number;
  } | null> {
    try {
      const rider = await this.getById(id);
      if (!rider) return null;

      const sql = `
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_tasks
        FROM goods_tasks
        WHERE rider_id = ?
      `;
      const stmt = this.db.prepare(sql);
      const stats = stmt.get(id) as {
        total_tasks: number;
        completed_tasks: number;
        pending_tasks: number;
        in_transit_tasks: number;
      };

      return {
        ...rider,
        totalTasks: stats.total_tasks,
        completedTasks: stats.completed_tasks,
        pendingTasks: stats.pending_tasks,
        inTransitTasks: stats.in_transit_tasks,
      };
    } catch (error) {
      throw new Error(`Error fetching rider with task stats: ${error}`);
    }
  }

  /**
   * Get riders with active task counts
   */
  async getWithActiveTaskCounts(): Promise<(Rider & { activeTaskCount: number })[]> {
    try {
      const sql = `
        SELECT 
          r.*,
          COUNT(CASE WHEN gt.status IN ('pending', 'in_transit') THEN 1 END) as activeTaskCount
        FROM riders r
        LEFT JOIN goods_tasks gt ON r.id = gt.rider_id
        WHERE r.status = 'active'
        GROUP BY r.id
        ORDER BY r.name ASC
      `;
      const stmt = this.db.prepare(sql);
      return stmt.all() as (Rider & { activeTaskCount: number })[];
    } catch (error) {
      throw new Error(`Error fetching riders with active task counts: ${error}`);
    }
  }

  /**
   * Check if rider has any tasks
   */
  async hasTasks(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM goods_tasks WHERE rider_id = ? LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top performing riders by completed tasks
   */
  async getTopPerformers(limit: number = 10, startDate?: string, endDate?: string): Promise<(Rider & {
    completedTasks: number;
    totalAmount: number;
  })[]> {
    try {
      let sql = `
        SELECT 
          r.*,
          COUNT(gt.id) as completedTasks,
          COALESCE(SUM(gt.amount), 0) as totalAmount
        FROM riders r
        LEFT JOIN goods_tasks gt ON r.id = gt.rider_id AND gt.status = 'delivered'
      `;

      const params: any[] = [];

      if (startDate && endDate) {
        sql += ` WHERE gt.completed_at >= ? AND gt.completed_at <= ?`;
        params.push(startDate, endDate);
      }

      sql += `
        GROUP BY r.id
        ORDER BY completedTasks DESC
        LIMIT ?
      `;
      params.push(limit);

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as (Rider & { completedTasks: number; totalAmount: number })[];
    } catch (error) {
      throw new Error(`Error fetching top performing riders: ${error}`);
    }
  }
}
