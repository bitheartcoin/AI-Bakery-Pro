import React, { useState, useEffect, useRef } from 'react'
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Settings, 
  X, 
  Save, 
  RefreshCw, 
  QrCode,
  Barcode,
  FileText,
  Download,
  Volume2,
  VolumeX,
  Package
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { elevenlabsApi } from '../lib/elevenlabsApi'
import BarcodeScanner from '../components/Inventory/BarcodeScanner'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface AISettings {
  model: 'gemini-1.5-flash' | 'gemini-pro' | 'gemini-pro-vision' | 'gemini-ultra'
  apiKey: string
  temperature: number
  maxTokens: number
  voice: string
  speakResponses: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface AISettings {
  model: 'gemini-1.5-flash' | 'gemini-pro' | 'gemini-pro-vision' | 'gemini-ultra'
  apiKey: string
  temperature: number
  maxTokens: number
  voice: string
  speakResponses: boolean
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<AISettings>({
    model: 'gemini-1.5-flash',
    apiKey: 'AIzaSyBiN_fIC-2XG7DLvphRv8mZEKa-skcaJiQ', // Default API key
    temperature: 0.7,
    maxTokens: 1000,
    voice: 'Vivien',
    speakResponses: true
  })
  const [isListening, setIsListening] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Add initial welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Üdvözlöm a Szemesi Pékség adminisztrációs rendszerében! Segíthetek a készletkezelésben, rendelések kezelésében, gyártási folyamatok irányításában, szállítások nyomon követésében, vagy bármilyen más kérdésben a pékség működésével kapcsolatban. Kérem, mondja el, miben segíthetek!',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    
    // Load settings from database
    loadSettings()
    
    // Initialize speech recognition
    initSpeechRecognition()
    
    return () => {
      // Clean up speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      // Stop any playing audio
      elevenlabsApi.stop()
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [messages])

  const loadSettings = async () => {
    try {
      // Load settings from database
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('category', 'ai_assistant')
        .eq('key', 'settings')
        .single()
      
      if (error) {
        console.error('Error loading settings:', error)
        return
      }
      
      if (data && data.value) {
        try {
          const savedSettings = JSON.parse(data.value)
          setSettings(prev => ({ ...prev, ...savedSettings }))
        } catch (e) {
          console.error('Error parsing settings:', e)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      // Save settings to database
      const { error } = await supabase
        .from('settings')
        .upsert({
          category: 'ai_assistant',
          key: 'settings',
          value: JSON.stringify(settings),
          is_public: false
        })
      
      if (error) {
        console.error('Error saving settings:', error)
        toast.error('Hiba a beállítások mentésekor')
        return
      }
      
      toast.success('Beállítások sikeresen mentve!')
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Hiba a beállítások mentésekor')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      // Get database context for the query
      const dbContext = await fetchDatabaseContext(input)
      console.log("Database context:", dbContext)

      // Call Gemini API through Supabase Edge Function
      const response = await callAIAPI(input, dbContext)
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response || "Sajnálom, nem sikerült választ kapnom a kérdésedre. Kérlek próbáld újra később.",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Speak response if enabled
      if (settings.speakResponses) {
        elevenlabsApi.textToSpeech(response)
      }
    } catch (error) {
      console.error('Error in message handling:', error)
      
      // Fallback response
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sajnálom, de jelenleg nem tudok kapcsolódni az AI szolgáltatáshoz. Kérem, próbálja újra később, vagy forduljon a rendszergazdához segítségért.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setLoading(false)
    }
  }
  
  const callAIAPI = async (userInput: string, dbContext: string): Promise<string> => {
    try {
      // Create prompt with context
      const messages = [
        {
          role: 'user',
          parts: [{ text: `Te egy AI asszisztens vagy a "Szemesi Pékség" nevű pékség menedzsment rendszerhez.
Segítesz a készletkezelésben, rendelések feldolgozásában, termelés tervezésben, szállítások nyomon követésében és egyéb pékségi műveletekben.

Jelenlegi dátum: ${new Date().toLocaleDateString('hu-HU')}

Itt van az aktuális adatbázis kontextus, ami releváns lehet a felhasználó kérdéséhez:
${dbContext}

Válaszolj magyar nyelven. Légy segítőkész, tömör és pontos. Mindig használj konkrét adatokat az adatbázis kontextusból, amikor készletről, rendelésekről, termelésről stb. válaszolsz kérdésekre.

Ha nincs elég információd az adatbázisban, akkor mondd el, hogy milyen adatokat látsz, és kérdezz rá, hogy pontosan mire kíváncsi a felhasználó.` }]
        },
        {
          role: 'user',
          parts: [{ text: userInput }]
        }
      ];

      // Call Google Gemini API directly
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: settings.temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: settings.maxTokens,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling AI API:', error);
      return 'Sajnálom, de jelenleg nem tudok kapcsolódni az AI szolgáltatáshoz. Kérem, próbálja újra később, vagy forduljon a rendszergazdához segítségért.';
    }
  };
  
  const fetchDatabaseContext = async (userInput: string): Promise<string> => {
    try {
      let context = '';
      
      // Try to fetch from common tables directly
      if (userInput.toLowerCase().includes('készlet') || 
          userInput.toLowerCase().includes('inventory') || 
          userInput.toLowerCase().includes('alapanyag')) {
        // Fetch inventory data
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .order('current_stock', { ascending: true })
          .limit(10);
        
        if (!inventoryError && inventoryData) {
          context += 'Készlet adatok (10 legalacsonyabb készletű tétel):\n';
          inventoryData.forEach(item => {
            context += `- ${item.name}: ${item.current_stock} ${item.unit} (min: ${item.min_threshold})\n`;
          });
          context += '\n';
        }
      }
      
      if (userInput.toLowerCase().includes('rendelés') || 
          userInput.toLowerCase().includes('order')) {
        // Fetch recent orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!ordersError && ordersData) {
          context += 'Legutóbbi rendelések (utolsó 5):\n';
          ordersData.forEach(order => {
            context += `- Order #${order.order_number}: ${order.status}, ${order.total_amount} Ft, ${new Date(order.created_at).toLocaleDateString('hu-HU')}\n`;
          });
          context += '\n';
        }
      }
      
      if (userInput.toLowerCase().includes('gyártás') || 
          userInput.toLowerCase().includes('termelés') || 
          userInput.toLowerCase().includes('production')) {
        // Fetch production batches
        const { data: batchesData, error: batchesError } = await supabase
          .from('production_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!batchesError && batchesData) {
          context += 'Legutóbbi gyártási tételek (utolsó 5):\n';
          batchesData.forEach(batch => {
            context += `- Tétel #${batch.batch_number}: ${batch.status}, ${batch.batch_size} db\n`;
          });
          context += '\n';
        }
      }
      
      if (userInput.toLowerCase().includes('profil') || 
          userInput.toLowerCase().includes('alkalmazott') || 
          userInput.toLowerCase().includes('dolgozó') ||
          userInput.toLowerCase().includes('munkatárs')) {
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(10);
        
        if (!profilesError && profilesData) {
          context += 'Alkalmazottak (első 10):\n';
          profilesData.forEach(profile => {
            context += `- ${profile.full_name || profile.email}: ${profile.role}, ${profile.status}\n`;
          });
          context += '\n';
        }
      }

      if (userInput.toLowerCase().includes('helyszín') || 
          userInput.toLowerCase().includes('üzlet') ||
          userInput.toLowerCase().includes('bolt') ||
          userInput.toLowerCase().includes('location')) {
        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*');
        
        if (!locationsError && locationsData) {
          context += 'Helyszínek:\n';
          locationsData.forEach(location => {
            context += `- ${location.name}: ${location.address}, ${location.city}, ${location.postal_code}\n`;
          });
          context += '\n';
        }
      }
      
      if (!context) {
        context = 'Nincs specifikus adat a kérdéshez. Kérem, pontosítsa a kérdését.';
      }
      
      return context;
    } catch (error) {
      console.error('Error fetching database context:', error);
      return 'Nem sikerült lekérdezni az adatbázist. Kérem, próbálja újra később.';
    }
  }

  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.lang = 'hu-HU'
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }
    
    recognitionRef.current.onend = () => {
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsListening(true)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
      }
    }
  }

  const toggleSpeakResponses = () => {
    setSettings(prev => ({ ...prev, speakResponses: !prev.speakResponses }))
    
    if (!settings.speakResponses) {
      // If turning on, test the voice
      elevenlabsApi.textToSpeech('Hangos válaszok bekapcsolva.')
    } else {
      // If turning off, stop any playing audio
      elevenlabsApi.stop()
    }
  }

  const handleScanBarcode = (data: string, type: 'barcode' | 'qrcode') => {
    setShowScanner(false)
    
    // Add scanned data to input
    setInput(prev => {
      const prefix = type === 'barcode' ? 'Vonalkód: ' : 'QR kód: '
      return `${prev} ${prefix}${data}`.trim()
    })
    
    toast.success(`${type === 'barcode' ? 'Vonalkód' : 'QR kód'} beolvasva: ${data}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Bot className="h-8 w-8 mr-3 text-purple-600" />
            AI Asszisztens
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Kérdezzen az AI asszisztenstől a pékség működésével kapcsolatban
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleSpeakResponses}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title={settings.speakResponses ? 'Hangos válaszok kikapcsolása' : 'Hangos válaszok bekapcsolása'}
          >
            {settings.speakResponses ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Vonalkód/QR kód beolvasása"
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Beállítások"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' 
                    ? 'text-purple-200' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleListening}
            className={`p-3 rounded-full ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Írjon üzenetet..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI Asszisztens Beállítások
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Modell
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value as AISettings['model'] }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    <option value="gemini-ultra">Gemini Ultra</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Kulcs
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hőmérséklet: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Precíz</span>
                    <span>Kreatív</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum tokenek: {settings.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={settings.maxTokens}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Rövid</span>
                    <span>Hosszú</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hang
                  </label>
                  <select
                    value={settings.voice}
                    onChange={(e) => setSettings(prev => ({ ...prev, voice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Vivien">Vivien</option>
                    <option value="Rachel">Rachel</option>
                    <option value="Domi">Domi</option>
                    <option value="Bella">Bella</option>
                    <option value="Antoni">Antoni</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="speakResponses"
                    checked={settings.speakResponses}
                    onChange={() => setSettings(prev => ({ ...prev, speakResponses: !prev.speakResponses }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="speakResponses" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Hangos válaszok
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Mentés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleScanBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

// Add these interfaces to make TypeScript happy
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
}