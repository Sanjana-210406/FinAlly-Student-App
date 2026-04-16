import requests
import sys

BASE_URL = "http://localhost:8080/api"
EMAIL = "demo@student.finally"
PASSWORD = "Demo@1234"

def print_result(feature, data, success):
    if success:
        print(f"✅ {feature} OK")
    else:
        print(f"❌ {feature} FAILED - {data}")

def run_tests():
    print("--- Starting Backend API Integration Tests ---\n")
    
    # 1. Test Login
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if res.status_code == 200:
            token = res.json().get("token")
            print_result("Authentication", "Token received", True)
        else:
            print_result("Authentication", f"Status {res.status_code}: {res.text}", False)
            sys.exit(1)
    except Exception as e:
        print_result("Authentication", str(e), False)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    # API endpoints to test
    endpoints = {
        "User Profile": "/auth/me",
        "Budget Info": "/budget/current",
        "Expense List": "/expenses",
        "Savings Goals": "/goals",
        "Safety Net Status": "/safety/status",
        "Financial Health Score": "/score/current",
        "Subscriptions": "/subscriptions",
        "Alerts & Notifications": "/alerts",
        "Behavioral Patterns": "/behavioral/patterns",
        "Predictive Forecast": "/predictive/forecast",
        "Gamification Profile": "/gamification/status",
    }

    for name, path in endpoints.items():
        try:
            r = requests.get(f"{BASE_URL}{path}", headers=headers)
            if r.status_code in [200, 201]:
                print_result(name, "Data retrieved", True)
            else:
                print_result(name, f"Status {r.status_code}: {r.text}", False)
        except Exception as e:
            print_result(name, str(e), False)

    print("\n--- Backend Test Suite Finished ---")

if __name__ == "__main__":
    run_tests()
