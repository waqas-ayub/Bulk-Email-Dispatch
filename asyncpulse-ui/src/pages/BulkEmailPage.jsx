import { useState } from 'react';
import { Mail, Users, Send, Clock } from 'lucide-react';
import BulkEmailForm from '../components/BulkEmailForm';
import TaskStatusCard from '../components/TaskStatusCard';
import StatBadge from '../components/StatBadge';

export default function BulkEmailPage() {
  const [currentTask, setCurrentTask] = useState(null);

  const handleTaskQueued = (response) => {
    setCurrentTask({
      task_id: response.task_id,
      recipients: response.recipients,
      subject: response.subject || '',
    });
  };

  return (
    <div className="min-h-screen bg-bg bg-grid bg-radial-glow">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-info" />
            <h1 className="text-3xl font-bold tracking-tight text-gradient">
              Bulk Email Dispatch
            </h1>
          </div>
          <p className="text-sm text-white/50 ml-4 max-w-2xl">
            Queue high-volume email campaigns via Celery workers. Track delivery
            status in real time — powered by Redis and Django REST.
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <StatBadge
            label="Queue Status"
            value="Healthy"
            icon={Clock}
            accent="success"
          />
          <StatBadge
            label="Rate Limit"
            value="5/min"
            icon={Send}
            accent="primary"
          />
          <StatBadge
            label="Max Batch"
            value="500"
            icon={Users}
            accent="info"
          />
          <StatBadge
            label="Retries"
            value="3×"
            icon={Mail}
            accent="warning"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <div className="animate-fade-in">
            <BulkEmailForm onTaskQueued={handleTaskQueued} />
          </div>
          <div className="animate-fade-in">
            <TaskStatusCard task={currentTask} />
          </div>
        </div>

        {/* Footer note */}
        <footer className="mt-10 text-center">
          <p className="text-xs text-white/30">
            Built with Django · Celery · Redis · React · Tailwind
          </p>
        </footer>
      </div>
    </div>
  );
}
