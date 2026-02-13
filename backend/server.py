from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'fleur_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="Fleur Fragrances API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    created_at: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    slug: str
    description: str
    short_description: str
    price: float
    original_price: float
    discount_percent: int
    category: str
    subcategory: Optional[str] = None
    size: str
    scent_family: str
    notes: List[str]
    image: str
    images: List[str]
    in_stock: bool = True
    is_new: bool = False
    is_bestseller: bool = False
    rating: float = 0
    reviews_count: int = 0
    created_at: str

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CartItemResponse(BaseModel):
    product_id: str
    name: str
    price: float
    image: str
    quantity: int
    size: str

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: Dict[str, str]
    payment_method: str  # stripe or razorpay
    total_amount: float

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    items: List[Dict]
    shipping_address: Dict[str, str]
    payment_method: str
    payment_status: str
    order_status: str
    total_amount: float
    created_at: str

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    title: str
    comment: str

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    user_id: str
    user_name: str
    rating: int
    title: str
    comment: str
    created_at: str

class NewsletterSubscribe(BaseModel):
    email: EmailStr

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ScentFinderAnswer(BaseModel):
    question_id: str
    answer: str

class ScentFinderRequest(BaseModel):
    answers: List[ScentFinderAnswer]

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    origin_url: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        return user
    except Exception:
        return None

# ==================== PORTFOLIO & TESTIMONIALS ====================

PORTFOLIO_DATA = [
    {
        "id": "client_taj",
        "name": "Taj Hotels",
        "category": "Luxury Hospitality",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Taj_Hotels_logo.svg/200px-Taj_Hotels_logo.svg.png",
        "description": "Premium HVAC scenting solutions for Taj properties across India",
        "locations": 15
    },
    {
        "id": "client_radisson",
        "name": "Radisson",
        "category": "Luxury Hospitality",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Radisson_logo.svg/200px-Radisson_logo.svg.png",
        "description": "Custom fragrance experiences for Radisson hotels",
        "locations": 8
    },
    {
        "id": "client_marriott",
        "name": "Courtyard by Marriott",
        "category": "Luxury Hospitality",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Marriott_Logo.svg/200px-Marriott_Logo.svg.png",
        "description": "Signature scenting for lobbies and common areas",
        "locations": 12
    },
    {
        "id": "client_lodi",
        "name": "The Lodhi",
        "category": "Ultra-Luxury",
        "logo": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=100&fit=crop",
        "description": "Bespoke fragrance development for exclusive suites",
        "locations": 1
    },
    {
        "id": "client_oberoi",
        "name": "The Oberoi Group",
        "category": "Luxury Hospitality",
        "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/The_Oberoi_Group_Logo.svg/200px-The_Oberoi_Group_Logo.svg.png",
        "description": "Premium aroma solutions for Oberoi properties",
        "locations": 6
    },
    {
        "id": "client_corporate",
        "name": "Leading Corporates",
        "category": "Corporate Offices",
        "logo": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=100&fit=crop",
        "description": "Office scenting for Fortune 500 companies",
        "locations": 50
    }
]

TESTIMONIALS_DATA = [
    {
        "id": "test_1",
        "name": "Priya Sharma",
        "title": "Interior Designer, Mumbai",
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        "rating": 5,
        "text": "Fleur Fragrances transformed my home. The Ocean Secrets brings such a calming energy to my living space. The quality is unmatched — truly luxury you can experience every day.",
        "product": "Ocean Secrets",
        "verified": True
    },
    {
        "id": "test_2",
        "name": "Rajesh Menon",
        "title": "Hotel General Manager",
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        "rating": 5,
        "text": "We've been using Fleur's HVAC solutions for 5 years. Our guests consistently compliment the signature scent in our lobby. It's become part of our brand identity.",
        "product": "Corporate Solutions",
        "verified": True
    },
    {
        "id": "test_3",
        "name": "Ananya Patel",
        "title": "Wellness Entrepreneur, Bangalore",
        "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
        "rating": 5,
        "text": "The Lavender Bliss has become essential for my evening routine. The fragrance is so authentic — you can tell it's made with premium ingredients. Highly recommend!",
        "product": "Lavender Bliss",
        "verified": True
    },
    {
        "id": "test_4",
        "name": "Vikram Singh",
        "title": "Luxury Collector, Delhi",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        "rating": 5,
        "text": "As someone who collects premium fragrances from around the world, I was impressed by Musk Oudh. It rivals international brands at a fraction of the price. True Indian craftsmanship.",
        "product": "Musk Oudh",
        "verified": True
    },
    {
        "id": "test_5",
        "name": "Dr. Meera Krishnan",
        "title": "Aromatherapist, Chennai",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
        "rating": 5,
        "text": "I recommend Fleur to all my clients. Their Sandalwood Tranquility is perfect for meditation spaces. The quality of oils is pharmaceutical grade. Outstanding!",
        "product": "Sandalwood Tranquility",
        "verified": True
    }
]

