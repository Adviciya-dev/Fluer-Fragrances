import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  ShoppingCart, Heart, User, Menu, X, Sun, Moon, 
  ChevronRight, ChevronDown, ChevronLeft, Star, Minus, Plus, Trash2, ArrowRight, ArrowUpRight,
  MessageCircle, Sparkles, Send, Check, Package, Truck, Building2, Award, Users, Gift, Leaf,
  Mail, Phone, MapPin, Instagram, Facebook, Twitter, Play, Quote
} from "lucide-react";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Premium Product Images - High Quality
const PRODUCT_IMAGES = {
  "prod_white_rose_musk": "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_bleu_sport": "https://images.pexels.com/photos/3059609/pexels-photo-3059609.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_fleur_enchante": "https://images.pexels.com/photos/755992/pexels-photo-755992.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_white_mulberry": "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_elegance": "https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_victoria_royale": "https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_coorg_mandarin": "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_sandalwood_tranquility": "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_ocean_secrets": "https://images.pexels.com/photos/3910071/pexels-photo-3910071.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_mystic_whiff": "https://images.pexels.com/photos/4041391/pexels-photo-4041391.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_musk_oudh": "https://images.pexels.com/photos/932577/pexels-photo-932577.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_morning_mist": "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_lavender_bliss": "https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_jasmine_neroli": "https://images.pexels.com/photos/3059606/pexels-photo-3059606.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_fleur_rose": "https://images.pexels.com/photos/3373745/pexels-photo-3373745.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_first_rain": "https://images.pexels.com/photos/1884306/pexels-photo-1884306.jpeg?auto=compress&cs=tinysrgb&w=800",
  "prod_jasmine_bloom": "https://images.pexels.com/photos/4046316/pexels-photo-4046316.jpeg?auto=compress&cs=tinysrgb&w=800"
};

const FALLBACK_IMAGE = "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800";
const getProductImage = (productId) => PRODUCT_IMAGES[productId] || FALLBACK_IMAGE;

// Premium Image Component with Loading State
const ProductImage = ({ src, alt, className = "", fallback = FALLBACK_IMAGE }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setImageSrc(src);
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-amber-800/10 to-amber-900/20 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        </div>
      )}
      <img
        src={error ? fallback : imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          if (!error) {
            setError(true);
            setImageSrc(fallback);
          }
          setLoading(false);
        }}
      />
    </div>
  );
};

// Context
const AuthContext = createContext(null);
const CartContext = createContext(null);
const ThemeContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useCart = () => useContext(CartContext);
const useTheme = () => useContext(ThemeContext);

// Theme Provider
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("fleur-theme") || "dark");
  useEffect(() => {
    localStorage.setItem("fleur-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("fleur-token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) { axios.defaults.headers.common["Authorization"] = `Bearer ${token}`; fetchUser(); }
    else setLoading(false);
  }, [token]);

  const fetchUser = async () => {
    try { const { data } = await axios.get(`${API}/auth/me`); setUser(data); }
    catch { logout(); }
    finally { setLoading(false); }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("fleur-token", data.token); setToken(data.token); setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password, phone });
    localStorage.setItem("fleur-token", data.token); setToken(data.token); setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("fleur-token"); setToken(null); setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};

