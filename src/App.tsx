/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType,
  User
} from './firebase';
import { LogIn, LogOut, Plus, Trash2, Edit2, Coffee, Search, Filter, ShoppingCart, Star, Utensils, MapPin, Clock, Phone, Instagram, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  stock?: number;
  createdAt?: any;
}

interface Reservation {
  id: string;
  name: string;
  email?: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const ProductCard = ({ product, isAdmin, onEdit, onDelete }: { 
  product: Product, 
  isAdmin: boolean, 
  onEdit: (p: Product) => void, 
  onDelete: (id: string) => void,
  key?: any
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.name}/400/400`} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {product.category}
          </span>
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-medium text-gray-500 ml-1">4.5</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{product.description || "No description provided."}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-gray-900">${product.price.toLocaleString()}</span>
          <button className="p-2 bg-amber-900 text-white rounded-full hover:bg-amber-700 transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(product)}
            className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

const ProductForm = ({ product, onSave, onCancel }: { 
  product?: Product, 
  onSave: (data: Partial<Product>) => void, 
  onCancel: () => void 
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || { name: '', price: 0, category: '', description: '', imageUrl: '', stock: 0 }
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">
            {product ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Item Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                placeholder="e.g. Double Espresso"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Price ($)</label>
                <input 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Category</label>
                <input 
                  type="text" 
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Coffee"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Description</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all h-24 resize-none"
                placeholder="Tell us about the dish..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Image URL</label>
              <input 
                type="text" 
                value={formData.imageUrl} 
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                placeholder="https://example.com/item.jpg"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => onSave(formData)}
              className="flex-1 py-4 bg-amber-900 text-white font-bold rounded-2xl hover:bg-amber-800 transition-all shadow-lg shadow-amber-200"
            >
              {product ? 'Update Item' : 'Create Item'}
            </button>
            <button 
              onClick={onCancel}
              className="px-8 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ReservationForm = ({ onSave, onCancel }: { 
  onSave: (data: any) => void, 
  onCancel: () => void 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: 1
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Reservasi Meja</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
              <input 
                type="text" 
                required
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">No. WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Waktu</label>
                <input 
                  type="time" 
                  required
                  value={formData.time} 
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Jumlah Tamu</label>
              <input 
                type="number" 
                min="1"
                value={formData.guests} 
                onChange={e => setFormData({ ...formData, guests: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => onSave(formData)}
              className="flex-1 py-4 bg-amber-900 text-white font-bold rounded-2xl hover:bg-amber-800 transition-all shadow-lg shadow-amber-200"
            >
              Kirim Reservasi
            </button>
            <button 
              onClick={onCancel}
              className="px-8 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const LoginForm = ({ onLogin, onCancel }: { 
  onLogin: (user: any) => void, 
  onCancel: () => void 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'adminklopp') {
      onLogin({ displayName: 'Admin Klopp', email: 'admin@klopp.cafe', photoURL: 'https://ui-avatars.com/api/?name=Admin+Klopp&background=78350f&color=fff' });
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-6 text-center">Sign In Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Username</label>
              <input 
                type="text" 
                required
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <div className="flex gap-3 mt-8">
              <button 
                type="submit"
                className="flex-1 py-4 bg-amber-900 text-white font-bold rounded-2xl hover:bg-amber-800 transition-all shadow-lg shadow-amber-200"
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={onCancel}
                className="px-8 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [customUser, setCustomUser] = useState<any>(null);
  const user = firebaseUser || customUser;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [view, setView] = useState<'landing' | 'admin'>('landing');
  const [adminTab, setAdminTab] = useState<'products' | 'reservations'>('products');

  const isAdmin = useMemo(() => {
    return user?.email === "muhammad.adjiprasetyo28@gmail.com" || user?.email === "admin@klopp.cafe";
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      setView('admin');
    } else {
      setView('landing');
    }
  }, [isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (customUser) {
      setCustomUser(null);
    } else {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
    setView('landing');
  };

  useEffect(() => {
    if (!isAuthReady) return;

    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(pList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    let unsubReservations = () => {};
    if (isAdmin) {
      const qReservations = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
      unsubReservations = onSnapshot(qReservations, (snapshot) => {
        const rList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Reservation[];
        setReservations(rList);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reservations');
      });
    }

    return () => {
      unsubProducts();
      unsubReservations();
    };
  }, [isAuthReady, isAdmin]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login popup was closed or a new request was made.");
      } else {
        console.error("Login failed:", error);
        alert("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };


  const handleSaveProduct = async (data: Partial<Product>) => {
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: new Date()
        });
      }
      setShowForm(false);
      setEditingProduct(undefined);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleSaveReservation = async (data: any) => {
    try {
      await addDoc(collection(db, 'reservations'), {
        ...data,
        status: 'pending',
        createdAt: new Date()
      });
      alert("Reservasi berhasil dikirim! Kami akan menghubungi Anda segera.");
      setShowReservationForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm("Hapus data reservasi ini?")) return;
    try {
      await deleteDoc(doc(db, 'reservations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    }
  };

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(products.map(p => p.category))];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FAF9F6] text-gray-900 font-sans selection:bg-amber-100">
        {/* Navigation */}
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <Coffee className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-black tracking-tight text-amber-900">KLOPP <span className="text-amber-600 font-medium">#TempatBercerita</span></h1>
              </div>

              <div className="flex items-center gap-4">
                {user && (
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <button 
                        onClick={() => setView(view === 'landing' ? 'admin' : 'landing')}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-900 font-bold rounded-xl hover:bg-stone-200 transition-all"
                      >
                        {view === 'landing' ? 'Admin Dashboard' : 'View Landing'}
                      </button>
                    )}
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{isAdmin ? 'Administrator' : 'Customer'}</p>
                    </div>
                    <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-orange-100" />
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {view === 'landing' ? (
          <>
            {/* Hero Section */}
            <header className="relative bg-white pt-12 pb-20 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="max-w-3xl">
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-6xl font-black text-stone-900 leading-tight mb-6"
                    >
                      Klopp <span className="text-amber-700">#TempatBercerita</span>
                    </motion.h2>
                    <p className="text-xl text-stone-500 mb-10 leading-relaxed">
                      Setiap cangkir kopi punya cerita. Di sini, kami menyediakan ruang 
                      hangat untukmu berbagi, tertawa, dan merangkai kenangan baru.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a 
                        href="#menu"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-amber-900 text-white font-bold rounded-2xl hover:bg-amber-800 transition-all shadow-xl shadow-amber-200"
                      >
                        Lihat Menu
                      </a>
                      <button 
                        onClick={() => setShowReservationForm(true)}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-amber-900 font-bold rounded-2xl border border-amber-100 hover:bg-amber-50 transition-all"
                      >
                        Reservasi Meja
                      </button>
                    </div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative hidden lg:block"
                  >
                    <div className="aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white rotate-3">
                      <img 
                        src="https://picsum.photos/seed/klopp-exterior-night-triangular/1200/900" 
                        alt="Klopp Exterior Night"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-100 rounded-full -z-10 animate-pulse" />
                  </motion.div>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-amber-50 -skew-x-12 translate-x-1/2 -z-0" />
            </header>

            {/* Story Section */}
            <section className="py-20 bg-white overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                      <img 
                        src="https://picsum.photos/seed/klopp-interior-bar-warm/800/1000" 
                        alt="Klopp Interior Bar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-amber-100 rounded-3xl -z-10" />
                  </motion.div>
                  
                  <div>
                    <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Our Philosophy</span>
                    <h2 className="text-4xl font-black text-stone-900 mb-6 leading-tight">
                      Lebih dari Sekadar Kopi, <br />Ini Tentang <span className="text-amber-700 italic">Koneksi</span>.
                    </h2>
                    <div className="space-y-6 text-stone-500 text-lg leading-relaxed">
                      <p>
                        Klopp lahir dari keinginan sederhana: menciptakan tempat di mana 
                        setiap orang merasa diterima. Kami percaya bahwa percakapan terbaik 
                        seringkali dimulai dari aroma kopi yang baru diseduh.
                      </p>
                      <p>
                        Dari pemilihan biji kopi pilihan hingga suasana yang kami bangun, 
                        semuanya dirancang untuk mendukungmu bercerita—entah itu tentang 
                        pekerjaan, impian, atau sekadar obrolan santai di sore hari.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mt-12">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                          <Coffee className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">Premium Beans</h4>
                          <p className="text-sm text-stone-400">Biji kopi pilihan nusantara.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">Warm Space</h4>
                          <p className="text-sm text-stone-400">Suasana nyaman untuk bercerita.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Main Content (Menu) */}
            <main id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-stone-100">
              <div className="text-center mb-16">
                <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Our Selection</span>
                <h2 className="text-4xl font-black text-stone-900">Menu Favorit Kami</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-10 items-center justify-center">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Cari menu..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-stone-100 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mb-12 items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-stone-100">
                  <Filter className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-bold text-stone-900">Menu:</span>
                </div>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                      selectedCategory === cat 
                        ? 'bg-amber-900 text-white shadow-lg' 
                        : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : (
                <>
                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      <AnimatePresence mode="popLayout">
                        {filteredProducts.map(product => (
                          <ProductCard 
                            key={product.id} 
                            product={product} 
                            isAdmin={isAdmin}
                            onEdit={(p) => {
                              setEditingProduct(p);
                              setShowForm(true);
                            }}
                            onDelete={handleDeleteProduct}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                      <p className="text-gray-500">Try adjusting your search or filters.</p>
                    </div>
                  )}
                </>
              )}
            </main>

            {/* Location Section */}
            <section id="location" className="py-24 bg-stone-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Visit Us</span>
                    <h2 className="text-4xl font-black text-stone-900 mb-8">Temukan Kami di Tangerang</h2>
                    
                    <div className="space-y-8">
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-700">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-lg mb-1">Alamat</h4>
                          <p className="text-stone-500 leading-relaxed max-w-sm">
                            Jl. Perumahan Bumi Indah Raya Komersial Area No.L-06, RW.06, Gelam Jaya, Kabupaten Tangerang, Banten 15560
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-700">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-lg mb-1">Jam Operasional</h4>
                          <p className="text-stone-500">Senin - Minggu: 09:00 - 22:00</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-700">
                          <Phone className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-lg mb-1">Kontak</h4>
                          <p className="text-stone-500">+62 812-3456-7890</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-12 flex gap-4">
                      <a href="https://instagram.com" className="p-4 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-amber-700 transition-colors">
                        <Instagram className="w-6 h-6" />
                      </a>
                      <a href="https://wa.me/6281234567890" className="p-4 bg-white rounded-2xl shadow-sm text-stone-400 hover:text-amber-700 transition-colors">
                        <MessageSquare className="w-6 h-6" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="h-[500px] rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.865485458661!2d106.5683413!3d-6.1487053!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69ff8666666667%3A0x6666666666666666!2sBumi%20Indah%20Raya!5e0!3m2!1sen!2sid!4v1711910000000!5m2!1sen!2sid" 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </div>
              </div>
            </section>

            {/* Gallery Section */}
            <section className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Our Atmosphere</span>
                  <h2 className="text-4xl font-black text-stone-900">Sudut Klopp #TempatBercerita</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="md:col-span-2 h-[400px] rounded-3xl overflow-hidden shadow-lg"
                  >
                    <img 
                      src="https://picsum.photos/seed/klopp-sunset-triangular/1200/800" 
                      alt="Klopp Sunset View" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="h-[400px] rounded-3xl overflow-hidden shadow-lg"
                  >
                    <img 
                      src="https://picsum.photos/seed/klopp-coffee-machine-close/800/800" 
                      alt="Klopp Coffee Machine" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="h-[400px] rounded-3xl overflow-hidden shadow-lg"
                  >
                    <img 
                      src="https://picsum.photos/seed/klopp-mural-art/800/800" 
                      alt="Klopp Mural Art" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="md:col-span-2 h-[400px] rounded-3xl overflow-hidden shadow-lg"
                  >
                    <img 
                      src="https://picsum.photos/seed/klopp-parking-crowd/1200/800" 
                      alt="Klopp Parking Crowd" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-stone-900 py-20 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-amber-700 rounded-xl flex items-center justify-center text-white">
                        <Coffee className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black tracking-tight">KLOPP <span className="text-amber-500">#TempatBercerita</span></span>
                    </div>
                    <p className="text-stone-400 max-w-sm leading-relaxed">
                      Ruang hangat untuk berbagi cerita, merayakan momen, dan menikmati 
                      kopi terbaik di jantung Kota Tangerang.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-6 text-lg">Quick Links</h4>
                    <ul className="space-y-4 text-stone-400">
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Home</a></li>
                      <li><a href="#menu" className="hover:text-amber-500 transition-colors">Menu</a></li>
                      <li><button onClick={() => setShowReservationForm(true)} className="hover:text-amber-500 transition-colors text-left">Reservasi</button></li>
                      <li><a href="#location" className="hover:text-amber-500 transition-colors">Lokasi</a></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-6 text-lg">Support</h4>
                    <ul className="space-y-4 text-stone-400">
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Bantuan</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Kebijakan Privasi</a></li>
                      <li><a href="#" className="hover:text-amber-500 transition-colors">Syarat & Ketentuan</a></li>
                      <li>
                        {!user ? (
                          <button 
                            onClick={() => setShowLoginForm(true)}
                            disabled={isLoggingIn}
                            className="hover:text-amber-500 transition-colors text-left flex items-center gap-2"
                          >
                            {isLoggingIn ? 'Signing In...' : 'Sign In admin'}
                          </button>
                        ) : (
                          <button 
                            onClick={handleLogout}
                            className="hover:text-red-500 transition-colors text-left"
                          >
                            Sign Out
                          </button>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="pt-12 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-6">
                  <p className="text-stone-500 text-sm italic">© 2026 Klopp #TempatBercerita. Handcrafted with passion.</p>
                  <div className="flex gap-6">
                    <a href="#" className="text-stone-500 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
                    <a href="#" className="text-stone-500 hover:text-white transition-colors"><MessageSquare className="w-5 h-5" /></a>
                  </div>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-stone-900 mb-2">Admin Dashboard</h2>
                <p className="text-stone-500">Kelola menu dan reservasi Klopp #TempatBercerita</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAdminTab('products')}
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${adminTab === 'products' ? 'bg-amber-900 text-white shadow-lg shadow-amber-200' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-100'}`}
                >
                  CRUD Produk
                </button>
                <button 
                  onClick={() => setAdminTab('reservations')}
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${adminTab === 'reservations' ? 'bg-amber-900 text-white shadow-lg shadow-amber-200' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-100'}`}
                >
                  Data Reservasi
                </button>
              </div>
            </div>

            {adminTab === 'products' ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                  <button 
                    onClick={() => setShowForm(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-amber-900 text-white font-bold rounded-2xl hover:bg-amber-800 transition-all shadow-xl shadow-amber-200"
                  >
                    <Plus className="w-5 h-5" />
                    Tambah Menu Baru
                  </button>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                      <input 
                        type="text" 
                        placeholder="Cari menu..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-stone-100 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                      />
                    </div>
                    <select 
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="px-4 py-3 bg-white border border-stone-100 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all shadow-sm font-bold text-stone-600"
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map(product => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          isAdmin={isAdmin}
                          onEdit={(p) => {
                            setEditingProduct(p);
                            setShowForm(true);
                          }}
                          onDelete={handleDeleteProduct}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Waktu</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Tamu</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {reservations.length > 0 ? (
                        reservations.map(res => (
                          <tr key={res.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-stone-900">{res.name}</p>
                              <p className="text-xs text-stone-400">{res.phone}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-stone-600">{res.date}</p>
                              <p className="text-xs text-stone-400">{res.time}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold">
                                {res.guests} Orang
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                value={res.status}
                                onChange={(e) => handleUpdateReservationStatus(res.id, e.target.value)}
                                className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                  res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  res.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteReservation(res.id)}
                                className="p-2 text-stone-300 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-stone-400 italic">
                            Belum ada data reservasi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showForm && (
            <ProductForm 
              product={editingProduct}
              onSave={handleSaveProduct}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(undefined);
              }}
            />
          )}
          {showReservationForm && (
            <ReservationForm 
              onSave={handleSaveReservation}
              onCancel={() => setShowReservationForm(false)}
            />
          )}
          {showLoginForm && (
            <LoginForm 
              onLogin={(u) => {
                setCustomUser(u);
                setShowLoginForm(false);
              }}
              onCancel={() => setShowLoginForm(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