BRAND_STORY = {
    "heritage_years": 10,
    "tagline": "Luxury Heritage Fragrance for Modern India",
    "mission": "Crafted in India, Trusted by Luxury Hotels — Now for You",
    "story": "For over a decade, Fleur Fragrances has been the secret behind the signature scents of India's most prestigious luxury hotels and corporate spaces. From the grand lobbies of Taj to the executive suites of Fortune 500 companies, our fragrances have created memorable experiences for millions. Now, we bring this same luxury heritage directly to you — premium, authentic fragrances that celebrate Indian craftsmanship while embracing modern sophistication.",
    "values": [
        {"title": "Heritage", "description": "10+ years of expertise serving luxury hospitality"},
        {"title": "Authenticity", "description": "Premium, natural ingredients sourced globally"},
        {"title": "Sustainability", "description": "Eco-conscious practices and refillable bottles"},
        {"title": "Innovation", "description": "AI-powered personalization and modern experiences"}
    ],
    "stats": {
        "years_experience": 10,
        "luxury_hotels": 40,
        "corporate_clients": 100,
        "happy_customers": 50000,
        "fragrances_crafted": 200
    }
}

# ==================== CORPORATE GIFTING DATA ====================

CORPORATE_GIFTING_PACKAGES = [
    {
        "id": "gift_starter",
        "name": "Starter Collection",
        "tier": "Bronze",
        "description": "Perfect for small teams and departments. A curated selection of our bestselling fragrances.",
        "price_range": "₹15,000 - ₹25,000",
        "min_quantity": 10,
        "includes": [
            "Selection of 3 premium fragrances (100ml each)",
            "Custom gift boxes with your branding",
            "Personalized message cards",
            "Free delivery within India"
        ],
        "best_for": "Employee appreciation, Festive gifting, Team rewards",
        "image": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80"
    },
    {
        "id": "gift_premium",
        "name": "Premium Executive",
        "tier": "Silver",
        "description": "Elevate your corporate gifting with our signature luxury collection. Ideal for clients and senior management.",
        "price_range": "₹35,000 - ₹50,000",
        "min_quantity": 20,
        "includes": [
            "Selection of 5 luxury fragrances (100ml each)",
            "Premium wooden gift boxes",
            "Elegant silk ribbons and tissue",
            "Engraved brass name plates",
            "White-glove delivery service"
        ],
        "best_for": "Client appreciation, Executive gifts, Board members",
        "image": "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&q=80"
    },
    {
        "id": "gift_luxe",
        "name": "Luxe Signature",
        "tier": "Gold",
        "description": "The ultimate corporate gifting experience. Bespoke fragrances and white-glove service for the most discerning recipients.",
        "price_range": "₹75,000 - ₹1,50,000",
        "min_quantity": 25,
        "includes": [
            "Full collection of 8 signature fragrances",
            "Handcrafted leather gift cases",
            "Custom fragrance blending option",
            "Personal fragrance consultation",
            "Dedicated account manager",
            "Priority delivery with tracking"
        ],
        "best_for": "VIP clients, C-Suite executives, Major partnerships",
        "image": "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800&q=80"
    },
    {
        "id": "gift_custom",
        "name": "Bespoke Enterprise",
        "tier": "Platinum",
        "description": "Completely customized gifting solutions for large enterprises. Create a unique olfactory identity for your brand.",
        "price_range": "Custom pricing",
        "min_quantity": 100,
        "includes": [
            "Custom fragrance development",
            "Exclusive private label options",
            "Complete branding integration",
            "Luxury packaging design",
            "Global shipping coordination",
            "24/7 dedicated support",
            "Event integration services"
        ],
        "best_for": "Large enterprises, Multi-national gifting, Brand partnerships",
        "image": "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"
    }
]

GIFTING_BENEFITS = [
    {"icon": "gift", "title": "Luxury Presentation", "description": "Premium packaging that reflects your brand's prestige"},
    {"icon": "users", "title": "Bulk Discounts", "description": "Significant savings on orders of 50+ units"},
    {"icon": "palette", "title": "Full Customization", "description": "Custom branding, messaging, and packaging"},
    {"icon": "truck", "title": "Pan-India Delivery", "description": "Free shipping across India with tracking"},
    {"icon": "award", "title": "Quality Guarantee", "description": "Same premium quality trusted by luxury hotels"},
    {"icon": "headphones", "title": "Dedicated Support", "description": "Personal account manager for large orders"}
]

@api_router.get("/corporate-gifting")
async def get_corporate_gifting():
    return {
        "packages": CORPORATE_GIFTING_PACKAGES,
        "benefits": GIFTING_BENEFITS
    }

