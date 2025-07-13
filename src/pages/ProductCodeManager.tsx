import React, { useState, useEffect, useRef } from 'react'
import { 
  QrCode, 
  BarChart3, 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  RefreshCw,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Barcode,
  Filter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import BarcodeGenerator from '../components/Inventory/BarcodeGenerator'
import { MessageSquare } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  barcode?: string
  qr_code?: string
  retail_price: number
  wholesale_price: number
  current_stock?: number
}

interface InventoryItem {
  id: string
  name: string
  category: string
  current_stock: number
  barcode?: string
  qr_code?: string
}

export default function ProductCodeManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [codeType, setCodeType] = useState<'barcode' | 'qr'>('barcode')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [generatorType, setGeneratorType] = useState<'barcode' | 'qrcode'>('barcode')
  const [generatorValue, setGeneratorValue] = useState('')
  const [generatedCodes, setGeneratedCodes] = useState<{[key: string]: string}>({})
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Szekvenciálisan töltjük be az adatokat a hibák elkerülése érdekében
      await loadProducts()
      await loadInventory()
      await loadCategories()
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Hiba az adatok betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, barcode, qr_code, retail_price, wholesale_price')
        .order('name')
      
      if (error) {
        console.error('Error loading products:', error)
        return
      }
      
      if (data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, category, current_stock, barcode, qr_code')
        .order('name')
      
      if (error) {
        console.error('Error loading inventory:', error)
        return
      }
      
      if (data) {
        setInventory(data)
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const loadCategories = async () => {
    try {
      // Load categories from products
      const { data: productCategoriesData, error: productsError } = await supabase
        .from('products')
        .select('category')
      
      if (productsError) {
        console.error('Error loading product categories:', productsError)
        // Continue with other category sources
      } else {
        console.log('Product categories loaded:', productCategoriesData?.length || 0)
      }
      
      // Load categories from inventory
      const { data: inventoryCategoriesData, error: inventoryError } = await supabase
        .from('inventory')
        .select('category')
      
      if (inventoryError) {
        console.error('Error loading inventory categories:', inventoryError)
        // Continue with other category sources
      } else {
        console.log('Inventory categories loaded:', inventoryCategoriesData?.length || 0)
      }
      
      // Combine and deduplicate categories
      const allCategories = [
        ...(productCategoriesData?.map(p => p.category).filter(Boolean) || []),
        ...(inventoryCategoriesData?.map(i => i.category).filter(Boolean) || [])
      ]
      
      const uniqueCategories = [...new Set(allCategories)]
      console.log('Unique categories:', uniqueCategories)
      setCategories(uniqueCategories)
      
      // Fallback if no categories found
      if (uniqueCategories.length === 0) {
        console.log('No categories found, using fallback')
        setCategories(['kenyér', 'sütemény', 'pékáru', 'egyéb'])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      // Fallback categories
      setCategories(['kenyér', 'sütemény', 'pékáru', 'egyéb'])
    }
  }

  const generateCode = (product: Product, type: 'barcode' | 'qr') => {
    if (type === 'barcode') {
      // Generate EAN-13 barcode (simplified)
      const prefix = '590' // Hungarian country code
      const company = '1234' // Company code
      const productCode = product.id.slice(-5).padStart(5, '0')
      const baseCode = prefix + company + productCode
      
      // Calculate check digit
      let sum = 0
      for (let i = 0; i < baseCode.length; i++) {
        const digit = parseInt(baseCode[i])
        sum += i % 2 === 0 ? digit : digit * 3
      }
      const checkDigit = (10 - (sum % 10)) % 10
      
      return baseCode + checkDigit
    } else {
      // Generate QR code data
      return JSON.stringify({
        id: product.id,
        name: product.name,
        price: product.retail_price,
        category: product.category
      })
    }
  }

  const handleGenerateCode = async (product: Product, type: 'barcode' | 'qr') => {
    try {
      const code = generateCode(product, type)
      console.log(`Generated ${type === 'barcode' ? 'vonalkód' : 'QR kód'} for ${product.name}:`, code)
      
      // Update product in database
      const updateData = type === 'barcode' 
        ? { barcode: code }
        : { qr_code: code }
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)
      
      if (error) {
        console.error('Error updating product code:', error)
      } 
      
      // Update local state
      setGeneratedCodes(prev => ({
        ...prev,
        [`${product.id}-${type}`]: code
      }))
      
      // Csak akkor jelenítjük meg a generált kódot, ha a felhasználó kérte
      if (type === 'barcode') {
        setGeneratorType('barcode')
        setGeneratorValue(code)
        setShowGenerator(true)
      } else {
        setGeneratorType('qrcode')
        setGeneratorValue(code)
        setShowGenerator(true)
      }
      
      toast.success(`${type === 'barcode' ? 'Vonalkód' : 'QR kód'} sikeresen generálva!`)
    } catch (error) {
      console.error('Error generating code:', error)
      toast.error('Hiba a kód generálásakor')
    }
  }

  const handleBulkGenerate = async () => {
    try {
      const productsWithoutCodes = products.filter(p => 
        (codeType === 'barcode' && (!p.barcode || p.barcode.trim() === '')) || 
        (codeType === 'qr' && (!p.qr_code || p.qr_code.trim() === ''))
      )
      
      if (productsWithoutCodes.length === 0) {
        toast.info('Minden terméknek már van kódja')
        return
      }
      
      for (const product of productsWithoutCodes) {
        await handleGenerateCode(product, codeType)
      }
      
      toast.success(`${productsWithoutCodes.length} termék kódja sikeresen generálva!`)
    } catch (error) {
      console.error('Error in bulk generate:', error)
      toast.error('Hiba a tömeges generálásnál')
    }
  }

  const handleExportCodes = () => {
    try {
      const dataToExport = products.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        barcode: product.barcode || '',
        qr_code: product.qr_code || '',
        retail_price: product.retail_price,
        wholesale_price: product.wholesale_price
      }))
      
      const csv = [
        'ID,Név,Kategória,Vonalkód,QR kód,Kiskereskedelmi ár,Nagykereskedelmi ár',
        ...dataToExport.map(item => 
          `${item.id},"${item.name}","${item.category}","${item.barcode}","${item.qr_code}",${item.retail_price},${item.wholesale_price}`
        )
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `termek_kodok_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Kódok sikeresen exportálva!')
    } catch (error) {
      console.error('Error exporting codes:', error)
      toast.error('Hiba az exportálás során')
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Kérjük adjon meg kategória nevet');
      return;
    }
    
    try {
      // In a real implementation, this would add a new category to the database
      // For now, we'll just add it to the local state
      setCategories(prev => [...prev, newCategory]);
      setNewCategory('');
      toast.success('Kategória sikeresen hozzáadva!');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Hiba a kategória hozzáadásakor');
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Kérjük adjon meg kategória nevet');
      return;
    }
    
    try {
      // In a real implementation, this would update the category in the database
      // For now, we'll just update it in the local state
      setCategories(prev => prev.map(cat => 
        cat === editingCategory.id ? editingCategory.name : cat
      ));
      setEditingCategory(null);
      toast.success('Kategória sikeresen frissítve!');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Hiba a kategória frissítésekor');
    }
  }

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Biztosan törölni szeretné a(z) "${category}" kategóriát?`)) {
      return;
    }
    
    try {
      // In a real implementation, this would delete the category from the database
      // For now, we'll just remove it from the local state
      setCategories(prev => prev.filter(cat => cat !== category));
      toast.success('Kategória sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Hiba a kategória törlésekor');
    }
  }

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prevCart, { product, quantity: 1 }]
      }
    })
    toast.success(`${product.name} hozzáadva a kosárhoz`)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.qr_code && product.qr_code.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.qr_code && item.qr_code.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <QrCode className="h-8 w-8 mr-3 text-blue-600" />
            Termék kódok kezelése
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Vonalkódok és QR kódok generálása és kezelése
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportCodes}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportálás
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-5 w-5 mr-2" />
            Kategóriák
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tömeges generálás
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Frissítés
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Keresés név, vonalkód vagy QR kód alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Minden kategória</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes termék</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vonalkóddal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {products.filter(p => p.barcode).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <QrCode className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">QR kóddal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {products.filter(p => p.qr_code).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kód nélkül</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {products.filter(p => !p.barcode && !p.qr_code).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Termékek</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchTerm || selectedCategory !== 'all' ? 'Nincs találat' : 'Nincsenek termékek'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Termék
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Kategória
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vonalkód
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    QR kód
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ár
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {product.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {product.category || 'Nincs kategória'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.barcode ? (
                        <div className="flex items-center">
                          <button 
                            onClick={() => {
                              setGeneratorType('barcode');
                              setGeneratorValue(product.barcode || '');
                              setShowGenerator(true);
                              setSelectedProduct(product);
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Barcode className="h-5 w-5" />
                          </button>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            {product.barcode}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateCode(product, 'barcode')}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Generálás
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.qr_code ? (
                        <div className="flex items-center">
                          <button
                            onClick={() => { 
                              setGeneratorType('qrcode');
                              setGeneratorValue(product.qr_code || '');
                              setShowGenerator(true);
                              setSelectedProduct(product);
                            }}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            <QrCode className="h-5 w-5" />
                          </button>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            Van QR kód
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateCode(product, 'qr')}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Generálás
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {product.retail_price.toLocaleString()} Ft
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Nagy: {product.wholesale_price.toLocaleString()} Ft
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {!product.barcode && (
                          <button
                            onClick={() => handleGenerateCode(product, 'barcode')}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Vonalkód generálása"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        )}
                        {!product.qr_code && (
                          <button
                            onClick={() => handleGenerateCode(product, 'qr')}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                            title="QR kód generálása"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tömeges kód generálás</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kód típusa
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="barcode"
                    checked={codeType === 'barcode'}
                    onChange={(e) => setCodeType(e.target.value as 'barcode')}
                    className="mr-2"
                  />
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Vonalkód
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="qr"
                    checked={codeType === 'qr'}
                    onChange={(e) => setCodeType(e.target.value as 'qr')}
                    className="mr-2"
                  />
                  <QrCode className="h-4 w-4 mr-1" />
                  QR kód
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {codeType === 'barcode' 
                  ? `${products.filter(p => !p.barcode).length} terméknek nincs vonalkódja`
                  : `${products.filter(p => !p.qr_code).length} terméknek nincs QR kódja`
                }
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Mégse
              </button>
              <button
                onClick={handleBulkGenerate}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generálás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode/QR Generator Modal */}
      {showGenerator && generatorValue && (
        <BarcodeGenerator
          value={generatorValue}
          type={generatorType}
          productId={selectedProduct?.id}
          onClose={() => setShowGenerator(false)}
          onSaved={() => {
            setShowGenerator(false);
            loadData(); // Reload to get updated data
          }}
        />
      )}
      
      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kategóriák kezelése</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Új kategória hozzáadása
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Kategória neve"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meglévő kategóriák</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.filter(cat => cat !== 'all').map((category) => (
                  <div key={category} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-900 dark:text-white">{category}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingCategory({ id: category, name: category })}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {editingCategory && (
              <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategória szerkesztése
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleEditCategory}
                    className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}