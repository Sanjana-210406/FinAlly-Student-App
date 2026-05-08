import requests

res = requests.post("http://localhost:8080/api/auth/login", json={"email": "demo@student.finally", "password": "Demo@1234"})
token = res.json().get("token")
print("Token:", token)

headers = {"Authorization": f"Bearer {token}"}
print("Budget:", requests.get("http://localhost:8080/api/budget/current", headers=headers).text[:500])
print("Expenses:", requests.get("http://localhost:8080/api/expenses", headers=headers).text[:500])