class GiftingInquiry(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str
    package_interest: str
    quantity: int
    occasion: Optional[str] = None
    message: Optional[str] = None

@api_router.post("/corporate-gifting/inquiry")
async def submit_gifting_inquiry(inquiry: GiftingInquiry):
    inquiry_doc = {
        "id": str(uuid.uuid4()),
        "company_name": inquiry.company_name,
        "contact_name": inquiry.contact_name,
        "email": inquiry.email,
        "phone": inquiry.phone,
        "package_interest": inquiry.package_interest,
        "quantity": inquiry.quantity,
        "occasion": inquiry.occasion,
        "message": inquiry.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gifting_inquiries.insert_one(inquiry_doc)
    return {"message": "Thank you for your inquiry! Our corporate gifting team will contact you within 24 hours.", "inquiry_id": inquiry_doc["id"]}

@api_router.get("/portfolio")
async def get_portfolio():
    return {"clients": PORTFOLIO_DATA}

@api_router.get("/testimonials")
async def get_testimonials():
    return {"testimonials": TESTIMONIALS_DATA}

@api_router.get("/brand-story")
async def get_brand_story():
    return BRAND_STORY

# ==================== SUSTAINABILITY DATA ====================

SUSTAINABILITY_DATA = {
    "hero": {
        "title": "Crafted with Care, Designed for Tomorrow",
        "subtitle": "Our commitment to sustainable luxury goes beyond fragrance — it's woven into everything we do."
    },
    "initiatives": [
        {
            "id": "refillable",
            "title": "Refillable Bottles",
            "description": "Our signature bottles are designed for longevity. Return them for refills at 30% off — reducing waste while saving you money.",
            "icon": "recycle",
            "impact": "50,000+ bottles refilled"
        },
        {
            "id": "natural",
            "title": "Natural Ingredients",
            "description": "We source premium essential oils from sustainable farms worldwide, ensuring fair trade practices and ecological balance.",
            "icon": "leaf",
            "impact": "95% natural ingredients"
        },
        {
            "id": "packaging",
            "title": "Eco-Friendly Packaging",
            "description": "Our packaging uses recycled materials and soy-based inks. Every box is plastic-free and 100% recyclable.",
            "icon": "package",
            "impact": "Zero single-use plastic"
        },
        {
            "id": "carbon",
            "title": "Carbon Neutral Operations",
            "description": "We offset our carbon footprint through verified reforestation projects in the Western Ghats.",
            "icon": "globe",
            "impact": "10,000 trees planted"
        },
        {
            "id": "community",
            "title": "Community Support",
            "description": "We partner with local artisan communities for packaging, supporting traditional craftsmanship and fair wages.",
            "icon": "heart",
            "impact": "200+ artisan families supported"
        },
        {
            "id": "cruelty_free",
            "title": "Cruelty-Free Always",
            "description": "No animal testing, ever. Our fragrances are certified cruelty-free and vegan-friendly.",
            "icon": "check-circle",
            "impact": "100% cruelty-free"
        }
    ],
    "certifications": [
        {"name": "PETA Certified", "description": "Cruelty-Free"},
        {"name": "FSC Certified", "description": "Responsible Forestry"},
        {"name": "Green Business", "description": "Eco-Certified Operations"}
    ],
    "stats": {
        "bottles_refilled": 50000,
        "trees_planted": 10000,
        "plastic_eliminated_kg": 5000,
        "artisan_families": 200
    }
}

@api_router.get("/sustainability")
async def get_sustainability():
    return SUSTAINABILITY_DATA

# ==================== SEED DATA ====================

PRODUCTS_DATA = [
    {
        "id": "prod_white_rose_musk",
        "name": "White Rose Musk",
        "slug": "white-rose-musk",
        "description": "An elegant floral women's aroma that captures the essence of fresh white roses blended with soft musk. Perfect for creating a sophisticated and romantic atmosphere in bedrooms and living spaces. This exquisite fragrance transports you to a blooming rose garden at dawn.",
        "short_description": "Elegant floral women's aroma with fresh roses and soft musk",
        "price": 520.00,
        "original_price": 650.00,
        "discount_percent": 20,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["White Rose", "Musk", "Green Notes", "Jasmine"],
        "image": "https://images.unsplash.com/photo-1761928299605-7b0f327613b8?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1761928299605-7b0f327613b8?w=800&q=80", "https://images.unsplash.com/photo-1652430627049-a29818b61cb5?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.8,
        "reviews_count": 124,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_bleu_sport",
        "name": "Bleu Sport",
        "slug": "bleu-sport",
        "description": "A fresh aquatic sporty fragrance designed for performance spaces. This invigorating scent combines ocean breeze with energetic citrus notes, perfect for gyms, offices, and active lifestyle spaces. Feel the rush of cool blue waters.",
        "short_description": "Fresh aquatic sporty fragrance for performance spaces",
        "price": 385.00,
        "original_price": 550.00,
        "discount_percent": 30,
        "category": "Office Scents",
        "subcategory": "Boardroom Scents",
        "size": "100ml",
        "scent_family": "Fresh",
        "notes": ["Ocean Breeze", "Citrus", "Mint", "Cedar"],
        "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.6,
        "reviews_count": 89,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_fleur_enchante",
        "name": "Fleur Enchanté",
        "slug": "fleur-enchante",
        "description": "An enchanting pure aroma oil that weaves a spell of floral magic. This captivating blend features exotic flowers and mysterious undertones that create an atmosphere of wonder and elegance. Perfect for those seeking something truly special.",
        "short_description": "Enchanting floral fragrance for diffusers",
        "price": 456.50,
        "original_price": 550.00,
        "discount_percent": 17,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["Exotic Flowers", "Vanilla", "Amber", "Pink Pepper"],
        "image": "https://images.unsplash.com/photo-1596438459194-f275867d019d?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1596438459194-f275867d019d?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.9,
        "reviews_count": 156,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_white_mulberry",
        "name": "White Mulberry",
        "slug": "white-mulberry",
        "description": "A sweet fruity gourmand fragrance that delights the senses with the luscious sweetness of ripe mulberries. This indulgent scent creates a warm and inviting atmosphere, perfect for cozy spaces and sweet moments.",
        "short_description": "Sweet fruity gourmand fragrance",
        "price": 382.50,
        "original_price": 450.00,
        "discount_percent": 15,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Fruity",
        "notes": ["Mulberry", "Vanilla", "Caramel", "White Tea"],
        "image": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.7,
        "reviews_count": 98,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_elegance",
        "name": "Elegance",
        "slug": "elegance",
        "description": "A sophisticated signature fragrance that embodies pure elegance and refinement. This premium blend features rare ingredients that create an aura of luxury and distinction. Ideal for high-end spaces and special occasions.",
        "short_description": "Sophisticated signature fragrance",
        "price": 350.00,
        "original_price": 580.00,
        "discount_percent": 40,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Luxury",
        "notes": ["Oud", "Rose", "Saffron", "Sandalwood"],
        "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.9,
        "reviews_count": 203,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_victoria_royale",
        "name": "Victoria Royale",
        "slug": "victoria-royale",
        "description": "A majestic royal fragrance fit for royalty. This opulent blend combines precious ingredients to create an atmosphere of grandeur and sophistication. Experience the essence of Victorian elegance in every breath.",
        "short_description": "Majestic royal fragrance",
        "price": 300.00,
        "original_price": 520.00,
        "discount_percent": 42,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Luxury",
        "notes": ["Royal Oud", "Iris", "Bergamot", "Musk"],
        "image": "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.8,
        "reviews_count": 167,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_coorg_mandarin",
        "name": "Coorg Mandarin",
        "slug": "coorg-mandarin",
        "description": "A vibrant citrus burst inspired by the lush mandarin orchards of Coorg. This refreshing fragrance captures the zesty freshness of sun-ripened mandarins with hints of green leaves and spice. Energize your space naturally.",
        "short_description": "Vibrant citrus mandarin freshness",
        "price": 351.00,
        "original_price": 450.00,
        "discount_percent": 22,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Citrus",
        "notes": ["Mandarin", "Orange Blossom", "Ginger", "Green Tea"],
        "image": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.6,
        "reviews_count": 112,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_sandalwood_tranquility",
        "name": "Sandalwood Tranquility",
        "slug": "sandalwood-tranquility",
        "description": "A deeply calming woody fragrance featuring premium Indian sandalwood. This meditative scent promotes peace and tranquility, perfect for meditation spaces, bedrooms, and spa environments. Find your inner calm.",
        "short_description": "Calming woody sandalwood essence",
        "price": 300.00,
        "original_price": 499.00,
        "discount_percent": 40,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Woody",
        "notes": ["Indian Sandalwood", "Cedarwood", "Vanilla", "White Musk"],
        "image": "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.9,
        "reviews_count": 245,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_ocean_secrets",
        "name": "Ocean Secrets",
        "slug": "ocean-secrets",
        "description": "Dive into the mysterious depths of the ocean with this aquatic masterpiece. A bestselling fragrance that captures the essence of sea breeze, marine notes, and hidden treasures of the deep. Refresh your space with oceanic bliss.",
        "short_description": "Mysterious aquatic ocean fragrance",
        "price": 300.00,
        "original_price": 499.00,
        "discount_percent": 40,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Fresh",
        "notes": ["Sea Salt", "Marine Accord", "Driftwood", "White Musk"],
        "image": "https://images.unsplash.com/photo-1630985857549-2190fa06f44f?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1630985857549-2190fa06f44f?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": True,
        "rating": 4.9,
        "reviews_count": 312,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_mystic_whiff",
        "name": "Mystic Whiff",
        "slug": "mystic-whiff",
        "description": "A mysterious and enchanting fragrance that captivates the senses with its otherworldly charm. This unique blend creates an atmosphere of intrigue and wonder, perfect for those who dare to be different.",
        "short_description": "Mysterious enchanting aroma",
        "price": 250.00,
        "original_price": 500.00,
        "discount_percent": 50,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Luxury",
        "notes": ["Incense", "Amber", "Myrrh", "Dark Vanilla"],
        "image": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.7,
        "reviews_count": 134,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_musk_oudh",
        "name": "Musk Oudh",
        "slug": "musk-oudh",
        "description": "A luxurious blend of precious oudh and sensual musk. This opulent fragrance is for those who appreciate the finest things in life. Creates an atmosphere of sophistication and timeless elegance.",
        "short_description": "Luxurious oudh and musk blend",
        "price": 550.00,
        "original_price": 650.00,
        "discount_percent": 15,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Woody",
        "notes": ["Premium Oudh", "White Musk", "Amber", "Rose"],
        "image": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80"],
        "in_stock": True,
        "is_new": True,
        "is_bestseller": False,
        "rating": 4.8,
        "reviews_count": 67,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_morning_mist",
        "name": "Morning Mist",
        "slug": "morning-mist",
        "description": "Wake up to the refreshing essence of morning dew and fresh air. This crisp, clean fragrance captures the magical moment when the world awakens. Perfect for starting your day with clarity and freshness.",
        "short_description": "Fresh morning dew essence",
        "price": 280.00,
        "original_price": 550.00,
        "discount_percent": 49,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Fresh",
        "notes": ["Morning Dew", "Fresh Linen", "White Tea", "Bamboo"],
        "image": "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.6,
        "reviews_count": 189,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_lavender_bliss",
        "name": "Lavender Bliss",
        "slug": "lavender-bliss",
        "description": "Experience the calming embrace of French lavender fields. This soothing fragrance promotes relaxation and peaceful sleep. The perfect companion for unwinding after a long day.",
        "short_description": "Calming French lavender essence",
        "price": 280.00,
        "original_price": 450.00,
        "discount_percent": 38,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["French Lavender", "Chamomile", "Tonka Bean", "Soft Musk"],
        "image": "https://images.unsplash.com/photo-1644409496856-a92543edbc64?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1644409496856-a92543edbc64?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.8,
        "reviews_count": 276,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_jasmine_neroli",
        "name": "Jasmine Neroli",
        "slug": "jasmine-neroli",
        "description": "A romantic floral duet of jasmine and neroli that enchants the senses. This elegant fragrance brings the beauty of Mediterranean gardens into your space. Perfect for romantic evenings and special moments.",
        "short_description": "Romantic jasmine and neroli blend",
        "price": 250.00,
        "original_price": 370.00,
        "discount_percent": 32,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["Night Jasmine", "Neroli", "Orange Blossom", "Ylang Ylang"],
        "image": "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.7,
        "reviews_count": 145,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_fleur_rose",
        "name": "Fleur Rose",
        "slug": "fleur-rose",
        "description": "The signature rose fragrance from Fleur Fragrances. This exquisite blend captures the essence of a thousand roses in full bloom. A timeless classic that brings elegance to any space.",
        "short_description": "Signature rose fragrance",
        "price": 280.00,
        "original_price": 520.00,
        "discount_percent": 46,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["Damask Rose", "Bulgarian Rose", "Peony", "Pink Pepper"],
        "image": "https://images.unsplash.com/photo-1729438857360-bc52f0b587d9?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1729438857360-bc52f0b587d9?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.9,
        "reviews_count": 198,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_first_rain",
        "name": "First Rain",
        "slug": "first-rain",
        "description": "Capture the magical scent of the first monsoon rain on parched earth. This unique fragrance, known as Petrichor, evokes memories of childhood and the joy of dancing in the rain.",
        "short_description": "Petrichor monsoon rain essence",
        "price": 300.00,
        "original_price": 550.00,
        "discount_percent": 45,
        "category": "Home Scents",
        "subcategory": "Living Room Scents",
        "size": "100ml",
        "scent_family": "Fresh",
        "notes": ["Petrichor", "Wet Earth", "Green Leaves", "Ozone"],
        "image": "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.8,
        "reviews_count": 234,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod_jasmine_bloom",
        "name": "Jasmine Bloom",
        "slug": "jasmine-bloom",
        "description": "Pure jasmine essence that transports you to moonlit gardens where jasmine blooms fill the air with intoxicating sweetness. A classic Indian favorite that brings peace and serenity.",
        "short_description": "Pure jasmine essence",
        "price": 250.00,
        "original_price": 370.00,
        "discount_percent": 32,
        "category": "Home Scents",
        "subcategory": "Bedroom Scents",
        "size": "100ml",
        "scent_family": "Floral",
        "notes": ["Indian Jasmine", "Tuberose", "White Florals", "Sandalwood"],
        "image": "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80",
        "images": ["https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80"],
        "in_stock": True,
        "is_new": False,
        "is_bestseller": False,
        "rating": 4.7,
        "reviews_count": 156,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create empty cart and wishlist
    await db.carts.insert_one({"user_id": user_doc["id"], "items": []})
    await db.wishlists.insert_one({"user_id": user_doc["id"], "product_ids": []})
    
    token = create_token(user_doc["id"])
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "phone": user_doc["phone"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone")
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    scent_family: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "newest"
):
    query = {}
    if category:
        query["category"] = category
    if scent_family:
        query["scent_family"] = scent_family
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    sort_field = "created_at"
    sort_order = -1
    if sort == "price_low":
        sort_field = "price"
        sort_order = 1
    elif sort == "price_high":
        sort_field = "price"
        sort_order = -1
    elif sort == "rating":
        sort_field = "rating"
        sort_order = -1
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_field, sort_order).to_list(100)
    return products

@api_router.get("/products/featured")
async def get_featured_products():
    bestsellers = await db.products.find({"is_bestseller": True}, {"_id": 0}).to_list(4)
    new_arrivals = await db.products.find({"is_new": True}, {"_id": 0}).to_list(4)
    top_rated = await db.products.find({}, {"_id": 0}).sort("rating", -1).to_list(4)
    
    return {
        "bestsellers": bestsellers,
        "new_arrivals": new_arrivals,
        "top_rated": top_rated
    }

@api_router.get("/products/{slug}")
async def get_product(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get reviews
    reviews = await db.reviews.find({"product_id": product["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    
    return {**product, "reviews": reviews}

@api_router.get("/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    scent_families = await db.products.distinct("scent_family")
    return {
        "categories": categories,
        "scent_families": scent_families
    }

# ==================== CART ROUTES ====================

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    items_with_details = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_detail = {
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "image": product["image"],
                "quantity": item["quantity"],
                "size": product["size"]
            }
            items_with_details.append(item_detail)
            total += product["price"] * item["quantity"]
    
    return {"items": items_with_details, "total": round(total, 2)}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        await db.carts.insert_one({"user_id": user["id"], "items": [{"product_id": item.product_id, "quantity": item.quantity}]})
    else:
        # Check if item exists
        existing = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing:
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": item.product_id},
                {"$inc": {"items.$.quantity": item.quantity}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": {"product_id": item.product_id, "quantity": item.quantity}}}
            )
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)):
    if item.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity}}
        )
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {"items": []}}
    )
    return {"message": "Cart cleared"}

# ==================== WISHLIST ROUTES ====================

@api_router.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["id"]}, {"_id": 0})
    if not wishlist:
        return {"items": []}
    
    products = await db.products.find({"id": {"$in": wishlist.get("product_ids", [])}}, {"_id": 0}).to_list(100)
    return {"items": products}

