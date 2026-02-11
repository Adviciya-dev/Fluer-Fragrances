import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Heart, User, Search, Menu, X, Sun, Moon, 
  ChevronRight, Star, Minus, Plus, Trash2, ArrowRight,
  MessageCircle, Sparkles, Send, Check, Package, Truck,
  Mail, Phone, MapPin, Instagram, Facebook, Twitter
} from "lucide-react";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ==================== CONTEXT ====================

const AuthContext = createContext(null);
const CartContext = createContext(null);
const ThemeContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useCart = () => useContext(CartContext);
const useTheme = () => useContext(ThemeContext);

// ==================== THEME PROVIDER ====================

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("fleur-theme");
    return saved || "dark";
  });

  useEffect(() => {
    localStorage.setItem("fleur-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ==================== AUTH PROVIDER ====================

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("fleur-token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("fleur-token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password, phone });
    localStorage.setItem("fleur-token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("fleur-token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==================== CART PROVIDER ====================

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [wishlist, setWishlist] = useState([]);
  const { token } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/cart`);
      setCart(data);
    } catch (e) {
      console.error("Failed to fetch cart");
    }
  }, [token]);

  const fetchWishlist = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/wishlist`);
      setWishlist(data.items || []);
    } catch (e) {
      console.error("Failed to fetch wishlist");
    }
  }, [token]);

  useEffect(() => {
    fetchCart();
    fetchWishlist();
  }, [fetchCart, fetchWishlist]);

  const addToCart = async (productId, quantity = 1) => {
    if (!token) {
      toast.error("Please login to add items to cart");
      return;
    }
    await axios.post(`${API}/cart/add`, { product_id: productId, quantity });
    await fetchCart();
    toast.success("Added to cart");
  };

  const updateCartItem = async (productId, quantity) => {
    await axios.put(`${API}/cart/update`, { product_id: productId, quantity });
    await fetchCart();
  };

  const removeFromCart = async (productId) => {
    await axios.delete(`${API}/cart/remove/${productId}`);
    await fetchCart();
    toast.success("Removed from cart");
  };

  const clearCart = async () => {
    await axios.delete(`${API}/cart/clear`);
    await fetchCart();
  };

  const addToWishlist = async (productId) => {
    if (!token) {
      toast.error("Please login to add to wishlist");
      return;
    }
    await axios.post(`${API}/wishlist/add/${productId}`);
    await fetchWishlist();
    toast.success("Added to wishlist");
  };

  const removeFromWishlist = async (productId) => {
    await axios.delete(`${API}/wishlist/remove/${productId}`);
    await fetchWishlist();
    toast.success("Removed from wishlist");
  };

  const isInWishlist = (productId) => wishlist.some(p => p.id === productId);

  return (
    <CartContext.Provider value={{
      cart, wishlist, addToCart, updateCartItem, removeFromCart, 
      clearCart, addToWishlist, removeFromWishlist, isInWishlist, fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

// ==================== COMPONENTS ====================

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { cart, wishlist } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Services", path: "/services" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <motion.header
      data-testid="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-heavy shadow-lg" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <span className="font-display text-2xl tracking-wider">FLEUR</span>
            <span className="font-body text-xs tracking-widest text-muted-foreground">FRAGRANCES</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-testid={`nav-${link.name.toLowerCase()}`}
                className="font-body text-sm tracking-wider hover:text-accent transition-colors relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            <Link
              to="/scent-finder"
              data-testid="nav-scent-finder"
              className="font-body text-sm tracking-wider flex items-center gap-2 text-accent hover:opacity-80 transition-opacity"
            >
              <Sparkles size={16} />
              AI Scent Finder
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              data-testid="theme-toggle"
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => navigate("/wishlist")}
              data-testid="wishlist-btn"
              className="p-2 rounded-full hover:bg-muted transition-colors relative"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/cart")}
              data-testid="cart-btn"
              className="p-2 rounded-full hover:bg-muted transition-colors relative"
            >
              <ShoppingCart size={20} />
              {cart.items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {cart.items.length}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative group">
                <button
                  data-testid="user-menu-btn"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <User size={20} />
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="glass-heavy rounded-xl p-4 min-w-[200px] shadow-premium">
                    <p className="font-body text-sm mb-3">Hello, {user.name}</p>
                    <Link to="/dashboard" className="block py-2 text-sm hover:text-accent transition-colors">My Orders</Link>
                    <Link to="/wishlist" className="block py-2 text-sm hover:text-accent transition-colors">Wishlist</Link>
                    <button onClick={logout} className="w-full text-left py-2 text-sm text-destructive hover:opacity-80 transition-opacity">
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="login-btn"
                className="btn-premium bg-accent text-accent-foreground hover:shadow-glow"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-muted transition-colors"
              data-testid="mobile-menu-btn"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 glass rounded-xl p-6"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 font-body tracking-wider hover:text-accent transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/scent-finder"
                onClick={() => setIsOpen(false)}
                className="block py-3 font-body tracking-wider text-accent"
              >
                AI Scent Finder
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setSubscribed(true);
      toast.success("Successfully subscribed to newsletter!");
    } catch (err) {
      toast.error("Failed to subscribe");
    }
  };

  return (
    <footer data-testid="footer" className="relative mt-32 pt-20 pb-10 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl mb-4">FLEUR</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Premium aroma oils crafted with passion, bringing the world of exquisite fragrances to transform your spaces.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="p-3 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-3 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-3 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["Shop", "About Us", "Services", "Contact"].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(" ", "-")}`} className="font-body text-sm text-muted-foreground hover:text-accent transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={16} className="text-accent" />
                Mumbai, India
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone size={16} className="text-accent" />
                +91 98765 43210
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail size={16} className="text-accent" />
                hello@fleurfragrances.com
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display text-lg mb-4">Newsletter</h4>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Subscribe for exclusive offers and fragrance tips.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-accent">
                <Check size={20} />
                <span className="text-sm">Subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  data-testid="newsletter-email"
                  className="flex-1 px-4 py-3 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
                <button
                  type="submit"
                  data-testid="newsletter-submit"
                  className="p-3 bg-accent text-accent-foreground rounded-full hover:shadow-glow transition-shadow"
                >
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-muted-foreground">
            © 2025 Fleur Fragrances. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-accent transition-colors">Terms & Conditions</Link>
            <Link to="/shipping" className="hover:text-accent transition-colors">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const ProductCard = ({ product }) => {
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } = useCart();
  const navigate = useNavigate();
  const inWishlist = isInWishlist(product.id);

  const handleCardClick = () => {
    navigate(`/product/${product.slug}`);
  };

  return (
    <motion.div
      data-testid={`product-card-${product.slug}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={handleCardClick}
      className="group product-card glass rounded-2xl overflow-hidden card-hover cursor-pointer"
    >
      <div className="relative img-zoom aspect-[4/5]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.is_bestseller && (
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-body tracking-wider rounded-full">
              BESTSELLER
            </span>
          )}
          {product.is_new && (
            <span className="px-3 py-1 bg-amethyst-dark text-white text-xs font-body tracking-wider rounded-full">
              NEW
            </span>
          )}
          {product.discount_percent > 30 && (
            <span className="px-3 py-1 bg-destructive text-white text-xs font-body tracking-wider rounded-full">
              -{product.discount_percent}%
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              inWishlist ? removeFromWishlist(product.id) : addToWishlist(product.id);
            }}
            data-testid={`wishlist-btn-${product.slug}`}
            className={`p-3 rounded-full glass transition-all ${inWishlist ? "text-destructive" : "hover:text-accent"}`}
          >
            <Heart size={18} fill={inWishlist ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Add to Cart */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product.id);
          }}
          data-testid={`add-to-cart-${product.slug}`}
          initial={{ y: 20, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          className="absolute bottom-4 left-4 right-4 py-3 bg-white/90 dark:bg-black/90 text-foreground rounded-full text-sm font-body tracking-wider opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 backdrop-blur-sm"
        >
          Add to Cart
        </motion.button>
      </div>

      <div 
        className="p-6 cursor-pointer"
        onClick={() => navigate(`/product/${product.slug}`)}
      >
        <p className="text-xs text-muted-foreground tracking-wider mb-2">{product.scent_family}</p>
        <h3 className="font-display text-lg mb-2 group-hover:text-accent transition-colors">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{product.short_description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl">₹{product.price.toFixed(0)}</span>
            {product.original_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">₹{product.original_price.toFixed(0)}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-accent text-accent" />
            <span className="text-sm">{product.rating}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm Fleur, your AI fragrance consultant. How can I help you find your perfect scent today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/ai/chat`, {
        message: userMessage,
        session_id: sessionId
      });
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "I apologize, I'm having trouble responding right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="chat-widget-btn"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 p-4 bg-accent text-accent-foreground rounded-full shadow-glow-lg"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            data-testid="chat-panel"
            className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[500px] glass-heavy rounded-2xl shadow-premium overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h4 className="font-display text-lg">Fleur AI</h4>
                <p className="text-xs text-muted-foreground">Fragrance Consultant</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about fragrances..."
                  data-testid="chat-input"
                  className="flex-1 px-4 py-3 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  data-testid="chat-send-btn"
                  disabled={loading}
                  className="p-3 bg-accent text-accent-foreground rounded-full hover:shadow-glow transition-shadow disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==================== PAGES ====================

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState({ bestsellers: [], new_arrivals: [], top_rated: [] });
  const [allProducts, setAllProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featured, products] = await Promise.all([
          axios.get(`${API}/products/featured`),
          axios.get(`${API}/products`)
        ]);
        setFeaturedProducts(featured.data);
        setAllProducts(products.data);
      } catch (e) {
        console.error("Failed to fetch products");
      }
    };
    fetchData();
  }, []);

  return (
    <main data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10" />
          <img
            src="https://images.unsplash.com/photo-1636730520710-a8e432ab3617?w=1920&q=80"
            alt="Luxury perfume"
            className="w-full h-full object-cover opacity-40 dark:opacity-30"
          />
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-accent/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-amethyst/10 blur-3xl"
        />

        {/* Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-sm tracking-[0.3em] text-muted-foreground mb-6"
          >
            SPREADING DELIGHTFUL AROMAS SINCE 10 YEARS
          </motion.p>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl mb-8"
          >
            Captivate Your{" "}
            <span className="gradient-text">Senses</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            The enchanting scents of nature — a beautiful fragrance touches more than the senses; it reaches the soul.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => navigate("/shop")}
              data-testid="hero-shop-btn"
              className="btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg shine"
            >
              Explore Collection
            </button>
            <button
              onClick={() => navigate("/scent-finder")}
              data-testid="hero-scent-finder-btn"
              className="btn-premium border border-current hover:bg-foreground hover:text-background"
            >
              <Sparkles size={16} className="inline mr-2" />
              Find Your Scent
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronRight size={24} className="rotate-90 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Bestsellers Section */}
      <section className="py-24" data-testid="bestsellers-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-body text-sm tracking-[0.2em] text-accent mb-2">CUSTOMER FAVORITES</p>
              <h2 className="font-display text-4xl md:text-5xl">Bestsellers</h2>
            </div>
            <Link to="/shop?sort=rating" className="hidden md:flex items-center gap-2 text-sm hover:text-accent transition-colors">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(featuredProducts.bestsellers.length > 0 ? featuredProducts.bestsellers : allProducts.slice(0, 4)).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-body text-sm tracking-[0.2em] text-accent mb-2">THE POWER OF SCENT</p>
            <h2 className="font-display text-4xl md:text-5xl">Why Choose Fleur</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Premium Quality",
                description: "Crafted with the finest internationally-approved ingredients for long-lasting fragrances."
              },
              {
                icon: <Package className="w-8 h-8" />,
                title: "Wide Selection",
                description: "From floral to woody, fresh to oriental — find your perfect scent from our curated collection."
              },
              {
                icon: <Truck className="w-8 h-8" />,
                title: "Fast Delivery",
                description: "Pan-India shipping with secure packaging to preserve the essence of your fragrances."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="glass p-8 rounded-2xl text-center card-hover"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl mb-3">{feature.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All Products Preview */}
      <section className="py-24" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-body text-sm tracking-[0.2em] text-accent mb-2">OUR FINE AROMAS</p>
              <h2 className="font-display text-4xl md:text-5xl">Discover Our Collection</h2>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-2 text-sm hover:text-accent transition-colors">
              Shop All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {allProducts.slice(0, 8).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate("/shop")}
              className="btn-premium border border-current hover:bg-foreground hover:text-background"
            >
              View All Products
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=1920&q=60"
            alt="Aroma ambiance"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="font-body text-sm tracking-[0.2em] text-accent mb-4"
            >
              PERSONALIZED EXPERIENCE
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl mb-6"
            >
              Not Sure Which Scent Is Right For You?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="font-body text-lg text-muted-foreground mb-8"
            >
              Let our AI-powered Scent Finder help you discover your perfect fragrance based on your preferences and lifestyle.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate("/scent-finder")}
              className="btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg"
            >
              <Sparkles size={16} className="inline mr-2" />
              Start Scent Finder Quiz
            </motion.button>
          </div>
        </div>
      </section>
    </main>
  );
};

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({ categories: [], scent_families: [] });
  const [filters, setFilters] = useState({
    category: "",
    scent_family: "",
    min_price: "",
    max_price: "",
    sort: "newest"
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.scent_family) params.append("scent_family", filters.scent_family);
      if (filters.min_price) params.append("min_price", filters.min_price);
      if (filters.max_price) params.append("max_price", filters.max_price);
      if (filters.sort) params.append("sort", filters.sort);

      const { data } = await axios.get(`${API}/products?${params}`);
      setProducts(data);
    } catch (e) {
      console.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API}/categories`);
      setCategories(data);
    } catch (e) {
      console.error("Failed to fetch categories");
    }
  };

  return (
    <main data-testid="shop-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-body text-sm tracking-[0.2em] text-accent mb-2">OUR COLLECTION</p>
          <h1 className="font-display text-4xl md:text-5xl">Shop All Fragrances</h1>
          <p className="font-body text-muted-foreground mt-4 max-w-xl mx-auto">
            Discover our curated collection of premium aroma oils, crafted to transform your spaces.
          </p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-6 mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <select
              value={filters.scent_family}
              onChange={(e) => setFilters(f => ({ ...f, scent_family: e.target.value }))}
              data-testid="filter-scent-family"
              className="px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">All Scent Families</option>
              {categories.scent_families.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
              data-testid="filter-category"
              className="px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">All Categories</option>
              {categories.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Price"
              value={filters.min_price}
              onChange={(e) => setFilters(f => ({ ...f, min_price: e.target.value }))}
              data-testid="filter-min-price"
              className="px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />

            <input
              type="number"
              placeholder="Max Price"
              value={filters.max_price}
              onChange={(e) => setFilters(f => ({ ...f, max_price: e.target.value }))}
              data-testid="filter-max-price"
              className="px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />

            <select
              value={filters.sort}
              onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}
              data-testid="filter-sort"
              className="px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="aspect-[4/5] skeleton" />
                <div className="p-6 space-y-3">
                  <div className="h-4 w-20 skeleton rounded" />
                  <div className="h-6 w-3/4 skeleton rounded" />
                  <div className="h-4 w-full skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">{products.length} products found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, addToWishlist, isInWishlist, removeFromWishlist } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`${API}/products/${slug}`);
        setProduct(data);
      } catch (e) {
        console.error("Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="aspect-square skeleton rounded-2xl" />
          <div className="space-y-6">
            <div className="h-8 w-40 skeleton rounded" />
            <div className="h-12 w-3/4 skeleton rounded" />
            <div className="h-24 w-full skeleton rounded" />
            <div className="h-10 w-32 skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="font-display text-3xl mb-4">Product Not Found</h1>
        <button onClick={() => navigate("/shop")} className="btn-premium bg-accent text-accent-foreground">
          Back to Shop
        </button>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);

  return (
    <main data-testid="product-detail-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-accent transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link to="/shop" className="hover:text-accent transition-colors">Shop</Link>
          <ChevronRight size={14} />
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Images */}
          <div className="space-y-4">
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-square rounded-2xl overflow-hidden glass"
            >
              <img
                src={product.images[selectedImage] || product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            {product.images.length > 1 && (
              <div className="flex gap-4">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden transition-all ${
                      selectedImage === i ? "ring-2 ring-accent" : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-muted text-sm rounded-full">{product.scent_family}</span>
              {product.is_bestseller && (
                <span className="px-3 py-1 bg-accent text-accent-foreground text-sm rounded-full">Bestseller</span>
              )}
              {product.is_new && (
                <span className="px-3 py-1 bg-amethyst-dark text-white text-sm rounded-full">New</span>
              )}
            </div>

            <h1 className="font-display text-4xl md:text-5xl mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-muted"}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {product.rating} ({product.reviews_count} reviews)
                </span>
              </div>
            </div>

            <p className="font-body text-muted-foreground leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Notes */}
            <div className="mb-8">
              <h3 className="font-display text-lg mb-3">Fragrance Notes</h3>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note, i) => (
                  <span key={i} className="px-4 py-2 glass rounded-full text-sm">
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4 mb-8">
              <span className="font-display text-4xl">₹{product.price.toFixed(0)}</span>
              {product.original_price > product.price && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    ₹{product.original_price.toFixed(0)}
                  </span>
                  <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm rounded-full">
                    Save {product.discount_percent}%
                  </span>
                </>
              )}
            </div>

            {/* Size */}
            <div className="mb-8">
              <h3 className="font-display text-lg mb-3">Size</h3>
              <span className="px-6 py-3 glass rounded-full">{product.size}</span>
            </div>

            {/* Quantity & Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4 glass rounded-full px-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:text-accent transition-colors"
                  data-testid="decrease-qty"
                >
                  <Minus size={20} />
                </button>
                <span className="font-body text-lg min-w-[40px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:text-accent transition-colors"
                  data-testid="increase-qty"
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                onClick={() => addToCart(product.id, quantity)}
                data-testid="add-to-cart-btn"
                className="flex-1 btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg"
              >
                Add to Cart
              </button>

              <button
                onClick={() => inWishlist ? removeFromWishlist(product.id) : addToWishlist(product.id)}
                data-testid="wishlist-btn"
                className={`p-4 rounded-full glass transition-colors ${inWishlist ? "text-destructive" : ""}`}
              >
                <Heart size={24} fill={inWishlist ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Stock Status */}
            <p className={`mt-6 text-sm ${product.in_stock ? "text-green-500" : "text-destructive"}`}>
              {product.in_stock ? "✓ In Stock" : "Out of Stock"}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-24">
          <h2 className="font-display text-3xl mb-8">Customer Reviews</h2>
          
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <div key={review.id} className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-display">
                      {review.user_name[0]}
                    </div>
                    <div>
                      <p className="font-body font-medium">{review.user_name}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? "fill-accent text-accent" : "text-muted"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <h4 className="font-body font-medium mb-2">{review.title}</h4>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
          )}
        </section>
      </div>
    </main>
  );
};

const CartPage = () => {
  const { cart, updateCartItem, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <main className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <ShoppingCart size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-8">Login to view your cart and checkout.</p>
          <button onClick={() => navigate("/login")} className="btn-premium bg-accent text-accent-foreground">
            Login
          </button>
        </div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main data-testid="cart-page" className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <ShoppingCart size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
          <button onClick={() => navigate("/shop")} className="btn-premium bg-accent text-accent-foreground">
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-testid="cart-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="font-display text-4xl md:text-5xl mb-12">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.items.map((item) => (
              <motion.div
                key={item.product_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="glass rounded-2xl p-6 flex gap-6"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.size}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateCartItem(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateCartItem(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-display text-lg">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.product_id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}

            <button
              onClick={clearCart}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear Cart
            </button>
          </div>

          {/* Summary */}
          <div className="glass-heavy rounded-2xl p-8 h-fit sticky top-32">
            <h2 className="font-display text-2xl mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{cart.total.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-500">Free</span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between">
                <span className="font-display text-lg">Total</span>
                <span className="font-display text-2xl">₹{cart.total.toFixed(0)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              data-testid="checkout-btn"
              className="w-full btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg"
            >
              Proceed to Checkout
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Secure checkout powered by Stripe & Razorpay
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

const CheckoutPage = () => {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const pollPaymentStatus = async (sid, attempts = 0) => {
    if (attempts >= 5) {
      toast.error("Payment status check timed out");
      return;
    }

    try {
      const { data } = await axios.get(`${API}/checkout/status/${sid}`);
      if (data.payment_status === "paid") {
        toast.success("Payment successful!");
        await fetchCart();
        navigate("/checkout/success");
      } else {
        setTimeout(() => pollPaymentStatus(sid, attempts + 1), 2000);
      }
    } catch (e) {
      console.error("Payment status error");
    }
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/checkout/stripe`, {
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        origin_url: window.location.origin
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/checkout/razorpay`, {
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        origin_url: window.location.origin
      });

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Fleur Fragrances",
        description: "Premium Aroma Oils",
        handler: async (response) => {
          try {
            await axios.post(`${API}/checkout/razorpay/verify`, null, {
              params: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });
            toast.success("Payment successful!");
            await fetchCart();
            navigate("/checkout/success");
          } catch (e) {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: "#D4AF37"
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (e) {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (cart.items.length === 0 && !sessionId) {
    navigate("/cart");
    return null;
  }

  return (
    <main data-testid="checkout-page" className="pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-display text-4xl md:text-5xl mb-12 text-center">Checkout</h1>

        <div className="glass-heavy rounded-2xl p-8">
          {/* Order Summary */}
          <div className="mb-8">
            <h2 className="font-display text-2xl mb-6">Order Summary</h2>
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-body">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-display">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-4 flex justify-between">
                <span className="font-display text-xl">Total</span>
                <span className="font-display text-2xl">₹{cart.total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-8">
            <h2 className="font-display text-2xl mb-6">Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod("stripe")}
                data-testid="payment-stripe"
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "stripe" ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
                }`}
              >
                <p className="font-body font-medium">Credit/Debit Card</p>
                <p className="text-xs text-muted-foreground">Powered by Stripe</p>
              </button>
              <button
                onClick={() => setPaymentMethod("razorpay")}
                data-testid="payment-razorpay"
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "razorpay" ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
                }`}
              >
                <p className="font-body font-medium">UPI / Cards / NetBanking</p>
                <p className="text-xs text-muted-foreground">Powered by Razorpay</p>
              </button>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={paymentMethod === "stripe" ? handleStripeCheckout : handleRazorpayCheckout}
            disabled={loading}
            data-testid="pay-btn"
            className="w-full btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg disabled:opacity-50"
          >
            {loading ? "Processing..." : `Pay ₹${cart.total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </main>
  );
};

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();

  return (
    <main data-testid="checkout-success-page" className="pt-32 pb-24">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <Check size={48} className="text-green-500" />
        </motion.div>
        
        <h1 className="font-display text-4xl md:text-5xl mb-4">Thank You!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your order has been placed successfully. We'll send you an email confirmation shortly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-premium bg-accent text-accent-foreground"
          >
            View Orders
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="btn-premium border border-current"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </main>
  );
};

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Welcome back!");
      } else {
        await register(name, email, password, phone);
        toast.success("Account created successfully!");
      }
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main data-testid="login-page" className="pt-32 pb-24 min-h-screen flex items-center">
      <div className="max-w-md mx-auto px-6 w-full">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to continue your fragrance journey" : "Join Fleur Fragrances"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-heavy rounded-2xl p-8 space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name"
                className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
              className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm mb-2">Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="register-phone"
                className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="auth-submit-btn"
            className="w-full btn-premium bg-accent text-accent-foreground hover:shadow-glow disabled:opacity-50"
          >
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API}/orders`);
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main data-testid="dashboard-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-display text-4xl mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.name}</p>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl mb-4">Profile</h2>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {user.name}</p>
              <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
              {user.phone && <p><span className="text-muted-foreground">Phone:</span> {user.phone}</p>}
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl mb-4">Quick Links</h2>
            <div className="space-y-3">
              <Link to="/wishlist" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                <Heart size={20} className="text-accent" />
                <span>My Wishlist</span>
              </Link>
              <Link to="/shop" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                <ShoppingCart size={20} className="text-accent" />
                <span>Continue Shopping</span>
              </Link>
              <Link to="/scent-finder" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                <Sparkles size={20} className="text-accent" />
                <span>Find Your Scent</span>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl mb-4">Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="font-display text-3xl">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <p className="font-display text-3xl">₹{orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders */}
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-6">Order History</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass rounded-2xl p-6 skeleton h-32" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders yet</p>
              <button onClick={() => navigate("/shop")} className="mt-4 btn-premium bg-accent text-accent-foreground">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="glass rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                      <p className="font-display text-lg">₹{order.total_amount.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        order.order_status === "confirmed" ? "bg-green-500/20 text-green-500" :
                        order.order_status === "shipped" ? "bg-blue-500/20 text-blue-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {order.order_status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        order.payment_status === "paid" ? "bg-green-500/20 text-green-500" :
                        "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 overflow-x-auto">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex-shrink-0 text-center">
                        <p className="text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

const WishlistPage = () => {
  const { wishlist, removeFromWishlist, addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <main className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Heart size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-8">Login to view your wishlist.</p>
          <button onClick={() => navigate("/login")} className="btn-premium bg-accent text-accent-foreground">
            Login
          </button>
        </div>
      </main>
    );
  }

  if (wishlist.length === 0) {
    return (
      <main data-testid="wishlist-page" className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Heart size={64} className="mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-3xl mb-4">Your Wishlist is Empty</h1>
          <p className="text-muted-foreground mb-8">Save your favorite fragrances for later.</p>
          <button onClick={() => navigate("/shop")} className="btn-premium bg-accent text-accent-foreground">
            Browse Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-testid="wishlist-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="font-display text-4xl md:text-5xl mb-12">My Wishlist</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
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
    {
      id: "mood",
      question: "What mood do you want to create?",
      options: ["Relaxing & Calming", "Energizing & Fresh", "Romantic & Sensual", "Sophisticated & Luxurious"]
    },
    {
      id: "space",
      question: "Where will you use the fragrance?",
      options: ["Bedroom", "Living Room", "Office/Workspace", "Entire Home"]
    },
    {
      id: "preference",
      question: "Which scent family appeals to you most?",
      options: ["Floral (Rose, Jasmine, Lavender)", "Woody (Sandalwood, Oud, Cedar)", "Fresh (Ocean, Citrus, Green)", "Oriental (Vanilla, Amber, Musk)"]
    },
    {
      id: "intensity",
      question: "How strong do you prefer your fragrance?",
      options: ["Light & Subtle", "Medium & Balanced", "Strong & Long-lasting"]
    },
    {
      id: "time",
      question: "When will you primarily use it?",
      options: ["Morning/Day", "Evening/Night", "All Day"]
    }
  ];

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, { question_id: questions[step].id, answer }];
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      getResults(newAnswers);
    }
  };

  const getResults = async (finalAnswers) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/scent-finder`, { answers: finalAnswers });
      setResults(data.recommendations);
    } catch (e) {
      console.error("Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers([]);
    setResults(null);
  };

  return (
    <main data-testid="scent-finder-page" className="pt-32 pb-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center"
            >
              {/* Progress */}
              <div className="flex justify-center gap-2 mb-8">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i <= step ? "bg-accent" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              <p className="font-body text-sm tracking-[0.2em] text-accent mb-4">
                QUESTION {step + 1} OF {questions.length}
              </p>

              <h1 className="font-display text-3xl md:text-4xl mb-12">
                {questions[step].question}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {questions[step].options.map((option, i) => (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleAnswer(option)}
                    data-testid={`scent-option-${i}`}
                    className="glass p-6 rounded-xl text-left hover:bg-accent/10 hover:border-accent transition-all"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <p className="font-display text-xl">Finding your perfect scents...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center mb-12">
                <Sparkles size={48} className="mx-auto text-accent mb-4" />
                <h1 className="font-display text-3xl md:text-4xl mb-4">Your Perfect Matches</h1>
                <p className="text-muted-foreground">Based on your preferences, we recommend:</p>
              </div>

              <div className="space-y-6">
                {results.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="glass-heavy rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-6"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-display text-xl text-accent">
                      #{i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-xl">{rec.name}</h3>
                        <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                          {rec.match_score}% Match
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
                      <div className="flex items-center gap-4">
                        <span className="font-display text-lg">₹{rec.price}</span>
                        <button
                          onClick={() => navigate(`/shop`)}
                          className="text-sm text-accent hover:underline"
                        >
                          View Product →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center mt-12 space-x-4">
                <button
                  onClick={resetQuiz}
                  className="btn-premium border border-current"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => navigate("/shop")}
                  className="btn-premium bg-accent text-accent-foreground"
                >
                  Browse All Products
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

const AboutPage = () => {
  return (
    <main data-testid="about-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="text-center mb-24">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-body text-sm tracking-[0.2em] text-accent mb-4"
          >
            OUR STORY
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl mb-6"
          >
            Spreading Aroma Since 10 Years
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Fleur Fragrances is a passion project born out of a desire to bring the world of premium international scents to the Indian market.
          </motion.p>
        </section>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80"
              alt="Aroma oils"
              className="rounded-2xl"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl mb-6">The Power of Scent</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Founded by Thomas Thankan in Mumbai, our brand is dedicated to crafting exquisite aroma oils that evoke emotions and transport you to different worlds.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              With a keen eye for quality and a commitment to excellence, we source the finest ingredients from around the globe. Our aroma oils are meticulously blended to create unique and captivating fragrances that cater to diverse tastes and preferences.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              At Fleur Fragrances, we believe that scent has the power to transform your day. Whether you're seeking relaxation, inspiration, or simply a moment of indulgence, our collection offers a sensory experience like no other.
            </p>
          </motion.div>
        </div>

        {/* Values */}
        <section className="py-24 border-t border-border">
          <h2 className="font-display text-3xl text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Quality First", desc: "Only the finest internationally-approved ingredients make it into our formulations." },
              { title: "Crafted with Care", desc: "Each fragrance is meticulously blended by expert perfumers." },
              { title: "Customer Focus", desc: "Your satisfaction and sensory experience is our top priority." }
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <h3 className="font-display text-xl mb-3">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", subject: "", message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, null, { params: formData });
      toast.success("Message sent successfully!");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main data-testid="contact-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-body text-sm tracking-[0.2em] text-accent mb-4">GET IN TOUCH</p>
          <h1 className="font-display text-4xl md:text-5xl">Contact Us</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="font-display text-2xl mb-6">Let's Connect</h2>
            <p className="text-muted-foreground mb-8">
              Have questions about our products or services? We'd love to hear from you. Reach out to us through any of the channels below.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg mb-1">Address</h3>
                  <p className="text-sm text-muted-foreground">Mumbai, Maharashtra, India</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg mb-1">Phone</h3>
                  <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">hello@fleurfragrances.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="glass-heavy rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    data-testid="contact-name"
                    className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    data-testid="contact-email"
                    className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    data-testid="contact-phone"
                    className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData(f => ({ ...f, subject: e.target.value }))}
                    data-testid="contact-subject"
                    className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  >
                    <option value="">Select Subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Product Question">Product Question</option>
                    <option value="B2B Inquiry">B2B Inquiry</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(f => ({ ...f, message: e.target.value }))}
                  data-testid="contact-message"
                  rows={5}
                  className="w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="contact-submit"
                className="w-full btn-premium bg-accent text-accent-foreground hover:shadow-glow disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

const ServicesPage = () => {
  const services = [
    {
      title: "Advanced HVAC Aroma Diffusion",
      description: "Central HVAC-linked scenting systems for large commercial environments like hotels, offices, and retail spaces.",
      image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80"
    },
    {
      title: "Portable Aroma Machines",
      description: "Stand-alone diffusers perfect for smaller spaces, lobbies, and boutiques.",
      image: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80"
    },
    {
      title: "Premium Bulk Aroma Oils",
      description: "Supply of high-quality fragrance oils in larger volumes (500gms+) for businesses.",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80"
    },
    {
      title: "Custom Scent Development",
      description: "Create your signature fragrance tailored to your brand's identity and ambiance goals.",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80"
    }
  ];

  return (
    <main data-testid="services-page" className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-body text-sm tracking-[0.2em] text-accent mb-4">B2B SOLUTIONS</p>
          <h1 className="font-display text-4xl md:text-5xl mb-6">Our Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Professional scenting solutions for hotels, offices, retail spaces, and commercial environments across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl overflow-hidden card-hover"
            >
              <div className="aspect-[16/10] img-zoom">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-8">
                <h3 className="font-display text-2xl mb-3">{service.title}</h3>
                <p className="text-muted-foreground mb-6">{service.description}</p>
                <Link to="/contact" className="text-accent hover:underline flex items-center gap-2">
                  Request Quote <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-24 glass-heavy rounded-2xl p-12 text-center">
          <h2 className="font-display text-3xl mb-4">Ready to Transform Your Space?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Let us help you create an unforgettable atmosphere with our premium scenting solutions.
          </p>
          <Link to="/contact" className="btn-premium bg-accent text-accent-foreground hover:shadow-glow-lg inline-block">
            Get Started
          </Link>
        </section>
      </div>
    </main>
  );
};

// ==================== APP ====================

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
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/services" element={<ServicesPage />} />
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
