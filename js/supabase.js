const SUPABASE_URL = 'https://fhogtdagkawptvzmyvku.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob2d0ZGFna2F3cHR2em15dmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzg2NDEsImV4cCI6MjA5MDk1NDY0MX0.UnFnKkUJsOR4CfLZ2-0R0_k9_Mt3h0B3EiQXmRw6n9A';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const api = {
  async getAllMemoDates() {
    try {
      const { data, error } = await supabaseClient
        .from('daily_memos')
        .select('date')
        .neq('content', '');
      
      if (error) throw error;
      return (data || []).map(row => row.date);
    } catch (e) {
      console.error(e);
      return [];
    }
  },



  async getDailyMemo(dateStr) {
    try {
      const { data, error } = await supabaseClient
        .from('daily_memos')
        .select('content')
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;
      return data || { content: '' };
    } catch (e) {
      console.error(e);
      return { content: '' };
    }
  },

  async saveDailyMemo(dateStr, content) {
    try {
      const { error } = await supabaseClient
        .from('daily_memos')
        .upsert({
          date: dateStr,
          content: content || '',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  async addTaskWithDate(description, dueDate, taskDate) {
    try {
      const now = new Date();
      let createdAt = taskDate ? new Date(taskDate) : now;
      if (taskDate) {
        createdAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }

      const { error } = await supabaseClient
        .from('tasks')
        .insert({
          description: description,
          due_date: dueDate || null,
          created_at: createdAt.toISOString(),
          status: '진행중',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  async updateTaskStatus(taskId, newStatus) {
    try {
      const { error } = await supabaseClient
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  async updateTaskContent(taskId, newDescription) {
    try {
      const { error } = await supabaseClient
        .from('tasks')
        .update({
          description: newDescription,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  async deleteTask(taskId) {
    try {
      const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('task_id', taskId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  async getTasksByDateRange(startIso, endIso) {
    try {
      const { data, error } = await supabaseClient
        .from('tasks')
        .select()
        .gte('created_at', startIso)
        .lt('created_at', endIso);

      if (error) throw error;
      return this._sortTasks(data || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async getTasksByDate(dateStr) {
    try {
      const targetDate = new Date(dateStr);
      const s = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const e = new Date(s.getTime() + 86400000);

      const { data, error } = await supabaseClient
        .from('tasks')
        .select()
        .gte('created_at', s.toISOString())
        .lt('created_at', e.toISOString());

      if (error) throw error;
      return this._sortTasks(data || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async searchTasks(keyword) {
    try {
      if (!keyword) return [];
      
      const { data, error } = await supabaseClient
        .from('tasks')
        .select()
        .ilike('description', `%${keyword}%`);

      if (error) throw error;
      return this._sortTasks(data || []);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  _sortTasks(tasks) {
    return tasks.sort((a, b) => 
      String(a.description).localeCompare(String(b.description), undefined, { numeric: true })
    );
  }
};