@api_router.post("/wishlist/add/{product_id}")
async def add_to_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["id"]},
        {"$addToSet": {"product_ids": product_id}},
        upsert=True
    )
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["id"]},
        {"$pull": {"product_ids": product_id}}
    )
    return {"message": "Removed from wishlist"}

# ==================== ORDER ROUTES ====================

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ==================== PAYMENT ROUTES ====================

@api_router.post("/checkout/stripe")
async def create_stripe_checkout(request: CheckoutRequest, http_request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Calculate total from cart
    total = 0.0
    items_details = []
    for item in request.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if product:
            total += product["price"] * item.quantity
            items_details.append({
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity
            })
    
    if total <= 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    host_url = request.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    success_url = f"{host_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/cart"
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=webhook_url
    )
    
    # Convert INR to USD for Stripe (approximate rate)
    amount_usd = round(total / 83, 2)
    
    checkout_request = CheckoutSessionRequest(
        amount=amount_usd,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "items": json.dumps(items_details)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": total,
        "currency": "INR",
        "payment_method": "stripe",
        "payment_status": "pending",
        "items": items_details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=""
    )
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Create order
            order = {
                "id": str(uuid.uuid4()),
                "user_id": transaction["user_id"],
                "items": transaction["items"],
                "total_amount": transaction["amount"],
                "payment_method": "stripe",
                "payment_status": "paid",
                "payment_session_id": session_id,
                "order_status": "confirmed",
                "shipping_address": {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.orders.insert_one(order)
            
            # Clear cart
            await db.carts.update_one(
                {"user_id": transaction["user_id"]},
                {"$set": {"items": []}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=""
    )
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid"}}
            )
        
        return {"status": "processed"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error"}

@api_router.post("/checkout/razorpay")
async def create_razorpay_order(request: CheckoutRequest, user: dict = Depends(get_current_user)):
    import razorpay
    
    razorpay_key = os.environ.get("RAZORPAY_KEY_ID")
    razorpay_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    
    if not razorpay_key or not razorpay_secret:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    client_rp = razorpay.Client(auth=(razorpay_key, razorpay_secret))
    
    # Calculate total
    total = 0.0
    items_details = []
    for item in request.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if product:
            total += product["price"] * item.quantity
            items_details.append({
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity
            })
    
    if total <= 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Create Razorpay order (amount in paise)
    order_data = {
        "amount": int(total * 100),
        "currency": "INR",
        "payment_capture": 1
    }
    
    rp_order = client_rp.order.create(order_data)
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "razorpay_order_id": rp_order["id"],
        "user_id": user["id"],
        "amount": total,
        "currency": "INR",
        "payment_method": "razorpay",
        "payment_status": "pending",
        "items": items_details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "order_id": rp_order["id"],
        "amount": rp_order["amount"],
        "currency": rp_order["currency"],
        "key_id": razorpay_key
    }

@api_router.post("/checkout/razorpay/verify")
async def verify_razorpay_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user: dict = Depends(get_current_user)
):
    import razorpay
    import hmac
    import hashlib
    
    razorpay_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    
    # Verify signature
    msg = f"{razorpay_order_id}|{razorpay_payment_id}"
    generated_signature = hmac.new(
        razorpay_secret.encode(),
        msg.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"razorpay_order_id": razorpay_order_id})
    if transaction and transaction.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {
                "payment_status": "paid",
                "razorpay_payment_id": razorpay_payment_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create order
        order = {
            "id": str(uuid.uuid4()),
            "user_id": transaction["user_id"],
            "items": transaction["items"],
            "total_amount": transaction["amount"],
            "payment_method": "razorpay",
            "payment_status": "paid",
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "order_status": "confirmed",
            "shipping_address": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order)
        
        # Clear cart
        await db.carts.update_one(
            {"user_id": transaction["user_id"]},
            {"$set": {"items": []}}
        )
    
    return {"status": "success", "message": "Payment verified"}

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    review_doc = {
        "id": str(uuid.uuid4()),
        "product_id": review.product_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"message": "Review created", "review": review_doc}

@api_router.get("/reviews/{product_id}")
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return reviews

# ==================== NEWSLETTER ROUTES ====================

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: NewsletterSubscribe):
    existing = await db.newsletter.find_one({"email": data.email})
    if existing:
        return {"message": "Already subscribed"}
    
    await db.newsletter.insert_one({
        "id": str(uuid.uuid4()),
        "email": data.email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Successfully subscribed to newsletter"}

# ==================== AI ROUTES ====================

class ImageAnalysisRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    question: Optional[str] = "Identify this fragrance or scent notes"

@api_router.post("/ai/chat")
async def ai_chat(message: ChatMessage, user: dict = Depends(get_optional_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = message.session_id or str(uuid.uuid4())
    
    system_message = """You are Fleur, the premium AI fragrance consultant for Fleur Fragrances — a luxury aroma oils brand based in Mumbai, India. You embody sophistication, warmth, and deep expertise in the world of fragrances.

## YOUR PERSONA
- Speak elegantly but warmly, like a knowledgeable friend at a luxury boutique
- Use sensory-rich language to describe scents
- Be concise yet evocative — paint pictures with words

## YOUR EXPERTISE
1. **Fragrance Profiling**: Understand what scents suit different personalities, moods, and spaces
2. **Scent Families**: Expert in Floral, Woody, Fresh, Citrus, Oriental/Luxury categories
3. **Space Recommendations**: Match fragrances to spaces (bedroom, living room, office, spa)
4. **Layering & Pairing**: Suggest complementary fragrances
5. **Perfume Identification**: When shown images, identify perfume bottles or describe scent profiles
6. **Aromatherapy Benefits**: Explain therapeutic benefits of each scent

## OUR COLLECTION (All 100ml)
| Product | Price | Family | Best For |
|---------|-------|--------|----------|
| White Rose Musk | ₹520 | Floral | Romantic bedrooms |
| Bleu Sport | ₹385 | Fresh | Energizing spaces, gyms |
| Fleur Enchanté | ₹456 | Floral | Elegant living rooms |
| White Mulberry | ₹382 | Fruity | Cozy, sweet ambiance |
| Elegance | ₹350 | Luxury | Special occasions |
| Victoria Royale | ₹300 | Luxury | Grand entrances |
| Coorg Mandarin | ₹351 | Citrus | Morning energy |
| Sandalwood Tranquility | ₹300 | Woody | Meditation, calm |
| Ocean Secrets ⭐ | ₹300 | Fresh | Universal favorite |
| Mystic Whiff | ₹250 | Oriental | Intriguing spaces |
| Musk Oudh 🆕 | ₹550 | Woody | Premium luxury |
| Morning Mist | ₹280 | Fresh | Wake-up freshness |
| Lavender Bliss | ₹280 | Floral | Sleep & relaxation |
| Jasmine Neroli | ₹250 | Floral | Mediterranean feel |
| Fleur Rose | ₹280 | Floral | Classic elegance |
| First Rain | ₹300 | Fresh | Nostalgic, earthy |
| Jasmine Bloom | ₹250 | Floral | Peace & serenity |

## RESPONSE STYLE
- Keep responses 2-4 sentences unless detail is requested
- Use elegant punctuation and formatting
- Include product recommendations when relevant
- End with a subtle prompt to explore or ask more

When asked to identify fragrances from images, analyze visual cues like bottle shape, color, brand elements, and provide your best assessment."""

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=session_id,
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    user_msg = UserMessage(text=message.message)
    response = await chat.send_message(user_msg)
    
    # Store chat history
    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["id"] if user else None,
        "user_message": message.message,
        "ai_response": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"response": response, "session_id": session_id}

@api_router.post("/ai/identify-perfume")
async def ai_identify_perfume(request: ImageAnalysisRequest, user: dict = Depends(get_optional_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    session_id = str(uuid.uuid4())
    
    system_message = """You are an expert perfume identifier and fragrance analyst. When shown an image:
1. Identify the perfume brand and name if recognizable
2. Describe the bottle design and visual elements
3. Suggest what scent family it likely belongs to based on branding/design
4. Recommend similar fragrances from Fleur Fragrances collection

If the image shows flowers, ingredients, or ambiance, describe what scent profile they represent."""

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=session_id,
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    if request.image_url:
        user_msg = UserMessage(
            text=request.question or "Identify this perfume or fragrance",
            images=[ImageContent(url=request.image_url)]
        )
    elif request.image_base64:
        user_msg = UserMessage(
            text=request.question or "Identify this perfume or fragrance",
            images=[ImageContent(base64=request.image_base64)]
        )
    else:
        return {"error": "Please provide an image URL or base64 image"}
    
    response = await chat.send_message(user_msg)
    
    return {"analysis": response, "session_id": session_id}

@api_router.post("/ai/scent-finder")
async def ai_scent_finder(request: ScentFinderRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Build context from answers
    answers_text = "\n".join([f"- {a.question_id}: {a.answer}" for a in request.answers])
    
    system_message = """You are an expert fragrance matcher for Fleur Fragrances. Based on the user's quiz answers, recommend 3 perfect fragrances from our collection.

Our products:
1. White Rose Musk (₹520) - Floral, romantic, bedroom
2. Bleu Sport (₹385) - Fresh, aquatic, energizing
3. Fleur Enchanté (₹456.50) - Floral, enchanting, elegant
4. White Mulberry (₹382.50) - Fruity, sweet, cozy
5. Elegance (₹350) - Luxury, sophisticated, special occasions
6. Victoria Royale (₹300) - Royal, opulent, grand
7. Coorg Mandarin (₹351) - Citrus, fresh, energizing
8. Sandalwood Tranquility (₹300) - Woody, calming, meditation
9. Ocean Secrets (₹300) - Fresh, marine, refreshing (Bestseller)
10. Mystic Whiff (₹250) - Mysterious, unique, intriguing
11. Musk Oudh (₹550) - Luxury, woody, precious (New)
12. Morning Mist (₹280) - Fresh, clean, awakening
13. Lavender Bliss (₹280) - Floral, calming, sleep
14. Jasmine Neroli (₹250) - Floral, romantic, Mediterranean
15. Fleur Rose (₹280) - Rose, classic, elegant
16. First Rain (₹300) - Petrichor, nostalgic, refreshing
17. Jasmine Bloom (₹250) - Pure jasmine, peaceful

Return JSON with exactly 3 recommendations in this format:
{
  "recommendations": [
    {"product_id": "prod_xxx", "name": "Product Name", "price": 000, "match_score": 95, "reason": "Why this matches"}
  ]
}"""

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=str(uuid.uuid4()),
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Based on these quiz answers, recommend 3 fragrances:
{answers_text}

Return only valid JSON."""

    user_msg = UserMessage(text=prompt)
    response = await chat.send_message(user_msg)
    
    # Parse JSON response
    try:
        # Clean the response
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        
        result = json.loads(clean_response)
        return result
    except json.JSONDecodeError:
        # Fallback recommendations
        return {
            "recommendations": [
                {"product_id": "prod_ocean_secrets", "name": "Ocean Secrets", "price": 300, "match_score": 90, "reason": "A versatile bestseller perfect for any space"},
                {"product_id": "prod_lavender_bliss", "name": "Lavender Bliss", "price": 280, "match_score": 85, "reason": "Calming and universally loved"},
                {"product_id": "prod_elegance", "name": "Elegance", "price": 350, "match_score": 80, "reason": "Sophisticated choice for discerning tastes"}
            ]
        }

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact")
async def submit_contact(
    name: str,
    email: str,
    phone: Optional[str] = None,
    subject: str = "General Inquiry",
    message: str = ""
):
    contact = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "phone": phone,
        "subject": subject,
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact)
    return {"message": "Thank you for contacting us. We'll get back to you soon!"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    count = await db.products.count_documents({})
    if count > 0:
        return {"message": "Data already seeded", "products_count": count}
    
    # Insert products
    await db.products.insert_many(PRODUCTS_DATA)
    
    return {"message": "Data seeded successfully", "products_count": len(PRODUCTS_DATA)}

@api_router.get("/")
async def root():
    return {"message": "Fleur Fragrances API", "version": "1.0"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Seed data on startup
    count = await db.products.count_documents({})
    if count == 0:
        await db.products.insert_many(PRODUCTS_DATA)
        logger.info(f"Seeded {len(PRODUCTS_DATA)} products")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