// Cart Provider
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [wishlist, setWishlist] = useState([]);
  const { token } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try { const { data } = await axios.get(`${API}/cart`); setCart(data); } catch {}
  }, [token]);

  const fetchWishlist = useCallback(async () => {
    if (!token) return;
    try { const { data } = await axios.get(`${API}/wishlist`); setWishlist(data.items || []); } catch {}
  }, [token]);

  useEffect(() => { fetchCart(); fetchWishlist(); }, [fetchCart, fetchWishlist]);

  const addToCart = async (productId, quantity = 1) => {
    if (!token) { toast.error("Please login to add items"); return; }
    await axios.post(`${API}/cart/add`, { product_id: productId, quantity });
    await fetchCart(); toast.success("Added to cart");
  };

  const updateCartItem = async (productId, quantity) => {
    await axios.put(`${API}/cart/update`, { product_id: productId, quantity }); await fetchCart();
  };

  const removeFromCart = async (productId) => {
    await axios.delete(`${API}/cart/remove/${productId}`); await fetchCart(); toast.success("Removed");
  };

  const clearCart = async () => { await axios.delete(`${API}/cart/clear`); await fetchCart(); };

  const addToWishlist = async (productId) => {
    if (!token) { toast.error("Please login first"); return; }
    await axios.post(`${API}/wishlist/add/${productId}`); await fetchWishlist(); toast.success("Added to wishlist");
  };

  const removeFromWishlist = async (productId) => {
    await axios.delete(`${API}/wishlist/remove/${productId}`); await fetchWishlist();
  };

  const isInWishlist = (productId) => wishlist.some(p => p.id === productId);

  return (
    <CartContext.Provider value={{ cart, wishlist, addToCart, updateCartItem, removeFromCart, clearCart, addToWishlist, removeFromWishlist, isInWishlist, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

// Navbar
const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { cart, wishlist } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      data-testid="navbar"
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${scrolled ? "glass-heavy py-3" : "bg-transparent py-6"}`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="group" data-testid="logo">
            <span className="font-['Cormorant_Garamond'] text-3xl tracking-[0.15em] font-light gold-text">FLEUR</span>
            <span className="block text-[9px] tracking-[0.35em] text-muted-foreground -mt-1">FRAGRANCES</span>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {[{n:"Home",p:"/"},{n:"Collection",p:"/shop"},{n:"Portfolio",p:"/portfolio"},{n:"About",p:"/about"},{n:"Contact",p:"/contact"}].map(l => (
              <Link key={l.p} to={l.p} className="text-[12px] tracking-[0.15em] uppercase line-animate hover:text-foreground/80 transition-colors">{l.n}</Link>
            ))}
            <Link to="/scent-finder" className="flex items-center gap-2 text-[12px] tracking-[0.15em] uppercase text-amber-500 hover:text-amber-400 transition-colors">
              <Sparkles size={14} /> AI Finder
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} data-testid="theme-toggle" className="p-2.5 rounded-full hover:bg-foreground/5 transition-all">
              {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </button>
            <button onClick={() => navigate("/wishlist")} data-testid="wishlist-btn" className="relative p-2.5 rounded-full hover:bg-foreground/5 transition-all">
              <Heart size={18} strokeWidth={1.5} />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-[10px] text-black rounded-full flex items-center justify-center font-medium">{wishlist.length}</span>}
            </button>
            <button onClick={() => navigate("/cart")} data-testid="cart-btn" className="relative p-2.5 rounded-full hover:bg-foreground/5 transition-all">
              <ShoppingCart size={18} strokeWidth={1.5} />
              {cart.items.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-[10px] text-black rounded-full flex items-center justify-center font-medium">{cart.items.length}</span>}
            </button>
            {user ? (
              <div className="relative group">
                <button className="p-2.5 rounded-full hover:bg-foreground/5 transition-all"><User size={18} strokeWidth={1.5} /></button>
                <div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="glass-heavy rounded-lg p-5 min-w-[200px] border border-border/20">
                    <p className="text-sm mb-4 text-muted-foreground">Welcome, <span className="text-foreground">{user.name}</span></p>
                    <Link to="/dashboard" className="block py-2 text-sm hover:text-amber-500 transition-colors">My Orders</Link>
                    <button onClick={logout} className="w-full text-left py-2 text-sm text-red-400 hover:text-red-300">Logout</button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" data-testid="login-btn" className="hidden sm:block ml-2 px-6 py-2.5 bg-amber-500 text-black text-[11px] tracking-[0.15em] uppercase hover:bg-amber-400 transition-colors">Login</Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2.5">{isOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden mt-6 glass rounded-lg overflow-hidden">
              <div className="p-6 space-y-4">
                {["Home", "Collection", "Portfolio", "About", "Contact"].map(n => (
                  <Link key={n} to={`/${n === "Home" ? "" : n === "Collection" ? "shop" : n.toLowerCase()}`} onClick={() => setIsOpen(false)} className="block py-2 text-sm tracking-[0.1em] uppercase hover:text-amber-500">{n}</Link>
                ))}
                <Link to="/scent-finder" onClick={() => setIsOpen(false)} className="block py-2 text-sm tracking-[0.1em] uppercase text-amber-500">AI Scent Finder</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

// Footer
const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/newsletter/subscribe`, { email }); setSubscribed(true); toast.success("Welcome to Fleur family!"); }
    catch { toast.error("Failed to subscribe"); }
  };

  return (
    <footer className="relative mt-32 pt-24 pb-12 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-20">
          <div>
            <span className="font-['Cormorant_Garamond'] text-4xl tracking-[0.15em] font-light gold-text">FLEUR</span>
            <p className="text-[9px] tracking-[0.35em] text-muted-foreground mt-1 mb-4">FRAGRANCES</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Crafted in India, Trusted by Luxury Hotels — Now for You.</p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-border/30 flex items-center justify-center hover:border-amber-500 hover:text-amber-500 transition-all"><Icon size={16} /></a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-['Cormorant_Garamond'] text-xl mb-6">Explore</h4>
            <ul className="space-y-3">
              {["Shop", "Portfolio", "About Us", "Contact", "AI Finder"].map(item => (
                <li key={item}><Link to={`/${item.toLowerCase().replace(" ", "-")}`} className="text-sm text-muted-foreground hover:text-amber-500 transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-['Cormorant_Garamond'] text-xl mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-muted-foreground"><MapPin size={16} className="text-amber-500 mt-0.5" />Mumbai, Maharashtra, India</li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground"><Phone size={16} className="text-amber-500" />+91 98765 43210</li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground"><Mail size={16} className="text-amber-500" />hello@fleurfragrances.com</li>
            </ul>
          </div>
          <div>
            <h4 className="font-['Cormorant_Garamond'] text-xl mb-6">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Exclusive offers & fragrance tips.</p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-amber-500"><Check size={18} /><span className="text-sm">You're subscribed!</span></div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />
                <button type="submit" className="w-full py-3 bg-amber-500 text-black text-[11px] tracking-[0.15em] uppercase hover:bg-amber-400">Subscribe</button>
              </form>
            )}
          </div>
        </div>
        <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2025 Fleur Fragrances. All rights reserved.</p>
          <div className="flex gap-8 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-amber-500">Privacy</Link>
            <Link to="/terms" className="hover:text-amber-500">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Product Card
const ProductCard = ({ product }) => {
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } = useCart();
  const navigate = useNavigate();
  const inWishlist = isInWishlist(product.id);
  const productImage = getProductImage(product.id);

  return (
    <motion.div
      data-testid={`product-card-${product.slug}`}
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group card-premium glass rounded-lg overflow-hidden cursor-pointer"
    >
      <div className="relative img-zoom aspect-[3/4] overflow-hidden bg-gradient-to-br from-amber-900/10 to-amber-800/5">
        <ProductImage src={productImage} alt={product.name} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {product.is_bestseller && <span className="px-3 py-1.5 bg-amber-500 text-black text-[10px] tracking-[0.1em] uppercase">Bestseller</span>}
          {product.is_new && <span className="px-3 py-1.5 bg-white text-black text-[10px] tracking-[0.1em] uppercase">New</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); inWishlist ? removeFromWishlist(product.id) : addToWishlist(product.id); }} className={`absolute top-4 right-4 p-2.5 rounded-full glass opacity-0 group-hover:opacity-100 transition-all z-10 ${inWishlist ? "text-red-400" : ""}`}>
          <Heart size={18} fill={inWishlist ? "currentColor" : "none"} />
        </button>
        <motion.button onClick={(e) => { e.stopPropagation(); addToCart(product.id); }} className="absolute bottom-4 left-4 right-4 py-3 bg-white/95 text-black text-[11px] tracking-[0.15em] uppercase opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-amber-500 z-10">
          Add to Cart
        </motion.button>
      </div>
      <div className="p-5">
        <p className="text-[10px] tracking-[0.2em] text-amber-500/80 uppercase mb-2">{product.scent_family}</p>
        <h3 className="font-['Cormorant_Garamond'] text-xl mb-2 group-hover:text-amber-500 transition-colors">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{product.short_description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-['Cormorant_Garamond'] text-2xl">₹{product.price.toFixed(0)}</span>
            {product.original_price > product.price && <span className="text-xs text-muted-foreground line-through">₹{product.original_price.toFixed(0)}</span>}
          </div>
          <div className="flex items-center gap-1"><Star size={12} className="fill-amber-500 text-amber-500" /><span className="text-xs">{product.rating}</span></div>
        </div>
      </div>
    </motion.div>
  );
};

