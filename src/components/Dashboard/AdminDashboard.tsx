import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar
} from 'recharts'
import { 
  DollarSign, 
  Package, 
  ShoppingCart,
  TrendingUp,
  Users, 
  Truck, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  Thermometer,
  Building, 
  Play,
  Pause,
  Database,
  Eraser,
  MessageSquare,
  Edit,
  X,
  Save,
  Eye,
  Camera,
  User,
  Terminal
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import StatsCard from './StatsCard'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [workStarted, setWorkStarted] = useState(false)
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null)
  const [workDuration, setWorkDuration] = useState(0)
  const [inventory, setInventory] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>({})
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [activeWorkLogs, setActiveWorkLogs] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [salesChartData, setSalesChartData] = useState<any[]>([])
  const [clearingDatabase, setClearingDatabase] = useState(false)
  const [editingWorkLog, setEditingWorkLog] = useState<any | null>(null)
  const [showWorkLogModal, setShowWorkLogModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [workLogFormData, setWorkLogFormData] = useState({
    id: '',
    employee_id: '',
    employee_name: '',
    start_time: '',
    end_time: '',
    duration: 0,
    status: 'active' as 'active' | 'completed' | 'cancelled',
    notes: ''
  })
  const [viewingAs, setViewingAs] = useState<'admin' | 'baker' | 'salesperson' | 'driver' | 'partner' | null>(null)
  const [stats, setStats] = useState<any[]>([
    {
      title: 'Napi bevétel',
      value: '0 Ft',
      change: '0% tegnap óta',
      changeType: 'neutral' as const,
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Teljesített rendelések',
      value: '0',
      change: '0 az elmúlt órában',
      changeType: 'neutral' as const,
      icon: CheckCircle,
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Készlet szint',
      value: '0%',
      change: '0 termék alacsony',
      changeType: 'neutral' as const,
      icon: Package,
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Aktív járművek',
      value: '0/0',
      change: '0 szállítás alatt',
      changeType: 'neutral' as const,
      icon: Truck,
      gradient: 'from-purple-500 to-violet-600'
    },
    {
      title: 'Dolgozók száma',
      value: '0',
      change: '0 műszakban',
      changeType: 'neutral' as const,
      icon: Users,
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      title: 'Figyelmeztetések',
      value: '0',
      change: '0 kritikus',
      changeType: 'neutral' as const,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-pink-600'
    }
  ])

  useEffect(() => {
    // Check if there's an active work session
    checkActiveWorkSession()
    loadActiveVehicles()
    loadEmployeeCount()
    loadInventory()
    loadSalesChartData()
    loadOrders()
    loadActiveUsers()
    loadActiveWorkLogs()
    loadDashboardStats()
    
    // Set up timer if work is started
    let timer: NodeJS.Timeout
    if (workStarted && workStartTime) {
      timer = setInterval(() => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - workStartTime.getTime()) / 1000)
        setWorkDuration(diff)
      }, 1000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [workStarted, workStartTime])
  
  // Set up real-time subscription for active users and work logs
  useEffect(() => {
    const userChannel = supabase
      .channel('active-users-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `last_active=gt.${new Date(Date.now() - 15 * 60 * 1000).toISOString()}`
      }, () => {
        loadActiveUsers()
      })
      .subscribe()
      
    const workLogChannel = supabase
      .channel('work-logs-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'work_logs'
      }, () => {
        loadActiveWorkLogs()
      })
      .subscribe()
      
    return () => {
      userChannel.unsubscribe()
      workLogChannel.unsubscribe()
    }
  }, [])
  
  // Set up real-time subscription for active users
  useEffect(() => {
    const userChannel = supabase
      .channel('active-users')
      .on('presence', { event: 'sync' }, () => {
        loadActiveUsers()
      })
      .subscribe()
      
    // Set up real-time subscription for work logs
    const workLogChannel = supabase
      .channel('work-logs')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'work_logs' 
      }, () => {
        loadActiveWorkLogs()
      })
      .subscribe()
      
    return () => {
      userChannel.unsubscribe()
      workLogChannel.unsubscribe()
    }
  }, [])
  
  const editWorkLog = (workLog: any) => {
    setEditingWorkLog(workLog)
    
    // Format dates for datetime-local input
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return format(date, "yyyy-MM-dd'T'HH:mm")
    }
    
    setWorkLogFormData({
      id: workLog.id,
      employee_id: workLog.employee_id,
      employee_name: workLog.profiles?.full_name || 'Ismeretlen',
      start_time: formatDateForInput(workLog.start_time),
      end_time: workLog.end_time ? formatDateForInput(workLog.end_time) : '',
      duration: workLog.duration || 0,
      status: workLog.status,
      notes: workLog.notes || ''
    })
    
    setShowWorkLogModal(true)
  }
  
  const handleWorkLogSubmit = async () => {
    try {
      setLoading(true)
      
      // Calculate duration if both start and end times are provided
      let duration = workLogFormData.duration
      if (workLogFormData.start_time && workLogFormData.end_time) {
        const startTime = new Date(workLogFormData.start_time).getTime()
        const endTime = new Date(workLogFormData.end_time).getTime()
        duration = Math.floor((endTime - startTime) / 1000)
      }
      
      // Update work log
      const { error } = await supabase
        .from('work_logs')
        .update({
          start_time: workLogFormData.start_time,
          end_time: workLogFormData.end_time || null,
          duration: duration,
          status: workLogFormData.status,
          notes: workLogFormData.notes || null
        })
        .eq('id', workLogFormData.id)
      
      if (error) {
        console.error('Error updating work log:', error)
        toast.error('Hiba a munkaidő frissítésekor')
        return
      }
      
      toast.success('Munkaidő sikeresen frissítve!')
      setShowWorkLogModal(false)
      setEditingWorkLog(null)
      loadActiveWorkLogs()
    } catch (error) {
      console.error('Error updating work log:', error)
      toast.error('Hiba a munkaidő frissítésekor')
    } finally {
      setLoading(false)
    }
  }
  
  const loadActiveUsers = async () => {
    try {
      // Get users who have been active in the last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, last_active')
        .gt('last_active', fifteenMinutesAgo)
        .order('last_active', { ascending: false })
      
      if (error) {
        console.error('Error loading active users:', error)
        return
      }
      
      if (data) {
        setActiveUsers(data)
      }
    } catch (error) {
      console.error('Error loading active users:', error)
    }
  }
  
  const loadActiveWorkLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          profiles:employee_id (id, full_name, role)
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
      
      if (error) {
        console.error('Error loading active work logs:', error)
        return
      }
      
      if (data) {
        setActiveWorkLogs(data)
      }
    } catch (error) {
      console.error('Error loading active work logs:', error)
    }
  }
  
  const loadOrders = async () => {
    try {
      // Load recent orders
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        console.error('Error loading orders:', error)
        return
      }
      
      if (data) {
        setOrders(data)
        
        // Update stats with order data
        const completedOrders = data.filter(o => o.status === 'completed' || o.status === 'delivered').length
        const totalRevenue = data.reduce((sum, order) => sum + (order.total_amount || 0), 0)
        
        setStats(prev => {
          const newStats = [...prev]
          // Update revenue stats
          newStats[0] = {
            ...newStats[0],
            value: `${totalRevenue.toLocaleString('hu-HU')} Ft`,
            change: `${completedOrders} teljesített rendelés`,
            changeType: completedOrders > 0 ? 'positive' : 'neutral',
            icon: DollarSign,
            gradient: 'from-green-500 to-emerald-600'
          }
          
          // Update completed orders stats
          newStats[1] = {
            ...newStats[1],
            value: completedOrders,
            change: `${data.length} összes rendelés`,
            changeType: 'positive',
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-cyan-600'
          }
          return newStats
        })
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const loadSalesChartData = () => {
    // Generate mock sales data for the chart
    const mockData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      mockData.push({
        name: date.toLocaleDateString('hu-HU', { weekday: 'short' }),
        sales: Math.floor(Math.random() * 50000) + 30000,
        orders: Math.floor(Math.random() * 30) + 10,
      });
    }
    
    setSalesChartData(mockData);
  };

  const loadActiveVehicles = async () => {
    try {
      // Get active vehicles count
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, status')
        .eq('status', 'active')
      
      if (error) {
        console.error('Hiba a járművek betöltésekor:', error)
        return
      }
      
      if (data) {
        const activeVehicles = data.length
        const inDelivery = Math.floor(Math.random() * activeVehicles) // Simulate vehicles in delivery
        
        // Update stats with vehicle data
        setStats(prev => {
          const newStats = [...prev]
          newStats[3] = {
            ...newStats[3],
            value: `${activeVehicles}/${data.length}`,
            change: `${inDelivery} szállítás alatt`,
            changeType: inDelivery > 0 ? 'positive' : 'neutral',
            icon: Truck,
            gradient: 'from-purple-500 to-violet-600'
          }
          return newStats
        })
      }
    } catch (error) {
      console.error('Hiba a járművek betöltésekor:', error)
    }
  }

  const loadEmployeeCount = async () => {
    try {
      // Get active employees count
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      if (error) {
        console.error('Hiba az alkalmazottak betöltésekor:', error)
        return
      }
      
      if (count !== null) {
        // Get employees in shift
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('schedules')
          .select('id')
          .eq('date', new Date().toISOString().split('T')[0])
          .eq('status', 'confirmed')
        
        if (shiftsError) {
          console.error('Hiba a műszakok betöltésekor:', shiftsError)
        }
        
        const inShift = shiftsData?.length || 0
        
        // Update stats with employee data
        setStats(prev => {
          const newStats = [...prev]
          newStats[4] = {
            ...newStats[4],
            value: count,
            change: `${inShift} műszakban`,
            changeType: inShift > 0 ? 'positive' : 'neutral',
            icon: Users,
            gradient: 'from-pink-500 to-rose-600'
          }
          return newStats
        })
      }
    } catch (error) {
      console.error('Hiba az alkalmazottak betöltésekor:', error)
    }
  }

  const loadDashboardStats = async () => {
    try {
      // Load dashboard stats from settings table
      const { data: settingsData, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', 'dashboard')
      
      if (error) {
        console.error('Hiba a dashboard statisztikák betöltésekor:', error)
        return
      }
      
      if (settingsData && settingsData.length > 0) {
        const statsObj: any = {}
        settingsData.forEach(item => {
          try {
            // Try to parse as JSON first
            statsObj[item.key] = JSON.parse(item.value)
          } catch (e) {
            // If not valid JSON, use as is
            statsObj[item.key] = item.value
          }
        })
        setDashboardStats(statsObj)
        
        // Update stats with real data
        setStats(prev => {
          const newStats = [...prev]
          
          // Update revenue stats
          if (statsObj.daily_revenue) {
            newStats[0] = {
              title: 'Napi bevétel',
              value: `${parseInt(statsObj.daily_revenue).toLocaleString('hu-HU')} Ft`,
              change: `${Math.round(Math.random() * 10)}% tegnap óta`,
              changeType: Math.random() > 0.5 ? 'positive' : 'negative',
              icon: DollarSign,
              gradient: 'from-green-500 to-emerald-600'
            }
          }
          
          // Update completed orders stats
          if (statsObj.completed_orders) {
            newStats[1] = {
              title: 'Teljesített rendelések',
              value: statsObj.completed_orders,
              change: `${Math.round(Math.random() * 5)} az elmúlt órában`,
              changeType: 'positive',
              icon: CheckCircle,
              gradient: 'from-blue-500 to-cyan-600'
            }
          }
          
          // Update low stock stats
          if (statsObj.low_stock_count) {
            newStats[2] = {
              title: 'Készlet szint',
              value: `${Math.round((inventory.reduce((sum, item) => sum + item.current_stock, 0) / 
                        inventory.reduce((sum, item) => sum + item.max_threshold, 0)) * 100)}%`,
              change: `${statsObj.low_stock_count} termék alacsony`,
              changeType: parseInt(statsObj.low_stock_count) > 0 ? 'negative' : 'neutral',
              icon: Package,
              gradient: 'from-amber-500 to-orange-600'
            }
          }
          
          return newStats
        })
      }
    } catch (error) {
      console.error('Hiba a dashboard statisztikák betöltésekor:', error)
    }
  }

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('current_stock', { ascending: true })
        .limit(5)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setInventory(data)

        // Count low stock items
        const lowStockItems = data.filter(item => item.current_stock <= item.min_threshold)
        
        setStats(prev => {
          const newStats = [...prev]
          // Update inventory stats
          newStats[2] = {
            title: 'Készlet szint',
            value: `${Math.round((data.reduce((sum, item) => sum + (item.current_stock || 0), 0) / 
                      data.reduce((sum, item) => sum + (item.max_threshold || 100), 0)) * 100)}%`,
            change: `${lowStockItems.length} termék alacsony`,
            changeType: lowStockItems.length > 0 ? 'negative' : 'neutral',
            icon: Package,
            gradient: 'from-amber-500 to-orange-600'
          }
          return newStats
        })
      }
    } catch (error) {
      console.error('Hiba a készlet betöltésekor:', error)
    }
  }

  // Update warning count
  useEffect(() => {
    // Count warnings (low stock items, maintenance due, etc.)
    const lowStockCount = inventory.filter(item => item.current_stock <= item.min_threshold).length
    
    // Update stats with warning data
    setStats(prev => {
      const newStats = [...prev]
      newStats[5] = {
        ...newStats[5],
        value: lowStockCount,
        change: `${Math.floor(lowStockCount / 3)} kritikus`,
        changeType: lowStockCount > 0 ? 'negative' : 'neutral',
        icon: AlertTriangle,
        gradient: 'from-red-500 to-pink-600'
      }
      return newStats
    })
  }, [inventory])

  // Periodically refresh dashboard stats
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardStats()
    }, 60000) // Refresh every minute
    
    return () => clearInterval(interval)
  }, [])

  const checkActiveWorkSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { data, error } = await supabase
          .from('work_logs')
          .select('*')
          .eq('employee_id', user.id)
          .eq('status', 'active')
          .order('start_time', { ascending: false })
          .limit(1)
        
        if (error) {
          console.error('Error checking work session:', error)
          return
        }
        
        if (data && data.length > 0) {
          const activeSession = data[0]
          setWorkStarted(true)
          setWorkStartTime(new Date(activeSession.start_time))
          
          // Calculate duration
          const now = new Date()
          const startTime = new Date(activeSession.start_time)
          const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
          setWorkDuration(diff)
        } else {
          setWorkStarted(false)
          setWorkStartTime(null)
          setWorkDuration(0)
        }
      }
    } catch (error) {
      console.error('Hiba az aktív munkaidő ellenőrzésekor:', error)
    }
  }

  // Periodically refresh stats
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveVehicles()
      loadEmployeeCount()
      loadInventory()
    }, 60000) // Refresh every minute
    
    return () => clearInterval(interval)
  }, [])

  const startWork = async () => {
    if (workStarted) {
      toast.error('Már van aktív munkaidő');
      return;
    }
    
    const now = new Date()
    setWorkStarted(true)
    setWorkStartTime(now)
    
    try {
      // Record work start in database
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { error } = await supabase
          .from('work_logs')
          .insert({
            employee_id: user.id,
            start_time: now.toISOString(),
            status: 'active'
          })
        
        if (error) {
          console.error('Error starting work:', error)
          toast.error('Hiba a munkaidő rögzítésekor')
          setWorkStarted(false)
          setWorkStartTime(null)
          return
        }
        
        toast.success('Munkaidő sikeresen elindítva')
      } else {
        toast.error('Felhasználó azonosítása sikertelen')
        setWorkStarted(false)
        setWorkStartTime(null)
      }
    } catch (error) {
      console.error('Hiba a munkaidő rögzítésekor:', error)
      toast.error('Hiba a munkaidő rögzítésekor')
      setWorkStarted(false)
      setWorkStartTime(null)
    }
  }

  const endWork = async () => {
    if (!workStarted) {
      toast.error('Nincs aktív munkaidő');
      return;
    }
    
    setWorkStarted(false)
    
    try {
      // Record work end in database
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // First get the active work log entry
        const { data: workLogs, error: fetchError } = await supabase
          .from('work_logs')
          .select('*')
          .eq('employee_id', user.id)
          .eq('status', 'active')
          .order('start_time', { ascending: false })
          .limit(1)
        
        if (fetchError) {
          console.error('Error fetching work logs:', fetchError)
          toast.error('Hiba a munkaidő lekérdezésekor')
          return
        }
        
        if (workLogs && workLogs.length > 0) {
          const { error } = await supabase
            .from('work_logs')
            .update({
              end_time: new Date().toISOString(),
              status: 'completed',
              duration: workDuration
            })
            .eq('id', workLogs[0].id)
          
          if (error) {
            console.error('Error updating work log:', error)
            toast.error('Hiba a munkaidő lezárásakor')
            return
          }
          
          toast.success('Munkaidő sikeresen befejezve')
        } else {
          toast.warning('Nincs aktív munkaidő bejegyzés')
        }
      } else {
        toast.error('Felhasználó azonosítása sikertelen')
      }
    } catch (error) {
      console.error('Hiba a munkaidő lezárásakor:', error)
      toast.error('Hiba a munkaidő lezárásakor')
    }
    
    setWorkDuration(0)
    setWorkStartTime(null)
    
    // Reload data after a short delay
    setTimeout(() => {
      loadActiveVehicles()
      loadEmployeeCount()
      loadInventory()
    }, 500)
  }

  const clearDatabase = async () => {
    if (!window.confirm('FIGYELEM! Ez a művelet törli az összes adatot az adatbázisból, kivéve az admin felhasználókat. Biztosan folytatja?')) {
      return;
    }
    
    try {
      setClearingDatabase(true);
      
      // Call the database function to clear all data
      const { error } = await supabase.rpc('clear_database');

      if (error) {
        console.error('Database error:', error);
        toast.error('Hiba az adatbázis törlésekor: ' + error.message);
        return;
      }
      
      toast.success('Adatbázis sikeresen törölve! Minden adat eltávolítva, kivéve az admin felhasználókat.');
    } catch (error) {
      console.error('Hiba az adatbázis törlésekor:', error);
      toast.error('Hiba történt az adatbázis törlésekor!');
    } finally {
      setClearingDatabase(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Jó reggelt! 👋
            {viewingAs && ` (${viewingAs === 'baker' ? 'Pék' : 
                             viewingAs === 'salesperson' ? 'Eladó' : 
                             viewingAs === 'driver' ? 'Sofőr' : 
                             viewingAs === 'partner' ? 'Partner' : 'Admin'} nézet)`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Itt az áttekintés a mai napról és a pékség teljesítményéről.
          </p>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {!workStarted ? (
            <button
              onClick={startWork}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Play className="h-4 w-4 mr-2" />
              Munkaidő indítása
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Munkaidő: {formatDuration(workDuration)}
              </div>
              <button
                onClick={endWork}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Pause className="h-4 w-4 mr-2" />
                Munkaidő befejezése
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Megtekintés mint:</span>
            <select
              value={viewingAs || 'admin'}
              onChange={(e) => setViewingAs(e.target.value as any || null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Admin</option>
              <option value="baker">Pék</option>
              <option value="salesperson">Eladó</option>
              <option value="driver">Sofőr</option>
              <option value="partner">Partner</option>
            </select>
            {viewingAs && (
              <button
                onClick={() => setViewingAs(null)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Vissza admin nézethez
              </button>
            )}
          </div>
          <button
            onClick={clearDatabase}
            disabled={clearingDatabase}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <Eraser className="h-4 w-4 mr-2" />
            {clearingDatabase ? 'Adatbázis törlése...' : 'Adatbázis törlése'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {!viewingAs && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>
      )}
      
      {/* Baker Dashboard View */}
      {viewingAs === 'baker' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Clock className="h-6 w-6 mr-2 text-blue-600" />
              Munkaidő nyilvántartás
            </h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {formatDuration(workDuration)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {workStarted ? 'Aktív munkaidő' : 'Nincs aktív munkaidő'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Package className="h-6 w-6 mr-2 text-amber-600" />
              Termelési tételek
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Pék nézet - itt láthatók a gyártási tételek és lépések
            </p>
          </div>
        </div>
      )}
      
      {/* Salesperson Dashboard View */}
      {viewingAs === 'salesperson' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mai forgalom</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0 Ft</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tranzakciók</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Eladó nézet - POS rendszer és értékesítés
            </h3>
          </div>
        </div>
      )}
      
      {/* Driver Dashboard View */}
      {viewingAs === 'driver' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mai szállítások</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Teljesített</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sofőr nézet - Szállítások és útvonalak
            </h3>
          </div>
        </div>
      )}
      
      {/* Partner Dashboard View */}
      {viewingAs === 'partner' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes rendelés</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Partner nézet - Rendelések és termékek
            </h3>
          </div>
        </div>
      )}

      {/* Charts and Activity */}
      {!viewingAs && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Camera System */}
        <div className="bg-black dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-700 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Camera className="h-5 w-5 mr-2 text-blue-400" />
              AI Kamerarendszer Értesítések
            </h2>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-900/30">
                Élő
              </button>
              <button className="text-sm text-gray-400 hover:text-gray-300 px-2 py-1">
                Archívum
              </button>
            </div>
          </div>
          
          <div className="h-80 font-mono text-sm overflow-y-auto pr-2">
            <div className="space-y-2">
              <div className="text-green-400">[10:15:32] INFO: Kamera rendszer inicializálva</div>
              <div className="text-blue-400">[10:16:05] INFO: Személy azonosítva: Kovács János (95.2% egyezés)</div>
              <div className="text-yellow-400">[10:18:22] WARNING: Ismeretlen személy a bejáratnál (Kamera: Bejárat_01)</div>
              <div className="text-blue-400">[10:20:45] INFO: Jármű felismerve: ABC-123 (Kamera: Parkoló_02)</div>
              <div className="text-red-400">[10:25:18] ALERT: Mozgás érzékelve zárás után (Kamera: Raktár_03)</div>
              <div className="text-blue-400">[10:30:02] INFO: Személy azonosítva: Nagy Péter (88.7% egyezés)</div>
              <div className="text-green-400">[10:35:40] INFO: Objektum felismerve: kenyér (92.1% egyezés)</div>
              <div className="text-blue-400">[10:40:15] INFO: Jármű felismerve: XYZ-789 (Kamera: Parkoló_01)</div>
              <div className="text-yellow-400">[10:45:33] WARNING: Ismeretlen személy a hátsó bejáratnál (Kamera: Hátsó_01)</div>
              <div className="text-blue-400">[10:50:22] INFO: Személy azonosítva: Szabó Anna (91.5% egyezés)</div>
              <div className="text-green-400">[10:55:08] INFO: Objektum felismerve: sütemény (89.3% egyezés)</div>
              <div className="text-red-400">[11:00:45] ALERT: Nem engedélyezett belépés (Kamera: Raktár_01)</div>
              <div className="text-blue-400">[11:05:30] INFO: Jármű felismerve: DEF-456 (Kamera: Parkoló_03)</div>
              <div className="text-green-400">[11:10:12] INFO: Rendszer állapot: Normál működés</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Legutóbbi tevékenységek
          </h3>
          <div className="space-y-4">
            {[
              { icon: CheckCircle, text: 'Munkaidő rögzítés', time: 'most', color: 'text-green-500' },
              { icon: Package, text: 'Készlet ellenőrzés', time: '5 perce', color: 'text-blue-500' },
              { icon: Truck, text: 'Szállítás tervezés', time: '10 perce', color: 'text-purple-500' },
              { icon: AlertTriangle, text: 'Rendszerfrissítés', time: '15 perce', color: 'text-amber-500' },
              { icon: Users, text: 'Felhasználók kezelése', time: '30 perce', color: 'text-pink-500' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <activity.icon className={`h-5 w-5 ${activity.color}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.text}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Tourism & Hotel Occupancy */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Building className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Szállásfoglalási Előrejelzés
            </h3>
          </div>
          <Link 
            to="/hotel-occupancy"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
          >
            Részletek →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-400">Balatonszemes Központi Üzlet</h4>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-xs font-medium">
                72% foglalt
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Növekvő foglaltsági trend, javasolt a termelés növelése.
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-amber-900 dark:text-amber-400">Balatonföldvár Üzlet</h4>
              <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full text-xs font-medium">
                85% foglalt
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Magas foglaltság, sürgős termelésnövelés szükséges.
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-green-900 dark:text-green-400">Balatonszárszó Üzlet</h4>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full text-xs font-medium">
                65% foglalt
              </span>
            </div>
            <p className="text-sm text-green-800 dark:text-green-300">
              Stabil foglaltság, normál termelés javasolt.
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Monitoring */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <Activity className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Aktív felhasználók és munkaidők
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Users */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Bejelentkezett felhasználók</h4>
            {activeUsers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Nincs aktív felhasználó</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mr-3">
                        <span className="text-white font-medium">
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Online
                      </span>
                      <Link to="/chat" className="ml-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Active Work Logs */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aktív munkaidők</h4>
            {activeWorkLogs.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Nincs aktív munkaidő</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeWorkLogs.map(workLog => {
                  // Calculate duration
                  const startTime = new Date(workLog.start_time);
                  const now = new Date();
                  const durationMs = now.getTime() - startTime.getTime();
                  const hours = Math.floor(durationMs / (1000 * 60 * 60));
                  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                  
                  return (
                    <div key={workLog.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{workLog.profiles?.full_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Kezdés: {new Date(workLog.start_time).toLocaleTimeString('hu-HU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {hours}ó {minutes}p {seconds}mp
                          </span>
                          <span className="ml-2 cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" onClick={() => editWorkLog(workLog)}>
                            <Edit className="h-4 w-4 inline" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 p-2">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Javaslatok
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Optimalizálás</h4>
            {inventory.length > 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A készletadatok alapján javasoljuk a {inventory[0]?.name} újrarendelését, mert a készlet alacsony.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A hétvégi forgalom alapján javasoljuk 20%-kal több croissant gyártását.
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Készlet</h4>
            {inventory.length > 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {inventory.filter(item => item.current_stock <= item.min_threshold).length > 0 
                  ? `${inventory.filter(item => item.current_stock <= item.min_threshold).length} termék készlete alacsony. Rendelés javasolt 48 órán belül.`
                  : 'Minden termék készlete megfelelő szinten van.'}
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nincs elérhető készletadat.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Work Log Modal */}
      {showWorkLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Munkaidő szerkesztése: {workLogFormData.employee_name}
                </h2>
                <button
                  onClick={() => {
                    setShowWorkLogModal(false)
                    setEditingWorkLog(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kezdés időpontja *
                  </label>
                  <input
                    type="datetime-local"
                    value={workLogFormData.start_time}
                    onChange={(e) => setWorkLogFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Befejezés időpontja
                  </label>
                  <input
                    type="datetime-local"
                    value={workLogFormData.end_time}
                    onChange={(e) => setWorkLogFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Állapot
                  </label>
                  <select
                    value={workLogFormData.status}
                    onChange={(e) => setWorkLogFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="active">Aktív</option>
                    <option value="completed">Befejezett</option>
                    <option value="cancelled">Megszakítva</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Megjegyzések
                  </label>
                  <textarea
                    value={workLogFormData.notes}
                    onChange={(e) => setWorkLogFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowWorkLogModal(false)
                    setEditingWorkLog(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleWorkLogSubmit}
                  disabled={loading || !workLogFormData.start_time}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}