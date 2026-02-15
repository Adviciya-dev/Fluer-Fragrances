"""
Fleur Fragrances API Tests
Tests for product images fix and core functionality
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductsAPI:
    """Product endpoint tests - verifying image fix"""
    
    def test_get_all_products(self):
        """Test GET /api/products returns all 17 products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 17, f"Expected 17 products, got {len(data)}"
        print(f"✅ Found {len(data)} products")
    
    def test_product_has_required_fields(self):
        """Test products have all required fields"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        required_fields = ['id', 'name', 'slug', 'price', 'image', 'scent_family']
        
        for product in products[:5]:  # Check first 5 products
            for field in required_fields:
                assert field in product, f"Missing field: {field} in product {product.get('name', 'unknown')}"
        print("✅ All products have required fields")
    
    def test_get_product_by_slug(self):
        """Test GET /api/products/{slug} returns correct product"""
        response = requests.get(f"{BASE_URL}/api/products/white-rose-musk")
        assert response.status_code == 200
        
        product = response.json()
        assert product['slug'] == 'white-rose-musk'
        assert product['name'] == 'White Rose Musk'
        assert 'price' in product
        assert 'notes' in product
        print(f"✅ Product detail: {product['name']} - ₹{product['price']}")
    
    def test_product_filtering_by_scent_family(self):
        """Test product filtering by scent family"""
        response = requests.get(f"{BASE_URL}/api/products?scent_family=Floral")
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            assert product['scent_family'] == 'Floral', f"Expected Floral, got {product['scent_family']}"
        print(f"✅ Filtered {len(products)} Floral products")


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns scent families"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert 'scent_families' in data
        assert isinstance(data['scent_families'], list)
        assert len(data['scent_families']) > 0
        print(f"✅ Found {len(data['scent_families'])} scent families: {data['scent_families']}")


class TestBrandStoryAPI:
    """Brand story endpoint tests"""
    
    def test_get_brand_story(self):
        """Test GET /api/brand-story returns brand info"""
        response = requests.get(f"{BASE_URL}/api/brand-story")
        assert response.status_code == 200
        
        data = response.json()
        assert 'mission' in data
        assert 'stats' in data
        print(f"✅ Brand story loaded: {data.get('mission', '')[:50]}...")


class TestPortfolioAPI:
    """Portfolio/B2B clients endpoint tests"""
    
    def test_get_portfolio(self):
        """Test GET /api/portfolio returns B2B clients"""
        response = requests.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200
        
        data = response.json()
        assert 'clients' in data
        assert isinstance(data['clients'], list)
        assert len(data['clients']) > 0
        print(f"✅ Found {len(data['clients'])} B2B clients")


class TestCorporateGiftingAPI:
    """Corporate gifting endpoint tests"""
    
    def test_get_corporate_gifting(self):
        """Test GET /api/corporate-gifting returns packages"""
        response = requests.get(f"{BASE_URL}/api/corporate-gifting")
        assert response.status_code == 200
        
        data = response.json()
        assert 'packages' in data
        assert 'benefits' in data
        assert len(data['packages']) == 4, "Expected 4 gifting packages"
        print(f"✅ Found {len(data['packages'])} corporate gifting packages")
    
    def test_corporate_gifting_inquiry(self):
        """Test POST /api/corporate-gifting/inquiry"""
        inquiry_data = {
            "company_name": "TEST_Company",
            "contact_person": "Test Person",
            "email": "test@example.com",
            "phone": "9876543210",
            "package_interest": "gold",
            "quantity": 50,
            "occasion": "Diwali",
            "message": "Test inquiry"
        }
        
        response = requests.post(f"{BASE_URL}/api/corporate-gifting/inquiry", json=inquiry_data)
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data or 'id' in data
        print("✅ Corporate gifting inquiry submitted successfully")


class TestSustainabilityAPI:
    """Sustainability endpoint tests"""
    
    def test_get_sustainability(self):
        """Test GET /api/sustainability returns initiatives"""
        response = requests.get(f"{BASE_URL}/api/sustainability")
        assert response.status_code == 200
        
        data = response.json()
        assert 'initiatives' in data
        assert 'stats' in data
        assert 'certifications' in data
        print(f"✅ Found {len(data['initiatives'])} sustainability initiatives")


class TestTestimonialsAPI:
    """Testimonials endpoint tests"""
    
    def test_get_testimonials(self):
        """Test GET /api/testimonials returns customer reviews"""
        response = requests.get(f"{BASE_URL}/api/testimonials")
        assert response.status_code == 200
        
        data = response.json()
        assert 'testimonials' in data
        assert isinstance(data['testimonials'], list)
        print(f"✅ Found {len(data['testimonials'])} testimonials")


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_register_user(self):
        """Test POST /api/auth/register creates new user"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        user_data = {
            "name": "TEST_User",
            "email": f"test_{random_suffix}@example.com",
            "password": "TestPass123!",
            "phone": "9876543210"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert 'token' in data
        assert 'user' in data
        assert data['user']['email'] == user_data['email']
        print(f"✅ User registered: {user_data['email']}")
        return data['token']
    
    def test_login_user(self):
        """Test POST /api/auth/login authenticates user"""
        # First register a user
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"login_test_{random_suffix}@example.com"
        password = "TestPass123!"
        
        # Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Login Test User",
            "email": email,
            "password": password
        })
        assert register_response.status_code == 200
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        assert 'token' in data
        assert 'user' in data
        print(f"✅ User logged in: {email}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly rejected")


class TestCartAPI:
    """Cart endpoint tests"""
    
    def get_auth_token(self):
        """Helper to get auth token"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Cart Test User",
            "email": f"cart_{random_suffix}@example.com",
            "password": "TestPass123!"
        })
        return response.json()['token']
    
    def test_add_to_cart(self):
        """Test POST /api/cart/add adds item to cart"""
        token = self.get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": "prod_white_rose_musk", "quantity": 1},
            headers=headers)
        assert response.status_code == 200
        print("✅ Item added to cart")
    
    def test_get_cart(self):
        """Test GET /api/cart returns cart items"""
        token = self.get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Add item first
        requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": "prod_white_rose_musk", "quantity": 1},
            headers=headers)
        
        # Get cart
        response = requests.get(f"{BASE_URL}/api/cart", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert 'items' in data
        assert 'total' in data
        print(f"✅ Cart has {len(data['items'])} items, total: ₹{data['total']}")


class TestNewsletterAPI:
    """Newsletter endpoint tests"""
    
    def test_subscribe_newsletter(self):
        """Test POST /api/newsletter/subscribe"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        response = requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={
            "email": f"newsletter_{random_suffix}@example.com"
        })
        assert response.status_code == 200
        print("✅ Newsletter subscription successful")


class TestAIChatAPI:
    """AI Chat endpoint tests"""
    
    def test_ai_chat(self):
        """Test POST /api/ai/chat returns response"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "What fragrance do you recommend for relaxation?",
            "session_id": None
        })
        assert response.status_code == 200
        
        data = response.json()
        assert 'response' in data
        assert 'session_id' in data
        print(f"✅ AI Chat response: {data['response'][:100]}...")


class TestHealthAPI:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test GET / returns health status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✅ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