// Chat Widget
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Welcome to Fleur. I'm your personal fragrance consultant — ask me anything about scents, or upload an image to identify a perfume." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput(""); setMessages(prev => [...prev, { role: "user", content: userMessage }]); setLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/chat`, { message: userMessage, session_id: sessionId });
      setSessionId(data.session_id); setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "I apologize, I'm having trouble responding. Please try again." }]); }
    finally { setLoading(false); }
  };

  return (
    <>
      <motion.button onClick={() => setIsOpen(!isOpen)} data-testid="chat-widget-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-amber-500 text-black rounded-full shadow-lg glow-gold flex items-center justify-center">
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            data-testid="chat-panel" className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] glass-heavy rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "500px" }}>
            <div className="p-4 border-b border-border/20 flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><Sparkles size={18} className="text-amber-500" /></div>
              <div><h4 className="font-['Cormorant_Garamond'] text-lg">Fleur AI</h4><p className="text-[10px] tracking-[0.1em] text-muted-foreground uppercase">Fragrance Consultant</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "300px" }}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-amber-500 text-black rounded-t-lg rounded-bl-lg" : "bg-foreground/5 rounded-t-lg rounded-br-lg"}`}>{msg.content}</div>
                </motion.div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-foreground/5 p-3 rounded-t-lg rounded-br-lg"><div className="flex gap-1.5">{[0,1,2].map(i=><span key={i} className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div></div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t border-border/20 flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about fragrances..." data-testid="chat-input"
                className="flex-1 px-4 py-3 bg-foreground/5 border border-border/20 text-sm focus:outline-none focus:border-amber-500 rounded-lg" />
              <button type="submit" disabled={loading} className="p-3 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"><Send size={18} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Stats Counter Component
const StatsCounter = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
    {[
      { icon: <Award />, value: stats?.years_experience || 10, label: "Years Experience", suffix: "+" },
      { icon: <Building2 />, value: stats?.luxury_hotels || 40, label: "Luxury Hotels", suffix: "+" },
      { icon: <Users />, value: (stats?.happy_customers || 50000) / 1000, label: "Happy Customers", suffix: "K+" },
      { icon: <Package />, value: stats?.fragrances_crafted || 200, label: "Fragrances Crafted", suffix: "+" }
    ].map((stat, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-500">{stat.icon}</div>
        <p className="font-['Cormorant_Garamond'] text-4xl mb-1">{stat.value}{stat.suffix}</p>
        <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground">{stat.label}</p>
      </motion.div>
    ))}
  </div>
);

