import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users,
  Truck,
  FileText,
  Filter,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('sales')
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    topProducts: []
  })
  const [productionData, setProductionData] = useState({
    totalBatches: 0,
    completedBatches: 0,
    avgQuality: 0,
    efficiency: 0,
    topRecipes: []
  })
  const [inventoryData, setInventoryData] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    topCategories: []
  })
  const [personnelData, setPersonnelData] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalHours: 0,
    departmentBreakdown: []
  })
  const [expandedSections, setExpandedSections] = useState({
    sales: true,
    production: false,
    inventory: false,
    personnel: false
  })

  useEffect(() => {
    // Set default date range based on selected period
    const now = new Date()
    let start = new Date()
    let end = new Date()
    
    switch (selectedPeriod) {
      case 'day':
        // Today
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        // This week
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        // This month
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(now.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'quarter':
        // This quarter
        const quarter = Math.floor(now.getMonth() / 3)
        start.setMonth(quarter * 3)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(quarter * 3 + 3)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        // This year
        start.setMonth(0)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11)
        end.setDate(31)
        end.setHours(23, 59, 59, 999)
        break
      default:
        break
    }
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [selectedPeriod])

  useEffect(() => {
    if (startDate && endDate) {
      loadReportData()
    }
  }, [startDate, endDate, selectedReport])

  const loadReportData = async () => {
    setLoading(true)
    
    try {
      switch (selectedReport) {
        case 'sales':
          await loadSalesData()
          break
        case 'production':
          await loadProductionData()
          break
        case 'inventory':
          await loadInventoryData()
          break
        case 'personnel':
          await loadPersonnelData()
          break
        default:
          break
      }
    } catch (error) {
      console.error(`Error loading ${selectedReport} data:`, error)
      toast.error(`Hiba a(z) ${selectedReport} adatok betöltésekor`)
    } finally {
      setLoading(false)
    }
  }

  const loadSalesData = async () => {
    try {
      // Get real sales data from database
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      if (ordersError) {
        console.error('Error loading orders:', ordersError)
        throw ordersError
      }
      
      // Calculate total revenue and average order value
      const totalRevenue = ordersData ? ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0
      const totalOrders = ordersData ? ordersData.length : 0
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      
      // Get top products
      const productMap = new Map()
      
      if (ordersData) {
        ordersData.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const name = item.name || item.product_name
              const quantity = item.quantity || 0
              const price = item.price || item.unit_price || 0
              const revenue = quantity * price
              
              if (name) {
                if (productMap.has(name)) {
                  const product = productMap.get(name)
                  product.quantity += quantity
                  product.revenue += revenue
                  productMap.set(name, product)
                } else {
                  productMap.set(name, { name, quantity, revenue })
                }
              }
            })
          }
        })
      }
      
      // Convert map to array and sort by revenue
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
      
      setSalesData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        topProducts
      })
    } catch (error) {
      console.error('Error loading sales data:', error)
      // Set empty data on error
      setSalesData({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        topProducts: []
      })
    }
  }

  const loadProductionData = async () => {
    try {
      // Get real production data from database
      const { data: batchesData, error: batchesError } = await supabase
        .from('production_batches')
        .select(`
          *,
          products:recipe_id (name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      if (batchesError) {
        console.error('Error loading batches:', batchesError)
        throw batchesError
      }
      
      // Calculate production metrics
      const totalBatches = batchesData ? batchesData.length : 0
      const completedBatches = batchesData ? batchesData.filter(batch => batch.status === 'completed').length : 0
      const avgQuality = batchesData && batchesData.length > 0 
        ? batchesData.reduce((sum, batch) => sum + (batch.quality_score || 0), 0) / batchesData.length 
        : 0
      const efficiency = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0
      
      // Get top recipes
      const recipeMap = new Map()
      
      if (batchesData) {
        batchesData.forEach(batch => {
          const name = batch.products?.name || 'Ismeretlen termék'
          const quality = batch.quality_score || 0
          
          if (recipeMap.has(name)) {
            const recipe = recipeMap.get(name)
            recipe.batches += 1
            recipe.totalQuality += quality
            recipeMap.set(name, recipe)
          } else {
            recipeMap.set(name, { name, batches: 1, totalQuality: quality })
          }
        })
      }
      
      // Convert map to array and calculate average quality
      const topRecipes = Array.from(recipeMap.values())
        .map(recipe => ({
          name: recipe.name,
          batches: recipe.batches,
          quality: recipe.batches > 0 ? recipe.totalQuality / recipe.batches : 0
        }))
        .sort((a, b) => b.batches - a.batches)
        .slice(0, 10)
      
      setProductionData({
        totalBatches,
        completedBatches,
        avgQuality: avgQuality || 0,
        efficiency,
        topRecipes
      })
    } catch (error) {
      console.error('Error loading production data:', error)
      setProductionData({
        totalBatches: 0,
        completedBatches: 0,
        avgQuality: 0,
        efficiency: 0,
        topRecipes: []
      })
    }
  }

  const loadInventoryData = async () => {
    try {
      // Get real inventory data from database
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
      
      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError)
        throw inventoryError
      }
      
      // Calculate inventory metrics
      const totalItems = inventoryData ? inventoryData.length : 0
      const lowStockItems = inventoryData 
        ? inventoryData.filter(item => item.current_stock <= item.min_threshold).length 
        : 0
      const totalValue = inventoryData 
        ? inventoryData.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_per_unit || 0)), 0) 
        : 0
      
      // Get top categories
      const categoryMap = new Map()
      
      if (inventoryData) {
        inventoryData.forEach(item => {
          const category = item.category || 'Egyéb'
          const value = (item.current_stock || 0) * (item.cost_per_unit || 0)
          
          if (categoryMap.has(category)) {
            const cat = categoryMap.get(category)
            cat.count += 1
            cat.value += value
            categoryMap.set(category, cat)
          } else {
            categoryMap.set(category, { name: category, count: 1, value })
          }
        })
      }
      
      // Convert map to array and sort by value
      const topCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
      
      setInventoryData({
        totalItems,
        lowStockItems,
        totalValue,
        topCategories
      })
    } catch (error) {
      console.error('Error loading inventory data:', error)
      setInventoryData({
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0,
        topCategories: []
      })
    }
  }

  const loadPersonnelData = async () => {
    try {
      // Get real personnel data from database
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
      
      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
        throw profilesError
      }
      
      // Get work logs
      const { data: workLogsData, error: workLogsError } = await supabase
        .from('work_logs')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      if (workLogsError) {
        console.error('Error loading work logs:', workLogsError)
      }
      
      // Calculate personnel metrics
      const totalEmployees = profilesData ? profilesData.length : 0
      const activeEmployees = profilesData 
        ? profilesData.filter(profile => profile.status === 'active').length 
        : 0
      
      // Calculate total hours from work logs
      let totalHours = 0
      if (workLogsData) {
        workLogsData.forEach(log => {
          if (log.duration) {
            totalHours += log.duration / 60 // Convert minutes to hours
          } else if (log.start_time && log.end_time) {
            const start = new Date(log.start_time)
            const end = new Date(log.end_time)
            totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          }
        })
      }
      
      // Get department breakdown
      const departmentMap = new Map()
      
      if (profilesData) {
        profilesData.forEach(profile => {
          const role = profile.role || 'other'
          
          if (departmentMap.has(role)) {
            departmentMap.set(role, departmentMap.get(role) + 1)
          } else {
            departmentMap.set(role, 1)
          }
        })
      }
      
      // Convert map to array
      const departmentBreakdown = Array.from(departmentMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
      
      setPersonnelData({
        totalEmployees,
        activeEmployees,
        totalHours,
        departmentBreakdown
      })
    } catch (error) {
      console.error('Error loading personnel data:', error)
      setPersonnelData({
        totalEmployees: 0,
        activeEmployees: 0,
        totalHours: 0,
        departmentBreakdown: []
      })
    }
  }

  const handleExport = () => {
    let reportData
    let fileName
    
    switch (selectedReport) {
      case 'sales':
        reportData = salesData
        fileName = `sales_report_${startDate}_${endDate}.json`
        break
      case 'production':
        reportData = productionData
        fileName = `production_report_${startDate}_${endDate}.json`
        break
      case 'inventory':
        reportData = inventoryData
        fileName = `inventory_report_${startDate}_${endDate}.json`
        break
      case 'personnel':
        reportData = personnelData
        fileName = `personnel_report_${startDate}_${endDate}.json`
        break
      default:
        reportData = {}
        fileName = `report_${startDate}_${endDate}.json`
        break
    }
    
    const jsonString = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Jelentés sikeresen exportálva!')
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const reportTypes = [
    {
      id: 'sales',
      name: 'Értékesítés',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'production',
      name: 'Termelés',
      icon: Package,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'inventory',
      name: 'Készlet',
      icon: Package,
      color: 'from-purple-500 to-violet-600'
    },
    {
      id: 'personnel',
      name: 'Személyzet',
      icon: Users,
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'fleet',
      name: 'Flotta',
      icon: Truck,
      color: 'from-red-500 to-pink-600'
    },
    {
      id: 'financial',
      name: 'Pénzügy',
      icon: DollarSign,
      color: 'from-indigo-500 to-blue-600'
    }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            Jelentések
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Üzleti intelligencia és teljesítmény elemzés
          </p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button 
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            Nyomtatás
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jelentés típusa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedReport === type.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mx-auto mb-2`}>
                <type.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white text-center">{type.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Időszak
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="day">Mai nap</option>
              <option value="week">Ez a hét</option>
              <option value="month">Ez a hónap</option>
              <option value="quarter">Ez a negyedév</option>
              <option value="year">Ez az év</option>
              <option value="custom">Egyéni időszak</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kezdő dátum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Záró dátum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'sales' && (
        <div className="space-y-6">
          {/* Sales KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes bevétel</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {salesData.totalRevenue.toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rendelések</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{salesData.totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Átlag kosárérték</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {salesData.avgOrderValue.toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Eladott termékek</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {salesData.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Legnépszerűbb termékek</h3>
              <button
                onClick={() => toggleSection('sales')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {expandedSections.sales ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            
            {expandedSections.sales && (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Termék</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Mennyiség</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Bevétel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.topProducts.map((product, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 text-sm text-gray-900 dark:text-white">{product.name}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">{product.quantity} db</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">
                            {product.revenue.toLocaleString('hu-HU')} Ft
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesData.topProducts.slice(0, 5)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString('hu-HU')} />
                      <Legend />
                      <Bar dataKey="revenue" name="Bevétel (Ft)" fill="#0088FE" />
                      <Bar dataKey="quantity" name="Mennyiség (db)" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedReport === 'production' && (
        <div className="space-y-6">
          {/* Production KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes tétel</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{productionData.totalBatches}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Befejezett</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{productionData.completedBatches}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Átlag minőség</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{productionData.avgQuality.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hatékonyság</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{productionData.efficiency.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Recipes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leggyakoribb receptek</h3>
              <button
                onClick={() => toggleSection('production')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {expandedSections.production ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            
            {expandedSections.production && (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Recept</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Tételek</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Minőség</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionData.topRecipes.map((recipe, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 text-sm text-gray-900 dark:text-white">{recipe.name}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">{recipe.batches}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">{recipe.quality.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productionData.topRecipes.slice(0, 5)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="batches" name="Tételek" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="quality" name="Minőség (%)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedReport === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes tétel</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryData.totalItems}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-pink-600 p-3">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alacsony készlet</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryData.lowStockItems}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes érték</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {inventoryData.totalValue.toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kategóriák</h3>
              <button
                onClick={() => toggleSection('inventory')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {expandedSections.inventory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            
            {expandedSections.inventory && (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Kategória</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Tételek</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Érték</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.topCategories.map((category, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 text-sm text-gray-900 dark:text-white">{category.name}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">{category.count}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">
                            {category.value.toLocaleString('hu-HU')} Ft
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryData.topCategories.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {inventoryData.topCategories.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString('hu-HU') + ' Ft'} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedReport === 'personnel' && (
        <div className="space-y-6">
          {/* Personnel KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes alkalmazott</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{personnelData.totalEmployees}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktív alkalmazott</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{personnelData.activeEmployees}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-3">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes munkaóra</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{personnelData.totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Részleg szerinti megoszlás</h3>
              <button
                onClick={() => toggleSection('personnel')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {expandedSections.personnel ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            
            {expandedSections.personnel && (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Részleg</th>
                        <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Alkalmazottak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnelData.departmentBreakdown.map((dept, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 text-sm text-gray-900 dark:text-white">
                            {dept.name === 'admin' ? 'Admin' : 
                             dept.name === 'baker' ? 'Pék' : 
                             dept.name === 'salesperson' ? 'Eladó' : 
                             dept.name === 'driver' ? 'Sofőr' : dept.name}
                          </td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white text-right">{dept.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={personnelData.departmentBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => {
                          const displayName = 
                            name === 'admin' ? 'Admin' : 
                            name === 'baker' ? 'Pék' : 
                            name === 'salesperson' ? 'Eladó' : 
                            name === 'driver' ? 'Sofőr' : name
                          return `${displayName}: ${(percent * 100).toFixed(0)}%`
                        }}
                      >
                        {personnelData.departmentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend formatter={(value) => {
                        return value === 'admin' ? 'Admin' : 
                               value === 'baker' ? 'Pék' : 
                               value === 'salesperson' ? 'Eladó' : 
                               value === 'driver' ? 'Sofőr' : value
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Other report types placeholder */}
      {!['sales', 'production', 'inventory', 'personnel'].includes(selectedReport) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {reportTypes.find(t => t.id === selectedReport)?.name} jelentés fejlesztés alatt
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Ez a jelentés típus hamarosan elérhető lesz.
          </p>
        </div>
      )}
    </div>
  )
}