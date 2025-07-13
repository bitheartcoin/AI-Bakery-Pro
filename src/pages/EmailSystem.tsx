import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  Send, 
  Users, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  Save,
  Download,
  Upload,
  Calendar,
  Clock,
  User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
}

interface Partner {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
}

interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  smtp_secure: boolean
  from_name: string
  from_email: string
}

export default function EmailSystem() {
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState<Partner[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPartners, setSelectedPartners] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_host: 'mail.szemesipekseg.com',
    smtp_port: 465,
    smtp_username: 'admin@szemesipekseg.com',
    smtp_password: '',
    smtp_secure: true,
    from_name: 'Szemesi Pékség',
    from_email: 'admin@szemesipekseg.com'
  })
  const [templateData, setTemplateData] = useState({
    name: '',
    subject: '',
    body: ''
  })
  const [sentEmails, setSentEmails] = useState<any[]>([])
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'sent' | 'scheduled'>('compose')
  const [scheduleEmail, setScheduleEmail] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [orderNotifications, setOrderNotifications] = useState(true)

  useEffect(() => {
    loadPartners()
    loadTemplates()
    loadEmailSettings()
    loadSentEmails()
    loadScheduledEmails()
  }, [])

  const loadPartners = async () => {
    try {
      setLoading(true)
      
      // Load partners from database
      const { data, error } = await supabase
        .from('partner_companies')
        .select('id, name, email, status')
        .order('name')
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a partnerek betöltésekor')
        return
      }
      
      if (data) {
        setPartners(data)
      }
    } catch (error) {
      console.error('Hiba a partnerek betöltésekor:', error)
      toast.error('Hiba a partnerek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      // Load email templates from database
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a sablonok betöltésekor')
        return
      }
      
      if (data) {
        setTemplates(data)
      }
    } catch (error) {
      console.error('Hiba a sablonok betöltésekor:', error)
      toast.error('Hiba a sablonok betöltésekor')
    }
  }

  const loadEmailSettings = async () => {
    try {
      // Load email settings from database
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', 'email')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data && data.length > 0) {
        const settings: Partial<EmailSettings> = {}
        
        data.forEach(setting => {
          try {
            const key = setting.key as keyof EmailSettings
            let parsedValue
            try {
              parsedValue = JSON.parse(setting.value)
            } catch (parseError) {
              // If JSON.parse fails, use the raw string value
              parsedValue = setting.value
            }
            settings[key] = parsedValue
          } catch (e) {
            console.error('Error processing setting:', e)
          }
        })
        
        setEmailSettings(prev => ({
          ...prev,
          ...settings
        }))
      }
    } catch (error) {
      console.error('Hiba a beállítások betöltésekor:', error)
    }
  }

  const loadSentEmails = async () => {
    try {
      // Load sent emails from database
      const { data, error } = await supabase
        .from('sent_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setSentEmails(data)
      }
    } catch (error) {
      console.error('Hiba az elküldött emailek betöltésekor:', error)
    }
  }

  const loadScheduledEmails = async () => {
    try {
      // Load scheduled emails from database
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .order('scheduled_time')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setScheduledEmails(data)
      }
    } catch (error) {
      console.error('Hiba az ütemezett emailek betöltésekor:', error)
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      if (!templateData.name || !templateData.subject || !templateData.body) {
        toast.error('Kérjük töltse ki az összes mezőt')
        return
      }
      
      // Create template in database
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: templateData.name,
          subject: templateData.subject,
          body: templateData.body
        })
        .select()
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a sablon létrehozásakor')
        return
      }
      
      toast.success('Sablon sikeresen létrehozva!')
      setShowNewTemplateModal(false)
      setTemplateData({
        name: '',
        subject: '',
        body: ''
      })
      loadTemplates()
    } catch (error) {
      console.error('Hiba a sablon létrehozásakor:', error)
      toast.error('Hiba a sablon létrehozásakor')
    }
  }

  const handleSaveSettings = async () => {
    try {
      // Save email settings to database
      const settingsToSave = Object.entries(emailSettings).map(([key, value]) => ({
        category: 'email',
        key,
        value: JSON.stringify(value),
        is_public: false
      }))
      
      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'category,key' })
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a beállítások mentésekor')
          return
        }
      }
      
      toast.success('Beállítások sikeresen mentve!')
      setShowSettingsModal(false)
    } catch (error) {
      console.error('Hiba a beállítások mentésekor:', error)
      toast.error('Hiba a beállítások mentésekor')
    }
  }

  const handleSendEmail = async () => {
    try {
      if (selectedPartners.length === 0) {
        toast.error('Kérjük válasszon legalább egy partnert')
        return
      }
      
      if (!selectedTemplate) {
        toast.error('Kérjük válasszon egy sablont')
        return
      }
      
      const template = templates.find(t => t.id === selectedTemplate)
      if (!template) {
        toast.error('A kiválasztott sablon nem található')
        return
      }
      
      // Get selected partners
      const selectedPartnerData = partners.filter(p => selectedPartners.includes(p.id))
      
      if (scheduleEmail) {
        if (!scheduleDate || !scheduleTime) {
          toast.error('Kérjük adja meg az ütemezés időpontját')
          return
        }
        
        const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
        
        // Schedule emails
        for (const partner of selectedPartnerData) {
          const { error } = await supabase
            .from('scheduled_emails')
            .insert({
              recipient_id: partner.id,
              recipient_email: partner.email,
              recipient_name: partner.name,
              template_id: template.id,
              subject: template.subject,
              body: template.body,
              scheduled_time: scheduledTime.toISOString()
            })
          
          if (error) {
            console.error('Database error:', error)
            toast.error(`Hiba az email ütemezésekor: ${partner.name}`)
            return
          }
        }
        
        toast.success(`${selectedPartnerData.length} email sikeresen ütemezve!`)
        setScheduleEmail(false)
        setScheduleDate('')
        setScheduleTime('')
        setSelectedPartners([])
        setSelectedTemplate('')
        loadScheduledEmails()
      } else {
        // Send emails immediately
        for (const partner of selectedPartnerData) {
          // In a real implementation, this would call an API to send the email
          // For demo purposes, we'll just simulate sending
          
          // Record the sent email
          const { error } = await supabase
            .from('sent_emails')
            .insert({
              recipient_id: partner.id,
              recipient_email: partner.email,
              recipient_name: partner.name,
              subject: template.subject,
              body: template.body,
              status: 'sent'
            })
          
          if (error) {
            console.error('Database error:', error)
            toast.error(`Hiba az email küldésekor: ${partner.name}`)
            return
          }
        }
        
        toast.success(`${selectedPartnerData.length} email sikeresen elküldve!`)
        setSelectedPartners([])
        setSelectedTemplate('')
        loadSentEmails()
      }
    } catch (error) {
      console.error('Hiba az email küldésekor:', error)
      toast.error('Hiba az email küldésekor')
    }
  }

  const toggleOrderNotifications = async () => {
    try {
      setOrderNotifications(!orderNotifications)
      
      // Save setting to database
      const { error } = await supabase
        .from('settings')
        .upsert({
          category: 'email',
          key: 'order_notifications',
          value: JSON.stringify(!orderNotifications),
          is_public: false
        }, { onConflict: 'category,key' })
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a beállítás mentésekor')
        return
      }
      
      toast.success(`Automatikus rendelés értesítések ${!orderNotifications ? 'bekapcsolva' : 'kikapcsolva'}!`)
    } catch (error) {
      console.error('Hiba a beállítás mentésekor:', error)
      toast.error('Hiba a beállítás mentésekor')
    }
  }

  const filteredPartners = partners.filter(partner => 
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Mail className="h-8 w-8 mr-3 text-blue-600" />
            Email rendszer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Partnerek értesítése és automatikus rendelés értesítések
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-5 w-5 mr-2" />
            Beállítások
          </button>
          <button
            onClick={toggleOrderNotifications}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white ${
              orderNotifications 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            } transition-colors`}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Automatikus értesítések: {orderNotifications ? 'BE' : 'KI'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('compose')}
              className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${
                activeTab === 'compose'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Send className="h-4 w-4 mr-2" />
                <span>Új email</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span>Sablonok</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${
                activeTab === 'sent'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Elküldött</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${
                activeTab === 'scheduled'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Ütemezett</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Compose Email */}
          {activeTab === 'compose' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Partners Selection */}
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Partnerek</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedPartners.length} kiválasztva
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Keresés név vagy email alapján..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredPartners.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Nincsenek partnerek</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPartners.map((partner) => (
                        <div
                          key={partner.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedPartners.includes(partner.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => {
                            if (selectedPartners.includes(partner.id)) {
                              setSelectedPartners(prev => prev.filter(id => id !== partner.id))
                            } else {
                              setSelectedPartners(prev => [...prev, partner.id])
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white text-sm">{partner.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{partner.email}</p>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                partner.status === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : partner.status === 'suspended'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {partner.status === 'active' ? 'Aktív' : 
                                 partner.status === 'suspended' ? 'Felfüggesztve' : 'Inaktív'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Email Composition */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email összeállítása</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sablon kiválasztása
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Válasszon sablont</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedTemplate && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tárgy
                        </label>
                        <input
                          type="text"
                          value={templates.find(t => t.id === selectedTemplate)?.subject || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tartalom
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white h-64 overflow-y-auto">
                          <div dangerouslySetInnerHTML={{ __html: templates.find(t => t.id === selectedTemplate)?.body || '' }} />
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="scheduleEmail"
                          checked={scheduleEmail}
                          onChange={(e) => setScheduleEmail(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="scheduleEmail" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          Email ütemezése későbbre
                        </label>
                      </div>
                      
                      {scheduleEmail && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Dátum
                            </label>
                            <input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Idő
                            </label>
                            <input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={handleSendEmail}
                          disabled={selectedPartners.length === 0 || !selectedTemplate || (scheduleEmail && (!scheduleDate || !scheduleTime))}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {scheduleEmail ? 'Ütemezés' : 'Küldés'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email sablonok</h2>
                <button
                  onClick={() => setShowNewTemplateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Új sablon
                </button>
              </div>
              
              {templates.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nincsenek sablonok
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Hozzon létre egy új sablont az emailek küldéséhez.
                  </p>
                  <button
                    onClick={() => setShowNewTemplateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Új sablon
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.subject}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Létrehozva: {new Date(template.created_at).toLocaleDateString('hu-HU')}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template.id)
                            setActiveTab('compose')
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Használat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Sent Emails */}
          {activeTab === 'sent' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Elküldött emailek</h2>
                <button
                  onClick={loadSentEmails}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Frissítés
                </button>
              </div>
              
              {sentEmails.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nincsenek elküldött emailek
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Az elküldött emailek itt fognak megjelenni.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Címzett
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tárgy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Dátum
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Állapot
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sentEmails.map((email) => (
                          <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {email.recipient_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {email.recipient_email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {email.subject}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {new Date(email.created_at).toLocaleString('hu-HU')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                email.status === 'sent' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : email.status === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              }`}>
                                {email.status === 'sent' ? 'Elküldve' : 
                                 email.status === 'failed' ? 'Sikertelen' : 'Feldolgozás alatt'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Scheduled Emails */}
          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ütemezett emailek</h2>
                <button
                  onClick={loadScheduledEmails}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Frissítés
                </button>
              </div>
              
              {scheduledEmails.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nincsenek ütemezett emailek
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Az ütemezett emailek itt fognak megjelenni.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Címzett
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tárgy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Ütemezve
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Állapot
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {scheduledEmails.map((email) => (
                          <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {email.recipient_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {email.recipient_email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {email.subject}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {new Date(email.scheduled_time).toLocaleString('hu-HU')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                Ütemezve
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Új email sablon
                </h2>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sablon neve *
                  </label>
                  <input
                    type="text"
                    value={templateData.name}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="pl. Havi hírlevél"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tárgy *
                  </label>
                  <input
                    type="text"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="pl. Havi ajánlataink"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tartalom *
                  </label>
                  <textarea
                    value={templateData.body}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, body: e.target.value }))}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Email tartalma..."
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Használhat HTML formázást és a következő változókat: {'{name}'}, {'{company}'}, {'{date}'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Létrehozás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Email beállítások
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SMTP szerver
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SMTP port
                    </label>
                    <input
                      type="number"
                      value={emailSettings.smtp_port}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Biztonságos kapcsolat (SSL/TLS)
                    </label>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        id="smtp_secure"
                        checked={emailSettings.smtp_secure}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_secure: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="smtp_secure" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Biztonságos kapcsolat használata
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Felhasználónév
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_username}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jelszó
                  </label>
                  <input
                    type="password"
                    value={emailSettings.smtp_password}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Feladó neve
                    </label>
                    <input
                      type="text"
                      value={emailSettings.from_name}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Feladó email címe
                    </label>
                    <input
                      type="email"
                      value={emailSettings.from_email}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, from_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mentés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}