// Testimonials Carousel
const TestimonialsSection = ({ testimonials }) => {
  const [current, setCurrent] = useState(0);
  if (!testimonials?.length) return null;

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">TESTIMONIALS</p>
          <h2 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl">What Our Customers Say</h2>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="glass-heavy rounded-2xl p-8 md:p-12 text-center">
              <Quote size={40} className="mx-auto text-amber-500/30 mb-6" />
              <p className="text-lg md:text-xl leading-relaxed mb-8 text-muted-foreground italic">"{testimonials[current].text}"</p>
              <div className="flex items-center justify-center gap-4">
                <img src={testimonials[current].avatar} alt={testimonials[current].name} className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/30" />
                <div className="text-left">
                  <p className="font-['Cormorant_Garamond'] text-xl">{testimonials[current].name}</p>
                  <p className="text-xs text-muted-foreground">{testimonials[current].title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(testimonials[current].rating)].map((_, i) => <Star key={i} size={12} className="fill-amber-500 text-amber-500" />)}
                    {testimonials[current].verified && <span className="ml-2 text-[10px] text-green-500 flex items-center gap-1"><Check size={10} />Verified</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center items-center gap-4 mt-8">
            <button onClick={() => setCurrent((current - 1 + testimonials.length) % testimonials.length)} className="p-3 glass rounded-full hover:bg-amber-500/10"><ChevronLeft size={20} /></button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${current === i ? "bg-amber-500 w-6" : "bg-foreground/20"}`} />)}
            </div>
            <button onClick={() => setCurrent((current + 1) % testimonials.length)} className="p-3 glass rounded-full hover:bg-amber-500/10"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

// Portfolio Section
const PortfolioSection = ({ clients }) => {
  if (!clients?.length) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">TRUSTED BY THE BEST</p>
          <h2 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-4">Our Prestigious Clients</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">For over a decade, we've been the fragrance partner of choice for India's most prestigious hotels and corporate spaces.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {clients.map((client, i) => (
            <motion.div key={client.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass p-6 text-center card-premium rounded-lg">
              <div className="h-16 flex items-center justify-center mb-4">
                <p className="font-['Cormorant_Garamond'] text-lg text-amber-500">{client.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">{client.category}</p>
              <p className="text-[10px] text-amber-500/60 mt-1">{client.locations}+ locations</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// HOME PAGE
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [brandStory, setBrandStory] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/products`),
      axios.get(`${API}/brand-story`),
      axios.get(`${API}/testimonials`),
      axios.get(`${API}/portfolio`)
    ]).then(([prod, brand, test, port]) => {
      setProducts(prod.data);
      setBrandStory(brand.data);
      setTestimonials(test.data.testimonials);
      setPortfolio(port.data.clients);
    }).catch(() => {});
  }, []);

  return (
    <main data-testid="home-page">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background z-10" />
          <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-60">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-smoke-swirling-in-slow-motion-1238-large.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="absolute inset-0 overflow-hidden z-10">
          {[...Array(20)].map((_, i) => (
            <motion.div key={i} className="absolute w-1 h-1 bg-amber-500/30 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
          ))}
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-5 py-2 glass rounded-full mb-8">
            <Award size={14} className="text-amber-500" />
            <span className="text-[11px] tracking-[0.2em] uppercase">{brandStory?.heritage_years || 10}+ Years of Luxury Heritage</span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="font-['Cormorant_Garamond'] text-5xl sm:text-7xl lg:text-8xl font-light mb-6 leading-[0.95]">
            Captivate Your<br /><span className="gold-text italic">Senses</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4 font-light">
            {brandStory?.mission || "Crafted in India, Trusted by Luxury Hotels — Now for You"}
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="text-sm text-muted-foreground max-w-xl mx-auto mb-12">
            Premium aroma oils that have transformed the ambiance of India's finest hotels and corporate spaces — now available for your home.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("/shop")} data-testid="hero-shop-btn" className="btn-luxury bg-amber-500 text-black glow-gold">Explore Collection</button>
            <button onClick={() => navigate("/scent-finder")} data-testid="hero-scent-finder-btn" className="btn-luxury border border-foreground/20 hover:border-amber-500 hover:text-amber-500">
              <Sparkles size={14} className="inline mr-2" />AI Scent Finder
            </button>
          </motion.div>
        </div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.2em] text-muted-foreground">SCROLL</span>
          <ChevronDown size={16} className="text-amber-500" />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-8 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <StatsCounter stats={brandStory?.stats} />
        </div>
      </section>

      {/* Portfolio Clients */}
      <PortfolioSection clients={portfolio} />

      {/* Products */}
      <section className="py-24" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">OUR COLLECTION</p>
              <h2 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl">Curated Fragrances</h2>
              <p className="text-muted-foreground mt-2 max-w-lg">The same premium fragrances trusted by luxury hotels — now for your home.</p>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-2 text-[12px] tracking-[0.15em] uppercase hover:text-amber-500">View All <ArrowRight size={14} /></Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection testimonials={testimonials} />

      {/* Why Fleur */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">THE FLEUR DIFFERENCE</p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl">Why Choose Us</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Award />, title: "Heritage", desc: "10+ years serving India's finest hotels" },
              { icon: <Leaf />, title: "Natural", desc: "Premium ingredients, sustainably sourced" },
              { icon: <Sparkles />, title: "Premium", desc: "Luxury quality at accessible prices" },
              { icon: <Gift />, title: "Experience", desc: "Curated scents for every mood and space" }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="glass p-8 text-center card-premium rounded-lg">
                <div className="w-14 h-14 mx-auto mb-6 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-500">{item.icon}</div>
                <h3 className="font-['Cormorant_Garamond'] text-2xl mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="Ambiance" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-4">PERSONALIZED EXPERIENCE</p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-6">Not Sure Which Scent<br />Is Right For You?</h2>
            <p className="text-muted-foreground text-lg mb-8 font-light">Let our AI-powered Scent Finder help you discover your perfect fragrance based on your preferences.</p>
            <button onClick={() => navigate("/scent-finder")} className="btn-luxury bg-amber-500 text-black glow-gold"><Sparkles size={14} className="inline mr-2" />Start Scent Quiz</button>
          </div>
        </div>
      </section>
    </main>
  );
};

