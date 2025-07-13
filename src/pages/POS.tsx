import React, { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  DollarSign,
  Receipt,
  Save,
  Package,
  User,
  ArrowLeft,
  ArrowRight,
  X,
  CheckCircle,
  AlertTriangle,
  Printer,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
// EZ AZ ELSŐ, HELYES IMPORT, EZ MARAD:
import BarcodeScanner from '../components/Inventory/BarcodeScanner'


interface Product {
  id: string
  name: string
  category: string
  retail_price: number
  vat_percentage?: number
  barcode?: string
  qr_code?: string
  image_url?: string
}
// EZ AZ ISMÉTLŐDŐ IMPORT VOLT, EZT TÖRLÖM:
// import BarcodeScanner from '../components/Inventory/BarcodeScanner'; // Ezt a sort töröltem!

interface CartItem {
  product: Product
  quantity: number
}

interface StoreInventoryItem {
  id: string
  store_id: string
  product_id: string // Lehet null/undefined ha csak boltra specifikus
  name: string
  category: string
  current_stock: number
  unit: string
  selling_price: number
  cost_price?: number // Beszerzési ár
  barcode?: string
  qr_code?: string
  is_store_specific?: boolean // Jelzi, ha ez a tétel nem a master products-ból jön
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]) // Master product list
  const [storeInventory, setStoreInventory] = useState<StoreInventoryItem[]>([]) // Inventory for selected store
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([]) // Categories from master products
  const [showCheckout, setShowCheckout] = useState(false)
  // showScanner mostantól csak a Kosárba adáshoz használt szkennert fogja vezérelni
  const [showScanner, setShowScanner] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnItems, setReturnItems] = useState<CartItem[]>([])
  const [returnReason, setReturnReason] = useState('')
  const [locations, setLocations] = useState<{id: string, name: string}[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [cashierName, setCashierName] = useState('Admin Felhasználó')
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [storeInventoryItems, setStoreInventoryItems] = useState<StoreInventoryItem[]>([]) // Copy used for filtering *within* the Inventory Modal
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [inventoryCategories, setInventoryCategories] = useState<string[]>(['all']) // Categories from store inventory
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState('all')
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false)
  const [inventoryFormData, setInventoryFormData] = useState({
    name: '',
    category: '',
    current_stock: 0,
    unit: 'db',
    selling_price: 0,
    cost_price: 0
  })
  // Új state-ek a szkennelt termék mennyiség hozzáadásához (Készlethez adás)
   const [showInventoryScanner, setShowInventoryScanner] = useState(false); // Új state a készlet szkenneléshez
   const [showQuantityModal, setShowQuantityModal] = useState(false);
   const [selectedInventoryItem, setSelectedInventoryItem] = useState<StoreInventoryItem | null>(null);
   const [inventoryQuantity, setInventoryQuantity] = useState<number>(1);


  useEffect(() => {
    loadProducts()
    loadCategories()
    loadLocations()

    // Get current user name
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (data && data.full_name) {
          setCashierName(data.full_name)
        }
      }
    }

    getCurrentUser()

    // Load inventory categories
    loadInventoryCategories()
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      loadStoreInventory()
    } else {
        // If no location is selected, clear store inventory state
        setStoreInventory([]);
        setStoreInventoryItems([]);
        // Maybe reload master products here if needed, though loadProducts runs on mount
    }
  }, [selectedLocation])

  const loadProducts = async () => {
    try {
      setLoading(true) // Use loading for the whole component initially? Or separate loading states?
      // Let's keep it simple for now, one loading state

      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, retail_price, vat_percentage, barcode, qr_code, image_url')
        .order('name')

      if (error) {
        console.error('Error loading products:', error)
        toast.error('Hiba a termékkatalógus betöltésekor')
        return
      }

      if (data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Hiba a termékkatalógus betöltésekor')
    } finally {
      // setLoading(false); // Don't set false here, wait for store inventory or location selection state
    }
  }

  const loadStoreInventory = async () => {
    try {
      if (!selectedLocation) {
         setStoreInventory([]);
         setStoreInventoryItems([]);
         return;
      }

      setLoading(true) // Set loading when fetching store inventory

      const { data, error } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('store_id', selectedLocation)
        .order('name')

      if (error) {
        console.error('Error loading store inventory:', error)
        toast.error('Hiba a készlet betöltésekor')
        // Optionally clear store inventory state on error
        setStoreInventory([]);
        setStoreInventoryItems([]);
        return;
      }

      if (data) {
        setStoreInventory(data)
        setStoreInventoryItems(data) // Keep a separate copy for modal filtering
      }
    } catch (error) {
      console.error('Error loading store inventory:', error)
      toast.error('Hiba a készlet betöltésekor')
       setStoreInventory([]);
       setStoreInventoryItems([]);
    } finally {
      setLoading(false); // Set loading false after store inventory fetch attempt
    }
  }
  // Handle adding quantity to existing inventory item (used for scanning into inventory)
  const handleAddInventoryQuantity = async (item: StoreInventoryItem, quantity: number) => {
    try {
       const { data: { user } } = await supabase.auth.getUser(); // Get user here

       if (!selectedLocation || !item.id) {
           toast.error('Hiányzó üzlet vagy készlet azonosító.');
           return;
       }
       if (quantity <= 0) {
           toast.error('A hozzáadandó mennyiségnek pozitívnak kell lennie.');
           return;
       }

      // Update inventory in database
      const newStock = item.current_stock + quantity;

      const { error: updateError } = await supabase
        .from('store_inventory')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('store_id', selectedLocation); // Add store_id check for safety

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        toast.error('Hiba a készlet frissítésekor');
        return;
      }

      // Create inventory transaction
      const transactionData = {
        store_id: selectedLocation,
        inventory_id: item.id,
        transaction_type: 'addition',
        quantity: quantity,
        reason: 'Készlet feltöltés (POS szkennelés/manuális hozzáadás)',
        created_by: user?.id
      };

      const { error: transactionError } = await supabase
        .from('store_inventory_transactions')
        .insert(transactionData);

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // This is often a non-fatal error for the main update, but log it.
         toast('Figyelem: Készlet frissült, de a tranzakció rögzítése sikertelen volt.', { icon: '⚠️' });
      } else {
         toast.success(`${quantity} ${item.unit} ${item.name} hozzáadva a készlethez`);
      }


      // Refresh inventory
      loadStoreInventory();
    } catch (error) {
      console.error('Error adding inventory quantity:', error)
      toast.error('Hiba a készlet frissítésekor: ' + (error as Error).message);
    }
  };


  const handleAddInventoryItem = async () => {
    try {
      if (!selectedLocation) {
        toast.error('Kérjük válasszon üzletet')
        return
      }

      if (!inventoryFormData.name || !inventoryFormData.category || inventoryFormData.current_stock < 0 || inventoryFormData.selling_price < 0) {
        toast.error('Kérjük töltse ki a kötelező mezőket, és adjon meg érvényes számokat a mennyiséghez/árakhoz.')
        return
      }
       const { data: { user } } = await supabase.auth.getUser(); // Get user here

      // Create inventory item
      const inventoryData = {
        store_id: selectedLocation,
        name: inventoryFormData.name,
        category: inventoryFormData.category,
        current_stock: inventoryFormData.current_stock,
        unit: inventoryFormData.unit,
        selling_price: inventoryFormData.selling_price,
        cost_price: inventoryFormData.cost_price > 0 ? inventoryFormData.cost_price : null, // Store cost_price only if > 0
        is_store_specific: true, // Assuming items added here are store-specific initially
        product_id: null, // No linked product from master list when adding manually
        // Optional: add barcode/qr_code fields if you want to add them here
        // barcode: inventoryFormData.barcode || null,
        // qr_code: inventoryFormData.qr_code || null,
      }

      const { data, error } = await supabase
        .from('store_inventory')
        .insert(inventoryData)
        .select()

      if (error) {
        console.error('Error adding inventory item:', error)
        toast.error('Hiba a készlet tétel hozzáadásakor: ' + error.message) // More specific error message
        return
      }

      // Create initial inventory transaction if initial stock > 0
      if (data && data.length > 0 && inventoryFormData.current_stock > 0) {
        const transactionData = {
          store_id: selectedLocation,
          inventory_id: data[0].id,
          transaction_type: 'addition',
          quantity: inventoryFormData.current_stock,
          reason: 'Initial stock',
          created_by: user?.id
        }

        const { error: transactionError } = await supabase
          .from('store_inventory_transactions')
          .insert(transactionData)

        if (transactionError) {
          console.error('Error creating inventory transaction:', transactionError)
          toast('Figyelem: Készlet tétel hozzáadva, de az induló tranzakció rögzítése sikertelen volt.', { icon: '⚠️' });
        } else {
            toast.success('Készlet tétel sikeresen hozzáadva és induló készlet rögzítve!')
        }
      } else {
         toast.success('Készlet tétel sikeresen hozzáadva (0 induló készlettel)!')
      }


      setShowAddInventoryModal(false)
      // Reset form data
      setInventoryFormData({
        name: '',
        category: '',
        current_stock: 0,
        unit: 'db',
        selling_price: 0,
        cost_price: 0
      })

      // Reload inventory and categories
      loadStoreInventory()
      loadInventoryCategories(); // Refresh inventory categories list
    } catch (error) {
      console.error('Error adding inventory item:', error)
      toast.error('Hiba a készlet tétel hozzáadásakor: ' + (error as Error).message)
    }
  }

  const loadCategories = async () => {
    try {
      // Get unique categories from products
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .order('category')

      if (error) {
        console.error('Error loading categories:', error)
        return
      }

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category))).filter(Boolean) // Filter out null/undefined
        setCategories(['all', ...uniqueCategories])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadInventoryCategories = async () => {
    try {
      // Get unique categories from store_inventory
      const { data, error } = await supabase
        .from('store_inventory')
        .select('category')
        .order('category')

      if (error) {
        console.error('Error loading inventory categories:', error)
        return
      }

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category))).filter(Boolean) // Filter out null/undefined
        setInventoryCategories(['all', ...uniqueCategories])
      }
    } catch (error) {
      console.error('Error loading inventory categories:', error)
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('type', 'store')
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error loading locations:', error)
        toast.error('Hiba az üzletek betöltésekor');
        return
      }

      if (data) {
        setLocations(data)
        if (data.length > 0) {
          setSelectedLocation(data[0].id) // Auto-select the first location
        } else {
            setSelectedLocation(''); // No locations available
            toast('Nincsenek aktív üzletek a rendszerben.', { icon: '⚠️' });
        }
      } else {
         setLocations([]);
         setSelectedLocation('');
         toast('Nincsenek aktív üzletek a rendszerben.', { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Error loading locations:', error)
      toast.error('Hiba az üzletek betöltésekor');
    } finally {
        // Consider setting loading to false here if location loading is the final step
        // If store inventory loads after, the other loading state handles it
    }
  }

   // Function to map StoreInventoryItem back to a Product structure for the cart/display
   const mapInventoryItemToProduct = (item: StoreInventoryItem): Product => {
       // Find the original product if product_id exists, otherwise use inventory item details
       const originalProduct = products.find(p => p.id === item.product_id);

       return {
           id: item.product_id || item.id, // Use product_id if available, fallback to inventory item id
           name: originalProduct?.name || item.name, // Prefer name from master product if linked
           category: originalProduct?.category || item.category, // Prefer category from master product if linked
           retail_price: item.selling_price, // Always use selling_price from inventory for POS
           vat_percentage: originalProduct?.vat_percentage || 27, // Prefer VAT from master product, default to 27%
           barcode: originalProduct?.barcode || item.barcode, // Prefer barcode from master product
           qr_code: originalProduct?.qr_code || item.qr_code, // Prefer QR from master product
           image_url: originalProduct?.image_url // Use image from master product
       };
   };


  const addToCart = (product: Product) => {
       // Check stock before adding to cart if a location is selected
       if (!selectedLocation) {
            toast.error('Kérjük válasszon üzletet a kosárba adás előtt.');
            return; // Prevent adding to cart if no location
       }

       // Find item in store inventory
       const inventoryItem = storeInventory.find(item => item.product_id === product.id || (item.is_store_specific && item.id === product.id)); // Find by product_id or inventory item ID if store specific

       if (!inventoryItem) {
           toast.error(`${product.name} nincs a kiválasztott üzlet készletében.`);
           return;
       }

       const currentCartQuantity = cart.find(item => item.product.id === product.id)?.quantity || 0;

       if (inventoryItem.current_stock <= currentCartQuantity) {
           toast.error(`Nincs elég készleten (${inventoryItem.current_stock}) a termékből: ${product.name}`);
           return;
       }


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

  const updateQuantity = (productId: string, quantity: number) => {
      // Prevent increasing quantity beyond stock if location is selected
      if (selectedLocation) {
           const cartItem = cart.find(item => item.product.id === productId);
           if (cartItem) {
              const inventoryItem = storeInventory.find(item => item.product_id === productId || (item.is_store_specific && item.id === productId));

              if (inventoryItem && quantity > inventoryItem.current_stock) {
                   toast.error(`Nincs elég készleten (${inventoryItem.current_stock}) a termékből: ${cartItem.product.name}`);
                   // Don't update quantity if it exceeds stock
                   return;
               }
           }
      }

    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
    toast.success('Termék eltávolítva a kosárból')
  }

  const clearCart = () => {
    setCart([])
    toast.success('Kosár kiürítve')
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.retail_price * item.quantity), 0)
  }

  const calculateChange = () => {
    return cashReceived - calculateTotal()
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('A kosár üres')
      return
    }

    if (!selectedLocation) {
      toast.error('Kérjük válasszon üzletet')
      return
    }

    try {
       const { data: { user } } = await supabase.auth.getUser(); // Get user here

      // Generate transaction number
      const transactionNumber = `POS-${Date.now()}` // Basic transaction number

      // Create transaction data
      const transactionData = {
        transaction_number: transactionNumber,
        items: cart.map(item => ({
          id: item.product.id, // Product ID or Inventory Item ID
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.retail_price,
          vat_percentage: item.product.vat_percentage || 27,
          total: item.product.retail_price * item.quantity,
          // Maybe add barcode/qr_code here from product/inventory item if needed for receipt
          barcode: item.product.barcode,
          qr_code: item.product.qr_code,
        })),
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        location_id: selectedLocation,
        cashier_id: user?.id, // Use obtained user id
        transaction_date: new Date().toISOString(), // Add transaction date
      }

      // Insert transaction
      const { error: transactionError } = await supabase
        .from('pos_transactions')
        .insert(transactionData)

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
        toast.error('Hiba a tranzakció létrehozásakor: ' + transactionError.message)
        return
      }

      // Update inventory and create inventory transactions
      for (const item of cart) {
        // Find item in store inventory (by product_id or direct item id)
        const inventoryItem = storeInventory.find(i => i.product_id === item.product.id || (i.is_store_specific && i.id === item.product.id));

        if (inventoryItem) {
           // Check if sufficient stock *before* updating (should already be checked by addToCart, but double check is safer)
           if (inventoryItem.current_stock < item.quantity) {
               console.error(`Insufficient stock for ${item.product.name} (ID: ${item.product.id}) during checkout. Required: ${item.quantity}, Available: ${inventoryItem.current_stock}`);
               toast('Figyelem: Nincs elegendő készlet (' + inventoryItem.current_stock + ') a termékhez: ' + item.product.name + '. Csak a rendelkezésre álló mennyiség került levonásra.', { icon: '⚠️' });
               // Adjust quantity to available stock for this transaction and log
               item.quantity = inventoryItem.current_stock; // This only affects the inventory update/transaction, not the cart state itself
               if (item.quantity <= 0) {
                   console.warn(`Skipping inventory reduction for ${item.product.name} due to 0 stock.`);
                   continue; // Skip update and transaction if effective quantity is 0 or less
               }
           }

          const newStock = inventoryItem.current_stock - item.quantity;
          const quantityToDeduct = item.quantity; // Use the potentially adjusted quantity


          // Update inventory in database
          const { error: updateError } = await supabase
            .from('store_inventory')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventoryItem.id)
            .eq('store_id', selectedLocation);

          if (updateError) {
            console.error('Error updating inventory for item', item.product.name, ':', updateError);
            toast('Figyelem: Hiba a készlet frissítésekor ehhez a termékhez: ' + item.product.name, { icon: '⚠️' });
            // Continue with other items
          } else {
              // Create inventory transaction only if update was successful
              const inventoryTransactionData = {
                store_id: selectedLocation,
                inventory_id: inventoryItem.id,
                transaction_type: 'reduction',
                quantity: quantityToDeduct,
                reason: `POS Sale: ${transactionNumber}`,
                reference_id: transactionNumber,
                created_by: user?.id
              }

              const { error: inventoryTransactionError } = await supabase
                .from('store_inventory_transactions')
                .insert(inventoryTransactionData)

              if (inventoryTransactionError) {
                console.error('Error creating inventory transaction for sale:', inventoryTransactionError)
                toast('Figyelem: Hiba a készlet mozgás rögzítésekor ehhez a termékhez: ' + item.product.name, { icon: '⚠️' });
                // Continue with other items
              }
          }

        } else {
            console.warn(`Inventory item not found for product ID ${item.product.id} during checkout. Cannot deduct from stock.`);
            toast('Figyelem: Nem található készlet tétel ehhez a termékhez a levonáshoz: ' + item.product.name, { icon: '⚠️' });
        }
      }

      toast.success('Tranzakció sikeresen létrehozva!')

      // Print receipt
      printReceipt(transactionNumber)

      // Clear cart and reset checkout
      setCart([])
      setShowCheckout(false)
      setCashReceived(0)
      // Refresh inventory after sale
      loadStoreInventory();
    } catch (error) {
      console.error('Error during checkout:', error)
      toast.error('Hiba a fizetés során: ' + (error as Error).message) // Cast error to Error type
    }
  }

  const handleReturn = async () => {
    if (returnItems.length === 0) {
      toast.error('Nincs kiválasztva visszáru')
      return
    }

    if (!returnReason) {
      toast.error('Kérjük adja meg a visszáru okát')
      return
    }

    if (!selectedLocation) {
      toast.error('Kérjük válasszon üzletet')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser(); // Get user here

      // Generate return number
      const returnNumber = `RET-${Date.now()}`

      // Calculate total return amount
      const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.product.retail_price * item.quantity), 0);


      // Create return data
      const returnData = {
        return_number: returnNumber,
        customer_name: 'Visszáru', // Maybe link to customer later
        return_date: new Date().toISOString(),
        total_amount: totalReturnAmount,
        reason: returnReason,
        status: 'completed', // Set status to completed as inventory is updated immediately
        processed_by: user?.id, // Use obtained user id
        location_id: selectedLocation
      }

      // Insert return
      const { data: returnData2, error: returnError } = await supabase
        .from('returns')
        .insert(returnData)
        .select()

      if (returnError) {
        console.error('Error creating return:', returnError)
        toast.error('Hiba a visszáru létrehozásakor: ' + returnError.message)
        return
      }

      // Insert return items and update inventory
      for (const item of returnItems) {
        const returnItemData = {
          return_id: returnData2[0].id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.retail_price,
          reason: returnReason,
          condition: 'unknown' // Or add a field for this?
        }

        const { error: returnItemError } = await supabase
          .from('return_items')
          .insert(returnItemData)

        if (returnItemError) {
          console.error('Error creating return item:', returnItemError)
          toast('Figyelem: Hiba a visszáru tétel rögzítésekor ehhez a termékhez: ' + item.product.name, { icon: '⚠️' });
          // Continue with other items
        }

        // Update inventory (add items back)
         // Find item in store inventory (by product_id or direct item id)
        const inventoryItem = storeInventory.find(i => i.product_id === item.product.id || (i.is_store_specific && i.id === item.product.id));


        if (inventoryItem) {
          const newStock = inventoryItem.current_stock + item.quantity;

           // Update inventory in database
          const { error: updateError } = await supabase
             .from('store_inventory')
             .update({
               current_stock: newStock,
               updated_at: new Date().toISOString()
             })
             .eq('id', inventoryItem.id)
             .eq('store_id', selectedLocation);


          if (updateError) {
             console.error('Error updating inventory for returned item', item.product.name, ':', updateError);
             toast('Figyelem: Hiba a készlet frissítésekor a visszáruhoz ehhez a termékhez: ' + item.product.name, { icon: '⚠️' });
             // Continue with other items
          } else {
              // Create inventory transaction only if update was successful
              const inventoryTransactionData = {
                store_id: selectedLocation,
                inventory_id: inventoryItem.id,
                transaction_type: 'addition',
                quantity: item.quantity,
                reason: `Return: ${returnNumber} - ${returnReason}`, // Include reason in transaction
                reference_id: returnNumber,
                created_by: user?.id
              }

              const { error: inventoryTransactionError } = await supabase
                .from('store_inventory_transactions')
                .insert(inventoryTransactionData)

              if (inventoryTransactionError) {
                console.error('Error creating inventory transaction for return:', inventoryTransactionError)
                 toast('Figyelem: Hiba a készlet mozgás rögzítésekor a visszáruhoz ehhez a termékhez: ' + item.product.name, { icon: '⚠️' });
                // Continue with other items
              }
           }
        } else {
             console.warn(`Inventory item not found for product ID ${item.product.id} during return. Cannot add back to stock.`);
             toast('Figyelem: Nem található készlet tétel ehhez a termékhez a visszáru rögzítésekor, a készlet nem lett frissítve: ' + item.product.name, { icon: '⚠️' });
         }
      }

      toast.success('Visszáru sikeresen rögzítve!')

      // Clear return items and close modal
      setReturnItems([])
      setReturnReason('')
      setShowReturnModal(false)
      // Refresh inventory after return
      loadStoreInventory();
    } catch (error) {
      console.error('Error during return:', error)
      toast.error('Hiba a visszáru rögzítése során: ' + (error as Error).message)
    }
  }

  // Handler for scanning items to ADD TO CART
   const handleScanForCart = (data: string, type: 'barcode' | 'qrcode') => {
     setShowScanner(false); // Close scanner after scan attempt

     if (!selectedLocation) {
        toast.error('Kérjük válasszon üzletet a szkennelés előtt.');
        return;
     }

     // Find product by barcode or QR code in the *store inventory* list first
     // If found in inventory, check if it's linked to a master product or is store-specific
     const inventoryItem = storeInventory.find(item =>
       (item.barcode === data && item.barcode !== null) || (item.qr_code === data && item.qr_code !== null)
     );

     if (inventoryItem) {
        // If found in inventory, map it to a Product structure for the cart
        const productToAdd = mapInventoryItemToProduct(inventoryItem);
        addToCart(productToAdd); // addToCart will handle stock check
     } else {
       // If not found in the current store's inventory by barcode/QR, maybe check master products?
       // Or strictly only allow scanning items that are already in the store's managed inventory?
       // For now, let's assume scanning should only find items listed in store_inventory for the selected store.
       toast.error('Termék nem található a kiválasztott üzlet készletében ezzel a kóddal.');
     }
   };

   // Handler for scanning items to ADD TO INVENTORY (stock increase)
   const handleScanForInventoryAdd = (data: string, type: 'barcode' | 'qrcode') => {
      setShowInventoryScanner(false); // Close scanner

      if (!selectedLocation) {
         toast.error('Kérjük válasszon üzletet a készlet feltöltés előtt.');
         return;
      }

       // Find the item in the *store inventory* list by barcode or QR code
       const item = storeInventory.find(item =>
          (item.barcode === data && item.barcode !== null) || (item.qr_code === data && item.qr_code !== null)
       );

       if (item) {
         // Open quantity modal for the found item
         setSelectedInventoryItem(item);
         setInventoryQuantity(1); // Default to 1
         setShowQuantityModal(true);
         toast.success(`Készlet tétel megtalálva: ${item.name}`);
       } else {
         toast.error('Nem található készlet tétel ezzel a kóddal a kiválasztott üzletben.');
       }
   };


  const printReceipt = (transactionNumber: string) => {
    // In a real app, this would print a receipt
    // For now, we'll just show a success message
    toast.success('Nyugta nyomtatása...')

    // Create a printable receipt
    const receiptContent = `
      SZEMESI PÉKSÉG
      ${locations.find(l => l.id === selectedLocation)?.name || 'Ismeretlen üzlet'}

      Nyugtaszám: ${transactionNumber}
      Dátum: ${new Date().toLocaleString('hu-HU')}
      Pénztáros: ${cashierName}

      TERMÉKEK:
      ${cart.map(item => `${item.product.name} x${item.quantity} = ${(item.product.retail_price * item.quantity).toLocaleString('hu-HU')} Ft`).join('\n')}

      Összesen: ${calculateTotal().toLocaleString('hu-HU')} Ft
      Fizetési mód: ${paymentMethod === 'cash' ? 'Készpénz' : 'Bankkártya'}
      ${paymentMethod === 'cash' ? `Kapott: ${cashReceived.toLocaleString('hu-HU')} Ft\nVisszajáró: ${calculateChange().toLocaleString('hu-HU')} Ft` : ''}

      Köszönjük a vásárlást!
    `

    console.log('Receipt:', receiptContent)
    // A valós nyomtatáshoz valamilyen nyomtatási API-t vagy libet kellene használni
    // Pl: window.print() vagy egy külső nyomtató API
  }

   // Filter products for display in the main product list area
  const filteredProducts = selectedLocation && storeInventory.length > 0
    ? storeInventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (item.barcode || '').includes(searchTerm); // Also search by barcode
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        // Only show items with stock > 0 for adding to cart if a location is selected
        return matchesSearch && matchesCategory && item.current_stock > 0;
      }).map(item => mapInventoryItemToProduct(item)) // Map inventory items to Product structure for consistent rendering
      // Ha NINCS kiválasztott üzlet VAGY az üzlet készlete üres, akkor a master terméklistát szűrjük
    : products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (product.barcode || '').includes(searchTerm); // Search barcode in master list too
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        // When showing master list, we don't filter by stock (as stock is store-specific)
        return matchesSearch && matchesCategory;
      });


   // Filter inventory items for the Inventory Modal
   const filteredInventoryItems = storeInventoryItems.filter(item => {
       const matchesSearch = item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                             item.category.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                             (item.barcode || '').includes(inventorySearchTerm); // Search barcode in inventory list
       const matchesCategory = selectedInventoryCategory === 'all' || item.category === selectedInventoryCategory;
       return matchesSearch && matchesCategory;
   });


  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ShoppingBag className="h-8 w-8 mr-3 text-blue-600" />
            POS Terminál
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Értékesítés és pénztár kezelés
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedLocation}
            onChange={(e) => {
                 setSelectedLocation(e.target.value);
                 setCart([]); // Clear cart when location changes
                 setSearchTerm(''); // Reset search
                 setSelectedCategory('all'); // Reset category
                 setStoreInventory([]); // Clear inventory until new one loads
                 setStoreInventoryItems([]);
                 // loadStoreInventory will be triggered by the useEffect dependency
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Válasszon üzletet</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
           <button
            onClick={() => {
                if (!selectedLocation) {
                    toast.error('Kérjük válasszon üzletet a készlet megtekintéséhez.');
                    return;
                }
                setShowInventoryModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={!selectedLocation}
          >
            <Package className="h-5 w-5 mr-2" />
            Készlet
          </button>
          <button
            onClick={() => {
                 if (!selectedLocation) {
                    toast.error('Kérjük válasszon üzletet a visszáru rögzítéséhez.');
                    return;
                }
                setShowReturnModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={!selectedLocation}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Visszáru
          </button>
          <button
            onClick={() => {
                 if (!selectedLocation) {
                    toast.error('Kérjük válasszon üzletet a szkenneléshez.');
                    return;
                 }
                setShowScanner(true); // This button is now solely for scanning to ADD TO CART
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={!selectedLocation} // Disable if no location selected
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Vonalkód (Kosár)
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6">
        {/* Products */}
        <div className="w-2/3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Termékek ({selectedLocation && storeInventory.length > 0 ? 'Elérhető Készleten' : 'Katalógus'})</h2>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Keresés név vagy vonalkód alapján..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                   {/* Use categories from master products for the main list */}
                   {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'Összes kategória' : category || 'Nincs kategória'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

             {/* Loading state indication */}
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && selectedLocation === '' && (
                 <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Válasszon üzletet</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                       Kérjük válasszon egy üzletet a készlet megtekintéséhez és az értékesítéshez. Addig a teljes termékkatalógust látja.
                    </p>
                 </div>
            )}

             {/* Message when location is selected but inventory is empty after loading */}
             {!loading && selectedLocation !== '' && storeInventory.length === 0 && (
                  <div className="text-center py-12">
                     <Package className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Üres készlet</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Nincs készleten lévő termék a kiválasztott üzletben.
                     </p>
                   </div>
             )}


            {!loading && (selectedLocation === '' || storeInventory.length > 0) && filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                 <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nincs találat</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Nem találhatók termékek a megadott szűrési feltételekkel.
                </p>
              </div>
            ) : (
              !loading && (selectedLocation === '' || storeInventory.length > 0) && filteredProducts.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {filteredProducts.map((product) => {
                      // Find the original inventory item to get stock if location is selected
                      const stockItem = selectedLocation
                         ? storeInventory.find(item => item.product_id === product.id || (item.is_store_specific && item.id === product.id))
                         : null; // No stock info if master list is shown

                     return (
                       <div
                         key={product.id}
                         className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                       >
                         <div className="flex justify-between items-start mb-3">
                           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                           {stockItem && ( // Display stock only if stockItem is found (location selected)
                             <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                               stockItem.current_stock > 10 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                               stockItem.current_stock > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                               'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                             }`}>
                               Készlet: {stockItem.current_stock} {stockItem.unit}
                             </span>
                           )}
                         </div>
                         <div className="flex justify-between items-center">
                           <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                             {product.retail_price.toLocaleString('hu-HU')} Ft
                             {product.vat_percentage !== undefined && (
                               <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                 ({product.vat_percentage || 27}% ÁFA)
                               </span>
                             )}
                           </p>
                           <button
                              // Disable if no location selected OR stock is 0 or less
                              disabled={!selectedLocation || (stockItem ? stockItem.current_stock <= 0 : true)}
                             onClick={() => addToCart(product)} // Pass the Product structure
                             className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             <Plus className="h-5 w-5" />
                           </button>
                         </div>
                       </div>
                     )
                   })}
                 </div>
              )
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="w-1/3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2 text-blue-600" />
              Kosár ({cart.reduce((sum, item) => sum + item.quantity, 0)} termék)
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">A kosár üres</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                   {selectedLocation ? 'Adjon hozzá termékeket a kiválasztott üzlet készletéből a vásárlás megkezdéséhez.' : 'Kérjük válasszon üzletet a kosárba adáshoz.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-[calc(100vh-25rem)] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{item.product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.product.retail_price.toLocaleString('hu-HU')} Ft/db
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                           disabled={item.quantity <= 1} // Disable minus button if quantity is 1
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Részösszeg:</span>
                    <span className="text-gray-900 dark:text-white">{calculateTotal().toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span className="text-gray-900 dark:text-white">Végösszeg:</span>
                    <span className="text-gray-900 dark:text-white">{calculateTotal().toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Törlés
                  </button>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     disabled={!selectedLocation || cart.length === 0} // Disable checkout if no location selected or cart empty
                  >
                    Fizetés
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-blue-600" />
              Fizetés
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fizetési mód
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 rounded-lg flex flex-col items-center ${
                      paymentMethod === 'cash'
                        ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                    }`}
                  >
                    <DollarSign className={`h-6 w-6 ${paymentMethod === 'cash' ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`mt-2 font-medium ${paymentMethod === 'cash' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      Készpénz
                    </span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-lg flex flex-col items-center ${
                      paymentMethod === 'card'
                        ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                    }`}
                  >
                    <CreditCard className={`h-6 w-6 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`mt-2 font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      Bankkártya
                    </span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kapott összeg (Ft)
                  </label>
                  <input
                    type="number"
                     step="any" // Allow decimals for cash if needed, though less common
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />

                  {cashReceived > 0 && ( // Only show change if cash received is entered
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 dark:text-green-300">Visszajáró:</span>
                        <span className="text-lg font-bold text-green-800 dark:text-green-300">
                          {calculateChange().toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-2">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="text-gray-900 dark:text-white">Végösszeg:</span>
                  <span className="text-gray-900 dark:text-white">{calculateTotal().toLocaleString('hu-HU')} Ft</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCheckout(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleCheckout}
                disabled={paymentMethod === 'cash' && cashReceived < calculateTotal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Fizetés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2 text-blue-600" />
              Visszáru kezelése
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visszáru termékek (Készletből választható, csak a kiválasztott üzletből)
                </label>
                 {/* Filtering returnable items based on current store inventory that *could* potentially be returned */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                   {/* Show all items currently in the store inventory as potentially returnable */}
                  {storeInventory.map((inventoryItem) => {
                      // Map inventory item to a product structure for display in return list
                      const product = mapInventoryItemToProduct(inventoryItem);
                      const itemInReturnList = returnItems.find(item => item.product.id === product.id);

                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {product.retail_price.toLocaleString('hu-HU')} Ft/db
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {itemInReturnList ? (
                            <>
                              <button
                                onClick={() => {
                                  if (itemInReturnList.quantity > 1) {
                                    setReturnItems(prev => prev.map(i =>
                                      i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i
                                    ))
                                  } else {
                                    setReturnItems(prev => prev.filter(i => i.product.id !== product.id))
                                  }
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                disabled={itemInReturnList.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                                {itemInReturnList.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  setReturnItems(prev => prev.map(i =>
                                    i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                                  ))
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setReturnItems(prev => [...prev, { product, quantity: 1 }])}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                   })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visszáru oka *
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Pl. sérült termék, minőségi probléma, stb."
                  required
                />
              </div>

              {returnItems.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-2">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span className="text-gray-900 dark:text-white">Összesen (Visszárulandó):</span>
                    <span className="text-gray-900 dark:text-white">
                      {returnItems.reduce((sum, item) => sum + (item.product.retail_price * item.quantity), 0).toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnItems([])
                  setReturnReason('')
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleReturn}
                disabled={returnItems.length === 0 || !returnReason || !selectedLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Visszáru rögzítése
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Barcode Scanner Modal for ADDING TO CART */}
      {showScanner && ( // This is the scanner for the main POS screen "Vonalkód (Kosár)" button
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
               <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                   Vonalkód / QR kód beolvasása (Kosárba adás)
                 </h3>
                 <button
                   onClick={() => setShowScanner(false)}
                   className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                 >
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <div className="p-4">
                 <BarcodeScanner
                   onScan={handleScanForCart} // Use the handler for adding to cart
                   onClose={() => setShowScanner(false)}
                 />
               </div>
             </div>
         </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Üzlet készlet ({locations.find(l => l.id === selectedLocation)?.name || 'Ismeretlen'})
              </h3>
              <div className="flex space-x-2">
                 <button
                   onClick={() => {
                      if (!selectedLocation) {
                         toast.error('Kérjük válasszon üzletet a készlet feltöltéséhez.');
                         return;
                      }
                     setShowInventoryScanner(true); // This button opens scanner for adding stock
                   }}
                   className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedLocation}
                 >
                   <BarChart3 className="h-4 w-4 mr-1" />
                   Szkennelés (Készlet)
                 </button>
                <button
                  onClick={() => setShowAddInventoryModal(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={!selectedLocation} // Disable if no location selected
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Új tétel
                </button>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Keresés név, kategória vagy vonalkód alapján..."
                  value={inventorySearchTerm}
                  onChange={(e) => setInventorySearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={selectedInventoryCategory}
                onChange={(e) => setSelectedInventoryCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {inventoryCategories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Összes kategória' : category || 'Nincs kategória'}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Termék
                    </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vonalkód / QR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kategória
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Készlet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Eladási ár
                    </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Beszerzési ár
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Műveletek
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                         {item.barcode || item.qr_code || '-'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          item.current_stock <= 0
                            ? 'text-red-600 dark:text-red-400'
                            : item.current_stock <= 10
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {item.current_stock} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.selling_price.toLocaleString('hu-HU')} Ft
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                         {item.cost_price ? item.cost_price.toLocaleString('hu-HU') + ' Ft' : '-'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                           {/* Button to add quantity to existing item */}
                            <button
                               onClick={() => {
                                   setSelectedInventoryItem(item);
                                   setInventoryQuantity(1);
                                   setShowQuantityModal(true);
                               }}
                               className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                               title="Mennyiség hozzáadása"
                             >
                               <Plus className="h-4 w-4" />
                             </button>

                           {/* Button to add to cart directly from inventory list */}
                           {/* Allow adding to cart from inventory list only if stock is > 0 */}
                          <button
                            onClick={() => {
                                // Add to cart - use the mapping function
                                addToCart(mapInventoryItemToProduct(item));
                                // Optional: Close modal after adding from here
                                // setShowInventoryModal(false);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Kosárba"
                             disabled={item.current_stock <= 0 || !selectedLocation} // Disable if no stock OR no location
                          >
                            <ShoppingBag className="h-4 w-4" /> {/* Changed icon for clarity */}
                          </button>

                           {/* Add Edit/Delete buttons here later if needed */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

       {/* Barcode Scanner Modal for ADDING TO INVENTORY (Stock Increase) */}
      {showInventoryScanner && ( // This scanner is opened from the Inventory modal
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
               <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                   Vonalkód / QR kód beolvasása (Készlet feltöltés)
                 </h3>
                 <button
                   onClick={() => setShowInventoryScanner(false)} // Close this scanner
                   className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                 >
                   <X className="h-5 w-5" />
                 </button>
               </div>
               <div className="p-4">
                 <BarcodeScanner
                   onScan={handleScanForInventoryAdd} // Use the handler for adding to inventory stock
                   onClose={() => setShowInventoryScanner(false)} // Close this scanner
                 />
               </div>
             </div>
         </div>
      )}

       {/* Quantity Modal for Scanned Inventory Items (Opened after scanning for Inventory Add) */}
      {showQuantityModal && selectedInventoryItem && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
             <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
               <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                 Mennyiség hozzáadása a készlethez
               </h3>
               <button
                 onClick={() => {
                    setShowQuantityModal(false);
                    setSelectedInventoryItem(null); // Clear selected item
                    setInventoryQuantity(1); // Reset quantity
                 }}
                 className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             <div className="p-4">
               <div className="mb-4">
                 <p className="text-gray-700 dark:text-gray-300 mb-2">
                   <span className="font-medium">Termék:</span> {selectedInventoryItem.name}
                 </p>
                 <p className="text-gray-700 dark:text-gray-300 mb-2">
                   <span className="font-medium">Jelenlegi készlet:</span> {selectedInventoryItem.current_stock} {selectedInventoryItem.unit}
                 </p>
               </div>

               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Hozzáadandó mennyiség ({selectedInventoryItem.unit}) *
                 </label>
                 <input
                   type="number"
                   min="0.01"
                   step="0.01"
                   value={inventoryQuantity}
                   onChange={(e) => setInventoryQuantity(parseFloat(e.target.value) || 0)}
                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                 />
               </div>

               <div className="flex justify-end space-x-3">
                 <button
                   onClick={() => {
                      setShowQuantityModal(false);
                      setSelectedInventoryItem(null);
                      setInventoryQuantity(1);
                   }}
                   className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                 >
                   Mégse
                 </button>
                 <button
                   onClick={() => {
                      if (selectedInventoryItem && inventoryQuantity > 0) {
                        handleAddInventoryQuantity(selectedInventoryItem, inventoryQuantity);
                      } else {
                        toast.error('Adjon meg pozitív mennyiséget.');
                      }
                      setShowQuantityModal(false);
                      setSelectedInventoryItem(null); // Clear selected item
                      setInventoryQuantity(1); // Reset quantity
                   }}
                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={inventoryQuantity <= 0}
                 >
                   Hozzáadás
                 </button>
               </div>
             </div>
           </div>
         </div>
      )}


      {/* Add Inventory Item Modal */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blue-600" />
                Új készlet tétel
              </h3>
              <button
                onClick={() => setShowAddInventoryModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Termék neve *
                </label>
                <input
                  type="text"
                  value={inventoryFormData.name}
                  onChange={(e) => setInventoryFormData({...inventoryFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategória *
                </label>
                <input
                  type="text"
                  value={inventoryFormData.category}
                  onChange={(e) => setInventoryFormData({...inventoryFormData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Induló mennyiség *
                  </label>
                  <input
                    type="number"
                     step="0.01" // Allow decimals for quantity if unit is KG/L etc.
                    value={inventoryFormData.current_stock}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, current_stock: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Egység *
                  </label>
                  <select
                    value={inventoryFormData.unit}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="db">db</option>
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                    <option value="csomag">csomag</option>
                    <option value="doboz">doboz</option>
                     <option value="méter">méter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Eladási ár (Ft) *
                  </label>
                  <input
                    type="number"
                     step="0.01" // Allow decimals for price
                    value={inventoryFormData.selling_price}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, selling_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beszerzési ár (Ft)
                  </label>
                  <input
                    type="number"
                    step="0.01" // Allow decimals for price
                    value={inventoryFormData.cost_price}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, cost_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {/* Optional: Add fields for Barcode and QR code if you want to add them here */}
               {/*
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   Vonalkód
                 </label>
                 <input
                   type="text"
                   value={inventoryFormData.barcode || ''}
                   onChange={(e) => setInventoryFormData({...inventoryFormData, barcode: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                 />
               </div>
                <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   QR kód
                 </label>
                 <input
                   type="text"
                   value={inventoryFormData.qr_code || ''}
                   onChange={(e) => setInventoryFormData({...inventoryFormData, qr_code: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                 />
               </div>
               */}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddInventoryModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleAddInventoryItem}
                 disabled={!inventoryFormData.name || !inventoryFormData.category || inventoryFormData.current_stock < 0 || inventoryFormData.selling_price < 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hozzáadás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}