import React, { useState, useEffect, useRef } from 'react';
import { AuditData, SmartGoal, VisionBoardItem, Habit, AppView } from './types';
import { Welcome } from './views/Welcome';
import { Audit } from './views/Audit';
import { Planning } from './views/Planning';
import { Dashboard } from './views/Dashboard';
import { Login } from './views/Login';
import { TrialExpired } from './views/TrialExpired';
import { LogOut } from 'lucide-react';
import { MobileNav } from './components/MobileNav';

const INITIAL_AUDIT: AuditData = {
  sentiment: 50,
  currentIdentity: '',
  desiredIdentity: '',
  mainObstacles: '',
  whyItMatters: '',
  manifesto: ''
};

// 7 Days in milliseconds
const TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000;

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(7);
  const [view, setView] = useState<AppView>('login');
  
  const [audit, setAudit] = useState<AuditData>(INITIAL_AUDIT);
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [visionBoard, setVisionBoard] = useState<VisionBoardItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Track last notification time to avoid spamming in the same minute
  const lastCheckedMinute = useRef<string | null>(null);

  // Check for active session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('tododia_current_user');
    const savedEmail = localStorage.getItem('tododia_current_email');
    
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedEmail) setCurrentEmail(savedEmail);
      
      // Check Trial Status
      const startDateStr = localStorage.getItem(`tododia_${savedUser}_start_date`);
      if (startDateStr) {
        const startDate = parseInt(startDateStr, 10);
        const now = Date.now();
        const elapsed = now - startDate;
        
        if (elapsed > TRIAL_DURATION) {
          setView('expired');
          setIsDataLoaded(true); // Stop loading to show expired view
          return;
        } else {
          const daysLeft = Math.ceil((TRIAL_DURATION - elapsed) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(daysLeft);
        }
      }

      loadUserData(savedUser);
    } else {
      setView('login');
    }
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (!currentUser || !isDataLoaded || view === 'expired') return;
    
    const prefix = `tododia_${currentUser}`;
    localStorage.setItem(`${prefix}_audit`, JSON.stringify(audit));
    localStorage.setItem(`${prefix}_goals`, JSON.stringify(goals));
    localStorage.setItem(`${prefix}_vision`, JSON.stringify(visionBoard));
    localStorage.setItem(`${prefix}_habits`, JSON.stringify(habits));
  }, [audit, goals, visionBoard, habits, currentUser, isDataLoaded, view]);

  // Reminder System Polling
  useEffect(() => {
    const checkReminders = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      
      const now = new Date();
      const currentMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      // Avoid double check in same minute
      if (lastCheckedMinute.current === currentMinute) return;
      lastCheckedMinute.current = currentMinute;

      habits.forEach(habit => {
        // If habit has a time, matches current time, and NOT completed today
        if (habit.reminderTime === currentMinute && !habit.completedDates.includes(today)) {
          new Notification('Todo Dia: Lembrete', {
            body: `Hora de: ${habit.title}`,
            icon: '/icon.png' // Fallback icon
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [habits]);

  const loadUserData = (username: string) => {
    const prefix = `tododia_${username}`;
    const savedAudit = localStorage.getItem(`${prefix}_audit`);
    const savedGoals = localStorage.getItem(`${prefix}_goals`);
    const savedVision = localStorage.getItem(`${prefix}_vision`);
    const savedHabits = localStorage.getItem(`${prefix}_habits`);

    if (savedAudit) {
      const parsedAudit = JSON.parse(savedAudit);
      setAudit({ ...INITIAL_AUDIT, ...parsedAudit });
    } else {
      setAudit(INITIAL_AUDIT);
    }
    
    setGoals(savedGoals ? JSON.parse(savedGoals) : []);
    setVisionBoard(savedVision ? JSON.parse(savedVision) : []);
    setHabits(savedHabits ? JSON.parse(savedHabits) : []);
    
    setIsDataLoaded(true);
    
    // Determine initial view based on data existence
    // Check if view was already set to expired in the first useEffect
    setView(prev => {
        if (prev === 'expired') return 'expired';
        if (savedGoals && JSON.parse(savedGoals).length > 0) return 'dashboard';
        return 'welcome';
    });
  };

  const handleLogin = (username: string, email: string, initialHabits?: string[]) => {
    localStorage.setItem('tododia_current_user', username);
    localStorage.setItem('tododia_current_email', email);
    
    // Initialize Trial Date if not exists
    if (!localStorage.getItem(`tododia_${username}_start_date`)) {
        localStorage.setItem(`tododia_${username}_start_date`, Date.now().toString());
    }

    setCurrentUser(username);
    setCurrentEmail(email);

    // If there are initial habits selected from login screen
    if (initialHabits && initialHabits.length > 0) {
      const prefix = `tododia_${username}`;
      const savedHabitsStr = localStorage.getItem(`${prefix}_habits`);
      let currentHabits: Habit[] = savedHabitsStr ? JSON.parse(savedHabitsStr) : [];
      
      const newHabitObjects = initialHabits
        .filter(title => !currentHabits.some(h => h.title === title)) // Avoid duplicates
        .map(title => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title,
          completedDates: [],
          streak: 0
        }));
      
      const mergedHabits = [...currentHabits, ...newHabitObjects];
      localStorage.setItem(`${prefix}_habits`, JSON.stringify(mergedHabits));
    }

    loadUserData(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('tododia_current_user');
    // We do NOT clear the trial start date, so logging out doesn't reset the 7 days.
    setCurrentUser(null);
    setCurrentEmail(null);
    setAudit(INITIAL_AUDIT);
    setGoals([]);
    setVisionBoard([]);
    setHabits([]);
    setIsDataLoaded(false);
    setView('login');
  };

  const handleAuditSave = (data: AuditData) => {
    setAudit(data);
    setView('planning');
  };

  const handleGoalSave = (goal: SmartGoal) => {
    setGoals(prev => {
      const exists = prev.find(g => g.id === goal.id);
      if (exists) {
        return prev.map(g => g.id === goal.id ? goal : g);
      }
      return [...prev, goal];
    });
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleUpdateProgress = (id: string, newVal: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        if (g.kpiCurrent === newVal) return g;
        
        const newHistory = [
          ...(g.history || []), 
          { date: new Date().toISOString(), value: newVal }
        ];

        return { 
          ...g, 
          kpiCurrent: newVal,
          history: newHistory
        };
      }
      return g;
    }));
  };

  // Habit Logic
  const handleAddHabit = (title: string, time?: string) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      completedDates: [],
      streak: 0,
      reminderTime: time
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const handleToggleHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const isCompletedToday = h.completedDates.includes(today);
        let newCompletedDates;
        
        if (isCompletedToday) {
          newCompletedDates = h.completedDates.filter(d => d !== today);
        } else {
          newCompletedDates = [...h.completedDates, today].sort();
        }

        // Recalculate Streak
        let streak = 0;
        const sortedDates = [...newCompletedDates].sort().reverse();
        
        if (sortedDates.length > 0) {
           const checkDate = new Date();
           let dateStr = checkDate.toISOString().split('T')[0];
           
           if (!newCompletedDates.includes(dateStr)) {
             checkDate.setDate(checkDate.getDate() - 1);
             dateStr = checkDate.toISOString().split('T')[0];
           }

           while (newCompletedDates.includes(dateStr)) {
             streak++;
             checkDate.setDate(checkDate.getDate() - 1);
             dateStr = checkDate.toISOString().split('T')[0];
           }
        }

        return {
          ...h,
          completedDates: newCompletedDates,
          streak
        };
      }
      return h;
    }));
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const hasData = goals.length > 0 || !!audit.manifesto;

  const renderView = () => {
    if (view === 'expired') return <TrialExpired onExport={() => {}} />;
    if (!currentUser) return <Login onLogin={handleLogin} />;

    switch(view) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'welcome':
        return <Welcome onStart={() => setView('audit')} hasData={hasData} onContinue={() => setView('dashboard')} />;
      case 'audit':
        return <Audit initialData={audit} onSave={handleAuditSave} />;
      case 'planning':
        return <Planning 
          goals={goals} 
          onSaveGoal={handleGoalSave} 
          onDeleteGoal={handleDeleteGoal}
          onFinish={() => setView('dashboard')} 
        />;
      case 'dashboard':
        return <Dashboard 
          goals={goals} 
          audit={audit} 
          visionBoard={visionBoard}
          habits={habits}
          userName={currentUser}
          daysLeft={trialDaysLeft}
          onUpdateGoalProgress={handleUpdateProgress}
          onAddVisionItem={(item) => setVisionBoard(prev => [...prev, item])}
          onRemoveVisionItem={(id) => setVisionBoard(prev => prev.filter(i => i.id !== id))}
          onAddHabit={handleAddHabit}
          onToggleHabit={handleToggleHabit}
          onDeleteHabit={handleDeleteHabit}
          onEditConfig={() => setView('planning')}
        />;
      default:
        return <Welcome onStart={() => setView('audit')} hasData={hasData} onContinue={() => setView('dashboard')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 font-sans pb-20 md:pb-0">
      {currentUser && view !== 'expired' && (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => setView('welcome')}
            >
              <div className="w-8 h-8 rounded-lg bg-[#FF6F91] flex items-center justify-center text-white font-bold font-serif">T</div>
              <span className="font-serif font-bold text-lg tracking-tight hidden sm:block">Todo Dia</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs text-gray-400">Teste Grátis</span>
                    <span className="text-xs font-bold text-[#FF6F91]">{trialDaysLeft} dias restantes</span>
                </div>
               <span className="text-sm text-gray-400 hidden sm:block">Olá, <strong className="text-gray-600">{currentUser}</strong></span>
               <button 
                 onClick={handleLogout}
                 className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                 title="Sair"
               >
                 <LogOut size={18} />
               </button>
            </div>
          </div>
        </header>
      )}

      <main className="animate-fade-in">
        {renderView()}
      </main>

      {currentUser && view !== 'welcome' && view !== 'expired' && (
        <MobileNav currentView={view} onChangeView={setView} />
      )}
    </div>
  );
}

export default App;