// SHOP PAGE
const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({ scent_families: [] });
  const [filters, setFilters] = useState({ scent_family: "", sort: "newest" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.scent_family) params.append("scent_family", filters.scent_family);
        if (filters.sort) params.append("sort", filters.sort);
        const [prods, cats] = await Promise.all([axios.get(`${API}/products?${params}`), axios.get(`${API}/categories`)]);
        setProducts(prods.data);
        setCategories(cats.data);
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [filters]);

  return (
    <main data-testid="shop-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">OUR COLLECTION</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-4">Shop All Fragrances</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Premium aroma oils trusted by luxury hotels — now for your home.</p>
        </div>

        <div className="glass rounded-lg p-6 mb-12 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <select value={filters.scent_family} onChange={(e) => setFilters(f => ({ ...f, scent_family: e.target.value }))}
              className="px-4 py-2.5 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500">
              <option value="">All Scent Families</option>
              {categories.scent_families?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.sort} onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}
              className="px-4 py-2.5 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500">
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="glass rounded-lg overflow-hidden"><div className="aspect-[3/4] skeleton" /><div className="p-5 space-y-3"><div className="h-3 w-16 skeleton rounded" /><div className="h-5 w-3/4 skeleton rounded" /></div></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, i) => <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><ProductCard product={product} /></motion.div>)}
          </div>
        )}
      </div>
    </main>
  );
};

// PRODUCT DETAIL PAGE
const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } = useCart();
  const navigate = useNavigate();

  useEffect(() => { axios.get(`${API}/products/${slug}`).then(({ data }) => setProduct(data)).catch(() => {}).finally(() => setLoading(false)); }, [slug]);

  if (loading) return <div className="pt-32 pb-24 max-w-7xl mx-auto px-6"><div className="aspect-square skeleton rounded-lg max-w-md" /></div>;
  if (!product) return <div className="pt-32 pb-24 text-center"><h1 className="font-['Cormorant_Garamond'] text-3xl">Product Not Found</h1></div>;

  const inWishlist = isInWishlist(product.id);
  const productImage = getProductImage(product.id);

  return (
    <main data-testid="product-detail-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-amber-500">Home</Link><ChevronRight size={12} /><Link to="/shop" className="hover:text-amber-500">Shop</Link><ChevronRight size={12} /><span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-lg overflow-hidden glass bg-gradient-to-br from-amber-900/10 to-amber-800/5">
            <ProductImage src={productImage} alt={product.name} className="w-full h-full" />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 border border-amber-500/30 text-amber-500 text-[10px] tracking-[0.1em] uppercase">{product.scent_family}</span>
              {product.is_bestseller && <span className="px-3 py-1 bg-amber-500 text-black text-[10px] tracking-[0.1em] uppercase">Bestseller</span>}
              {product.is_new && <span className="px-3 py-1 bg-white text-black text-[10px] tracking-[0.1em] uppercase">New</span>}
            </div>

            <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"} />)}</div>
              <span className="text-sm text-muted-foreground">{product.rating} ({product.reviews_count} reviews)</span>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-8">{product.description}</p>

            <div className="mb-8">
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Fragrance Notes</h3>
              <div className="flex flex-wrap gap-2">{product.notes.map((note, i) => <span key={i} className="px-4 py-2 glass text-sm">{note}</span>)}</div>
            </div>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="font-['Cormorant_Garamond'] text-4xl">₹{product.price.toFixed(0)}</span>
              {product.original_price > product.price && (<><span className="text-lg text-muted-foreground line-through">₹{product.original_price.toFixed(0)}</span><span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs">Save {product.discount_percent}%</span></>)}
            </div>

            <div className="mb-8"><span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Size: </span><span className="text-sm">{product.size}</span></div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4 glass px-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:text-amber-500"><Minus size={18} /></button>
                <span className="w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:text-amber-500"><Plus size={18} /></button>
              </div>
              <button onClick={() => addToCart(product.id, quantity)} data-testid="add-to-cart-btn" className="flex-1 btn-luxury bg-amber-500 text-black glow-gold">Add to Cart</button>
              <button onClick={() => inWishlist ? removeFromWishlist(product.id) : addToWishlist(product.id)} className={`p-4 glass ${inWishlist ? "text-red-400" : ""}`}><Heart size={20} fill={inWishlist ? "currentColor" : "none"} /></button>
            </div>

            <p className={`mt-6 text-sm ${product.in_stock ? "text-green-500" : "text-red-400"}`}>{product.in_stock ? "✓ In Stock" : "Out of Stock"}</p>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

// PORTFOLIO PAGE
const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [brandStory, setBrandStory] = useState(null);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    Promise.all([axios.get(`${API}/portfolio`), axios.get(`${API}/brand-story`), axios.get(`${API}/testimonials`)])
      .then(([port, brand, test]) => { setPortfolio(port.data.clients); setBrandStory(brand.data); setTestimonials(test.data.testimonials); })
      .catch(() => {});
  }, []);

  return (
    <main data-testid="portfolio-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">OUR LEGACY</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-6xl mb-6">Portfolio & Clients</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{brandStory?.mission}</p>
        </div>

        <StatsCounter stats={brandStory?.stats} />

        {/* Clients Grid */}
        <section className="py-16">
          <h2 className="font-['Cormorant_Garamond'] text-3xl text-center mb-12">Trusted By India's Finest</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolio.map((client, i) => (
              <motion.div key={client.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-heavy p-8 rounded-lg card-premium">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center"><Building2 className="text-amber-500" /></div>
                  <div>
                    <h3 className="font-['Cormorant_Garamond'] text-xl">{client.name}</h3>
                    <p className="text-xs text-amber-500">{client.category}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{client.description}</p>
                <p className="text-xs text-amber-500/60">{client.locations}+ locations served</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Services for B2B */}
        <section className="py-16 border-t border-border/20">
          <h2 className="font-['Cormorant_Garamond'] text-3xl text-center mb-4">B2B Solutions</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Transform your commercial space with our professional scenting solutions.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "HVAC Scenting", desc: "Central diffusion systems for hotels, offices, and retail spaces", icon: <Building2 /> },
              { title: "Corporate Gifting", desc: "Premium gift sets for employees, clients, and events", icon: <Gift /> },
              { title: "Custom Fragrances", desc: "Develop your signature scent tailored to your brand", icon: <Sparkles /> }
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass p-8 text-center rounded-lg">
                <div className="w-14 h-14 mx-auto mb-6 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-500">{s.icon}</div>
                <h3 className="font-['Cormorant_Garamond'] text-2xl mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{s.desc}</p>
                <Link to="/contact" className="text-amber-500 text-sm hover:underline">Get Quote →</Link>
              </motion.div>
            ))}
          </div>
        </section>

        <TestimonialsSection testimonials={testimonials} />
      </div>
    </main>
  );
};

