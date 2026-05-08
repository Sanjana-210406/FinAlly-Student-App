import requests

res = requests.post("http://localhost:8080/api/auth/login", json={"email": "demo@student.finally", "password": "Demo@1234"})
token = res.json().get("token")
headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    "/api/score/current",
    "/api/budget/current",
    "/api/expenses",
    "/api/goals",
    "/api/alerts",
    "/api/gamification/status"
]

for ep in endpoints:
    url = f"http://localhost:8080{ep}"
    res = requests.get(url, headers=headers)
    print(f"{ep}: {res.status_code}")
    if res.status_code != 200:
        print(f"Error for {ep}: {res.text}")

