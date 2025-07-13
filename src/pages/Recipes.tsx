import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Filter, Download, Upload, Edit, Trash2, Eye, ChefHat, Clock, Package, Camera, QrCode, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'

interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: any[]
  instructions: string[]
  prep_time: number
  bake_time: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  yield_amount: number
  cost_per_unit?: number
  wholesale_price?: number
  retail_price?: number
  vat_percentage?: number
  image_url?: string
  barcode?: string
  qr_code?: string
  created_at: string
  updated_at: string
}

interface RecipeStep {
  id?: string
  recipe_id?: string
  step_number: number
  title: string
  description: string
  duration_minutes: number
  temperature?: number
  humidity?: number
  equipment?: string[]
  ingredients?: any[]
  notes?: string
}

interface Product {
  id: string
  name: string
  description?: string
  category: string
  wholesale_price?: number
  retail_price?: number
  image_url?: string
  ingredients?: any[]
  instructions?: string[]
  is_gluten_free?: boolean
  is_dairy_free?: boolean
  is_egg_free?: boolean
  is_vegan?: boolean
  barcode?: string
  qr_code?: string
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showRecipeDetails, setShowRecipeDetails] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false)
  const [selectedRecipeForCode, setSelectedRecipeForCode] = useState<Recipe | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [{ name: '', amount: '', unit: 'kg' }],
    instructions: [''],
    prep_time: 0,
    bake_time: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: 'bread',
    yield_amount: 1,
    cost_per_unit: 0,
    wholesale_price: 0,
    retail_price: 0,
    image_url: '',
    barcode: '',
    qr_code: ''
  })

  const categories = [
    { value: 'bread', label: 'Kenyér' },
    { value: 'pastry', label: 'Sütemény' },
    { value: 'cake', label: 'Torta' },
    { value: 'cookie', label: 'Keksz' },
    { value: 'pizza', label: 'Pizza' },
    { value: 'sandwich', label: 'Szendvics' },
    { value: 'other', label: 'Egyéb' }
  ]

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error('Error loading recipes:', error)
      toast.error('Hiba a receptek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const recipeData = {
        ...formData,
        ingredients: formData.ingredients.filter(ing => ing.name && ing.amount),
        instructions: formData.instructions.filter(inst => inst.trim())
      }

      if (editingRecipe) {
        const { error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', editingRecipe.id)

        if (error) throw error
        toast.success('Recept sikeresen frissítve!')
      } else {
        const { error } = await supabase
          .from('recipes')
          .insert([recipeData])

        if (error) throw error
        toast.success('Recept sikeresen létrehozva!')
      }

      setShowForm(false)
      setEditingRecipe(null)
      resetForm()
      loadRecipes()
    } catch (error) {
      console.error('Error saving recipe:', error)
      toast.error('Hiba a recept mentésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', amount: '', unit: 'kg' }],
      instructions: recipe.instructions.length > 0 ? recipe.instructions : [''],
      prep_time: recipe.prep_time,
      bake_time: recipe.bake_time,
      difficulty: recipe.difficulty,
      category: recipe.category,
      yield_amount: recipe.yield_amount,
      cost_per_unit: recipe.cost_per_unit || 0,
      wholesale_price: recipe.wholesale_price || 0,
      retail_price: recipe.retail_price || 0,
      image_url: recipe.image_url || '',
      barcode: recipe.barcode || '',
      qr_code: recipe.qr_code || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a receptet?')) return

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Recept sikeresen törölve!')
      loadRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast.error('Hiba a recept törlésekor')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ingredients: [{ name: '', amount: '', unit: 'kg' }],
      instructions: [''],
      prep_time: 0,
      bake_time: 0,
      difficulty: 'medium',
      category: 'bread',
      yield_amount: 1,
      cost_per_unit: 0,
      wholesale_price: 0,
      retail_price: 0,
      image_url: '',
      barcode: '',
      qr_code: ''
    })
  }

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', amount: '', unit: 'kg' }]
    })
  }

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    })
  }

  const updateIngredient = (index: number, field: string, value: string) => {
    const updatedIngredients = formData.ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    )
    setFormData({ ...formData, ingredients: updatedIngredients })
  }

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, '']
    })
  }

  const removeInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index)
    })
  }

  const updateInstruction = (index: number, value: string) => {
    const updatedInstructions = formData.instructions.map((inst, i) =>
      i === index ? value : inst
    )
    setFormData({ ...formData, instructions: updatedInstructions })
  }

  const generateBarcode = () => {
    const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    setFormData({ ...formData, barcode })
  }

  const generateQRCode = () => {
    const qrCode = `QR${Date.now()}${Math.floor(Math.random() * 1000)}`
    setFormData({ ...formData, qr_code: qrCode })
  }

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || recipe.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading && recipes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ChefHat className="h-8 w-8 mr-3 text-orange-600" />
            Receptek
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Receptek és termékek kezelése
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-orange-500/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új recept
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Keresés receptek között..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
            >
              <option value="">Összes kategória</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt={recipe.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{recipe.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {recipe.difficulty === 'easy' ? 'Könnyű' : recipe.difficulty === 'medium' ? 'Közepes' : 'Nehéz'}
                </span>
              </div>
              
              {recipe.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {recipe.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {recipe.prep_time + recipe.bake_time} perc
                </div>
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  {recipe.yield_amount} adag
                </div>
              </div>

              {(recipe.barcode || recipe.qr_code) && (
                <div className="flex items-center gap-2 mb-4">
                  {recipe.barcode && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {recipe.barcode}
                    </div>
                  )}
                  {recipe.qr_code && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <QrCode className="h-3 w-3 mr-1" />
                      {recipe.qr_code}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(recipe)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecipeForCode(recipe)
                      setShowBarcodeGenerator(true)
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedRecipe(recipe)
                    setShowRecipeDetails(true)
                  }}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Részletek
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nincsenek receptek</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || selectedCategory ? 'Nincs találat a keresési feltételeknek megfelelően.' : 'Kezdje el az első recept létrehozásával.'}
          </p>
          {!searchTerm && !selectedCategory && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Új recept
            </button>
          )}
        </div>
      )}

      {/* Recipe Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingRecipe ? 'Recept szerkesztése' : 'Új recept'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingRecipe(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Név *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategória
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Leírás
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Előkészítés (perc)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prep_time}
                    onChange={(e) => setFormData({ ...formData, prep_time: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sütés (perc)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bake_time}
                    onChange={(e) => setFormData({ ...formData, bake_time: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nehézség
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Könnyű</option>
                    <option value="medium">Közepes</option>
                    <option value="hard">Nehéz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adag
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.yield_amount}
                    onChange={(e) => setFormData({ ...formData, yield_amount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Költség/egység (Ft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nagyker ár (Ft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kisker ár (Ft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ÁFA (%)
                  </label>
                  <select
                    value={formData.vat_percentage || "27"}
                    onChange={(e) => setFormData({ ...formData, vat_percentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="27">27%</option>
                    <option value="18">18%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>

              {/* Barcode and QR Code Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vonalkód
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Vonalkód"
                    />
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    QR kód
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.qr_code}
                      onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="QR kód"
                    />
                    <button
                      type="button"
                      onClick={generateQRCode}
                      className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kép URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hozzávalók
                  </label>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    + Hozzáadás
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Hozzávaló neve"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Mennyiség"
                        value={ingredient.amount}
                        onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <select
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="db">db</option>
                      </select>
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Elkészítés lépései
                  </label>
                  <button
                    type="button"
                    onClick={addInstruction}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    + Lépés hozzáadása
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <textarea
                        placeholder={`${index + 1}. lépés leírása`}
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        rows={2}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {formData.instructions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="text-red-600 hover:text-red-700 self-start mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingRecipe(null)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Mentés...' : editingRecipe ? 'Frissítés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Details Modal */}
      {showRecipeDetails && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedRecipe.name} - Részletek
              </h2>
              <button
                onClick={() => {
                  setShowRecipeDetails(false)
                  setSelectedRecipe(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Recipe Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Alapadatok</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Kategória:</span> {categories.find(c => c.value === selectedRecipe.category)?.label}</p>
                    <p><span className="font-medium">Nehézség:</span> {
                      selectedRecipe.difficulty === 'easy' ? 'Könnyű' : 
                      selectedRecipe.difficulty === 'medium' ? 'Közepes' : 'Nehéz'
                    }</p>
                    <p><span className="font-medium">Előkészítés:</span> {selectedRecipe.prep_time} perc</p>
                    <p><span className="font-medium">Sütés:</span> {selectedRecipe.bake_time} perc</p>
                    <p><span className="font-medium">Adag:</span> {selectedRecipe.yield_amount} db</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Árak</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Költség/egység:</span> {selectedRecipe.cost_per_unit} Ft</p>
                    <p><span className="font-medium">Nagyker ár:</span> {selectedRecipe.wholesale_price} Ft</p>
                    <p><span className="font-medium">Kisker ár:</span> {selectedRecipe.retail_price} Ft</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedRecipe.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Leírás</h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedRecipe.description}</p>
                </div>
              )}

              {/* Ingredients */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Hozzávalók</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-900 dark:text-white">{ingredient.name}</span>
                        <span className="text-gray-600 dark:text-gray-400">{ingredient.amount} {ingredient.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Elkészítés lépései</h3>
                <div className="space-y-3">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <p className="text-gray-600 dark:text-gray-400 pt-1">{instruction}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Generator Modal */}
      {showBarcodeGenerator && selectedRecipeForCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Termék kódok
              </h2>
              <button
                onClick={() => {
                  setShowBarcodeGenerator(false)
                  setSelectedRecipeForCode(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {selectedRecipeForCode.name}
                </h3>
                
                {selectedRecipeForCode.barcode && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Vonalkód:</p>
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="font-mono text-lg">{selectedRecipeForCode.barcode}</div>
                    </div>
                  </div>
                )}

                {selectedRecipeForCode.qr_code && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">QR kód:</p>
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="font-mono text-lg">{selectedRecipeForCode.qr_code}</div>
                    </div>
                  </div>
                )}

                {!selectedRecipeForCode.barcode && !selectedRecipeForCode.qr_code && (
                  <p className="text-gray-500 dark:text-gray-400">
                    Ehhez a termékhez még nincsenek generált kódok.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}