// CART PAGE
const CartPage = () => {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <main className="pt-32 pb-24 text-center"><h1 className="font-['Cormorant_Garamond'] text-3xl mb-4">Please Login</h1><button onClick={() => navigate("/login")} className="btn-luxury bg-amber-500 text-black">Login</button></main>;
  if (cart.items.length === 0) return <main data-testid="cart-page" className="pt-32 pb-24 text-center"><ShoppingCart size={48} className="mx-auto text-muted-foreground mb-4" /><h1 className="font-['Cormorant_Garamond'] text-3xl mb-4">Your Cart is Empty</h1><button onClick={() => navigate("/shop")} className="btn-luxury bg-amber-500 text-black">Continue Shopping</button></main>;

  return (
    <main data-testid="cart-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-12">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cart.items.map((item) => (
              <div key={item.product_id} className="glass rounded-lg p-6 flex gap-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden"><img src={getProductImage(item.product_id)} alt={item.name} className="w-full h-full object-cover" /></div>
                <div className="flex-1">
                  <h3 className="font-['Cormorant_Garamond'] text-xl mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{item.size}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCartItem(item.product_id, item.quantity - 1)} className="w-8 h-8 border border-border/30 flex items-center justify-center hover:border-amber-500"><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.product_id, item.quantity + 1)} className="w-8 h-8 border border-border/30 flex items-center justify-center hover:border-amber-500"><Plus size={14} /></button>
                    </div>
                    <span className="font-['Cormorant_Garamond'] text-xl">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.product_id)} className="p-2 text-muted-foreground hover:text-red-400"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="glass-heavy rounded-lg p-8 h-fit sticky top-32">
            <h2 className="font-['Cormorant_Garamond'] text-2xl mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{cart.total.toFixed(0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="text-green-500">Free</span></div>
              <div className="divider-gold" />
              <div className="flex justify-between"><span className="font-['Cormorant_Garamond'] text-xl">Total</span><span className="font-['Cormorant_Garamond'] text-2xl">₹{cart.total.toFixed(0)}</span></div>
            </div>
            <button onClick={() => navigate("/checkout")} data-testid="checkout-btn" className="w-full btn-luxury bg-amber-500 text-black glow-gold">Checkout</button>
          </div>
        </div>
      </div>
    </main>
  );
};

