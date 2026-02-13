import requests
import sys
import json
from datetime import datetime

class FleurFragrancesAPITester:
    def __init__(self, base_url="https://fleur-premium.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_seed_data(self):
        """Test data seeding"""
        return self.run_test("Seed Data", "POST", "seed", 200)

    def test_get_products(self):
        """Test get all products"""
        success, response = self.run_test("Get All Products", "GET", "products", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} products")
            return len(response) >= 17  # Should have 17 products
        return False

    def test_get_featured_products(self):
        """Test get featured products"""
        success, response = self.run_test("Get Featured Products", "GET", "products/featured", 200)
        if success and isinstance(response, dict):
            has_sections = all(key in response for key in ['bestsellers', 'new_arrivals', 'top_rated'])
            if has_sections:
                print(f"   Bestsellers: {len(response.get('bestsellers', []))}")
                print(f"   New arrivals: {len(response.get('new_arrivals', []))}")
                print(f"   Top rated: {len(response.get('top_rated', []))}")
            return has_sections
        return False

    def test_get_categories(self):
        """Test get categories"""
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if success and isinstance(response, dict):
            has_categories = 'categories' in response and 'scent_families' in response
            if has_categories:
                print(f"   Categories: {len(response.get('categories', []))}")
                print(f"   Scent families: {len(response.get('scent_families', []))}")
            return has_categories
        return False

    def test_get_product_detail(self):
        """Test get product by slug"""
        return self.run_test("Get Product Detail", "GET", "products/white-rose-musk", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!",
            "phone": "+91 9876543210"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and isinstance(response, dict):
            if 'token' in response and 'user' in response:
                self.token = response['token']
                self.user_id = response['user']['id']
                print(f"   Registered user: {response['user']['name']}")
                return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        if not self.token:
            return False
            
        # Try to get current user to verify token works
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_cart_operations(self):
        """Test cart operations"""
        if not self.token:
            print("❌ Cart Operations - SKIPPED: No authentication token")
            return False

        # Get empty cart
        success, _ = self.run_test("Get Empty Cart", "GET", "cart", 200)
        if not success:
            return False

        # Add item to cart
        cart_item = {"product_id": "prod_white_rose_musk", "quantity": 2}
        success, _ = self.run_test("Add to Cart", "POST", "cart/add", 200, cart_item)
        if not success:
            return False

        # Get cart with items
        success, response = self.run_test("Get Cart with Items", "GET", "cart", 200)
        if success and isinstance(response, dict):
            items_count = len(response.get('items', []))
            total = response.get('total', 0)
            print(f"   Cart items: {items_count}, Total: ₹{total}")

        # Update cart item
        update_item = {"product_id": "prod_white_rose_musk", "quantity": 1}
        success, _ = self.run_test("Update Cart Item", "PUT", "cart/update", 200, update_item)
        if not success:
            return False

        # Remove from cart
        success, _ = self.run_test("Remove from Cart", "DELETE", "cart/remove/prod_white_rose_musk", 200)
        return success

    def test_wishlist_operations(self):
        """Test wishlist operations"""
        if not self.token:
            print("❌ Wishlist Operations - SKIPPED: No authentication token")
            return False

        # Get empty wishlist
        success, _ = self.run_test("Get Empty Wishlist", "GET", "wishlist", 200)
        if not success:
            return False

        # Add to wishlist
        success, _ = self.run_test("Add to Wishlist", "POST", "wishlist/add/prod_white_rose_musk", 200)
        if not success:
            return False

        # Get wishlist with items
        success, response = self.run_test("Get Wishlist with Items", "GET", "wishlist", 200)
        if success and isinstance(response, dict):
            items_count = len(response.get('items', []))
            print(f"   Wishlist items: {items_count}")

        # Remove from wishlist
        success, _ = self.run_test("Remove from Wishlist", "DELETE", "wishlist/remove/prod_white_rose_musk", 200)
        return success

    def test_newsletter_subscription(self):
        """Test newsletter subscription"""
        timestamp = datetime.now().strftime("%H%M%S")
        newsletter_data = {"email": f"newsletter{timestamp}@example.com"}
        return self.run_test("Newsletter Subscription", "POST", "newsletter/subscribe", 200, newsletter_data)

    def test_ai_chat(self):
        """Test AI chat functionality"""
        chat_data = {
            "message": "What are your bestselling fragrances?",
            "session_id": None
        }
        success, response = self.run_test("AI Chat", "POST", "ai/chat", 200, chat_data)
        if success and isinstance(response, dict):
            has_response = 'response' in response and 'session_id' in response
            if has_response:
                print(f"   AI Response: {response['response'][:100]}...")
            return has_response
        return False

    def test_scent_finder(self):
        """Test AI scent finder"""
        scent_data = {
            "answers": [
                {"question_id": "mood", "answer": "relaxing"},
                {"question_id": "space", "answer": "bedroom"},
                {"question_id": "preference", "answer": "floral"},
                {"question_id": "intensity", "answer": "medium"},
                {"question_id": "time", "answer": "evening"}
            ]
        }
        success, response = self.run_test("AI Scent Finder", "POST", "ai/scent-finder", 200, scent_data)
        if success and isinstance(response, dict):
            has_recommendations = 'recommendations' in response
            if has_recommendations:
                recs = response.get('recommendations', [])
                print(f"   Found {len(recs)} recommendations")
            return has_recommendations
        return False

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+91 9876543210",
            "subject": "Test Inquiry",
            "message": "This is a test message"
        }
        # Using form data instead of JSON
        url = f"{self.api_url}/contact"
        try:
            response = requests.post(url, data=contact_data, timeout=10)
            success = response.status_code == 200
            self.log_test("Contact Form Submission", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Contact Form Submission", False, f"Request error: {str(e)}")
            return False

    def test_product_filters(self):
        """Test product filtering"""
        # Test scent family filter
        success, response = self.run_test("Filter by Scent Family", "GET", "products?scent_family=Floral", 200)
        if success and isinstance(response, list):
            print(f"   Floral products: {len(response)}")

        # Test price filter
        success, response = self.run_test("Filter by Price Range", "GET", "products?min_price=300&max_price=500", 200)
        if success and isinstance(response, list):
            print(f"   Products in ₹300-500 range: {len(response)}")

        # Test sorting
        success, response = self.run_test("Sort by Price Low to High", "GET", "products?sort=price_low", 200)
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Fleur Fragrances API Tests...")
        print("=" * 60)

        # Basic API tests
        self.test_root_endpoint()
        self.test_seed_data()
        
        # Product tests
        self.test_get_products()
        self.test_get_featured_products()
        self.test_get_categories()
        self.test_get_product_detail()
        self.test_product_filters()
        
        # Auth tests
        self.test_user_registration()
        self.test_user_login()
        
        # Cart and wishlist tests (require auth)
        self.test_cart_operations()
        self.test_wishlist_operations()
        
        # Other features
        self.test_newsletter_subscription()
        self.test_contact_form()
        
        # AI features
        self.test_ai_chat()
        self.test_scent_finder()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = FleurFragrancesAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())