// OTHER PAGES (Checkout, Login, Dashboard, Wishlist, ScentFinder, About, Contact)
const CheckoutPage = () => {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!user) { navigate("/login"); return null; }
  if (cart.items.length === 0) { navigate("/cart"); return null; }

  const handleStripeCheckout = async () => {
    setLoading(true);
    try { const { data } = await axios.post(`${API}/checkout/stripe`, { items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })), origin_url: window.location.origin }); window.location.href = data.url; }
    catch { toast.error("Checkout failed"); } finally { setLoading(false); }
  };

  return (
    <main data-testid="checkout-page" className="pt-32 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="font-['Cormorant_Garamond'] text-4xl text-center mb-12">Checkout</h1>
        <div className="glass-heavy rounded-lg p-8">
          <h2 className="font-['Cormorant_Garamond'] text-2xl mb-6">Order Summary</h2>
          <div className="space-y-4 mb-6">
            {cart.items.map(item => <div key={item.product_id} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>₹{(item.price * item.quantity).toFixed(0)}</span></div>)}
            <div className="divider-gold" />
            <div className="flex justify-between"><span className="font-['Cormorant_Garamond'] text-xl">Total</span><span className="font-['Cormorant_Garamond'] text-2xl">₹{cart.total.toFixed(0)}</span></div>
          </div>
          <button onClick={handleStripeCheckout} disabled={loading} className="w-full btn-luxury bg-amber-500 text-black glow-gold disabled:opacity-50">{loading ? "Processing..." : `Pay ₹${cart.total.toFixed(0)}`}</button>
        </div>
      </div>
    </main>
  );
};

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  return (
    <main data-testid="checkout-success-page" className="pt-32 pb-24 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center"><Check size={40} className="text-green-500" /></motion.div>
      <h1 className="font-['Cormorant_Garamond'] text-4xl mb-4">Thank You!</h1>
      <p className="text-muted-foreground mb-8">Your order has been placed successfully.</p>
      <div className="flex gap-4 justify-center">
        <button onClick={() => navigate("/dashboard")} className="btn-luxury bg-amber-500 text-black">View Orders</button>
        <button onClick={() => navigate("/shop")} className="btn-luxury border border-foreground/20">Continue Shopping</button>
      </div>
    </main>
  );
};

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isLogin) { await login(form.email, form.password); toast.success("Welcome back!"); }
      else { await register(form.name, form.email, form.password, form.phone); toast.success("Account created!"); }
      navigate("/");
    } catch (err) { toast.error(err.response?.data?.detail || "Authentication failed"); } finally { setLoading(false); }
  };

  return (
    <main data-testid="login-page" className="pt-32 pb-24 min-h-screen flex items-center">
      <div className="max-w-md mx-auto px-6 w-full">
        <div className="text-center mb-12">
          <h1 className="font-['Cormorant_Garamond'] text-4xl mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-muted-foreground">{isLogin ? "Sign in to continue" : "Join Fleur Fragrances"}</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-heavy rounded-lg p-8 space-y-6">
          {!isLogin && <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />}
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />
          <button type="submit" disabled={loading} className="w-full btn-luxury bg-amber-500 text-black glow-gold disabled:opacity-50">{loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}</button>
          <p className="text-center text-sm text-muted-foreground">{isLogin ? "Don't have an account?" : "Already have an account?"}{" "}<button type="button" onClick={() => setIsLogin(!isLogin)} className="text-amber-500 hover:underline">{isLogin ? "Sign Up" : "Sign In"}</button></p>
        </form>
      </div>
    </main>
  );
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { if (!user) navigate("/login"); else axios.get(`${API}/orders`).then(({ data }) => setOrders(data)); }, [user, navigate]);
  if (!user) return null;

  return (
    <main data-testid="dashboard-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div><h1 className="font-['Cormorant_Garamond'] text-4xl mb-2">My Dashboard</h1><p className="text-muted-foreground">Welcome, {user.name}</p></div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-red-400">Logout</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="glass rounded-lg p-6"><h3 className="font-['Cormorant_Garamond'] text-xl mb-4">Profile</h3><p className="text-sm text-muted-foreground mb-1">Name: <span className="text-foreground">{user.name}</span></p><p className="text-sm text-muted-foreground">Email: <span className="text-foreground">{user.email}</span></p></div>
          <div className="glass rounded-lg p-6"><h3 className="font-['Cormorant_Garamond'] text-xl mb-4">Quick Links</h3><Link to="/wishlist" className="block py-2 text-sm hover:text-amber-500">My Wishlist</Link><Link to="/shop" className="block py-2 text-sm hover:text-amber-500">Continue Shopping</Link></div>
          <div className="glass rounded-lg p-6"><h3 className="font-['Cormorant_Garamond'] text-xl mb-4">Overview</h3><p className="text-3xl font-['Cormorant_Garamond']">{orders.length}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
        </div>
        <h2 className="font-['Cormorant_Garamond'] text-2xl mb-6">Order History</h2>
        {orders.length === 0 ? <div className="glass rounded-lg p-12 text-center"><p className="text-muted-foreground">No orders yet</p><button onClick={() => navigate("/shop")} className="mt-4 btn-luxury bg-amber-500 text-black">Start Shopping</button></div> : (
          <div className="space-y-4">{orders.map(order => <div key={order.id} className="glass rounded-lg p-6"><div className="flex justify-between items-center"><div><p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</p><p className="font-['Cormorant_Garamond'] text-xl">₹{order.total_amount.toFixed(0)}</p></div><span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs">{order.order_status}</span></div></div>)}</div>
        )}
      </div>
    </main>
  );
};

const WishlistPage = () => {
  const { wishlist } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <main className="pt-32 pb-24 text-center"><h1 className="font-['Cormorant_Garamond'] text-3xl mb-4">Please Login</h1><button onClick={() => navigate("/login")} className="btn-luxury bg-amber-500 text-black">Login</button></main>;
  if (wishlist.length === 0) return <main data-testid="wishlist-page" className="pt-32 pb-24 text-center"><Heart size={48} className="mx-auto text-muted-foreground mb-4" /><h1 className="font-['Cormorant_Garamond'] text-3xl mb-4">Your Wishlist is Empty</h1><button onClick={() => navigate("/shop")} className="btn-luxury bg-amber-500 text-black">Browse Products</button></main>;

  return (
    <main data-testid="wishlist-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl mb-12">My Wishlist</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{wishlist.map(product => <ProductCard key={product.id} product={product} />)}</div>
      </div>
    </main>
  );
};

const ScentFinderPage = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const questions = [
    { id: "mood", question: "What mood do you want to create?", options: ["Relaxing & Calming", "Energizing & Fresh", "Romantic & Sensual", "Sophisticated & Luxurious"] },
    { id: "space", question: "Where will you use the fragrance?", options: ["Bedroom", "Living Room", "Office/Workspace", "Entire Home"] },
    { id: "preference", question: "Which scent family appeals most?", options: ["Floral (Rose, Jasmine)", "Woody (Sandalwood, Oud)", "Fresh (Ocean, Citrus)", "Oriental (Vanilla, Musk)"] },
    { id: "intensity", question: "How strong do you prefer?", options: ["Light & Subtle", "Medium & Balanced", "Strong & Long-lasting"] },
  ];

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, { question_id: questions[step].id, answer }];
    setAnswers(newAnswers);
    if (step < questions.length - 1) setStep(step + 1);
    else getResults(newAnswers);
  };

  const getResults = async (finalAnswers) => {
    setLoading(true);
    try { const { data } = await axios.post(`${API}/ai/scent-finder`, { answers: finalAnswers }); setResults(data.recommendations); }
    catch {} finally { setLoading(false); }
  };

  return (
    <main data-testid="scent-finder-page" className="pt-32 pb-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
              <div className="flex justify-center gap-2 mb-8">{questions.map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i <= step ? "bg-amber-500" : "bg-foreground/10"}`} />)}</div>
              <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-4">QUESTION {step + 1} OF {questions.length}</p>
              <h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl mb-12">{questions[step].question}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {questions[step].options.map((option, i) => (
                  <motion.button key={option} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => handleAnswer(option)} className="glass p-6 text-left hover:border-amber-500 transition-all">{option}</motion.button>
                ))}
              </div>
            </motion.div>
          ) : loading ? (
            <div className="text-center"><div className="w-12 h-12 mx-auto mb-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><p className="font-['Cormorant_Garamond'] text-xl">Finding your perfect scents...</p></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-12"><Sparkles size={40} className="mx-auto text-amber-500 mb-4" /><h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl mb-4">Your Perfect Matches</h1></div>
              <div className="space-y-6">{results?.map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} className="glass-heavy rounded-lg p-6 flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center font-['Cormorant_Garamond'] text-xl text-amber-500">#{i + 1}</div>
                  <div className="flex-1"><div className="flex items-center gap-3 mb-2"><h3 className="font-['Cormorant_Garamond'] text-xl">{rec.name}</h3><span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs">{rec.match_score}% Match</span></div><p className="text-sm text-muted-foreground">{rec.reason}</p><p className="font-['Cormorant_Garamond'] text-lg mt-2">₹{rec.price}</p></div>
                </motion.div>
              ))}</div>
              <div className="text-center mt-12 space-x-4">
                <button onClick={() => { setStep(0); setAnswers([]); setResults(null); }} className="btn-luxury border border-foreground/20">Retake Quiz</button>
                <button onClick={() => navigate("/shop")} className="btn-luxury bg-amber-500 text-black">Browse All</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

const AboutPage = () => {
  const [brandStory, setBrandStory] = useState(null);
  useEffect(() => { axios.get(`${API}/brand-story`).then(({ data }) => setBrandStory(data)); }, []);

  return (
    <main data-testid="about-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">OUR STORY</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-6xl mb-6">{brandStory?.tagline || "Luxury Heritage Fragrance for Modern India"}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{brandStory?.mission}</p>
        </div>

        <StatsCounter stats={brandStory?.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center my-24">
          <img src="https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=800" alt="About" className="rounded-lg" />
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-3xl mb-6">The Fleur Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{brandStory?.story}</p>
            <Link to="/portfolio" className="text-amber-500 hover:underline flex items-center gap-2">View Our Portfolio <ArrowRight size={16} /></Link>
          </div>
        </div>

        {brandStory?.values && (
          <section className="py-16 border-t border-border/20">
            <h2 className="font-['Cormorant_Garamond'] text-3xl text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {brandStory.values.map((v, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass rounded-lg p-8 text-center">
                  <h3 className="font-['Cormorant_Garamond'] text-2xl mb-3 text-amber-500">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await axios.post(`${API}/contact`, null, { params: form }); toast.success("Message sent!"); setForm({ name: "", email: "", subject: "", message: "" }); }
    catch { toast.error("Failed to send"); } finally { setLoading(false); }
  };

  return (
    <main data-testid="contact-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-[0.3em] text-amber-500 mb-3">GET IN TOUCH</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl">Contact Us</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-2xl mb-6">Let's Connect</h2>
            <p className="text-muted-foreground mb-8">Whether you're looking for home fragrances or corporate scenting solutions, we'd love to hear from you.</p>
            <div className="space-y-6">
              <div className="flex items-center gap-3"><MapPin className="text-amber-500" /><span>Mumbai, Maharashtra, India</span></div>
              <div className="flex items-center gap-3"><Phone className="text-amber-500" /><span>+91 98765 43210</span></div>
              <div className="flex items-center gap-3"><Mail className="text-amber-500" /><span>hello@fleurfragrances.com</span></div>
            </div>
            <div className="mt-12 p-6 glass rounded-lg">
              <h3 className="font-['Cormorant_Garamond'] text-xl mb-3">B2B Inquiries</h3>
              <p className="text-sm text-muted-foreground mb-4">For hotels, corporate offices, and commercial spaces.</p>
              <a href="mailto:b2b@fleurfragrances.com" className="text-amber-500 hover:underline">b2b@fleurfragrances.com</a>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="glass-heavy rounded-lg p-8 space-y-6">
            <input type="text" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required />
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500" required>
              <option value="">Select Subject</option>
              <option value="General">General Inquiry</option>
              <option value="Product">Product Question</option>
              <option value="B2B">B2B / Corporate</option>
              <option value="Corporate Gifting">Corporate Gifting</option>
            </select>
            <textarea placeholder="Message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} className="w-full px-4 py-3 bg-foreground/5 border border-border/30 text-sm focus:outline-none focus:border-amber-500 resize-none" required />
            <button type="submit" disabled={loading} className="w-full btn-luxury bg-amber-500 text-black glow-gold disabled:opacity-50">{loading ? "Sending..." : "Send Message"}</button>
          </form>
        </div>
      </div>
    </main>
  );
};

// APP
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen">
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/scent-finder" element={<ScentFinderPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
              <Footer />
              <ChatWidget />
              <Toaster position="top-right" richColors />
            </div>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
